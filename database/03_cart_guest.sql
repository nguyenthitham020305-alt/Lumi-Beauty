-- =====================================================================
--  MIGRATION: gio hang cho khach chua dang nhap + chon san pham trong gio
--  Chay 1 lan tren CSDL da co du lieu:
--    mysql -u root -p cosmetic_shop < 03_cart_guest.sql
--  (01_schema.sql da cap nhat san, CSDL tao moi khong can chay file nay)
-- =====================================================================
USE `cosmetic_shop`;

-- user_id NULL = gio cua khach, nhan dien bang session cookie cua Flask.
-- Dang nhap xong, backend gop gio khach vao gio cua tai khoan roi xoa gio khach.
ALTER TABLE `carts`
  MODIFY `user_id` INT UNSIGNED NULL;

-- San pham duoc tick trong gio; tam tinh va dat hang chi tinh cac dong nay
ALTER TABLE `cart_items`
  ADD COLUMN `is_selected` TINYINT(1) NOT NULL DEFAULT 1 AFTER `unit_price`;
