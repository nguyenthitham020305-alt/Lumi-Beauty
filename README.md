# LUMI Beauty

Website bán mỹ phẩm tích hợp chatbot tư vấn AI (Google Gemini).

| Thư mục | Nội dung |
|---|---|
| `backend/` | API Flask + SQLAlchemy (MySQL) |
| `frontend/` | React 19 + Vite + Tailwind CSS v4 |
| `database/` | Schema và dữ liệu MySQL, xem `database/README.md` |
| `scraper/` | Crawl và làm sạch dữ liệu từ Beauty Box |

## Chạy dự án (3 cửa sổ terminal)

**1. MySQL**: service `MySQL267` tự chạy cùng Windows, cổng **3307**.
Điền mật khẩu root vào `DATABASE_URL` trong `backend/.env`.

**2. Backend** (http://127.0.0.1:5000)

```powershell
cd backend
.venv\Scripts\activate
python run.py
```

Lần đầu trên máy mới: `python -m venv .venv`, `pip install -r requirements.txt`, rồi chép `.env.example` thành `.env`.

**3. Frontend** (http://localhost:5173)

```powershell
cd frontend
npm install   # chỉ lần đầu
npm run dev
```

Vite chuyển tiếp `/api/*` sang Flask nên không cần cấu hình CORS khi dev.

## Bật chatbot AI

1. Lấy API key tại https://aistudio.google.com/apikey
2. Điền vào `backend/.env`: `GEMINI_API_KEY=...`
3. Khởi động lại backend

Khi chưa có key, chatbot vẫn chạy ở chế độ dự phòng: nó trả về các sản phẩm khớp từ khóa, không có câu trả lời do AI viết.

## Cập nhật CSDL đã có dữ liệu

Nếu CSDL được tạo trước các chức năng giỏ hàng và đặt hàng, chạy các file sau theo thứ tự, mỗi file một lần:

```powershell
mysql -u root -p -P 3307 cosmetic_shop < database/03_cart_guest.sql
mysql -u root -p -P 3307 cosmetic_shop < database/04_checkout.sql
mysql -u root -p -P 3307 cosmetic_shop < database/05_address_data.sql
```

`05_address_data.sql` chứa 34 tỉnh/thành và 3.321 phường/xã (địa giới 2 cấp từ 01/07/2025). File này được sinh bằng lệnh
`flask --app run import-addresses --sql-out ../database/05_address_data.sql`, lấy dữ liệu từ provinces.open-api.vn.

## Đặt hàng và thanh toán

- Phí ship và ngưỡng miễn phí: `SHIPPING_FEE`, `FREE_SHIPPING_THRESHOLD` trong `backend/.env`.
- Mã QR theo chuẩn VietQR, tạo từ `BANK_BIN`, `BANK_NAME`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME` trong `.env`. **Tài khoản hiện tại là tài khoản demo.**
- Đặt hàng sẽ trừ tồn kho, tăng `sold_count` và xoá các dòng đã đặt khỏi giỏ, tất cả trong một transaction có khoá dòng sản phẩm.
- Mọi đơn tạo ra đều có `payments.status = pending`. Đơn chuyển khoản chưa tự đối soát được: cần admin xác nhận, hoặc tích hợp webhook ngân hàng (SePay, Casso...).

## Tài khoản admin

Form đăng ký công khai luôn tạo role `customer`. Admin chỉ được tạo bằng lệnh sau (mật khẩu nhập ẩn, lưu dạng hash bcrypt):

```powershell
cd backend
.venv\Scripts\activate
flask --app run create-admin
```

Mặc định email là `admin@lumibeauty.com`. Chạy lại lệnh với cùng email để đặt lại mật khẩu.

## API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/categories` | Danh mục kèm số sản phẩm |
| GET | `/api/brands?category=` | Toàn bộ thương hiệu kèm số sản phẩm, lọc theo danh mục nếu có |
| GET | `/api/brands/featured?limit=12` | Thương hiệu có logo, xếp theo số sản phẩm |
| GET | `/api/products?q=&category=&brand=&min_price=&max_price=&in_stock=1&sort=&page=&per_page=` | `sort`: `bestseller`, `newest`, `rating`, `price_asc`, `price_desc`. Trả về `items` và `pagination` |
| GET | `/api/products/<slug hoặc id>` | Chi tiết sản phẩm, bộ ảnh, danh mục và `related` |
| GET | `/api/products/<id>/reviews?page=` | Đánh giá đã duyệt, phân bố số sao, `can_review` |
| POST | `/api/products/<id>/reviews` | `{rating, comment}`. Chỉ người có đơn **delivered** chứa sản phẩm này |
| GET | `/api/cart` | Giỏ hàng hiện tại, kể cả khách chưa đăng nhập. `count` là tổng số lượng; `subtotal` chỉ tính các dòng được chọn |
| POST | `/api/cart/items` | `{product_id, quantity}`. Sản phẩm đã có thì cộng dồn, không vượt quá tồn kho |
| PATCH | `/api/cart/items/<product_id>` | `{quantity?, selected?}` |
| PATCH | `/api/cart/select-all` | `{selected}` |
| DELETE | `/api/cart/items/<product_id>` | Xoá khỏi giỏ |
| POST | `/api/cart/checkout` | Bắt buộc đăng nhập. Kiểm tra các dòng được chọn còn đủ hàng |
| GET | `/api/address/provinces` | 34 tỉnh/thành |
| GET | `/api/address/provinces/<code>/wards` | Phường/xã của tỉnh |
| GET | `/api/checkout/summary` | Các dòng được chọn, tạm tính, giảm giá, phí ship, tổng |
| POST | `/api/orders` | Tạo đơn: `{recipient_name, recipient_phone, recipient_email, province_code, ward_code, street_address, note?, payment_method: cod \| bank_transfer}` |
| GET | `/api/orders` | Đơn của tôi |
| GET | `/api/orders/<order_code>` | Chi tiết đơn, kèm `transfer_qr` nếu chuyển khoản chưa thanh toán. Chỉ chủ đơn hoặc admin xem được |

**Giỏ của khách:** `carts.user_id = NULL`, `cart_id` được lưu trong session cookie có ký. Khi đăng nhập hoặc đăng ký, giỏ khách được gộp vào giỏ tài khoản. CSDL cũ cần chạy `database/03_cart_guest.sql` một lần.
| POST | `/api/chat` | `{message, session_id?}` → `{session_id, reply, products[]}` |
| POST | `/api/chat/recommendations/<id>/click` | Ghi nhận khách bấm vào sản phẩm được gợi ý |
| POST | `/api/auth/register` | `{name, email, phone, password, confirm_password}` → 201 và tự đăng nhập |
| POST | `/api/auth/login` | `{email, password}` → `{user}` |
| POST | `/api/auth/logout` | Xoá phiên |
| GET | `/api/auth/me` | `{user}`, hoặc `{user: null}` nếu chưa đăng nhập |
| GET | `/api/admin/summary` | Chỉ admin: 401 nếu chưa đăng nhập, 403 nếu là customer |

Đăng nhập dùng session cookie `lumi_session` của Flask (HttpOnly, SameSite=Lax), được ký bằng `SECRET_KEY` trong `.env`.

## Chatbot hoạt động thế nào

1. `services/product_search.py` chấm điểm độ khớp giữa câu hỏi và tên, thương hiệu, danh mục của sản phẩm, rồi lấy 8 sản phẩm liên quan nhất.
2. `services/chatbot.py` gửi 8 sản phẩm đó cùng lịch sử hội thoại cho Gemini. Gemini trả về JSON gồm câu trả lời và tối đa 4 `product_id`. Backend loại bỏ mọi id không nằm trong danh sách đã gửi, để chatbot không gợi ý sản phẩm không có thật.
3. Mỗi lượt chat được lưu vào `chat_sessions` và `chat_messages`. Sản phẩm được gợi ý lưu vào `product_recommendations` (cột `score`, `reason`, `is_clicked`) để tính tỷ lệ click cho báo cáo.
