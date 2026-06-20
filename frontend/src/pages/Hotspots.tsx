import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { HotspotForm } from "@/components/hotspots/HotspotForm"
import { HotspotTable } from "@/components/hotspots/HotspotTable"
import { ReservationManager } from "@/components/hotspots/ReservationManager"
import { api, type Hotspot, type HotspotCreate } from "@/lib/api"
import { toast } from "@/lib/toast"
import { Plus } from "lucide-react"

export function Hotspots() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingHotspot, setEditingHotspot] = useState<Hotspot | null>(null)
  const [deletingHotspot, setDeletingHotspot] = useState<Hotspot | null>(null)
  const [reservationHotspot, setReservationHotspot] = useState<Hotspot | null>(null)

  const loadHotspots = useCallback(async () => {
    try {
      const data = await api.hotspots.list()
      setHotspots(data)
    } catch (err) {
      console.error("Failed to load hotspots:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHotspots()
  }, [loadHotspots])

  const handleCreate = async (data: HotspotCreate) => {
    await api.hotspots.create(data)
    toast({ title: "Hotspot ditambahkan", description: `${data.name} berhasil dibuat`, variant: "success" })
    await loadHotspots()
  }

  const handleUpdate = async (data: HotspotCreate) => {
    if (!editingHotspot) return
    await api.hotspots.update(editingHotspot.id, data)
    toast({ title: "Hotspot diperbarui", description: `${data.name} berhasil diupdate`, variant: "success" })
    await loadHotspots()
  }

  const handleDelete = async () => {
    if (!deletingHotspot) return
    await api.hotspots.delete(deletingHotspot.id)
    toast({ title: "Hotspot dihapus", description: `${deletingHotspot.name} berhasil dihapus`, variant: "success" })
    setDeletingHotspot(null)
    await loadHotspots()
  }

  const handleToggle = async (hotspot: Hotspot, enabled: boolean) => {
    await api.hotspots.toggle(hotspot.id, enabled)
    await loadHotspots()
  }

  const handleEdit = (hotspot: Hotspot) => {
    setEditingHotspot(hotspot)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingHotspot(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hotspot / Subnet</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola subnet dan hotspot untuk DHCP</p>
        </div>
        <Button onClick={() => { setEditingHotspot(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Hotspot
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Hotspot</CardTitle>
        </CardHeader>
        <CardContent>
          <HotspotTable
            hotspots={hotspots}
            loading={loading}
            onEdit={handleEdit}
            onDelete={setDeletingHotspot}
            onToggle={handleToggle}
            onReservations={setReservationHotspot}
          />
        </CardContent>
      </Card>

      <HotspotForm
        open={formOpen}
        onOpenChange={handleFormClose}
        hotspot={editingHotspot}
        onSubmit={editingHotspot ? handleUpdate : handleCreate}
      />

      {reservationHotspot && (
        <ReservationManager
          hotspot={reservationHotspot}
          open={!!reservationHotspot}
          onOpenChange={(v) => { if (!v) setReservationHotspot(null) }}
        />
      )}

      <Dialog open={!!deletingHotspot} onOpenChange={() => setDeletingHotspot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Hotspot</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <strong>{deletingHotspot?.name}</strong>?
              Semua reservasi IP di subnet ini juga akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingHotspot(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
