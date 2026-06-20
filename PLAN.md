# DHCP Hub — Kea DHCP Manager

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS (DHCP Hub)                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    DHCP Hub (Web UI)                       │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │  CRUD       │  │  Monitoring  │  │  Auto-Generate   │  │  │
│  │  │  Subnet/    │  │  Lease       │  │  Config Kea      │  │  │
│  │  │  Hotspot    │  │  Real-time   │  │                  │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │  │
│  │         │                │                    │            │  │
│  │         └────────────────┼────────────────────┘            │  │
│  │                          │                                 │  │
│  │                    ┌─────▼──────┐                          │  │
│  │                    │  Kea API   │                          │  │
│  │                    │  (Ctrl     │                          │  │
│  │                    │  Agent)    │                          │  │
│  │                    └─────┬──────┘                          │  │
│  └──────────────────────────┼─────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │                 Kea DHCP4 Server                            │  │
│  │              Interface: wg0 (WireGuard)                     │  │
│  │                                                             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │  │
│  │  │ Subnet 1     │ │ Subnet 2     │ │ Subnet N     │        │  │
│  │  │ 10.198.0.0/24│ │ 10.199.0.0/24│ │ 10.x.x.0/24 │        │  │
│  │  │ Hotspot A    │ │ Hotspot B    │ │ Hotspot N    │        │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              ▲                ▲                ▲
              │                │                │
         WireGuard        WireGuard        WireGuard
         Tunnel           Tunnel           Tunnel
              │                │                │
       ┌──────────┐    ┌──────────┐     ┌──────────┐
       │ Router A │    │ Router B │     │ Router N │
       │ giaddr:  │    │ giaddr:  │     │ giaddr:  │
       │10.198.0.1│    │10.199.0.1│     │10.x.x.1 │
       └────┬─────┘    └────┬─────┘     └────┬─────┘
            │               │                │
      ┌─────┴─────┐  ┌─────┴─────┐   ┌─────┴─────┐
      │ Hotspot A │  │ Hotspot B │   │ Hotspot N │
      │  Clients  │  │  Clients  │   │  Clients  │
      └───────────┘  └───────────┘   └───────────┘
```

## Cara Kerja DHCP Relay → Kea

```
1. Client mengirim DHCP Discover (broadcast)
2. Router (DHCP Relay) menangkap broadcast
3. Relay mengirim unicast ke VPS dengan menyertakan:
   - giaddr = IP interface router di subnet client
   - Relay Agent Info (Option 82)
4. Kea menerima request di wg0
5. Kea mencocokkan giaddr dengan subnet yang terdaftar
6. Kea mengirim DHCP Offer kembali ke relay
7. Relay meneruskan ke client
```

```
Client          Router/Relay              VPS (Kea)
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

## Bagaimana Kea Memilih Subnet

Kea menentukan subnet berdasarkan **giaddr** yang dikirim oleh DHCP Relay:

| Router Relay | giaddr | Subnet Dipilih | Pool IP |
|---|---|---|---|
| Router Hotspot A | 10.198.0.1 | 10.198.0.0/24 | 10.198.0.10 – 10.198.0.254 |
| Router Hotspot B | 10.199.0.1 | 10.199.0.0/24 | 10.199.0.10 – 10.199.0.254 |
| Router Hotspot C | 10.200.0.1 | 10.200.0.0/24 | 10.200.0.10 – 10.200.0.254 |

> **Rule:** giaddr harus berada dalam rentang subnet yang terdaftar di Kea. Jika tidak match, Kea akan menolak request.

---

## Contoh Konfigurasi Kea (Multi-Subnet)

```json
{
  "Dhcp4": {
    "interfaces-config": {
      "interfaces": ["wg0"],
      "dhcp-socket-type": "udp"
    },
    "control-socket": {
      "socket-type": "unix",
      "socket-name": "/run/kea/kea4-ctrl.sock"
    },
    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/kea-leases4.csv",
      "lfc-interval": 3600
    },
    "valid-lifetime": 14400,
    "renew-timer": 3600,
    "rebind-timer": 7200,
    "subnet4": [
      {
        "id": 1,
        "subnet": "10.198.0.0/24",
        "pools": [{ "pool": "10.198.0.10 - 10.198.0.254" }],
        "option-data": [
          { "name": "routers", "data": "10.198.0.1" },
          { "name": "domain-name-servers", "data": "1.1.1.1, 8.8.8.8" }
        ]
      },
      {
        "id": 2,
        "subnet": "10.199.0.0/24",
        "pools": [{ "pool": "10.199.0.10 - 10.199.0.254" }],
        "option-data": [
          { "name": "routers", "data": "10.199.0.1" },
          { "name": "domain-name-servers", "data": "1.1.1.1, 8.8.8.8" }
        ]
      }
    ]
  }
}
```

---

## Rencana Fitur DHCP Hub

### 1. CRUD Subnet / Hotspot

Manage data hotspot dan subnet melalui web UI:

