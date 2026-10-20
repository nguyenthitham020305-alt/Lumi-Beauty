-- =====================================================================
--  Lưu địa chỉ giao hàng mặc định của khách
--
--  LÝ DO: bảng `orders` đã chụp lại địa chỉ của TỪNG ĐƠN (đúng — đơn cũ
--  phải giữ nguyên địa chỉ lúc mua), nhưng không có chỗ nào lưu địa chỉ
--  "hiện tại" của khách, nên lần nào đặt hàng cũng phải nhập lại từ đầu.
--
--  Ba cột dưới đây là địa chỉ mặc định, được ghi đè mỗi lần khách đặt đơn
--  thành công. Khách sửa địa chỉ ở trang thanh toán thì lần sau tự điền
--  theo địa chỉ mới.
--
--  Mỗi khách MỘT địa chỉ. Muốn nhiều địa chỉ (nhà / công ty) thì cần bảng
--  `addresses` riêng — chưa làm vì yêu cầu hiện tại chỉ cần một.
--
--  Chạy MỘT LẦN:
--      mysql -u root -p cosmetic_shop < 05_user_address.sql
--
--  (01_schema.sql đã được cập nhật nên cài mới từ đầu không cần file này.)
-- =====================================================================

USE `cosmetic_shop`;

ALTER TABLE `users`
  ADD COLUMN `province_code`  INT UNSIGNED DEFAULT NULL AFTER `phone`,
  ADD COLUMN `ward_code`      INT UNSIGNED DEFAULT NULL AFTER `province_code`,
  ADD COLUMN `street_address` VARCHAR(255) DEFAULT NULL AFTER `ward_code`;

-- Đơn vị hành chính bị xoá/sáp nhập thì chỉ gỡ liên kết, không xoá tài khoản
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_province`
    FOREIGN KEY (`province_code`) REFERENCES `provinces` (`province_code`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_users_ward`
    FOREIGN KEY (`ward_code`) REFERENCES `wards` (`ward_code`) ON DELETE SET NULL;

-- Kiểm tra
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('province_code', 'ward_code', 'street_address');
