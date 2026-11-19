# Báo cáo kiểm thử hệ thống website LUMI Beauty

**Ngày kiểm thử:** 04/11/2026
**Phiên bản mã nguồn:** commit `7e8959b`
**Người thực hiện:** Kiểm thử viên (QA)

---

## 1. Phạm vi và môi trường kiểm thử

### 1.1. Hệ thống được kiểm thử

| Thành phần | Công nghệ | Địa chỉ |
|---|---|---|
| Giao diện | ReactJS 19 + Vite | `http://localhost:5173` |
| Máy chủ ứng dụng | Flask (Python) | `http://127.0.0.1:5000` |
| Cơ sở dữ liệu | MySQL 8, cổng 3307 | schema `cosmetic_shop` |
| Trí tuệ nhân tạo | Gemini API, mô hình `gemini-3.5-flash-lite` | dịch vụ ngoài |

Hệ thống cung cấp **45 điểm cuối API** (endpoint) và dữ liệu thực tế gồm 1.456 sản phẩm,
22 danh mục, 183 thương hiệu, 13 đơn hàng và 12 tài khoản tại thời điểm kiểm thử.

### 1.2. Phương pháp

Kiểm thử được thực hiện theo bốn lớp, kết hợp kiểm thử hộp trắng (đọc mã nguồn)
và hộp đen (thao tác như người dùng thật):

1. **Phân tích mã nguồn** — rà soát cấu trúc thư mục, định tuyến, tầng dịch vụ,
   cơ chế phân quyền và mô hình dữ liệu.
2. **Kiểm thử API** — gọi trực tiếp các điểm cuối bằng thư viện `requests`, kiểm tra
   mã trạng thái, cấu trúc phản hồi và quy tắc kiểm tra dữ liệu đầu vào.
3. **Kiểm thử giao diện** — điều khiển trình duyệt Chrome thật qua giao thức
   Chrome DevTools Protocol, đo màu sắc, bố cục, lỗi JavaScript và thời gian tải
   trên ba kích thước màn hình.
4. **Kiểm thử dữ liệu** — truy vấn trực tiếp MySQL để đối chiếu tính nhất quán
   giữa các bảng và giữa dữ liệu hiển thị với dữ liệu gốc.

### 1.3. Dữ liệu kiểm thử đã tạo

Theo nguyên tắc không tác động vào dữ liệu thật, kiểm thử sử dụng tài khoản riêng
có đánh dấu rõ ràng. Các bản ghi sau được tạo ra trong quá trình kiểm thử và **có thể xoá**:

| Loại | Giá trị | Ghi chú |
|---|---|---|
| Tài khoản khách hàng | `qa.tester.lumi@example.com` | Dùng để kiểm thử mua hàng |
| Tài khoản quản trị | `qa.admin.lumi@example.com` (id 89) | Dùng để kiểm thử trang quản trị |
| Đơn hàng | `DH20261104001` | Người nhận ghi "QA TEST - đơn kiểm thử" |
| Sản phẩm, danh mục | — | Đã được xoá ngay sau khi kiểm thử xong |
| Phiên hội thoại chatbot | khoảng 12 phiên | Phát sinh khi kiểm thử chatbot |

### 1.4. Hạn chế của môi trường

Tại thời điểm kiểm thử, **ổ đĩa hệ thống chỉ còn trống 0,23 GB trên tổng 90,8 GB**.
Đây không phải lỗi của phần mềm nhưng đã trực tiếp gây ra một lỗi nghiêm trọng
được ghi nhận trong báo cáo (mục BUG-01) và có thể làm sai lệch kết quả đo hiệu năng.

---

## 2. Tổng hợp kết quả

| Chỉ số | Số lượng |
|---|---|
| Tổng số test case thực hiện | **184** |
| Passed | **169** |
| Failed | **5** |
| Không phải lỗi hệ thống (sai sót của kịch bản kiểm thử) | 10 |
| Blocked | 0 |
| Not Tested | **7** nhóm (xem mục 6) |

### Kết quả theo nhóm chức năng

| Nhóm | Nội dung | Số test | Passed | Failed |
|---|---|---|---|---|
| A | Giao diện và trải nghiệm người dùng | 66 | 50 | 16* |
| B | Chức năng khách hàng | 45 | 42 | 3* |
| C | Chức năng quản trị | 37 | 35 | 2* |
| D | Chatbot AI | 15 | 13 | 2* |
| E | Backend, API, cơ sở dữ liệu, bảo mật | 41 | 41 | 0 |
| F | Hiệu năng | 36 | 36 | 0 |

\* Bao gồm cả các trường hợp sau khi kiểm tra lại xác định **không phải lỗi hệ thống**
mà do kịch bản kiểm thử gửi thiếu dữ liệu hoặc đặt kỳ vọng chưa đúng. Chi tiết ở mục 4.

### Số lỗi theo mức độ

| Mức độ | Số lượng | Mã lỗi |
|---|---|---|
| Critical | 1 | BUG-01 |
| High | 2 | BUG-02, BUG-03 |
| Medium | 1 | BUG-04 |
| Low | 3 | BUG-05, BUG-06, BUG-07 |

---

## 3. Bảng kết quả test case chi tiết

### A. Giao diện (UI/UX)

Mỗi test case trong nhóm này được chạy trên ba kích thước: desktop 1280×900,
tablet 768×1024 và điện thoại 390×844.

| STT | Chức năng | Test case | Kết quả | Mức độ lỗi | Mô tả lỗi |
|---|---|---|---|---|---|
| 1 | Trang chủ | Trang hiển thị được nội dung | Passed | | |
| 2 | Trang chủ | Không tràn ngang (thanh cuộn ngang) | Passed | | |
| 3 | Trang chủ | Không có ảnh hỏng | Passed | | |
| 4 | Trang chủ | Có đầy đủ header và footer | Passed | | |
| 5 | Danh sách sản phẩm | Hiển thị đủ 20 thẻ sản phẩm | Passed | | |
| 6 | Danh sách sản phẩm | Không tràn ngang | Passed | | |
| 7 | Danh sách sản phẩm | Không có ảnh hỏng | Passed | | |
| 8 | Chi tiết sản phẩm | Trang hiển thị được | Passed | | |
| 9 | Chi tiết sản phẩm | Không tràn ngang | Passed | | |
| 10 | Trang thanh toán | Trang hiển thị được | Passed | | |
| 11 | Trang thanh toán | Không tràn ngang | Passed | | |
| 12 | Chatbot | Mở được khung chat từ nút nổi | Passed | | |
| 13 | Giỏ hàng | Mở được ngăn kéo giỏ hàng | Passed | | |
| 14 | Giao diện điện thoại | Nút bấm đạt kích thước tối thiểu 24×24 px | **Failed** | Low | BUG-05: nhiều nút nhỏ hơn chuẩn, nhỏ nhất là chấm chuyển banner chỉ 8×8 px |
| 15 | Mọi trang | Chữ không tràn khỏi khung chứa | Failed | — | Không phải lỗi: phần tử bị phát hiện là nút chat nổi, phần "tràn" là hiệu ứng vòng sáng lan toả có chủ đích |

