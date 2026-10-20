from flask import Blueprint, request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Order, OrderItem, Product, Review, product_categories
from ..services.auth import current_user, login_required

products_bp = Blueprint("products", __name__)

REVIEWS_PER_PAGE = 5
COMMENT_MAX = 2000


def _find_product(slug_or_id):
    query = Product.query.filter(Product.status != "hidden")
    if slug_or_id.isdigit():
        return query.filter(Product.product_id == int(slug_or_id)).first()
    return query.filter(Product.slug == slug_or_id).first()


def _has_received(user_id, product_id):
    """Đã mua = có đơn chứa sản phẩm này ở trạng thái đã giao thành công."""
    return db.session.query(
        OrderItem.query.join(Order, Order.order_id == OrderItem.order_id)
        .filter(Order.user_id == user_id, Order.status == "delivered", OrderItem.product_id == product_id)
        .exists()
    ).scalar()


def _review_permission(user, product_id):
    """Trả về (được viết hay không, lý do nếu không)."""
    if user is None:
        return False, "login_required"
    if Review.query.filter_by(user_id=user.user_id, product_id=product_id).first():
        return False, "already_reviewed"
    if not _has_received(user.user_id, product_id):
        return False, "not_purchased"
    return True, None


@products_bp.get("/products/<slug_or_id>")
def product_detail(slug_or_id):
    product = _find_product(slug_or_id)
    if product is None:
        return {"error": "Không tìm thấy sản phẩm"}, 404

    related = []
    if product.categories:
        related = (
            Product.query.join(product_categories)
            .filter(
                product_categories.c.category_id == product.categories[0].category_id,
                Product.product_id != product.product_id,
                Product.status != "hidden",
            )
            .order_by((Product.stock > 0).desc(), Product.review_count.desc())
            .limit(10)
            .all()
        )
    return {"product": product.to_detail(), "related": [p.to_card() for p in related]}


@products_bp.get("/products/<int:product_id>/reviews")
def list_reviews(product_id):
    product = db.session.get(Product, product_id)
    if product is None:
        return {"error": "Không tìm thấy sản phẩm"}, 404

    try:
        page = max(int(request.args.get("page", 1)), 1)
    except ValueError:
        page = 1
    approved = Review.query.filter_by(product_id=product_id, status="approved")
    total = approved.count()
    reviews = (
        approved.order_by(Review.review_id.desc())
        .offset((page - 1) * REVIEWS_PER_PAGE)
        .limit(REVIEWS_PER_PAGE)
        .all()
    )
    distribution = dict(
        db.session.query(Review.rating, func.count())
        .filter_by(product_id=product_id, status="approved")
        .group_by(Review.rating)
        .all()
    )
    can_review, reason = _review_permission(current_user(), product_id)

    return {
        "items": [r.to_dict() for r in reviews],
        "pagination": {
            "page": page,
            "total": total,
            "pages": max(1, -(-total // REVIEWS_PER_PAGE)),
        },
        "summary": {
            # Điểm hiển thị gộp cả điểm gốc từ Beauty Box (seed) và review của khách LUMI
            "rating": float(product.rating) if product.rating is not None else None,
            "review_count": product.review_count,
            "distribution": {str(star): distribution.get(star, 0) for star in range(5, 0, -1)},
        },
        "can_review": can_review,
        "cannot_review_reason": reason,
    }


@products_bp.post("/products/<int:product_id>/reviews")
@login_required
def create_review(product_id):
    """Body: {rating 1-5, comment}. Chỉ người đã nhận hàng (đơn delivered) mới được đánh giá."""
    product = db.session.get(Product, product_id)
    if product is None:
        return {"error": "Không tìm thấy sản phẩm"}, 404

    user = current_user()
    can_review, reason = _review_permission(user, product_id)
    if reason == "already_reviewed":
        return {"error": "Bạn đã đánh giá sản phẩm này rồi"}, 409
    if not can_review:
        return {"error": "Chỉ khách hàng đã mua và nhận sản phẩm này mới có thể đánh giá"}, 403

    data = request.get_json(silent=True) or {}
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()
    if not isinstance(rating, int) or isinstance(rating, bool) or not 1 <= rating <= 5:
        return {"error": "Vui lòng chọn số sao từ 1 đến 5", "errors": {"rating": "Chọn từ 1 đến 5 sao"}}, 400
    if len(comment) > COMMENT_MAX:
        return {"error": f"Nhận xét tối đa {COMMENT_MAX} ký tự", "errors": {"comment": "Nhận xét quá dài"}}, 400

    review = Review(user_id=user.user_id, product_id=product_id, rating=rating, comment=comment or None)
    db.session.add(review)
    try:
        db.session.commit()
    except IntegrityError:  # UNIQUE(user_id, product_id) khi gửi 2 lần cùng lúc
        db.session.rollback()
        return {"error": "Bạn đã đánh giá sản phẩm này rồi"}, 409

    db.session.refresh(product)  # trigger vừa cập nhật rating
    return {
        "review": review.to_dict(),
        "product_rating": float(product.rating) if product.rating is not None else None,
        "product_review_count": product.review_count,
    }, 201
