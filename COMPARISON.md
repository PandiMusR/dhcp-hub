# DHCP Server: Linux Server vs MikroTik RouterOS

## Perbandingan untuk Implementasi

---

## Ringkasan Eksekutif

Rekomendasi: **Linux Server (Kea DHCP4)** — lebih stabil, scalable, dan maintainable untuk lingkungan dengan banyak subnet/lease. MikroTik RouterOS memiliki keterahandian resource (RAM/CPU) yang menjadi risiko operasional pada skala menengah-ke-besar.

---

## Perbandingan Teknis

| Aspek | Linux Server (Kea DHCP4) | MikroTik RouterOS |
|---|---|---|
| **Arsitektur** | Dedicated server, resource terpisah dari routing | Berbagi resource dengan routing, firewall, NAT |
| **RAM Usage** | ~50-100MB untuk 100+ subnet | RouterOS sering mengalami memory leak, RAM penuh pada konfigurasi kompleks |
| **CPU** | Multi-threaded, bisa scale horizontal | Single-threaded DHCP, terbatas core router |
| **Lease Database** | File CSV persistent, mudah backup/restore | In-memory, hilang saat reboot jika tidak di-export |
| **Subnet Limit** | Tidak ada batasan teknis (tergantung RAM server) | Praktis mulai bermasalah di 50+ subnet dengan traffic tinggi |
| **Konfigurasi** | JSON terpusat, bisa version control (Git) | CLI/API per-interface, sulit di-version control |
| **High Availability** | Bisa di-cluster, failover antar server | HA terbatas, butuh VRRP + sync manual |
| **Monitoring** | API lengkap, bisa integrasi Grafana/Prometheus | Monitoring terbatas, butuh tool eksternal |
| **Backup** | File JSON + CSV, mudah di-automate | Export binary, restore kadang bermasalah |
| **Update** | `apt upgrade`, zero-downtime possible | Firmware update = reboot = downtime |

---

## Analisis Biaya

| Komponen | Linux Server | MikroTik |
|---|---|---|
| **Hardware/Server** | Server 2VCPU / 2Gb RAM | Sudah ada (router existing) |
| **Lisensi** | Gratis (open source) | Sudah ada |
| **Maintenance** | ~2 jam/bulan (update, monitoring) | ~4 jam/bulan (troubleshooting, manual backup) |
| **Downtime Risk** | Rendah (terisolasi dari routing) | Tinggi (RAM penuh = routing down) |
| **Scalability Cost** | Linear (tambah Spesifikasi Server) | Non-linear (ganti router lebih besar) |

---

## Rekomendasi

**Gunakan Linux Server (Kea DHCP4)** karena:

1. **Isolasi risiko** — DHCP server terpisah dari routing. Masalah DHCP tidak mengganggu routing, dan sebaliknya.

2. **Stabilitas** — Tidak ada risiko RAM penuh yang menjadi pain point MikroTik. Resource dedicated untuk DHCP.

3. **Skalabilitas** — Bisa handle pertambahan subnet/lease tanpa ganti hardware.

4. **Operasi via Web UI** — DHCP Hub memungkinkan tim non-technical manage DHCP via web, tanpa perlu SSH ke router atau server.

5. **Audit trail** — Semua perubahan config tercatat, bisa di-rollback, ada backup otomatis.

6. **Cost effective** — Server 2VCPU / 2Gb RAM sudah cukup untuk melayani ratusan subnet. Jauh lebih andal dari risiko downtime MikroTik.

7. **Troubleshooting mudah** — Karena DHCP server terisolasi di satu tempat, diagnosa masalah bisa dilakukan dari satu titik. Log Kea terpusat, lease bisa di-query via API atau web UI, dan config bisa di-preview sebelum diterapkan. Tidak perlu SSH ke banyak router atau cek log tersebar. Semua perubahan tercatat dengan timestamp, sehingga bisa dilacak kapan dan siapa yang mengubah konfigurasi.

---

## Arsitektur yang Diusulkan