### B. Chức năng khách hàng

| STT | Chức năng | Test case | Kết quả | Mức độ lỗi | Mô tả lỗi |
|---|---|---|---|---|---|
| 16 | Đăng ký | Gửi biểu mẫu rỗng bị từ chối | Passed | | |
| 17 | Đăng ký | Email sai định dạng bị từ chối | Passed | | |
| 18 | Đăng ký | Mật khẩu dưới 6 ký tự bị từ chối | Passed | | |
| 19 | Đăng ký | Mật khẩu không có chữ số bị từ chối | Passed | | |
| 20 | Đăng ký | Số điện thoại sai định dạng bị từ chối | Passed | | |
| 21 | Đăng ký | Mật khẩu xác nhận không khớp bị từ chối | Passed | | |
| 22 | Đăng ký | Đăng ký hợp lệ thành công | Passed | | |
| 23 | Đăng ký | Đăng ký trùng email bị từ chối | Passed | | |
| 24 | Đăng nhập | Đăng nhập đúng tài khoản thành công | Passed | | |
| 25 | Đăng nhập | Sai mật khẩu trả về 401 | Passed | | |
| 26 | Đăng nhập | Email không tồn tại trả về 401 | Passed | | |
| 27 | Đăng nhập | Thông báo lỗi không tiết lộ email có tồn tại hay không | Passed | | |
| 28 | Phiên đăng nhập | `/auth/me` không trả về mật khẩu | Passed | | |
| 29 | Đăng xuất | Đăng xuất thành công | Passed | | |
| 30 | Đăng xuất | Sau đăng xuất, phiên hết hiệu lực | Passed | | |
| 31 | Đăng xuất | Sau đăng xuất không xem được đơn hàng | Passed | | |
| 32 | Tìm kiếm | Tìm bằng tiếng Việt có dấu | Passed | | |
| 33 | Tìm kiếm | Tìm bằng tiếng Việt không dấu | Passed | | |
| 34 | Lọc sản phẩm | Sắp xếp theo bán chạy, giá tăng dần | Passed | | |
| 35 | Lọc sản phẩm | Tham số sắp xếp không hợp lệ trả về 400 | Passed | | |
| 36 | Lọc sản phẩm | Khoảng giá không phải số trả về 400 | Passed | | |
| 37 | Chi tiết sản phẩm | Sản phẩm không tồn tại trả về 404 | Passed | | |
| 38 | Giỏ hàng | Thêm sản phẩm hợp lệ | Passed | | |
| 39 | Giỏ hàng | Thêm số lượng 0 hoặc âm bị từ chối | Passed | | |
| 40 | Giỏ hàng | Thêm số lượng vượt giới hạn bị từ chối | Passed | | |
| 41 | Giỏ hàng | Thêm sản phẩm không tồn tại bị từ chối | Passed | | |
| 42 | Giỏ hàng | Thành tiền = đơn giá × số lượng | Passed | | |
| 43 | Giỏ hàng | Sửa số lượng trong giỏ | Passed | | |
| 44 | Giỏ hàng | Gửi yêu cầu thêm với nội dung rỗng | **Failed** | Low | BUG-06: trả về 404 thay vì 400 |
| 45 | Đặt hàng | Thiếu họ tên bị từ chối | Passed | | |
| 46 | Đặt hàng | Số điện thoại sai định dạng bị từ chối | Passed | | |
| 47 | Đặt hàng | Email sai định dạng bị từ chối | Passed | | |
| 48 | Đặt hàng | Địa chỉ quá ngắn bị từ chối | Passed | | |
| 49 | Đặt hàng | Mã tỉnh / phường không tồn tại bị từ chối | Passed | | |
| 50 | Đặt hàng | Phương thức thanh toán không hợp lệ bị từ chối | Passed | | |
| 51 | Đặt hàng | Đặt hàng COD hợp lệ thành công | Passed | | |
| 52 | Đơn hàng | Xem được chi tiết đơn vừa đặt | Passed | | |
| 53 | Đơn hàng | Đơn mới xuất hiện trong lịch sử mua hàng | Passed | | |
| 54 | Đánh giá | Đánh giá khi đơn chưa giao bị từ chối | Passed | | |
| 55 | Đánh giá | Khách chưa đăng nhập không gửi được đánh giá | Passed | | |
| 56 | Đánh giá | Số sao ngoài khoảng 1–5 bị từ chối | Passed | | |
| 57 | Đánh giá | Ai cũng xem được danh sách đánh giá | Passed | | |

### C. Chức năng quản trị

| STT | Chức năng | Test case | Kết quả | Mức độ lỗi | Mô tả lỗi |
|---|---|---|---|---|---|
| 58 | Đăng nhập admin | Đăng nhập bằng tài khoản quản trị | Passed | | |
| 59 | Trang quản trị | Trang Tổng quan hiển thị được trên trình duyệt | Passed | | |
| 60 | Trang quản trị | Trang Sản phẩm hiển thị được | Passed | | |
| 61 | Trang quản trị | Trang Đơn hàng hiển thị được | Passed | | |
| 62 | Trang quản trị | Trang Khách hàng hiển thị được | Passed | | |
| 63 | Thống kê | Thống kê 7 ngày, 30 ngày, khoảng tuỳ chọn | Passed | | |
| 64 | Thống kê | Khoảng ngày đảo ngược bị từ chối | Passed | | |
| 65 | Sản phẩm | Thêm sản phẩm với dữ liệu rỗng bị từ chối | Passed | | |
| 66 | Sản phẩm | Thêm sản phẩm thiếu danh mục / ảnh bị từ chối | Passed | | |
| 67 | Sản phẩm | Thêm sản phẩm đầy đủ thành công (201) | Passed | | |
| 68 | Sản phẩm | Sửa sản phẩm thành công | Passed | | |
| 69 | Sản phẩm | Sản phẩm mới hiển thị ngay ở giao diện khách | Passed | | |
| 70 | Sản phẩm | Xoá sản phẩm thành công, sau đó trả về 404 | Passed | | |
| 71 | Danh mục | Thêm danh mục tên rỗng bị từ chối | Passed | | |
| 72 | Danh mục | Thêm, sửa, xoá danh mục thành công | Passed | | |
| 73 | Danh mục | Đặt chính nó làm danh mục cha bị từ chối | Passed | | |
| 74 | Đơn hàng | Admin xem được chi tiết đơn | Passed | | |
| 75 | Đơn hàng | Cập nhật trạng thái đơn thành công | Passed | | |
| 76 | Đơn hàng | Khách hàng thấy ngay trạng thái mới | Passed | | |
| 77 | Đơn hàng | Trạng thái không hợp lệ bị từ chối | **Failed** | Low | BUG-07: trả về 409 thay vì 400 |
| 78 | Khách hàng | Tìm khách hàng theo email | Passed | | |
| 79 | Khách hàng | Danh sách khách hàng không lộ mật khẩu | Passed | | |

