"""Quy tắc chuyển trạng thái đơn hàng / thanh toán phía quản trị."""
from datetime import datetime

from ..models import Product
from .orders import order_payload

CANCEL_REASON_MAX = 255
DEFAULT_CANCEL_REASON = "Quản trị viên huỷ đơn"

# Đã giao / Đã huỷ là trạng thái cuối, không đổi được nữa
ORDER_TRANSITIONS = {
    "pending": ("confirmed", "cancelled"),
    "confirmed": ("shipping", "cancelled"),
    "shipping": ("delivered", "cancelled"),
    "delivered": (),
    "cancelled": (),
}

SHIPMENT_STATUS_FOR = {"confirmed": "pending", "shipping": "in_transit", "delivered": "delivered"}


class OrderRuleError(Exception):
    """Thao tác vi phạm quy tắc nghiệp vụ; message hiển thị thẳng cho admin."""


def next_order_statuses(order):
    statuses = list(ORDER_TRANSITIONS[order.status])
    # Đơn chuyển khoản chỉ được xác nhận sau khi đã nhận tiền
    if order.payment and order.payment.method == "bank_transfer" and order.payment.status != "paid":
        statuses = [s for s in statuses if s != "confirmed"]
    return statuses


def next_payment_statuses(order):
    """COD tự chuyển 'paid' khi giao thành công nên admin không đổi tay."""
    payment = order.payment
    if payment is None or payment.method != "bank_transfer":
        return []
    if order.status == "cancelled":
        return ["refunded"] if payment.status == "paid" else []
    return {"pending": ["paid", "failed"], "failed": ["paid"]}.get(payment.status, [])


def _restock(order):
    products = {
        p.product_id: p
        for p in Product.query.filter(Product.product_id.in_([i.product_id for i in order.items if i.product_id])).with_for_update()
    }
    for item in order.items:
        product = products.get(item.product_id)
        if product is None:  # sản phẩm đã bị xoá khỏi catalog
            continue
        product.stock += item.quantity
        product.sold_count = max(0, product.sold_count - item.quantity)
        if product.status == "out_of_stock":
            product.status = "active"


def change_order_status(order, new_status, reason=None):
    if new_status not in next_order_statuses(order):
        if new_status == "confirmed" and "confirmed" in ORDER_TRANSITIONS[order.status]:
            raise OrderRuleError("Đơn chuyển khoản QR cần được xác nhận đã thanh toán trước khi xác nhận đơn")
        raise OrderRuleError("Không thể chuyển đơn hàng sang trạng thái này")

    shipment, payment = order.shipment, order.payment
    if new_status == "cancelled":
        reason = (reason or "").strip()
        if len(reason) > CANCEL_REASON_MAX:
            raise OrderRuleError(f"Lý do huỷ tối đa {CANCEL_REASON_MAX} ký tự")
        order.cancelled_reason = reason or DEFAULT_CANCEL_REASON
        _restock(order)
        if shipment and order.status == "shipping":
            shipment.status = "failed"
    else:
        if shipment:
            shipment.status = SHIPMENT_STATUS_FOR[new_status]
        if new_status == "delivered" and payment and payment.method == "cod" and payment.status != "paid":
            payment.status = "paid"
            payment.paid_at = datetime.now()
    order.status = new_status


def change_payment_status(order, new_status):
    if new_status not in next_payment_statuses(order):
        raise OrderRuleError("Không thể chuyển thanh toán sang trạng thái này")
    order.payment.status = new_status
    if new_status == "paid":
        order.payment.paid_at = datetime.now()


def customer_summary(order):
    user = order.user
    return {
        "id": user.user_id if user else None,
        "name": user.name if user else order.recipient_name,
        "email": user.email if user else order.recipient_email,
    }


def admin_order_payload(order, with_items=True):
    return {
        **order_payload(order, with_items=with_items),
        "customer": customer_summary(order),
        "next_statuses": next_order_statuses(order),
        "next_payment_statuses": next_payment_statuses(order),
    }
