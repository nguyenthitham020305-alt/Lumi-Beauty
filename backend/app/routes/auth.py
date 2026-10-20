from flask import Blueprint, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import User
from ..services import auth

auth_bp = Blueprint("auth", __name__)


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
    return {"user": user.to_dict()}, 201


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
    return {"user": user.to_dict()}


@auth_bp.post("/logout")
def logout():
    auth.log_out()
    return {"ok": True}


@auth_bp.get("/me")
def me():
    """Chưa đăng nhập trả user = null (200) để frontend không coi là lỗi."""
    user = auth.current_user()
    return {"user": user.to_dict() if user else None}
