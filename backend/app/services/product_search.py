"""Tìm sản phẩm liên quan tới câu hỏi của khách để làm ngữ cảnh cho chatbot.

MỌI LẦN GỌI ĐỀU TRUY VẤN THẲNG MySQL — không giữ chỉ mục trong RAM.
Bản trước cache 1.456 sản phẩm một lần rồi dùng mãi, nên sản phẩm admin vừa
thêm/sửa giá/cho hết hàng không bao giờ được chatbot nhìn thấy cho tới khi
khởi động lại Flask. Đó là lỗi, không phải đánh đổi hiệu năng:
bảng chỉ ~1.500 dòng, một câu SELECT có index là đủ nhanh.

Không dùng FULLTEXT của MySQL: parser mặc định bỏ token dưới 3 ký tự, mà
tiếng Việt toàn âm tiết ngắn ("da", "mụn", "dầu") nên gần như không khớp.
Collation utf8mb4_unicode_ci không phân biệt dấu, nên "duong am" vẫn khớp
"Dưỡng Ẩm" — khách gõ không dấu vẫn tìm được.
"""
import re
import unicodedata

from sqlalchemy import case, literal, or_
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Brand, Category, Product, product_categories

# Số sản phẩm gửi cho Gemini. Giữ nhỏ để tiết kiệm token và để AI chọn kỹ.
DEFAULT_LIMIT = 5
# Số dòng tối đa kéo từ DB về chấm điểm; đủ rộng để xếp hạng, đủ nhỏ để nhanh
SQL_FETCH_LIMIT = 120
MAX_TOKENS = 12

def strip_accents(text):
    """'Dưỡng Ẩm' -> 'duong am'. Bỏ dấu để so khớp không phụ thuộc dấu.

    Bắt buộc phải có: collation MySQL không phân biệt dấu nên SQL tìm ra hàng,
    nhưng khâu chấm điểm bằng Python lại so chuỗi nguyên bản — "duong" không
    bao giờ bằng "dưỡng", nên mọi câu hỏi gõ không dấu đều trả về rỗng.
    """
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


# Từ đệm không mang thông tin sản phẩm. Viết KHÔNG DẤU vì tokens() đã bỏ dấu.
# Cố ý KHÔNG đưa vào: "da" (da mặt), "nen" (kem nền), "goi" (dầu gội),
# "tam" (sữa tắm), "sua" (sữa rửa mặt), "dau" (da dầu, dầu gội, dầu tẩy trang)
# — chúng là từ khóa sản phẩm thật.
#
# CẢNH BÁO khi thêm từ mới: danh sách này so khớp trên chuỗi ĐÃ BỎ DẤU nên hai
# từ khác nghĩa có thể trùng nhau. "đâu" (ở đâu) và "dầu" (da dầu) đều thành
# "dau"; từng loại bỏ "dau" làm mọi câu hỏi "da dầu" bị tìm thành "da".
STOPWORDS = {
    "toi", "minh", "em", "anh", "chi", "ban", "shop", "oi", "nhe", "nha", "voi", "cho",
    "la", "va", "cua", "nao", "gi", "khong", "ko", "muon", "can", "tim", "giup", "duoc",
    "mot", "cac", "nhung", "hay", "thi", "ma", "loai", "mua", "rat", "bi", "hoi",
    "nay", "do", "san", "pham", "tu", "van", "y",
    "duoi", "tren", "khoang", "gia", "tien", "ngan", "sach", "re", "dat",
    # từ đệm của câu nối tiếp: "còn cái nào khác không", "loại nào tốt hơn"
    "con", "cai", "khac", "hon", "nua", "them", "tot", "co", "the", "o", "bao", "nhieu",
}

_TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def tokens(text):
    """Tách từ, bỏ dấu, bỏ từ đệm. Nhờ bỏ dấu nên 'duong am' khớp 'Dưỡng Ẩm'."""
    plain = strip_accents(text).lower()
    return [t for t in _TOKEN_RE.findall(plain) if t not in STOPWORDS and len(t) > 1]


