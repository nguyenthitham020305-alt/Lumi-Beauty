"""Quy tắc chuyển trạng thái đơn hàng phía quản trị.

Cửa hàng không nối với đơn vị vận chuyển và cũng không có đối soát ngân hàng
tự động, nên mọi bước trung gian (xác nhận đơn, đang giao, xác nhận đã nhận
tiền) đều là nút bấm cho có. Quy trình rút còn đúng một thao tác:

    ĐÃ ĐẶT HÀNG  --[admin bấm "Hoàn tất đơn hàng"]-->  HOÀN TẤT

Bấm hoàn tất nghĩa là hàng đã tới tay khách VÀ đã thu đủ tiền, nên hệ thống
đánh dấu luôn khoản thanh toán là đã trả.
"""
from datetime import datetime

# OrderRuleError định nghĩa ở services.orders để các tầng dùng chung một lỗi
# nghiệp vụ; routes.admin vẫn import nó từ đây.
from .orders import OrderRuleError, order_payload

# Hoàn tất là trạng thái cuối, không đổi được nữa
ORDER_TRANSITIONS = {
    "pending": ("completed",),
    "completed": (),
}


def next_order_statuses(order):
    return list(ORDER_TRANSITIONS[order.status])


def change_order_status(order, new_status):
    if new_status not in next_order_statuses(order):
        raise OrderRuleError("Đơn hàng này đã hoàn tất, không còn thao tác nào")

    payment = order.payment
    if payment is not None and payment.status != "paid":
        payment.status = "paid"
        payment.paid_at = datetime.now()
    order.status = new_status


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
    }
