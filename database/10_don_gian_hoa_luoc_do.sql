-- =====================================================================
--  Dọn các bảng, cột và view không còn chức năng nào dùng tới
--
--  Sau khi bỏ tích hợp vận chuyển và cổng thanh toán, một số phần của
--  lược đồ trở thành chỗ trống không bao giờ được ghi vào. Giữ lại chỉ
--  làm người đọc tưởng hệ thống có chức năng mà thực tế không có.
--
--  Chạy MỘT LẦN trên CSDL đã có sẵn:
--      mysql -u root -p cosmetic_shop < 10_don_gian_hoa_luoc_do.sql
--
--  (01_schema.sql đã được cập nhật nên cài mới từ đầu không cần file này.)
--
--  GHI CHÚ VỀ NHỮNG THỨ CỐ Ý GIỮ LẠI:
--    - products.price_min / price_max / variant_count / seed_rating /
--      seed_review_count: không chức năng nào đọc, NHƯNG 02_data.sql chèn
--      dữ liệu theo đúng danh sách cột này cho 1.457 sản phẩm. Bỏ cột là
--      phải sửa cả file dữ liệu 4 MB — rủi ro lớn hơn lợi ích.
--    - orders.discount_amount: luôn bằng 0 vì cửa hàng chưa chạy khuyến
--      mãi, nhưng nằm trong công thức total = subtotal + ship - discount.
--    - reviews.status: vẫn đang được dùng để lọc đánh giá đã duyệt.
-- =====================================================================

USE `cosmetic_shop`;

-- ---------------------------------------------------------------------
-- BƯỚC 1: Bỏ hai view không nơi nào truy vấn
--
-- Chúng được tạo từ đầu dự án để tiện xem dữ liệu bằng tay, nhưng code
-- luôn truy vấn thẳng bảng gốc qua SQLAlchemy.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS `v_orders`;
DROP VIEW IF EXISTS `v_products`;

-- ---------------------------------------------------------------------
-- BƯỚC 2: Bỏ bảng `shipments`
--
-- Cửa hàng tự giao hàng, không nối với đơn vị vận chuyển nào, nên
-- tracking_code / deliver_date / method chưa bao giờ được ghi. Phần còn
-- lại là cột status, mà nó chỉ sao chép y hệt trạng thái đơn hàng:
--     đơn 'pending'   -> vận đơn 'pending'
--     đơn 'completed' -> vận đơn 'delivered'
-- Không mang thêm thông tin nào nên bỏ cả bảng.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `shipments`;

-- ---------------------------------------------------------------------
-- BƯỚC 3: Bỏ các cột chết
-- ---------------------------------------------------------------------

-- Mã giao dịch do cổng thanh toán trả về. Hệ thống chỉ thu tiền khi giao
-- hàng (COD) nên không có cổng nào sinh ra mã này.
ALTER TABLE `payments` DROP COLUMN `transaction_code`;

-- Thời điểm kết thúc phiên chat. Phiên chat không có khái niệm "kết thúc":
-- khách đóng khung chat lúc nào cũng được, không ai gọi API báo kết thúc.
ALTER TABLE `chat_sessions` DROP COLUMN `ended_at`;

-- ---------------------------------------------------------------------
-- KIỂM TRA
-- ---------------------------------------------------------------------
SELECT COUNT(*) AS `Bang shipments con lai (phai = 0)`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shipments';

SELECT COUNT(*) AS `View con lai (phai = 0)`
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE();

SELECT COUNT(*) AS `Cot chet con lai (phai = 0)`
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'payments' AND COLUMN_NAME = 'transaction_code')
    OR (TABLE_NAME = 'chat_sessions' AND COLUMN_NAME = 'ended_at'));

SELECT COUNT(*) AS `So bang con lai`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE';