# ---------------------------------------------------------------- ngân sách

_UNITS = {"k": 1_000, "nghin": 1_000, "ngan": 1_000, "ng": 1_000,
          "tr": 1_000_000, "trieu": 1_000_000, "m": 1_000_000}
_NUM = r"(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|ng|tr|trieu|m)?"

# Mọi biểu thức chạy trên chuỗi ĐÃ BỎ DẤU nên chỉ cần viết một dạng,
# khách gõ "dưới 300k" hay "duoi 300k" đều khớp.
_RANGE_RE = re.compile(rf"(?:tu\s)?\s*{_NUM}\s*(?:-|–|den|toi)\s*{_NUM}", re.IGNORECASE)
_UNDER_RE = re.compile(
    rf"(?:duoi|<|be hon|nho hon|khong qua|toi da|it hon)\s*{_NUM}", re.IGNORECASE
)
_OVER_RE = re.compile(rf"(?:tren|>|lon hon|hon|tu)\s*{_NUM}", re.IGNORECASE)
_AROUND_RE = re.compile(rf"(?:khoang|tam|co|chung)\s*{_NUM}", re.IGNORECASE)


def _to_vnd(number, unit):
    value = float(number.replace(",", "."))
    if unit:
        return int(value * _UNITS[unit.lower()])
    # Không ghi đơn vị: số nhỏ hiểu là "nghìn" (khách hay nói "tầm 300")
    return int(value * 1_000) if value < 1_000 else int(value)


def parse_budget(text):
    """Bóc ngân sách từ câu hỏi. Trả về (min_price, max_price), None nếu không nêu.

    Hiểu: "dưới 300k", "từ 200-500k", "trên 1 triệu", "khoảng 500 nghìn", "tầm 300".
    """
    plain = strip_accents(text).lower()

    m = _RANGE_RE.search(plain)
    if m:
        lo = _to_vnd(m.group(1), m.group(2) or m.group(4))
        hi = _to_vnd(m.group(3), m.group(4) or m.group(2))
        return (min(lo, hi), max(lo, hi))

    m = _UNDER_RE.search(plain)
    if m:
        return (None, _to_vnd(m.group(1), m.group(2)))

    m = _AROUND_RE.search(plain)
    if m:
        target = _to_vnd(m.group(1), m.group(2))
        # "khoảng 500k" = chấp nhận lệch 30% hai phía
        return (int(target * 0.7), int(target * 1.3))

    m = _OVER_RE.search(plain)
    if m:
        return (_to_vnd(m.group(1), m.group(2)), None)

    return (None, None)


# ---------------------------------------------------------------- tìm kiếm

def _bigrams(words):
    return {f"{a} {b}" for a, b in zip(words, words[1:])}


