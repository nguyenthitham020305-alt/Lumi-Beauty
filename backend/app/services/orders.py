import re
from datetime import datetime
from urllib.parse import urlencode

from flask import current_app
from sqlalchemy import func

from ..extensions import db
from ..models import Order, Product, Province, Ward
from .auth import EMAIL_RE, PHONE_RE

# Cửa hàng chỉ thu tiền khi giao hàng nên khách không phải chọn gì ở trang
# đặt hàng. Giữ lại hằng số để các tầng khác tham chiếu một chỗ duy nhất.
PAYMENT_METHOD = "cod"
NOTE_MAX = 500


class OrderRuleError(Exception):
    """Thao tác vi phạm quy tắc nghiệp vụ; message hiển thị thẳng cho người dùng."""


def shipping_fee_for(subtotal):
    cfg = current_app.config
    if subtotal <= 0 or subtotal >= cfg["FREE_SHIPPING_THRESHOLD"]:
        return 0
    return cfg["SHIPPING_FEE"]


def price_summary(subtotal):
    """LUMI không chạy khuyến mãi nên discount_amount luôn 0; giữ trường để khớp bảng orders."""
    shipping_fee = shipping_fee_for(subtotal)
    discount = 0
    return {
        "subtotal": subtotal,
        "discount_amount": discount,
        "shipping_fee": shipping_fee,
        "total_amount": subtotal + shipping_fee - discount,
        "free_shipping_threshold": current_app.config["FREE_SHIPPING_THRESHOLD"],
    }


def validate_checkout(data):
    """Trả về (dữ liệu đã chuẩn hoá, dict lỗi theo trường)."""
    name = (data.get("recipient_name") or "").strip()
    phone = re.sub(r"[\s.-]", "", data.get("recipient_phone") or "")
    email = (data.get("recipient_email") or "").strip().lower()
    street = (data.get("street_address") or "").strip()
    note = (data.get("note") or "").strip()

    errors = {}
    if not 2 <= len(name) <= 100:
        errors["recipient_name"] = "Họ tên phải từ 2 đến 100 ký tự"
    if not PHONE_RE.match(phone):
        errors["recipient_phone"] = "Số điện thoại không hợp lệ (vd 0912345678)"
    if not EMAIL_RE.match(email) or len(email) > 255:
        errors["recipient_email"] = "Email không hợp lệ"

    province = ward = None
    try:
        province = db.session.get(Province, int(data.get("province_code")))
    except (TypeError, ValueError):
        pass
    if province is None:
        errors["province_code"] = "Tỉnh/Thành phố là bắt buộc"
    try:
        ward = db.session.get(Ward, int(data.get("ward_code")))
    except (TypeError, ValueError):
        pass
    if ward is None or (province and ward.province_code != province.province_code):
        errors["ward_code"] = "Phường/Xã là bắt buộc"
        ward = None

    if not 5 <= len(street) <= 255:
        errors["street_address"] = "Vui lòng nhập số nhà, tên đường (5-255 ký tự)"
    if len(note) > NOTE_MAX:
        errors["note"] = f"Ghi chú tối đa {NOTE_MAX} ký tự"

    return {
        "recipient_name": name,
        "recipient_phone": phone,
        "recipient_email": email,
        "province": province,
        "ward": ward,
        "street_address": street,
        "note": note or None,
        # Không đọc từ client: chỉ có một phương thức nên server tự quyết
        "payment_method": PAYMENT_METHOD,
    }, errors


def next_order_code(attempt=0):
    """DH + ngày + số thứ tự trong ngày, vd DH20260926001.

    attempt tăng mỗi lần route thử lại sau khi trùng mã (2 đơn tạo cùng lúc).
    """
    prefix = f"DH{datetime.now():%Y%m%d}"
    last = Order.query.filter(Order.order_code.like(f"{prefix}%")).with_entities(func.max(Order.order_code)).scalar()
    last_seq = int(last[len(prefix):]) if last else 0
    return f"{prefix}{last_seq + 1 + attempt:03d}"


def order_payload(order, with_items=True):
    payment = order.payment
    data = {
        "order_code": order.order_code,
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "status": order.status,
        "subtotal": order.subtotal,
        "discount_amount": order.discount_amount,
        "shipping_fee": order.shipping_fee,
        "total_amount": order.total_amount,
        "item_count": sum(i.quantity for i in order.items),
        "payment": {
            "method": payment.method if payment else None,
            "status": payment.status if payment else None,
            "paid_at": payment.paid_at.isoformat() if payment and payment.paid_at else None,
        },
    }
    if not with_items:
        data["first_item"] = (
            {"name": order.items[0].product_name, "image": order.items[0].product_image} if order.items else None
        )
        return data

    data.update(
        {
            "recipient": {
                "name": order.recipient_name,
                "phone": order.recipient_phone,
                "email": order.recipient_email,
                "address": order.shipping_address,
            },
            "note": order.note,
            "items": [
                {
                    "product_id": i.product_id,
                    "slug": i.product.slug if i.product else None,
                    "name": i.product_name,
                    "image": i.product_image,
                    "sku": i.product.sku if i.product else None,
                    "quantity": i.quantity,
                    "unit_price": i.unit_price,
                    "subtotal": i.subtotal,
                }
                for i in order.items
            ],
        }
    )
    return data
