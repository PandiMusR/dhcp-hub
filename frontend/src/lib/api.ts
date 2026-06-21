const API_BASE = "/api"
const TOKEN_KEY = "dhcp_hub_token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export interface Hotspot {
  id: number
  name: string
  subnet: string
  gateway: string
  pool_start: string
  pool_end: string
  dns: string
  lease_time: number
  enabled: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HotspotCreate {
  name: string
  subnet: string
  gateway: string
  pool_start: string
  pool_end: string
  dns?: string
  lease_time?: number
  enabled?: boolean
  notes?: string
}

export interface LeaseInfo {
  ip: string
  hw_address: string
  hostname: string | null
  valid_lifetime: number | null
  expire: string | null
  subnet_id: number | null
  state: number | null
}

export interface GlobalStats {
  total_subnets: number
  enabled_subnets: number
  total_leases: number
  active_leases: number
  subnet_stats: Array<{
    subnet_id: number
    subnet: string
    total_leases: number
    active_leases: number
  }>
}

export interface ConfigApplyResult {
  success: boolean
  message: string
  backup_path: string | null
}

export interface Reservation {
  id: number
  hotspot_id: number
  hw_address: string
  ip_address: string
  hostname: string | null
  notes: string | null
  created_at: string
}

export interface ReservationCreate {
  hw_address: string
  ip_address: string
  hostname?: string
  notes?: string
}

export interface WireGuardConfig {
  id: number
  interface_name: string
  listen_port: number
  vps_address: string
  vps_private_key: string
  router_public_key: string
  router_endpoint: string
  router_address: string
  created_at: string
  updated_at: string
}

export interface WireGuardConfigCreate {
  interface_name?: string
  listen_port?: number
  vps_address?: string
  vps_private_key: string
  router_public_key: string
  router_endpoint: string
  router_address?: string
}

export interface ServiceInfo {
  name: string
  pid: number | null
  rss_mb: number
  cpu_percent: number
  status: string
}

export interface DiskUsage {
  label: string
  size_bytes: number
}

export interface SystemInfo {
  uptime_seconds: number
  ram_services_mb: number
  ram_services_detail: ServiceInfo[]
  disk_items: DiskUsage[]
  disk_total_bytes: number
  kea_subnets: number
  kea_leases: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { headers, ...options })
  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event("auth:logout"))
    throw new Error("Session expired")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    if (Array.isArray(body.detail)) {
      const msgs = body.detail.map((e: { msg: string }) => e.msg).join(", ")
      throw new Error(msgs)
    }
    throw new Error(body.detail || "Request failed")
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  hotspots: {
    list: () => request<Hotspot[]>("/hotspots"),
    get: (id: number) => request<Hotspot>(`/hotspots/${id}`),
    create: (data: HotspotCreate) =>
      request<Hotspot>("/hotspots", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<HotspotCreate>) =>
      request<Hotspot>(`/hotspots/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/hotspots/${id}`, { method: "DELETE" }),
    toggle: (id: number, enabled: boolean) =>
      request<Hotspot>(`/hotspots/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
  },
  leases: {
    list: () => request<LeaseInfo[]>("/leases"),
    bySubnet: (subnetId: number) => request<LeaseInfo[]>(`/leases/subnet/${subnetId}`),
    stats: () => request<GlobalStats>("/leases/stats"),
  },
  config: {
    preview: () => request<{ config: string }>("/config/preview"),
    apply: () => request<ConfigApplyResult>("/config/apply", { method: "POST" }),
    current: () => request<{ config: string }>("/config/current"),
    backups: () => request<{ backups: Array<{ filename: string; path: string; size: number; modified: string }> }>("/config/backups"),
    rollback: (filename: string) =>
      request<ConfigApplyResult>(`/config/rollback/${filename}`, { method: "POST" }),
    getLfc: () => request<{ lfc_interval: number; lfc_interval_label: string }>("/config/lfc"),
    updateLfc: (lfc_interval: number) =>
      request<{ lfc_interval: number; lfc_interval_label: string }>("/config/lfc", {
        method: "PUT",
        body: JSON.stringify({ lfc_interval }),
      }),
  },
  reservations: {
    list: (hotspotId: number) =>
      request<Reservation[]>(`/hotspots/${hotspotId}/reservations`),
    create: (hotspotId: number, data: ReservationCreate) =>
      request<Reservation>(`/hotspots/${hotspotId}/reservations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (hotspotId: number, reservationId: number, data: Partial<ReservationCreate>) =>
      request<Reservation>(`/hotspots/${hotspotId}/reservations/${reservationId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (hotspotId: number, reservationId: number) =>
      request<void>(`/hotspots/${hotspotId}/reservations/${reservationId}`, {
        method: "DELETE",
      }),
  },
  wireguard: {
    get: () => request<WireGuardConfig | null>("/wireguard"),
    create: (data: WireGuardConfigCreate) =>
      request<WireGuardConfig>("/wireguard", { method: "POST", body: JSON.stringify(data) }),
    update: (data: Partial<WireGuardConfigCreate>) =>
      request<WireGuardConfig>("/wireguard", { method: "PUT", body: JSON.stringify(data) }),
    preview: () => request<{ config: string; allowed_ips: string[] }>("/wireguard/preview"),
    apply: () => request<ConfigApplyResult>("/wireguard/apply", { method: "POST" }),
    status: () => request<{ status: string; output: string }>("/wireguard/status"),
    init: () => request<{ success: boolean; message: string; created: boolean; public_key?: string }>("/wireguard/init", { method: "POST" }),
    publicKey: () => request<{ public_key: string }>("/wireguard/public-key"),
  },
  auth: {
    login: async (username: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw new Error("Invalid credentials")
      const data = await res.json()
      setToken(data.token)
      return data
    },
  },
  system: {
    info: () => request<SystemInfo>("/system"),
  },
}
