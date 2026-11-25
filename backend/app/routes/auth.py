from flask import Blueprint, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import User
from ..services import auth

auth_bp = Blueprint("auth", __name__)


def _profile(user):
    """Hồ sơ trả cho frontend: thông tin tài khoản + địa chỉ mặc định đã định dạng."""
    return {
        **user.to_dict(),
        "address": user.saved_address(),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@auth_bp.post("/register")
def register():
    """Body: {name, email, phone, password, confirm_password}. Luôn tạo role customer."""
    data, errors = auth.validate_registration(request.get_json(silent=True) or {})
    if errors:
        return {"error": "Thông tin đăng ký chưa hợp lệ", "errors": errors}, 400

    if User.query.filter_by(email=data["email"]).first():
        return {"error": "Email đã được sử dụng", "errors": {"email": "Email đã được sử dụng"}}, 409

    # role cố định ở đây: body gửi kèm "role" cũng bị bỏ qua
    user = User(
        name=data["name"],
        email=data["email"],
        phone=data["phone"],
        password=auth.hash_password(data["password"]),
        role="customer",
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:  # hai request cùng email chạy song song
        db.session.rollback()
        return {"error": "Email đã được sử dụng", "errors": {"email": "Email đã được sử dụng"}}, 409

    auth.log_in(user)
    return {"user": _profile(user)}, 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email, password = data.get("email") or "", data.get("password") or ""
    if not email or not password:
        return {"error": "Vui lòng nhập email và mật khẩu"}, 400

    user = auth.authenticate(email, password)
    if user is None:
        return {"error": "Email hoặc mật khẩu không đúng"}, 401
    if not user.is_active:
        return {"error": "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ"}, 403

    auth.log_in(user)
    return {"user": _profile(user)}


@auth_bp.post("/logout")
def logout():
    auth.log_out()
    return {"ok": True}


@auth_bp.get("/me")
def me():
    """Chưa đăng nhập trả user = null (200) để frontend không coi là lỗi."""
    user = auth.current_user()
    return {"user": _profile(user) if user else None}


@auth_bp.patch("/me")
@auth.login_required
def update_me():
    """Body: {name, phone, province_code?, ward_code?, street_address?}.

    Email và vai trò KHÔNG sửa được ở đây: email là tên đăng nhập (hệ thống chưa
    gửi được thư xác minh), còn vai trò chỉ quản trị viên mới đổi. Gửi kèm hai
    trường đó trong body cũng bị bỏ qua.
    """
    data, errors = auth.validate_profile(request.get_json(silent=True) or {})
    if errors:
        return {"error": "Thông tin chưa hợp lệ", "errors": errors}, 400

    user = auth.current_user()
    user.name = data["name"]
    user.phone = data["phone"]
    user.province_code = data["province_code"]
    user.ward_code = data["ward_code"]
    user.street_address = data["street_address"]
    db.session.commit()
    db.session.refresh(user)
    return {"user": _profile(user)}


@auth_bp.post("/change-password")
@auth.login_required
def change_password():
    """Body: {current_password, new_password, confirm_password}.

    Phiên đăng nhập được giữ nguyên sau khi đổi: khách đang thao tác dở không bị
    đá ra ngoài. Mật khẩu cũ lập tức hết tác dụng cho những lần đăng nhập sau.
    """
    data = request.get_json(silent=True) or {}
    errors = auth.change_password(
        auth.current_user(),
        data.get("current_password"),
        data.get("new_password"),
        data.get("confirm_password"),
    )
    if errors:
        db.session.rollback()
        return {"error": "Không đổi được mật khẩu", "errors": errors}, 400

    db.session.commit()
    return {"ok": True}