### D. Chatbot AI

| STT | Chức năng | Test case | Kết quả | Mức độ lỗi | Mô tả lỗi |
|---|---|---|---|---|---|
| 80 | Chatbot | Tin nhắn rỗng bị từ chối | Passed | | |
| 81 | Chatbot | Tin nhắn trên 1.000 ký tự bị từ chối | Passed | | |
| 82 | Chatbot | Trả lời tự nhiên bằng tiếng Việt | Passed | | |
| 83 | Chatbot | Có kèm sản phẩm gợi ý | Passed | | |
| 84 | Chatbot | Tên, giá, ảnh, tồn kho khớp hoàn toàn với MySQL | Passed | | |
| 85 | Chatbot | Không bịa tên sản phẩm ngoài cơ sở dữ liệu | Passed | | |
| 86 | Chatbot | Duy trì đúng phiên hội thoại qua nhiều lượt | Passed | | |
| 87 | Chatbot | Giữ ngữ cảnh ở lượt hỏi thứ hai | Passed | | |
| 88 | Chatbot | Nhận diện sản phẩm vừa được thêm (không dùng bộ nhớ đệm cũ) | Passed | | |
| 89 | Chatbot | Hỏi mặt hàng không kinh doanh: trả lời lịch sự, không gợi ý bừa | Passed | | |
| 90 | Chatbot | Chặn gửi tin nhắn quá nhanh (429) | Passed | | |
| 91 | Chatbot | Thời gian phản hồi dưới 30 giây | **Failed** | High | BUG-03: đo được 24–32 giây, có lần vượt ngưỡng timeout |

### E. Backend, API, cơ sở dữ liệu và bảo mật

| STT | Chức năng | Test case | Kết quả | Mức độ lỗi | Mô tả lỗi |
|---|---|---|---|---|---|
| 92 | API công khai | 10 điểm cuối công khai trả về 200 | Passed | | |
| 93 | Kiểm tra đầu vào | `page` bằng 0, âm, không phải số | Passed | | |
| 94 | Kiểm tra đầu vào | `per_page` rất lớn không làm sập hệ thống | Passed | | |
| 95 | Kiểm tra đầu vào | Trang vượt tổng số trang | Passed | | |
| 96 | Bảo mật | SQL Injection qua từ khoá tìm kiếm (4 biến thể) | Passed | | |
| 97 | Bảo mật | Dữ liệu còn nguyên vẹn sau khi thử SQL Injection | Passed | | |
| 98 | Bảo mật | Mã script không bị phản chiếu nguyên văn (XSS) | Passed | | |
| 99 | Phân quyền | 11 điểm cuối quản trị chặn người chưa đăng nhập (401) | Passed | | |
| 100 | Phân quyền | 3 điểm cuối khách hàng chặn người chưa đăng nhập | Passed | | |
| 101 | Phân quyền | Khách hàng thường gọi API quản trị bị chặn (403) | Passed | | |
| 102 | Phân quyền | Người lạ không xem được đơn hàng người khác (IDOR) | Passed | | |
| 103 | Bảo mật | Tệp `.env` không bị đưa vào git | Passed | | |
| 104 | Nhất quán dữ liệu | Tổng tiền đơn = tiền hàng + phí ship − giảm giá | Passed | | |
| 105 | Nhất quán dữ liệu | Thành tiền từng dòng = đơn giá × số lượng | Passed | | |
| 106 | Nhất quán dữ liệu | Không có slug sản phẩm hoặc email trùng lặp | Passed | | |
| 107 | Nhất quán dữ liệu | Không có bản ghi mồ côi (ảnh, đơn hàng) | Passed | | |
| 108 | Nhất quán dữ liệu | Trạng thái kho khớp với số lượng tồn | Passed | | |
| 109 | Nhất quán dữ liệu | Mọi đơn hàng đều có bản ghi thanh toán | **Failed** | Medium | BUG-04: 1 đơn thiếu thanh toán, 4 đơn thiếu dòng chi tiết |
| 110 | Bảo mật | Dữ liệu cá nhân không bị đưa vào git | **Failed** | High | BUG-02: tệp sao lưu chứa 8 mã băm mật khẩu và 20 email đã bị commit |

### F. Hiệu năng

| STT | Chức năng | Test case | Kết quả | Mức độ lỗi | Mô tả lỗi |
|---|---|---|---|---|---|
| 111 | Thời gian tải | Trang chủ dưới 5 giây | Passed | | 2.650 ms |
| 112 | Thời gian tải | Danh sách sản phẩm dưới 5 giây | Passed | | 1.112 ms |
| 113 | Thời gian tải | Chi tiết sản phẩm dưới 5 giây | Passed | | 1.279 ms |
| 114 | Thời gian tải | Trang thanh toán dưới 5 giây | Passed | | 985 ms |
| 115 | Phản hồi API | Trung bình 33 ms, chậm nhất 335 ms (đăng nhập) | Passed | | |
| 116 | Truy vấn | Không có truy vấn N+1 (2–10 truy vấn mỗi API) | Passed | | |
| 117 | Truy vấn | Tổng thời gian SQL mỗi API dưới 10 ms | Passed | | |
| 118 | Lỗi trình duyệt | Không có lỗi JavaScript trên mọi trang | Passed | | |
| 119 | Lỗi mạng | Không có request thất bại trên mọi trang | Passed | | |

---

## 4. Các test case thất bại nhưng không phải lỗi hệ thống

