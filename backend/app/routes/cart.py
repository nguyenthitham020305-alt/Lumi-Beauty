from flask import Blueprint, request

from ..extensions import db
from ..models import CartItem, Product
from ..services.auth import current_user, login_required
from ..services.cart import MAX_QUANTITY_PER_ITEM, cart_payload, find_cart, get_or_create_cart

cart_bp = Blueprint("cart", __name__)

QUANTITY_ERROR = f"Số lượng phải từ 1 đến {MAX_QUANTITY_PER_ITEM}"


def _parse_quantity(value):
    if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= MAX_QUANTITY_PER_ITEM:
        return None
    return value


def _find_item(product_id):
    cart = find_cart(current_user())
    item = CartItem.query.filter_by(cart_id=cart.cart_id, product_id=product_id).first() if cart else None
    return cart, item


def _respond(cart, status=200):
    if cart is not None:
        db.session.refresh(cart)
    return cart_payload(cart), status


@cart_bp.get("")
def get_cart():
    """Khách chưa đăng nhập cũng có giỏ (lưu theo session cookie)."""
    return cart_payload(find_cart(current_user()))


@cart_bp.post("/items")
def add_item():
    """Body: {product_id, quantity}. Sản phẩm đã có trong giỏ thì cộng dồn số lượng."""
    data = request.get_json(silent=True) or {}
    quantity = _parse_quantity(data.get("quantity", 1))
    if quantity is None:
        return {"error": QUANTITY_ERROR}, 400

    product = db.session.get(Product, data.get("product_id")) if data.get("product_id") else None
    if product is None or product.status == "hidden":
        return {"error": "Không tìm thấy sản phẩm"}, 404
    if not product.is_purchasable:
        return {"error": "Sản phẩm đã hết hàng"}, 409

    cart = get_or_create_cart(current_user())
    item = CartItem.query.filter_by(cart_id=cart.cart_id, product_id=product.product_id).first()
    in_cart = item.quantity if item else 0
    if quantity + in_cart > min(product.stock, MAX_QUANTITY_PER_ITEM):
        return {
            "error": f"Chỉ còn {product.stock} sản phẩm trong kho"
            + (f", giỏ hàng của bạn đã có {in_cart}" if in_cart else "")
        }, 409

    if item is None:
        db.session.add(CartItem(cart_id=cart.cart_id, product_id=product.product_id, quantity=quantity, unit_price=product.price))
    else:
        item.quantity = in_cart + quantity
        item.unit_price = product.price
        item.is_selected = True
    db.session.commit()
    return _respond(cart, 201)


@cart_bp.patch("/items/<int:product_id>")
def update_item(product_id):
    """Body: {quantity?, selected?} — đổi số lượng và/hoặc tick chọn."""
    data = request.get_json(silent=True) or {}
    cart, item = _find_item(product_id)
    if item is None:
        return {"error": "Sản phẩm không có trong giỏ hàng"}, 404

    if "quantity" in data:
        quantity = _parse_quantity(data["quantity"])
        if quantity is None:
            return {"error": QUANTITY_ERROR}, 400
        if quantity > item.product.stock:
            return {"error": f"Chỉ còn {item.product.stock} sản phẩm trong kho"}, 409
        item.quantity = quantity
    if "selected" in data:
        if not isinstance(data["selected"], bool):
            return {"error": "selected phải là true/false"}, 400
        item.is_selected = data["selected"]
    db.session.commit()
    return _respond(cart)


@cart_bp.patch("/select-all")
def select_all():
    """Body: {selected: bool} — tick/bỏ tick mọi sản phẩm."""
    selected = (request.get_json(silent=True) or {}).get("selected")
    if not isinstance(selected, bool):
        return {"error": "selected phải là true/false"}, 400
    cart = find_cart(current_user())
    if cart is not None:
        CartItem.query.filter_by(cart_id=cart.cart_id).update({"is_selected": selected})
        db.session.commit()
    return _respond(cart)


@cart_bp.delete("/items/<int:product_id>")
def remove_item(product_id):
    cart, item = _find_item(product_id)
    if item is not None:
        db.session.delete(item)
        db.session.commit()
    return _respond(cart)


@cart_bp.post("/checkout")
@login_required
def start_checkout():
    """Kiểm tra giỏ trước khi sang trang đặt hàng. Bắt buộc đăng nhập."""
    payload = cart_payload(find_cart(current_user()))
    chosen = [i for i in payload["items"] if i["selected"]]
    if not chosen:
        return {"error": "Vui lòng chọn ít nhất một sản phẩm để đặt hàng"}, 400
    unavailable = [i["name"] for i in chosen if not i["available"]]
    if unavailable:
        return {"error": "Một số sản phẩm đã hết hàng hoặc không đủ số lượng", "unavailable": unavailable}, 409
    return {"ok": True, **payload}
