# LUMI Beauty — Website bán mỹ phẩm tích hợp chatbot AI tư vấn sản phẩm

Khoá luận tốt nghiệp. Hệ thống thương mại điện tử bán mỹ phẩm gồm hai phần: trang bán hàng cho
khách và trang quản trị cho chủ cửa hàng, kèm một trợ lý ảo dùng Google Gemini để tư vấn sản phẩm
theo loại da và ngân sách của khách.

---

## 1. Giới thiệu sản phẩm

### Dành cho khách hàng

| Chức năng | Mô tả |
|---|---|
| Xem và tìm kiếm sản phẩm | 1.456 sản phẩm, 183 thương hiệu, 22 danh mục. Lọc theo danh mục, thương hiệu, khoảng giá, còn hàng; sắp xếp theo giá, bán chạy, đánh giá |
| Chatbot tư vấn AI | Trả lời bằng tiếng Việt, gợi ý tối đa 4 sản phẩm có thật trong kho, nhớ ngữ cảnh qua các lượt hỏi |
| Giỏ hàng | Thêm, sửa số lượng, chọn từng dòng để thanh toán |
| Đặt hàng | Điền địa chỉ theo đơn vị hành chính 2 cấp (Tỉnh/Phường), thanh toán khi nhận hàng |
| Theo dõi đơn hàng | Xem danh sách đơn và chi tiết từng đơn |
| Đánh giá sản phẩm | Chỉ người đã mua và nhận hàng mới được đánh giá, mỗi sản phẩm một lần |
| Quản lý tài khoản | Xem hồ sơ, sửa thông tin và địa chỉ mặc định, đổi mật khẩu |

**Khách chưa đăng nhập** chỉ được xem và tìm kiếm sản phẩm. Bấm "Thêm vào giỏ" hoặc mở chatbot sẽ
hiện cửa sổ đăng nhập; đăng nhập xong hệ thống tự làm tiếp việc đang dở.

### Dành cho quản trị viên

| Chức năng | Mô tả |
|---|---|
| Bảng điều khiển | Doanh thu, số đơn, biểu đồ doanh thu theo thời gian, phân bố trạng thái đơn, sản phẩm bán chạy |
| Quản lý đơn hàng | Lọc, tìm kiếm, xem chi tiết, bấm **Hoàn tất đơn hàng** |
| Quản lý sản phẩm | Thêm, sửa, xoá, kiểm tra ảnh hưởng trước khi xoá |
| Quản lý danh mục | Thêm, sửa, xoá danh mục nhiều cấp |
| Quản lý khách hàng | Danh sách, chi tiết, lịch sử mua, khoá/mở tài khoản |

### Quy trình đơn hàng

```
  Khách bấm "Đặt hàng"            Admin bấm "Hoàn tất đơn hàng"
           │                                │
           ▼                                ▼
     ĐÃ ĐẶT HÀNG  ─────────────────────▶  HOÀN TẤT
```

Hai trạng thái, một thao tác. Cửa hàng tự giao hàng và thu tiền khi giao (COD), không nối với đơn vị
vận chuyển hay cổng thanh toán nào, nên không có các bước trung gian như "đang giao" hay "chờ đối
soát". Bấm *Hoàn tất* nghĩa là đã giao tới khách và đã thu đủ tiền — hệ thống tự đánh dấu khoản
thanh toán là đã trả.

**Doanh thu chỉ tính đơn đã Hoàn tất**, tức là tiền thực thu, không cộng đơn chưa giao.

---

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Python 3.14, Flask 3.1, SQLAlchemy 2.1, PyMySQL |
| Cơ sở dữ liệu | MySQL 8 trở lên, bảng mã `utf8mb4` |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Recharts |
| Chatbot | Google Gemini qua thư viện `google-genai` |
| Xác thực | Phiên đăng nhập bằng cookie đã ký, mật khẩu băm bằng bcrypt |

---

## 3. Cấu trúc dự án

