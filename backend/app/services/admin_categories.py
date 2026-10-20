"""Kiểm tra dữ liệu và thao tác thêm/sửa/xoá danh mục phía quản trị."""
from sqlalchemy import func

from ..extensions import db
from ..models import Category, product_categories
from .admin_products import ProductValidationError, slugify

NAME_MIN, NAME_MAX = 2, 255
DESCRIPTION_MAX = 500
IMAGE_URL_MAX = 500
SLUG_MAX = 255


class CategoryInUseError(Exception):
    """Danh mục còn sản phẩm nên không được xoá. message hiển thị thẳng cho admin."""

    def __init__(self, message, product_count):
        super().__init__(message)
        self.product_count = product_count


def unique_slug(name, exclude_id=None):
    """Thêm hậu tố -2, -3... cho tới khi không trùng (slug có UNIQUE trong DB)."""
    base = slugify(name)
    for candidate in [base] + [f"{base[: SLUG_MAX - 5]}-{n}" for n in range(2, 1000)]:
        query = Category.query.filter(Category.slug == candidate)
        if exclude_id is not None:
            query = query.filter(Category.category_id != exclude_id)
        if not db.session.query(query.exists()).scalar():
            return candidate
    raise ProductValidationError({"name": "Tên danh mục bị trùng quá nhiều, vui lòng đổi tên"})


def _descendant_ids(category_id):
    """Tất cả danh mục con, cháu... của một danh mục (để chặn vòng lặp cha-con)."""
    found, frontier = set(), [category_id]
    while frontier:
        rows = Category.query.filter(Category.parent_id.in_(frontier)).with_entities(Category.category_id).all()
        children = [r[0] for r in rows if r[0] not in found]
        found.update(children)
        frontier = children
    return found


def validate(data, category_id=None):
    """Trả về dict các trường đã chuẩn hoá. Ném ProductValidationError nếu sai."""
    errors = {}

    name = (data.get("name") or "").strip()
    if not NAME_MIN <= len(name) <= NAME_MAX:
        errors["name"] = f"Tên danh mục phải từ {NAME_MIN} đến {NAME_MAX} ký tự"
    else:
        # Trùng tên gây nhầm lẫn trên menu dù slug vẫn khác nhau
        duplicate = Category.query.filter(Category.name == name)
        if category_id is not None:
            duplicate = duplicate.filter(Category.category_id != category_id)
        if db.session.query(duplicate.exists()).scalar():
            errors["name"] = "Đã có danh mục trùng tên này"

    description = (data.get("description") or "").strip()
    if len(description) > DESCRIPTION_MAX:
        errors["description"] = f"Mô tả tối đa {DESCRIPTION_MAX} ký tự"

    image = (data.get("image") or "").strip()
    if image:
        if not image.startswith(("http://", "https://", "/")):
            errors["image"] = "Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /"
        elif len(image) > IMAGE_URL_MAX:
            errors["image"] = f"Đường dẫn ảnh tối đa {IMAGE_URL_MAX} ký tự"

    parent_id = data.get("parent_id")
    parent = None
    if parent_id not in (None, "", 0):
        parent = db.session.get(Category, int(parent_id)) if str(parent_id).isdigit() else None
        if parent is None:
            errors["parent_id"] = "Danh mục cha không tồn tại"
        elif category_id is not None:
            if parent.category_id == category_id:
                errors["parent_id"] = "Không thể chọn chính nó làm danh mục cha"
            elif parent.category_id in _descendant_ids(category_id):
                # Vòng lặp cha-con sẽ làm cây danh mục không hiển thị được
                errors["parent_id"] = "Không thể chọn danh mục con của chính nó làm cha"

    if errors:
        raise ProductValidationError(errors)

    return {
        "name": name,
        "description": description or None,
        "image": image or None,
        "parent_id": parent.category_id if parent else None,
    }


def create_category(data):
    clean = validate(data)
    category = Category(slug=unique_slug(clean["name"]), **clean)
    db.session.add(category)
    db.session.commit()
    db.session.refresh(category)
    return category


def update_category(category, data):
    clean = validate(data, category_id=category.category_id)
    # Đổi tên thì đổi slug theo, nhưng giữ nguyên nếu tên không đổi để link cũ còn sống
    if clean["name"] != category.name:
        category.slug = unique_slug(clean["name"], exclude_id=category.category_id)
    for key, value in clean.items():
        setattr(category, key, value)
    db.session.commit()
    db.session.refresh(category)
    return category


def product_count(category_id):
    return (
        db.session.query(func.count())
        .select_from(product_categories)
        .filter(product_categories.c.category_id == category_id)
        .scalar()
    )


def delete_category(category):
    """Chặn xoá khi còn sản phẩm.

    FK fk_pc_category là ON DELETE CASCADE nên nếu để MySQL xoá, các sản phẩm
    sẽ âm thầm mất danh mục và biến mất khỏi mọi trang duyệt dù vẫn còn trong
    CSDL. Vì vậy phải chặn ở đây thay vì phó mặc cho ràng buộc khoá ngoại.
    """
    count = product_count(category.category_id)
    if count:
        raise CategoryInUseError(
            f"Danh mục đang có {count} sản phẩm. Hãy chuyển các sản phẩm này sang danh mục khác trước khi xoá.",
            count,
        )
    # Danh mục con sẽ thành danh mục gốc (fk_categories_parent ON DELETE SET NULL)
    name = category.name
    db.session.delete(category)
    db.session.commit()
    return name


def admin_payload(category, counts=None, child_counts=None):
    cid = category.category_id
    return {
        "id": cid,
        "slug": category.slug,
        "name": category.name,
        "description": category.description,
        "image": category.image,
        "parent_id": category.parent_id,
        "product_count": (counts or {}).get(cid, 0) if counts is not None else product_count(cid),
        "child_count": (child_counts or {}).get(cid, 0) if child_counts is not None else 0,
    }


def counts_by_category():
    """{category_id: số sản phẩm} — đếm một lần cho cả danh sách, tránh N+1."""
    rows = (
        db.session.query(product_categories.c.category_id, func.count())
        .group_by(product_categories.c.category_id)
        .all()
    )
    return dict(rows)


def child_counts_by_category():
    rows = (
        db.session.query(Category.parent_id, func.count())
        .filter(Category.parent_id.isnot(None))
        .group_by(Category.parent_id)
        .all()
    )
    return dict(rows)
