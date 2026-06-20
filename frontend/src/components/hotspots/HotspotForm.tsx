import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/lib/toast"
import type { Hotspot, HotspotCreate } from "@/lib/api"

interface HotspotFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hotspot?: Hotspot | null
  onSubmit: (data: HotspotCreate) => Promise<void>
}

export function HotspotForm({ open, onOpenChange, hotspot, onSubmit }: HotspotFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<HotspotCreate>({
    name: "",
    subnet: "",
    gateway: "",
    pool_start: "",
    pool_end: "",
    dns: "1.1.1.1, 8.8.8.8",
    lease_time: 86400,
    enabled: true,
    notes: "",
  })

  useEffect(() => {
    if (hotspot) {
      setForm({
        name: hotspot.name,
        subnet: hotspot.subnet,
        gateway: hotspot.gateway,
        pool_start: hotspot.pool_start,
        pool_end: hotspot.pool_end,
        dns: hotspot.dns,
        lease_time: hotspot.lease_time,
        enabled: hotspot.enabled,
        notes: hotspot.notes || "",
      })
    } else {
      setForm({
        name: "",
        subnet: "",
        gateway: "",
        pool_start: "",
        pool_end: "",
        dns: "1.1.1.1, 8.8.8.8",
        lease_time: 86400,
        enabled: true,
        notes: "",
      })
    }
  }, [hotspot, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof HotspotCreate, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hotspot ? "Edit Hotspot" : "Tambah Hotspot Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Hotspot</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Hotspot Kantor A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subnet">Subnet (CIDR)</Label>
              <Input
                id="subnet"
                value={form.subnet}
                onChange={(e) => updateField("subnet", e.target.value)}
                placeholder="10.51.0.0/16"
                required
              />
              <p className="text-xs text-muted-foreground">Jaringan dalam format CIDR, contoh: 10.51.0.0/16 untuk 65534 IP</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gateway">Gateway</Label>
              <Input
                id="gateway"
                value={form.gateway}
                onChange={(e) => updateField("gateway", e.target.value)}
                placeholder="10.51.0.1"
                required
              />
              <p className="text-xs text-muted-foreground">IP address router di subnet ini</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool_start">Pool Start</Label>
              <Input
                id="pool_start"
                value={form.pool_start}
                onChange={(e) => updateField("pool_start", e.target.value)}
                placeholder="10.51.0.10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool_end">Pool End</Label>
              <Input
                id="pool_end"
                value={form.pool_end}
                onChange={(e) => updateField("pool_end", e.target.value)}
                placeholder="10.51.255.254"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Range IP yang akan dibagikan ke client DHCP</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dns">DNS Server</Label>
              <Input
                id="dns"
                value={form.dns}
                onChange={(e) => updateField("dns", e.target.value)}
                placeholder="1.1.1.1, 8.8.8.8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lease_time">Lease Time (detik)</Label>
              <Input
                id="lease_time"
                type="number"
                value={form.lease_time}
                onChange={(e) => updateField("lease_time", parseInt(e.target.value) || 86400)}
                min={60}
              />
              <p className="text-xs text-muted-foreground">Durasi IP dipinjam ke client. 86400 = 24 jam</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              value={form.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Catatan opsional..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => updateField("enabled", checked)}
            />
            <Label htmlFor="enabled">Aktif</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : hotspot ? "Update" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