def _escape_like(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def find_candidates(query, limit=DEFAULT_LIMIT, in_stock_only=False, budget=None, category_hint=None):
    """Trả về list (Product, score 0..1) xếp giảm dần theo độ liên quan.

    Mỗi lần gọi là một câu SELECT mới -> giá, tồn kho, sản phẩm mới luôn đúng.

    budget: (min, max) truyền sẵn từ ngoài. Người gọi phải tự quyết định lấy
    ngân sách ở tin nhắn nào — nếu để hàm này tự bóc từ `query` đã ghép cả
    lịch sử, regex sẽ bắt trúng con số của tin nhắn CŨ ("dưới 50k") và lọc sai
    cho câu hỏi mới ("dưới 200k").

    category_hint: tên các danh mục khách đang thực sự hỏi. Sản phẩm thuộc
    danh mục đó được xếp lên trước — KHÔNG loại bỏ sản phẩm khác, chỉ đổi thứ
    tự. Cần thiết vì khớp theo từ dễ nhầm: "Kem Chống Nắng ... Anti-Acnes
    Serum" có chữ "Serum" trong tên nên vẫn trúng khi khách hỏi serum.
    """
    words = tokens(query)[:MAX_TOKENS]
    min_price, max_price = budget if budget is not None else parse_budget(query)

    # --- Lọc ở tầng SQL: trạng thái kinh doanh, giá, tồn kho ---
    stmt = (
        Product.query.options(selectinload(Product.categories))
        .outerjoin(Brand, Brand.brand_id == Product.brand_id)
        .filter(Product.status != "hidden")
    )
    if min_price is not None:
        stmt = stmt.filter(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.filter(Product.price <= max_price)
    if in_stock_only:
        stmt = stmt.filter(Product.stock > 0)

    if words:
        patterns = [f"%{_escape_like(w)}%" for w in words]
        in_category = (
            db.session.query(product_categories.c.product_id)
            .join(Category, Category.category_id == product_categories.c.category_id)
            .filter(or_(*[Category.name.ilike(p, escape="\\") for p in patterns]))
        )
        stmt = stmt.filter(
            or_(
                *[Product.name.ilike(p, escape="\\") for p in patterns],
                *[Brand.name.ilike(p, escape="\\") for p in patterns],
                Product.product_id.in_(in_category),
            )
        )
        # Phải XẾP THEO ĐỘ LIÊN QUAN NGAY TRONG SQL rồi mới cắt.
        # Âm tiết tiếng Việt rất phổ biến ("da", "dưỡng", "ẩm") nên một từ khóa
        # có thể khớp hàng trăm sản phẩm; nếu xếp theo độ phổ biến trước thì
        # sản phẩm mới (0 đánh giá) bị LIMIT cắt mất dù khớp đủ mọi từ khóa.
        relevance = sum(
            (case((Product.name.ilike(p, escape="\\"), 2), else_=0) for p in patterns),
            literal(0),
        ) + sum(
            (case((Brand.name.ilike(p, escape="\\"), 1), else_=0) for p in patterns),
            literal(0),
        )
        ordering = (relevance.desc(), (Product.stock > 0).desc(), Product.review_count.desc())
    elif min_price is None and max_price is None:
        # Câu hỏi không có từ khóa lẫn ngân sách -> chưa đủ căn cứ để gợi ý
        return []
    else:
        ordering = ((Product.stock > 0).desc(), Product.review_count.desc(), Product.rating.desc())

    rows = stmt.order_by(*ordering).limit(SQL_FETCH_LIMIT).all()
    if not rows:
        return []

    # --- Xếp hạng trên tập đã lọc (nhỏ) ---
    if not words:
        # Chỉ lọc theo giá: DB đã sắp theo còn hàng + độ phổ biến
        return [(p, 1.0) for p in rows[:limit]]

    hint = {c.lower() for c in (category_hint or ())}
    q_set, q_bigrams = set(words), _bigrams(words)
    max_score = len(q_set) + 2 * len(q_bigrams)

    # Câu dài mà chỉ trúng đúng một từ thì gần như chắc chắn là trùng ngẫu nhiên:
    # tiếng Việt không dấu khiến "bán" khớp "Ban Ngày", "bay" khớp "Bay Màu"...
    # Đòi ít nhất 2 từ khớp khi khách hỏi từ 3 từ có nghĩa trở lên.
    min_hits = 2 if len(q_set) >= 3 else 1

    scored = []
    for p in rows:
        text = " ".join(
            [p.name, p.brand.name if p.brand else "", " ".join(c.name for c in p.categories)]
        ).lower()
        words_p = tokens(text)           # giữ thứ tự để bigram có nghĩa
        hits = q_set & set(words_p)
        if len(hits) < min_hits:
            continue
        score = len(hits) + 2 * len(q_bigrams & _bigrams(words_p))
        if score:
            in_hint = bool(hint) and any(c.name.lower() in hint for c in p.categories)
            scored.append((in_hint, score, p.stock > 0, p.review_count, p))

    if not scored:
        return []
    scored.sort(key=lambda x: (x[0], x[1], x[2], x[3]), reverse=True)
    return [(p, round(s / max_score, 4)) for _, s, _, _, p in scored[:limit]]
