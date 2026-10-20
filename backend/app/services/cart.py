"""Giỏ hàng cho cả khách chưa đăng nhập và tài khoản.

Khách: carts.user_id = NULL, cart_id nằm trong session cookie (đã ký bằng SECRET_KEY
nên người dùng không sửa được để đọc giỏ của người khác).
"""
from flask import session
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Cart, CartItem

GUEST_CART_KEY = "guest_cart_id"
MAX_QUANTITY_PER_ITEM = 99


def find_cart(user):
    if user is not None:
        return Cart.query.filter_by(user_id=user.user_id).first()
    cart_id = session.get(GUEST_CART_KEY)
    return Cart.query.filter_by(cart_id=cart_id, user_id=None).first() if cart_id else None


def get_or_create_cart(user):
    cart = find_cart(user)
    if cart is not None:
        return cart
    cart = Cart(user_id=user.user_id if user else None)
    db.session.add(cart)
    try:
        db.session.flush()
    except IntegrityError:  # request song song vừa tạo giỏ cho tài khoản này
        db.session.rollback()
        return Cart.query.filter_by(user_id=user.user_id).one()
    if user is None:
        session[GUEST_CART_KEY] = cart.cart_id
        # Giữ cookie sau khi đóng trình duyệt, nếu không khách mở lại sẽ mất giỏ
        session.permanent = True
    return cart


def merge_guest_cart(guest_cart_id, user):
    """Gộp giỏ khách vào giỏ tài khoản sau khi đăng nhập, rồi xoá giỏ khách.

    Số lượng cộng dồn nhưng không vượt tồn kho và giới hạn mỗi dòng.
    """
    guest = Cart.query.filter_by(cart_id=guest_cart_id, user_id=None).first() if guest_cart_id else None
    if guest is None or not guest.items:
        if guest is not None:
            db.session.delete(guest)
            db.session.commit()
        return

    cart = get_or_create_cart(user)
    existing = {item.product_id: item for item in cart.items}
    for item in guest.items:
        limit = min(item.product.stock, MAX_QUANTITY_PER_ITEM) if item.product else 0
        target = existing.get(item.product_id)
        if target is None:
            target = CartItem(
                cart_id=cart.cart_id,
                product_id=item.product_id,
                quantity=max(1, min(item.quantity, limit or item.quantity)),
                unit_price=item.unit_price,
                is_selected=item.is_selected,
            )
            db.session.add(target)
        else:
            target.quantity = max(1, min(target.quantity + item.quantity, limit or target.quantity))
            target.is_selected = target.is_selected or item.is_selected
    db.session.delete(guest)
    db.session.commit()


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
