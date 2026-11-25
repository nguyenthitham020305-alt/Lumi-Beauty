-- =====================================================================
--  Đơn giản hoá quy trình đơn hàng: còn 2 trạng thái, 1 thao tác
--
--  LÝ DO: cửa hàng không nối với đơn vị vận chuyển và cũng không có đối
--  soát ngân hàng tự động, nên các bước trung gian (Xác nhận đơn, Đang
--  giao, Đã nhận tiền) chỉ là nút bấm cho có, không mang thêm thông tin
--  nào cho khách. Quy trình mới:
--
--      Khách bấm "Đặt hàng"  ->  ĐÃ ĐẶT HÀNG
--      Admin bấm "Hoàn tất"  ->  HOÀN TẤT  (đã giao + đã thu tiền)
--
--  Thanh toán chỉ còn COD, bỏ chuyển khoản QR: khách không phải chọn gì,
--  bấm đặt hàng là xong. Doanh thu từ nay chỉ tính đơn HOÀN TẤT, tức là
--  tiền thực thu, không cộng đơn chưa giao như trước.
--
--  Chạy MỘT LẦN trên CSDL đã có sẵn:
--      mysql -u root -p cosmetic_shop < 08_don_gian_hoa_don_hang.sql
--
--  (01_schema.sql đã được cập nhật nên cài mới từ đầu không cần file này.)
-- =====================================================================

USE `cosmetic_shop`;

-- ---------------------------------------------------------------------
-- BƯỚC 1: Trả lại tồn kho cho các đơn QR khách bỏ ngang sắp bị xoá
--
-- Phải làm TRƯỚC khi xoá, vì xoá rồi thì không còn order_items để biết
-- đơn đó đã giữ những sản phẩm nào. Tồn kho bị trừ ngay lúc khách đặt
-- (routes/orders.py), nên đơn không bao giờ hoàn tất sẽ giam hàng.
-- ---------------------------------------------------------------------
UPDATE `products` p
JOIN (
  SELECT oi.product_id, SUM(oi.quantity) AS qty
  FROM `orders` o
  JOIN `payments` pm   ON pm.order_id = o.order_id
  JOIN `order_items` oi ON oi.order_id = o.order_id
  WHERE o.status = 'pending' AND pm.method = 'bank_transfer'
  GROUP BY oi.product_id
) t ON t.product_id = p.product_id
SET p.stock      = p.stock + t.qty,
    p.sold_count = GREATEST(0, p.sold_count - t.qty),
    p.status     = IF(p.status = 'out_of_stock', 'active', p.status);

-- ---------------------------------------------------------------------
-- BƯỚC 2: Gom các đơn cần xoá vào một bảng tạm
--
--   (a) Đơn QR khách bấm đặt rồi không chuyển khoản  -> đơn ma, giam hàng
--   (b) Đơn đã huỷ          -> trạng thái 'cancelled' sắp bị gỡ bỏ
--   (c) Đơn rỗng, không có dòng hàng nào -> dữ liệu rác từ lúc thử nghiệm,
--       đang cộng khống tiền vào doanh thu
-- ---------------------------------------------------------------------
CREATE TEMPORARY TABLE `_orders_can_xoa` (
  `order_id` INT PRIMARY KEY
);

INSERT INTO `_orders_can_xoa` (`order_id`)
SELECT o.order_id
FROM `orders` o
LEFT JOIN `payments` pm ON pm.order_id = o.order_id
WHERE (o.status = 'pending' AND pm.method = 'bank_transfer')   -- (a)
   OR  o.status = 'cancelled'                                   -- (b)
   OR  NOT EXISTS (SELECT 1 FROM `order_items` oi
                   WHERE oi.order_id = o.order_id);             -- (c)