```
Cosmetic_shop_v2/
├── backend/                    Máy chủ Flask
│   ├── app.py                  Điểm khởi chạy
│   ├── requirements.txt        Thư viện Python
│   ├── .env                    Cấu hình bí mật (KHÔNG đưa lên git)
│   └── app/
│       ├── __init__.py         Tạo ứng dụng, đăng ký blueprint
│       ├── config.py           Đọc biến môi trường
│       ├── extensions.py       Khởi tạo SQLAlchemy
│       ├── models.py           17 bảng dữ liệu
│       ├── routes/             Tầng giao tiếp HTTP
│       │   ├── auth.py         Đăng ký, đăng nhập, hồ sơ, đổi mật khẩu
│       │   ├── catalog.py      Danh mục, thương hiệu, danh sách sản phẩm
│       │   ├── products.py     Chi tiết sản phẩm, đánh giá
│       │   ├── cart.py         Giỏ hàng
│       │   ├── orders.py       Đặt hàng, xem đơn, địa chỉ hành chính
│       │   ├── chat.py         Chatbot
│       │   └── admin.py        Toàn bộ API quản trị
│       └── services/           Tầng nghiệp vụ
│           ├── auth.py         Băm mật khẩu, kiểm tra dữ liệu, phân quyền
│           ├── cart.py         Quy tắc giỏ hàng
│           ├── orders.py       Tính tiền, sinh mã đơn, dựng dữ liệu đơn
│           ├── admin_orders.py Quy tắc chuyển trạng thái đơn
│           ├── admin_stats.py  Tính toán thống kê
│           ├── product_search.py  Tìm sản phẩm cho chatbot
│           ├── chat_context.py    Nhớ tiêu chí tư vấn qua các lượt
│           └── chatbot.py         Gọi Gemini, dựng câu trả lời
│
├── frontend/                   Giao diện React
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js          Cấu hình proxy /api sang cổng 5000
│   ├── public/images/          Logo, banner
│   └── src/
│       ├── main.jsx            Điểm khởi chạy
│       ├── App.jsx             Khai báo toàn bộ đường dẫn trang
│       ├── index.css           MÀU SẮC và PHÔNG CHỮ toàn site
│       ├── lib/                Gọi API, định dạng, màu biểu đồ
│       ├── hooks/              useFetch
│       ├── pages/              Từng trang hoàn chỉnh
│       │   └── admin/          Các trang quản trị
│       └── components/
│           ├── layout/         Khung chung: đầu trang, menu, chân trang
│           ├── home/           Các khối của trang chủ
│           ├── product/        Thẻ sản phẩm, bộ lọc, đánh giá
│           ├── cart/           Giỏ hàng
│           ├── order/          Nhãn trạng thái, bảng giá
│           ├── chat/           Khung chat Lumi
│           ├── auth/           Cửa sổ đăng nhập/đăng ký
│           ├── admin/          Thành phần riêng của trang quản trị
│           └── ui/             Nút, ô nhập, hộp thoại dùng lại nhiều nơi
│
├── database/                   Lược đồ và dữ liệu
│   ├── 01_schema.sql           Tạo toàn bộ bảng (chạy đầu tiên)
│   ├── 02_data.sql             1.456 sản phẩm, 183 thương hiệu
│   ├── 05_address_data.sql     34 tỉnh/thành, 3.321 phường/xã
│   └── 03_* … 10_*             Các bước nâng cấp lược đồ về sau
│
├── docs/                       Báo cáo
├── scraper/                    Mã thu thập dữ liệu sản phẩm (chạy một lần, tháng 9/2026)
└── chay_web.bat                Khởi chạy cả hai máy chủ bằng một cú đúp chuột
```

**Nguyên tắc phân tầng:** `routes/` chỉ nhận và trả HTTP, `services/` chứa quy tắc nghiệp vụ,
`models.py` mô tả dữ liệu. Quy tắc nghiệp vụ luôn đặt ở máy chủ, giao diện không tự suy diễn —
ví dụ nút "Hoàn tất đơn hàng" chỉ hiện khi máy chủ trả về trạng thái kế tiếp hợp lệ.

---

## 4. Cài đặt

### Yêu cầu

