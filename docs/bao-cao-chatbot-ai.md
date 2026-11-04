# Chức năng Chatbot AI tư vấn mỹ phẩm

Website LUMI Beauty — Báo cáo quy trình nghiệp vụ và luồng xử lý

---

## 1. Mục tiêu nghiệp vụ

Khách mua mỹ phẩm thường không biết gọi tên thứ mình cần. Họ mô tả **vấn đề** ("da dầu hay bị mụn"), **nhu cầu** ("muốn da sáng hơn") và **ngân sách** ("dưới 300 nghìn") chứ không tìm theo tên sản phẩm.

Bộ lọc thông thường không giải quyết được: cửa hàng có 1.456 sản phẩm, khách phải tự biết chọn danh mục nào, thương hiệu nào.

Chatbot đóng vai nhân viên tư vấn: đọc mô tả bằng lời của khách, tra cứu kho hàng thật, rồi đề xuất 3–4 sản phẩm kèm lý do.

**Ba ràng buộc bắt buộc:**

| Ràng buộc | Lý do |
|---|---|
| Chỉ gợi ý sản phẩm **có thật** trong CSDL | AI bịa tên hoặc giá sẽ làm khách mất lòng tin và gây tranh chấp |
| Giá và tồn kho **lấy trực tiếp từ CSDL** tại thời điểm trả lời | Tư vấn sản phẩm đã hết hàng hoặc sai giá là lỗi nghiệp vụ nghiêm trọng |
| **Không chẩn đoán bệnh**, không cam kết điều trị | Vượt thẩm quyền của một cửa hàng mỹ phẩm, có thể gây hại cho khách |

---

## 2. Kiến trúc tổng thể

```
┌──────────────┐   tin nhắn    ┌──────────────┐   truy vấn    ┌──────────┐
│    React     │ ────────────▶ │    Flask     │ ────────────▶ │  MySQL   │
│  ChatWidget  │               │   /api/chat  │ ◀──────────── │ 1.456 SP │
└──────────────┘               └──────┬───────┘   5 sản phẩm  └──────────┘
       ▲                              │
       │  câu trả lời                 │ câu hỏi + 5 sản phẩm
       │  + thẻ sản phẩm              ▼
       │                       ┌──────────────┐
       └────────────────────── │  Gemini API  │
                               │   (Google)   │
                               └──────────────┘
```

**Điểm then chốt:** Gemini **không** được truy cập CSDL. Flask tra cứu trước, chỉ đưa cho Gemini **5 sản phẩm** đã lọc sẵn. Gemini chọn trong 5 cái đó và viết lời tư vấn.

Cách này giải quyết đồng thời ba vấn đề:

- **Không bịa dữ liệu** — AI chỉ có 5 lựa chọn, đều có thật
- **Tiết kiệm chi phí** — gửi 5 sản phẩm thay vì toàn bộ 1.456
- **Không phải huấn luyện lại** — thêm sản phẩm mới là dùng được ngay

---

## 3. Luồng xử lý một tin nhắn

```
 1. Khách gõ tin nhắn, bấm gửi
         │
 2. KIỂM TRA ĐẦU VÀO ──── rỗng? > 1000 ký tự? ──▶ báo lỗi, dừng
         │
 3. CHỐNG SPAM ───── > 20 tin/5 phút? cách < 2 giây? ──▶ 429, dừng
         │
 4. XÁC ĐỊNH PHIÊN ── phiên của chính người gửi, hoặc tạo phiên mới
         │
 5. ĐỌC LỊCH SỬ ──── 20 tin gần nhất của phiên
         │
 6. BÓC NGÂN SÁCH ── "dưới 300k" → (0 ; 300.000)
         │
 7. TRUY VẤN MySQL ─ lọc + xếp hạng → 5 sản phẩm phù hợp nhất
         │
 8. GỌI GEMINI ───── 6 lượt hội thoại gần nhất + 5 sản phẩm + câu hỏi
         │                    │
         │                    └─ lỗi/quá tải ─▶ câu trả lời dự phòng
         │
 9. LỌC KẾT QUẢ ──── bỏ product_id Gemini trả về mà không có trong 5 cái đã gửi
         │
10. ĐỌC LẠI CSDL ─── lấy giá và tồn kho HIỆN TẠI của sản phẩm được chọn
         │
11. GHI CSDL ─────── lưu tin nhắn + gợi ý vào 3 bảng
         │
12. TRẢ VỀ ───────── câu trả lời + thẻ sản phẩm (ảnh, tên, giá, nút xem)
```

### Giải thích các bước quan trọng

**Bước 6 — Bóc ngân sách.** Hệ thống tự nhận ra mức giá trong câu hỏi:

