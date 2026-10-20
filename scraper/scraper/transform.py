"""
Chuan hoa du lieu tho tu raw/ -> CSV + SQL san sang import MySQL.

Output (thu muc out/):
    out/brands.csv              out/categories.csv
    out/products.csv            out/product_categories.csv
    out/product_images.csv
    out/data.sql                (INSERT day du, chay sau schema.sql)
    out/report.txt              (bao cao chat luong du lieu)

Chay:  python transform.py
"""

import csv
import html
import json
import os
import re
import shutil
from collections import Counter

from bs4 import BeautifulSoup

RAW_DIR = "raw"
OUT_DIR = "out"
# Chep data.sql sang day luon de thu muc database/ khong bi lech moi khi
# chay lai transform.py. Bo qua neu thu muc chua ton tai.
DB_DIR = os.path.join("..", "..", "database")

IMAGE_BASE = "https://image.hsv-tech.io/"

# Danh muc mang tinh marketing, khong phai danh muc san pham that.
# id 1 = "Thuong hieu", 2 = "San pham moi", 3 = "Xu huong", 27 = "Lot Date"
MERCHANDISING_CATEGORY_IDS = {"1", "2", "3", "27"}

# API tra ve id 6 (slug mat-na-giay-duong-da) ten la "Mat na", trung voi id 13.
# Trung ten se gay nham lan tren menu -> dat lai theo dung slug.
CATEGORY_NAME_OVERRIDE = {
    "6": "Mặt nạ giấy",
}

# Prefix khuyen mai cua Beauty Box -> khong ap dung cho shop minh, phai bo.
PROMO_PREFIX = re.compile(r"^\s*(\[[^\]]*\]|\([^)]*khuy[eế]n m[aã]i[^)]*\))\s*", re.IGNORECASE)


# --------------------------------------------------------------------------
# Tien ich
# --------------------------------------------------------------------------

