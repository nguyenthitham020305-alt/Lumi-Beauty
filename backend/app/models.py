"""ORM ánh xạ các bảng trong database/01_schema.sql. Schema do file SQL quản lý, không dùng db.create_all()."""
from .extensions import db

product_categories = db.Table(
    "product_categories",
    db.Column("product_id", db.BigInteger, db.ForeignKey("products.product_id"), primary_key=True),
    db.Column("category_id", db.Integer, db.ForeignKey("categories.category_id"), primary_key=True),
)


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)  # bcrypt hash
    phone = db.Column(db.String(20))

    # Địa chỉ giao hàng mặc định — điền sẵn cho lần đặt hàng sau.
    # Khác với địa chỉ trong `orders`: chỗ đó là bản chụp của từng đơn,
    # không đổi dù khách sau này cập nhật địa chỉ.
    province_code = db.Column(db.Integer, db.ForeignKey("provinces.province_code"))
    ward_code = db.Column(db.Integer, db.ForeignKey("wards.ward_code"))
    street_address = db.Column(db.String(255))

    role = db.Column(db.Enum("customer", "admin"), nullable=False, default="customer")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    province = db.relationship("Province", lazy="joined")
    ward = db.relationship("Ward", lazy="joined")

    @property
    def is_admin(self):
        return self.role == "admin"

    def saved_address(self):
        """Địa chỉ đã lưu, hoặc None nếu khách chưa đặt đơn nào.

        Chỉ trả về khi đủ cả ba phần — thiếu một phần thì không điền sẵn được,
        để khách nhập lại từ đầu còn hơn điền nửa vời rồi giao sai.
        """
        if not (self.province_code and self.ward_code and self.street_address):
            return None
        return {
            "province_code": self.province_code,
            "ward_code": self.ward_code,
            "street_address": self.street_address,
            "province_name": self.province.name if self.province else None,
            "ward_name": self.ward.name if self.ward else None,
            "full": ", ".join(
                [
                    self.street_address,
                    self.ward.name if self.ward else "",
                    self.province.name if self.province else "",
                ]
            ),
        }

    def to_dict(self):
        return {
            "id": self.user_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
        }


class Brand(db.Model):
    __tablename__ = "brands"

    brand_id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), nullable=False, unique=True)
    name = db.Column(db.String(255), nullable=False)
    logo_url = db.Column(db.String(500))

    products = db.relationship("Product", back_populates="brand", lazy="dynamic")

    def to_dict(self):
        return {"id": self.brand_id, "slug": self.slug, "name": self.name, "logo_url": self.logo_url}


class Category(db.Model):
    __tablename__ = "categories"

    category_id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), nullable=False, unique=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500))
    image = db.Column(db.String(500))
    parent_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"))

    def to_dict(self):
        return {
            "id": self.category_id,
            "slug": self.slug,
            "name": self.name,
            "image": self.image,
            "parent_id": self.parent_id,
        }


