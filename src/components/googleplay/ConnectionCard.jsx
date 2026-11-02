import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Clock, Loader2, Lock, Unlock } from 'lucide-react'

export default function ConnectionCard({
  credentials,
  hasStoredGpKey,
  canConnect,
  sessionTimeLeft,
  formatTimeLeft,
  isConnecting,
  connectionStatus,
  decryptPassword,
  setDecryptPassword,
  isDecrypting,
  decryptError,
  setDecryptError,
  handleDecryptServiceAccount,
  handleTestConnection,
}) {
  return (
    <Card id="gp-connection" className="scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">Connection</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Service account status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {credentials.serviceAccountJson ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-positive/10 text-positive text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready
              </div>
            ) : hasStoredGpKey ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-medium">
                <Lock className="h-3.5 w-3.5 text-faint" />
                Encrypted
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-highlight/10 text-highlight-ink text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                No credentials
              </div>
            )}
            {sessionTimeLeft > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-mono tabular-nums">
                <Clock className="h-3.5 w-3.5 text-faint" />
                {formatTimeLeft(sessionTimeLeft)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {hasStoredGpKey && !credentials.serviceAccountJson && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2">
            <Input
              type="password"
              placeholder="Enter password to decrypt"
              value={decryptPassword}
              onChange={(e) => { setDecryptPassword(e.target.value); setDecryptError('') }}
              className="max-w-xs h-9"
              onKeyDown={(e) => e.key === 'Enter' && handleDecryptServiceAccount()}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <Button
              size="sm"
              onClick={handleDecryptServiceAccount}
              disabled={isDecrypting || !decryptPassword}
            >
              {isDecrypting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4 mr-1.5" />}
              Decrypt
            </Button>
          </div>
          {decryptError && <p className="text-xs text-destructive mt-2">{decryptError}</p>}
        </CardContent>
      )}
      {canConnect && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleTestConnection}
              disabled={isConnecting}
              variant={connectionStatus?.success && !connectionStatus?.tokenOnly ? 'outline' : 'default'}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing
                </>
              ) : connectionStatus?.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Connected
                </>
              ) : 'Test connection'}
            </Button>
            {connectionStatus && (
              <div className={`flex items-start gap-2 px-4 py-2 rounded-lg max-w-lg ${connectionStatus.success ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
                {connectionStatus.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span className="text-sm whitespace-pre-wrap">{connectionStatus.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
      {!canConnect && !hasStoredGpKey && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Upload your Google Cloud service account JSON file in the sidebar to get started.
          </p>
          <details className="text-sm mt-3">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Setup guide
            </summary>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-xs text-muted-foreground">
              <li>Create a service account in Google Cloud Console</li>
              <li>Download the JSON key file</li>
              <li>In Play Console, open Settings, API access, and link the service account</li>
              <li>Grant "Admin" or "Release manager" permission for your app</li>
            </ol>
          </details>
        </CardContent>
      )}
    </Card>
  )
}
