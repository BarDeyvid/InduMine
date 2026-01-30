#!/bin/sh
set -e

HOST=${DB_HOST:-db}
PORT=${DB_PORT:-3306}

echo "Waiting for database at $HOST:$PORT..."

python - <<PY
import socket, os, time, sys
host=os.environ.get('DB_HOST','db')
port=int(os.environ.get('DB_PORT',3306))
for i in range(60):
    try:
        s=socket.create_connection((host,port),2)
        s.close()
        print('Database reachable')
        sys.exit(0)
    except Exception as e:
        print('Waiting for DB...', i+1)
        time.sleep(2)
print('Database not reachable after timeout')
sys.exit(1)
PY

echo "Starting Uvicorn..."
exec uvicorn app:app --host 0.0.0.0 --port 8000
