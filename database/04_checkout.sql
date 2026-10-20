-- =====================================================================
--  MIGRATION: dia chi hanh chinh 2 cap (sau sap nhap 1/7/2025) + thong tin
--  nhan hang tren don. Chay 1 lan tren CSDL da co du lieu:
--    mysql -u root -p cosmetic_shop < 04_checkout.sql
--  Nap du lieu dia chi: 05_address_data.sql (hoac lenh flask import-addresses)
--  (01_schema.sql da cap nhat san, CSDL tao moi khong can chay file nay)
-- =====================================================================
USE `cosmetic_shop`;

CREATE TABLE IF NOT EXISTS `provinces` (
  `province_code`  INT UNSIGNED NOT NULL,          -- ma don vi hanh chinh cua Nha nuoc
  `name`           VARCHAR(100) NOT NULL,          -- vd "Thanh pho Ha Noi"
  `division_type`  VARCHAR(50)  NOT NULL,          -- "tinh" / "thanh pho trung uong"
  PRIMARY KEY (`province_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wards` (
  `ward_code`      INT UNSIGNED NOT NULL,
  `province_code`  INT UNSIGNED NOT NULL,
  `name`           VARCHAR(100) NOT NULL,          -- vd "Phuong Ba Dinh"
  `division_type`  VARCHAR(50)  NOT NULL,          -- "phuong" / "xa" / "dac khu"
  PRIMARY KEY (`ward_code`),
  KEY `idx_wards_province` (`province_code`, `name`),
  CONSTRAINT `fk_wards_province`
    FOREIGN KEY (`province_code`) REFERENCES `provinces` (`province_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- shipping_address van giu chuoi day du (chup lai luc dat), cac cot duoi de loc/thong ke
ALTER TABLE `orders`
  ADD COLUMN `recipient_email` VARCHAR(255) DEFAULT NULL AFTER `recipient_phone`,
  ADD COLUMN `province_code`   INT UNSIGNED DEFAULT NULL AFTER `recipient_email`,
  ADD COLUMN `ward_code`       INT UNSIGNED DEFAULT NULL AFTER `province_code`,
  ADD COLUMN `street_address`  VARCHAR(255) DEFAULT NULL AFTER `ward_code`,
  ADD KEY `idx_orders_province` (`province_code`),
  ADD CONSTRAINT `fk_orders_province`
    FOREIGN KEY (`province_code`) REFERENCES `provinces` (`province_code`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_ward`
    FOREIGN KEY (`ward_code`) REFERENCES `wards` (`ward_code`) ON DELETE SET NULL;
