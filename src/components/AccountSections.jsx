import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Key, CheckCircle2, Download, Trash2, Lock, Unlock, Plus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadTextFile, serviceAccountFilename } from '@/utils/downloadFile'
import { parseServiceAccount } from '@/hooks/useAccounts'

const NEW_ACCOUNT = '__new__'

const linkClass = 'flex h-8 items-center gap-2 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors'

function dropZoneClass(isDragging, loaded) {
  return `flex flex-col items-center justify-center gap-1 h-20 rounded-lg border border-dashed cursor-pointer transition-colors duration-150 text-xs ${
    isDragging
      ? 'border-foreground/40 bg-sidebar-accent text-foreground'
      : loaded
        ? 'border-positive/40 bg-positive/8 text-positive'
        : 'border-border hover:border-foreground/25 hover:bg-sidebar-accent/60 text-muted-foreground'
  }`
}

// ─── Password ────────────────────────────────────────────────────────────────

// One dialog for both unlocking every account and saving a new one
function PasswordDialog({ state, onClose, accounts }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!state) return null

  const firstAccount = !accounts.hasAccounts
  const title = state.mode === 'unlock' ? 'Unlock your accounts' : firstAccount ? 'Choose a password' : 'Enter your password'
  const description = state.mode === 'unlock'
    ? 'One password opens every saved App Store Connect and Google Play account.'
    : firstAccount
      ? 'It encrypts this account and every account you add later. It never leaves this browser.'
      : 'The same password as your other accounts. It encrypts this one with them.'

  const close = () => { setPassword(''); setError(''); onClose() }

  const submit = async () => {
    if (password.length < 4) { setError('At least 4 characters'); return }
    setBusy(true)
    setError('')
    if (state.mode === 'unlock') {
      const result = await accounts.unlock(password)
      if (!result.ok) setError('Wrong password')
      else {
        if (result.failed) toast.warning(`${result.failed} ${result.failed === 1 ? 'account uses' : 'accounts use'} another password`, { description: 'Remove and add it again to use this password.' })
        close()
      }
    } else {
      const result = await state.onSave(password)
      if (!result.ok) setError(result.error)
      else close()
    }
    setBusy(false)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {state.mode === 'unlock' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Input
            type="password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {state.mode === 'unlock' ? 'Unlock' : 'Save account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Shared pieces ───────────────────────────────────────────────────────────

function AccountPicker({ label, accounts: list, activeId, onSelect, renderMeta, isUnlocked }) {
  if (list.length === 0) return null
  return (
    <Select value={activeId || NEW_ACCOUNT} onValueChange={(value) => onSelect(value === NEW_ACCOUNT ? null : value)}>
      <SelectTrigger aria-label={label} className="h-9 w-full text-sm [&_.keycap]:hidden">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {list.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isUnlocked(account.id) ? 'bg-positive' : 'bg-foreground/25'}`} />
              <span className="truncate">{account.name}</span>
              {renderMeta(account)}
            </span>
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={NEW_ACCOUNT}>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add an account
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

function LockState({ unlocked, onUnlock, onLock }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2">
      <span className={`flex items-center gap-2 text-xs ${unlocked ? 'text-positive' : 'text-muted-foreground'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${unlocked ? 'bg-positive' : 'bg-highlight'}`} />
        {unlocked ? 'Unlocked' : 'Locked'}
      </span>
      {unlocked ? (
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground" onClick={onLock} title="Forget every decrypted key until the next unlock">
          <Lock className="h-3.5 w-3.5" />
          Lock
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={onUnlock}>
          <Unlock className="h-3.5 w-3.5" />
          Unlock
        </Button>
      )}
    </div>
  )
}

function RemoveAccountButton({ name, onRemove }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Remove this account">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its encrypted key is deleted from this browser. You can add it again later from the original file.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRemove} className="bg-destructive text-white hover:bg-destructive/90">Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function NameField({ id, value, onChange, onBlur }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">Account name</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder="e.g. Studio, Client app" className="h-9 text-sm" />
    </div>
  )
}

// ─── App Store Connect ───────────────────────────────────────────────────────

export function AppStoreAccounts({ accounts, credentials, onCredentialsChange }) {
  const [isDragging, setIsDragging] = useState(false)
  const [newName, setNewName] = useState('')
  const [dialog, setDialog] = useState(null)
  const active = accounts.ascAccounts.find(a => a.id === accounts.activeAscId) || null
  const [renaming, setRenaming] = useState(null)

  const processKeyFile = async (file) => {
    if (!file || !file.name.endsWith('.p8')) return
    const content = await file.text()
    // AuthKey_XXXXXXXXXX.p8 carries the key ID
    const keyId = file.name.match(/AuthKey_([A-Z0-9]+)\.p8$/i)?.[1]
    onCredentialsChange(prev => ({ ...prev, privateKey: content, ...(keyId && !prev.keyId ? { keyId } : {}) }))
  }

  const save = async (password) => {
    const result = await accounts.saveAsc({ name: newName.trim(), password })
    if (result.ok) {
      toast.success('Account saved')
      setNewName('')
    }
    return result
  }

  const requestSave = async () => {
    if (accounts.isUnlocked) {
      const result = await save()
      if (!result.ok) toast.error(result.error)
    } else {
      setDialog({ mode: 'save', onSave: save })
    }
  }

  const exportKey = () => {
    const name = credentials.keyId ? `AuthKey_${credentials.keyId}.p8` : 'AuthKey.p8'
    downloadTextFile(name, credentials.privateKey)
    toast.success(`Exported ${name}`, { description: 'The file is not encrypted, store it somewhere safe.' })
  }

  const canSave = credentials.keyId && credentials.issuerId && credentials.privateKey

  return (
    <div className="space-y-4">
      <AccountPicker
        label="App Store Connect account"
        accounts={accounts.ascAccounts}
        activeId={accounts.activeAscId}
        onSelect={accounts.selectAsc}
        isUnlocked={accounts.isAscUnlocked}
        renderMeta={(a) => a.keyId && !a.name.includes(a.keyId) && <span className="keycap ml-auto">{a.keyId}</span>}
      />

      {active ? (
        <div className="space-y-3">
          <NameField
            id="asc-account-name"
            value={renaming ?? active.name}
            onChange={setRenaming}
            onBlur={() => { if (renaming?.trim()) accounts.renameAccount('asc', active.id, renaming.trim()); setRenaming(null) }}
          />
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-faint">Key ID</dt>
              <dd className="font-mono text-muted-foreground">{active.keyId}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-faint">Issuer ID</dt>
              <dd className="truncate font-mono text-muted-foreground" title={active.issuerId}>{active.issuerId}</dd>
            </div>
          </dl>
          <LockState
            unlocked={Boolean(credentials.privateKey)}
            onUnlock={() => setDialog({ mode: 'unlock' })}
            onLock={accounts.lock}
          />
          <div className="flex items-center gap-2">
            {credentials.privateKey && (
              <Button variant="outline" size="sm" className="h-8 flex-1 gap-1.5 text-xs" onClick={exportKey} title="Download the decrypted .p8 key">
                <Download className="h-3.5 w-3.5" />
                Export .p8
              </Button>
            )}
            <span className="flex-1" />
            <RemoveAccountButton name={active.name} onRemove={() => accounts.removeAccount('asc', active.id)} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <a href="https://appstoreconnect.apple.com/access/integrations/api" target="_blank" rel="noopener noreferrer" className={linkClass}>
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Get an API key from Apple</span>
          </a>
          {accounts.ascAccounts.length > 0 && <NameField id="asc-new-name" value={newName} onChange={setNewName} />}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Key ID</Label>
            <Input placeholder="XXXXXXXXXX" value={credentials.keyId} onChange={(e) => onCredentialsChange(prev => ({ ...prev, keyId: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Issuer ID</Label>
            <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={credentials.issuerId} onChange={(e) => onCredentialsChange(prev => ({ ...prev, issuerId: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Private key (.p8)</Label>
            <input type="file" accept=".p8" className="hidden" id="sidebar-p8-input" onChange={(e) => { processKeyFile(e.target.files?.[0]); e.target.value = '' }} />
            <label
              htmlFor="sidebar-p8-input"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); processKeyFile(e.dataTransfer.files?.[0]) }}
              className={dropZoneClass(isDragging, Boolean(credentials.privateKey))}
            >
              {credentials.privateKey ? <CheckCircle2 className="h-4 w-4" /> : <Key className="h-4 w-4 text-faint" />}
              <span>{isDragging ? 'Drop your key here' : credentials.privateKey ? 'Private key loaded' : 'Drop the .p8 file here'}</span>
            </label>
          </div>
          <Button className="h-8 w-full text-xs" onClick={requestSave} disabled={!canSave}>
            Save account
          </Button>
          <p className="text-xs leading-5 text-faint">
            {accounts.hasAccounts
              ? 'Saved with the same password as your other accounts.'
              : 'Saved encrypted in this browser. Without saving, the key is gone on reload.'}
          </p>
        </div>
      )}

      {accounts.hasAccounts && !accounts.isUnlocked && !active && (
        <Button variant="ghost" size="sm" className="h-8 w-full gap-1.5 text-xs text-muted-foreground" onClick={() => setDialog({ mode: 'unlock' })}>
          <Unlock className="h-3.5 w-3.5" />
          Unlock saved accounts
        </Button>
      )}

      <PasswordDialog state={dialog} onClose={() => setDialog(null)} accounts={accounts} />
    </div>
  )
}

// ─── Google Play ─────────────────────────────────────────────────────────────

export function GooglePlayAccounts({ accounts, credentials, onCredentialsChange }) {
  const [isDragging, setIsDragging] = useState(false)
  const [newName, setNewName] = useState('')
  const [dialog, setDialog] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const active = accounts.gpAccounts.find(a => a.id === accounts.activeGpId) || null
  const loaded = parseServiceAccount(credentials.serviceAccountJson || '')

  const processJson = async (file) => {
    if (!file || !file.name.endsWith('.json')) return
    onCredentialsChange(prev => ({ ...prev, serviceAccountJson: '' }))
    const content = await file.text()
    onCredentialsChange(prev => ({ ...prev, serviceAccountJson: content }))
  }

  const save = async (password) => {
    const result = await accounts.saveGp({ name: newName.trim(), password })
    if (result.ok) {
      toast.success('Account saved')
      setNewName('')
    }
    return result
  }

  const requestSave = async () => {
    if (accounts.isUnlocked) {
      const result = await save()
      if (!result.ok) toast.error(result.error)
    } else {
      setDialog({ mode: 'save', onSave: save })
    }
  }

  const exportJson = () => {
    const name = serviceAccountFilename(credentials.serviceAccountJson)
    downloadTextFile(name, credentials.serviceAccountJson, 'application/json')
    toast.success(`Exported ${name}`, { description: 'The file is not encrypted, store it somewhere safe.' })
  }

  return (
    <div className="space-y-4">
      <AccountPicker
        label="Google Play account"
        accounts={accounts.gpAccounts}
        activeId={accounts.activeGpId}
        onSelect={accounts.selectGp}
        isUnlocked={accounts.isGpUnlocked}
        renderMeta={() => null}
      />

      {active ? (
        <div className="space-y-3">
          <NameField
            id="gp-account-name"
            value={renaming ?? active.name}
            onChange={setRenaming}
            onBlur={() => { if (renaming?.trim()) accounts.renameAccount('gp', active.id, renaming.trim()); setRenaming(null) }}
          />
          {(active.clientEmail || loaded.clientEmail) && (
            <p className="truncate font-mono text-xs text-muted-foreground" title={active.clientEmail || loaded.clientEmail}>
              {active.clientEmail || loaded.clientEmail}
            </p>
          )}
          <LockState
            unlocked={Boolean(credentials.serviceAccountJson)}
            onUnlock={() => setDialog({ mode: 'unlock' })}
            onLock={accounts.lock}
          />
          <div className="flex items-center gap-2">
            {credentials.serviceAccountJson && (
              <Button variant="outline" size="sm" className="h-8 flex-1 gap-1.5 text-xs" onClick={exportJson} title="Download the decrypted service account JSON">
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </Button>
            )}
            <span className="flex-1" />
            <RemoveAccountButton name={active.name} onRemove={() => accounts.removeAccount('gp', active.id)} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <a href="https://developers.google.com/android-publisher/getting_started" target="_blank" rel="noopener noreferrer" className={linkClass}>
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Setup guide</span>
          </a>
          {accounts.gpAccounts.length > 0 && <NameField id="gp-new-name" value={newName} onChange={setNewName} />}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Service account JSON</Label>
            <input type="file" accept=".json" className="hidden" id="sidebar-gp-json-input" onChange={(e) => { processJson(e.target.files?.[0]); e.target.value = '' }} />
            <label
              htmlFor="sidebar-gp-json-input"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); processJson(e.dataTransfer.files?.[0]) }}
              className={dropZoneClass(isDragging, Boolean(credentials.serviceAccountJson))}
            >
              {credentials.serviceAccountJson ? <CheckCircle2 className="h-4 w-4" /> : <Key className="h-4 w-4 text-faint" />}
              <span className="max-w-full truncate px-2">
                {isDragging ? 'Drop the JSON here' : credentials.serviceAccountJson ? (loaded.clientEmail || 'Service account loaded') : 'Drop the .json file here'}
              </span>
            </label>
          </div>
          <Button className="h-8 w-full text-xs" onClick={requestSave} disabled={!credentials.serviceAccountJson}>
            Save account
          </Button>
          <p className="text-xs leading-5 text-faint">
            {accounts.hasAccounts
              ? 'Saved with the same password as your other accounts.'
              : 'Saved encrypted in this browser. Without saving, the file is gone on reload.'}
          </p>
        </div>
      )}

      {accounts.hasAccounts && !accounts.isUnlocked && !active && (
        <Button variant="ghost" size="sm" className="h-8 w-full gap-1.5 text-xs text-muted-foreground" onClick={() => setDialog({ mode: 'unlock' })}>
          <Unlock className="h-3.5 w-3.5" />
          Unlock saved accounts
        </Button>
      )}

      <PasswordDialog state={dialog} onClose={() => setDialog(null)} accounts={accounts} />
    </div>
  )
}
