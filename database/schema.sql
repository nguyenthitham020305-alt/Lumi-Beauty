DROP DATABASE IF EXISTS `cosmetic_shop`;
CREATE DATABASE `cosmetic_shop`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `cosmetic_shop`;

# users
CREATE TABLE `users` (
  `user_id`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100)  NOT NULL,
  `email`       VARCHAR(255)  NOT NULL,
  `password`    VARCHAR(255)  NOT NULL,   -- LUU HASH bcrypt/argon2, KHONG luu thuong
  `phone`       VARCHAR(20)   DEFAULT NULL,
  `role`        ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# brands
CREATE TABLE `brands` (
  `brand_id`   INT UNSIGNED  NOT NULL,
  `slug`       VARCHAR(255)  NOT NULL,
  `name`       VARCHAR(255)  NOT NULL,
  `logo_url`   VARCHAR(500)  DEFAULT NULL,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `uq_brands_slug` (`slug`),
  KEY `idx_brands_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

#categories
CREATE TABLE `categories` (
  `category_id`  INT UNSIGNED  NOT NULL,
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

#products
CREATE TABLE `products` (
  `product_id`         BIGINT UNSIGNED NOT NULL,
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

# product_categories
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

# product_images
CREATE TABLE `product_images` (
  `image_id`    INT UNSIGNED    NOT NULL,
  `product_id`  BIGINT UNSIGNED NOT NULL,
  `url`         VARCHAR(500)    NOT NULL,
  `position`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- 0 = anh dai dien
  PRIMARY KEY (`image_id`),
  KEY `idx_images_product` (`product_id`, `position`),
  CONSTRAINT `fk_images_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

#cart
CREATE TABLE `carts` (
  `cart_id`     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `uq_carts_user` (`user_id`),
  CONSTRAINT `fk_carts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

#cart items
CREATE TABLE `cart_items` (
  `cart_item_id`  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `cart_id`       INT UNSIGNED    NOT NULL,
  `product_id`    BIGINT UNSIGNED NOT NULL,
  `quantity`      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `unit_price`    INT UNSIGNED    NOT NULL,     -- gia luc them vao gio
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

#oders - Don hang
CREATE TABLE `orders` (
  `order_id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_code`        VARCHAR(20)  NOT NULL,        -- ma hien thi cho khach, vd DH20260919001
  `user_id`           INT UNSIGNED DEFAULT NULL,    -- NULL neu tai khoan bi xoa, don van con
  `order_date`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  `subtotal`          INT UNSIGNED NOT NULL,        -- tien hang
  `shipping_fee`      INT UNSIGNED NOT NULL DEFAULT 0,
  `discount_amount`   INT UNSIGNED NOT NULL DEFAULT 0,
  `total_amount`      INT UNSIGNED NOT NULL,        -- subtotal + shipping_fee - discount_amount

  `status`            ENUM('pending','confirmed','shipping','delivered','cancelled')
                      NOT NULL DEFAULT 'pending',

  -- Thong tin nhan hang duoc CHUP LAI tai thoi diem dat.
  -- Khach doi so dien thoai sau nay thi don cu van giu thong tin luc dat.
  `recipient_name`    VARCHAR(100) NOT NULL,
  `recipient_phone`   VARCHAR(20)  NOT NULL,
  `shipping_address`  VARCHAR(500) NOT NULL,
  `note`              VARCHAR(500) DEFAULT NULL,

  `cancelled_reason`  VARCHAR(255) DEFAULT NULL,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uq_orders_code` (`order_code`),
  KEY `idx_orders_user`   (`user_id`, `order_date`),
  KEY `idx_orders_status` (`status`, `order_date`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# order items
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

#Moi don hang co dung MOT ban ghi thanh toan (UNIQUE order_id).
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

# Giao hang
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

# Danh gia
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

#chat sessions
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

#chat messages
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

#San pham chatbot da goi y. Luu lai de danh gia chat luong goi y va de bao cao trong khoa luan (ty le click, ty le mua sau goi y).
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


