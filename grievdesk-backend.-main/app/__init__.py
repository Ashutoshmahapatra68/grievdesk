from flask import Flask
from dotenv import load_dotenv

load_dotenv()  # must run before Config is imported, since Config reads os.environ at import time

from app.config import Config
from app.extensions import init_mongo, jwt, cors
from app.routes import register_blueprints


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    init_mongo(app)
    jwt.init_app(app)
    cors.init_app(app)  # default: allow all origins — tighten this before deploying

    register_blueprints(app)

    from app.cli import jobs_cli  # `flask jobs ...`
    app.cli.add_command(jobs_cli)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app
