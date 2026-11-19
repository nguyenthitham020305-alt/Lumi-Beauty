import logging
import time

from flask import current_app
from pydantic import BaseModel

from . import chat_context
from .product_search import DEFAULT_LIMIT, find_candidates, parse_budget

log = logging.getLogger(__name__)

# Gemini treo thì khách chờ mãi -> cắt rồi dùng câu trả lời dự phòng.
# Giá trị mặc định, ghi đè bằng GEMINI_TIMEOUT_SECONDS trong .env.
GEMINI_TIMEOUT_MS = 30_000
# 503 "high demand" được Google ghi rõ là tạm thời -> thử lại một lần
RETRY_ON_503 = 1
RETRY_DELAY_SEC = 1.5
# Chỉ đọc lại 6 lượt gần nhất làm ngữ cảnh, giữ token trong tầm kiểm soát
CONTEXT_TURNS = 6
MAX_RECOMMENDATIONS = 4

SYSTEM_PROMPT = """Bạn là Lumi, chuyên viên tư vấn mỹ phẩm của cửa hàng LUMI Beauty.
- Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa khoảng 120 từ), xưng "Lumi", gọi khách là "bạn".
- Chỉ gợi ý sản phẩm có trong DANH SÁCH SẢN PHẨM được cung cấp, tuyệt đối không bịa tên, giá hay công dụng.
- Chọn tối đa 4 sản phẩm phù hợp nhất, ưu tiên sản phẩm còn hàng. Ghi product_id và lý do ngắn (dưới 15 từ).
- Giá và tình trạng còn hàng phải nói đúng như trong danh sách, không được làm tròn hay suy đoán.
- Nếu danh sách trống, nói thẳng là chưa tìm được sản phẩm phù hợp và hỏi thêm nhu cầu của khách.
- Dòng TIÊU CHÍ ĐANG HIỂU là những gì khách đã nêu từ đầu hội thoại, kể cả ở lượt trước. Bám sát nó.
- Nếu sản phẩm trong danh sách KHÔNG khớp đủ tiêu chí đó, phải nói rõ tiêu chí nào chưa đáp ứng
  TRƯỚC khi gợi ý, ví dụ: "Lumi chưa có kem chống nắng ghi riêng cho da khô, bạn tham khảo loại
  cho da nhạy cảm này nhé". Tuyệt đối không lặng lẽ đưa sản phẩm khác loại như thể đã khớp.
- Phân biệt rõ "chưa có" với "đang hết hàng": nếu trong danh sách CÓ sản phẩm khớp tiêu chí
  nhưng ghi "hết hàng", phải nói là đang hết hàng (và vẫn được nêu tên nó), không được nói
  là cửa hàng chưa có loại đó.
- Nếu chưa đủ thông tin (loại da, vấn đề da, ngân sách...), hỏi lại khách một câu và có thể không gợi ý sản phẩm.
- Nếu khách hỏi ngoài chủ đề làm đẹp/mỹ phẩm, lịch sự từ chối và hướng về tư vấn mỹ phẩm.
- Không đưa lời khuyên y khoa; với vấn đề da nghiêm trọng, khuyên khách gặp bác sĩ da liễu."""


class Recommendation(BaseModel):
    product_id: int
    reason: str


class BotAnswer(BaseModel):
    reply: str
    recommendations: list[Recommendation]


def _describe(product):
    desc = (product.description or "").replace("\n", " ")[:300]
    rating = f"{float(product.rating):.1f}/5" if product.rating is not None else "chưa có"
    return (
        f"- product_id={product.product_id} | {product.name} | thương hiệu: "
        f"{product.brand.name if product.brand else 'không rõ'} | giá: {product.price:,}đ | "
        f"đánh giá: {rating} | {'còn hàng' if product.stock > 0 else 'hết hàng'} | "
        f"danh mục: {', '.join(c.name for c in product.categories)} | mô tả: {desc}"
    )


def _fallback_answer(candidates):
    if not candidates:
        return BotAnswer(
            reply="Lumi chưa tìm thấy sản phẩm phù hợp. Bạn mô tả thêm loại da hoặc sản phẩm bạn cần nhé!",
            recommendations=[],
        )
    in_stock_first = sorted(candidates, key=lambda c: c[0].stock <= 0)
    return BotAnswer(
        reply="Lumi tìm được vài sản phẩm có thể hợp với bạn nè:",
        recommendations=[
            Recommendation(product_id=p.product_id, reason="Khớp với nhu cầu bạn mô tả")
            for p, _ in in_stock_first[:MAX_RECOMMENDATIONS]
        ],
    )


