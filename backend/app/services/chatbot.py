import logging
import time

from flask import current_app
from pydantic import BaseModel

from .product_search import DEFAULT_LIMIT, find_candidates, parse_budget
from .product_search import tokens as search_tokens

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
    Trả về (BotAnswer, {product_id: score}).
    """
    last_user_msgs = [c for s, c in history if s == "user"][-2:]

    # Ngân sách lấy ở TIN NHẮN HIỆN TẠI trước. Chỉ khi câu này không nêu giá
    # mới lấy lại mức khách đã nói trước đó (vd "serum dưới 300k" rồi
    # "còn loại nào khác" thì vẫn giữ mốc 300k).
    budget = parse_budget(message)
    if budget == (None, None) and last_user_msgs:
        budget = parse_budget(" ".join(reversed(last_user_msgs)))

    # Tìm theo TIN NHẮN HIỆN TẠI trước. Nếu ghép luôn lịch sử vào, một câu hỏi
    # lạc đề ("bán máy bay không") vẫn trúng sản phẩm nhờ từ khóa của câu trước,
    # khiến chatbot gợi ý mỹ phẩm cho câu chẳng liên quan.
    candidates = find_candidates(message, limit=DEFAULT_LIMIT, budget=budget)

    # Chỉ mượn ngữ cảnh cũ cho CÂU NỐI TIẾP: câu hầu như không có từ nội dung
    # riêng ("loại rẻ hơn", "còn cái nào khác không"). Câu lạc đề thì có đủ từ
    # của nó, nếu cũng mượn ngữ cảnh sẽ gợi ý mỹ phẩm cho câu chẳng liên quan.
    if not candidates and last_user_msgs and len(search_tokens(message)) <= 2:
        candidates = find_candidates(
            " ".join([*last_user_msgs, message]), limit=DEFAULT_LIMIT, budget=budget
        )
    scores = {p.product_id: s for p, s in candidates}

    api_key = current_app.config["GEMINI_API_KEY"]
    if not api_key:
        return _fallback_answer(candidates), scores

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
            parts=[types.Part(text=f"DANH SÁCH SẢN PHẨM:\n{context}\n\nCÂU HỎI CỦA KHÁCH: {message}")],
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
            return _fallback_answer(candidates), scores

    if result is None:
        return _fallback_answer(candidates), scores

    # Gemini có thể trả id ngoài danh sách ngữ cảnh; bỏ đi để không hiện sản phẩm bịa
    result.recommendations = [r for r in result.recommendations if r.product_id in scores][:MAX_RECOMMENDATIONS]
    return result, scores
