import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Link2, CheckCircle2, AlertCircle, Clock, Loader2, ChevronDown } from 'lucide-react'

function StatusPill({ tone, icon: Icon, children, mono }) {
  const tones = {
    ok: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  }
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${tones[tone]} ${mono ? 'font-mono' : ''}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  )
}

export default function ConnectionCard({
  credentials,
  hasStoredKey,
  unlockPassword,
  setUnlockPassword,
  isUnlocking,
  unlockError,
  setUnlockError,
  handleUnlockKey,
  isConnecting,
  connectionStatus,
  canConnect,
  handleTestConnection,
  apps,
  sessionTimeLeft,
  formatTimeLeft,
}) {
  const connected = apps.length > 0
  const [manualOpen, setManualOpen] = useState(null)
  // Once connected the card folds into a one-line bar; the user can still open it to reconnect
  const open = manualOpen ?? !connected

  const keyPill = credentials.privateKey
    ? <StatusPill tone="ok" icon={CheckCircle2}>Private key loaded</StatusPill>
    : hasStoredKey
      ? <StatusPill tone="info" icon={Clock}>Key encrypted</StatusPill>
      : <StatusPill tone="warn" icon={AlertCircle}>No .p8 key</StatusPill>

  const statusPills = (
    <>
      {credentials.keyId
        ? <StatusPill tone="ok" icon={CheckCircle2}>Key ID set</StatusPill>
        : <StatusPill tone="warn" icon={AlertCircle}>No Key ID</StatusPill>}
      {credentials.issuerId
        ? <StatusPill tone="ok" icon={CheckCircle2}>Issuer ID set</StatusPill>
        : <StatusPill tone="warn" icon={AlertCircle}>No Issuer ID</StatusPill>}
      {keyPill}
    </>
  )

  if (!open) {
    return (
      <div id="asc-connection" className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 shadow-sm scroll-mt-44">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Link2 className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="min-w-0 text-sm">
          <span className="font-medium">Connected</span>
          <span className="text-muted-foreground"> · {apps.length} {apps.length === 1 ? 'app' : 'apps'}</span>
        </div>
        {sessionTimeLeft > 0 && !credentials.privateKey && (
          <StatusPill tone="ok" icon={Clock} mono>{formatTimeLeft(sessionTimeLeft)}</StatusPill>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 gap-1 text-muted-foreground"
          onClick={() => setManualOpen(true)}
        >
          Manage
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <Card id="asc-connection" className="border-border/50 shadow-sm scroll-mt-44">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Link2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect to App Store</CardTitle>
            <CardDescription>Configure credentials in the sidebar, then connect</CardDescription>
          </div>
          {connected && (
            <Button variant="ghost" size="sm" className="ml-auto h-8 text-muted-foreground" onClick={() => setManualOpen(false)}>
              Hide
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">{statusPills}</div>

        {!credentials.privateKey && hasStoredKey && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <Input
              type="password"
              placeholder="Enter password to unlock key..."
              value={unlockPassword}
              onChange={(e) => {
                setUnlockPassword(e.target.value)
                setUnlockError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockKey()}
              className="h-9 max-w-[250px] flex-1 text-sm"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <Button size="sm" onClick={handleUnlockKey} disabled={isUnlocking} className="h-9">
              {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
            </Button>
            {unlockError && <span className="text-xs text-red-500">{unlockError}</span>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleTestConnection}
            disabled={isConnecting || !canConnect}
            className={connected ? '' : 'gradient-primary border-0'}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : connected ? 'Reconnect' : 'Connect to App Store'}
          </Button>
          {connectionStatus && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${connectionStatus.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {connectionStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm font-medium">{connectionStatus.message}</span>
            </div>
          )}
          {sessionTimeLeft > 0 && !credentials.privateKey && (
            <StatusPill tone="ok" icon={Clock} mono>{formatTimeLeft(sessionTimeLeft)}</StatusPill>
          )}
        </div>
        {!canConnect && (
          <p className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Configure your App Store Connect credentials in the sidebar to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
