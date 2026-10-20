# ===== BAN CU - giu lai de doi chieu. Khong dung nua. =====
# Van de da phat hien:
#   1. products[:500] cat sau danh muc dau tien -> chi con "duong-da"
#   2. Base URL anh sai -> 500/500 link 404 (dung: https://image.hsv-tech.io/)
#   3. variants[0] -> gia sai cho 203 san pham nhieu bien the
#   4. discountPrice tu API khong lien quan gia bien the -> 29 sp co discount > price
#   5. category_map thieu id "2" (11 san pham bi bo im lang)
#   6. except: pass tran -> nuot loi
import pandas as pd
import ast

df = pd.read_csv("products_500.csv")

category_map = {
    "28": "Kem nền", "12": "Serum", "10": "Kem dưỡng mắt", "23": "Nước hoa",
    "25": "Khẩu trang", "20": "Sữa tắm", "16": "Cushion", "24": "Thực phẩm chức năng",
    "9": "Chăm sóc cá nhân", "21": "Dưỡng thể", "19": "Chống nắng", "17": "Sữa rửa mặt",
    "15": "Son kem", "11": "Kem dưỡng mặt", "6": "Mặt nạ giấy", "5": "Dưỡng da",
    "26": "Chăm sóc cơ thể", "14": "Xịt khoáng", "4": "Trang điểm", "13": "Mặt nạ",
    "7": "Làm sạch", "22": "Dầu gội", "18": "Tẩy trang",
}

clean_products = []
for _, row in df.iterrows():
    name = ""
    try:
        details = ast.literal_eval(str(row["detail"]))
        for item in details:
            if item.get("langCode") == "vi":
                name = item.get("name", ""); break
        if not name and details:
            name = details[0].get("name", "")
    except: pass

    category = ""
    try:
        category_ids = ast.literal_eval(str(row["categories"]))
        names = [category_map[str(c)] for c in category_ids if str(c) in category_map]
        category = ", ".join(names)
    except: pass

    rating, review_count = None, 0
    try:
        rating_data = ast.literal_eval(str(row["rating"]))
        if isinstance(rating_data, dict):
            rating = rating_data.get("starsAvg")
            review_count = rating_data.get("reviewCount", 0)
    except: pass

    price = row["minPrice"]; original_price = row["minPriceBeforeDiscount"]
    stock = None; image = row["thumbnail"]
    try:
        variants = ast.literal_eval(str(row["variants"]))
        if variants:
            variant = variants[0]
            price = variant.get("price")
            original_price = variant.get("priceBeforeDiscount")
            stock = variant.get("stock")
            if variant.get("thumbnail"): image = variant.get("thumbnail")
    except: pass

    if not str(image).startswith("http"):
        image = "https://beautybox-api.hsv-tech.io/" + str(image)

    clean_products.append({
        "product_id": row["id"], "sku": row["sku"], "name": name, "category": category,
        "price": price, "original_price": original_price,
        "discount_price": row["discountPrice"], "discount_percent": row["discountPercentPrice"],
        "thumbnail": image, "stock": stock, "rating": rating,
        "review_count": review_count, "slug": row["slug"],
    })

pd.DataFrame(clean_products).to_csv("products_final.csv", index=False, encoding="utf-8-sig")
