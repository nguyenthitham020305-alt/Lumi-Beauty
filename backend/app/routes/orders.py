from flask import Blueprint, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import CartItem, Order, OrderItem, Payment, Product, Province, Ward
from ..services.auth import current_user, login_required
from ..services.cart import cart_payload, find_cart
from ..services.orders import next_order_code, order_payload, price_summary, validate_checkout

orders_bp = Blueprint("orders", __name__)

ORDER_CODE_RETRIES = 3


@orders_bp.get("/address/provinces")
def list_provinces():
    return {"items": [p.to_dict() for p in Province.query.order_by(Province.name).all()]}


@orders_bp.get("/address/provinces/<int:province_code>/wards")
def list_wards(province_code):
    wards = Ward.query.filter_by(province_code=province_code).order_by(Ward.name).all()
    return {"items": [w.to_dict() for w in wards]}


def _selected_lines(user):
    """Dòng giỏ được tick và còn mua được: đúng những gì sẽ vào đơn."""
    payload = cart_payload(find_cart(user))
    return [i for i in payload["items"] if i["selected"]]


@orders_bp.get("/checkout/summary")
@login_required
def checkout_summary():
    user = current_user()
    lines = _selected_lines(user)
    available = [i for i in lines if i["available"]]
    return {
        "items": lines,
        "unavailable_count": len(lines) - len(available),
        # None = khách chưa từng đặt hàng -> trang thanh toán cho nhập từ đầu
        "saved_address": user.saved_address() if user else None,
        **price_summary(sum(i["line_total"] for i in available)),
    }


@orders_bp.post("/orders")
@login_required
def create_order():
    """Tạo đơn từ các dòng giỏ đang được tick.

    Trừ tồn kho trong cùng transaction, khoá dòng sản phẩm (SELECT ... FOR UPDATE)
    để hai người đặt cùng lúc không bán quá số lượng.
    """
    user = current_user()
    data, errors = validate_checkout(request.get_json(silent=True) or {})
    if errors:
        return {"error": "Thông tin đặt hàng chưa hợp lệ", "errors": errors}, 400

    cart = find_cart(user)
    cart_items = [i for i in (cart.items if cart else []) if i.is_selected]
    if not cart_items:
        return {"error": "Vui lòng chọn ít nhất một sản phẩm trong giỏ hàng"}, 400

    products = {
        p.product_id: p
        for p in Product.query.filter(Product.product_id.in_([i.product_id for i in cart_items])).with_for_update()
    }
    problems = []
    for item in cart_items:
        product = products.get(item.product_id)
        if product is None or not product.is_purchasable or item.quantity > product.stock:
            problems.append(product.name if product else f"Sản phẩm #{item.product_id}")
    if problems:
        db.session.rollback()
        return {"error": "Một số sản phẩm đã hết hàng hoặc không đủ số lượng: " + "; ".join(problems)}, 409

    subtotal = sum(products[i.product_id].price * i.quantity for i in cart_items)
    prices = price_summary(subtotal)
    address = ", ".join([data["street_address"], data["ward"].name, data["province"].name])

    order = None
    for attempt in range(ORDER_CODE_RETRIES):
        candidate = Order(
            order_code=next_order_code(attempt),
            user_id=user.user_id,
            subtotal=prices["subtotal"],
            shipping_fee=prices["shipping_fee"],
            discount_amount=prices["discount_amount"],
            total_amount=prices["total_amount"],
            recipient_name=data["recipient_name"],
            recipient_phone=data["recipient_phone"],
            recipient_email=data["recipient_email"],
            province_code=data["province"].province_code,
            ward_code=data["ward"].ward_code,
            street_address=data["street_address"],
            shipping_address=address,
            note=data["note"],
        )
        try:
            # savepoint: trùng mã thì chỉ huỷ dòng orders này, giữ khoá FOR UPDATE trên sản phẩm
            with db.session.begin_nested():
                db.session.add(candidate)
            order = candidate
            break
        except IntegrityError:  # trùng order_code khi 2 đơn tạo cùng lúc
            continue
    if order is None:
        db.session.rollback()
        return {"error": "Hệ thống đang bận, vui lòng thử lại"}, 503

    for item in cart_items:
        product = products[item.product_id]
        db.session.add(
            OrderItem(
                order_id=order.order_id,
                product_id=product.product_id,
                product_name=product.name,
                product_image=product.image,
                quantity=item.quantity,
                unit_price=product.price,
                subtotal=product.price * item.quantity,
            )
        )
        product.stock -= item.quantity
        product.sold_count += item.quantity
        if product.stock == 0:
            product.status = "out_of_stock"
        db.session.delete(item)

    db.session.add(Payment(order_id=order.order_id, method=data["payment_method"], amount=order.total_amount, status="pending"))

    # Ghi đè địa chỉ mặc định của khách bằng địa chỉ vừa dùng, để lần sau
    # điền sẵn. Khách sửa ở trang thanh toán thì địa chỉ mới thành mặc định.
    user.province_code = data["province"].province_code
    user.ward_code = data["ward"].ward_code
    user.street_address = data["street_address"]

    db.session.commit()

    db.session.refresh(order)
    return {"order": order_payload(order)}, 201


@orders_bp.get("/orders")
@login_required
def my_orders():
    orders = Order.query.filter_by(user_id=current_user().user_id).order_by(Order.order_id.desc()).limit(50).all()
    return {"items": [order_payload(o, with_items=False) for o in orders]}


@orders_bp.get("/orders/<order_code>")
@login_required
def order_detail(order_code):
    user = current_user()
    order = Order.query.filter_by(order_code=order_code).first()
    # Trả 404 cả khi đơn của người khác để không lộ mã đơn nào tồn tại
    if order is None or (order.user_id != user.user_id and not user.is_admin):
        return {"error": "Không tìm thấy đơn hàng"}, 404
    return {"order": order_payload(order)}
