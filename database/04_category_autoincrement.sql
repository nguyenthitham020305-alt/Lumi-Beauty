-- =====================================================================
--  Bật AUTO_INCREMENT cho categories.category_id
--
--  LÝ DO: giống products, dữ liệu danh mục ban đầu crawl từ Beauty Box
--  mang sẵn ID nên cột này không AUTO_INCREMENT. Admin thêm danh mục mới
--  sẽ lỗi "Field 'category_id' doesn't have a default value".
--
--  MySQL từ chối MODIFY khi cột đang được khoá ngoại tham chiếu (lỗi 1833)
--  — ở đây là fk_categories_parent (danh mục cha) và fk_pc_category
--  (bảng nối product_categories). Tắt kiểm tra trong phiên này; kiểu dữ
--  liệu không đổi nên dữ liệu và ràng buộc vẫn nguyên vẹn.
--
--  Chạy MỘT LẦN trên CSDL đã có sẵn:
--      mysql -u root -p cosmetic_shop < 04_category_autoincrement.sql
--
--  (01_schema.sql đã được cập nhật nên cài mới từ đầu không cần file này.)
-- =====================================================================

USE `cosmetic_shop`;

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `categories`
  MODIFY `category_id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

SET FOREIGN_KEY_CHECKS = 1;

-- Kiểm tra: cột EXTRA phải hiện "auto_increment"
SELECT TABLE_NAME, COLUMN_NAME, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'categories'
  AND COLUMN_KEY = 'PRI';