| Field | Contoh | Keterangan |
|---|---|---|
| Nama Hotspot | Hotspot Kantor A | Label identifikasi |
| Subnet | 10.198.0.0/24 | CIDR subnet |
| Gateway | 10.198.0.1 | IP router (giaddr) |
| Pool Start | 10.198.0.10 | Awal range IP |
| Pool End | 10.198.0.254 | Akhir range IP |
| DNS | 1.1.1.1, 8.8.8.8 | DNS server untuk client |
| Lease Time | 14400 | Durasi lease (detik) |
| Status | Active / Disabled | Aktifkan/nonaktifkan subnet |

**Fitur:**
- Tambah hotspot baru → otomatis generate subnet entry di config Kea
- Edit konfigurasi hotspot → update config Kea
- Hapus hotspot → hapus subnet dari config Kea
- Enable/Disable → comment/uncomment subnet tanpa hapus data
- Validasi: cek overlap subnet, cek pool dalam range subnet

### 2. Monitoring Lease Real-time

Dashboard monitoring yang menampilkan:

**Per Subnet / Hotspot:**
- Jumlah lease aktif
- Jumlah IP tersedia
- Utilisasi pool (%)
- Daftar client (IP, MAC, hostname, lease expiry)

**Global:**
- Total lease aktif di semua subnet
- Total subnet aktif
- Grafik utilisasi per hotspot

**Cara ambil data:**
- Kea Control Agent API (`/run/kea/kea4-ctrl.sock` atau HTTP)
- Command: `lease4-get-all`, `lease4-get-by-subnet`
- Polling setiap 5-10 detik atau pakai WebSocket

### 3. Auto-Generate Config Kea

Sistem generate file `/etc/kea/kea-dhcp4.conf` otomatis dari data di database:

**Flow:**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Data di DB  │────▶│  Template    │────▶│  Generate JSON   │
│  (hotspots)  │     │  Engine      │     │  Config          │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │  Validate JSON   │
                                          └────────┬─────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │  Write to        │
                                          │  /etc/kea/       │
                                          │  kea-dhcp4.conf  │
                                          └────────┬─────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │  Reload Kea      │
                                          │  (SIGHUP / API)  │
                                          └──────────────────┘
```

**Fitur:**
- Generate config dari data hotspot di database
- Backup config lama sebelum overwrite
- Validasi JSON sebelum apply
- Reload Kea tanpa restart (SIGHUP atau via Control Agent)
- Rollback ke config sebelumnya jika gagal
- Preview config sebelum apply

---

## Stack Teknologi

| Komponen | Teknologi |
|---|---|
| Backend | Python (FastAPI) / Node.js (Express/Fastify) |
| Frontend | React / Vue / Svelte |
| Database | SQLite / PostgreSQL |
| Kea Integration | Kea Control Agent (REST API / Unix Socket) |
| Real-time | WebSocket / SSE |
| Config Format | JSON |

---

## API Endpoints (Draft)

### Hotspot / Subnet
```
GET    /api/hotspots              - List semua hotspot
POST   /api/hotspots              - Tambah hotspot baru
GET    /api/hotspots/:id          - Detail hotspot
PUT    /api/hotspots/:id          - Update hotspot
DELETE /api/hotspots/:id          - Hapus hotspot
PATCH  /api/hotspots/:id/toggle   - Enable/Disable
```

### Lease Monitoring
```
GET    /api/leases                 - Semua lease aktif
GET    /api/leases/subnet/:id      - Lease per subnet
GET    /api/stats                  - Statistik global
GET    /api/stats/subnet/:id       - Statistik per subnet
WS     /api/ws/leases              - Real-time lease updates
```

### Config Management
```
POST   /api/config/generate        - Generate config dari DB
GET    /api/config/preview          - Preview config yang akan di-generate
POST   /api/config/apply            - Apply config & reload Kea
POST   /api/config/rollback         - Rollback ke config sebelumnya
GET    /api/config/current          - Ambil config Kea saat ini
GET    /api/config/backups          - List backup config
```

---

## Alur Penggunaan

```
Admin tambah hotspot baru di Web UI
        │
        ▼
Data disimpan ke database
        │
        ▼
Admin klik "Apply Config"
        │
        ▼
System generate /etc/kea/kea-dhcp4.conf
        │
        ▼
Backup config lama → /etc/kea/backups/
        │
        ▼
Validate JSON config
        │
        ▼
Write config baru ke /etc/kea/kea-dhcp4.conf
        │
        ▼
Reload Kea (SIGHUP / Control Agent)
        │
        ▼
Admin set DHCP Relay di router manual
        │
        ▼
Client di hotspot mulai dapat IP dari VPS
```

---

## Catatan Penting

1. **Setiap hotspot harus punya subnet berbeda** — tidak boleh overlap
2. **giaddr router harus satu subnet dengan pool** — contoh: router 10.198.0.1 untuk subnet 10.198.0.0/24
3. **WireGuard harus aktif** sebelum Kea start
4. **Backup config sebelum setiap perubahan**
5. **Test di 1-2 hotspot dulu** sebelum migrasi 50+ hotspot
6. **Monitoring alert** jika lease habis atau Kea down
