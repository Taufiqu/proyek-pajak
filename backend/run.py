# backend/run.py
from app import create_app

app = create_app()

if __name__ == '__main__':
    # Gunakan debug dari config, jangan di-hardcode
    app.run(debug=app.config.get('DEBUG', False), port=5000)