import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type GlobalStats, type Hotspot } from "@/lib/api"
import { Network, Wifi, Activity, Server } from "lucide-react"

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

export function Dashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, hotspotsData] = await Promise.all([
          api.leases.stats(),
          api.hotspots.list(),
        ])
        setStats(statsData)
        setHotspots(hotspotsData)
      } catch {
        setStats(null)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const getPoolSize = (subnetId: number): number => {
    const h = hotspots.find((hs) => hs.id === subnetId)
    if (!h) return 254
    return Math.max(1, ipToLong(h.pool_end) - ipToLong(h.pool_start) + 1)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      {loading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
      <>
      {stats && stats.total_subnets === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Network className="h-10 w-10 mx-auto text-blue-500" />
              <p className="font-medium text-blue-900">Selamat Datang di DHCP Hub</p>
              <p className="text-sm text-blue-700">
                Mulai dengan menambahkan hotspot di menu "Hotspot", lalu setup WireGuard untuk menghubungkan router.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subnet</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_subnets ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "" : `${stats?.enabled_subnets ?? 0} aktif`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subnet Aktif</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.enabled_subnets ?? 0}</div>
            <p className="text-xs text-muted-foreground">melayani DHCP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lease</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_leases ?? 0}</div>
            <p className="text-xs text-muted-foreground">client aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kea Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats ? "Online" : "Offline"}
            </div>
            <p className="text-xs text-muted-foreground">DHCP server</p>
          </CardContent>
        </Card>
      </div>

      {stats && stats.subnet_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lease per Subnet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.subnet_stats.map((s) => (
                <div key={s.subnet_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{hotspots.find(h => h.id === s.subnet_id)?.name || `Subnet ${s.subnet_id}`}</span>
                    <span className="text-xs text-muted-foreground font-mono">{s.subnet}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (s.active_leases / getPoolSize(s.subnet_id)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-24 text-right">
                      {s.active_leases}/{getPoolSize(s.subnet_id)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  )
}
