"""Tổng hợp số liệu báo cáo cho trang Tổng quan.

Mọi con số đều tính trực tiếp từ MySQL; không có giá trị cố định trong code.
"""
from datetime import date, datetime, time, timedelta

from sqlalchemy import case, func

from ..extensions import db
from ..models import Order, OrderItem, Payment, Product, User

# Đơn đã huỷ không tính vào doanh thu
REVENUE_STATUSES = ("pending", "confirmed", "shipping", "delivered")
ORDER_STATUSES_ALL = ("pending", "confirmed", "shipping", "delivered", "cancelled")

RANGES = ("7d", "30d", "90d", "month", "custom")
TOP_PRODUCTS_LIMIT = 7       # trần 8 màu của bảng màu; 7 + "khác" là an toàn
RECENT_ORDERS_LIMIT = 8
# Dưới ngưỡng này thì gộp theo tháng thay vì theo ngày, tránh trục x dày đặc
DAILY_MAX_DAYS = 92


class RangeError(Exception):
    """Khoảng thời gian không hợp lệ; message hiển thị thẳng cho admin."""


def resolve_range(range_key, from_str, to_str, today=None):
    """Trả về (from_date, to_date, nhãn, gộp theo 'day' hay 'month')."""
    today = today or date.today()

    if range_key not in RANGES:
        raise RangeError(f"range phải là một trong: {', '.join(RANGES)}")

    if range_key == "custom":
        try:
            start = datetime.strptime(from_str or "", "%Y-%m-%d").date()
            end = datetime.strptime(to_str or "", "%Y-%m-%d").date()
        except ValueError:
            raise RangeError("Ngày tuỳ chỉnh phải theo dạng YYYY-MM-DD")
        if start > end:
            raise RangeError("Ngày bắt đầu phải trước ngày kết thúc")
        if (end - start).days > 366:
            raise RangeError("Khoảng thời gian tối đa 366 ngày")
        label = f"{start:%d/%m/%Y} – {end:%d/%m/%Y}"
    elif range_key == "month":
        start, end = today.replace(day=1), today
        label = f"Tháng {today:%m/%Y}"
    else:
        days = int(range_key.rstrip("d"))
        start, end = today - timedelta(days=days - 1), today
        label = f"{days} ngày gần nhất"

    bucket = "day" if (end - start).days + 1 <= DAILY_MAX_DAYS else "month"
    return start, end, label, bucket


def _bounds(start, end):
    """order_date là DATETIME nên phải so theo mốc đầu/cuối ngày."""
    return datetime.combine(start, time.min), datetime.combine(end, time.max)


def _orders_in_range(start, end):
    lo, hi = _bounds(start, end)
    return Order.query.filter(Order.order_date >= lo, Order.order_date <= hi)


def totals(start, end):
    """Thẻ số liệu. Doanh thu/đơn tính trong khoảng; khách & sản phẩm là tổng toàn hệ thống."""
    lo, hi = _bounds(start, end)
    revenue_case = case((Order.status.in_(REVENUE_STATUSES), Order.total_amount), else_=0)

    row = (
        db.session.query(
            func.coalesce(func.sum(revenue_case), 0),
            func.count(Order.order_id),
            func.coalesce(func.sum(case((Order.status == "pending", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Order.status == "cancelled", 1), else_=0)), 0),
        )
        .filter(Order.order_date >= lo, Order.order_date <= hi)
        .one()
    )
    revenue, order_count, pending, cancelled = (int(v or 0) for v in row)
    paid_orders = order_count - cancelled

    return {
        "revenue": revenue,
        "orders": order_count,
        "pending_orders": pending,
        "cancelled_orders": cancelled,
        # Giá trị trung bình mỗi đơn — chỉ tính trên đơn còn hiệu lực
        "avg_order_value": round(revenue / paid_orders) if paid_orders else 0,
        "customers": User.query.filter_by(role="customer").count(),
        "products": Product.query.count(),
    }


