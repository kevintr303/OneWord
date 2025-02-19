from sqlalchemy import func
from src.extensions import db

class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(50), unique=True, nullable=False)
    votes = db.Column(db.Integer, default=1)
    color = db.Column(db.String(20), default="#007bff")
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
