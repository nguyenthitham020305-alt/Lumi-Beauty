from flask import Blueprint, request
from sqlalchemy import func, or_

from ..extensions import db
from ..models import Brand, Category, Product, product_categories

catalog_bp = Blueprint("catalog", __name__)

MAX_LIMIT = 48

# sold_count chưa có dữ liệu thật (toàn 0) nên "bán chạy" dựa thêm vào lượt đánh giá
SORTS = {
    "bestseller": [Product.sold_count.desc(), Product.review_count.desc(), Product.rating.desc()],
    "newest": [Product.product_id.desc()],
    "rating": [Product.rating.desc(), Product.review_count.desc()],
    "price_asc": [Product.price.asc()],
    "price_desc": [Product.price.desc()],
}


def _limit(default):
    try:
        return max(1, min(int(request.args.get("limit", default)), MAX_LIMIT))
    except ValueError:
        return default


@catalog_bp.get("/categories")
def list_categories():
    counts = dict(
        db.session.query(product_categories.c.category_id, func.count())
        .group_by(product_categories.c.category_id)
        .all()
    )
    categories = Category.query.order_by(Category.category_id).all()
    return {
        "items": [
            {**c.to_dict(), "product_count": counts.get(c.category_id, 0)} for c in categories
        ]
    }


@catalog_bp.get("/brands")
def list_brands():
    """Thương hiệu kèm số sản phẩm, cho bộ lọc. category (slug) = chỉ đếm SP trong danh mục đó."""
    product_count = func.count(Product.product_id).label("product_count")
    query = (
        db.session.query(Brand, product_count)
        .join(Product, Product.brand_id == Brand.brand_id)
        .filter(Product.status != "hidden")
    )
    category_slug = request.args.get("category")
    if category_slug:
        query = query.join(product_categories, product_categories.c.product_id == Product.product_id).join(
            Category, Category.category_id == product_categories.c.category_id
        ).filter(Category.slug == category_slug)
    rows = query.group_by(Brand.brand_id).order_by(Brand.name).all()
    return {"items": [{**b.to_dict(), "product_count": n} for b, n in rows]}


@catalog_bp.get("/brands/featured")
def featured_brands():
    product_count = func.count(Product.product_id).label("product_count")
    rows = (
        db.session.query(Brand, product_count)
        .join(Product, Product.brand_id == Brand.brand_id)
        .filter(Brand.logo_url.isnot(None), Product.status != "hidden")
        .group_by(Brand.brand_id)
        .order_by(product_count.desc())
        .limit(_limit(12))
        .all()
    )
    return {"items": [{**b.to_dict(), "product_count": n} for b, n in rows]}


@catalog_bp.get("/products")
def list_products():
    """Danh sách sản phẩm cho trang chủ và trang /products.

    Query: q, category (slug), brand (slug), min_price, max_price, in_stock=1,
    sort (xem SORTS), page, per_page (hoặc limit, dùng ở trang chủ).
    """
    sort = request.args.get("sort", "bestseller")
    if sort not in SORTS:
        return {"error": f"sort phải là một trong: {', '.join(SORTS)}"}, 400
    min_price, max_price = _int_arg("min_price"), _int_arg("max_price")
    if min_price is False or max_price is False:
        return {"error": "min_price / max_price phải là số nguyên không âm"}, 400

    query = Product.query.filter(Product.status != "hidden")

    category_slug = request.args.get("category")
    if category_slug:
        query = query.join(product_categories).join(Category).filter(Category.slug == category_slug)

    # brand=cosrx,bioderma — chọn nhiều thương hiệu
    brand_slugs = [s for s in (request.args.get("brand") or "").split(",") if s][:50]
    keywords = (request.args.get("q") or "").split()[:8]
    if brand_slugs or keywords:
        query = query.outerjoin(Brand, Brand.brand_id == Product.brand_id)
    if brand_slugs:
        query = query.filter(Brand.slug.in_(brand_slugs))
    # Mỗi từ phải có trong tên SP hoặc tên thương hiệu. Collation utf8mb4_unicode_ci
    # không phân biệt dấu nên "sua rua mat" vẫn khớp "Sữa rửa mặt".
    for word in keywords:
        pattern = f"%{_escape_like(word)}%"
        query = query.filter(or_(Product.name.ilike(pattern, escape="\\"), Brand.name.ilike(pattern, escape="\\")))

    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if request.args.get("in_stock") == "1":
        query = query.filter(Product.stock > 0)

    per_page = _per_page()
    page = max(_int_arg("page") or 1, 1)
    total = query.count()

    # Hàng còn trong kho luôn đứng trước để không bị toàn sản phẩm hết hàng ở trang đầu
    in_stock_first = (Product.stock > 0).desc()
    products = (
        query.order_by(in_stock_first, *SORTS[sort], Product.product_id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "items": [p.to_card() for p in products],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": max(1, -(-total // per_page)),
        },
    }


def _int_arg(name):
    """None nếu không truyền, False nếu sai định dạng."""
    raw = request.args.get(name)
    if raw in (None, ""):
        return None
    return int(raw) if raw.isdigit() else False


def _per_page():
    value = _int_arg("per_page") or _int_arg("limit") or 20
    return max(1, min(value, MAX_LIMIT))


def _escape_like(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