def revenue_series(start, end, bucket):
    """Doanh thu theo ngày (hoặc tháng), ĐIỀN 0 cho mốc không có đơn.

    Không điền thì đường biểu đồ sẽ nối thẳng qua các ngày trống và
    nhìn như có doanh thu liên tục.
    """
    lo, hi = _bounds(start, end)
    key = func.date_format(Order.order_date, "%Y-%m" if bucket == "month" else "%Y-%m-%d")
    revenue_case = case((Order.status.in_(REVENUE_STATUSES), Order.total_amount), else_=0)

    rows = dict(
        db.session.query(key, func.sum(revenue_case))
        .filter(Order.order_date >= lo, Order.order_date <= hi)
        .group_by(key)
        .all()
    )
    counts = dict(
        db.session.query(key, func.count(Order.order_id))
        .filter(Order.order_date >= lo, Order.order_date <= hi)
        .group_by(key)
        .all()
    )

    out = []
    if bucket == "month":
        cursor = start.replace(day=1)
        while cursor <= end:
            k = f"{cursor:%Y-%m}"
            out.append({"key": k, "label": f"{cursor:%m/%Y}",
                        "revenue": int(rows.get(k) or 0), "orders": int(counts.get(k) or 0)})
            cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    else:
        cursor = start
        while cursor <= end:
            k = f"{cursor:%Y-%m-%d}"
            out.append({"key": k, "label": f"{cursor:%d/%m}",
                        "revenue": int(rows.get(k) or 0), "orders": int(counts.get(k) or 0)})
            cursor += timedelta(days=1)
    return out


def status_breakdown(start, end):
    """Số đơn theo trạng thái, luôn trả đủ 5 trạng thái kể cả khi bằng 0."""
    rows = dict(
        _orders_in_range(start, end)
        .with_entities(Order.status, func.count(Order.order_id))
        .group_by(Order.status)
        .all()
    )
    return [{"status": s, "orders": int(rows.get(s) or 0)} for s in ORDER_STATUSES_ALL]


def top_products(start, end, limit=TOP_PRODUCTS_LIMIT):
    """Bán chạy theo SỐ LƯỢNG, lấy từ order_items (tên đã chụp lúc mua)."""
    lo, hi = _bounds(start, end)
    rows = (
        db.session.query(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("quantity"),
            func.sum(OrderItem.subtotal).label("revenue"),
        )
        .join(Order, Order.order_id == OrderItem.order_id)
        .filter(Order.order_date >= lo, Order.order_date <= hi, Order.status.in_(REVENUE_STATUSES))
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc(), func.sum(OrderItem.subtotal).desc())
        .limit(limit)
        .all()
    )
    return [
        {"product_id": r.product_id, "name": r.product_name,
         "quantity": int(r.quantity or 0), "revenue": int(r.revenue or 0)}
        for r in rows
    ]


def payment_split(start, end):
    """Tỷ lệ COD / chuyển khoản QR trên số đơn còn hiệu lực."""
    lo, hi = _bounds(start, end)
    rows = (
        db.session.query(
            Payment.method,
            func.count(Payment.payment_id),
            func.coalesce(func.sum(Order.total_amount), 0),
            func.coalesce(func.sum(case((Payment.status == "paid", 1), else_=0)), 0),
        )
        .join(Order, Order.order_id == Payment.order_id)
        .filter(Order.order_date >= lo, Order.order_date <= hi, Order.status.in_(REVENUE_STATUSES))
        .group_by(Payment.method)
        .all()
    )
    data = {m: {"orders": int(n), "revenue": int(rev), "paid": int(paid)} for m, n, rev, paid in rows}
    total = sum(v["orders"] for v in data.values())

    return [
        {
            "method": m,
            "orders": data.get(m, {}).get("orders", 0),
            "revenue": data.get(m, {}).get("revenue", 0),
            "paid_orders": data.get(m, {}).get("paid", 0),
            "share": round(data.get(m, {}).get("orders", 0) * 100 / total, 1) if total else 0,
        }
        for m in ("cod", "bank_transfer")
    ]


def recent_orders(start, end, limit=RECENT_ORDERS_LIMIT):
    orders = (
        _orders_in_range(start, end)
        .order_by(Order.order_date.desc(), Order.order_id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "order_code": o.order_code,
            "order_date": o.order_date.isoformat() if o.order_date else None,
            "customer_name": o.recipient_name,
            "total_amount": o.total_amount,
            "status": o.status,
            "payment_method": o.payment.method if o.payment else None,
            "payment_status": o.payment.status if o.payment else None,
        }
        for o in orders
    ]


def build_report(range_key, from_str, to_str):
    start, end, label, bucket = resolve_range(range_key, from_str, to_str)
    return {
        "range": {
            "key": range_key,
            "from": start.isoformat(),
            "to": end.isoformat(),
            "label": label,
            "bucket": bucket,
        },
        "totals": totals(start, end),
        "revenue_series": revenue_series(start, end, bucket),
        "status_breakdown": status_breakdown(start, end),
        "top_products": top_products(start, end),
        "payment_split": payment_split(start, end),
        "recent_orders": recent_orders(start, end),
    }
