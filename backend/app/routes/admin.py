from flask import Blueprint, request
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import (
    ORDER_STATUSES,
    Brand,
    Category,
    ChatSession,
    Order,
    Payment,
    Product,
    ProductRecommendation,
    User,
    product_categories,
)
from ..services.admin_stats import RangeError, build_report
from ..services.admin_customers import (
    CustomerRuleError,
    customer_payload,
    order_history,
    order_stats_subquery,
    set_active,
    status_breakdown,
)
from ..services.admin_orders import OrderRuleError, admin_order_payload, change_order_status
from ..services.admin_categories import (
    CategoryInUseError,
    admin_payload as category_payload,
    child_counts_by_category,
    counts_by_category,
    create_category,
    delete_category,
    update_category,
)
from ..services.admin_products import (
    ProductValidationError,
    admin_payload,
    create_product,
    delete_impact,
    update_product,
)
from ..services.auth import admin_required, current_user

admin_bp = Blueprint("admin", __name__)

ORDERS_PER_PAGE = 15
PRODUCTS_PER_PAGE = 15
CUSTOMERS_PER_PAGE = 15
PRODUCT_STATUSES = ("active", "out_of_stock", "hidden")

# Nhận subquery thống kê vì cột sắp xếp nằm ngoài bảng users
CUSTOMER_SORTS = {
    "newest": lambda st: [User.user_id.desc()],
    "oldest": lambda st: [User.user_id.asc()],
    "name": lambda st: [User.name.asc()],
    "orders": lambda st: [func.coalesce(st.c.order_count, 0).desc(), User.user_id.desc()],
    "spent": lambda st: [func.coalesce(st.c.total_spent, 0).desc(), User.user_id.desc()],
}

PRODUCT_SORTS = {
    "newest": [Product.product_id.desc()],
    "name": [Product.name.asc()],
    "price_asc": [Product.price.asc()],
    "price_desc": [Product.price.desc()],
    "stock_asc": [Product.stock.asc()],
}


@admin_bp.get("/summary")
@admin_required
def summary():
    recommendations = db.session.query(
        func.count(ProductRecommendation.reco_id), func.sum(ProductRecommendation.is_clicked)
    ).one()
    newest_users = User.query.order_by(User.user_id.desc()).limit(5).all()
    return {
        "stats": {
            "products": Product.query.count(),
            "out_of_stock": Product.query.filter(Product.stock == 0).count(),
            "customers": User.query.filter_by(role="customer").count(),
            "chat_sessions": ChatSession.query.count(),
            "recommendations": recommendations[0],
            "recommendation_clicks": int(recommendations[1] or 0),
        },
        "newest_users": [
            {**u.to_dict(), "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in newest_users
        ],
    }


@admin_bp.get("/orders")
@admin_required
def list_orders():
    """Query: q (mã đơn / email), status, payment_method, sort=newest|oldest, page."""
    args = request.args
    query = Order.query.outerjoin(User, Order.user_id == User.user_id).outerjoin(Payment, Payment.order_id == Order.order_id)

    q = (args.get("q") or "").strip()
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Order.order_code.like(like), Order.recipient_email.like(like), User.email.like(like)))
    # Đếm trước khi lọc trạng thái để các tab trạng thái luôn hiện đủ số lượng
    status_counts = dict(query.with_entities(Order.status, func.count(Order.order_id)).group_by(Order.status).all())
    status = args.get("status")
    if status in ORDER_STATUSES:
        query = query.filter(Order.status == status)

    ordering = (Order.order_date.asc(), Order.order_id.asc()) if args.get("sort") == "oldest" else (
        Order.order_date.desc(), Order.order_id.desc())
    page = max(1, args.get("page", 1, type=int))
    total = query.count()
    orders = (
        query.options(selectinload(Order.items), selectinload(Order.user))
        .order_by(*ordering)
        .offset((page - 1) * ORDERS_PER_PAGE)
        .limit(ORDERS_PER_PAGE)
        .all()
    )
    return {
        "items": [admin_order_payload(o, with_items=False) for o in orders],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // ORDERS_PER_PAGE)),
        "status_counts": status_counts,
    }


def _find_order(order_code, lock=False):
    query = Order.query.filter_by(order_code=order_code)
    return query.with_for_update().first() if lock else query.first()


@admin_bp.get("/orders/<order_code>")
@admin_required
def order_detail(order_code):
    order = _find_order(order_code)
    if order is None:
        return {"error": "Không tìm thấy đơn hàng"}, 404
    return {"order": admin_order_payload(order)}


def _apply(order_code, change):
    # Khoá dòng đơn để hai admin thao tác cùng lúc không chuyển trạng thái chồng lên nhau
    order = _find_order(order_code, lock=True)
    if order is None:
        db.session.rollback()
        return {"error": "Không tìm thấy đơn hàng"}, 404
    try:
        change(order)
    except OrderRuleError as e:
        db.session.rollback()
        return {"error": str(e)}, 409
    db.session.commit()
    db.session.refresh(order)
    return {"order": admin_order_payload(order)}


