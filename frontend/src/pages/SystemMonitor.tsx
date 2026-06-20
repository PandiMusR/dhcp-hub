import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type SystemInfo } from "@/lib/api"
import { Server, HardDrive, Activity, Clock, MemoryStick } from "lucide-react"

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} hari ${h} jam`
  if (h > 0) return `${h} jam ${m} mnt`
  return `${m} mnt`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function SystemMonitor() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.system.info()
        setInfo(data)
      } catch (err) {
        console.error("Failed to load system info:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">System Monitor</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor resource DHCP Hub dan Kea DHCP</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!info) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Monitor</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor resource DHCP Hub dan Kea DHCP</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Uptime: {formatUptime(info.uptime_seconds)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RAM (DHCP Hub)</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{info.ram_services_mb} MB</div>
            <p className="text-xs text-muted-foreground">Total RAM terpakai oleh Kea + Web UI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk (DHCP Hub)</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(info.disk_total_bytes)}</div>
            <p className="text-xs text-muted-foreground">Total file terkait DHCP Hub</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DHCP Stats</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{info.kea_leases} lease</div>
            <p className="text-xs text-muted-foreground">{info.kea_subnets} subnet aktif</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {info.ram_services_detail.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">PID: {s.pid ?? "-"}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={s.status === "running" ? "success" : "destructive"}>
                      {s.status === "running" ? "Running" : "Stopped"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{s.rss_mb} MB · CPU {s.cpu_percent}%</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                <p className="font-medium text-sm">Total</p>
                <p className="text-sm font-bold">{info.ram_services_mb} MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Disk Usage Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {info.disk_items.filter(d => d.size_bytes > 0).map((d) => (
                <div key={d.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm">{d.label}</span>
                  <span className="text-sm font-mono">{formatBytes(d.size_bytes)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5 font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm font-mono">{formatBytes(info.disk_total_bytes)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
