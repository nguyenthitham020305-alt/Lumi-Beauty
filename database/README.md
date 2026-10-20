# Cơ sở dữ liệu — `cosmetic_shop`

## Cài đặt

Chạy đúng thứ tự:

```bash
mysql -u root -p < 01_schema.sql     # tạo CSDL + 16 bảng + trigger + view
mysql -u root -p cosmetic_shop < 02_data.sql   # nạp 1.456 sản phẩm
```

Kiểm tra:

```sql
USE cosmetic_shop;
SELECT COUNT(*) FROM products;          -- 1456
SELECT COUNT(*) FROM product_images;    -- 8919
SELECT * FROM v_products LIMIT 5;
```

## File

| File | Nội dung |
|---|---|
| `01_schema.sql` | Toàn bộ DDL. Viết tay, sửa trực tiếp ở đây |
| `02_data.sql` | Dữ liệu sản phẩm. **File sinh tự động** — đừng sửa tay |

`02_data.sql` do `scraper/scraper/transform.py` sinh ra. Muốn đổi dữ liệu thì sửa
`transform.py` rồi chạy lại, file này tự cập nhật.

## 16 bảng

```
users ─┬─ carts ── cart_items ──┐
       ├─ orders ─┬─ order_items ┤
       │          ├─ payments    │
       │          └─ shipments   │
       ├─ reviews ────────────────┤
       └─ chat_sessions ─┬─ chat_messages
                         └─ product_recommendations ─┐
                                                     │
brands ── products ─┬─ product_categories ── categories
                    ├─ product_images
                    └────────────────────────────────┘
```

| Nhóm | Bảng | Nguồn dữ liệu |
|---|---|---|
| Người dùng | `users` | Ứng dụng tự tạo |
| Sản phẩm | `brands`, `categories`, `products`, `product_categories`, `product_images` | Crawl từ Beauty Box |
| Giỏ hàng | `carts`, `cart_items` | Ứng dụng |
| Đơn hàng | `orders`, `order_items`, `payments`, `shipments` | Ứng dụng |
| Đánh giá | `reviews` | Ứng dụng |
| Chatbot | `chat_sessions`, `chat_messages`, `product_recommendations` | Ứng dụng |

## Khác biệt so với sơ đồ lớp

| Sơ đồ | CSDL | Lý do |
|---|---|---|
| `Admin` kế thừa `User` | `users.role` ENUM | Một luồng đăng nhập, không trùng email giữa hai bảng |
| `Product.category_id` (1-N) | Bảng `product_categories` (N-N) | Dữ liệu thật: 1.456 SP có 1.736 liên kết danh mục |
| `Product.brand` VARCHAR | Bảng `brands` + FK | 183 thương hiệu có logo, slug riêng |
| `Product.image` một ảnh | Bảng `product_images` | 8.919 ảnh, trung bình 6,1 ảnh/SP |
| `Shipping` | `shipments` | `shipping` là từ khóa dễ nhầm, số nhiều cho đồng bộ |

## Cột thêm ngoài sơ đồ

| Bảng | Cột | Lý do |
|---|---|---|
| `orders` | `order_code` | Mã cho khách tra cứu, vd `DH20260919001`. Không lộ số thứ tự đơn |
| `orders` | `recipient_name`, `recipient_phone` | Người nhận có thể khác người đặt |
| `orders` | `subtotal`, `shipping_fee`, `discount_amount` | Tách ra để hiển thị hóa đơn, `total_amount` là tổng cuối |
| `order_items` | `product_name`, `product_image` | Chụp lại lúc mua. Sản phẩm đổi tên/bị gỡ thì đơn cũ vẫn đúng |
| `products` | `seed_rating`, `seed_review_count` | Điểm gốc từ Beauty Box, tách khỏi điểm người dùng |
| `products` | `sold_count` | Sắp xếp "bán chạy nhất" |
| `payments` | `transaction_code` | Mã giao dịch từ MoMo/VNPay |
| `shipments` | `tracking_code` | Mã vận đơn |
| `reviews` | `status` | Phục vụ `Admin.manageReviews()` trong sơ đồ |
| `product_recommendations` | `score`, `reason`, `is_clicked` | Đo hiệu quả chatbot để viết vào báo cáo |

## Điểm đánh giá hoạt động thế nào

`products.rating` là **điểm gộp**, không phải điểm thô:

```
rating = (seed_rating × seed_review_count + tổng điểm review) / (seed_review_count + số review)
```

- `seed_rating`, `seed_review_count` — từ Beauty Box, **không bao giờ sửa**
- `rating`, `review_count` — điểm hiển thị, do trigger tự tính

Ba trigger `trg_reviews_after_insert / update / delete` gọi thủ tục
`sp_refresh_product_rating()` mỗi khi bảng `reviews` thay đổi. Backend
**không cần** tự cập nhật `products.rating`.

Hiện tại 242/1.456 sản phẩm có điểm sẵn, 1.214 sản phẩm `rating = NULL`.

## Hai view có sẵn

- `v_products` — sản phẩm + tên thương hiệu + danh sách danh mục, dùng cho trang danh sách
- `v_orders` — đơn hàng + khách + trạng thái thanh toán/vận chuyển, dùng cho trang quản trị

## Lưu ý khi viết backend

- `users.password` phải lưu **hash** (bcrypt/argon2), cột để sẵn 255 ký tự
- Ảnh hotlink từ `image.hsv-tech.io`. Thêm kích thước vào URL để tải nhanh:
  `https://image.hsv-tech.io/300x0/bbx/common/abc.webp`
- `cart_items` có `UNIQUE(cart_id, product_id)` — thêm lại sản phẩm đã có thì
  dùng `INSERT ... ON DUPLICATE KEY UPDATE quantity = quantity + ?`
- `stock` không tự trừ khi đặt hàng. Backend phải tự xử lý, nên bọc trong
  transaction để tránh bán quá số lượng tồn
