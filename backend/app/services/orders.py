import re
from datetime import datetime
from urllib.parse import urlencode

from flask import current_app
from sqlalchemy import func

from ..extensions import db
from ..models import Order, Province, Ward
from .auth import EMAIL_RE, PHONE_RE

PAYMENT_METHODS = ("cod", "bank_transfer")
NOTE_MAX = 500


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
    method = data.get("payment_method")

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
    if method not in PAYMENT_METHODS:
        errors["payment_method"] = "Vui lòng chọn phương thức thanh toán"

    return {
        "recipient_name": name,
        "recipient_phone": phone,
        "recipient_email": email,
        "province": province,
        "ward": ward,
        "street_address": street,
        "note": note or None,
        "payment_method": method,
    }, errors


def next_order_code(attempt=0):
    """DH + ngày + số thứ tự trong ngày, vd DH20260926001.

    attempt tăng mỗi lần route thử lại sau khi trùng mã (2 đơn tạo cùng lúc).
    """
    prefix = f"DH{datetime.now():%Y%m%d}"
    last = Order.query.filter(Order.order_code.like(f"{prefix}%")).with_entities(func.max(Order.order_code)).scalar()
    last_seq = int(last[len(prefix):]) if last else 0
    return f"{prefix}{last_seq + 1 + attempt:03d}"


def transfer_qr(order):
    """Mã VietQR (quét bằng mọi app ngân hàng) chứa đúng số tiền và mã đơn trong nội dung chuyển khoản."""
    cfg = current_app.config
    if not (cfg["BANK_BIN"] and cfg["BANK_ACCOUNT_NO"]):
        return None
    content = f"LUMI {order.order_code}"
    query = urlencode({"amount": order.total_amount, "addInfo": content, "accountName": cfg["BANK_ACCOUNT_NAME"]})
    return {
        "image_url": f"https://img.vietqr.io/image/{cfg['BANK_BIN']}-{cfg['BANK_ACCOUNT_NO']}-compact2.png?{query}",
        "bank_name": cfg["BANK_NAME"],
        "account_no": cfg["BANK_ACCOUNT_NO"],
        "account_name": cfg["BANK_ACCOUNT_NAME"],
        "amount": order.total_amount,
        "content": content,
    }


def order_payload(order, with_items=True):
    payment, shipment = order.payment, order.shipment
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
        "shipment_status": shipment.status if shipment else None,
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
            "cancelled_reason": order.cancelled_reason,
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
    if payment and payment.method == "bank_transfer" and payment.status == "pending" and order.status != "cancelled":
        data["transfer_qr"] = transfer_qr(order)
    return data
