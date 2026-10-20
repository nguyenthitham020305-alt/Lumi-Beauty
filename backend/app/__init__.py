import click
from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.ensure_ascii = False
    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("Thiếu SECRET_KEY trong backend/.env (xem .env.example)")

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, supports_credentials=True)

    from .routes.admin import admin_bp
    from .routes.auth import auth_bp
    from .routes.cart import cart_bp
    from .routes.catalog import catalog_bp
    from .routes.chat import chat_bp
    from .routes.orders import orders_bp
    from .routes.products import products_bp

    app.register_blueprint(catalog_bp, url_prefix="/api")
    app.register_blueprint(products_bp, url_prefix="/api")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")
    app.register_blueprint(orders_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Không tìm thấy"), 404

    register_cli(app)
    return app


def register_cli(app):
    @app.cli.command("import-addresses")
    @click.option("--sql-out", type=click.Path(dir_okay=False), help="Ghi thêm file INSERT để cài offline")
    def import_addresses(sql_out):
        """Nạp tỉnh/thành và phường/xã (2 cấp, sau sáp nhập 2025) từ provinces.open-api.vn."""
        import json
        import urllib.request

        from sqlalchemy import text

        url = app.config["ADDRESS_SOURCE_URL"]
        click.echo(f"Đang tải {url} ...")
        with urllib.request.urlopen(url, timeout=120) as res:
            data = json.load(res)

        provinces = [{"code": p["code"], "name": p["name"], "type": p["division_type"]} for p in data]
        wards = [
            {"code": w["code"], "province": p["code"], "name": w["name"], "type": w["division_type"]}
            for p in data
            for w in p.get("wards", [])
        ]
        if not provinces or not wards:
            raise click.ClickException("Dữ liệu tải về rỗng, không ghi gì vào CSDL")

        upsert_province = text(
            "INSERT INTO provinces (province_code, name, division_type) VALUES (:code, :name, :type) "
            "ON DUPLICATE KEY UPDATE name = VALUES(name), division_type = VALUES(division_type)"
        )
        upsert_ward = text(
            "INSERT INTO wards (ward_code, province_code, name, division_type) VALUES (:code, :province, :name, :type) "
            "ON DUPLICATE KEY UPDATE province_code = VALUES(province_code), name = VALUES(name), division_type = VALUES(division_type)"
        )
        db.session.execute(upsert_province, provinces)
        db.session.execute(upsert_ward, wards)
        db.session.commit()
        click.echo(f"Đã nạp {len(provinces)} tỉnh/thành, {len(wards)} phường/xã")

        if sql_out:
            q = lambda s: "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"
            lines = [
                "-- Dia chi hanh chinh 2 cap. FILE SINH TU DONG boi: flask --app run import-addresses --sql-out ...",
                f"-- Nguon: {url}",
                "SET NAMES utf8mb4;",
                "INSERT INTO `provinces` (`province_code`, `name`, `division_type`) VALUES",
                ",\n".join(f"  ({p['code']}, {q(p['name'])}, {q(p['type'])})" for p in provinces)
                + "\nON DUPLICATE KEY UPDATE `name` = VALUES(`name`);",
                "INSERT INTO `wards` (`ward_code`, `province_code`, `name`, `division_type`) VALUES",
                ",\n".join(f"  ({w['code']}, {w['province']}, {q(w['name'])}, {q(w['type'])})" for w in wards)
                + "\nON DUPLICATE KEY UPDATE `name` = VALUES(`name`);",
            ]
            with open(sql_out, "w", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
            click.echo(f"Đã ghi {sql_out}")

    @app.cli.command("create-admin")
    @click.option("--email", default="admin@lumibeauty.com", show_default=True)
    @click.option("--name", default="Quản trị viên LUMI", show_default=True)
    @click.password_option("--password", prompt="Mật khẩu admin", confirmation_prompt="Nhập lại mật khẩu")
    def create_admin(email, name, password):
        """Tạo (hoặc đặt lại mật khẩu) tài khoản admin. Đây là cách duy nhất để có admin."""
        from .models import User
        from .services.auth import hash_password, normalize_email, validate_password

        error = validate_password(password)
        if error:
            raise click.ClickException(error)

        email = normalize_email(email)
        user = User.query.filter_by(email=email).first()
        if user is None:
            db.session.add(User(name=name, email=email, password=hash_password(password), role="admin"))
            click.echo(f"Đã tạo admin {email}")
        else:
            click.confirm(f"{email} đã tồn tại (role={user.role}). Đặt lại mật khẩu và gán role admin?", abort=True)
            user.password = hash_password(password)
            user.role = "admin"
            user.is_active = True
            click.echo(f"Đã cập nhật admin {email}")
        db.session.commit()