| Khách viết | Hệ thống hiểu |
|---|---|
| `dưới 300k` / `duoi 300k` | tối đa 300.000đ |
| `từ 200-500k` | 200.000đ – 500.000đ |
| `trên 1 triệu` | từ 1.000.000đ |
| `khoảng 500 nghìn` | 350.000đ – 650.000đ (lệch 30%) |
| `tầm 300` | 210.000đ – 390.000đ |

Nhận cả tiếng Việt **có dấu lẫn không dấu**, vì khách gõ nhanh thường bỏ dấu.

Ngân sách của **tin nhắn hiện tại** được ưu tiên. Nếu câu này không nêu giá thì mới giữ lại mức khách đã nói trước đó — để câu nối tiếp như *"còn loại nào khác"* vẫn tôn trọng ngân sách cũ.

**Bước 9 — Lọc kết quả.** Gemini đôi khi trả về mã sản phẩm không có trong danh sách được cung cấp. Những mã đó bị loại bỏ, nên sản phẩm bịa đặt không bao giờ hiện ra màn hình.

**Bước 10 — Đọc lại CSDL.** Giá và tồn kho hiển thị cho khách được đọc **lần thứ hai**, ngay trước khi trả về. Nếu giữa lúc đó admin vừa đổi giá hoặc ẩn sản phẩm, khách sẽ thấy số liệu mới nhất chứ không phải số liệu lúc dựng ngữ cảnh.

---

## 4. Cơ chế tìm sản phẩm

Đây là phần quyết định chất lượng tư vấn. Quy trình hai tầng:

### Tầng 1 — Lọc bằng SQL

```sql
SELECT ... FROM products
WHERE status <> 'hidden'               -- không tư vấn sản phẩm đã ẩn
  AND price BETWEEN :min AND :max      -- theo ngân sách khách nêu
  AND (tên SP LIKE từ khóa
    OR tên thương hiệu LIKE từ khóa
    OR thuộc danh mục có tên khớp từ khóa)
ORDER BY <độ liên quan> DESC, <còn hàng> DESC, <lượt đánh giá> DESC
LIMIT 120
```

Độ liên quan được tính **ngay trong SQL**: mỗi từ khóa khớp tên sản phẩm được 2 điểm, khớp tên thương hiệu được 1 điểm.

> **Vì sao phải xếp hạng trong SQL?** Âm tiết tiếng Việt rất phổ biến — từ "dưỡng" khớp hơn 800 sản phẩm. Nếu xếp theo độ phổ biến trước rồi mới cắt 120 dòng, sản phẩm mới thêm (0 lượt đánh giá) sẽ bị loại ngay dù khớp đủ mọi từ khóa.

### Tầng 2 — Chấm điểm và chọn 5

Trên 120 dòng đã lọc, hệ thống tính điểm chi tiết hơn:

- Tách câu hỏi thành từ khóa, **bỏ dấu** và loại 64 từ đệm (*tôi, mình, cho, với, cần…*)
- Đếm số từ trùng với tên sản phẩm + thương hiệu + danh mục
- Cụm hai từ liền nhau tính điểm gấp đôi — *"sữa rửa"* có ý nghĩa hơn *"sữa"* đứng riêng
- Câu hỏi từ 3 từ trở lên thì phải khớp **ít nhất 2 từ**, tránh trùng ngẫu nhiên
- Xếp giảm dần, lấy **5 sản phẩm** đầu

> **Vì sao không dùng FULLTEXT của MySQL?** Bộ tách từ mặc định bỏ qua token dưới 3 ký tự, mà tiếng Việt toàn âm tiết ngắn — *"da"*, *"mụn"*, *"dầu"* đều bị loại, gần như không khớp được gì.

> **Vì sao phải bỏ dấu?** Collation của MySQL không phân biệt dấu nên SQL tìm ra hàng, nhưng khâu chấm điểm bằng Python so chuỗi nguyên bản — `"duong"` không bao giờ bằng `"dưỡng"`. Không bỏ dấu thì **mọi câu hỏi gõ không dấu đều trả về rỗng**.

---

## 5. Dữ liệu động — không cần huấn luyện lại

Đây là yêu cầu nghiệp vụ quan trọng nhất: **sản phẩm admin vừa thêm hoặc vừa sửa phải được tư vấn ngay**.

Hệ thống đạt được điều này bằng cách **không lưu bản sao nào của danh mục sản phẩm**. Mỗi câu hỏi là một câu `SELECT` mới xuống MySQL.

| Admin thao tác | Chatbot phản ứng |
|---|---|
| Thêm sản phẩm mới | Tư vấn được **ngay lập tức** |
| Đổi giá | Đọc giá mới ở câu hỏi tiếp theo |
| Cho hết hàng | Báo đúng là hết hàng |
| Ẩn khỏi cửa hàng | Ngừng tư vấn sản phẩm đó |
| Xóa sản phẩm | Biến mất khỏi gợi ý |

