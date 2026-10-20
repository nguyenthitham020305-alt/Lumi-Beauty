-- Schema MySQL cho web ban my pham
-- Chay file nay TRUOC out/data.sql
--
--   mysql -u root -p < schema.sql
--   mysql -u root -p cosmetic_shop < out/data.sql

CREATE DATABASE IF NOT EXISTS `cosmetic_shop`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cosmetic_shop`;

DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `product_categories`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `brands`;


-- ---------------------------------------------------------------- brands
CREATE TABLE `brands` (
  `id`        VARCHAR(20)  NOT NULL,
  `slug`      VARCHAR(255) NOT NULL,
  `name`      VARCHAR(255) NOT NULL,
  `logo_url`  VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brands_slug` (`slug`),
  KEY `idx_brands_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------ categories
CREATE TABLE `categories` (
  `id`         VARCHAR(20)  NOT NULL,
  `slug`       VARCHAR(255) NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `parent_id`  VARCHAR(20)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------- products
-- Mot san pham = mot gia (bien the dai dien: con hang & re nhat).
-- price_min / price_max giu lai khoang gia that de hien thi "tu ... den ...".
CREATE TABLE `products` (
  `id`                VARCHAR(20)    NOT NULL,
  `sku`               VARCHAR(50)    DEFAULT NULL,
  `slug`              VARCHAR(255)   NOT NULL,
  `name`              VARCHAR(500)   NOT NULL,
  `brand_id`          VARCHAR(20)    DEFAULT NULL,
  `description`       TEXT           DEFAULT NULL,

  `price`             INT UNSIGNED   NOT NULL,           -- gia ban hien tai (VND)
  `original_price`    INT UNSIGNED   NOT NULL,           -- gia goc, >= price
  `discount_percent`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `price_min`         INT UNSIGNED   NOT NULL,           -- gia thap nhat trong cac bien the
  `price_max`         INT UNSIGNED   NOT NULL,           -- gia cao nhat trong cac bien the
  `variant_count`     SMALLINT UNSIGNED NOT NULL DEFAULT 1,

  `stock`             INT UNSIGNED   NOT NULL DEFAULT 0, -- tong ton kho moi bien the
  `rating`            DECIMAL(3,2)   DEFAULT NULL,
  `review_count`      INT UNSIGNED   NOT NULL DEFAULT 0,
  `thumbnail`         VARCHAR(500)   DEFAULT NULL,
  `is_active`         TINYINT(1)     NOT NULL DEFAULT 1,

  `created_at`        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `idx_products_brand` (`brand_id`),
  KEY `idx_products_price` (`price`),
  KEY `idx_products_active_stock` (`is_active`, `stock`),
  KEY `idx_products_rating` (`rating`),
  FULLTEXT KEY `ft_products_name` (`name`, `description`),
  CONSTRAINT `fk_products_brand`
    FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------- product_categories
-- Quan he N-N. Thay cho cot "category" dang chuoi "A, B, C" (loc bang LIKE se sai).
CREATE TABLE `product_categories` (
  `product_id`   VARCHAR(20) NOT NULL,
  `category_id`  VARCHAR(20) NOT NULL,
  PRIMARY KEY (`product_id`, `category_id`),
  KEY `idx_pc_category` (`category_id`),
  CONSTRAINT `fk_pc_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------- product_images
CREATE TABLE `product_images` (
  `id`          INT UNSIGNED NOT NULL,
  `product_id`  VARCHAR(20)  NOT NULL,
  `url`         VARCHAR(500) NOT NULL,
  `position`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- 0 = anh dai dien
  PRIMARY KEY (`id`),
  KEY `idx_images_product` (`product_id`, `position`),
  CONSTRAINT `fk_images_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------ view
-- Tien cho trang danh sach: gop san pham + thuong hieu + danh muc.
CREATE OR REPLACE VIEW `v_products` AS
SELECT
  p.`id`, p.`sku`, p.`slug`, p.`name`,
  b.`name` AS `brand_name`, b.`slug` AS `brand_slug`,
  p.`price`, p.`original_price`, p.`discount_percent`,
  p.`price_min`, p.`price_max`, p.`variant_count`,
  p.`stock`, p.`rating`, p.`review_count`, p.`thumbnail`, p.`is_active`,
  GROUP_CONCAT(c.`name` ORDER BY c.`name` SEPARATOR ', ') AS `category_names`
FROM `products` p
LEFT JOIN `brands` b               ON b.`id` = p.`brand_id`
LEFT JOIN `product_categories` pc  ON pc.`product_id` = p.`id`
LEFT JOIN `categories` c           ON c.`id` = pc.`category_id`
GROUP BY p.`id`;
