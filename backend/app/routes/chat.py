import logging
import time
from collections import deque
from threading import Lock

from flask import Blueprint, request
from flask import session as cookie_session
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..models import ChatMessage, ChatSession, Product, ProductRecommendation
from ..services import chatbot
from ..services.auth import current_user

chat_bp = Blueprint("chat", __name__)
log = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 1000
HISTORY_LIMIT = 20          # số tin nhắn gần nhất đọc lại làm ngữ cảnh
COOKIE_KEY = "chat_session_id"

# Chặn spam: tối đa 20 tin / 5 phút và ít nhất 2 giây giữa hai tin
RATE_WINDOW_SEC = 300
RATE_MAX_IN_WINDOW = 20
RATE_MIN_GAP_SEC = 2.0

_hits = {}
_hits_lock = Lock()


def _rate_key():
    """Khoá theo tài khoản nếu đã đăng nhập, không thì theo IP."""
    user = current_user()
    if user:
        return f"u{user.user_id}"
    forwarded = request.headers.get("X-Forwarded-For", "")
    return f"ip{forwarded.split(',')[0].strip() or request.remote_addr or 'unknown'}"


def _check_rate_limit():
    """Trả về thông báo lỗi nếu bị chặn, None nếu cho qua."""
    now = time.monotonic()
    key = _rate_key()
    with _hits_lock:
        q = _hits.setdefault(key, deque())
        while q and now - q[0] > RATE_WINDOW_SEC:
            q.popleft()
        if q and now - q[-1] < RATE_MIN_GAP_SEC:
            return "Bạn gửi hơi nhanh, chờ một chút rồi thử lại nhé."
        if len(q) >= RATE_MAX_IN_WINDOW:
            return "Bạn đã nhắn khá nhiều. Vui lòng chờ vài phút rồi quay lại nhé."
        q.append(now)
        # Dọn khoá cũ để dict không phình mãi khi chạy lâu
        if len(_hits) > 5000:
            for k in [k for k, v in _hits.items() if not v or now - v[-1] > RATE_WINDOW_SEC]:
                _hits.pop(k, None)
    return None


def _resolve_session(requested_id):
    """Lấy phiên chat của CHÍNH người gửi, hoặc tạo phiên mới.

    Không bao giờ tin session_id do client gửi lên một cách mù quáng: trước đây
    chỉ cần đổi con số đó là đọc và ghi được hội thoại của người khác.
    Phiên được coi là của người gửi khi:
      - đã đăng nhập và phiên mang đúng user_id, HOẶC
      - phiên chưa có chủ và chính cookie đã ký của trình duyệt này tạo ra nó.
    """
    user = current_user()
    owned_id = cookie_session.get(COOKIE_KEY)
    session = None

    if requested_id:
        candidate = db.session.get(ChatSession, requested_id)
        if candidate is not None:
            mine_by_account = user is not None and candidate.user_id == user.user_id
            mine_by_cookie = candidate.user_id is None and candidate.session_id == owned_id
            if mine_by_account or mine_by_cookie:
                session = candidate

    if session is None:
        session = ChatSession(user_id=user.user_id if user else None)
        db.session.add(session)
        db.session.flush()
        cookie_session[COOKIE_KEY] = session.session_id
    elif session.user_id is None and user is not None:
        # Khách vãng lai đang chat rồi mới đăng nhập -> gắn phiên cho tài khoản
        session.user_id = user.user_id

    return session


@chat_bp.post("/chat")
def send_message():
    """Body: {message, session_id?}. Chưa có session_id hợp lệ thì tạo phiên mới."""
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return {"error": "Tin nhắn không được để trống"}, 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return {"error": f"Tin nhắn tối đa {MAX_MESSAGE_LENGTH} ký tự"}, 400

    blocked = _check_rate_limit()
    if blocked:
        return {"error": blocked}, 429

    requested = data.get("session_id")
    if requested is not None and not isinstance(requested, int):
        requested = int(requested) if str(requested).isdigit() else None

    try:
        session = _resolve_session(requested)

        history = [
            (m.sender, m.content)
            for m in ChatMessage.query.filter_by(session_id=session.session_id)
            .order_by(ChatMessage.message_id.desc())
            .limit(HISTORY_LIMIT)
            .all()
        ][::-1]

        result, scores = chatbot.answer(message, history)

        db.session.add(ChatMessage(session_id=session.session_id, sender="user", content=message))
        bot_message = ChatMessage(session_id=session.session_id, sender="bot", content=result.reply)
        db.session.add(bot_message)
        db.session.flush()

        # Đọc lại sản phẩm từ DB ngay lúc trả lời: giá và tồn kho hiển thị
        # cho khách luôn là số liệu hiện tại, không phải số lúc dựng ngữ cảnh
        wanted = [r.product_id for r in result.recommendations]
        products = {
            p.product_id: p
            for p in Product.query.filter(Product.product_id.in_(wanted), Product.status != "hidden")
        } if wanted else {}

        cards = []
        for rec in result.recommendations:
            product = products.get(rec.product_id)
            if product is None:
                continue  # sản phẩm vừa bị ẩn/xoá giữa chừng -> không hiện
            reco = ProductRecommendation(
                session_id=session.session_id,
                message_id=bot_message.message_id,
                product_id=product.product_id,
                score=scores.get(product.product_id),
                reason=rec.reason[:255],
            )
            db.session.add(reco)
            db.session.flush()
            cards.append({
                **product.to_card(),
                "stock": product.stock,
                "reason": rec.reason,
                "reco_id": reco.reco_id,
            })

        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        log.exception("Lỗi CSDL khi xử lý tin nhắn chat")
        return {"error": "Hệ thống đang bận, bạn thử lại sau ít phút nhé."}, 503

    return {"session_id": session.session_id, "reply": result.reply, "products": cards}


@chat_bp.post("/chat/recommendations/<int:reco_id>/click")
def track_recommendation_click(reco_id):
    """Chỉ cho ghi nhận lượt bấm trên gợi ý thuộc phiên của chính người dùng."""
    reco = db.session.get(ProductRecommendation, reco_id)
    if reco is None:
        return {"error": "Không tìm thấy gợi ý"}, 404

    session = db.session.get(ChatSession, reco.session_id)
    user = current_user()
    mine = session is not None and (
        (user is not None and session.user_id == user.user_id)
        or (session.user_id is None and session.session_id == cookie_session.get(COOKIE_KEY))
    )
    if not mine:
        return {"error": "Không tìm thấy gợi ý"}, 404

    reco.is_clicked = True
    db.session.commit()
    return {"ok": True}
