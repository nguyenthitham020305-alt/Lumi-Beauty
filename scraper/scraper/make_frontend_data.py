"""
Sinh du lieu mau cho frontend tu du lieu da crawl.

Output (frontend/public/api/):
    categories/index.json     - danh sach 22 danh muc, kem so luong
    categories/{slug}.json    - danh sach san pham cua mot danh muc
    products/{slug}.json      - chi tiet mot san pham

Ghi vao public/ thay vi src/: Vite phuc vu thu muc nay nhu file tinh,
khong nhoi vao bundle. Frontend fetch() giong het khi goi API that.

Chay:  python make_frontend_data.py
"""

import csv
import json
import os
import shutil

OUT = os.path.join("..", "..", "frontend", "public", "api")
PER_CATEGORY = 160   # so san pham xuat cho moi danh muc
MAX_IMAGES = 8       # gallery hien toi da 8 anh
RELATED = 8          # so san pham goi y cuoi trang chi tiet


def read_csv(name):
    with open(os.path.join("out", name), encoding="utf-8") as f:
        return list(csv.DictReader(f))


def to_card(p, brand):
    """Dang rut gon dung cho the san pham trong luoi."""
    return {
        "id": p["product_id"],
        "slug": p["slug"],
        "name": p["name"],
        "brand": brand["name"] if brand else None,
        "brandSlug": brand["slug"] if brand else None,
        "price": int(p["price"]),
        "originalPrice": int(p["original_price"]),
        "discountPercent": int(p["discount_percent"]),
        "priceMin": int(p["price_min"]),
        "priceMax": int(p["price_max"]),
        "variantCount": int(p["variant_count"]),
        "stock": int(p["stock"]),
        "rating": float(p["rating"]) if p["rating"] else None,
        "reviewCount": int(p["review_count"]),
        "image": p["image"],
    }


def write_json(path, obj, indent=None):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)
    return os.path.getsize(path)


def main():
    # Xoa sach de khong con file thua tu lan chay truoc
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "categories"))
    os.makedirs(os.path.join(OUT, "products"))

    products = read_csv("products.csv")
    brands = {b["brand_id"]: b for b in read_csv("brands.csv")}
    cats = {c["category_id"]: c for c in read_csv("categories.csv")}
    links = read_csv("product_categories.csv")

    by_id = {p["product_id"]: p for p in products}

    images = {}
    for img in read_csv("product_images.csv"):
        images.setdefault(img["product_id"], []).append((int(img["position"]), img["url"]))

    cats_of = {}
    members = {}
    for pc in links:
        cats_of.setdefault(pc["product_id"], []).append(pc["category_id"])
        members.setdefault(pc["category_id"], []).append(pc["product_id"])

    index = []
    exported = {}      # product_id -> card, gom tat ca SP xuat hien o bat ky danh muc nao
    cat_cards = {}     # category_id -> [card]

    # ---------- Danh sach theo tung danh muc ----------
    for cid, cat in cats.items():
        ids = members.get(cid, [])
        rows = [by_id[i] for i in ids if i in by_id]
        total = len(rows)
        if total == 0:
            continue

        # Uu tien SP con hang -> trang demo khong bi toan "het hang"
        rows.sort(key=lambda p: (int(p["stock"]) == 0, -int(p["stock"])))
        rows = rows[:PER_CATEGORY]

        cards = [to_card(p, brands.get(p["brand_id"])) for p in rows]
        cat_cards[cid] = cards
        for p, c in zip(rows, cards):
            exported[p["product_id"]] = c

        counts = {}
        for c in cards:
            if c["brandSlug"]:
                counts.setdefault(c["brandSlug"],
                                  {"slug": c["brandSlug"], "name": c["brand"], "count": 0})
                counts[c["brandSlug"]]["count"] += 1
        brand_facets = sorted(counts.values(), key=lambda x: (-x["count"], x["name"]))

        write_json(os.path.join(OUT, "categories", f"{cat['slug']}.json"), {
            "category": {
                "slug": cat["slug"],
                "name": cat["name"],
                "description": cat["description"] or None,
                "totalInCatalog": total,
            },
            "brands": brand_facets,
            "products": cards,
        })

        index.append({
            "slug": cat["slug"],
            "name": cat["name"],
            "total": total,
            "parentSlug": cats[cat["parent_id"]]["slug"] if cat["parent_id"] in cats else None,
        })

    index.sort(key=lambda c: -c["total"])
    write_json(os.path.join(OUT, "categories", "index.json"), index, indent=1)

    # ---------- Chi tiet tung san pham ----------
    detail_bytes = 0
    for pid, card in exported.items():
        p = by_id[pid]
        brand = brands.get(p["brand_id"])

        my_cats = [cid for cid in cats_of.get(pid, []) if cid in cats]

        # Goi y: cung thuong hieu truoc, thieu thi bu bang cung danh muc
        pool = []
        for cid in my_cats:
            pool.extend(cat_cards.get(cid, []))

        seen = {pid}
        same_brand, others = [], []
        for c in pool:
            if c["id"] in seen:
                continue
            seen.add(c["id"])
            if card["brandSlug"] and c["brandSlug"] == card["brandSlug"]:
                same_brand.append(c)
            else:
                others.append(c)

        detail_bytes += write_json(os.path.join(OUT, "products", f"{p['slug']}.json"), {
            **card,
            "sku": p["sku"],
            "description": p["description"],
            "images": [u for _, u in sorted(images.get(pid, []))][:MAX_IMAGES],
            "categories": [{"slug": cats[c]["slug"], "name": cats[c]["name"]} for c in my_cats],
            "brandLogo": brand["logo_url"] if brand else None,
            "related": (same_brand + others)[:RELATED],
        })

    print(f"-> {OUT}")
    print(f"   danh muc : {len(index)} file")
    print(f"   san pham : {len(exported)} file  ({detail_bytes / 1024 / 1024:.1f} MB, "
          f"TB {detail_bytes / len(exported) / 1024:.1f} KB/file)")
    print()
    print("   Top danh muc:")
    for c in index[:8]:
        print(f"     {c['name']:22} {c['total']:>4} SP")


if __name__ == "__main__":
    main()