- **Python** 3.11 trở lên (dự án phát triển trên 3.14)
- **Node.js** 18 trở lên (dự án phát triển trên 24)
- **MySQL** 8 trở lên
- Khoá API Google Gemini — lấy miễn phí tại <https://aistudio.google.com/apikey>

### Bước 1 — Tạo cơ sở dữ liệu

```bash
mysql -u root -p -e "CREATE DATABASE cosmetic_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

cd database
mysql -u root -p cosmetic_shop < 01_schema.sql        # tạo bảng
mysql -u root -p cosmetic_shop < 02_data.sql          # sản phẩm, thương hiệu, danh mục
mysql -u root -p cosmetic_shop < 05_address_data.sql  # tỉnh/thành, phường/xã
```

`01_schema.sql` đã bao gồm toàn bộ thay đổi của các file `03_*` đến `09_*`, nên **cài mới chỉ cần ba
file trên**. Các file còn lại là lịch sử nâng cấp, dùng khi đã có sẵn cơ sở dữ liệu cũ.

### Bước 2 — Cấu hình backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

Tạo file `backend/.env`:

```ini
# Chuỗi kết nối CSDL — sửa mật khẩu và cổng cho khớp máy bạn
DATABASE_URL=mysql+pymysql://root:matkhau@localhost:3306/cosmetic_shop?charset=utf8mb4

# Chuỗi bí mật dùng ký cookie phiên đăng nhập. Sinh bằng:
#   python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=thay_bang_chuoi_ngau_nhien_cua_ban

# Chatbot. Thiếu khoá này web vẫn chạy, chatbot chuyển sang câu trả lời dự phòng
GEMINI_API_KEY=khoa_api_cua_ban
GEMINI_MODEL=gemini-3.5-flash-lite

# Phí vận chuyển (đồng)
SHIPPING_FEE=30000
FREE_SHIPPING_THRESHOLD=499000
```

> **Lưu ý:** `.env` chứa khoá bí mật nên đã được `.gitignore` loại trừ. Không đưa file này lên git
> và không nộp kèm bài.

### Bước 3 — Cấu hình frontend

```bash
cd frontend
npm install
```

---

## 5. Chạy dự án

### Cách nhanh nhất (Windows)

Đúp chuột vào **`chay_web.bat`** ở thư mục gốc. File này mở cả hai máy chủ, chờ đến khi giao diện
thực sự phản hồi rồi mới tự mở trình duyệt.

### Chạy thủ công

Mở hai cửa sổ dòng lệnh:

```bash
# Cửa sổ 1 — Backend, cổng 5000
cd backend
.venv\Scripts\python.exe app.py

# Cửa sổ 2 — Frontend, cổng 5173
cd frontend
npm run dev
```

Mở trình duyệt tại **<http://localhost:5173>**

Vite đã cấu hình chuyển tiếp mọi đường dẫn `/api` sang cổng 5000, nên trình duyệt chỉ cần gọi một
địa chỉ duy nhất, không vướng lỗi CORS.

### Tài khoản quản trị

Tài khoản admin nằm sẵn trong `02_data.sql`. Đăng nhập rồi vào **<http://localhost:5173/admin>**.
Người dùng thường truy cập địa chỉ này sẽ bị chặn.

---

## 6. Triển khai lên máy chủ thật

Dự án hiện chạy ở môi trường phát triển. Để đưa lên máy chủ thật cần làm thêm:

**Backend** — thay máy chủ phát triển của Flask bằng WSGI thật:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

**Frontend** — biên dịch thành tệp tĩnh rồi cho Nginx phục vụ:

```bash
cd frontend
npm run build          # kết quả nằm trong thư mục dist/
```

**Biến môi trường cần đổi khi lên máy chủ thật:**

| Biến | Giá trị |
|---|---|
| `SECRET_KEY` | Chuỗi ngẫu nhiên mới, khác hẳn lúc phát triển |
| `SESSION_COOKIE_SECURE` | `1` — bắt buộc khi đã có HTTPS |
| `CORS_ORIGINS` | Tên miền thật, không để `localhost` |
| `DATABASE_URL` | Tài khoản MySQL riêng, **không dùng `root`** |