def answer(message, history):
    """Sinh câu trả lời cho khách.

    history: list (sender, content) các tin nhắn trước trong phiên, cũ → mới.
    Trả về (BotAnswer, {product_id: score}, danh sách nhãn tiêu chí đang hiểu).
    """
    last_user_msgs = [c for s, c in history if s == "user"][-2:]

    # Ngân sách lấy ở TIN NHẮN HIỆN TẠI trước. Chỉ khi câu này không nêu giá
    # mới lấy lại mức khách đã nói trước đó (vd "serum dưới 300k" rồi
    # "còn loại nào khác" thì vẫn giữ mốc 300k).
    budget = parse_budget(message)
    budget_in_message = budget != (None, None)
    if not budget_in_message and last_user_msgs:
        budget = parse_budget(" ".join(reversed(last_user_msgs)))

    # Loại sản phẩm và loại da được giữ qua các lượt y như ngân sách: khách hỏi
    # "kem chống nắng" rồi nhắn "cho da khô" thì phải tìm KEM CHỐNG NẮNG cho da
    # khô, chứ không phải mọi thứ hợp da khô.
    slots, detected_now = chat_context.accumulate(history, message)
    use_context = chat_context.should_carry(message, detected_now, budget_in_message)
    if not use_context:
        # Câu lạc đề ("bán máy bay không") có đủ từ của riêng nó mà không nêu
        # tiêu chí nào -> bỏ ngữ cảnh cũ, nếu không sẽ gợi ý mỹ phẩm cho nó.
        slots = {}

    candidates = find_candidates(
        chat_context.build_query(slots, message),
        limit=DEFAULT_LIMIT,
        budget=budget,
        category_hint=chat_context.category_hint(slots),
    )

    # Lưới an toàn: câu nối tiếp ngắn mà ghép tiêu chí vẫn không ra gì
    # ("còn cái nào khác không") thì thử ghép thẳng lời khách ở lượt trước.
    if not candidates and use_context and last_user_msgs:
        candidates = find_candidates(
            " ".join([*last_user_msgs, message]),
            limit=DEFAULT_LIMIT,
            budget=budget,
            category_hint=chat_context.category_hint(slots),
        )
    scores = {p.product_id: s for p, s in candidates}
    criteria = chat_context.describe(slots, budget if use_context else None)

    api_key = current_app.config["GEMINI_API_KEY"]
    if not api_key:
        return _fallback_answer(candidates), scores, criteria

    from google import genai
    from google.genai import types

    context = "\n".join(_describe(p) for p, _ in candidates) or "(không có sản phẩm nào khớp)"
    contents = [
        types.Content(role="user" if s == "user" else "model", parts=[types.Part(text=c)])
        for s, c in history[-CONTEXT_TURNS * 2:]
    ]
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part(text=(
                f"TIÊU CHÍ ĐANG HIỂU: {' · '.join(criteria) if criteria else '(chưa rõ)'}\n\n"
                f"DANH SÁCH SẢN PHẨM:\n{context}\n\n"
                f"CÂU HỎI CỦA KHÁCH: {message}"
            ))],
        )
    )

    timeout_ms = current_app.config.get("GEMINI_TIMEOUT_SECONDS", 30) * 1000
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=BotAnswer,
        temperature=0.4,
        max_output_tokens=800,
        http_options=types.HttpOptions(timeout=timeout_ms or GEMINI_TIMEOUT_MS),
    )

    client = genai.Client(api_key=api_key)
    model = current_app.config["GEMINI_MODEL"]
    result = None

    for attempt in range(RETRY_ON_503 + 1):
        try:
            response = client.models.generate_content(model=model, contents=contents, config=config)
            result = response.parsed
            if not isinstance(result, BotAnswer):
                result = BotAnswer.model_validate_json(response.text)
            break
        except Exception as e:
            transient = "503" in str(e) or "UNAVAILABLE" in str(e)
            if transient and attempt < RETRY_ON_503:
                log.warning("Gemini quá tải (503), thử lại lần %d", attempt + 2)
                time.sleep(RETRY_DELAY_SEC)
                continue
            log.warning("Gemini không trả lời được (%s), dùng câu trả lời dự phòng", type(e).__name__)
            return _fallback_answer(candidates), scores, criteria

    if result is None:
        return _fallback_answer(candidates), scores, criteria

    # Gemini có thể trả id ngoài danh sách ngữ cảnh; bỏ đi để không hiện sản phẩm bịa
    result.recommendations = [r for r in result.recommendations if r.product_id in scores][:MAX_RECOMMENDATIONS]
    return result, scores, criteria
