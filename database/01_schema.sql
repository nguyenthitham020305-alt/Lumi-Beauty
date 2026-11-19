-- =====================================================================
--  CSDL WEBSITE BAN MY PHAM
--  Xay dung theo so do lop, co dieu chinh:
--    - Admin gop vao users (cot role) thay vi bang rieng
--    - Product - Category doi sang N-N (bang product_categories)
--    - Brand tach thanh bang rieng (183 thuong hieu, co logo)
--    - Them bang product_images (gallery, TB 6 anh/san pham)
--  Chay:  mysql -u root -p < 01_schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS `cosmetic_shop`;
CREATE DATABASE `cosmetic_shop`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `cosmetic_shop`;


-- =====================================================================
--  NHOM 1: NGUOI DUNG
-- =====================================================================

-- Gom ca khach hang va quan tri vien, phan biet bang cot `role`.
-- So do ve Admin ke thua User; o CSDL quan he thi mot bang + role
-- gon hon va tranh trung email giua hai bang.
CREATE TABLE `users` (
  `user_id`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100)  NOT NULL,
  `email`       VARCHAR(255)  NOT NULL,
  `password`    VARCHAR(255)  NOT NULL,   -- LUU HASH bcrypt/argon2, KHONG luu thuong
  `phone`       VARCHAR(20)   DEFAULT NULL,

  -- Địa chỉ giao hàng mặc định: điền sẵn cho lần đặt hàng sau, ghi đè mỗi
  -- khi khách đặt đơn thành công. Khác với địa chỉ trong `orders` — chỗ đó
  -- là bản chụp của từng đơn và không bao giờ đổi.
  `province_code`  INT UNSIGNED DEFAULT NULL,
  `ward_code`      INT UNSIGNED DEFAULT NULL,
  `street_address` VARCHAR(255) DEFAULT NULL,

  `role`        ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_province` (`province_code`),
  KEY `idx_users_ward` (`ward_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  NHOM 2: DANH MUC SAN PHAM  (du lieu crawl tu Beauty Box)
-- =====================================================================

