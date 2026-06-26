import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, type LeaseInfo, type Hotspot } from "@/lib/api"
import { Search } from "lucide-react"

export function Leases() {
  const [leases, setLeases] = useState<LeaseInfo[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubnet, setFilterSubnet] = useState<number | "">("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired">("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [leaseData, hotspotData] = await Promise.all([
          api.leases.list(),
          api.hotspots.list(),
        ])
        setLeases(leaseData)
        setHotspots(hotspotData)
      } catch (err) {
        console.error("Failed to load leases:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredLeases = useMemo(() => {
    let result = leases
    if (filterSubnet !== "") {
      result = result.filter((l) => l.subnet_id === filterSubnet)
    }
    if (filterStatus === "active") {
      result = result.filter((l) => l.state === 0)
    } else if (filterStatus === "expired") {
      result = result.filter((l) => l.state !== 0)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) =>
        l.ip.toLowerCase().includes(q) ||
        l.hw_address.toLowerCase().includes(q) ||
        (l.hostname || "").toLowerCase().includes(q)
      )
    }
    return result
  }, [leases, filterSubnet, filterStatus, search])

  const getRelativeTime = (expire: string | null): string => {
    if (!expire) return "-"
    try {
      const diff = new Date(expire).getTime() - Date.now()
      const absDiff = Math.abs(diff)
      const expired = diff < 0
      const minutes = Math.floor(absDiff / 60000)
      const hours = Math.floor(absDiff / 3600000)
      const days = Math.floor(absDiff / 86400000)

      let text: string
      if (days > 0) text = `${days} hari`
      else if (hours > 0) text = `${hours} jam`
      else if (minutes > 0) text = `${minutes} mnt`
      else text = "sekarang"

      return expired ? `Expired ${text} lalu` : `${text} lagi`
    } catch {
      return "-"
    }
  }

  const getHotspotName = (subnetId: number | null) => {
    if (!subnetId) return "-"
    const h = hotspots.find((hs) => hs.id === subnetId)
    return h?.name || `Subnet ${subnetId}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Monitoring Lease</h2>
        <p className="text-sm text-muted-foreground mt-1">Monitor client yang mendapat IP dari DHCP server</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-2">
            <span>Lease</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari IP, MAC, hostname..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-48"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "expired")}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={filterSubnet}
                onChange={(e) => setFilterSubnet(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Semua Hotspot</option>
                {hotspots.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <Badge variant="secondary">{filteredLeases.length} lease</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ) : filteredLeases.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {filterSubnet === "" && filterStatus === "all"
                ? "Tidak ada lease. Pastikan Kea DHCP server berjalan."
                : "Tidak ada lease yang sesuai filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Hotspot</TableHead>
                  <TableHead>Sisa Waktu</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((l, i) => (
                  <TableRow key={`${l.ip}-${i}`} className={l.state !== 0 ? "opacity-60" : ""}>
                    <TableCell className="font-mono">{l.ip}</TableCell>
                    <TableCell className="font-mono">{l.hw_address}</TableCell>
                    <TableCell>{l.hostname || "-"}</TableCell>
                    <TableCell>{getHotspotName(l.subnet_id)}</TableCell>
                    <TableCell className="text-sm">
                      <span className={l.state === 0 ? (getRelativeTime(l.expire).includes("mnt") ? "text-yellow-600" : "text-green-600") : "text-red-500"}>
                        {getRelativeTime(l.expire)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.state === 0 ? "success" : "secondary"}>
                        {l.state === 0 ? "Aktif" : l.state === 1 ? "Expired" : `State ${l.state}`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