Gemini **không hề được huấn luyện** trên dữ liệu sản phẩm. Nó chỉ đọc 5 sản phẩm được đưa trong từng lượt hỏi, nên dữ liệu luôn mới.

---

## 6. Nguyên tắc ứng xử của chatbot

Chatbot mang tên **Lumi**, được quy định bằng 8 nguyên tắc:

1. Trả lời tiếng Việt, thân thiện, tối đa khoảng 120 từ
2. **Chỉ** gợi ý sản phẩm trong danh sách được cung cấp, không bịa tên, giá hay công dụng
3. Chọn tối đa 4 sản phẩm, ưu tiên hàng còn trong kho, kèm lý do ngắn
4. Giá và tình trạng hàng phải nói đúng như danh sách, không làm tròn hay suy đoán
5. Thiếu thông tin thì **hỏi lại** khách một câu thay vì đoán bừa
6. Danh sách trống thì nói thẳng là chưa tìm được, hỏi thêm nhu cầu
7. Câu hỏi ngoài chủ đề làm đẹp thì từ chối lịch sự
8. **Không đưa lời khuyên y khoa** — vấn đề da nghiêm trọng thì khuyên gặp bác sĩ da liễu

### Ví dụ thực tế

**Tư vấn kèm sản phẩm:**

> *Khách:* "Mình da dầu hay bị mụn, tư vấn giúp mình sữa rửa mặt dưới 300k"
>
> *Lumi:* "Chào bạn, da dầu mụn thì bạn nên chọn sữa rửa mặt làm sạch sâu và giảm bã nhờn nhé."
> - 102.500đ — Gel Rửa Mặt Vichy Normaderm — *"Làm sạch sâu, giảm bã nhờn và mụn"*
> - 199.000đ — Sữa Rửa Mặt THE FACE SHOP — *"Làm sạch lỗ chân lông và ngừa mụn"*

**Trả lời kiến thức, không kèm sản phẩm:**

> *Khách:* "Da dầu với da hỗn hợp khác nhau thế nào?"
>
> *Lumi:* "Da dầu thường tiết nhiều dầu thừa khắp mặt, dễ nổi mụn và bóng nhờn. Trong khi đó, da hỗn hợp lại đổ dầu nhiều ở vùng chữ T (trán, mũi, cằm) nhưng lại khô hoặc bình thường ở vùng má…"

**Từ chối chẩn đoán bệnh:**

> *Khách:* "Mặt mình nổi mụn mủ sưng đỏ nhiều, mình bị bệnh gì vậy?"
>
> *Lumi:* "Lumi không thể chẩn đoán bệnh lý y khoa. Với tình trạng mụn mủ sưng đỏ nhiều, bạn nên gặp **bác sĩ da liễu** để được thăm khám kỹ nhé!"

---

## 7. Lưu trữ dữ liệu

Ba bảng ghi lại toàn bộ hoạt động:

| Bảng | Nội dung | Mục đích |
|---|---|---|
| `chat_sessions` | Phiên hội thoại, chủ sở hữu, thời gian | Gắn hội thoại với tài khoản |
| `chat_messages` | Từng tin nhắn, người gửi (khách/bot) | Ngữ cảnh cho lượt sau; phân tích |
| `product_recommendations` | Sản phẩm đã gợi ý, điểm phù hợp, lý do, **đã bấm hay chưa** | **Đo hiệu quả tư vấn** |

Cột `is_clicked` cho phép tính **tỷ lệ khách bấm vào sản phẩm được gợi ý** — số liệu định lượng để đánh giá chất lượng chatbot.

### Bảo mật hội thoại

Mỗi phiên chat thuộc về đúng một người:

- Khách **đã đăng nhập**: phiên gắn với `user_id`
- Khách **vãng lai**: phiên gắn với cookie đã ký của trình duyệt
- Khách vãng lai **đăng nhập giữa chừng**: phiên tự chuyển sang tài khoản, không mất cuộc hội thoại đang dở

Gửi `session_id` của người khác thì bị từ chối và cấp phiên mới. Nếu không có cơ chế này, chỉ cần đổi một con số trong yêu cầu là đọc được hội thoại riêng tư của người khác.

---

## 8. Xử lý sự cố

Chatbot gọi dịch vụ bên ngoài nên phải lường trước thất bại.

