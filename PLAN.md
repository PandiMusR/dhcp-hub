# DHCP Hub — Technical Documentation

## Arsitektur Sistem

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

## Cara Kerja DHCP Relay → Kea

```
Client          Router/Relay              Server (Kea)
  │                  │                      │
  │──Discover──────▶│                      │
  │                  │──Discover(+giaddr)──▶│
  │                  │                      │
  │                  │◀──Offer─────────────│
  │◀──Offer─────────│                      │
  │                  │                      │
  │──Request───────▶│                      │
  │                  │──Request(+giaddr)───▶│
  │                  │                      │
  │                  │◀──ACK───────────────│
  │◀──ACK───────────│                      │
```

Kea menentukan subnet berdasarkan **giaddr** yang dikirim oleh DHCP Relay. giaddr harus berada dalam rentang subnet yang terdaftar di Kea.

---

## Stack Teknologi

| Komponen | Teknologi |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), aiosqlite, Pydantic |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Radix UI |
| Database | SQLite |
| DHCP | Kea DHCP4 (memfile backend, CSV lease) |
| VPN | WireGuard |
| Auth | HMAC-signed token (custom, no JWT library) |

---

## API Endpoints

### Authentication
```
POST   /api/auth/login              - Login, dapat token
GET    /api/auth/verify              - Verifikasi token
```

### Hotspot / Subnet
```
GET    /api/hotspots                 - List semua hotspot
POST   /api/hotspots                 - Tambah hotspot baru
GET    /api/hotspots/:id             - Detail hotspot
PUT    /api/hotspots/:id             - Update hotspot
DELETE /api/hotspots/:id             - Hapus hotspot
PATCH  /api/hotspots/:id/toggle      - Enable/Disable
```

### Host Reservations
```
GET    /api/hotspots/:id/reservations       - List reservasi
POST   /api/hotspots/:id/reservations       - Tambah reservasi
PUT    /api/hotspots/:id/reservations/:rid  - Update reservasi
DELETE /api/hotspots/:id/reservations/:rid  - Hapus reservasi
```

### Lease Monitoring
```
GET    /api/leases                   - Semua lease aktif (dari CSV)
GET    /api/leases/stats             - Statistik global + per subnet
GET    /api/leases/subnet/:id        - Lease per subnet
```

### Config Management
```
GET    /api/config/preview           - Preview config yang akan di-generate
POST   /api/config/apply             - Apply config & reload Kea (SIGHUP)
GET    /api/config/current           - Config Kea saat ini
GET    /api/config/backups           - List backup config
POST   /api/config/rollback/:file    - Rollback ke backup tertentu
```

### WireGuard
```
GET    /api/wireguard                - Config WireGuard dari DB
POST   /api/wireguard                - Buat config baru
PUT    /api/wireguard                - Update config
GET    /api/wireguard/preview        - Preview config + AllowedIPs
POST   /api/wireguard/apply          - Apply config (syncconf/wg-quick)
GET    /api/wireguard/status         - Status interface (wg show)
GET    /api/wireguard/public-key     - Public key VPS
POST   /api/wireguard/init           - Inisialisasi wg1 (auto-generate keys)
```

### System
```
GET    /api/system                   - Resource usage (RAM, disk, service status)
GET    /api/health                   - Health check
```

---

## Alur Penggunaan

```
Admin tambah hotspot baru di Web UI
        │
        ▼
Data disimpan ke database (SQLite)
        │
        ▼
WireGuard AllowedIPs + routes auto-sync
        │
        ▼
Admin klik "Apply Config" di halaman Config
        │
        ▼
System generate /etc/kea/kea-dhcp4.conf
        │
        ▼
Backup config lama → /etc/kea/backups/
        │
        ▼
Write config baru, validate JSON
        │
        ▼
Reload Kea (SIGHUP) — zero downtime
        │
        ▼
Admin set DHCP Relay di router MikroTik
        │
        ▼
Client di hotspot mulai dapat IP dari server
```

---

## Data Models

### Hotspot
| Field | Type | Contoh |
|---|---|---|
| name | string | Hotspot Kantor A |
| subnet | string | 10.51.0.0/16 |
| gateway | string | 10.51.0.1 |
| pool_start | string | 10.51.0.10 |
| pool_end | string | 10.51.255.254 |
| dns | string | 1.1.1.1, 8.8.8.8 |
| lease_time | integer | 86400 (detik) |
| enabled | boolean | true |
| notes | string | opsional |

### HostReservation
| Field | Type | Contoh |
|---|---|---|
| hotspot_id | integer (FK) | 1 |
| hw_address | string | AA:BB:CC:DD:EE:FF |
| ip_address | string | 10.51.0.100 |
| hostname | string | printer-kantor |
| notes | string | opsional |

### WireGuardConfig
| Field | Type | Contoh |
|---|---|---|
| interface_name | string | wg1 |
| listen_port | integer | 51825 |
| vps_address | string | 10.255.200.1/30 |
| vps_private_key | string | (auto-generated) |
| router_public_key | string | dari router |
| router_endpoint | string | 103.73.74.80:51825 |
| router_address | string | 10.255.200.2/30 |

---

## Catatan Penting

1. Setiap hotspot harus punya subnet berbeda — tidak boleh overlap
2. giaddr router harus satu subnet dengan pool
3. WireGuard harus aktif sebelum Kea start
4. Backup config otomatis sebelum setiap perubahan
5. Kea auto-reload (SIGHUP) setelah config apply
6. AllowedIPs WireGuard auto-sync saat hotspot ditambah/diubah/dihapus
