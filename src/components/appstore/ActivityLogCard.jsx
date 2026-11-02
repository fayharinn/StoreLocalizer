import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, AlertCircle, Clock, Terminal } from 'lucide-react'

const TONE = {
  error: { row: 'bg-destructive/10', icon: 'text-destructive', text: 'text-destructive', Icon: AlertCircle },
  success: { row: '', icon: 'text-positive', text: 'text-foreground', Icon: CheckCircle2 },
  default: { row: 'hover:bg-muted/50', icon: 'text-faint', text: 'text-foreground', Icon: Clock },
}

export default function ActivityLogCard({ logs, className = 'h-[min(60vh,32rem)]' }) {
  return (
    <Card id="asc-logs" className="scroll-mt-44">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Activity log</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">API calls and events from this session</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={`${className} rounded-lg border border-border bg-muted/20`}>
          {logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-muted-foreground">
              <Terminal className="mb-2 h-6 w-6 text-faint" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1 p-3">
              {logs.map((log, index) => {
                const tone = TONE[log.type] || TONE.default
                return (
                  <div key={index} className={`flex items-start gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${tone.row}`}>
                    <tone.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
                    <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-faint">{log.timestamp}</span>
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
