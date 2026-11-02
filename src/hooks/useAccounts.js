import { useState, useCallback, useEffect, useRef } from 'react'
import { encrypt, decrypt } from '@/utils/crypto'

// Several App Store Connect keys and Google Play service accounts, saved under
// one password. The index (names, key IDs, emails) is readable so accounts can
// be listed before unlocking; each secret is encrypted on its own.
//
// The active account's encrypted secret is mirrored to the single-key storage
// the store pages already unlock from, so those flows keep working unchanged.
const ACCOUNTS_KEY = 'storelocalizer-accounts'
const ASC_ACTIVE_BLOB = 'asc-encrypted-p8-key'
const GP_ACTIVE_BLOB = 'gp-encrypted-service-account'

const emptyIndex = { version: 1, asc: [], gp: [], activeAsc: null, activeGp: null }

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function parseServiceAccount(json) {
  try {
    const data = JSON.parse(json)
    return { clientEmail: data.client_email || '', projectId: data.project_id || '' }
  } catch {
    return { clientEmail: '', projectId: '' }
  }
}

// Keys saved before multiple accounts existed become the first account of each kind
function loadIndex() {
  let index = emptyIndex
  try {
    const saved = localStorage.getItem(ACCOUNTS_KEY)
    if (saved) index = { ...emptyIndex, ...JSON.parse(saved) }
  } catch { /* unreadable index: start over, the single-key storage still works */ }

  if (index.asc.length === 0) {
    const blob = localStorage.getItem(ASC_ACTIVE_BLOB)
    if (blob) {
      let keyId = '', issuerId = ''
      try { ({ keyId = '', issuerId = '' } = JSON.parse(localStorage.getItem('asc-localizer-config')) || {}) } catch { /* no saved IDs */ }
      const id = newId()
      index = { ...index, asc: [{ id, name: keyId ? `Key ${keyId}` : 'App Store Connect', keyId, issuerId, encryptedKey: blob }], activeAsc: id }
    }
  }
  if (index.gp.length === 0) {
    const blob = localStorage.getItem(GP_ACTIVE_BLOB)
    if (blob) {
      const id = newId()
      index = { ...index, gp: [{ id, name: 'Google Play', clientEmail: '', projectId: '', encryptedJson: blob }], activeGp: id }
    }
  }
  return index
}

function persistIndex(index) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(index))
  const asc = index.asc.find(a => a.id === index.activeAsc)
  const gp = index.gp.find(a => a.id === index.activeGp)
  if (asc) localStorage.setItem(ASC_ACTIVE_BLOB, asc.encryptedKey)
  else localStorage.removeItem(ASC_ACTIVE_BLOB)
  if (gp) localStorage.setItem(GP_ACTIVE_BLOB, gp.encryptedJson)
  else localStorage.removeItem(GP_ACTIVE_BLOB)
}

