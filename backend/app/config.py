import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost:3306/cosmetic_shop?charset=utf8mb4",
    )
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}
    JSON_AS_ASCII = False

    SECRET_KEY = os.getenv("SECRET_KEY")
    SESSION_COOKIE_NAME = "lumi_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "0") == "1"  # bật khi chạy HTTPS
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 7

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    # Tầng miễn phí của Gemini có lúc trả lời rất chậm hoặc 503. Chờ quá lâu thì
    # khách bỏ đi, nên cắt sớm và dùng câu trả lời dự phòng. Chỉnh được ở .env.
    GEMINI_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))

    SHIPPING_FEE = int(os.getenv("SHIPPING_FEE", "30000"))
    FREE_SHIPPING_THRESHOLD = int(os.getenv("FREE_SHIPPING_THRESHOLD", "499000"))

    BANK_BIN = os.getenv("BANK_BIN", "")
    BANK_NAME = os.getenv("BANK_NAME", "")
    BANK_ACCOUNT_NO = os.getenv("BANK_ACCOUNT_NO", "")
    BANK_ACCOUNT_NAME = os.getenv("BANK_ACCOUNT_NAME", "")

    ADDRESS_SOURCE_URL = os.getenv("ADDRESS_SOURCE_URL", "https://provinces.open-api.vn/api/v2/?depth=2")

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
