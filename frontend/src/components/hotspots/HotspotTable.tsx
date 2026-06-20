import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Hotspot } from "@/lib/api"
import { Pencil, Trash2, Lock } from "lucide-react"

interface HotspotTableProps {
  hotspots: Hotspot[]
  loading: boolean
  onEdit: (hotspot: Hotspot) => void
  onDelete: (hotspot: Hotspot) => void
  onToggle: (hotspot: Hotspot, enabled: boolean) => void
  onReservations: (hotspot: Hotspot) => void
}

export function HotspotTable({ hotspots, loading, onEdit, onDelete, onToggle, onReservations }: HotspotTableProps) {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead><TableHead>Subnet</TableHead><TableHead>Gateway</TableHead>
            <TableHead>Pool</TableHead><TableHead>DNS</TableHead><TableHead>Lease</TableHead>
            <TableHead>Status</TableHead><TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-36" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (hotspots.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Belum ada hotspot. Klik "Tambah Hotspot" untuk menambahkan.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Subnet</TableHead>
          <TableHead>Gateway</TableHead>
          <TableHead>Pool</TableHead>
          <TableHead>DNS</TableHead>
          <TableHead>Lease</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hotspots.map((h) => (
          <TableRow key={h.id}>
            <TableCell className="font-medium">{h.name}</TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{h.subnet}</code>
            </TableCell>
            <TableCell>{h.gateway}</TableCell>
            <TableCell className="text-xs">
              {h.pool_start} – {h.pool_end}
            </TableCell>
            <TableCell className="text-xs">{h.dns}</TableCell>
            <TableCell>{h.lease_time >= 3600 ? `${Math.floor(h.lease_time / 3600)} jam` : `${Math.floor(h.lease_time / 60)} mnt`}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Switch
                  checked={h.enabled}
                  onCheckedChange={(checked) => onToggle(h, checked)}
                />
                <Badge variant={h.enabled ? "success" : "secondary"}>
                  {h.enabled ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" title="Static IP" onClick={() => onReservations(h)}>
                  <Lock className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Static IP</span>
                </Button>
                <Button variant="ghost" size="sm" title="Edit" onClick={() => onEdit(h)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button variant="ghost" size="sm" title="Hapus" onClick={() => onDelete(h)}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                  <span className="hidden sm:inline text-destructive">Hapus</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