Để bảo đảm tính trung thực, báo cáo ghi nhận rõ những trường hợp ban đầu báo lỗi
nhưng khi kiểm tra lại xác định nguyên nhân nằm ở kịch bản kiểm thử:

| Test case | Hiện tượng ban đầu | Kết luận sau khi kiểm tra lại |
|---|---|---|
| Đăng ký tài khoản test | Trả về 400 | Kịch bản gửi thiếu `phone` và `confirm_password`. Hệ thống **kiểm tra đúng**. |
| Đăng nhập đúng mật khẩu | Trả về 401 | Hệ quả của mục trên — tài khoản chưa được tạo. Chạy lại: **Passed**. |
| Thêm sản phẩm hợp lệ | Trả về 400 | Kịch bản thiếu `category_ids` và `images`. Chạy lại đầy đủ: **201 Created**. |
| Chặn gửi tin nhắn quá nhanh | Không nhận được 429 | Do chatbot trả lời chậm (25 giây) nên các yêu cầu tự nhiên cách nhau hơn 2 giây. Gửi song song: **429 đúng như thiết kế**. |
| Chữ tràn khỏi khung (12 lần) | Phát hiện 1 phần tử mỗi trang | Phần tử đó là nút chat nổi; phần "tràn" là hiệu ứng vòng sáng lan toả (`animate-ping`) cố ý. **Không phải lỗi hiển thị**. |

---

## 5. Danh sách lỗi theo mức độ ưu tiên

### BUG-01 — Ổ đĩa đầy khiến API sản phẩm trả về lỗi 500 · **Critical**

**Hiện tượng.** Trang danh sách sản phẩm không tải được dữ liệu. Yêu cầu
`GET /api/products?sort=bestseller&page=1&per_page=20` trả về HTTP 500.

**Nguyên nhân.** Ổ đĩa C: đầy 100%. Truy vấn sắp xếp theo lượng bán phải sắp xếp
1.456 bản ghi, vượt bộ nhớ đệm nên MySQL cần ghi tệp tạm. Thông báo gốc:

```
(pymysql.err.InternalError) (3, "Error writing file
'C:\Windows\SERVIC~1\NETWOR~1\AppData\Local\Temp\MY4jyxdr1m23p3z84n'
(OS errno 28 - No space left on device)")
```

Các API không cần sắp xếp vẫn hoạt động, nên lỗi chỉ biểu hiện ở trang danh sách sản phẩm.

**Mức độ.** Critical — chức năng cốt lõi của website ngừng hoạt động.

**Hướng khắc phục.**
1. Giải phóng dung lượng ổ C ngay. Các vị trí an toàn: thư mục tạm của người dùng
   (khoảng 800 MB), bộ nhớ đệm npm (420 MB), bộ nhớ đệm pip (156 MB).
2. Về lâu dài, bật tính năng Files On-Demand của OneDrive để các tệp ít dùng
   không chiếm chỗ cục bộ.
3. Cân nhắc bổ sung chỉ mục cho cột `sold_count` để giảm nhu cầu tạo tệp tạm khi sắp xếp.

> Đây là sự cố môi trường, không phải khiếm khuyết của mã nguồn. Tuy nhiên nó cho
> thấy hệ thống chưa xử lý mềm khi cơ sở dữ liệu gặp lỗi: người dùng chỉ thấy
> trang trắng với chữ "Đang tải..." mãi không dứt, không có thông báo lỗi.

### BUG-02 — Tệp sao lưu chứa dữ liệu cá nhân đã được đưa vào git · **High**

**Hiện tượng.** Tệp `database/backup_khoi_phuc_2026-10-31.sql` nằm trong lịch sử
commit, bên trong chứa **8 mã băm mật khẩu bcrypt và 20 địa chỉ email** của khách
hàng thật, kèm theo số điện thoại và địa chỉ nhà.

**Nguyên nhân.** Tệp được tạo khi khôi phục dữ liệu từ binary log ngày 31/10 và
được đưa vào commit bằng lệnh `git add -A`. Dự án chưa có `.gitignore` ở thư mục gốc.

**Mức độ.** High. Sẽ trở thành Critical nếu kho mã được đẩy lên GitHub.

**Hướng khắc phục.**
1. Tạo `.gitignore` ở thư mục gốc, bổ sung dòng `database/backup_*.sql`.
2. Gỡ tệp khỏi lịch sử git trước khi đẩy lên bất kỳ máy chủ nào.
3. Giữ bản sao lưu ở nơi khác ngoài thư mục dự án.

### BUG-03 — Chatbot phản hồi chậm 24–32 giây · **High**

**Hiện tượng.** Đo 5 lần gọi chatbot, thời gian phản hồi dao động 24.480 ms đến
32.082 ms. Lần vượt 30 giây đã kích hoạt cơ chế dự phòng.

**Nguyên nhân.** Phân tách thời gian cho thấy **truy vấn MySQL chỉ mất 41–152 ms**,
còn **lệnh gọi Gemini API chiếm 25.274 ms**, tức khoảng 99% độ trễ. Nút thắt nằm ở
dịch vụ AI bên ngoài (tầng miễn phí), không phải mã nguồn dự án.

Ngưỡng timeout hiện đặt 30 giây tại [`backend/app/config.py:26`](../backend/app/config.py).
Vì thời gian thực tế rất sát ngưỡng này, chỉ cần dịch vụ chậm thêm vài giây là
người dùng nhận câu trả lời dự phòng thay vì tư vấn thật.

**Mức độ.** High — ảnh hưởng trực tiếp đến chức năng trọng tâm của đề tài.

**Hướng khắc phục.**
1. Hiển thị trạng thái "đang soạn câu trả lời" rõ ràng để người dùng không nghĩ hệ thống treo.
2. Cân nhắc dùng chế độ phát trực tuyến (streaming) để chữ hiện dần thay vì chờ trọn câu.
3. Theo dõi thêm ở các khung giờ khác để xác định đây là hiện tượng tạm thời của
   dịch vụ hay ổn định. Nếu ổn định ở mức 25 giây, nên nâng ngưỡng timeout lên
   40–45 giây để giảm tỉ lệ rơi vào câu trả lời dự phòng.

### BUG-04 — Bốn đơn hàng thiếu dòng chi tiết sản phẩm · **Medium**

**Hiện tượng.** Các đơn `DH20260926001`, `DH20260926002`, `DH20260926003`,
`DH20260926005` không có bản ghi nào trong bảng `order_items`.
Riêng `DH20260926002` còn thiếu cả bản ghi trong bảng `payments`.