def load(name):
    with open(os.path.join(RAW_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def vi_field(detail_list, field, default=""):
    """Lay field tieng Viet, fallback sang ban ghi dau tien."""
    if not detail_list:
        return default
    for d in detail_list:
        if d.get("langCode") == "vi" and d.get(field):
            return d[field]
    for d in detail_list:
        if d.get(field):
            return d[field]
    return default


def clean_name(raw):
    """Bo prefix khuyen mai lap lai, gop khoang trang thua."""
    name = html.unescape(str(raw or ""))
    # Co san pham co nhieu prefix long nhau
    while True:
        stripped = PROMO_PREFIX.sub("", name)
        if stripped == name:
            break
        name = stripped
    name = re.sub(r"\s+", " ", name).strip()
    return name


def html_to_text(raw_html, max_len=2000):
    if not raw_html:
        return ""
    text = BeautifulSoup(raw_html, "html.parser").get_text(separator=" ")
    text = re.sub(r"\s+", " ", html.unescape(text)).strip()
    return text[:max_len]


# API tra ve chuoi rac thay vi null cho mot so ban ghi (33 thuong hieu co
# thumbnail = "NaN"). Neu khong chan thi sinh ra URL hong image.hsv-tech.io/NaN
JUNK_PATHS = {"", "nan", "none", "null", "undefined", "false", "0"}


def image_url(path):
    if not path:
        return ""
    path = str(path).strip()
    if path.lower() in JUNK_PATHS:
        return ""
    if path.startswith("http"):
        return path
    return IMAGE_BASE + path.lstrip("/")


def to_int(v, default=0):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


# --------------------------------------------------------------------------
# Chon bien the dai dien (1 san pham = 1 gia)
# --------------------------------------------------------------------------

def list_price(variant):
    """Giá niêm yết (trước khuyến mãi của Beauty Box). LUMI bán theo giá này."""
    price = to_int(variant.get("price"), 0)
    before = to_int(variant.get("priceBeforeDiscount"), 0)
    return max(price, before)


def pick_variant(variants):
    """
    Uu tien bien the CON HANG re nhat; neu het hang thi lay bien the re nhat.
    Tranh loi cu: variants[0] co the la bien the het hang, gia khong dai dien.
    """
    if not variants:
        return None, 0, 0, 0

    priced = []
    for v in variants:
        p = list_price(v)
        if p > 0:
            priced.append((p, v))
    if not priced:
        return variants[0], 0, 0, 0

    prices = [p for p, _ in priced]
    price_min, price_max = min(prices), max(prices)

    # Stock am trong API la loi du lieu -> kep ve 0
    total_stock = sum(max(0, to_int(v.get("stock"), 0)) for v in variants)

    in_stock = [(p, v) for p, v in priced if to_int(v.get("stock"), 0) > 0]
    pool = in_stock if in_stock else priced
    rep = min(pool, key=lambda x: x[0])[1]

    return rep, price_min, price_max, total_stock


# --------------------------------------------------------------------------
# Chuyen doi chinh
# --------------------------------------------------------------------------

def build_lookup_tables(categories_raw, brands_raw):
    categories = []
    for c in categories_raw:
        cid = str(c["id"])
        if cid in MERCHANDISING_CATEGORY_IDS:
            continue
        parent = c.get("parentCategoryId")
        parent = str(parent) if parent else None
        # Danh muc tro ve chinh no hoac tro vao muc marketing -> coi nhu goc
        if parent == cid or parent in MERCHANDISING_CATEGORY_IDS:
            parent = None
        categories.append({
            "category_id": cid,
            "slug": c["slug"],
            "name": CATEGORY_NAME_OVERRIDE.get(cid) or vi_field(c.get("detail"), "name", c["slug"]),
            "description": "",          # API khong cung cap, admin tu nhap sau
            "image": image_url(c.get("thumbnail")),
            "parent_id": parent,
        })
    valid_cat_ids = {c["category_id"] for c in categories}
    # Don parent tro toi danh muc da bi loai
    for c in categories:
        if c["parent_id"] not in valid_cat_ids:
            c["parent_id"] = None

    brands = []
    for b in brands_raw:
        brands.append({
            "brand_id": str(b["id"]),
            "slug": b["slug"],
            "name": vi_field(b.get("detail"), "name", b["slug"]),
            "logo_url": image_url(b.get("thumbnail")),
        })

    return categories, brands


def transform(products_raw, valid_cat_ids, brand_ids):
    products, prod_cats, images = [], [], []
    stats = Counter()
    img_id = 0

    for p in products_raw:
        pid = str(p["id"])
        detail = p.get("_detail") or {}

        # ---- Ten ----
        detail_list = detail.get("detail") or p.get("detail") or []
        name = clean_name(vi_field(detail_list, "name"))
        if not name:
            stats["thieu_ten"] += 1
            continue

        # ---- Mo ta ----
        desc_html = vi_field(detail_list, "htmlDescription", "")
        desc_text = html_to_text(desc_html)
        if not desc_text:
            stats["thieu_mo_ta"] += 1

        # ---- Thuong hieu (tu collections giao voi tap brand) ----
        brand_id = None
        for cid in (detail.get("collections") or p.get("collections") or []):
            if str(cid) in brand_ids:
                brand_id = str(cid)
                break
        if not brand_id:
            stats["thieu_brand"] += 1

        # ---- Gia / ton kho ----
        variants = detail.get("variants") or p.get("variants") or []
        rep, price_min, price_max, stock = pick_variant(variants)
        if rep is None:
            stats["khong_co_bien_the"] += 1
            continue

        price = list_price(rep)
        if price <= 0:
            stats["gia_khong_hop_le"] += 1
            continue

        # Shop không chạy khuyến mãi: bán đúng giá niêm yết, 2 cột này giữ để khớp schema
        original_price = price
        discount_percent = 0

        if stock == 0:
            stats["het_hang"] += 1
        if len(variants) > 1:
            stats["nhieu_bien_the"] += 1

        # ---- Anh ----
        medias = [m for m in (detail.get("medias") or []) if m.get("type") == "image" and m.get("url")]
        medias.sort(key=lambda m: to_int(m.get("priority"), 999))
        urls = []
        seen = set()
        for m in medias:
            u = image_url(m["url"])
            if u not in seen:
                seen.add(u)
                urls.append(u)
        if not urls:
            fallback = image_url(rep.get("thumbnail") or p.get("thumbnail"))
            if fallback:
                urls = [fallback]
        if not urls:
            stats["khong_co_anh"] += 1
            continue

        thumbnail = urls[0]
        for pos, u in enumerate(urls):
            img_id += 1
            images.append({"image_id": img_id, "product_id": pid, "url": u, "position": pos})

        # ---- Danh muc ----
        cat_ids = [str(c) for c in (detail.get("categories") or p.get("categories") or [])]
        kept = sorted({c for c in cat_ids if c in valid_cat_ids})
        if not kept:
            stats["khong_co_danh_muc"] += 1
        for c in kept:
            prod_cats.append({"product_id": pid, "category_id": c})

        # ---- Danh gia ----
        rating_obj = detail.get("rating") or p.get("rating") or {}
        rating = rating_obj.get("starsAvg") if isinstance(rating_obj, dict) else None
        review_count = to_int(rating_obj.get("reviewCount"), 0) if isinstance(rating_obj, dict) else 0
        # Nguon co vai san pham starsAvg = 10 du thang diem la 5
        if rating is not None and float(rating) > 5:
            rating = 5
        if rating is None:
            stats["khong_co_rating"] += 1

        # rating/review_count la gia tri HIEN THI (seed + review cua nguoi dung).
        # Luc import chua co review nao nen bang voi seed. Trigger trong CSDL
        # se tinh lai moi khi co review moi.
        products.append({
            "product_id": pid,
            "sku": str(p.get("sku") or ""),
            "slug": p.get("slug") or "",
            "name": name,
            "brand_id": brand_id or "",
            "description": desc_text,
            "price": price,
            "original_price": original_price,
            "discount_percent": discount_percent,
            "price_min": price_min,
            "price_max": price_max,
            "variant_count": len(variants),
            "stock": stock,
            "seed_rating": rating if rating is not None else "",
            "seed_review_count": review_count,
            "rating": rating if rating is not None else "",
            "review_count": review_count,
            "image": thumbnail,
            "status": "active" if stock > 0 else "out_of_stock",
        })
        stats["ok"] += 1

    return products, prod_cats, images, stats


# --------------------------------------------------------------------------
# Xuat file
# --------------------------------------------------------------------------

def write_csv(name, rows, fields):
    path = os.path.join(OUT_DIR, name)
    # encoding utf-8 (KHONG BOM) -> MySQL LOAD DATA doc dung ten cot
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"  -> {path}  ({len(rows)} dong)")


def sql_val(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("\\", "\\\\").replace("'", "''")
    s = s.replace("\r", " ").replace("\n", " ")
    return "'" + s + "'"


def write_sql(f, table, rows, fields, batch=200):
    if not rows:
        return
    cols = ", ".join(f"`{c}`" for c in fields)
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        f.write(f"INSERT INTO `{table}` ({cols}) VALUES\n")
        values = [
            "  (" + ", ".join(sql_val(r.get(c)) for c in fields) + ")"
            for r in chunk
        ]
        f.write(",\n".join(values) + ";\n")
    f.write("\n")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print("Doc du lieu tho...")
    categories_raw = load("categories.json")
    brands_raw = load("brands.json")
    products_raw = load("products.json")
    print(f"  {len(categories_raw)} danh muc, {len(brands_raw)} thuong hieu, {len(products_raw)} san pham")

    categories, brands = build_lookup_tables(categories_raw, brands_raw)
    valid_cat_ids = {c["category_id"] for c in categories}
    brand_ids = {b["brand_id"] for b in brands}

    print("\nChuan hoa...")
    products, prod_cats, images, stats = transform(products_raw, valid_cat_ids, brand_ids)

    # Chi giu brand/category thuc su duoc dung
    used_brands = {p["brand_id"] for p in products if p["brand_id"]}
    brands = [b for b in brands if b["brand_id"] in used_brands]
    used_cats = {pc["category_id"] for pc in prod_cats}
    categories = [c for c in categories if c["category_id"] in used_cats]
    cat_ids_final = {c["category_id"] for c in categories}
    for c in categories:
        if c["parent_id"] not in cat_ids_final:
            c["parent_id"] = None
    prod_cats = [pc for pc in prod_cats if pc["category_id"] in cat_ids_final]

    # Trung ten danh muc se lam menu web bi nhap nhang -> canh bao de them override
    dup_names = [n for n, k in Counter(c["name"] for c in categories).items() if k > 1]
    if dup_names:
        print(f"\n  ! Danh muc trung ten: {dup_names}"
              f"\n    -> them vao CATEGORY_NAME_OVERRIDE o dau file")

    # Ten cot khop voi so do lop (product_id, brand_id, category_id...)
    BRAND_F = ["brand_id", "slug", "name", "logo_url"]
    CAT_F = ["category_id", "slug", "name", "description", "image", "parent_id"]
    PROD_F = ["product_id", "sku", "slug", "name", "description", "brand_id",
              "price", "original_price", "discount_percent",
              "price_min", "price_max", "variant_count", "stock",
              "seed_rating", "seed_review_count", "rating", "review_count",
              "image", "status"]
    PC_F = ["product_id", "category_id"]
    IMG_F = ["image_id", "product_id", "url", "position"]

    print("\nXuat CSV...")
    write_csv("brands.csv", brands, BRAND_F)
    write_csv("categories.csv", categories, CAT_F)
    write_csv("products.csv", products, PROD_F)
    write_csv("product_categories.csv", prod_cats, PC_F)
    write_csv("product_images.csv", images, IMG_F)

    print("\nXuat SQL...")
    sql_path = os.path.join(OUT_DIR, "data.sql")
    with open(sql_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("-- Du lieu san pham crawl tu Beauty Box\n")
        f.write("-- Chay schema.sql TRUOC file nay.\n")
        f.write("SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n")
        write_sql(f, "brands", brands, BRAND_F)
        write_sql(f, "categories", categories, CAT_F)
        write_sql(f, "products", products, PROD_F)
        write_sql(f, "product_categories", prod_cats, PC_F)
        write_sql(f, "product_images", images, IMG_F)
        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
    print(f"  -> {sql_path}  ({os.path.getsize(sql_path) / 1024 / 1024:.1f} MB)")

    if os.path.isdir(DB_DIR):
        mirror = os.path.join(DB_DIR, "02_data.sql")
        shutil.copyfile(sql_path, mirror)
        print(f"  -> {mirror}")

    # ---- Bao cao chat luong ----
    lines = []
    lines.append("=" * 58)
    lines.append("BAO CAO CHAT LUONG DU LIEU")
    lines.append("=" * 58)
    lines.append(f"San pham hop le      : {len(products)}")
    lines.append(f"Thuong hieu          : {len(brands)}")
    lines.append(f"Danh muc             : {len(categories)}")
    lines.append(f"Anh san pham         : {len(images)}  (TB {len(images) / max(1, len(products)):.1f}/sp)")
    lines.append(f"Lien ket sp-danh muc : {len(prod_cats)}")
    lines.append("")
    lines.append("-- Ghi chu --")
    for k in ["ok", "nhieu_bien_the", "het_hang", "thieu_brand", "thieu_mo_ta",
              "khong_co_rating", "khong_co_danh_muc", "khong_co_anh",
              "gia_khong_hop_le", "thieu_ten", "khong_co_bien_the"]:
        if stats[k]:
            lines.append(f"{k:22}: {stats[k]}")
    lines.append("")
    if products:
        prices = sorted(p["price"] for p in products)
        lines.append(f"Gia: min {prices[0]:,}d  |  trung vi {prices[len(prices) // 2]:,}d  |  max {prices[-1]:,}d")
        lines.append(f"Co giam gia: {sum(1 for p in products if p['discount_percent'] > 0)} san pham")
        lines.append(f"Con hang   : {sum(1 for p in products if p['stock'] > 0)} san pham")
    lines.append("")
    lines.append("Phan bo danh muc:")
    cname = {c["category_id"]: c["name"] for c in categories}
    for cid, n in Counter(pc["category_id"] for pc in prod_cats).most_common():
        lines.append(f"  {cname.get(cid, cid):28} {n}")

    report = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "report.txt"), "w", encoding="utf-8") as f:
        f.write(report)
    print("\n" + report)


if __name__ == "__main__":
    main()
