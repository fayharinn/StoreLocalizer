import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, AlertCircle, Clock, Terminal } from 'lucide-react'

const TONE = {
  error: { row: 'bg-red-500/10', icon: 'text-red-500', text: 'text-red-400', Icon: AlertCircle },
  success: { row: 'bg-emerald-500/10', icon: 'text-emerald-500', text: 'text-emerald-400', Icon: CheckCircle2 },
  default: { row: 'hover:bg-muted/50', icon: 'text-muted-foreground', text: 'text-foreground', Icon: Clock },
}

export default function ActivityLogCard({ logs, className = 'h-[min(60vh,32rem)]' }) {
  return (
    <Card id="asc-logs" className="border-border/50 shadow-sm scroll-mt-44">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
            <Terminal className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <CardDescription>Track API calls and events</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={`${className} rounded-xl border border-border/50 bg-muted/20`}>
          {logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-muted-foreground">
              <Terminal className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1 p-3">
              {logs.map((log, index) => {
                const tone = TONE[log.type] || TONE.default
                return (
                  <div key={index} className={`flex items-start gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${tone.row}`}>
                    <tone.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
                    <span className="shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{log.timestamp}</span>
                    <span className={`break-all ${tone.text}`}>{log.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
