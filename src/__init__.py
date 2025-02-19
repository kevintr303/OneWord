from flask import Flask, render_template
from config import Config
from src.extensions import db, socketio
from src.routes.words import words_bp

def create_app():
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.from_object(Config)

    db.init_app(app)
    socketio.init_app(app)

    with app.app_context():
        db.create_all()

    app.register_blueprint(words_bp)

    @app.route("/")
    def index():
        return render_template("index.html")

    from src.sockets import start_delta_broadcaster
    socketio.start_background_task(start_delta_broadcaster, app)

    return app
