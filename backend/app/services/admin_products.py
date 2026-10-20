"""Kiểm tra dữ liệu và thao tác thêm/sửa/xoá sản phẩm phía quản trị."""
import re
import unicodedata

from ..extensions import db
from ..models import Brand, Category, OrderItem, Product, ProductImage, Review

NAME_MIN, NAME_MAX = 2, 500
SKU_MAX = 50
DESCRIPTION_MAX = 5000
IMAGE_URL_MAX = 500
MAX_IMAGES = 8
MAX_PRICE = 2_000_000_000  # vừa đủ trong INT UNSIGNED của MySQL
MAX_STOCK = 1_000_000
SLUG_MAX = 255

# Admin chỉ chọn 2 trạng thái này; "out_of_stock" do backend tự đặt theo tồn kho
EDITABLE_STATUSES = ("active", "hidden")


class ProductValidationError(Exception):
    """Dữ liệu form không hợp lệ. errors: {tên trường: thông báo}."""

    def __init__(self, errors, message="Dữ liệu không hợp lệ"):
        super().__init__(message)
        self.errors = errors


def slugify(text):
    """'Kem Dưỡng Ẩm 50ml' -> 'kem-duong-am-50ml'."""
    text = (text or "").replace("Đ", "D").replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return text[:SLUG_MAX] or "san-pham"


def unique_slug(name, exclude_id=None):
    """Thêm hậu tố -2, -3... cho tới khi không trùng (slug có UNIQUE trong DB)."""
    base = slugify(name)
    query = Product.query.filter(Product.slug == base)
    if exclude_id is not None:
        query = query.filter(Product.product_id != exclude_id)
    if not db.session.query(query.exists()).scalar():
        return base

    for n in range(2, 1000):
        candidate = f"{base[: SLUG_MAX - 5]}-{n}"
        query = Product.query.filter(Product.slug == candidate)
        if exclude_id is not None:
            query = query.filter(Product.product_id != exclude_id)
        if not db.session.query(query.exists()).scalar():
            return candidate
    raise ProductValidationError({"name": "Tên sản phẩm bị trùng quá nhiều, vui lòng đổi tên"})


def _as_int(value, field, errors, label, minimum=0, maximum=None, required=True):
    if value in (None, ""):
        if required:
            errors[field] = f"{label} không được để trống"
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        errors[field] = f"{label} phải là số nguyên"
        return None
    if number < minimum:
        errors[field] = f"{label} phải từ {minimum:,}".replace(",", ".")
        return None
    if maximum is not None and number > maximum:
        errors[field] = f"{label} tối đa {maximum:,}".replace(",", ".")
        return None
    return number


def validate(data, product_id=None):
    """Trả về dict các trường đã chuẩn hoá. Ném ProductValidationError nếu sai."""
    errors = {}

    name = (data.get("name") or "").strip()
    if not NAME_MIN <= len(name) <= NAME_MAX:
        errors["name"] = f"Tên sản phẩm phải từ {NAME_MIN} đến {NAME_MAX} ký tự"

    sku = (data.get("sku") or "").strip()
    if len(sku) > SKU_MAX:
        errors["sku"] = f"SKU tối đa {SKU_MAX} ký tự"
    elif sku:
        # DB không có UNIQUE trên sku, chặn ở đây để admin không tạo trùng mã
        duplicate = Product.query.filter(Product.sku == sku)
        if product_id is not None:
            duplicate = duplicate.filter(Product.product_id != product_id)
        if db.session.query(duplicate.exists()).scalar():
            errors["sku"] = "SKU này đã được dùng cho sản phẩm khác"

    description = (data.get("description") or "").strip()
    if len(description) > DESCRIPTION_MAX:
        errors["description"] = f"Mô tả tối đa {DESCRIPTION_MAX} ký tự"

    original_price = _as_int(data.get("original_price"), "original_price", errors, "Giá gốc", 1, MAX_PRICE)

    # Giá khuyến mãi bỏ trống = bán đúng giá gốc
    raw_sale = data.get("price")
    if raw_sale in (None, ""):
        price = original_price
    else:
        price = _as_int(raw_sale, "price", errors, "Giá khuyến mãi", 1, MAX_PRICE)
        if price is not None and original_price is not None and price > original_price:
            errors["price"] = "Giá khuyến mãi phải nhỏ hơn hoặc bằng giá gốc"

    stock = _as_int(data.get("stock"), "stock", errors, "Tồn kho", 0, MAX_STOCK)

    status = data.get("status") or "active"
    if status not in EDITABLE_STATUSES:
        errors["status"] = "Trạng thái phải là 'active' hoặc 'hidden'"

    brand_id = data.get("brand_id")
    brand = None
    if brand_id not in (None, "", 0):
        brand = db.session.get(Brand, int(brand_id)) if str(brand_id).isdigit() else None
        if brand is None:
            errors["brand_id"] = "Thương hiệu không tồn tại"

    raw_categories = data.get("category_ids") or []
    if not isinstance(raw_categories, list) or not raw_categories:
        errors["category_ids"] = "Chọn ít nhất một danh mục"
        categories = []
    else:
        ids = {int(c) for c in raw_categories if str(c).isdigit()}
        categories = Category.query.filter(Category.category_id.in_(ids)).all() if ids else []
        if len(categories) != len(ids) or not categories:
            errors["category_ids"] = "Có danh mục không tồn tại"

    raw_images = data.get("images") or []
    if not isinstance(raw_images, list):
        raw_images = []
    images, seen = [], set()
    for url in raw_images:
        url = (url or "").strip()
        if not url or url in seen:
            continue
        if not url.startswith(("http://", "https://", "/")):
            errors["images"] = "Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /"
            break
        if len(url) > IMAGE_URL_MAX:
            errors["images"] = f"Đường dẫn ảnh tối đa {IMAGE_URL_MAX} ký tự"
            break
        seen.add(url)
        images.append(url)
    if "images" not in errors:
        if not images:
            errors["images"] = "Thêm ít nhất một ảnh sản phẩm"
        elif len(images) > MAX_IMAGES:
            errors["images"] = f"Tối đa {MAX_IMAGES} ảnh"

    if errors:
        raise ProductValidationError(errors)

    # Hết hàng thì ghi đè trạng thái để không bày sản phẩm không mua được
    if stock == 0 and status == "active":
        status = "out_of_stock"

    discount = round((original_price - price) * 100 / original_price) if original_price > price else 0

    return {
        "name": name,
        "sku": sku or None,
        "description": description or None,
        "brand_id": brand.brand_id if brand else None,
        "price": price,
        "original_price": original_price,
        "discount_percent": discount,
        "stock": stock,
        "status": status,
        "categories": categories,
        "images": images,
    }


