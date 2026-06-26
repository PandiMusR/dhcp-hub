import { useState, useEffect, useCallback } from "react"
import { Dashboard } from "@/pages/Dashboard"
import { Hotspots } from "@/pages/Hotspots"
import { Leases } from "@/pages/Leases"
import { Config } from "@/pages/Config"
import { WireGuard } from "@/pages/WireGuard"
import { SystemMonitor } from "@/pages/SystemMonitor"
import { Logs } from "@/pages/Logs"
import { Login } from "@/pages/Login"
import { Toaster } from "@/components/Toaster"
import { getToken, clearToken } from "@/lib/api"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Network, Activity, Settings, Shield, LogOut, Menu, X, Gauge, ScrollText } from "lucide-react"

type Page = "dashboard" | "hotspots" | "leases" | "wireguard" | "config" | "system" | "logs"

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "hotspots", label: "Hotspot", icon: Network },
  { id: "leases", label: "Lease", icon: Activity },
  { id: "wireguard", label: "WireGuard", icon: Shield },
  { id: "config", label: "Config", icon: Settings },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "system", label: "System", icon: Gauge },
]

export default function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [authenticated, setAuthenticated] = useState(() => !!getToken())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = useCallback(() => {
    clearToken()
    setAuthenticated(false)
  }, [])

  useEffect(() => {
    window.addEventListener("auth:logout", handleLogout)
    return () => window.removeEventListener("auth:logout", handleLogout)
  }, [handleLogout])

  if (!authenticated) {
    return <><Login onLogin={() => setAuthenticated(true)} /><Toaster /></>
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Network className="h-6 w-6" />
              <span className="text-lg font-bold">DHCP Hub</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      page === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-accent"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => { setPage(item.id); setMobileMenuOpen(false) }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      page === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {page === "dashboard" && <Dashboard />}
        {page === "hotspots" && <Hotspots />}
        {page === "leases" && <Leases />}
        {page === "wireguard" && <WireGuard />}
        {page === "config" && <Config />}
        {page === "system" && <SystemMonitor />}
        {page === "logs" && <Logs />}
      </main>
    </div>
  )
}
