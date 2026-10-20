"""Thống kê và thao tác khoá/mở khoá tài khoản khách hàng phía quản trị.

Mọi payload ở đây KHÔNG bao giờ chứa cột `password` (bcrypt hash).
"""
from sqlalchemy import case, func

from ..extensions import db
from ..models import Order, User

# Đơn đã huỷ không tính vào tổng chi tiêu
SPENDING_STATUSES = ("pending", "confirmed", "shipping", "delivered")


class CustomerRuleError(Exception):
    """Thao tác bị từ chối; message hiển thị thẳng cho admin."""


def order_stats_subquery():
    """Số đơn + tổng chi tiêu của từng khách, gộp sẵn để tránh N+1 khi liệt kê."""
    spent = func.sum(case((Order.status.in_(SPENDING_STATUSES), Order.total_amount), else_=0))
    return (
        db.session.query(
            Order.user_id.label("user_id"),
            func.count(Order.order_id).label("order_count"),
            func.coalesce(spent, 0).label("total_spent"),
            func.max(Order.order_date).label("last_order_at"),
        )
        .filter(Order.user_id.isnot(None))
        .group_by(Order.user_id)
        .subquery()
    )


def customer_payload(user, order_count=0, total_spent=0, last_order_at=None):
    """Không bao giờ trả về user.password."""
    return {
        "id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "is_active": bool(user.is_active),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "order_count": int(order_count or 0),
        "total_spent": int(total_spent or 0),
        "last_order_at": last_order_at.isoformat() if last_order_at else None,
    }


def set_active(user, is_active, acting_admin):
    """Khoá / mở khoá tài khoản. Trả về user đã cập nhật."""
    if user.role == "admin":
        raise CustomerRuleError("Không thể khoá tài khoản quản trị viên từ trang này")
    if acting_admin is not None and user.user_id == acting_admin.user_id:
        raise CustomerRuleError("Không thể tự khoá tài khoản của chính mình")

    user.is_active = bool(is_active)
    db.session.commit()
    db.session.refresh(user)
    return user


def order_history(user_id, limit=50):
    """Lịch sử đơn của một khách, mới nhất trước."""
    orders = (
        Order.query.filter_by(user_id=user_id)
        .order_by(Order.order_date.desc(), Order.order_id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "order_code": o.order_code,
            "order_date": o.order_date.isoformat() if o.order_date else None,
            "status": o.status,
            "total_amount": o.total_amount,
            "item_count": len(o.items),
            "payment_method": o.payment.method if o.payment else None,
            "payment_status": o.payment.status if o.payment else None,
        }
        for o in orders
    ]


def status_breakdown(user_id):
    """{trạng thái đơn: số lượng} để vẽ tóm tắt ở trang chi tiết."""
    rows = (
        db.session.query(Order.status, func.count(Order.order_id))
        .filter(Order.user_id == user_id)
        .group_by(Order.status)
        .all()
    )
    return dict(rows)