class Product(db.Model):
    __tablename__ = "products"

    product_id = db.Column(db.BigInteger, primary_key=True)
    sku = db.Column(db.String(50))
    slug = db.Column(db.String(255), nullable=False, unique=True)
    name = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    brand_id = db.Column(db.Integer, db.ForeignKey("brands.brand_id"))

    price = db.Column(db.Integer, nullable=False)
    original_price = db.Column(db.Integer, nullable=False)
    discount_percent = db.Column(db.SmallInteger, nullable=False, default=0)
    price_min = db.Column(db.Integer, nullable=False)
    price_max = db.Column(db.Integer, nullable=False)
    variant_count = db.Column(db.SmallInteger, nullable=False, default=1)
    stock = db.Column(db.Integer, nullable=False, default=0)

    rating = db.Column(db.Numeric(3, 2))
    review_count = db.Column(db.Integer, nullable=False, default=0)
    image = db.Column(db.String(500))
    status = db.Column(db.Enum("active", "out_of_stock", "hidden"), nullable=False, default="active")
    sold_count = db.Column(db.Integer, nullable=False, default=0)

    brand = db.relationship("Brand", back_populates="products", lazy="joined")
    categories = db.relationship("Category", secondary=product_categories, lazy="selectin")
    # passive_deletes: để FK ON DELETE CASCADE của MySQL xoá ảnh, không set product_id = NULL
    images = db.relationship(
        "ProductImage",
        order_by="ProductImage.position",
        lazy="select",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def is_purchasable(self):
        return self.status == "active" and self.stock > 0

    def to_detail(self):
        gallery = [img.url for img in self.images] or ([self.image] if self.image else [])
        return {
            **self.to_card(),
            "sku": self.sku,
            "description": self.description,
            "stock": self.stock,
            "status": self.status,
            "sold_count": self.sold_count,
            "images": gallery,
            "brand_slug": self.brand.slug if self.brand else None,
            "categories": [c.to_dict() for c in self.categories],
        }

    def to_card(self):
        return {
            "id": self.product_id,
            "slug": self.slug,
            "name": self.name,
            "brand": self.brand.name if self.brand else None,
            "price": self.price,
            "original_price": self.original_price,
            "discount_percent": self.discount_percent,
            "price_min": self.price_min,
            "price_max": self.price_max,
            "variant_count": self.variant_count,
            "rating": float(self.rating) if self.rating is not None else None,
            "review_count": self.review_count,
            "image": self.image,
            "in_stock": self.stock > 0,
        }


class ProductImage(db.Model):
    __tablename__ = "product_images"

    image_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.BigInteger, db.ForeignKey("products.product_id"), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    position = db.Column(db.SmallInteger, nullable=False, default=0)


class Review(db.Model):
    """products.rating/review_count do trigger trong DB tự tính lại, backend không cập nhật."""

    __tablename__ = "reviews"

    review_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    product_id = db.Column(db.BigInteger, db.ForeignKey("products.product_id"), nullable=False)
    rating = db.Column(db.SmallInteger, nullable=False)
    comment = db.Column(db.Text)
    status = db.Column(db.Enum("pending", "approved", "hidden"), nullable=False, default="approved")
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    user = db.relationship("User", lazy="joined")

    def to_dict(self):
        return {
            "id": self.review_id,
            "rating": self.rating,
            "comment": self.comment,
            "user_name": self.user.name if self.user else "Khách hàng",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Province(db.Model):
    __tablename__ = "provinces"

    province_code = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    division_type = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {"code": self.province_code, "name": self.name}


class Ward(db.Model):
    __tablename__ = "wards"

    ward_code = db.Column(db.Integer, primary_key=True)
    province_code = db.Column(db.Integer, db.ForeignKey("provinces.province_code"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    division_type = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {"code": self.ward_code, "name": self.name}


ORDER_STATUSES = ("pending", "confirmed", "delivered", "cancelled")


class Order(db.Model):
    __tablename__ = "orders"

    order_id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(20), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    order_date = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    subtotal = db.Column(db.Integer, nullable=False)
    shipping_fee = db.Column(db.Integer, nullable=False, default=0)
    discount_amount = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(*ORDER_STATUSES), nullable=False, default="pending")

    recipient_name = db.Column(db.String(100), nullable=False)
    recipient_phone = db.Column(db.String(20), nullable=False)
    recipient_email = db.Column(db.String(255))
    province_code = db.Column(db.Integer, db.ForeignKey("provinces.province_code"))
    ward_code = db.Column(db.Integer, db.ForeignKey("wards.ward_code"))
    street_address = db.Column(db.String(255))
    shipping_address = db.Column(db.String(500), nullable=False)
    note = db.Column(db.String(500))
    cancelled_reason = db.Column(db.String(255))

    user = db.relationship("User", lazy="select")
    items = db.relationship("OrderItem", order_by="OrderItem.order_item_id", lazy="select")
    payment = db.relationship("Payment", uselist=False, lazy="joined")
    shipment = db.relationship("Shipment", uselist=False, lazy="joined")


class OrderItem(db.Model):
    """Tên, ảnh, giá chụp lại lúc mua: sản phẩm đổi giá/bị gỡ thì đơn cũ vẫn đúng."""

    __tablename__ = "order_items"

    order_item_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False)
    product_id = db.Column(db.BigInteger, db.ForeignKey("products.product_id"))
    product_name = db.Column(db.String(500), nullable=False)
    product_image = db.Column(db.String(500))
    quantity = db.Column(db.SmallInteger, nullable=False)
    unit_price = db.Column(db.Integer, nullable=False)
    subtotal = db.Column(db.Integer, nullable=False)

    product = db.relationship("Product", lazy="joined")


class Payment(db.Model):
    __tablename__ = "payments"

    payment_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False, unique=True)
    # bank_transfer = chuyển khoản qua mã VietQR
    method = db.Column(db.Enum("cod", "bank_transfer", "momo", "vnpay"), nullable=False, default="cod")
    amount = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum("pending", "paid", "failed", "refunded"), nullable=False, default="pending")
    transaction_code = db.Column(db.String(100))
    paid_at = db.Column(db.DateTime)


class Shipment(db.Model):
    __tablename__ = "shipments"

    shipping_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False, unique=True)
    method = db.Column(db.Enum("standard", "express"), nullable=False, default="standard")
    shipping_fee = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(
        db.Enum("pending", "picked_up", "in_transit", "delivered", "failed"), nullable=False, default="pending"
    )
    tracking_code = db.Column(db.String(100))


class Cart(db.Model):
    __tablename__ = "carts"

    cart_id = db.Column(db.Integer, primary_key=True)
    # NULL = giỏ của khách chưa đăng nhập, cart_id lưu trong session cookie
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), unique=True)

    # passive_deletes: để FK ON DELETE CASCADE của MySQL xoá dòng con, không set cart_id = NULL
    items = db.relationship(
        "CartItem", order_by="CartItem.cart_item_id.desc()", lazy="select", cascade="all, delete-orphan", passive_deletes=True
    )


class CartItem(db.Model):
    __tablename__ = "cart_items"
    __table_args__ = (db.UniqueConstraint("cart_id", "product_id"),)

    cart_item_id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.cart_id"), nullable=False)
    product_id = db.Column(db.BigInteger, db.ForeignKey("products.product_id"), nullable=False)
    quantity = db.Column(db.SmallInteger, nullable=False, default=1)
    unit_price = db.Column(db.Integer, nullable=False)
    is_selected = db.Column(db.Boolean, nullable=False, default=True)

    product = db.relationship("Product", lazy="joined")


class ChatSession(db.Model):
    __tablename__ = "chat_sessions"

    session_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)  # NULL = khách chưa đăng nhập
    started_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    ended_at = db.Column(db.DateTime)


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    message_id = db.Column(db.BigInteger, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("chat_sessions.session_id"), nullable=False)
    sender = db.Column(db.Enum("user", "bot"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())


class ProductRecommendation(db.Model):
    __tablename__ = "product_recommendations"

    reco_id = db.Column(db.BigInteger, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("chat_sessions.session_id"), nullable=False)
    message_id = db.Column(db.BigInteger, db.ForeignKey("chat_messages.message_id"))
    product_id = db.Column(db.BigInteger, db.ForeignKey("products.product_id"), nullable=False)
    score = db.Column(db.Numeric(5, 4))
    reason = db.Column(db.String(255))
    is_clicked = db.Column(db.Boolean, nullable=False, default=False)
