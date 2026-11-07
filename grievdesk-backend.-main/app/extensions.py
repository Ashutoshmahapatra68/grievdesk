from pymongo import MongoClient
import os

_client = None
mongo_db = None


def init_mongo(app):
    global _client, mongo_db
    uri = app.config.get("MONGO_URI", "mongodb://localhost:27017/grievdesk")
    _client = MongoClient(uri)
    mongo_db = _client.get_default_database()
    app.mongo_db = mongo_db


def get_db():
    return mongo_db


from flask_jwt_extended import JWTManager
from flask_cors import CORS

jwt = JWTManager()
cors = CORS()