export default function useAccounts({ ascCredentials, setAscCredentials, gpCredentials, setGpCredentials }) {
  const [index, setIndex] = useState(loadIndex)
  // Decrypted secrets by account id, in memory only
  const [secrets, setSecrets] = useState({ asc: {}, gp: {} })
  const passwordRef = useRef(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  useEffect(() => { persistIndex(index) }, [index])

  // The active Apple account's IDs drive the rest of the app
  const activeAsc = index.asc.find(a => a.id === index.activeAsc) || null
  const activeGp = index.gp.find(a => a.id === index.activeGp) || null

  const update = useCallback((fn) => setIndex(prev => fn(prev)), [])

  // Checks a password against an existing secret, so every account shares one password
  const checkPassword = useCallback(async (password) => {
    const sample = index.asc[0]?.encryptedKey || index.gp[0]?.encryptedJson
    if (!sample) return true
    return (await decrypt(sample, password)).success
  }, [index])

  const unlock = useCallback(async (password) => {
    const next = { asc: {}, gp: {} }
    let opened = 0, failed = 0
    for (const a of index.asc) {
      const r = await decrypt(a.encryptedKey, password)
      if (r.success) { next.asc[a.id] = r.data; opened++ } else failed++
    }
    for (const a of index.gp) {
      const r = await decrypt(a.encryptedJson, password)
      if (r.success) { next.gp[a.id] = r.data; opened++ } else failed++
    }
    if (opened === 0) return { ok: false, opened, failed }

    passwordRef.current = password
    setSecrets(next)
    setIsUnlocked(true)

    // Fill in the active accounts right away, and the emails of migrated service accounts
    if (activeAsc && next.asc[activeAsc.id]) {
      setAscCredentials({ keyId: activeAsc.keyId, issuerId: activeAsc.issuerId, privateKey: next.asc[activeAsc.id] })
    }
    if (activeGp && next.gp[activeGp.id]) setGpCredentials({ serviceAccountJson: next.gp[activeGp.id] })
    update(prev => ({
      ...prev,
      gp: prev.gp.map(a => {
        if (a.clientEmail || !next.gp[a.id]) return a
        const info = parseServiceAccount(next.gp[a.id])
        return { ...a, ...info, name: a.name === 'Google Play' && info.projectId ? info.projectId : a.name }
      }),
    }))
    return { ok: true, opened, failed }
  }, [index, activeAsc, activeGp, setAscCredentials, setGpCredentials, update])

  const lock = useCallback(() => {
    passwordRef.current = null
    setSecrets({ asc: {}, gp: {} })
    setIsUnlocked(false)
    setAscCredentials(prev => ({ ...prev, privateKey: '' }))
    setGpCredentials({ serviceAccountJson: '' })
  }, [setAscCredentials, setGpCredentials])

  // null selects a new, unsaved account (the entry form)
  const selectAsc = useCallback((id) => {
    const account = index.asc.find(a => a.id === id)
    update(prev => ({ ...prev, activeAsc: account ? id : null }))
    setAscCredentials(account
      ? { keyId: account.keyId, issuerId: account.issuerId, privateKey: secrets.asc[id] || '' }
      : { keyId: '', issuerId: '', privateKey: '' })
  }, [index, secrets, setAscCredentials, update])

  const selectGp = useCallback((id) => {
    const account = index.gp.find(a => a.id === id)
    update(prev => ({ ...prev, activeGp: account ? id : null }))
    setGpCredentials({ serviceAccountJson: account ? secrets.gp[id] || '' : '' })
  }, [index, secrets, setGpCredentials, update])

  // Saves the credentials currently in the form as an account (or updates the active one)
  const saveAsc = useCallback(async ({ name, password }) => {
    const pass = passwordRef.current || password
    if (!pass) return { ok: false, error: 'Enter your password' }
    if (!passwordRef.current && !(await checkPassword(pass))) {
      return { ok: false, error: 'Use the password of your other accounts' }
    }
    const { keyId, issuerId, privateKey } = ascCredentials
    const encryptedKey = await encrypt(privateKey, pass)
    const existing = index.asc.find(a => a.id === index.activeAsc) || index.asc.find(a => a.keyId === keyId && a.issuerId === issuerId)
    const id = existing?.id || newId()
    const account = { id, name: name || existing?.name || `Key ${keyId}`, keyId, issuerId, encryptedKey }
    update(prev => ({
      ...prev,
      asc: existing ? prev.asc.map(a => (a.id === id ? account : a)) : [...prev.asc, account],
      activeAsc: id,
    }))
    setSecrets(prev => ({ ...prev, asc: { ...prev.asc, [id]: privateKey } }))
    passwordRef.current = pass
    setIsUnlocked(true)
    return { ok: true }
  }, [ascCredentials, index, checkPassword, update])

  const saveGp = useCallback(async ({ name, password }) => {
    const pass = passwordRef.current || password
    if (!pass) return { ok: false, error: 'Enter your password' }
    if (!passwordRef.current && !(await checkPassword(pass))) {
      return { ok: false, error: 'Use the password of your other accounts' }
    }
    const json = gpCredentials.serviceAccountJson
    const info = parseServiceAccount(json)
    const encryptedJson = await encrypt(json, pass)
    const existing = index.gp.find(a => a.id === index.activeGp) || index.gp.find(a => info.clientEmail && a.clientEmail === info.clientEmail)
    const id = existing?.id || newId()
    const account = { id, name: name || existing?.name || info.projectId || info.clientEmail || 'Google Play', ...info, encryptedJson }
    update(prev => ({
      ...prev,
      gp: existing ? prev.gp.map(a => (a.id === id ? account : a)) : [...prev.gp, account],
      activeGp: id,
    }))
    setSecrets(prev => ({ ...prev, gp: { ...prev.gp, [id]: json } }))
    passwordRef.current = pass
    setIsUnlocked(true)
    return { ok: true }
  }, [gpCredentials, index, checkPassword, update])

  const renameAccount = useCallback((kind, id, name) => {
    update(prev => ({ ...prev, [kind]: prev[kind].map(a => (a.id === id ? { ...a, name } : a)) }))
  }, [update])

  const removeAccount = useCallback((kind, id) => {
    update(prev => {
      const list = prev[kind].filter(a => a.id !== id)
      const activeKey = kind === 'asc' ? 'activeAsc' : 'activeGp'
      return { ...prev, [kind]: list, [activeKey]: prev[activeKey] === id ? null : prev[activeKey] }
    })
    if (kind === 'asc' && index.activeAsc === id) setAscCredentials({ keyId: '', issuerId: '', privateKey: '' })
    if (kind === 'gp' && index.activeGp === id) setGpCredentials({ serviceAccountJson: '' })
  }, [index, setAscCredentials, setGpCredentials, update])

  // Secrets never leave the hook, encrypted or not
  const publicAsc = index.asc.map(({ id, name, keyId, issuerId }) => ({ id, name, keyId, issuerId }))
  const publicGp = index.gp.map(({ id, name, clientEmail, projectId }) => ({ id, name, clientEmail, projectId }))

  return {
    ascAccounts: publicAsc,
    gpAccounts: publicGp,
    activeAscId: index.activeAsc,
    activeGpId: index.activeGp,
    hasAccounts: index.asc.length + index.gp.length > 0,
    isUnlocked,
    isAscUnlocked: (id) => Boolean(secrets.asc[id]),
    isGpUnlocked: (id) => Boolean(secrets.gp[id]),
    unlock,
    lock,
    selectAsc,
    selectGp,
    saveAsc,
    saveGp,
    renameAccount,
    removeAccount,
  }
}
