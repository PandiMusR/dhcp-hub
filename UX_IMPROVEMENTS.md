# DHCP Hub — UX Improvements

## Status Legend
- ✅ Implemented
- ⏸️ On hold (Phase 5)

---

## Phase 1: Core UX Fixes ✅

### 1.1 Toast Notification System ✅
**File:** `components/ui/toast.tsx`, `lib/toast.ts`, `components/Toaster.tsx`
- `@radix-ui/react-toast` activated with `useToast()` hook
- All `alert()` replaced in Config, WireGuard, HotspotForm, ReservationManager
- Success toasts after CRUD operations (hotspot create/update/delete)

### 1.2 Fix Dashboard Progress Bar ✅
**File:** `pages/Dashboard.tsx`
- Pool size calculated from `pool_end - pool_start` (not hardcoded 254)
- Shows `X/Y` format (active/total pool size)
- Hotspot name displayed alongside CIDR

### 1.3 Skeleton Loading ✅
**File:** `pages/Dashboard.tsx`, `components/hotspots/HotspotTable.tsx`, `pages/Leases.tsx`
- Dashboard: card skeleton placeholders
- HotspotTable: row skeletons with column-matched widths
- Leases: row skeletons during initial load

---

## Phase 2: Form & Input Clarity ✅

### 2.1 HotspotForm Help Text ✅
**File:** `components/hotspots/HotspotForm.tsx`
- Subnet: "Jaringan dalam format CIDR, contoh: 10.51.0.0/16 untuk 65534 IP"
- Gateway: "IP address router di subnet ini"
- Pool: "Range IP yang akan dibagikan ke client DHCP"
- Lease Time: "Durasi IP dipinjam ke client. 86400 = 24 jam"

### 2.2 Lease Monitoring Enhancements ✅
**File:** `pages/Leases.tsx`
- "Sisa Waktu" column with relative time ("2 jam lagi", "Expired 2 jam lalu")
- Color-coded: green (>1h), yellow (<1h), red (expired)
- Search input for IP/MAC/hostname filtering
- Hotspot filter dropdown with label
- Expired rows have reduced opacity

### 2.3 HotspotTable Pool Display ✅
**File:** `components/hotspots/HotspotTable.tsx`
- Pool shown as `10.51.0.10 – 10.51.255.254` (single cell, dash separator)
- Lease time shown as "24 jam" instead of "24h"

### 2.4 HotspotTable Action Labels ✅
**File:** `components/hotspots/HotspotTable.tsx`
- Buttons show text labels alongside icons: "Static IP", "Edit", "Hapus"
- Labels hidden on small screens (`hidden sm:inline`)

---

## Phase 3: Config & WireGuard UX ✅

### 3.1 Config Page Wizard ✅
**File:** `pages/Config.tsx`
- Split into 2 sections: "Generate & Apply" (step 1→2) and "Riwayat & Backup"
- Step flow: Preview → Apply with arrow indicator
- Apply and Rollback use Dialog component (not native confirm)
- Success toasts after apply and rollback

### 3.2 WireGuard Simplification ✅
**File:** `pages/WireGuard.tsx`
- Basic fields always visible: VPS Address, Router Address, Router Endpoint, Router Public Key
- Advanced fields in collapsible section: Interface Name, Listen Port, VPS Private Key
- Step guide: "1. Isi config → 2. Copy Public Key → 3. Apply"
- Copy-to-clipboard button with checkmark feedback
- Help text under each field

### 3.3 Confirmation Dialogs ✅
**File:** `pages/Config.tsx`, `pages/WireGuard.tsx`
- `confirm()` replaced with `<Dialog>` components
- Apply dialog: explains what will happen
- Rollback dialog: shows backup filename

---

## Phase 4: Navigation & Layout ✅

### 4.1 Responsive Navbar ✅
**File:** `App.tsx`
- Desktop (md+): full nav bar with labels
- Mobile (<md): hamburger menu icon → dropdown with all items + logout
- Sticky header with background

### 4.2 Empty State Guidance ✅
**File:** `pages/Dashboard.tsx`
- When 0 hotspots: welcome card with CTA "Mulai tambah hotspot"
- Network icon and blue-themed card

### 4.3 Page Subtitle Descriptions ✅
**File:** All page components
- Dashboard: "Ringkasan seluruh jaringan DHCP"
- Hotspot: "Kelola subnet dan hotspot untuk DHCP"
- Lease: "Monitor client yang mendapat IP dari DHCP server"
- WireGuard: "Konfigurasi tunnel VPN ke router MikroTik"
- Config: "Preview, apply, dan rollback konfigurasi Kea DHCP server"

---

## Phase 5: Polish & Accessibility ⏸️ (On Hold)

### 5.1 Dark Mode Toggle
CSS already supports `.dark` class. Needs toggle button in header.

### 5.2 Aria Labels
Icon-only buttons need `aria-label`. Keyboard navigation support needed.

### 5.3 Password Management
Change password form in Config page. Requires `POST /api/auth/change-password` endpoint.

### 5.4 Token Expiry Warning
Decode token expiry, show warning toast 5 minutes before auto-logout.
