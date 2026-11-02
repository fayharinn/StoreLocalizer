import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

export default function ActivityLogCard({ logs }) {
  return (
    <Card id="gp-logs" className="scroll-mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Activity log</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Track API calls and translation progress</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 rounded-lg border border-border bg-secondary/40">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Terminal className="h-4 w-4 mb-2 text-faint" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 text-sm py-1.5 px-3 rounded-md transition-colors ${
                    log.type === 'error' ? 'bg-destructive/10' :
                    log.type === 'success' ? 'bg-positive/10' :
                    'hover:bg-secondary'
                  }`}
                >
                  <span className={`mt-0.5 ${
                    log.type === 'error' ? 'text-destructive' :
                    log.type === 'success' ? 'text-positive' :
                    'text-faint'
                  }`}>
                    {log.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
                     log.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                     <Clock className="h-4 w-4" />}
                  </span>
                  <span className="font-mono text-xs text-faint tabular-nums shrink-0 pt-0.5">
                    {log.timestamp}
                  </span>
                  <span className={`break-all ${
                    log.type === 'error' ? 'text-destructive' :
                    log.type === 'success' ? 'text-positive' :
                    'text-foreground'
                  }`}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