@admin_bp.patch("/orders/<order_code>/status")
@admin_required
def update_order_status(order_code):
    """Chỉ còn một đường: Đã đặt hàng -> Hoàn tất."""
    data = request.get_json(silent=True) or {}
    return _apply(order_code, lambda order: change_order_status(order, data.get("status")))


# ---------------------------------------------------------------- sản phẩm

@admin_bp.get("/products")
@admin_required
def list_products():
    """Query: q (tên/SKU), category (id), status, sort (xem PRODUCT_SORTS), page."""
    args = request.args
    sort = args.get("sort", "newest")
    if sort not in PRODUCT_SORTS:
        return {"error": f"sort phải là một trong: {', '.join(PRODUCT_SORTS)}"}, 400

    # Khác trang bán hàng: admin phải thấy cả sản phẩm đang ẩn
    query = Product.query

    q = (args.get("q") or "").strip()
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(or_(Product.name.ilike(like, escape="\\"), Product.sku.ilike(like, escape="\\")))

    category_id = args.get("category", type=int)
    if category_id:
        query = query.join(product_categories, product_categories.c.product_id == Product.product_id).filter(
            product_categories.c.category_id == category_id
        )

    # Đếm trước khi lọc trạng thái để các tab luôn hiện đủ số lượng
    status_counts = dict(query.with_entities(Product.status, func.count(Product.product_id)).group_by(Product.status).all())
    status = args.get("status")
    if status in PRODUCT_STATUSES:
        query = query.filter(Product.status == status)

    page = max(1, args.get("page", 1, type=int))
    total = query.count()
    products = (
        query.options(selectinload(Product.categories))
        .order_by(*PRODUCT_SORTS[sort])
        .offset((page - 1) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE)
        .all()
    )
    return {
        "items": [admin_payload(p) for p in products],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // PRODUCTS_PER_PAGE)),
        "status_counts": status_counts,
    }


@admin_bp.get("/products/form-options")
@admin_required
def product_form_options():
    """Danh mục và thương hiệu cho dropdown của form thêm/sửa."""
    categories = Category.query.order_by(Category.name).all()
    brands = Brand.query.order_by(Brand.name).all()
    return {
        "categories": [{"id": c.category_id, "name": c.name} for c in categories],
        "brands": [{"id": b.brand_id, "name": b.name} for b in brands],
    }


@admin_bp.get("/products/<int:product_id>")
@admin_required
def product_detail(product_id):
    product = db.session.get(Product, product_id)
    if product is None:
        return {"error": "Không tìm thấy sản phẩm"}, 404
    return {"product": admin_payload(product, detail=True), "impact": delete_impact(product)}


@admin_bp.post("/products")
@admin_required
def add_product():
    try:
        product = create_product(request.get_json(silent=True) or {})
    except ProductValidationError as e:
        db.session.rollback()
        return {"error": str(e), "errors": e.errors}, 400
    return {"product": admin_payload(product, detail=True)}, 201


@admin_bp.put("/products/<int:product_id>")
@admin_required
def edit_product(product_id):
    product = db.session.get(Product, product_id)
    if product is None:
        return {"error": "Không tìm thấy sản phẩm"}, 404
    try:
        product = update_product(product, request.get_json(silent=True) or {})
    except ProductValidationError as e:
        db.session.rollback()
        return {"error": str(e), "errors": e.errors}, 400
    return {"product": admin_payload(product, detail=True)}


@admin_bp.delete("/products/<int:product_id>")
@admin_required
def remove_product(product_id):
    product = db.session.get(Product, product_id)
    if product is None:
        return {"error": "Không tìm thấy sản phẩm"}, 404
    name = product.name
    # FK lo phần còn lại: ảnh/đánh giá/giỏ hàng bị xoá theo (CASCADE),
    # còn order_items chỉ mất liên kết (SET NULL) nên lịch sử đơn vẫn đúng.
    db.session.delete(product)
    db.session.commit()
    return {"deleted": product_id, "name": name}


