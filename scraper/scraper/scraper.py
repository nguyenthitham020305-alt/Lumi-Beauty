"""
Crawl du lieu san pham tu Beauty Box API.

Output (thu muc raw/):
    raw/categories.json   - cay danh muc (27 muc)
    raw/brands.json       - danh sach thuong hieu
    raw/products.json     - san pham day du (list + detail da gop)

Chay:  python scraper.py
Buoc tiep theo: python transform.py
"""

import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

API = "https://beautybox-api.hsv-tech.io/client"
RAW_DIR = "raw"

# Danh muc can crawl. Lay het, khong gioi han so luong.
CATEGORY_SLUGS = [
    "duong-da",
    "trang-diem",
    "cham-soc-co-the",
    "lam-sach",
    "cham-soc-ca-nhan",
    "serum-duong-da",
    "sua-rua-mat",
    "kem-chong-nang",
    "kem-duong-mat",
    "kem-tay-trang",
    "mat-na",
    "mat-na-giay-duong-da",
    "son-kem",
    "kem-nen",
    "phan-nuoc-trang-diem-cushion",
    "nuoc-hoa",
    "dau-goi",
    "sua-tam",
    "xit-khoang",
    "kem-duong-the",
    "kem-duong-da-vung-mat",
    "thuc-pham-chuc-nang",
]

PAGE_SIZE = 24
LIST_DELAY = 0.3      # nghi giua cac trang danh sach
DETAIL_WORKERS = 6    # so luong request chi tiet chay song song
MAX_RETRY = 3


def make_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
    })
    return s


def get_json(session, path, params=None):
    """GET co retry + backoff. Tra None neu that bai han."""
    url = f"{API}{path}"
    for attempt in range(MAX_RETRY):
        try:
            r = session.get(url, params=params, timeout=30)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
            print(f"  ! HTTP {r.status_code} {url} (lan {attempt + 1})")
        except requests.RequestException as e:
            print(f"  ! {type(e).__name__} {url} (lan {attempt + 1})")
        time.sleep(1.5 * (attempt + 1))
    return None


# --------------------------------------------------------------------------
# 1. Danh muc
# --------------------------------------------------------------------------

def fetch_categories(session):
    data = get_json(session, "/product-categories") or {}
    cats = data.get("data", [])
    print(f"Danh muc: {len(cats)}")
    return cats


# --------------------------------------------------------------------------
# 2. Thuong hieu
#    Beauty Box khong co endpoint /brands rieng. Thuong hieu duoc luu duoi dang
#    product-collection co parentCollectionId == "1" (collection goc "brands").
# --------------------------------------------------------------------------

def fetch_brands(session):
    brands = []
    page = 1
    while True:
        data = get_json(session, "/product-collections",
                        params={"limit": 100, "page": page})
        if not data:
            break
        items = data.get("data", [])
        if not items:
            break

        brands.extend(c for c in items if str(c.get("parentCollectionId")) == "1")

        total = data.get("total", 0)
        if page * 100 >= total:
            break
        page += 1
        time.sleep(LIST_DELAY)

    print(f"Thuong hieu: {len(brands)}")
    return brands


# --------------------------------------------------------------------------
# 3. Danh sach san pham theo tung danh muc
# --------------------------------------------------------------------------

def fetch_product_list(session):
    """Tra ve dict {product_id: product}. Dedupe theo id nhung gop category slug."""
    products = {}

    for slug in CATEGORY_SLUGS:
        page = 1
        got = 0

        while True:
            data = get_json(session, "/products", params={
                "categories": slug,
                "disableDynamic": "true",
                "sort": "createdAt,DESC",
                "limit": PAGE_SIZE,
                "page": page,
            })
            if not data:
                break

            items = data.get("data", [])
            if not items:
                break

            for p in items:
                pid = str(p["id"])
                if pid in products:
                    # San pham nam o nhieu danh mục -> ghi nho tat ca
                    products[pid]["_source_categories"].append(slug)
                else:
                    p["_source_categories"] = [slug]
                    products[pid] = p
            got += len(items)

            total = data.get("total", 0)
            if page * PAGE_SIZE >= total:
                break
            page += 1
            time.sleep(LIST_DELAY)

        print(f"  {slug:32} {got:>4} san pham  (unique tich luy: {len(products)})")

    return products


# --------------------------------------------------------------------------
# 4. Chi tiet san pham (mo ta, gallery anh, thuoc tinh)
# --------------------------------------------------------------------------

def fetch_detail(session, slug):
    return get_json(session, f"/products/{slug}")


def enrich_with_details(products):
    """Goi endpoint chi tiet cho tung san pham, gan vao key _detail."""
    slugs = [(pid, p["slug"]) for pid, p in products.items() if p.get("slug")]
    done = 0
    failed = 0

    def worker(item):
        pid, slug = item
        sess = make_session()
        return pid, fetch_detail(sess, slug)

    with ThreadPoolExecutor(max_workers=DETAIL_WORKERS) as pool:
        futures = {pool.submit(worker, item): item for item in slugs}
        for fut in as_completed(futures):
            pid, detail = fut.result()
            if detail:
                products[pid]["_detail"] = detail
            else:
                failed += 1
            done += 1
            if done % 100 == 0:
                print(f"  chi tiet: {done}/{len(slugs)}  (loi: {failed})")

    print(f"  chi tiet xong: {done}/{len(slugs)}  (loi: {failed})")
    return failed


# --------------------------------------------------------------------------

def save(name, obj):
    path = os.path.join(RAW_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    size_mb = os.path.getsize(path) / 1024 / 1024
    print(f"  -> {path}  ({size_mb:.1f} MB)")


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    session = make_session()
    t0 = time.time()

    print("=" * 60)
    print("[1/4] Danh muc")
    categories = fetch_categories(session)
    save("categories.json", categories)

    print("\n[2/4] Thuong hieu")
    brands = fetch_brands(session)
    save("brands.json", brands)

    print("\n[3/4] Danh sach san pham")
    products = fetch_product_list(session)
    print(f"Tong unique: {len(products)}")

    print("\n[4/4] Chi tiet san pham (mo ta / gallery / bien the)")
    enrich_with_details(products)
    save("products.json", list(products.values()))

    print("\n" + "=" * 60)
    print(f"XONG trong {time.time() - t0:.0f}s")
    print(f"San pham: {len(products)}  |  Thuong hieu: {len(brands)}  |  Danh muc: {len(categories)}")
    print("Buoc tiep: python transform.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
