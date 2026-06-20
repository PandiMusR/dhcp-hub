import { useState } from "react"
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
import { api, type ConfigApplyResult } from "@/lib/api"
import { toast } from "@/lib/toast"
import { Play, Eye, RotateCcw, FileCode, CheckCircle, XCircle, ArrowRight } from "lucide-react"

export function Config() {
  const [preview, setPreview] = useState<string>("")
  const [current, setCurrent] = useState<string>("")
  const [backups, setBackups] = useState<Array<{ filename: string; size: number; modified: string }>>([])
  const [result, setResult] = useState<ConfigApplyResult | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"preview" | "current" | "backups">("preview")
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null)

  const handlePreview = async () => {
    setLoading("preview")
    try {
      const data = await api.config.preview()
      setPreview(data.config)
      setActiveTab("preview")
    } catch (err) {
      toast({ title: "Gagal preview", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(null)
    }
  }

  const handleApply = async () => {
    setApplyDialogOpen(false)
    setLoading("apply")
    try {
      const data = await api.config.apply()
      setResult(data)
      if (data.success) toast({ title: "Config diterapkan", description: data.message, variant: "success" })
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Failed", backup_path: null })
    } finally {
      setLoading(null)
    }
  }

  const handleCurrent = async () => {
    setLoading("current")
    try {
      const data = await api.config.current()
      setCurrent(data.config)
      setActiveTab("current")
    } catch (err) {
      toast({ title: "Gagal memuat config", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(null)
    }
  }

  const handleBackups = async () => {
    setLoading("backups")
    try {
      const data = await api.config.backups()
      setBackups(data.backups)
      setActiveTab("backups")
    } catch (err) {
      toast({ title: "Gagal memuat backup", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(null)
    }
  }

  const handleRollback = async () => {
    if (!rollbackTarget) return
    setRollbackTarget(null)
    setLoading("rollback")
    try {
      const data = await api.config.rollback(rollbackTarget)
      setResult(data)
      if (data.success) toast({ title: "Rollback berhasil", description: data.message, variant: "success" })
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Failed", backup_path: null })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Config Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Preview, apply, dan rollback konfigurasi Kea DHCP server</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate & Apply Config</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate konfigurasi Kea dari data hotspot, lalu apply untuk menerapkan ke server DHCP.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button onClick={handlePreview} disabled={loading !== null} variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              {loading === "preview" ? "Loading..." : "1. Preview"}
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Button onClick={() => setApplyDialogOpen(true)} disabled={loading !== null}>
              <Play className="mr-2 h-4 w-4" />
              {loading === "apply" ? "Applying..." : "2. Apply & Reload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riwayat & Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleCurrent} variant="outline" size="sm" disabled={loading !== null}>
              <FileCode className="mr-2 h-4 w-4" />
              {loading === "current" ? "Loading..." : "Config Saat Ini"}
            </Button>
            <Button onClick={handleBackups} variant="outline" size="sm" disabled={loading !== null}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {loading === "backups" ? "Loading..." : "Lihat Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? "border-green-200" : "border-red-200"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </span>
            </div>
            {result.backup_path && (
              <p className="text-xs text-muted-foreground mt-1">
                Backup: {result.backup_path}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "preview" && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Config Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
              {preview}
            </pre>
          </CardContent>
        </Card>
      )}

      {activeTab === "current" && current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Config yang Sedang Berjalan</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
              {current}
            </pre>
          </CardContent>
        </Card>
      )}

      {activeTab === "backups" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backup Config</CardTitle>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada backup.</p>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div key={b.filename} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="text-sm font-mono">{b.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.modified).toLocaleString("id-ID")} · {(b.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRollbackTarget(b.filename)}
                      disabled={loading !== null}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Rollback
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Config Kea DHCP?</DialogTitle>
            <DialogDescription>
              Config yang di-generate dari data hotspot akan ditulis ke server dan Kea DHCP akan di-reload. Config lama akan di-backup otomatis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>Batal</Button>
            <Button onClick={handleApply}>
              <Play className="mr-2 h-4 w-4" />
              Apply & Reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rollbackTarget} onOpenChange={() => setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback Config?</DialogTitle>
            <DialogDescription>
              Config akan dikembalikan ke backup: <code className="bg-muted px-1 rounded">{rollbackTarget}</code>. Config saat ini akan ditimpa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleRollback}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