def _apply(product, clean):
    product.name = clean["name"]
    product.sku = clean["sku"]
    product.description = clean["description"]
    product.brand_id = clean["brand_id"]
    product.price = clean["price"]
    product.original_price = clean["original_price"]
    product.discount_percent = clean["discount_percent"]
    product.stock = clean["stock"]
    product.status = clean["status"]
    # Sản phẩm admin nhập tay chỉ có một mức giá, không có biến thể
    product.price_min = clean["price"]
    product.price_max = clean["price"]
    product.variant_count = 1
    product.image = clean["images"][0]
    product.categories = clean["categories"]


def _replace_images(product, urls):
    ProductImage.query.filter_by(product_id=product.product_id).delete(synchronize_session=False)
    for position, url in enumerate(urls):
        db.session.add(ProductImage(product_id=product.product_id, url=url, position=position))


def create_product(data):
    clean = validate(data)
    product = Product(slug=unique_slug(clean["name"]), rating=None, review_count=0, sold_count=0)
    _apply(product, clean)
    db.session.add(product)
    db.session.flush()  # cần product_id trước khi thêm ảnh
    _replace_images(product, clean["images"])
    db.session.commit()
    db.session.refresh(product)
    return product


def update_product(product, data):
    clean = validate(data, product_id=product.product_id)
    # Đổi tên thì đổi slug theo, nhưng giữ nguyên nếu tên không đổi để link cũ còn sống
    if clean["name"] != product.name:
        product.slug = unique_slug(clean["name"], exclude_id=product.product_id)
    _apply(product, clean)
    _replace_images(product, clean["images"])
    db.session.commit()
    db.session.refresh(product)
    return product


def delete_impact(product):
    """Đếm dữ liệu sẽ mất khi xoá, để hộp xác nhận nói rõ hậu quả."""
    return {
        "reviews": Review.query.filter_by(product_id=product.product_id).count(),
        # ON DELETE SET NULL: đơn vẫn giữ tên/giá đã chụp, chỉ mất liên kết sản phẩm
        "order_items": OrderItem.query.filter_by(product_id=product.product_id).count(),
    }


def admin_payload(product, detail=False):
    data = {
        "id": product.product_id,
        "slug": product.slug,
        "name": product.name,
        "sku": product.sku,
        "image": product.image,
        "brand": product.brand.name if product.brand else None,
        "brand_id": product.brand_id,
        "price": product.price,
        "original_price": product.original_price,
        "discount_percent": product.discount_percent,
        "stock": product.stock,
        "status": product.status,
        "categories": [{"id": c.category_id, "name": c.name} for c in product.categories],
    }
    if detail:
        data["description"] = product.description
        data["images"] = [img.url for img in product.images] or ([product.image] if product.image else [])
        data["rating"] = float(product.rating) if product.rating is not None else None
        data["review_count"] = product.review_count
        data["sold_count"] = product.sold_count
    return data
