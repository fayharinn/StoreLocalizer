import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Link2, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'

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
  return (
    <Card id="asc-connection" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Link2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect to App Store</CardTitle>
            <CardDescription>Configure credentials in the sidebar, then connect</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {credentials.keyId ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Key ID set
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              No Key ID
            </div>
          )}
          {credentials.issuerId ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Issuer ID set
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              No Issuer ID
            </div>
          )}
          {credentials.privateKey ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Private key loaded
            </div>
          ) : hasStoredKey ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              Key encrypted
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              No .p8 key
            </div>
          )}
        </div>

        {!credentials.privateKey && hasStoredKey && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <Input
              type="password"
              placeholder="Enter password to unlock key..."
              value={unlockPassword}
              onChange={(e) => {
                setUnlockPassword(e.target.value)
                setUnlockError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockKey()}
              className="h-9 text-sm flex-1 max-w-[250px]"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <Button
              size="sm"
              onClick={handleUnlockKey}
              disabled={isUnlocking}
              className="h-9"
            >
              {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
            </Button>
            {unlockError && <span className="text-xs text-red-500">{unlockError}</span>}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTestConnection}
            disabled={isConnecting || !canConnect}
            className={apps.length > 0 ? '' : 'gradient-primary border-0'}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : apps.length > 0 ? 'Reconnect' : 'Connect to App Store'}
          </Button>
          {connectionStatus && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${connectionStatus.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {connectionStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm font-medium">{connectionStatus.message}</span>
            </div>
          )}
          {sessionTimeLeft > 0 && !credentials.privateKey && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium font-mono">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeLeft(sessionTimeLeft)}
            </div>
          )}
        </div>
        {!canConnect && (
          <p className="text-sm text-muted-foreground px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
            Configure your App Store Connect credentials in the sidebar to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
