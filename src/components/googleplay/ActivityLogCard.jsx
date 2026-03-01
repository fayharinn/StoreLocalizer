import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

export default function ActivityLogCard({ logs }) {
  return (
    <Card id="gp-logs" className="border-border/50 shadow-sm scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
            <Terminal className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <CardDescription>Track API calls and translation progress</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 rounded-xl border border-border/50 bg-muted/20">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Terminal className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 text-sm py-1.5 px-3 rounded-lg transition-colors ${
                    log.type === 'error' ? 'bg-red-500/10' :
                    log.type === 'success' ? 'bg-emerald-500/10' :
                    'hover:bg-muted/50'
                  }`}
                >
                  <span className={`mt-0.5 ${
                    log.type === 'error' ? 'text-red-500' :
                    log.type === 'success' ? 'text-emerald-500' :
                    'text-muted-foreground'
                  }`}>
                    {log.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
                     log.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                     <Clock className="h-4 w-4" />}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0 pt-0.5">
                    {log.timestamp}
                  </span>
                  <span className={`break-all ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-emerald-400' :
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
