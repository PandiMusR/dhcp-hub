# DHCP Hub — UX Improvement Plan

## Overview

Rencana perbaikan UX untuk DHCP Hub Web UI agar lebih intuitif bagi non-technical users.

---

## Phase 1: Core UX Fixes (P0)

### 1.1 Toast Notification System
**File:** `frontend/src/components/ui/toast.tsx`, `frontend/src/App.tsx`
**Masalah:** Semua error/success pakai `alert()` atau `console.error` — user tidak melihat feedback.
**Solusi:**
- Aktifkan `@radix-ui/react-toast` (sudah diinstall)
- Buat wrapper `useToast()` hook
- Ganti semua `alert()` di Config.tsx, WireGuard.tsx, HotspotForm.tsx, ReservationManager.tsx
- Ganti semua `console.error` dengan toast error
- Tampilkan success toast setelah create/update/delete hotspot, apply config, dll

### 1.2 Fix Dashboard Progress Bar
**File:** `frontend/src/pages/Dashboard.tsx`
**Masalah:** Bar chart hardcode `254` sebagai max — subnet `/16` (65534 host) bar tidak pernah terisi.
**Solusi:**
- Hitung pool size dari data hotspots (pool_end - pool_start)
- Atau tampilkan angka absolut saja tanpa progress bar
- Tambah label "X dari Y IP terpakai" di samping bar

### 1.3 Skeleton Loading
**File:** `frontend/src/pages/Dashboard.tsx`, `Hotspots.tsx`, `Leases.tsx`
**Masalah:** Loading state hanya text "Loading..." — tidak memberi indikasi visual struktur halaman.
**Solusi:**
- Gunakan `skeleton.tsx` yang sudah ada di `components/ui/`
- Tambah skeleton di Dashboard (card placeholders), HotspotTable (row placeholders), Leases (row placeholders)

---

## Phase 2: Form & Input Clarity (P1)

### 2.1 HotspotForm Help Text
**File:** `frontend/src/components/hotspots/HotspotForm.tsx`
**Masalah:** Field teknis (CIDR, gateway, pool) tanpa penjelasan.
**Solusi:**
- Tambah `<p className="text-xs text-muted-foreground">` di bawah setiap field:
  - Subnet: "Jaringan dalam format CIDR, contoh: 10.51.0.0/16"
  - Gateway: "IP address router di subnet ini, contoh: 10.51.0.1"
  - Pool Start/End: "Range IP yang akan dibagikan ke client"
  - Lease Time: "Durasi IP dipinjam ke client (detik). 86400 = 24 jam"
- Tambah auto-suggest: saat user isi subnet, otomatis suggest gateway (x.x.x.1), pool_start (x.x.x.10), pool_end (x.x.x.254)

### 2.2 Lease Monitoring Enhancements
**File:** `frontend/src/pages/Leases.tsx`
**Masalah:** MAC/Expire text kecil, format expire tidak intuitif, tidak ada search.
**Solusi:**
- Tambah kolom "Sisa Waktu" dengan relative time: "2 jam lagi" atau "Expired 2 jam lalu"
- Hilangkan `text-xs` dari kolom MAC dan Expire
- Tambah search input di header card untuk filter by IP/MAC/hostname
- Tambah label "Filter:" di samping dropdown hotspot
- Highlight row: hijau muda untuk active, merah muda untuk expired

### 2.3 HotspotTable Pool Display
**File:** `frontend/src/components/hotspots/HotspotTable.tsx`
**Masalah:** Pool menampilkan start/end terpisah tanpa label.
**Solusi:**
- Tampilkan sebagai `10.51.0.10 – 10.51.255.254` (dash separator, satu cell)
- Atau dengan label: "Dari 10.51.0.10\nSampai 10.51.255.254"

### 2.4 HotspotTable Action Labels
**File:** `frontend/src/components/hotspots/HotspotTable.tsx`
**Masalah:** Icon-only buttons sulit dipahami user awam.
**Solusi:**
- Tambah text label di samping icon: "Static IP", "Edit", "Hapus"
- Atau gunakan Button dengan text (bukan size="icon")

---

## Phase 3: Config & WireGuard UX (P2)

### 3.1 Config Page Wizard
**File:** `frontend/src/pages/Config.tsx`
**Masalah:** 4 tombol sejajar tanpa urutan yang jelas.
**Solusi:**
- Reorganisasi menjadi 2 section:
  - "Config Baru": tombol Preview → Apply (dengan penjelasan urutan)
  - "Riwayat": tombol Config Saat Ini + Backup
- Ganti `confirm()` dengan Dialog component
- Tambah penjelasan: "Preview untuk melihat config yang akan di-generate. Apply untuk menerapkan ke Kea DHCP server."
- Tambah syntax highlighting di JSON preview (atau minimal format dengan warna berbeda untuk key/value)

### 3.2 WireGuard Simplification
**File:** `frontend/src/pages/WireGuard.tsx`
**Masalah:** Form terlalu teknis, raw `wg show` output.
**Solusi:**
- Pisahkan menjadi "Basic" dan "Advanced" section:
  - Basic: VPS Address, Router Address, Router Endpoint, Router Public Key
  - Advanced: Interface Name, Listen Port, VPS Private Key
