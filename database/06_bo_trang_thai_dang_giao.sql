-- =====================================================================
--  Bỏ trạng thái 'shipping' (Đang giao) khỏi bảng `orders`
--
--  LÝ DO: cửa hàng tự giao, không nối với đơn vị vận chuyển bên thứ ba
--  nên không có ai cập nhật mốc "đã lấy hàng / đang trên đường". Bước
--  "Đang giao" vì thế chỉ là một nút admin phải tự bấm mà không mang
--  thêm thông tin gì cho khách.
--
--  Luồng đơn hàng sau thay đổi còn 3 bước:
--      Chờ xác nhận -> Đã xác nhận -> Đã giao
--  (cộng thêm Đã huỷ ở bất kỳ bước nào trước khi giao).
--
--  Đơn đang ở 'shipping' được đưa về 'confirmed' vì chúng thực tế chưa
--  giao xong; admin bấm "Đã giao thành công" khi giao tới nơi. Không
--  chuyển thẳng sang 'delivered' để tránh thổi phồng doanh thu thống kê.
--
--  Bảng `shipments` giữ nguyên: đó là bản ghi vận đơn riêng, không phải
--  trạng thái đơn hàng mà admin thao tác.
--
--  Chạy MỘT LẦN trên CSDL đã có sẵn:
--      mysql -u root -p cosmetic_shop < 06_bo_trang_thai_dang_giao.sql
--
--  (01_schema.sql đã được cập nhật nên cài mới từ đầu không cần file này.)
-- =====================================================================

USE `cosmetic_shop`;

-- Bước 1: dọn dữ liệu TRƯỚC khi thu hẹp ENUM.
-- Nếu đổi ENUM trước, MySQL sẽ biến các giá trị không hợp lệ thành ''.
UPDATE `orders` SET `status` = 'confirmed' WHERE `status` = 'shipping';

-- Bước 2: thu hẹp ENUM để không ai ghi lại được giá trị cũ
ALTER TABLE `orders`
  MODIFY `status` ENUM('pending','confirmed','delivered','cancelled')
         NOT NULL DEFAULT 'pending';

-- Kiểm tra: cột status không còn 'shipping', và không đơn nào rỗng
SELECT COLUMN_TYPE AS `Kieu cot status`
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status';

SELECT `status` AS `Trang thai`, COUNT(*) AS `So don`
FROM `orders`
GROUP BY `status`
ORDER BY `status`;
