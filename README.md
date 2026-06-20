# DHCP Hub

Web-based management UI for Kea DHCP4 Server. Manage hotspots, monitor leases, configure WireGuard tunnels, and generate Kea DHCP configs — all from a single web interface.

```
┌─────────────────────────────────────────────────────┐
│                    Server (DHCP Hub)                │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐   │
│  │  Web UI     │  │  Kea DHCP4   │  │ WireGuard │   │
│  │  (Manage)   │──│  (Server)    │──│ (Tunnel)  │   │
│  └─────────────┘  └──────────────┘  └──────┬────┘   │
└────────────────────────────────────────────┼────────┘
                                             │
        ┌────────────────────────────────────┘
        │
   ┌────┴─────┐  ┌──────────┐  ┌──────────┐
   │ Router A │  │ Router B │  │ Router N │
   │ (Relay)  │  │ (Relay)  │  │ (Relay)  │
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │              │              │
   ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐
   │ Hotspot  │  │ Hotspot  │  │ Hotspot  │
   └──────────┘  └──────────┘  └──────────┘
```

## Features

- **Hotspot/Subnet Management** — CRUD subnet dengan auto-sync WireGuard AllowedIPs dan routes
- **Lease Monitoring** — Real-time monitoring lease aktif, filter per hotspot, search by IP/MAC/hostname
- **Host Reservations** — Static IP mapping per MAC address
- **WireGuard Config** — Generate, preview, apply config WireGuard tunnel ke router MikroTik
- **Kea Config Management** — Generate Kea DHCP4 config dari database, preview, apply, backup, rollback
- **System Monitor** — Monitor RAM, disk, dan status service (Kea + Backend)
- **Auth** — Token-based authentication dengan HMAC signing
- **Auto-reload** — Kea otomatis reload config setelah apply (SIGHUP)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), aiosqlite, Pydantic |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Radix UI |
| Database | SQLite |
| DHCP | Kea DHCP4 (Control Agent + CSV lease) |
| VPN | WireGuard |

## Requirements

- Ubuntu Server 22.04+
- Python 3.10+
- Node.js 18+
- Kea DHCP4 Server
- WireGuard

## Quick Start

### 1. Clone repository

```bash
git clone https://github.com/PandiMusR/dhcp-hub.git
cd dhcp-hub
```

### 2. Setup environment

```bash
cp .env.example .env   # atau buat manual
```

```env
BACKEND_PORT=8051
FRONTEND_PORT=8050
ADMIN_USER=admin
ADMIN_PASS=<your-password>
AUTH_SECRET=<random-secret>
```

### 3. Setup backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Setup frontend

```bash
cd frontend
npm install
npm run build
```

### 5. Run (development)

```bash
./start.sh
```

Access at `http://localhost:8050`

### 6. Run (production)

Backend serves everything on single port:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8051
```

Access at `http://localhost:8051`

## Systemd Services

```bash
# Backend (serves API + frontend static files)
sudo systemctl enable dhcp-hub-backend
sudo systemctl start dhcp-hub-backend

# Kea DHCP4
sudo systemctl enable kea-dhcp4-server
sudo systemctl start kea-dhcp4-server
```

Manage web UI:
```bash
./webui.sh start|stop|restart|status
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, get token |
| GET | `/api/health` | Health check |
| GET/POST | `/api/hotspots` | List/create hotspots |
| GET/PUT/DELETE | `/api/hotspots/{id}` | Get/update/delete hotspot |
| PATCH | `/api/hotspots/{id}/toggle` | Enable/disable hotspot |
| GET/POST | `/api/hotspots/{id}/reservations` | List/create reservations |
| GET | `/api/leases` | All active leases |
| GET | `/api/leases/stats` | Lease statistics |
| GET | `/api/leases/subnet/{id}` | Leases by subnet |
| GET | `/api/config/preview` | Preview Kea config |
| POST | `/api/config/apply` | Apply config & reload Kea |
| GET | `/api/wireguard` | Get WireGuard config |
| POST | `/api/wireguard/apply` | Apply WireGuard config |
| GET | `/api/system` | System resource info |

## Project Structure

```
DHCPHub/
├── backend/
│   ├── main.py              # FastAPI app, middleware, static serving
│   ├── auth.py              # Authentication (HMAC token)
│   ├── database.py          # SQLAlchemy async engine
│   ├── models.py            # ORM models (Hotspot, Reservation, WireGuard)
│   ├── schemas.py           # Pydantic validation schemas
│   ├── routers/
│   │   ├── hotspots.py      # Hotspot CRUD
│   │   ├── reservations.py  # Host reservation CRUD
│   │   ├── leases.py        # Lease monitoring
│   │   ├── config.py        # Kea config management
│   │   ├── wireguard.py     # WireGuard management
│   │   └── system.py        # System monitoring
│   └── services/
│       ├── kea_api.py       # Kea API client (CSV + socket)
│       ├── kea_config.py    # Kea config generator
│       └── wireguard.py     # WireGuard config generator
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Hotspots, Leases, Config, WireGuard, System
│       ├── components/      # UI components (hotspot form, table, reservations)
│       └── lib/             # API client, utils, toast
├── .env                     # Environment config
├── start.sh                 # Dev launcher (backend + frontend)
├── webui.sh                 # Service manager (start/stop/restart/status)
└── COMPARISON.md            # Linux Server vs MikroTik comparison
```

## Default Credentials

```
Username: admin
Password: <check your .env file>
```

## License

Internal use only.