- Tambah step-by-step guide di atas form:
  ```
  1. Isi config di bawah
  2. Copy "VPS Public Key" ke router MikroTik
  3. Klik "Apply" untuk mengaktifkan
  ```
- Parse `wg show` output menjadi human-readable:
  - "Status: Online"
  - "Handshake terakhir: 2 menit lalu"
  - "Data: 1.2 KB terkirim, 3.4 KB diterima"
- Tambah copy-to-clipboard button dengan visual feedback (checkmark setelah copy)

### 3.3 Confirmation Dialogs
**File:** `frontend/src/pages/Config.tsx`, `WireGuard.tsx`
**Masalah:** `confirm()` browser native tidak konsisten dengan design system.
**Solusi:**
- Buat reusable `<ConfirmDialog>` component
- Ganti semua `confirm()` dengan ConfirmDialog
- Tampilkan detail aksi yang akan dilakukan (bukan hanya "Are you sure?")

---

## Phase 4: Navigation & Layout (P2)

### 4.1 Responsive Navbar
**File:** `frontend/src/App.tsx`
**Masalah:** Navbar horizontal overflow di mobile.
**Solusi:**
- Di mobile (< 768px): tampilkan hamburger menu icon
- Dropdown menu dengan nav items
- Atau: tampilkan hanya icon (tanpa label) di tablet, hamburger di mobile

### 4.2 Empty State Guidance
**File:** `frontend/src/pages/Dashboard.tsx`, `Hotspots.tsx`
**Masalah:** Kalau belum ada data, user tidak tahu harus mulai dari mana.
**Solusi:**
- Dashboard kosong: tampilkan card "Selamat Datang di DHCP Hub" dengan CTA:
  - "Mulai tambah hotspot" → navigasi ke halaman Hotspot
  - "Setup WireGuard" → navigasi ke halaman WireGuard
- Hotspot kosong: sudah ada text, tambah icon illustration

### 4.3 Breadcrumb / Page Title
**File:** `frontend/src/App.tsx`
**Masalah:** Hanya ada judul halaman tanpa konteks.
**Solusi:**
- Tambah subtitle deskripsi di bawah judul halaman:
  - Dashboard: "Ringkasan seluruh jaringan DHCP"
  - Hotspot: "Kelola subnet dan hotspot"
  - Lease: "Monitor client yang mendapat IP"
  - WireGuard: "Konfigurasi tunnel ke router"
  - Config: "Kelola config Kea DHCP server"

---

## Phase 5: Polish & Accessibility (P3)

### 5.1 Dark Mode Toggle
**File:** `frontend/src/App.tsx`, `frontend/src/index.css`
**Masalah:** CSS sudah support `.dark` class tapi tidak ada toggle.
**Solusi:**
- Tambah toggle button di header (icon Sun/Moon)
- Simpan preference di `localStorage`
- Default: mengikuti system preference

### 5.2 Aria Labels
**File:** Semua file component
**Masalah:** Icon-only buttons tidak punya `aria-label`.
**Solusi:**
- Tambah `aria-label` pada semua icon-only buttons
- Tambah `role` attributes pada interactive elements
- Pastikan keyboard navigation berfungsi (Tab, Enter, Escape)

### 5.3 Password Management
**File:** `frontend/src/pages/Config.tsx` (tambah section), `backend/auth.py`
**Masalah:** Password hanya di `.env`, tidak bisa ganti dari UI.
**Solusi:**
- Tambah endpoint `POST /api/auth/change-password`
- Tambah form "Ganti Password" di halaman Config (section "Keamanan")
- Require old password sebelum set new password

### 5.4 Token Expiry Warning
**File:** `frontend/src/App.tsx`
**Masalah:** Auto-logout tanpa warning.
**Solusi:**
- Decode token expiry dari JWT
- Tampilkan warning toast 5 menit sebelum expired
- Tambah tombol "Perpanjang Session" di warning

---

## Implementation Order

```
Week 1: Phase 1 (Toast, Dashboard fix, Skeleton)
Week 2: Phase 2 (Form help text, Lease enhancements, Table improvements)
Week 3: Phase 3 (Config wizard, WireGuard simplification, Confirm dialogs)
Week 4: Phase 4 (Responsive nav, Empty states, Page descriptions)
Week 5: Phase 5 (Dark mode, Aria labels, Password management)
```

---

## Dependencies

| Feature | Dependencies |
|---|---|
| Toast notifications | `@radix-ui/react-toast` (sudah ada) |
| Skeleton loading | `components/ui/skeleton.tsx` (sudah ada) |
| Confirm dialog | `@radix-ui/react-dialog` (sudah ada) |
| Relative time | Tambah library `dayjs` atau gunakan `Intl.RelativeTimeFormat` |
| Syntax highlight | Tambah library `prism-react-renderer` atau custom CSS |
| Dark mode | Tailwind dark mode (sudah ada di CSS) |

---

## Success Metrics

- [ ] Semua `alert()` dan `confirm()` diganti dengan komponen UI konsisten
- [ ] Form hotspot bisa diisi user non-technical tanpa bantuan
- [ ] Dashboard menampilkan data yang akurat (pool size correct)
- [ ] Lease page bisa search dan filter dengan mudah
- [ ] Config page memiliki urutan aksi yang jelas
- [ ] WireGuard page bisa digunakan oleh non-networking user
- [ ] Navbar responsive di mobile
- [ ] Semua icon buttons punya aria-label