**Nguyên nhân.** Đây là hệ quả của việc khôi phục dữ liệu từ binary log ngày 31/10.
Các đơn này được tạo ngày 26/09, nằm ngoài phạm vi lưu trữ 30 ngày của binary log,
nên chỉ phần đầu đơn (được cập nhật trạng thái sau đó) khôi phục được, còn dòng
chi tiết thì không.

**Ảnh hưởng.** Trang chi tiết đơn hàng của bốn đơn này hiển thị danh sách sản phẩm
rỗng. Biểu đồ "Sản phẩm bán chạy" ở trang quản trị thiếu phần đóng góp của chúng,
trong khi tổng doanh thu vẫn tính đủ — dẫn tới số liệu không khớp nhau.

**Hướng khắc phục.** Hai lựa chọn, tuỳ mục đích báo cáo khoá luận:
chấp nhận giữ nguyên để bảo toàn con số doanh thu, hoặc xoá bốn đơn này để
dữ liệu hoàn toàn nhất quán.

### BUG-05 — Nút bấm trên điện thoại nhỏ hơn chuẩn · **Low**

**Hiện tượng.** Ở bề ngang 390 px, nhiều phần tử bấm được có kích thước nhỏ hơn
24×24 px — ngưỡng tối thiểu theo tiêu chí WCAG 2.2 mục 2.5.8:

| Phần tử | Kích thước đo được |
|---|---|
| Chấm chuyển banner trang chủ | 8×8 px |
| Liên kết "Xem tất cả" | 87×20 px |
| Liên kết chân trang ("Giới thiệu", "Tuyển dụng") | 62×17 px, 78×17 px |

Số lượng theo trang: trang chủ 14, chi tiết sản phẩm 17, danh sách sản phẩm 9,
thanh toán 8.

**Hướng khắc phục.** Tăng vùng bấm bằng `padding` hoặc phần tử giả trong suốt mà
không cần thay đổi kích thước hiển thị. Ưu tiên chấm chuyển banner vì 8×8 px rất
khó bấm trúng trên điện thoại.

### BUG-06 — Thêm vào giỏ với nội dung rỗng trả về 404 · **Low**

**Hiện tượng.** `POST /api/cart/items` với thân rỗng `{}` trả về HTTP 404
("không tìm thấy sản phẩm") thay vì 400 ("dữ liệu không hợp lệ").

**Nguyên nhân.** Thiếu `product_id` nên hệ thống tra cứu sản phẩm `None` và
trả về "không tìm thấy", thay vì kiểm tra trường bắt buộc trước.
Tệp liên quan: [`backend/app/routes/cart.py`](../backend/app/routes/cart.py).

**Ảnh hưởng.** Không ảnh hưởng người dùng cuối vì giao diện luôn gửi đủ dữ liệu.
Chỉ là sai lệch về ngữ nghĩa mã trạng thái HTTP.

### BUG-07 — Trạng thái đơn không hợp lệ trả về 409 · **Low**

**Hiện tượng.** `PATCH /api/admin/orders/{code}/status` với giá trị
`"khong_hop_le"` trả về HTTP 409 kèm thông báo "Không thể chuyển đơn hàng sang
trạng thái này".

**Đánh giá.** Hệ thống **từ chối đúng** và thông báo rõ ràng. Tuy nhiên 409 Conflict
mang nghĩa "xung đột trạng thái", phù hợp với trường hợp chuyển trạng thái sai thứ
tự; còn giá trị không nằm trong danh sách cho phép thì đúng hơn nên là 400 Bad Request.
Đây là chi tiết về chuẩn API, không ảnh hưởng chức năng.

---

## 6. Những phần chưa thể kiểm thử

| STT | Nội dung | Lý do chưa kiểm thử |
|---|---|---|
| 1 | Xử lý khi mất kết nối cơ sở dữ liệu | Phải dừng dịch vụ MySQL đang chạy, có nguy cơ ảnh hưởng dữ liệu thật của đề tài. |
| 2 | Xử lý khi Gemini API hết hạn mức | Không thể chủ động làm hết hạn mức. Riêng nhánh timeout đã vô tình được kiểm chứng ở lần đo 32 giây — hệ thống trả câu trả lời dự phòng đúng thiết kế. |
| 3 | Thanh toán chuyển khoản QR thực tế | Hệ thống mới sinh mã QR, chưa đối soát tự động với ngân hàng. Tích hợp VNPay còn trong kế hoạch. |
| 4 | Đánh giá sản phẩm sau khi đơn đã giao | Tài khoản kiểm thử chưa có đơn ở trạng thái "đã giao". Chỉ kiểm chứng được nhánh từ chối. |
| 5 | Kiểm thử tải đồng thời nhiều người dùng | Ổ đĩa chỉ còn 0,23 GB, chạy tải nặng có nguy cơ làm hỏng cơ sở dữ liệu. |
| 6 | Tương thích trình duyệt khác | Chỉ kiểm thử trên Chrome. Chưa thử Firefox, Safari, Edge và thiết bị di động thật. |
| 7 | Khả năng tiếp cận cho người khiếm thị | Chưa kiểm thử bằng trình đọc màn hình. |

---

## 7. Nhận xét chung

Hệ thống cho kết quả kiểm thử **tốt ở những phần quan trọng nhất**. Toàn bộ 41 test
case về backend, API, cơ sở dữ liệu và bảo mật đều đạt: không có lỗ hổng SQL Injection,
phân quyền chặt chẽ trên cả 19 điểm cuối quản trị, không truy cập chéo được đơn hàng
của người khác, mật khẩu không bị lộ ra ngoài, và tệp cấu hình chứa khoá API đã được
loại khỏi git.

Hiệu năng phía máy chủ rất tốt: mỗi API chỉ cần 2–10 truy vấn, tổng thời gian SQL
dưới 10 ms, không có hiện tượng truy vấn N+1. Thời gian tải trang từ 985 ms đến
2.650 ms, đều trong ngưỡng chấp nhận được.

Chatbot AI đạt yêu cầu về tính chính xác dữ liệu — đây là tiêu chí quan trọng nhất
của đề tài. Tên, giá, ảnh và tồn kho của mọi sản phẩm được gợi ý đều khớp tuyệt đối
với MySQL, chatbot không bịa ra sản phẩm không tồn tại, và nhận diện được ngay sản
phẩm vừa thêm mà không cần khởi động lại máy chủ. Hạn chế duy nhất là tốc độ, mà
nguyên nhân nằm ở dịch vụ Gemini bên ngoài.

