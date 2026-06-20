import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, type Hotspot, type Reservation, type ReservationCreate } from "@/lib/api"
import { toast } from "@/lib/toast"
import { Plus, Pencil, Trash2, Lock } from "lucide-react"

interface ReservationManagerProps {
  hotspot: Hotspot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReservationManager({ hotspot, open, onOpenChange }: ReservationManagerProps) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [deleting, setDeleting] = useState<Reservation | null>(null)
  const [form, setForm] = useState<ReservationCreate>({
    hw_address: "",
    ip_address: "",
    hostname: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const loadReservations = useCallback(async () => {
    try {
      const data = await api.reservations.list(hotspot.id)
      setReservations(data)
    } catch (err) {
      console.error("Failed to load reservations:", err)
    } finally {
      setLoading(false)
    }
  }, [hotspot.id])

  useEffect(() => {
    if (open) {
      loadReservations()
    }
  }, [open, loadReservations])

  const resetForm = () => {
    setForm({ hw_address: "", ip_address: "", hostname: "", notes: "" })
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = (r: Reservation) => {
    setEditing(r)
    setForm({
      hw_address: r.hw_address,
      ip_address: r.ip_address,
      hostname: r.hostname || "",
      notes: r.notes || "",
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.reservations.update(hotspot.id, editing.id, form)
      } else {
        await api.reservations.create(hotspot.id, form)
      }
      setFormOpen(false)
      resetForm()
      await loadReservations()
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await api.reservations.delete(hotspot.id, deleting.id)
      setDeleting(null)
      await loadReservations()
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Static IP — {hotspot.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hotspot.subnet} · {reservations.length} reservasi
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-3 w-3" />
              Tambah
            </Button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : reservations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground border rounded-md">
              Belum ada reservasi static IP.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {r.hw_address}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {r.ip_address}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.hostname || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) resetForm(); setFormOpen(v) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Reservasi" : "Tambah Reservasi"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mac">MAC Address</Label>
              <Input
                id="mac"
                value={form.hw_address}
                onChange={(e) => setForm((f) => ({ ...f, hw_address: e.target.value }))}
                placeholder="AA:BB:CC:DD:EE:FF"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                value={form.ip_address}
                onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                placeholder={hotspot.gateway.replace(/\.\d+$/, ".100")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname (opsional)</Label>
              <Input
                id="hostname"
                value={form.hostname || ""}
                onChange={(e) => setForm((f) => ({ ...f, hostname: e.target.value }))}
                placeholder="printer-kantor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Input
                id="notes"
                value={form.notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Printer lantai 2"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editing ? "Update" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Reservasi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus reservasi <code className="bg-muted px-1 rounded">{deleting?.hw_address}</code> →{" "}
            <code className="bg-muted px-1 rounded">{deleting?.ip_address}</code>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
