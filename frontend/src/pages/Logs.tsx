import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { Search, RefreshCw, Download } from "lucide-react"

function getLineClass(line: string): string {
  const lower = line.toLowerCase()
  if (lower.includes("error") || lower.includes("fatal")) return "text-red-500"
  if (lower.includes("warn")) return "text-yellow-500"
  if (lower.includes("info")) return "text-muted-foreground"
  return ""
}

function parseLogLine(line: string) {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d+)\s+(\w+)\s+\[(.+?)\]\s+(.*)$/)
  if (match) {
    return { time: match[1], level: match[2], source: match[3], message: match[4] }
  }
  return null
}

export function Logs() {
  const [lines, setLines] = useState<string[]>([])
  const [totalLines, setTotalLines] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [lineCount, setLineCount] = useState(200)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const data = await api.system.logs(lineCount, search)
      setLines(data.lines)
      setTotalLines(data.total_lines)
    } catch (err) {
      console.error("Failed to load logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (!autoRefresh) return
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [lineCount, search, autoRefresh])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const handleDownload = () => {
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kea-dhcp4-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  const errorCount = lines.filter((l) => l.toLowerCase().includes("error") || l.toLowerCase().includes("fatal")).length
  const warnCount = lines.filter((l) => l.toLowerCase().includes("warn")).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Logs</h2>
        <p className="text-sm text-muted-foreground mt-1">Log Kea DHCP server</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span>kea-dhcp4.log</span>
              <Badge variant="secondary">{totalLines} lines</Badge>
              {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
              {warnCount > 0 && <Badge variant="warning" className="bg-yellow-100 text-yellow-800 border-yellow-300">{warnCount} warns</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari di log..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-40"
                />
              </div>
              <select
                value={lineCount}
                onChange={(e) => setLineCount(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value={100}>100 lines</option>
                <option value={200}>200 lines</option>
                <option value={500}>500 lines</option>
                <option value={1000}>1000 lines</option>
              </select>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
                {autoRefresh ? "Auto" : "Manual"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : lines.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "Tidak ada log yang cocok dengan pencarian." : "Log kosong."}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="bg-muted/50 rounded-md p-3 overflow-auto max-h-[600px] font-mono text-xs leading-relaxed"
            >
              {lines.map((line, i) => {
                const parsed = parseLogLine(line)
                return (
                  <div key={i} className={`py-0.5 ${getLineClass(line)}`}>
                    {parsed ? (
                      <>
                        <span className="text-muted-foreground">{parsed.time}</span>
                        {" "}
                        <span className={`font-bold ${
                          parsed.level === "ERROR" || parsed.level === "FATAL" ? "text-red-500" :
                          parsed.level === "WARN" ? "text-yellow-500" :
                          "text-muted-foreground"
                        }`}>
                          {parsed.level}
                        </span>
                        {" "}
                        <span className="text-foreground">{parsed.message}</span>
                      </>
                    ) : (
                      line
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
