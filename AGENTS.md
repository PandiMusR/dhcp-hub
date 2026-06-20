# DHCP Hub

## Commands

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8051 --reload
```

### Frontend
```bash
cd frontend
npm run dev -- --port 8050
npm run build
npm run lint
```

### Start Both
```bash
./start.sh
```

## Config
Edit `.env` di root untuk ubah port:
```
BACKEND_PORT=8051
FRONTEND_PORT=8050
```

## Stack
- Backend: Python FastAPI + SQLite
- Frontend: React + Vite + shadcn/ui
- DHCP: Kea DHCP4 + Control Agent
