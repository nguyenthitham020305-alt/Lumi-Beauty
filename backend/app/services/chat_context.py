"""Tiêu chí tư vấn tích luỹ qua các lượt chat: khách đang hỏi loại sản phẩm nào, cho da nào.

VẤN ĐỀ ĐƯỢC GIẢI: khách hỏi "kem chống nắng", lượt sau nhắn "cho da khô".
Nếu chỉ tìm bằng câu hiện tại thì "da khô" khớp hàng loạt kem dưỡng ẩm và
KHÔNG có kem chống nắng nào lọt vào danh sách ứng viên. Gemini bị buộc chỉ
được chọn trong danh sách đó nên đành gợi ý sai loại sản phẩm, dù nó vẫn
đọc được lịch sử hội thoại.

CÁCH LÀM: giống hệt cách module chatbot đã xử lý NGÂN SÁCH từ trước — tiêu chí
nào câu mới không nhắc tới thì giữ nguyên của câu trước, câu mới nhắc tới thì
ghi đè. Ở đây mở rộng ý tưởng đó sang loại sản phẩm và loại da.
"""
import re

from .product_search import strip_accents, tokens

# Câu nối tiếp ("còn loại nào khác", "rẻ hơn nữa") gần như không còn từ mang
# nội dung sau khi bỏ từ đệm. Từ ngưỡng này trở xuống thì coi là câu nói tiếp.
#
# Phải là 1, không được là 2: "bán máy bay không" sau khi bỏ từ đệm còn đúng
# hai từ ("may", "bay"); lấy ngưỡng 2 thì câu lạc đề cũng được mượn ngữ cảnh
# và chatbot sẽ gợi ý mỹ phẩm cho nó. Ngưỡng 1 vẫn ôm được câu nối tiếp có
# một từ khoá riêng như "cerave có không".
SHORT_FOLLOW_UP_TOKENS = 1

# Khoá = nhãn hiển thị cho khách. Giá trị = các cách khách hay gõ, VIẾT KHÔNG DẤU
# vì so khớp chạy trên chuỗi đã bỏ dấu.
PRODUCT_TYPES = {
    "kem chống nắng": ("kem chong nang", "chong nang", "sunscreen", "kcn", "spf"),
    "sữa rửa mặt": ("sua rua mat", "rua mat", "cleanser"),
    "tẩy trang": ("tay trang", "nuoc tay trang", "dau tay trang", "sap tay trang", "micellar"),
    "tẩy tế bào chết": ("tay te bao chet", "tay da chet", "scrub", "peeling"),
    "toner": ("toner", "nuoc hoa hong", "nuoc can bang"),
    "serum": ("serum", "tinh chat", "essence", "ampoule"),
    "kem dưỡng ẩm": ("kem duong am", "duong am", "kem duong", "moisturizer", "lotion"),
    "kem mắt": ("kem mat", "duong mat", "eye cream"),
    "mặt nạ": ("mat na", "mask"),
    "son": ("son moi", "son kem", "son li", "son duong", "son bong", "son thoi", "son"),
    "kem nền": ("kem nen", "foundation", "cushion"),
    "phấn": ("phan phu", "phan nuoc", "phan ma"),
    "nước hoa": ("nuoc hoa",),
    "dầu gội": ("dau goi",),
    "sữa tắm": ("sua tam", "gel tam"),
    "dưỡng thể": ("duong the", "body lotion", "kem body"),
}

SKIN_TYPES = {
    "da khô": ("da kho", "da thieu am", "kho rap"),
    "da dầu": ("da dau", "da nhon", "da bong dau", "da dau mun"),
    "da hỗn hợp": ("da hon hop", "hon hop thien dau", "hon hop thien kho"),
    "da nhạy cảm": ("da nhay cam", "nhay cam", "da de kich ung"),
    "da mụn": ("da mun", "bi mun", "tri mun", "mun trung ca", "mun an", "mun dau den"),
    "da thường": ("da thuong",),
    "da lão hoá": ("da lao hoa", "lao hoa", "nep nhan", "chong lao hoa"),
    "da xỉn màu": ("da xin mau", "da kem sang", "duong trang", "lam sang da", "tham nam"),
}


# Loại da chỉ có nghĩa với sản phẩm chăm sóc da và trang điểm nền. Khách hỏi
# son, nước hoa hay dầu gội thì "da dầu" của lượt trước không còn liên quan;
# mang theo sẽ khiến chatbot nói những câu vô nghĩa như "Lumi chưa có son ghi
# riêng cho da dầu".
SKIN_TYPE_APPLIES_TO = frozenset({
    "kem chống nắng", "sữa rửa mặt", "tẩy trang", "tẩy tế bào chết", "toner",
    "serum", "kem dưỡng ẩm", "kem mắt", "mặt nạ", "kem nền", "phấn",
    "sữa tắm", "dưỡng thể",
})

