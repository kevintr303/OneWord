# OneWord – Collaborative Word Experiment

**OneWord** is a fun, community-driven web application where users can submit a single word and vote on the best ones. Words remain on the board for 24 hours. Duplicate submissions are counted as upvotes, and users are limited in how frequently they can submit or vote.

Check out the live site at: [https://oneword.kevintran.dev](https://oneword.kevintran.dev)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Deployment Instructions](#deployment-instructions)
  - [Prerequisites](#prerequisites)
  - [Configuring Nginx as a Reverse Proxy](#configuring-nginx-as-a-reverse-proxy)
  - [Obtaining SSL Certificates](#obtaining-ssl-certificates)
  - [Setting Up a systemd Service](#setting-up-a-systemd-service)
- [Lessons Learned](#lessons-learned)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Submit & Vote:** Users can submit one word every 5 minutes. Duplicate submissions count as upvotes.
- **Time-Limited Content:** Words remain on the board for 24 hours before expiring.
- **Live Updates:** The application uses WebSockets (via Flask-SocketIO) to broadcast real-time vote updates.
- **Responsive Grid:** Words are displayed in a dynamic, zoomable grid.

---

## Tech Stack

- **Backend:** Flask, Flask-SocketIO, Flask-SQLAlchemy, Gunicorn (with Eventlet worker)
- **Database:** PostgreSQL
- **Frontend:** HTML, CSS (Bootstrap 5), JavaScript (ES6 modules)
- **Real-Time:** Socket.IO (client & server)
- **Deployment:** Gunicorn, Nginx, systemd, UNIX-based systems
- **Environment Management:** Python-dotenv for configuration

---

## Project Structure

```
oneword/
├── config.py             # App configuration and environment variables
├── app.py                # Entry point for local development
├── wsgi.py               # WSGI entry point for production (gunicorn)
├── requirements.txt      # Python dependencies
├── src/
│   ├── __init__.py       # Flask app factory & socketio setup
│   ├── extensions.py     # Extensions (db, socketio)
│   ├── models.py         # SQLAlchemy models
│   ├── routes/
│   │   └── words.py      # Routes for submitting, voting, and fetching words
│   ├── sockets.py        # Socket.IO event handlers and background tasks
│   └── utils/
│       └── delta_store.py # Temporary store for delta updates
├── static/
│   ├── css/styles.css    # Custom CSS styles (Bootstrap override)
│   ├── js/               # JavaScript files (helpers, main, word actions)
│   └── (other static assets)
└── templates/
    └── index.html        # Main HTML template
```

---

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kevintr303/oneword.git
   cd oneword
   ```

2. **Set up a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```ini
   DATABASE_URL=postgres://user:password@localhost:5432/oneworddb
   SECRET_KEY=your-secret-key
   FLASK_ENV=development
   ```

5. **Initialize the Database:**
   ```bash
   flask shell
   >>> from src.extensions import db
   >>> db.create_all()
   >>> exit()
   ```

6. **Run the App Locally:**
   ```bash
   python app.py
   ```
   Visit [http://localhost:10000](http://localhost:10000) to see the application.

---

## Deployment Instructions

### Prerequisites

- Preferably a UNIX-based system (Linux/macOS, cloud VM, or WSL)
- PostgreSQL installed or a managed PostgreSQL service
- Python 3.8+ installed
- Git installed
- Nginx installed

### Configuring Nginx as a Reverse Proxy

1. **Create an Nginx Configuration File:**
   ```nginx
   server {
       listen 80;
       server_name oneword.kevintran.dev;

       location / {
           proxy_pass http://127.0.0.1:10000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

2. **Enable the Configuration and Test Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Obtaining SSL Certificates

Use Certbot to obtain a free SSL certificate:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d oneword.kevintran.dev
```

### Setting Up a systemd Service

Create `/etc/systemd/system/oneword.service`:

```ini
[Unit]
Description=OneWord Flask Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/oneword
EnvironmentFile=/var/www/oneword/.env
ExecStart=/var/www/oneword/venv/bin/gunicorn -k eventlet -w 1 wsgi:app -b 127.0.0.1:10000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable oneword.service
sudo systemctl start oneword.service
```

---

## Lessons Learned

- **Real-time WebSockets** using Flask-SocketIO for live updates.
- **Database management** and schema setup with SQLAlchemy.
- **Deployment automation** with Gunicorn, Nginx, and systemd.
- **SSL/TLS setup** for secure connections with Let's Encrypt.
- **Rate-limiting and spam prevention** for fair user interaction.
- **Unix-based server management**, including process handling and environment variable setup.

---

## Environment Variables

```ini
DATABASE_URL=postgres://user:password@host:port/oneworddb
SECRET_KEY=your-secret-key
FLASK_ENV=production
```

---

## Contributing

Contributions are welcome! Fork and submit a pull request.

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**.

Full license text: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)