CREATE TABLE `brands` (
  `brand_id`   INT UNSIGNED  NOT NULL,
  `slug`       VARCHAR(255)  NOT NULL,
  `name`       VARCHAR(255)  NOT NULL,
  `logo_url`   VARCHAR(500)  DEFAULT NULL,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `uq_brands_slug` (`slug`),
  KEY `idx_brands_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `categories` (
  `category_id`  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `slug`         VARCHAR(255)  NOT NULL,
  `name`         VARCHAR(255)  NOT NULL,
  `description`  VARCHAR(500)  DEFAULT NULL,
  `image`        VARCHAR(500)  DEFAULT NULL,
  `parent_id`    INT UNSIGNED  DEFAULT NULL,   -- NULL = danh muc goc
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`category_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Mot san pham = mot gia (bien the dai dien: con hang & re nhat).
-- price_min/price_max giu khoang gia that de hien thi "tu X den Y".
CREATE TABLE `products` (
  `product_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku`                VARCHAR(50)     DEFAULT NULL,
  `slug`               VARCHAR(255)    NOT NULL,
  `name`               VARCHAR(500)    NOT NULL,
  `description`        TEXT            DEFAULT NULL,
  `brand_id`           INT UNSIGNED    DEFAULT NULL,

  `price`              INT UNSIGNED    NOT NULL,          -- gia ban hien tai (VND)
  `original_price`     INT UNSIGNED    NOT NULL,          -- gia goc, luon >= price
  `discount_percent`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `price_min`          INT UNSIGNED    NOT NULL,
  `price_max`          INT UNSIGNED    NOT NULL,
  `variant_count`      SMALLINT UNSIGNED NOT NULL DEFAULT 1,

  `stock`              INT UNSIGNED    NOT NULL DEFAULT 0,

  -- Diem danh gia goc tu Beauty Box. Giu nguyen, khong bao gio sua.
  `seed_rating`        DECIMAL(3,2)    DEFAULT NULL,
  `seed_review_count`  INT UNSIGNED    NOT NULL DEFAULT 0,
  -- Diem HIEN THI = seed gop voi review cua nguoi dung.
  -- Trigger o cuoi file tu dong tinh lai moi khi bang reviews thay doi.
  `rating`             DECIMAL(3,2)    DEFAULT NULL,
  `review_count`       INT UNSIGNED    NOT NULL DEFAULT 0,

  `image`              VARCHAR(500)    DEFAULT NULL,      -- anh dai dien
  `status`             ENUM('active','out_of_stock','hidden') NOT NULL DEFAULT 'active',
  `sold_count`         INT UNSIGNED    NOT NULL DEFAULT 0,

  `created_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`product_id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `idx_products_brand`  (`brand_id`),
  KEY `idx_products_price`  (`price`),
  KEY `idx_products_status` (`status`, `stock`),
  KEY `idx_products_rating` (`rating`),
  KEY `idx_products_sold`   (`sold_count`),
  FULLTEXT KEY `ft_products_search` (`name`, `description`),
  CONSTRAINT `fk_products_brand`
    FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Quan he N-N. Mot san pham thuoc nhieu danh muc:
-- vd sua rua mat thuoc ca "Lam sach", "Sua rua mat" va "Duong da".
CREATE TABLE `product_categories` (
  `product_id`   BIGINT UNSIGNED NOT NULL,
  `category_id`  INT UNSIGNED    NOT NULL,
  PRIMARY KEY (`product_id`, `category_id`),
  KEY `idx_pc_category` (`category_id`),
  CONSTRAINT `fk_pc_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `product_images` (
  `image_id`    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `product_id`  BIGINT UNSIGNED NOT NULL,
  `url`         VARCHAR(500)    NOT NULL,
  `position`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- 0 = anh dai dien
  PRIMARY KEY (`image_id`),
  KEY `idx_images_product` (`product_id`, `position`),
  CONSTRAINT `fk_images_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  NHOM 3: GIO HANG
-- =====================================================================

-- Moi nguoi dung co dung MOT gio hang (rang buoc UNIQUE user_id).
-- user_id NULL = gio cua khach chua dang nhap (nhan dien bang session cookie),
-- dang nhap xong backend gop vao gio cua tai khoan.
CREATE TABLE `carts` (
  `cart_id`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `uq_carts_user` (`user_id`),
  CONSTRAINT `fk_carts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `cart_items` (
  `cart_item_id`  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `cart_id`       INT UNSIGNED    NOT NULL,
  `product_id`    BIGINT UNSIGNED NOT NULL,
  `quantity`      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `unit_price`    INT UNSIGNED    NOT NULL,     -- gia luc them vao gio
  `is_selected`   TINYINT(1)      NOT NULL DEFAULT 1,   -- duoc tick de dat hang
  `added_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_item_id`),
  -- Them lai san pham da co -> cong don quantity, khong tao dong moi
  UNIQUE KEY `uq_cart_product` (`cart_id`, `product_id`),
  KEY `idx_ci_product` (`product_id`),
  CONSTRAINT `fk_ci_cart`
    FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_ci_qty` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  NHOM 4: DON HANG
-- =====================================================================

-- Dia chi hanh chinh 2 cap (tinh -> phuong/xa) sau sap nhap 1/7/2025.
-- Du lieu: 05_address_data.sql, lay tu provinces.open-api.vn (v2).
CREATE TABLE `provinces` (
  `province_code`  INT UNSIGNED NOT NULL,
  `name`           VARCHAR(100) NOT NULL,
  `division_type`  VARCHAR(50)  NOT NULL,
  PRIMARY KEY (`province_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `wards` (
  `ward_code`      INT UNSIGNED NOT NULL,
  `province_code`  INT UNSIGNED NOT NULL,
  `name`           VARCHAR(100) NOT NULL,
  `division_type`  VARCHAR(50)  NOT NULL,
  PRIMARY KEY (`ward_code`),
  KEY `idx_wards_province` (`province_code`, `name`),
  CONSTRAINT `fk_wards_province`
    FOREIGN KEY (`province_code`) REFERENCES `provinces` (`province_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `orders` (
  `order_id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_code`        VARCHAR(20)  NOT NULL,        -- ma hien thi cho khach, vd DH20260919001
  `user_id`           INT UNSIGNED DEFAULT NULL,    -- NULL neu tai khoan bi xoa, don van con
  `order_date`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  `subtotal`          INT UNSIGNED NOT NULL,        -- tien hang
  `shipping_fee`      INT UNSIGNED NOT NULL DEFAULT 0,
  `discount_amount`   INT UNSIGNED NOT NULL DEFAULT 0,
  `total_amount`      INT UNSIGNED NOT NULL,        -- subtotal + shipping_fee - discount_amount

  `status`            ENUM('pending','confirmed','delivered','cancelled')
                      NOT NULL DEFAULT 'pending',

  -- Thong tin nhan hang duoc CHUP LAI tai thoi diem dat.
  -- Khach doi so dien thoai sau nay thi don cu van giu thong tin luc dat.
  `recipient_name`    VARCHAR(100) NOT NULL,
  `recipient_phone`   VARCHAR(20)  NOT NULL,
  `recipient_email`   VARCHAR(255) DEFAULT NULL,
  `province_code`     INT UNSIGNED DEFAULT NULL,
  `ward_code`         INT UNSIGNED DEFAULT NULL,
  `street_address`    VARCHAR(255) DEFAULT NULL,    -- so nha, ten duong
  `shipping_address`  VARCHAR(500) NOT NULL,        -- chuoi day du chup lai luc dat
  `note`              VARCHAR(500) DEFAULT NULL,

  `cancelled_reason`  VARCHAR(255) DEFAULT NULL,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uq_orders_code` (`order_code`),
  KEY `idx_orders_user`   (`user_id`, `order_date`),
  KEY `idx_orders_status` (`status`, `order_date`),
  KEY `idx_orders_province` (`province_code`),
  CONSTRAINT `fk_orders_province`
    FOREIGN KEY (`province_code`) REFERENCES `provinces` (`province_code`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_ward`
    FOREIGN KEY (`ward_code`) REFERENCES `wards` (`ward_code`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `order_items` (
  `order_item_id`  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `order_id`       INT UNSIGNED    NOT NULL,
  `product_id`     BIGINT UNSIGNED DEFAULT NULL,   -- NULL neu san pham bi xoa khoi shop
  -- Chup lai ten va anh: san pham co the doi ten hoac bi go,
  -- nhung lich su don hang phai giu nguyen nhu luc mua.
  `product_name`   VARCHAR(500)    NOT NULL,
  `product_image`  VARCHAR(500)    DEFAULT NULL,
  `quantity`       SMALLINT UNSIGNED NOT NULL,
  `unit_price`     INT UNSIGNED    NOT NULL,
  `subtotal`       INT UNSIGNED    NOT NULL,       -- quantity * unit_price
  PRIMARY KEY (`order_item_id`),
  KEY `idx_oi_order`   (`order_id`),
  KEY `idx_oi_product` (`product_id`),
  CONSTRAINT `fk_oi_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oi_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_oi_qty` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Moi don hang co dung MOT ban ghi thanh toan (UNIQUE order_id).
CREATE TABLE `payments` (
  `payment_id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`          INT UNSIGNED NOT NULL,
  `method`            ENUM('cod','bank_transfer','momo','vnpay') NOT NULL DEFAULT 'cod',
  `amount`            INT UNSIGNED NOT NULL,
  `status`            ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `transaction_code`  VARCHAR(100) DEFAULT NULL,   -- ma giao dich tu cong thanh toan
  `paid_at`           DATETIME     DEFAULT NULL,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uq_payments_order` (`order_id`),
  KEY `idx_payments_status` (`status`),
  CONSTRAINT `fk_payments_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `shipments` (
  `shipping_id`    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`       INT UNSIGNED NOT NULL,
  `method`         ENUM('standard','express') NOT NULL DEFAULT 'standard',
  `shipping_fee`   INT UNSIGNED NOT NULL DEFAULT 0,
  `status`         ENUM('pending','picked_up','in_transit','delivered','failed')
                   NOT NULL DEFAULT 'pending',
  `tracking_code`  VARCHAR(100) DEFAULT NULL,
  `deliver_date`   DATETIME     DEFAULT NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipping_id`),
  UNIQUE KEY `uq_shipments_order` (`order_id`),
  KEY `idx_shipments_status` (`status`),
  CONSTRAINT `fk_shipments_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  NHOM 5: DANH GIA
-- =====================================================================

CREATE TABLE `reviews` (
  `review_id`   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED    NOT NULL,
  `product_id`  BIGINT UNSIGNED NOT NULL,
  `rating`      TINYINT UNSIGNED NOT NULL,          -- 1..5 sao
  `comment`     TEXT            DEFAULT NULL,
  -- Admin.manageReviews() trong so do -> duyet/an binh luan
  `status`      ENUM('pending','approved','hidden') NOT NULL DEFAULT 'approved',
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  -- Moi nguoi chi danh gia moi san pham mot lan
  UNIQUE KEY `uq_reviews_user_product` (`user_id`, `product_id`),
  KEY `idx_reviews_product` (`product_id`, `status`),
  CONSTRAINT `fk_reviews_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  NHOM 6: CHATBOT TU VAN
-- =====================================================================

CREATE TABLE `chat_sessions` (
  `session_id`  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED DEFAULT NULL,   -- NULL = khach chua dang nhap
  `started_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at`    DATETIME     DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_cs_user` (`user_id`, `started_at`),
  CONSTRAINT `fk_cs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `chat_messages` (
  `message_id`  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id`  INT UNSIGNED    NOT NULL,
  `sender`      ENUM('user','bot') NOT NULL,
  `content`     TEXT            NOT NULL,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_cm_session` (`session_id`, `created_at`),
  CONSTRAINT `fk_cm_session`
    FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`session_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- San pham chatbot da goi y. Luu lai de danh gia chat luong goi y
-- va de bao cao trong khoa luan (ty le click, ty le mua sau goi y).
CREATE TABLE `product_recommendations` (
  `reco_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id`  INT UNSIGNED    NOT NULL,
  `message_id`  BIGINT UNSIGNED DEFAULT NULL,   -- goi y thuoc cau tra loi nao
  `product_id`  BIGINT UNSIGNED NOT NULL,
  `score`       DECIMAL(5,4)    DEFAULT NULL,   -- do phu hop 0..1
  `reason`      VARCHAR(255)    DEFAULT NULL,   -- vd "da dau, can kiem dau"
  `is_clicked`  TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reco_id`),
  KEY `idx_pr_session` (`session_id`, `created_at`),
  KEY `idx_pr_product` (`product_id`),
  CONSTRAINT `fk_pr_session`
    FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`session_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pr_message`
    FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`message_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pr_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  TRIGGER: dong bo diem danh gia
--  rating hien thi = gop diem seed (Beauty Box) voi review cua nguoi dung
-- =====================================================================

DELIMITER $$

CREATE PROCEDURE `sp_refresh_product_rating`(IN p_product_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_cnt       INT           DEFAULT 0;
  DECLARE v_sum       DECIMAL(12,2) DEFAULT 0;
  DECLARE v_seed_rate DECIMAL(3,2)  DEFAULT NULL;
  DECLARE v_seed_cnt  INT           DEFAULT 0;
  DECLARE v_total     INT           DEFAULT 0;

  SELECT COUNT(*), COALESCE(SUM(`rating`), 0)
    INTO v_cnt, v_sum
    FROM `reviews`
   WHERE `product_id` = p_product_id AND `status` = 'approved';

  SELECT `seed_rating`, `seed_review_count`
    INTO v_seed_rate, v_seed_cnt
    FROM `products`
   WHERE `product_id` = p_product_id;

  SET v_total = v_cnt + COALESCE(v_seed_cnt, 0);

  UPDATE `products`
     SET `review_count` = v_total,
         `rating` = CASE
           WHEN v_total = 0 THEN NULL
           ELSE ROUND(
                  (v_sum + COALESCE(v_seed_rate, 0) * COALESCE(v_seed_cnt, 0))
                  / v_total, 2)
         END
   WHERE `product_id` = p_product_id;
END$$

CREATE TRIGGER `trg_reviews_after_insert` AFTER INSERT ON `reviews`
FOR EACH ROW BEGIN
  CALL sp_refresh_product_rating(NEW.product_id);
END$$

CREATE TRIGGER `trg_reviews_after_update` AFTER UPDATE ON `reviews`
FOR EACH ROW BEGIN
  CALL sp_refresh_product_rating(NEW.product_id);
  IF OLD.product_id <> NEW.product_id THEN
    CALL sp_refresh_product_rating(OLD.product_id);
  END IF;
END$$

CREATE TRIGGER `trg_reviews_after_delete` AFTER DELETE ON `reviews`
FOR EACH ROW BEGIN
  CALL sp_refresh_product_rating(OLD.product_id);
END$$

DELIMITER ;


-- =====================================================================
--  VIEW tien dung
-- =====================================================================

-- Trang danh sach san pham: gop san pham + thuong hieu + danh muc
CREATE OR REPLACE VIEW `v_products` AS
SELECT
  p.`product_id`, p.`sku`, p.`slug`, p.`name`,
  b.`name` AS `brand_name`, b.`slug` AS `brand_slug`,
  p.`price`, p.`original_price`, p.`discount_percent`,
  p.`price_min`, p.`price_max`, p.`variant_count`,
  p.`stock`, p.`rating`, p.`review_count`, p.`sold_count`,
  p.`image`, p.`status`,
  GROUP_CONCAT(c.`name` ORDER BY c.`name` SEPARATOR ', ') AS `category_names`
FROM `products` p
LEFT JOIN `brands` b              ON b.`brand_id` = p.`brand_id`
LEFT JOIN `product_categories` pc ON pc.`product_id` = p.`product_id`
LEFT JOIN `categories` c          ON c.`category_id` = pc.`category_id`
GROUP BY p.`product_id`;


-- Trang quan tri: tom tat don hang kem trang thai thanh toan / van chuyen
CREATE OR REPLACE VIEW `v_orders` AS
SELECT
  o.`order_id`, o.`order_code`, o.`order_date`, o.`status`,
  o.`subtotal`, o.`shipping_fee`, o.`discount_amount`, o.`total_amount`,
  o.`recipient_name`, o.`recipient_phone`, o.`shipping_address`,
  u.`user_id`, u.`name` AS `customer_name`, u.`email` AS `customer_email`,
  pay.`method` AS `payment_method`, pay.`status` AS `payment_status`,
  sh.`method`  AS `shipping_method`, sh.`status` AS `shipping_status`,
  (SELECT COUNT(*) FROM `order_items` oi WHERE oi.`order_id` = o.`order_id`) AS `item_count`
FROM `orders` o
LEFT JOIN `users`     u   ON u.`user_id`  = o.`user_id`
LEFT JOIN `payments`  pay ON pay.`order_id` = o.`order_id`
LEFT JOIN `shipments` sh  ON sh.`order_id`  = o.`order_id`;