-- ---------------------------------------------------------------------
-- BƯỚC 3: Xoá, theo thứ tự bảng con trước bảng cha
-- ---------------------------------------------------------------------
DELETE FROM `order_items` WHERE `order_id` IN (SELECT `order_id` FROM `_orders_can_xoa`);
DELETE FROM `payments`    WHERE `order_id` IN (SELECT `order_id` FROM `_orders_can_xoa`);
DELETE FROM `shipments`   WHERE `order_id` IN (SELECT `order_id` FROM `_orders_can_xoa`);
DELETE FROM `orders`      WHERE `order_id` IN (SELECT `order_id` FROM `_orders_can_xoa`);

DROP TEMPORARY TABLE `_orders_can_xoa`;

-- ---------------------------------------------------------------------
-- BƯỚC 4: Đơn chuyển khoản còn lại (đã giao xong) chuyển sang COD
-- ---------------------------------------------------------------------
UPDATE `payments` SET `method` = 'cod' WHERE `method` <> 'cod';

-- ---------------------------------------------------------------------
-- BƯỚC 5: Gộp trạng thái về 'completed'
--
-- Phải NỚI enum ra trước rồi mới đổi dữ liệu: nếu thu hẹp enum ngay thì
-- MySQL biến mọi giá trị không hợp lệ thành chuỗi rỗng.
-- ---------------------------------------------------------------------
ALTER TABLE `orders`
  MODIFY `status` ENUM('pending','confirmed','delivered','cancelled','completed')
         NOT NULL DEFAULT 'pending';

UPDATE `orders` SET `status` = 'completed' WHERE `status` IN ('confirmed','delivered');

-- Đơn đã hoàn tất thì tiền đã thu (COD trả khi nhận hàng)
UPDATE `payments` pm
JOIN `orders` o ON o.order_id = pm.order_id
SET pm.`status`  = 'paid',
    pm.`paid_at` = COALESCE(pm.`paid_at`, o.`order_date`)
WHERE o.`status` = 'completed' AND pm.`status` <> 'paid';

-- Vận đơn khớp lại với đơn hàng. Hai bản ghi còn kẹt 'in_transit' là tàn
-- dư từ lần bỏ bước "Đang giao" trước đây (migration 06 chỉ đổi orders).
UPDATE `shipments` s
JOIN `orders` o ON o.order_id = s.order_id
SET s.`status` = IF(o.`status` = 'completed', 'delivered', 'pending');

-- ---------------------------------------------------------------------
-- BƯỚC 6: Thu hẹp các enum để không ai ghi lại giá trị cũ
-- ---------------------------------------------------------------------
ALTER TABLE `orders`
  MODIFY `status` ENUM('pending','completed') NOT NULL DEFAULT 'pending';

ALTER TABLE `payments`
  MODIFY `method` ENUM('cod') NOT NULL DEFAULT 'cod';

ALTER TABLE `payments`
  MODIFY `status` ENUM('pending','paid') NOT NULL DEFAULT 'pending';

-- Không còn huỷ đơn nên cột lý do huỷ không còn ý nghĩa
ALTER TABLE `orders` DROP COLUMN `cancelled_reason`;

-- ---------------------------------------------------------------------
-- KIỂM TRA
-- ---------------------------------------------------------------------
SELECT `status` AS `Trang thai don`, COUNT(*) AS `So don`
FROM `orders` GROUP BY `status`;

SELECT pm.`method` AS `Phuong thuc`, pm.`status` AS `Thanh toan`, COUNT(*) AS `So don`
FROM `payments` pm GROUP BY pm.`method`, pm.`status`;

SELECT COUNT(*) AS `Don khong co dong hang (phai = 0)`
FROM `orders` o WHERE NOT EXISTS (SELECT 1 FROM `order_items` i WHERE i.order_id = o.order_id);

SELECT COUNT(*) AS `Don khong co ban ghi thanh toan (phai = 0)`
FROM `orders` o WHERE NOT EXISTS (SELECT 1 FROM `payments` p WHERE p.order_id = o.order_id);

SELECT FORMAT(COALESCE(SUM(`total_amount`), 0), 0) AS `Doanh thu (don hoan tat)`
FROM `orders` WHERE `status` = 'completed';