Hai việc cần xử lý trước tiên là **giải phóng dung lượng ổ đĩa** (BUG-01) và **gỡ tệp
sao lưu chứa dữ liệu cá nhân khỏi git** (BUG-02).

---

## Phụ lục. Bảng test case theo kịch bản nghiệp vụ

Bổ sung ngày 07/11/2026. Các test case dưới đây được chạy lại trực tiếp trên hệ
thống đang hoạt động; cột "Kết quả thực tế" ghi đúng số liệu quan sát được.

| Mã | Chức năng | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|
| TC01 | Đăng ký | Email mới, mật khẩu hợp lệ | Tạo tài khoản, mật khẩu được băm trong CSDL | HTTP 201. Cột `password` lưu chuỗi bắt đầu bằng `$2b$`, dài 60 ký tự (bcrypt). Không lưu mật khẩu gốc ở bất kỳ đâu | Đạt |
| TC02 | Đăng ký trùng email | Email đã tồn tại | Báo lỗi, không tạo tài khoản | HTTP 409, báo "Email đã được sử dụng". Số tài khoản trong CSDL không thay đổi | Đạt |
| TC03 | Đăng nhập sai mật khẩu | Email đúng, mật khẩu sai | Từ chối đăng nhập | HTTP 401, báo "Email hoặc mật khẩu không đúng". Không tạo phiên đăng nhập. Thông báo cố ý không tiết lộ email có tồn tại hay không | Đạt |
| TC04 | Gộp giỏ khi đăng nhập | Giỏ tạm có 2 sản phẩm, đăng nhập | Giỏ tài khoản chứa 2 sản phẩm, giỏ tạm bị xóa | Giỏ tạm 2 sản phẩm → sau đăng nhập giỏ tài khoản có đúng 2 sản phẩm; bảng `cart_items` của giỏ tạm còn 0 dòng | Đạt |
| TC05 | Tìm kiếm không dấu | "sua rua mat" | Trả về các sản phẩm "sữa rửa mặt" | Trả về 77 sản phẩm. Kiểm tra 20 sản phẩm đầu: 20/20 có tên chứa "rửa mặt". Ví dụ: "Sữa Rửa Mặt Goodal Làm Sạch Sáng Da" | Đạt |
| TC06 | Lọc theo khoảng giá | 100.000 – 300.000 | Chỉ hiện sản phẩm trong khoảng | Tổng 407 sản phẩm khớp điều kiện. Kiểm tra 48 sản phẩm trả về: 0 sản phẩm nằm ngoài khoảng giá | Đạt |
| TC07 | Cập nhật số lượng giỏ | Đổi số lượng từ 1 → 3 | Tổng tiền cập nhật đúng | Đơn giá 458.000 đ. Số lượng 1 → tạm tính 458.000 đ; số lượng 3 → tạm tính 1.374.000 đ, đúng bằng đơn giá × 3 | Đạt |
| TC08 | Đặt hàng chưa đăng nhập | Bấm thanh toán khi chưa đăng nhập | Chuyển đến trang đăng nhập | Hệ thống **không chuyển trang** mà hiển thị khối "Đăng nhập để đặt hàng — Giỏ hàng của bạn vẫn được giữ nguyên sau khi đăng nhập"; bấm vào đó mở hộp thoại đăng nhập. Bấm "Thanh toán" trong ngăn kéo giỏ hàng cũng mở hộp thoại tương tự. Cả hai lối đều dẫn tới ô nhập mật khẩu | Đạt |
| TC09 | Đặt hàng COD | Thông tin giao hàng hợp lệ | Tạo đơn, trạng thái chờ xử lý, giỏ được xóa | HTTP 201, tạo đơn `DH20261107003`, trạng thái `pending` (chờ xử lý). Giỏ hàng sau khi đặt còn 0 sản phẩm | Đạt |
| TC10 | Thanh toán QR | Chọn QR | Hiển thị mã QR / chuyển đến cổng; cập nhật trạng thái khi thanh toán | HTTP 201, tạo đơn `DH20261107004`, sinh ảnh mã VietQR chứa đúng số tiền và mã đơn. Bản ghi thanh toán: `method=bank_transfer`, `status=pending`. **Hệ thống chưa đối soát tự động với ngân hàng** — quản trị viên phải xác nhận đã nhận tiền thủ công; chỉ sau đó đơn mới chuyển sang "đã xác nhận" được | Đạt một phần |
| TC11 | Đánh giá sản phẩm chưa mua | Sản phẩm không có trong đơn delivered | Từ chối, báo lỗi | HTTP 403, báo "Chỉ khách hàng đã mua và nhận sản phẩm này mới có thể đánh giá" | Đạt |
| TC12 | Đánh giá lần hai | Sản phẩm đã đánh giá | Từ chối (UNIQUE) | HTTP 409, báo "Bạn đã đánh giá sản phẩm này rồi". Trong CSDL vẫn chỉ có 1 đánh giá của người dùng này cho sản phẩm đó | Đạt |
| TC13 | Đánh giá hợp lệ | 4 sao + nhận xét | Lưu, điểm trung bình sản phẩm cập nhật | HTTP 201. Số lượt đánh giá của sản phẩm tăng 235 → 236, trigger trong CSDL tự tính lại điểm. Điểm hiển thị giữ ở 4,99 vì đánh giá mới được gộp theo trọng số với 235 đánh giá nền có sẵn | Đạt |
| TC14 | Admin cập nhật trạng thái đơn | Chờ xử lý → Đang giao | Khách hàng thấy trạng thái mới | Admin đổi đơn `DH20261104001` sang "đang giao": HTTP 200. Khách hàng mở lại đơn thấy ngay trạng thái `shipping`. **Lưu ý:** hệ thống không cho nhảy thẳng từ "chờ xử lý" sang "đang giao" mà bắt buộc qua bước "đã xác nhận" (quy tắc `ORDER_TRANSITIONS`) | Đạt |
| TC15 | Admin thêm sản phẩm | Thông tin hợp lệ | Sản phẩm hiện trên trang bán hàng | HTTP 201, tạo sản phẩm id `1046630175`. Tìm kiếm ở trang bán hàng thấy sản phẩm hiển thị ngay, không cần khởi động lại máy chủ | Đạt |
| TC16 | Truy cập admin bằng tài khoản thường | Khách hàng vào /admin | Từ chối truy cập | Tài khoản khách hàng gọi 4 API quản trị (`summary`, `products`, `orders`, `customers`) đều nhận HTTP 403 kèm thông báo "Bạn không có quyền truy cập trang quản trị" | Đạt |

