import time
import logging
from flask import request
from src.extensions import socketio
from src.utils.delta_store import pending_deltas
from src.routes.words import fetch_words_data

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

client_view_ranges = {}

@socketio.on('connect')
def handle_connect():
    client_view_ranges[request.sid] = None
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    client_view_ranges.pop(request.sid, None)
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('update_view_range')
def handle_update_view_range(data):
    min_rank = data.get('min')
    max_rank = data.get('max')
    client_view_ranges[request.sid] = (min_rank, max_rank)
    logger.info(f"Updated view range for {request.sid}: {client_view_ranges[request.sid]}")

def start_delta_broadcaster(app):
    while True:
        time.sleep(5)
        with app.app_context():
            if pending_deltas:
                full_data = fetch_words_data("", None, 0, None)
                updates = [item for item in full_data['words'] if item['word'] in pending_deltas]
                if updates:
                    socketio.emit("batch_update", {"updates": updates})
                pending_deltas.clear()
