import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { api, type WireGuardConfig, type WireGuardConfigCreate } from "@/lib/api"
import { toast } from "@/lib/toast"
import { CheckCircle, XCircle, Eye, Play, Settings, Key, Zap, ChevronDown, ChevronUp, Copy } from "lucide-react"

export function WireGuard() {
  const [config, setConfig] = useState<WireGuardConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ config: string; allowed_ips: string[] } | null>(null)
  const [status, setStatus] = useState<{ status: string; output: string } | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState<WireGuardConfigCreate>({
    vps_private_key: "",
    router_public_key: "",
    router_endpoint: "",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [data, st] = await Promise.all([
          api.wireguard.get(),
          api.wireguard.status().catch(() => null),
        ])
        setConfig(data)
        if (data) {
          setForm({
            interface_name: data.interface_name,
            listen_port: data.listen_port,
            vps_address: data.vps_address,
            vps_private_key: data.vps_private_key,
            router_public_key: data.router_public_key,
            router_endpoint: data.router_endpoint,
            router_address: data.router_address,
          })
          try {
            const pk = await api.wireguard.publicKey()
            setPublicKey(pk.public_key)
          } catch { /* ignore */ }
        }
        if (st) setStatus(st)
      } catch (err) {
        console.error("Failed to load WireGuard config:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleInit = async () => {
    setSaving(true)
    setResult(null)
    try {
      const res = await api.wireguard.init()
      setResult({ success: res.success, message: res.message })
      if (res.public_key) setPublicKey(res.public_key)
      const data = await api.wireguard.get()
      setConfig(data)
      if (data) setForm({ interface_name: data.interface_name, listen_port: data.listen_port, vps_address: data.vps_address, vps_private_key: data.vps_private_key, router_public_key: data.router_public_key, router_endpoint: data.router_endpoint, router_address: data.router_address })
      const st = await api.wireguard.status().catch(() => null)
      if (st) setStatus(st)
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Failed" })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setResult(null)
    try {
      if (config) {
        const updated = await api.wireguard.update(form)
        setConfig(updated)
        setResult({ success: true, message: "Config berhasil disimpan" })
        toast({ title: "Config tersimpan", variant: "success" })
      } else {
        const created = await api.wireguard.create(form as WireGuardConfigCreate)
        setConfig(created)
        setResult({ success: true, message: "Config berhasil dibuat" })
        toast({ title: "Config dibuat", variant: "success" })
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Failed" })
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    try {
      const data = await api.wireguard.preview()
      setPreview(data)
    } catch (err) {
      toast({ title: "Gagal preview", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" })
    }
  }

  const handleApply = async () => {
    setApplyDialogOpen(false)
    setSaving(true)
    setResult(null)
    try {
      const data = await api.wireguard.apply()
      setResult(data)
      if (data.success) toast({ title: "WireGuard applied", description: data.message, variant: "success" })
      const st = await api.wireguard.status().catch(() => null)
      if (st) setStatus(st)
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Failed" })
    } finally {
      setSaving(false)
    }
  }

  const handleCopyKey = () => {
    if (!publicKey) return
    navigator.clipboard.writeText(publicKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateField = (field: keyof WireGuardConfigCreate, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  const needsInit = !config || status?.status === "not_initialized"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WireGuard (wg1)</h2>
          <p className="text-sm text-muted-foreground mt-1">Konfigurasi tunnel VPN ke router MikroTik</p>
        </div>
        <div className="flex gap-2">
          {status && (
            <Badge variant={
              status.status === "up" ? "success" :
              status.status === "not_initialized" ? "warning" :
              "destructive"
            }>
              {status.status === "up" ? "Online" :
               status.status === "not_initialized" ? "Belum Setup" :
               "Offline"}
            </Badge>
          )}
        </div>
      </div>

      {needsInit && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-900">WireGuard belum diinisialisasi</p>
                <p className="text-sm text-yellow-700 mt-1">Klik untuk auto-generate key pair dan buat config</p>
              </div>
              <Button onClick={handleInit} disabled={saving}>
                <Zap className="mr-2 h-4 w-4" />
                {saving ? "Membuat..." : "Inisialisasi"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Konfigurasi WireGuard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            1. Isi config di bawah → 2. Copy Public Key ke router → 3. Klik Apply
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicKey && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-4 w-4" />
                <span className="text-sm font-medium">VPS Public Key — isi ini di router MikroTik</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all flex-1">{publicKey}</code>
                <Button size="sm" variant="outline" onClick={handleCopyKey}>
                  {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>VPS Address</Label>
              <Input value={form.vps_address || "10.200.0.1/32"} onChange={(e) => updateField("vps_address", e.target.value)} placeholder="10.200.0.1/32" />
              <p className="text-xs text-muted-foreground">IP WireGuard di sisi VPS</p>
            </div>
            <div className="space-y-2">
              <Label>Router Address</Label>
              <Input value={form.router_address || "10.200.0.2/32"} onChange={(e) => updateField("router_address", e.target.value)} placeholder="10.200.0.2/32" />
              <p className="text-xs text-muted-foreground">IP WireGuard di sisi router</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Router Public Key</Label>
            <Input value={form.router_public_key} onChange={(e) => updateField("router_public_key", e.target.value)} placeholder="Isi dari router" />
            <p className="text-xs text-muted-foreground">Public key interface WireGuard di router</p>
          </div>

          <div className="space-y-2">
            <Label>Router Endpoint</Label>
            <Input value={form.router_endpoint} onChange={(e) => updateField("router_endpoint", e.target.value)} placeholder="router.example.com:51820" />
            <p className="text-xs text-muted-foreground">IP publik atau domain router + port WireGuard</p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? "Sembunyikan" : "Advanced Settings"}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interface Name</Label>
                  <Input value={form.interface_name || "wg1"} onChange={(e) => updateField("interface_name", e.target.value)} placeholder="wg1" />
                </div>
                <div className="space-y-2">
                  <Label>Listen Port</Label>
                  <Input type="number" value={form.listen_port || 51821} onChange={(e) => updateField("listen_port", parseInt(e.target.value) || 51821)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>VPS Private Key</Label>
                <Input type="password" value={form.vps_private_key} onChange={(e) => updateField("vps_private_key", e.target.value)} placeholder="Auto-generated saat inisialisasi" />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : config ? "Simpan Perubahan" : "Simpan"}
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-1 h-4 w-4" />
              Preview
            </Button>
            {config && (
              <Button onClick={() => setApplyDialogOpen(true)} disabled={saving}>
                <Play className="mr-1 h-4 w-4" />
                Apply
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? "border-green-200" : "border-red-200"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {result.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              <span className={result.success ? "text-green-800" : "text-red-800"}>{result.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Preview Config</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">{preview.config || "Belum ada config."}</pre>
            {preview.allowed_ips.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">AllowedIPs (subnet yang dilewati tunnel):</p>
                <div className="flex flex-wrap gap-1">
                  {preview.allowed_ips.map((ip) => (
                    <Badge key={ip} variant="outline" className="font-mono text-xs">{ip}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {status && status.output && status.status !== "not_initialized" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Status Koneksi</CardTitle></CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">{status.output}</pre>
          </CardContent>
        </Card>
      )}

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply WireGuard Config?</DialogTitle>
            <DialogDescription>
              Config akan ditulis ke file dan interface WireGuard akan di-reload. Koneksi tunnel akan di-update tanpa disconnect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>Batal</Button>
            <Button onClick={handleApply}>
              <Play className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
