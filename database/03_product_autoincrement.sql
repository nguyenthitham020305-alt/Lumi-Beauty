-- =====================================================================
--  Bật AUTO_INCREMENT cho products.product_id và product_images.image_id
--
--  LÝ DO: dữ liệu ban đầu crawl từ Beauty Box mang sẵn ID nên hai cột này
--  được khai báo không AUTO_INCREMENT. Khi admin thêm sản phẩm mới, backend
--  không tự sinh được khoá chính -> INSERT lỗi "Field 'product_id' doesn't
--  have a default value".
--
--  MySQL tự đặt giá trị kế tiếp = MAX(id) + 1 khi thêm AUTO_INCREMENT vào
--  cột đã có dữ liệu, nên không cần chỉ định tay.
--
--  Chạy MỘT LẦN trên CSDL đã có sẵn:
--      mysql -u root -p cosmetic_shop < 03_product_autoincrement.sql
--
--  (01_schema.sql đã được cập nhật nên cài mới từ đầu không cần file này.)
-- =====================================================================

USE `cosmetic_shop`;

-- MySQL từ chối MODIFY trên cột đang được khoá ngoại tham chiếu
-- (lỗi 1833). Tắt kiểm tra trong phiên này; kiểu dữ liệu không đổi
-- nên dữ liệu và ràng buộc vẫn nguyên vẹn.
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `products`
  MODIFY `product_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_images`
  MODIFY `image_id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

SET FOREIGN_KEY_CHECKS = 1;

-- Kiểm tra: cột EXTRA phải hiện "auto_increment"
SELECT TABLE_NAME, COLUMN_NAME, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('products', 'product_images')
  AND COLUMN_KEY = 'PRI';
