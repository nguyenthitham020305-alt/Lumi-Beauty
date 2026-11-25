"""Giỏ hàng cho cả khách chưa đăng nhập và tài khoản.

Khách: carts.user_id = NULL, cart_id nằm trong session cookie (đã ký bằng SECRET_KEY
nên người dùng không sửa được để đọc giỏ của người khác).
"""
from flask import session
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Cart, CartItem

MAX_QUANTITY_PER_ITEM = 99


def find_cart(user):
    """Giỏ hàng luôn gắn với một tài khoản; khách chưa đăng nhập thì không có giỏ."""
    if user is None:
        return None
    return Cart.query.filter_by(user_id=user.user_id).first()


def get_or_create_cart(user):
    cart = find_cart(user)
    if cart is not None:
        return cart
    cart = Cart(user_id=user.user_id)
    db.session.add(cart)
    try:
        db.session.flush()
    except IntegrityError:  # request song song vừa tạo giỏ cho tài khoản này
        db.session.rollback()
        return Cart.query.filter_by(user_id=user.user_id).one()
    return cart


def cart_payload(cart):
    """Tổng tiền chỉ tính dòng được chọn và còn mua được; count (badge) tính mọi dòng."""
    if cart is None:
        return {"items": [], "count": 0, "selected_count": 0, "subtotal": 0}

    items = []
    for item in cart.items:
        product = item.product
        if product is None:
            continue
        available = product.is_purchasable and item.quantity <= product.stock
        items.append(
            {
                "product_id": product.product_id,
                "slug": product.slug,
                "name": product.name,
                "brand": product.brand.name if product.brand else None,
                "sku": product.sku,
                "image": product.image,
                "price": product.price,
                "quantity": item.quantity,
                "stock": product.stock,
                "max_quantity": min(product.stock, MAX_QUANTITY_PER_ITEM),
                "selected": item.is_selected,
                "available": available,
                "line_total": product.price * item.quantity,
            }
        )

    chosen = [i for i in items if i["selected"] and i["available"]]
    return {
        "items": items,
        "count": sum(i["quantity"] for i in items),
        "selected_count": sum(i["quantity"] for i in chosen),
        "subtotal": sum(i["line_total"] for i in chosen),
    }