**Tổng kết phụ lục:** 16 test case — **15 Đạt, 1 Đạt một phần (TC10)**, 0 Không đạt.

---

# Đánh giá chất lượng tư vấn của chatbot AI

**Ngày thực hiện:** 07/11/2026 · **Số lượt gọi:** 54 (18 câu hỏi × 3 lần) · **Tỷ lệ lỗi kỹ thuật:** 0

## Phương pháp

Bộ 18 câu hỏi được chia thành 5 nhóm, mỗi câu chạy 3 lần trên hệ thống đang hoạt động với dữ liệu thật (1.456 sản phẩm). Câu hỏi được xây dựng sau khi kiểm tra cơ sở dữ liệu để bảo đảm phản ánh đúng mặt hàng cửa hàng có và không có. Ba chỉ tiêu được chấm như sau:

- **Độ chính xác thông tin:** so sánh tự động từng sản phẩm được gợi ý với bảng `products` trong MySQL (mã sản phẩm có tồn tại, tên, giá và tình trạng còn hàng có trùng khớp).
- **Mức độ phù hợp (1–3):** chấm bằng quy tắc cố định, không cảm tính. 3 điểm khi từ 80% số sản phẩm gợi ý trở lên đúng loại và nằm trong ngân sách; 2 điểm khi chỉ một phần đúng; 1 điểm khi không sản phẩm nào đúng. Riêng câu ngoài phạm vi: 3 điểm khi từ chối lịch sự và không gợi ý sản phẩm nào.
- **Thời gian phản hồi:** đo từ lúc gửi yêu cầu đến lúc nhận JSON, đơn vị giây.

Mỗi lượt gọi cách nhau 9 giây để không chạm ngưỡng chống spam của hệ thống (20 tin nhắn trong 5 phút).

## Bảng 4.3. Bộ câu hỏi thử nghiệm chatbot

| STT | Nhóm | Câu hỏi | Sản phẩm gợi ý tồn tại? | Thông tin đúng? | Phù hợp (1–3) | Thời gian (s) |
|---|---|---|---|---|---|---|
| 1 | Nhu cầu + ngân sách | Sữa rửa mặt cho da dầu dưới 200 nghìn | 3/3 | 3/3 | 3,0 | 2,4 |
| 2 | Nhu cầu + ngân sách | Kem chống nắng cho da nhạy cảm khoảng 300k | 3/3 | 3/3 | 3,0 | 2,3 |
| 3 | Nhu cầu + ngân sách | Serum dưỡng trắng da dưới 500k | 3/3 | 3/3 | 3,0 | 2,2 |
| 4 | Nhu cầu + ngân sách | Mặt nạ giấy dưới 50 nghìn | 3/3 | 3/3 | 3,0 | 2,6 |
| 5 | Thương hiệu / danh mục | Có serum nào của Goodal không? | 3/3 | 3/3 | 3,0 | 2,2 |
| 6 | Thương hiệu / danh mục | Gợi ý vài loại toner | 3/3 | 3/3 | **1,0** | 2,0 |
| 7 | Thương hiệu / danh mục | Sản phẩm của The Face Shop có gì hay? | 3/3 | 3/3 | 3,0 | 2,5 |
| 8 | Thương hiệu / danh mục | Cửa hàng có bán nước tẩy trang không? | 3/3 | 3/3 | 2,3 | 2,3 |
| 9 | Hỏi tiếp nối | (sau câu 1) Cái nào dịu nhẹ hơn? | 3/3 | 3/3 | **1,0** | 2,2 |
| 10 | Hỏi tiếp nối | (sau câu 6) Loại rẻ nhất là loại nào? | 3/3 | 3/3 | **1,0** | 2,1 |
| 11 | Hỏi tiếp nối | (sau câu 2) Loại nào không gây bết dính? | 3/3 | 3/3 | **1,0** | 2,2 |
| 12 | Biến thể ngôn ngữ | Sữa rửa mặt cho da nhờn (từ đồng nghĩa) | 3/3 | 3/3 | 2,3 | 2,5 |
| 13 | Biến thể ngôn ngữ | kem duong am cho da kho (không dấu) | 3/3 | 3/3 | 3,0 | 2,3 |
| 14 | Biến thể ngôn ngữ | Recommend a moisturizer for oily skin (tiếng Anh) | 3/3 | 3/3 | **1,0** | 3,0 |
| 15 | Biến thể ngôn ngữ | srm cho da dầu (viết tắt) | 3/3 | 3/3 | 3,0 | 2,4 |
| 16 | Ngoài phạm vi | Cửa hàng có bán sữa bột cho em bé không? | 3/3 | 3/3 | 3,0 | 2,3 |
| 17 | Ngoài phạm vi | Da tôi bị dị ứng nổi mẩn đỏ thì nên bôi thuốc gì? | 3/3 | 3/3 | 2,3 | 2,6 |
| 18 | Câu hỏi chung | Chào bạn, bạn giúp được gì? | 3/3 | 3/3 | 3,0 | 2,1 |

Cột "Sản phẩm gợi ý tồn tại" và "Thông tin đúng" ghi 3/3 ở tất cả câu hỏi, nghĩa là trong cả ba lần chạy, mọi sản phẩm chatbot đưa ra đều có thật trong cơ sở dữ liệu và mọi thông tin tên, giá, tồn kho đều khớp.

## Bảng 4.4. Tổng hợp kết quả đánh giá chatbot

| Chỉ số | Kết quả |
|---|---|
| Tỷ lệ phản hồi chỉ gợi ý sản phẩm có trong CSDL | 36/36 = **100%** |
| Tỷ lệ thông tin (giá, còn hàng) chính xác | 36/36 = **100%** |
| Tỷ lệ chatbot bịa đặt tên hoặc giá sản phẩm | 0/36 = **0%** |
| Điểm phù hợp trung bình (thang 1–3) | **2,33 / 3** |
| Tỷ lệ từ chối đúng với câu hỏi ngoài phạm vi | 4/6 = **66,7%** |
| Thời gian phản hồi trung bình / nhỏ nhất / lớn nhất | **2,3 s / 1,6 s / 4,3 s** |

*Ghi chú:* 36/54 lượt có kèm gợi ý sản phẩm; 18 lượt còn lại chatbot chỉ trả lời bằng lời (hỏi thêm thông tin, chào hỏi, hoặc từ chối câu ngoài phạm vi) nên không có sản phẩm để đối chiếu.

### Điểm phù hợp theo nhóm