# Tên danh mục ĐÚNG NHƯ TRONG CSDL. Loại nào chưa có danh mục tương ứng thì
# bỏ trống — khi đó chỉ xếp hạng theo từ khoá như trước, không ưu tiên gì thêm.
CATEGORY_FOR_TYPE = {
    "kem chống nắng": ("Chống nắng",),
    "sữa rửa mặt": ("Sữa rửa mặt",),
    "tẩy trang": ("Tẩy trang",),
    "serum": ("Serum",),
    "kem dưỡng ẩm": ("Kem dưỡng mặt",),
    "kem mắt": ("Kem dưỡng mắt",),
    "mặt nạ": ("Mặt nạ", "Mặt nạ giấy"),
    "son": ("Son kem",),
    "kem nền": ("Kem nền", "Cushion"),
    "nước hoa": ("Nước hoa",),
    "dầu gội": ("Dầu gội",),
    "sữa tắm": ("Sữa tắm",),
    "dưỡng thể": ("Dưỡng thể",),
}


def _compile(table):
    """Gom thành danh sách (regex, nhãn, độ dài mẫu)."""
    pairs = [(p, label) for label, patterns in table.items() for p in patterns]
    # \b hai đầu để "son" không khớp bên trong một từ dài hơn
    return [(re.compile(rf"\b{re.escape(p)}\b"), label, len(p)) for p, label in pairs]


_PRODUCT_PATTERNS = _compile(PRODUCT_TYPES)
_SKIN_PATTERNS = _compile(SKIN_TYPES)


def _best_match(plain, patterns):
    """Mẫu khớp SỚM NHẤT trong câu thì thắng; cùng vị trí thì mẫu DÀI HƠN thắng.

    Tiếng Việt đặt danh từ chính lên trước, phần sau chỉ bổ nghĩa, nên
    "mặt nạ dưỡng ẩm" phải ra MẶT NẠ chứ không phải kem dưỡng ẩm.
    Luật "cùng vị trí thì dài thắng" lo nốt các mẫu lồng nhau:
    "nước hoa hồng" ra TONER chứ không phải nước hoa.
    """
    best = None
    for regex, label, length in patterns:
        m = regex.search(plain)
        if m is None:
            continue
        key = (m.start(), -length)
        if best is None or key < best[0]:
            best = (key, label)
    return best[1] if best else None


def detect(text):
    """Bóc tiêu chí nêu trong MỘT câu. Chỉ trả về tiêu chí thật sự được nhắc tới."""
    plain = strip_accents(text).lower()
    found = {}
    product = _best_match(plain, _PRODUCT_PATTERNS)
    if product:
        found["product_type"] = product
    skin = _best_match(plain, _SKIN_PATTERNS)
    if skin:
        found["skin_type"] = skin
    return found


def accumulate(history, message):
    """Gom tiêu chí qua cả hội thoại. Trả về (tiêu chí tích luỹ, tiêu chí nêu ở câu này).

    history: list (sender, content) cũ → mới, giống tham số của chatbot.answer.
    """
    slots = {}
    for sender, content in history:
        if sender == "user":
            slots.update(detect(content))
    detected_now = detect(message)
    slots.update(detected_now)

    product = slots.get("product_type")
    if product is not None and product not in SKIN_TYPE_APPLIES_TO:
        slots.pop("skin_type", None)

    return slots, detected_now


def should_carry(message, detected_now, budget_in_message):
    """Có được phép áp tiêu chí cũ vào câu này không.

    Câu lạc đề ("bán máy bay không") có đủ từ của riêng nó mà không nêu tiêu chí
    nào; nếu vẫn mượn ngữ cảnh cũ thì chatbot sẽ gợi ý mỹ phẩm cho một câu
    chẳng liên quan. Chỉ mượn khi câu này có nêu tiêu chí, hoặc là câu nói tiếp
    ngắn kiểu "còn loại nào khác".
    """
    if detected_now or budget_in_message:
        return True
    return len(tokens(message)) <= SHORT_FOLLOW_UP_TOKENS


def build_query(slots, message):
    """Câu tìm kiếm = tiêu chí tích luỹ + nguyên văn câu hiện tại.

    Giữ lại nguyên văn để không mất những từ khoá nằm ngoài hai bảng trên,
    ví dụ tên thương hiệu khách vừa nhắc ("của Cerave").
    """
    parts = [slots.get("product_type"), slots.get("skin_type"), message]
    return " ".join(p for p in parts if p)


def category_hint(slots):
    """Danh mục nên xếp lên trước, suy ra từ loại sản phẩm khách đang hỏi."""
    return CATEGORY_FOR_TYPE.get(slots.get("product_type"), ())


def _money(amount):
    return f"{amount:,.0f}đ".replace(",", ".")


def describe(slots, budget=None):
    """Mô tả tiêu chí thành danh sách nhãn ngắn, dùng cho cả khách lẫn Gemini."""
    labels = [slots.get("product_type"), slots.get("skin_type")]
    labels = [x for x in labels if x]

    if budget:
        lo, hi = budget
        if lo is not None and hi is not None:
            labels.append(f"{_money(lo)} - {_money(hi)}")
        elif hi is not None:
            labels.append(f"dưới {_money(hi)}")
        elif lo is not None:
            labels.append(f"trên {_money(lo)}")
    return labels