| Sự cố | Cách xử lý |
|---|---|
| Gemini quá tải (503) | Thử lại 1 lần sau 1,5 giây |
| Gemini không trả lời trong 30 giây | Cắt, chuyển câu trả lời dự phòng |
| Hết hạn mức miễn phí (429) | Câu trả lời dự phòng |
| Chưa cấu hình API key | Câu trả lời dự phòng |
| Mất kết nối MySQL | Trả thông báo "Hệ thống đang bận", **không sập web** |
| Tin nhắn rỗng / quá 1000 ký tự | Báo lỗi ngay, không gọi Gemini |
| Gửi quá nhanh / quá nhiều | Chặn kèm thông báo thân thiện |

### Câu trả lời dự phòng

Khi Gemini không dùng được, hệ thống **vẫn gợi ý sản phẩm thật từ MySQL**, chỉ thiếu phần tư vấn bằng lời.

Đây là lựa chọn có chủ ý: thà gợi ý thô còn hơn hiện màn hình lỗi. Khách vẫn mua hàng được, chỉ là trải nghiệm kém hơn.

---

## 9. Thông số kỹ thuật

| Thông số | Giá trị | Lý do |
|---|---|---|
| Mô hình AI | `gemini-3.5-flash-lite` | Hạn mức miễn phí rộng, phản hồi 2–4 giây |
| Sản phẩm gửi cho AI | 5 | Đủ để chọn, tiết kiệm chi phí |
| Sản phẩm gợi ý tối đa | 4 | Nhiều hơn gây rối cho khách |
| Ngữ cảnh hội thoại | 6 lượt gần nhất | Đủ hiểu mạch, giới hạn chi phí |
| Độ dài câu trả lời | ~120 từ (800 token) | Đọc nhanh trên khung chat nhỏ |
| Độ dài tin nhắn tối đa | 1.000 ký tự | Chặn gửi dữ liệu rác |
| Chống spam | 20 tin / 5 phút, cách nhau ≥ 2 giây | Tránh cạn hạn mức API |
| Timeout | 30 giây | Khách không chờ lâu hơn |

### Quy mô mã nguồn

| Thành phần | Số dòng |
|---|---|
| `chatbot.py` — ghép ngữ cảnh, gọi Gemini, dự phòng | 153 |
| `product_search.py` — tìm và xếp hạng sản phẩm | 218 |
| `chat.py` — API, phân quyền phiên, chống spam | 185 |
| `ChatWidget.jsx` — giao diện khung chat | 212 |
| `ChatContext.jsx` — mở chat từ nơi khác trên trang | 24 |
| **Tổng** | **792** |

---

## 10. Kết quả kiểm thử

| Nhóm kiểm thử | Số trường hợp |
|---|---|
| Dữ liệu động (thêm/sửa/xóa/ẩn/hết hàng sản phẩm) | 13 |
| Bảo mật hội thoại | 6 |
| Bóc ngân sách từ câu hỏi | 6 |
| Tin nhắn không hợp lệ | 6 |
| Chống spam | 3 |
| Xử lý khi Gemini lỗi | 6 |
| Kết nối Gemini thật | 16 |
| Luồng xuyên suốt qua HTTP | 24 |
| **Tổng** | **91 / 91 đạt** |

Kiểm thử xuyên suốt chạy đúng vòng đời nghiệp vụ: admin thêm sản phẩm → chatbot tư vấn ngay → admin đổi giá → chatbot đọc giá mới → khách thêm vào giỏ (hệ thống xác minh lại giá và tồn kho) → admin cho hết hàng → chatbot báo hết hàng → admin ẩn sản phẩm → chatbot ngừng tư vấn.

---

## 11. Hạn chế

**Tiếng Việt không dấu gây nhập nhằng.** Câu *"bán máy bay trực thăng"* có thể ra kết quả vì `"may"` khớp **Máy**, `"thang"` khớp **Thẳng**. Dữ liệu trả về vẫn là sản phẩm thật, và khi Gemini hoạt động thì nó từ chối câu lạc đề, nên ảnh hưởng thực tế nhỏ.

**Phụ thuộc hạn mức miễn phí.** Nhắn liên tục nhiều câu có thể cạn quota theo phút, khi đó chatbot chuyển sang chế độ dự phòng.

**Không nhớ qua phiên.** Đóng tab là mất cuộc hội thoại. Lịch sử có trong CSDL nhưng giao diện chưa có chức năng xem lại.

**Một chủ đề duy nhất.** Chatbot chỉ trả lời về làm đẹp và mỹ phẩm, đúng vai trò trợ lý bán hàng.

---

## 12. Hướng phát triển

- Gợi ý theo lịch sử mua hàng của chính khách đó
- Cho khách thêm thẳng vào giỏ từ thẻ sản phẩm trong khung chat
- Trang thống kê hiệu quả chatbot cho admin (dữ liệu đã có sẵn trong `product_recommendations`)
- Xem lại hội thoại cũ sau khi đăng nhập
