-- =====================================================================
--  Khách chưa đăng nhập chỉ được XEM và TÌM KIẾM sản phẩm
--
--  LÝ DO: thêm vào giỏ hàng và dùng chatbot AI giờ đều yêu cầu đăng nhập.
--    - Giỏ hàng: luôn gắn với một tài khoản, không còn giỏ "vãng lai" lưu
--      theo cookie, nên bỏ được toàn bộ phần gộp giỏ khi đăng nhập.
--    - Chatbot: mỗi câu hỏi là một lượt gọi Gemini. Trước thay đổi này,
--      261/280 phiên chat là của khách vãng lai, sinh 695 lượt gợi ý sản
--      phẩm nhưng KHÔNG một lượt bấm nào — tức là tiêu quota mà không đo
--      được hiệu quả, cũng không quy được về người dùng nào.
--
--  File này XOÁ dữ liệu vãng lai còn sót. Từ sau thay đổi, tầng ứng dụng
--  không cho phép tạo thêm bản ghi nào có user_id rỗng nữa.
--
--  LƯU Ý: hai cột `carts.user_id` và `chat_sessions.user_id` vẫn để cho
--  phép rỗng. Siết thành NOT NULL không cần thiết vì tầng ứng dụng đã
--  chặn, mà lại khoá mất đường quay lại nếu sau này muốn mở cho khách
--  vãng lai dùng thử chatbot.
--
--  Chạy MỘT LẦN trên CSDL đã có sẵn:
--      mysql -u root -p cosmetic_shop < 09_guest_phai_dang_nhap.sql
-- =====================================================================

USE `cosmetic_shop`;

-- ---------------------------------------------------------------------
-- BƯỚC 1: Xoá giỏ hàng của khách vãng lai
--
-- Giỏ hàng KHÔNG trừ tồn kho (tồn kho chỉ trừ khi đặt hàng), nên xoá giỏ
-- không phải hoàn trả gì cả.
-- ---------------------------------------------------------------------
DELETE FROM `cart_items`
WHERE `cart_id` IN (SELECT `cart_id` FROM `carts` WHERE `user_id` IS NULL);

DELETE FROM `carts` WHERE `user_id` IS NULL;

-- ---------------------------------------------------------------------
-- BƯỚC 2: Xoá phiên chat của khách vãng lai
--
-- Xoá bảng con trước (gợi ý sản phẩm tham chiếu tới tin nhắn, tin nhắn
-- tham chiếu tới phiên).
-- ---------------------------------------------------------------------
DELETE FROM `product_recommendations`
WHERE `session_id` IN (SELECT `session_id` FROM `chat_sessions` WHERE `user_id` IS NULL);

DELETE FROM `chat_messages`
WHERE `session_id` IN (SELECT `session_id` FROM `chat_sessions` WHERE `user_id` IS NULL);

DELETE FROM `chat_sessions` WHERE `user_id` IS NULL;

-- ---------------------------------------------------------------------
-- KIỂM TRA: cả bốn số phải bằng 0
-- ---------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM `carts`         WHERE `user_id` IS NULL) AS `Gio vang lai`,
  (SELECT COUNT(*) FROM `chat_sessions` WHERE `user_id` IS NULL) AS `Phien chat vang lai`,
  (SELECT COUNT(*) FROM `chat_messages` m
     WHERE NOT EXISTS (SELECT 1 FROM `chat_sessions` s WHERE s.session_id = m.session_id)) AS `Tin nhan mo coi`,
  (SELECT COUNT(*) FROM `product_recommendations` r
     WHERE NOT EXISTS (SELECT 1 FROM `chat_sessions` s WHERE s.session_id = r.session_id)) AS `Goi y mo coi`;

SELECT
  (SELECT COUNT(*) FROM `carts`)         AS `Gio hang con lai`,
  (SELECT COUNT(*) FROM `chat_sessions`) AS `Phien chat con lai`,
  (SELECT COUNT(*) FROM `chat_messages`) AS `Tin nhan con lai`;
