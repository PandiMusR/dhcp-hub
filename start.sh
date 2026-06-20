#!/bin/bash
set -a
source /root/apps/DHCPHub/.env
set +a

cd /root/apps/DHCPHub

source backend/venv/bin/activate
cd backend
uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

cd /root/apps/DHCPHub/frontend
npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo "Backend: http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "API Docs: http://localhost:$BACKEND_PORT/docs"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
