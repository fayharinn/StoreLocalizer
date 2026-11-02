// Approval prompt shown when the agent wants to run a write tool.
//
// Decisions handed back to the page:
//   'once'         — run this call only
//   'always'       — run it and never ask again for this tool (persisted)
//   'batch'        — run it and every remaining write call of this turn
//   'reject'       — skip this call
//   'reject-batch' — skip it and every remaining write call of this turn

import { useEffect, useMemo } from 'react'
import { CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Layers, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AGENT_TOOL_LIST, WRITE_TOOL_NAMES } from '@/services/agentTools'

function Kbd({ children }) {
  return (
    <kbd className="ml-1.5 rounded-sm border border-current/20 px-1 font-mono text-xs leading-4 opacity-70">
      {children}
    </kbd>
  )
}

export default function ApprovalPanel({ pending, alwaysAllow, onDecide, prettyJson }) {
  const { call, batch } = pending

  // Remaining calls of this turn that would prompt again if we only allow this one
  const remaining = useMemo(() => {
    const calls = batch?.calls
    if (!Array.isArray(calls)) return []
    return calls
      .slice((batch.index ?? 0) + 1)
      .filter((c) => WRITE_TOOL_NAMES.has(c.name) && !alwaysAllow.has(c.name))
  }, [batch, alwaysAllow])

  const batchCount = remaining.length + 1
  const description = AGENT_TOOL_LIST.find((t) => t.name === call.name)?.description

  // Esc rejects; the broader grants need Shift so a stray keypress can't push a
  // live store update through. "Allow once" is the focused primary button, so
  // Enter/Space covers it.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { e.preventDefault(); onDecide('reject'); return }
      if (!e.shiftKey) return
      const key = e.key.toUpperCase()
      if (key === 'A') { e.preventDefault(); onDecide('always') }
      else if (key === 'B' && remaining.length) { e.preventDefault(); onDecide('batch') }
      else if (key === 'R' && remaining.length) { e.preventDefault(); onDecide('reject-batch') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDecide, remaining.length])

  return (
    <div className="rounded-lg border border-highlight/30 bg-highlight/5 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-highlight-ink">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          The agent wants to run <span className="font-mono">{call.name}</span>
        </span>
        {batchCount > 1 && (
          <Badge variant="warning" className="h-5 gap-1 px-1.5 text-xs tabular-nums">
            <Layers className="h-3 w-3" />
            {batch.index + 1} of {batch.calls.length} calls this turn
          </Badge>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <pre className="text-xs font-mono bg-card border border-border rounded-md p-2 overflow-x-auto max-h-36 overflow-y-auto whitespace-pre-wrap break-all">{prettyJson(call.args || {})}</pre>

      {remaining.length > 0 && (
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <ChevronsRight className="h-3.5 w-3.5 text-faint" />
            {remaining.length} more write {remaining.length > 1 ? 'actions' : 'action'} queued in this turn
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {remaining.slice(0, 6).map((c, i) => (
              <span key={`${c.id}-${i}`} className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {c.name}
              </span>
            ))}
            {remaining.length > 6 && (
              <span className="px-1 py-0.5 text-xs tabular-nums text-faint">+{remaining.length - 6}</span>
            )}
          </div>
        </div>
      )}

      {/* Reject actions on the left, grants on the right: the two groups wrap
          as a whole on narrow screens instead of orphaning the primary button. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
            onClick={() => onDecide('reject')}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject<Kbd>Esc</Kbd>
          </Button>
          {remaining.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
              onClick={() => onDecide('reject-batch')}
            >
              Reject all<Kbd>⇧R</Kbd>
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5"
            title={`Run ${call.name} now and every time from now on — revoke it with /ask ${call.name}`}
            onClick={() => onDecide('always')}
          >
            <ShieldCheck className="h-4 w-4 mr-1 text-muted-foreground" />
            Always allow<Kbd>⇧A</Kbd>
          </Button>
          {remaining.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              title="Run this call and every remaining write call of this turn"
              onClick={() => onDecide('batch')}
            >
              <Layers className="h-4 w-4 mr-1" />
              Allow all {batchCount}<Kbd>⇧B</Kbd>
            </Button>
          )}
          <Button size="sm" className="h-8 px-2.5" autoFocus onClick={() => onDecide('once')}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Allow once<Kbd>↵</Kbd>
          </Button>
        </div>
      </div>
    </div>
  )
}
