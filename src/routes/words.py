from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
from src.models import Word
from src.extensions import db
from src.utils.delta_store import pending_deltas

words_bp = Blueprint("words", __name__)

def delete_expired_words(hours=24):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    Word.query.filter(Word.created_at < cutoff).delete()
    db.session.commit()

def fetch_words_data(search="", since=None, offset=0, limit=50):
    delete_expired_words(hours=24)
    query = Word.query
    if search:
        query = query.filter(Word.word.ilike(f"%{search}%"))
    if since:
        try:
            since_dt = datetime.fromtimestamp(float(since), timezone.utc)
            query = query.filter(Word.updated_at >= since_dt)
        except (ValueError, TypeError):
            pass
    query = query.order_by(Word.votes.desc(), Word.word.asc())
    total = query.count()
    words = query.offset(offset).limit(limit).all() if limit is not None else query.offset(offset).all()
    result = [
        {"word": w.word, "votes": w.votes, "color": w.color, "rank": offset + index + 1}
        for index, w in enumerate(words)
    ]
    return {"words": result, "total": total, "timestamp": datetime.now(timezone.utc).timestamp()}

@words_bp.route("/submit", methods=["POST"])
def submit_word():
    data = request.get_json() or {}
    word_text = data.get("word", "").strip().lower()
    color = data.get("color", "#007bff").strip()

    if not word_text or len(word_text) > 45:
        return jsonify({"error": "Invalid word"}), 400

    if not color.startswith("#") or len(color) not in (4, 7):
        color = "#007bff"

    existing_word = Word.query.filter_by(word=word_text).first()
    if existing_word:
        existing_word.votes += 1
        db.session.commit()
        pending_deltas.add(word_text)
        return jsonify({"word": word_text, "votes": existing_word.votes})

    new_word = Word(word=word_text, color=color)
    db.session.add(new_word)
    db.session.commit()
    pending_deltas.add(word_text)
    return jsonify({"word": word_text, "votes": new_word.votes})

@words_bp.route("/words", methods=["GET"])
def fetch_words():
    search = request.args.get("q", "").strip()
    since = request.args.get("since")
    try:
        offset = int(request.args.get("offset", 0))
    except ValueError:
        offset = 0
    try:
        limit = int(request.args.get("limit", 50))
    except ValueError:
        limit = 50
    data = fetch_words_data(search, since, offset, limit)
    return jsonify(data)

@words_bp.route("/vote", methods=["POST"])
def vote_word():
    data = request.get_json() or {}
    word_text = data.get("word", "").strip().lower()
    change = data.get("change", 0)

    if not word_text or change not in [-1, 1]:
        return jsonify({"error": "Invalid vote request"}), 400

    word_entry = Word.query.filter_by(word=word_text).first()
    if not word_entry:
        return jsonify({"error": "Word not found"}), 404

    word_entry.votes += change
    db.session.commit()
    pending_deltas.add(word_text)
    return jsonify({"word": word_text, "votes": word_entry.votes, "success": True})

@words_bp.route("/check_word", methods=["POST"])
def check_word():
    data = request.get_json() or {}
    word_text = data.get("word", "").strip().lower()
    exists = Word.query.filter_by(word=word_text).first() is not None
    return jsonify({"exists": exists})