**Nginx** — phục vụ tệp tĩnh và chuyển tiếp `/api` về backend:

```nginx
server {
    listen 80;
    server_name ten-mien-cua-ban.com;

    root /duong/dan/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;     # cần cho React Router
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 7. Danh sách API

Mọi đường dẫn đều có tiền tố `/api`. Trả về JSON. Phân quyền: **(T)** cần đăng nhập,
**(A)** chỉ quản trị viên, còn lại ai cũng gọi được.

### Tài khoản

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký, luôn tạo vai trò khách hàng |
| POST | `/auth/login` | Đăng nhập |
| POST | `/auth/logout` | Đăng xuất |
| GET | `/auth/me` | Thông tin người đang đăng nhập, kèm địa chỉ mặc định |
| PATCH | `/auth/me` | **(T)** Sửa họ tên, điện thoại, địa chỉ. Email và vai trò không sửa được |
| POST | `/auth/change-password` | **(T)** Đổi mật khẩu, bắt nhập mật khẩu hiện tại |

### Sản phẩm

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/categories` | Danh mục kèm số sản phẩm |
| GET | `/brands` | Thương hiệu, lọc theo danh mục nếu có |
| GET | `/brands/featured?limit=12` | Thương hiệu nổi bật có logo |
| GET | `/products` | Danh sách, hỗ trợ `q`, `category`, `brand`, `min_price`, `max_price`, `in_stock`, `sort`, `page` |
| GET | `/products/<slug_hoặc_id>` | Chi tiết kèm sản phẩm liên quan |
| GET | `/products/<id>/reviews` | Danh sách đánh giá |
| POST | `/products/<id>/reviews` | **(T)** Viết đánh giá, chỉ khi đã mua và nhận hàng |

### Giỏ hàng và đơn hàng

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/cart` | Giỏ hàng; khách chưa đăng nhập nhận giỏ rỗng |
| POST | `/cart/items` | **(T)** Thêm sản phẩm |
| PATCH | `/cart/items/<id>` | **(T)** Sửa số lượng hoặc chọn/bỏ chọn |
| PATCH | `/cart/select-all` | **(T)** Chọn tất cả |
| DELETE | `/cart/items/<id>` | **(T)** Xoá khỏi giỏ |
| POST | `/cart/checkout` | **(T)** Bắt đầu thanh toán |
| GET | `/checkout/summary` | **(T)** Tóm tắt tiền hàng, phí ship |
| POST | `/orders` | **(T)** Đặt hàng |
| GET | `/orders` | **(T)** Đơn hàng của tôi |
| GET | `/orders/<mã_đơn>` | **(T)** Chi tiết đơn, chỉ chủ đơn hoặc admin xem được |
| GET | `/address/provinces` | Danh sách tỉnh/thành |
| GET | `/address/provinces/<mã>/wards` | Phường/xã của một tỉnh |

### Chatbot

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/chat` | **(T)** Gửi câu hỏi, nhận câu trả lời và sản phẩm gợi ý |
| POST | `/chat/recommendations/<id>/click` | **(T)** Ghi nhận khách bấm vào gợi ý |

