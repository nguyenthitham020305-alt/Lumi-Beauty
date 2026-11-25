import logging
import re
from functools import wraps

import bcrypt
from flask import g, session

from ..extensions import db
from ..models import Province, User, Ward

log = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
# Di động Việt Nam: 0 hoặc +84, theo sau đầu số 3/5/7/8/9 và 8 chữ số
PHONE_RE = re.compile(r"^(0|\+84)[35789]\d{8}$")
PASSWORD_MIN, PASSWORD_MAX = 6, 32

# Hash giả để so sánh khi email không tồn tại, giúp thời gian phản hồi như nhau
# và không lộ email nào đã đăng ký
_DUMMY_HASH = bcrypt.hashpw(b"lumi-dummy-password", bcrypt.gensalt()).decode()


def hash_password(raw):
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def check_password(raw, hashed):
    try:
        return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:  # cột password không phải hash bcrypt hợp lệ
        return False


def normalize_email(email):
    return (email or "").strip().lower()


def validate_password(password, confirm=None):
    """Trả về thông báo lỗi, hoặc None nếu hợp lệ."""
    if not PASSWORD_MIN <= len(password) <= PASSWORD_MAX:
        return f"Mật khẩu phải từ {PASSWORD_MIN} đến {PASSWORD_MAX} ký tự"
    if not (re.search(r"[A-Za-z]", password) and re.search(r"\d", password)):
        return "Mật khẩu phải có cả chữ và số"
    if confirm is not None and password != confirm:
        return "Mật khẩu xác nhận không khớp"
    return None


def validate_registration(data):
    """Trả về (dữ liệu đã chuẩn hoá, dict lỗi theo từng trường)."""
    name = (data.get("name") or "").strip()
    email = normalize_email(data.get("email"))
    phone = re.sub(r"[\s.-]", "", data.get("phone") or "")
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or ""

    errors = {}
    if not 2 <= len(name) <= 100:
        errors["name"] = "Họ tên phải từ 2 đến 100 ký tự"
    if not EMAIL_RE.match(email) or len(email) > 255:
        errors["email"] = "Email không hợp lệ"
    if not PHONE_RE.match(phone):
        errors["phone"] = "Số điện thoại không hợp lệ (vd 0912345678)"
    password_error = validate_password(password)
    if password_error:
        errors["password"] = password_error
    elif password != confirm:
        errors["confirm_password"] = "Mật khẩu xác nhận không khớp"

    return {"name": name, "email": email, "phone": phone, "password": password}, errors


def validate_profile(data):
    """Kiểm tra thông tin khách tự sửa trong trang hồ sơ.

    KHÔNG có email: email là tên đăng nhập, mà hệ thống chưa gửi được thư xác
    minh, nên khách gõ nhầm là mất luôn đường vào tài khoản. Muốn đổi email thì
    phải qua quản trị viên.

    Địa chỉ mặc định là tuỳ chọn, nhưng phải đủ CẢ BA phần hoặc bỏ trống cả ba:
    `User.saved_address()` chỉ điền sẵn khi đủ ba, thiếu một phần thì dữ liệu
    lưu được mà không dùng được.
    """
    name = (data.get("name") or "").strip()
    phone = re.sub(r"[\s.-]", "", data.get("phone") or "")
    street = (data.get("street_address") or "").strip()
    raw_province = data.get("province_code")
    raw_ward = data.get("ward_code")

    errors = {}
    if not 2 <= len(name) <= 100:
        errors["name"] = "Họ tên phải từ 2 đến 100 ký tự"
    if not PHONE_RE.match(phone):
        errors["phone"] = "Số điện thoại không hợp lệ (vd 0912345678)"

    has_any = bool(street) or raw_province not in (None, "") or raw_ward not in (None, "")
    province = ward = None
    if has_any:
        try:
            province = db.session.get(Province, int(raw_province))
        except (TypeError, ValueError):
            pass
        if province is None:
            errors["province_code"] = "Tỉnh/Thành phố là bắt buộc"
        try:
            ward = db.session.get(Ward, int(raw_ward))
        except (TypeError, ValueError):
            pass
        if ward is None or (province and ward.province_code != province.province_code):
            errors["ward_code"] = "Phường/Xã là bắt buộc"
            ward = None
        if not 5 <= len(street) <= 255:
            errors["street_address"] = "Vui lòng nhập số nhà, tên đường (5-255 ký tự)"

    return {
        "name": name,
        "phone": phone,
        # Bỏ trống cả ba = xoá địa chỉ đã lưu
        "province_code": province.province_code if province else None,
        "ward_code": ward.ward_code if ward else None,
        "street_address": street if has_any else None,
    }, errors


def change_password(user, current, new_password, confirm):
    """Đổi mật khẩu. Trả về dict lỗi theo trường, rỗng nghĩa là thành công.

    Bắt buộc nhập mật khẩu hiện tại: nếu không, ai mượn được máy lúc khách quên
    đăng xuất là chiếm được tài khoản ngay.
    """
    if not check_password(current or "", user.password):
        return {"current_password": "Mật khẩu hiện tại không đúng"}

    error = validate_password(new_password or "", confirm)
    if error:
        field = "confirm_password" if error == "Mật khẩu xác nhận không khớp" else "new_password"
        return {field: error}
    if check_password(new_password, user.password):
        return {"new_password": "Mật khẩu mới phải khác mật khẩu hiện tại"}

    user.password = hash_password(new_password)
    return {}


def authenticate(email, password):
    user = User.query.filter_by(email=normalize_email(email)).first()
    if user is None:
        check_password(password, _DUMMY_HASH)
        return None
    return user if check_password(password, user.password) else None


def log_in(user):
    # clear() trước để chống session fixation: phiên cũ không mang sang phiên đăng nhập
    session.clear()
    session["user_id"] = user.user_id
    session.permanent = True


def log_out():
    session.clear()


def current_user():
    """Đọc lại user từ DB mỗi request để khoá tài khoản / đổi role có hiệu lực ngay."""
    if "current_user" not in g:
        user_id = session.get("user_id")
        user = db.session.get(User, user_id) if user_id else None
        if user is not None and not user.is_active:
            session.clear()
            user = None
        g.current_user = user
    return g.current_user


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if current_user() is None:
            return {"error": "Vui lòng đăng nhập"}, 401
        return view(*args, **kwargs)

    return wrapper


def admin_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return {"error": "Vui lòng đăng nhập"}, 401
        if not user.is_admin:
            return {"error": "Bạn không có quyền truy cập trang quản trị"}, 403
        return view(*args, **kwargs)

    return wrapper