def _escape_like(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ---------------------------------------------------------------- danh mục

@admin_bp.get("/categories")
@admin_required
def list_categories():
    """Query: q (tên / mô tả). Trả về toàn bộ danh mục, không phân trang (chỉ ~22 mục)."""
    query = Category.query
    q = (request.args.get("q") or "").strip()
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(or_(Category.name.ilike(like, escape="\\"), Category.description.ilike(like, escape="\\")))

    categories = query.order_by(Category.name).all()
    counts, children = counts_by_category(), child_counts_by_category()
    return {
        "items": [category_payload(c, counts, children) for c in categories],
        "total": len(categories),
    }


@admin_bp.post("/categories")
@admin_required
def add_category():
    try:
        category = create_category(request.get_json(silent=True) or {})
    except ProductValidationError as e:
        db.session.rollback()
        return {"error": str(e), "errors": e.errors}, 400
    return {"category": category_payload(category)}, 201


@admin_bp.put("/categories/<int:category_id>")
@admin_required
def edit_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return {"error": "Không tìm thấy danh mục"}, 404
    try:
        category = update_category(category, request.get_json(silent=True) or {})
    except ProductValidationError as e:
        db.session.rollback()
        return {"error": str(e), "errors": e.errors}, 400
    return {"category": category_payload(category)}


@admin_bp.delete("/categories/<int:category_id>")
@admin_required
def remove_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return {"error": "Không tìm thấy danh mục"}, 404
    try:
        name = delete_category(category)
    except CategoryInUseError as e:
        db.session.rollback()
        return {"error": str(e), "product_count": e.product_count}, 409
    return {"deleted": category_id, "name": name}


# ------------------------------------------------------------- khách hàng

@admin_bp.get("/customers")
@admin_required
def list_customers():
    """Query: q (tên/email/SĐT), status (active|locked), sort, page.

    Chỉ liệt kê role='customer'; tài khoản quản trị không hiện ở đây.
    """
    args = request.args
    sort = args.get("sort", "newest")
    if sort not in CUSTOMER_SORTS:
        return {"error": f"sort phải là một trong: {', '.join(CUSTOMER_SORTS)}"}, 400

    stats = order_stats_subquery()
    query = (
        db.session.query(
            User,
            func.coalesce(stats.c.order_count, 0).label("order_count"),
            func.coalesce(stats.c.total_spent, 0).label("total_spent"),
            stats.c.last_order_at,
        )
        .outerjoin(stats, stats.c.user_id == User.user_id)
        .filter(User.role == "customer")
    )

    q = (args.get("q") or "").strip()
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(
            or_(User.name.ilike(like, escape="\\"), User.email.ilike(like, escape="\\"), User.phone.ilike(like, escape="\\"))
        )

    # Đếm trước khi lọc trạng thái để hai tab luôn hiện đủ số lượng.
    # MySQL trả tinyint(1) có thể về 0/1 hoặc False/True tuỳ driver -> ép về bool.
    status_counts = {"active": 0, "locked": 0}
    for active, n in query.with_entities(User.is_active, func.count(User.user_id)).group_by(User.is_active).all():
        status_counts["active" if active else "locked"] += n

    status = args.get("status")
    if status == "active":
        query = query.filter(User.is_active.is_(True))
    elif status == "locked":
        query = query.filter(User.is_active.is_(False))

    page = max(1, args.get("page", 1, type=int))
    total = query.count()
    rows = (
        query.order_by(*CUSTOMER_SORTS[sort](stats))
        .offset((page - 1) * CUSTOMERS_PER_PAGE)
        .limit(CUSTOMERS_PER_PAGE)
        .all()
    )
    return {
        "items": [customer_payload(u, n, spent, last) for u, n, spent, last in rows],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // CUSTOMERS_PER_PAGE)),
        "status_counts": status_counts,
    }


def _find_customer(user_id):
    return User.query.filter_by(user_id=user_id, role="customer").first()


@admin_bp.get("/customers/<int:user_id>")
@admin_required
def customer_detail(user_id):
    user = _find_customer(user_id)
    if user is None:
        return {"error": "Không tìm thấy khách hàng"}, 404

    stats = order_stats_subquery()
    row = db.session.query(stats).filter(stats.c.user_id == user_id).first()

    return {
        "customer": customer_payload(
            user,
            row.order_count if row else 0,
            row.total_spent if row else 0,
            row.last_order_at if row else None,
        ),
        "orders": order_history(user_id),
        "status_breakdown": status_breakdown(user_id),
    }


@admin_bp.patch("/customers/<int:user_id>/status")
@admin_required
def update_customer_status(user_id):
    """Body: {is_active: bool}. Khoá tài khoản = khách không đăng nhập được nữa."""
    user = _find_customer(user_id)
    if user is None:
        return {"error": "Không tìm thấy khách hàng"}, 404

    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")
    if not isinstance(is_active, bool):
        return {"error": "is_active phải là true hoặc false"}, 400

    try:
        user = set_active(user, is_active, current_user())
    except CustomerRuleError as e:
        db.session.rollback()
        return {"error": str(e)}, 409
    return {"customer": customer_payload(user)}


# ------------------------------------------------------------ báo cáo thống kê

@admin_bp.get("/stats")
@admin_required
def stats():
    """Query: range=7d|30d|90d|month|custom, from/to (YYYY-MM-DD) khi range=custom."""
    args = request.args
    try:
        return build_report(args.get("range", "30d"), args.get("from"), args.get("to"))
    except RangeError as e:
        return {"error": str(e)}, 400