### Quản trị

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/summary` | **(A)** Số liệu tổng quan |
| GET | `/admin/stats` | **(A)** Thống kê theo khoảng thời gian |
| GET | `/admin/orders` | **(A)** Danh sách đơn, lọc và tìm kiếm |
| GET | `/admin/orders/<mã>` | **(A)** Chi tiết đơn |
| PATCH | `/admin/orders/<mã>/status` | **(A)** Hoàn tất đơn hàng |
| GET,POST | `/admin/products` | **(A)** Danh sách / thêm sản phẩm |
| GET,PUT,DELETE | `/admin/products/<id>` | **(A)** Xem / sửa / xoá sản phẩm |
| GET | `/admin/products/form-options` | **(A)** Dữ liệu cho biểu mẫu |
| GET,POST | `/admin/categories` | **(A)** Danh sách / thêm danh mục |
| PUT,DELETE | `/admin/categories/<id>` | **(A)** Sửa / xoá danh mục |
| GET | `/admin/customers` | **(A)** Danh sách khách hàng |
| GET | `/admin/customers/<id>` | **(A)** Chi tiết và lịch sử mua |
| PATCH | `/admin/customers/<id>/status` | **(A)** Khoá / mở tài khoản |

---

## 8. Chatbot hoạt động thế nào

Chatbot không hỏi thẳng Gemini "sản phẩm nào tốt" — làm vậy nó sẽ bịa ra sản phẩm cửa hàng không
bán. Quy trình thực tế gồm ba bước:

**Bước 1 — Hiểu khách đang hỏi gì.** `chat_context.py` gom tiêu chí tích luỹ qua các lượt: *loại sản
phẩm*, *loại da*, *ngân sách*. Tiêu chí nào câu mới không nhắc tới thì giữ nguyên của câu trước, nhờ
vậy khách hỏi "kem chống nắng" rồi nhắn "cho da khô" thì hệ thống vẫn tìm **kem chống nắng cho da
khô**, chứ không phải mọi thứ hợp da khô.

**Bước 2 — Tìm sản phẩm có thật.** `product_search.py` truy vấn thẳng MySQL mỗi lần hỏi (không dùng
bộ nhớ đệm, để giá và tồn kho luôn đúng), chấm điểm độ khớp theo tên, thương hiệu, danh mục rồi lấy
5 sản phẩm liên quan nhất.

**Bước 3 — Để Gemini diễn đạt.** `chatbot.py` gửi kèm danh sách 5 sản phẩm đó và ràng buộc Gemini
chỉ được chọn trong danh sách. Sản phẩm nào Gemini trả về mà không có trong danh sách đều bị loại bỏ
trước khi hiển thị.

Nhờ vậy chatbot **không bao giờ gợi ý sản phẩm không có thật**, và giá cùng tình trạng còn hàng luôn
khớp cơ sở dữ liệu.

Nếu thiếu `GEMINI_API_KEY` hoặc Gemini quá tải, hệ thống dùng câu trả lời dự phòng kèm đúng 5 sản
phẩm tìm được — web không bao giờ đứng vì chatbot.

---

## 9. Giới hạn hiện tại

Những điểm dưới đây là giới hạn đã biết, không phải lỗi:

- **Chưa tích hợp cổng thanh toán.** Chỉ có thanh toán khi nhận hàng (COD).
- **Chưa nối đơn vị vận chuyển.** Không có mã vận đơn hay theo dõi hành trình giao hàng.
- **Chưa gửi email hay SMS.** Khách đặt hàng xong không nhận được thư xác nhận.
- **Không huỷ được đơn.** Đơn đã đặt chỉ có thể chuyển sang Hoàn tất.
- **Không sửa hoặc xoá được đánh giá**, kể cả quản trị viên.
- **Mỗi khách chỉ lưu một địa chỉ mặc định.**
- **Tìm kiếm dùng so khớp chuỗi**, gõ sai chính tả sẽ không ra kết quả.
- **Gói JavaScript khoảng 850 KB** vì chưa chia nhỏ theo trang.

Hướng phát triển chi tiết được trình bày trong báo cáo khoá luận.

---

## 10. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| `Can't connect to MySQL server` | MySQL chưa chạy, hoặc cổng trong `DATABASE_URL` sai. Mặc định MySQL dùng cổng 3306 |
| `Access denied for user` | Sai tài khoản hoặc mật khẩu trong `DATABASE_URL` |
| `Unknown database 'cosmetic_shop'` | Chưa tạo CSDL — xem lại Bước 1 |
| Trang trắng, cổng 5173 không phản hồi | Vite cần khoảng 10 giây để nén thư viện ở lần chạy đầu |
| Gọi API báo lỗi 500 | Chưa nạp `02_data.sql` hoặc `05_address_data.sql` |
| Chatbot luôn trả lời dự phòng | Thiếu hoặc sai `GEMINI_API_KEY` trong `backend/.env` |
| Sửa giao diện mà không thấy đổi | Nhấn `Ctrl + F5` để trình duyệt nạp lại mã mới |
| Vào `/admin` bị chặn | Tài khoản đang đăng nhập không phải quản trị viên |