```
┌─────────────────────────────────────────────────────┐
│                    Server (DHCP Hub)                │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐   │
│  │  Web UI     │  │  Kea DHCP4   │  │ WireGuard │   │
│  │  (Manage)   │──│  (Server)    │──│ (Tunnel)  │   │
│  └─────────────┘  └──────────────┘  └──────┬────┘   │
└──────────────────────────┬─────────────────┴────────┘
                           │                  
        ┌──────────────────┴─────────────────┐
        │                 L3                 │
        └──┬───────────────┬─────────────┬───┘
           │               │             │
    ┌──────┴──────┐ ┌──────┴─────┐ ┌─────┴──────┐
    │  Router A   │ │  Router B  │ │  Router N  │
    │  (Relay)    │ │  (Relay)   │ │  (Relay)   │
    │  10.51.0.1  │ │  10.67.0.1 │ │  10.x.0.1  │
    └──────┬──────┘ └─────┬──────┘ └─────┬──────┘
           │              │              │
    ┌──────┴──────┐ ┌─────┴──────┐ ┌─────┴──────┐
    │  Hotspot A  │ │  Hotspot B │ │  Hotspot N │
    └──────┬──────┘ └─────┬──────┘ └─────┬──────┘
           │              │              │
    ┌──────┴──────┐ ┌─────┴──────┐ ┌─────┴──────┐
    │   Client    │ │   Client   │ │   Client   │
    │  Hotspot A  │ │  Hotspot B │ │  Hotspot N │
    └─────────────┘ └────────────┘ └────────────┘
```

**Komponen:**
- Server: Ubuntu Server 22.04+, 2 vCPU, 2GB RAM (cukup untuk 500+ subnet)
- Kea DHCP4: Open source, enterprise-grade DHCP server
- WireGuard: VPN tunnel untuk P2P ke router DHCP Relay
- DHCP Hub: Web UI custom untuk manajemen DHCP

---

## Data Aktual: Resource Usage

### Spesifikasi Server Saat Ini

| Komponen | Nilai |
|---|---|
| OS | Ubuntu 22.04 (kernel 6.8.0) |
| CPU | 2 core |
| RAM | 2 GB |
| Disk | 100 GB |
| Uptime | 6+ hari tanpa restart |

### Resource Usage per Service

| Service | RAM (RSS) | Keterangan |
|---|---|---|
| Kea DHCP4 | 16 MB | DHCP server (3 subnet, 350 lease) |
| Web UI (Backend) | 77 MB | Python FastAPI + uvicorn |
| **Total** | **93 MB** | **4.6% dari total RAM Server** |

### Disk Usage (DHCP Hub Only)

| Item | Size |
|---|---|
| Database (SQLite) | 16 KB |
| Lease CSV | 300 KB |
| Kea Config | 2 KB |
| Config Backups | 16 KB |
| Backend Source | 122 KB |
| Frontend Build | 371 KB |
| **Total** | **~830 KB** |

### Estimasi Skala Peak (40,000 Lease, 141 Subnet)

Berdapatkan data aktual: 350 unique leases, 3 subnet, Kea RSS 16 MB, PSS 9.4 MB.

| Metrik | Saat Ini (350 lease) | Peak (40,000 lease) |
|---|---|---|
| **Subnet** | 3 | 141 |
| **Unique leases** | 350 | 40,000 |
| **CSV rows** (3 hari) | ~3,600 | ~412,000 |
| **CSV file size** | ~300 KB | **~35 MB** |
| **RAM Kea** | 16 MB | **~290 MB** |
| **RAM Web UI** | 77 MB | 77 MB (konstan) |
| **RAM Total** | 93 MB | **~367 MB** |

**Formula estimasi:**
- CSV rows = unique leases × 10.3 (renewal ratio per 3 hari)
- CSV size = CSV rows × 85 bytes/rata-rata
- RAM Kea = base overhead (7 MB) + (leases × 7 KB) + (subnets × 15 KB)

**Kesimpulan:** Pada peak 40,000 lease dengan 141 subnet, total RAM ~367 MB (18.4% dari server 2 GB). Masih sangat aman dengan sisa 1.6 GB untuk OS dan buffer. CSV 35 MB tidak signifikan di disk 100 GB.