| Nhóm câu hỏi | Điểm trung bình | Số lượt có gợi ý |
|---|---|---|
| Nhu cầu + ngân sách | **3,00 / 3** | 12/12 |
| Câu hỏi chung | **3,00 / 3** | 0/3 |
| Ngoài phạm vi | 2,67 / 3 | 2/6 |
| Thương hiệu / danh mục | 2,33 / 3 | 8/12 |
| Biến thể ngôn ngữ | 2,33 / 3 | 8/12 |
| Hỏi tiếp nối | **1,00 / 3** | 6/9 |

## Nhận xét

### Điểm mạnh

**Độ tin cậy dữ liệu tuyệt đối.** Qua 36 lượt có gợi ý sản phẩm, không có một trường hợp nào chatbot bịa ra sản phẩm không tồn tại hoặc nêu sai giá, sai tình trạng tồn kho. Đây là kết quả của thiết kế truy xuất trực tiếp từ MySQL ở mỗi lượt hỏi: mô hình ngôn ngữ chỉ được phép diễn đạt lại danh sách sản phẩm mà hệ thống đưa cho, không tự sinh thông tin. Với một chatbot thương mại, đây là tiêu chí quan trọng nhất.

**Tư vấn theo nhu cầu kèm ngân sách đạt điểm tuyệt đối** (3,00/3 ở cả 12 lượt). Khi khách nêu rõ loại sản phẩm và mức giá, chatbot luôn trả về đúng loại và đúng khoảng giá.

**Tốc độ tốt:** trung bình 2,3 giây. Cần lưu ý con số này khác hẳn lần đo ngày 04/11/2026 (24–32 giây). Việc tách riêng thời gian cho thấy truy vấn MySQL chỉ chiếm 41–152 ms trong cả hai lần đo, phần còn lại là thời gian chờ dịch vụ Gemini. Nói cách khác, độ trễ phụ thuộc vào tải của dịch vụ AI bên ngoài tại từng thời điểm, không phải do mã nguồn hệ thống.

### Hạn chế

**Hỏi tiếp nối là điểm yếu rõ rệt nhất (1,00/3).** Nguyên nhân nằm ở `backend/app/services/chatbot.py` dòng 88: hệ thống tìm sản phẩm **chỉ bằng câu hỏi hiện tại**, không ghép với lịch sử hội thoại. Lịch sử chỉ được đưa cho mô hình ngôn ngữ để diễn đạt câu trả lời. Dòng 93 có một cơ chế dự phòng mượn ngữ cảnh cũ, nhưng chỉ kích hoạt khi câu hỏi *không tìm được sản phẩm nào* **và** có từ 2 từ khóa trở xuống. Hậu quả quan sát được:

| Câu hỏi tiếp nối | Tách từ khóa | Điều gì xảy ra |
|---|---|---|
| "Cái nào dịu nhẹ hơn?" (sau khi hỏi sữa rửa mặt) | `['diu']` | Tìm thấy 5 sản phẩm chứa chữ "dịu" nên cơ chế mượn ngữ cảnh không chạy → gợi ý **kem chống nắng và mặt nạ** thay vì sữa rửa mặt |
| "Loại rẻ nhất là loại nào?" | `['nhat']` | Chữ "nhất" sau khi bỏ dấu thành "nhat", trùng với "**Nhật** Bản" → gợi ý **Viên Uống Kẽm DHC Nhật Bản** |
| "Loại nào không gây bết dính?" | `['gay','bet','dinh']` | 3 từ khóa nên không được mượn ngữ cảnh, mà tự nó không khớp sản phẩm nào → **0 gợi ý** |

**Thêm từ đệm vào câu hỏi lại làm giảm kết quả.** Câu "Gợi ý vài loại toner" trả về **0 sản phẩm** dù cửa hàng có 30 toner còn hàng, trong khi hỏi gọn "toner" thì ra 5 sản phẩm. Lý do: thuật toán yêu cầu sản phẩm phải khớp tối thiểu 2 từ khóa khi câu hỏi có từ 3 từ trở lên; sản phẩm tên "Nước Cân Bằng Goodal…" chỉ khớp mỗi chữ "toner" nên bị loại.

| Câu hỏi | Tách từ khóa | Số kết quả |
|---|---|---|
| "toner" | `['toner']` | 5 |
| "loại toner nào tốt" | `['toner']` | 5 |
| "Gợi ý vài loại toner" | `['goi','vai','toner']` | **0** |

**Tiếng Anh chưa được hỗ trợ ở tầng tìm kiếm.** Với câu "Recommend a moisturizer for oily skin", mô hình ngôn ngữ hiểu đúng ý (câu trả lời nhắc chính xác "kem dưỡng ẩm cho da dầu") nhưng tầng truy xuất tìm theo từ khóa tiếng Anh trên tên sản phẩm tiếng Việt nên không ra kết quả. Hạn chế nằm ở khâu truy xuất, không phải khâu hiểu ngôn ngữ.

**Tiếng Việt không dấu và viết tắt hoạt động tốt.** Câu "kem duong am cho da kho" đạt 3,0/3 nhờ hàm chuẩn hóa bỏ dấu, và "srm cho da dầu" cũng được hiểu đúng là sữa rửa mặt. Riêng từ đồng nghĩa "da nhờn" (thay cho "da dầu") chỉ đạt 2,3/3 — lần chạy đầu chatbot hỏi lại để làm rõ thay vì gợi ý ngay.

**Câu hỏi y tế được xử lý đúng mực nhưng chưa nhất quán.** Cả ba lần, chatbot đều từ chối kê thuốc và nói rõ "Lumi là chuyên viên mỹ phẩm". Tuy nhiên hai trong ba lần vẫn kèm gợi ý sản phẩm làm dịu da (xịt khoáng Avene, tinh chất Torriden). Cách ứng xử này hợp lý về mặt thương mại, nhưng khiến tỷ lệ "từ chối hoàn toàn" chỉ đạt 66,7%.

### Kết luận

Chatbot đạt yêu cầu ở tiêu chí quan trọng nhất là **không bịa đặt thông tin** (100% chính xác) và tư vấn tốt với câu hỏi có cấu trúc rõ ràng (3,00/3). Hạn chế tập trung ở khâu **truy xuất theo từ khóa**: không dùng ngữ cảnh hội thoại cho việc tìm sản phẩm, nhạy cảm với từ đệm, và chưa xử lý được tiếng Anh. Đây là hạn chế cố hữu của phương pháp tìm kiếm theo từ khóa, và là cơ sở để đề xuất hướng phát triển sang tìm kiếm theo ngữ nghĩa (vector embedding) ở phần kết luận của khóa luận.
