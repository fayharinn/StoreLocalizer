import { normalizeLocaleCode } from '@/services/appStoreConnectService'

export async function readDirectoryRecursive(dirEntry, path = '') {
  const files = []
  const reader = dirEntry.createReader()

  const readEntries = () => new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject)
  })

  let entries = await readEntries()
  while (entries.length > 0) {
    for (const entry of entries) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name
      if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve))
        files.push({ file, path: entryPath })
      } else if (entry.isDirectory) {
        const subFiles = await readDirectoryRecursive(entry, entryPath)
        files.push(...subFiles)
      }
    }
    entries = await readEntries()
  }

  return files
}

export const isImageFile = (file) => file.type.startsWith('image/')
export const isVideoFile = (file) => file.type.startsWith('video/')

// Turn a drop event into an upload queue grouped by ASC locale.
// A dropped folder is expected to contain one subfolder per locale (en, fr, de-DE…);
// loose files are assigned to `fallbackLocale`. `accept` filters the media kept.
// Returns [{ locale, files, status: 'pending' }], files sorted by name.
export async function readLocalizedMediaDrop(dataTransfer, fallbackLocale = 'en-US', accept = isImageFile) {
  const queue = []

  // Grab every entry synchronously: the DataTransferItemList is emptied as soon
  // as the drop handler yields, so awaiting inside the first loop drops items.
  const dropped = []
  for (const item of dataTransfer.items) {
    if (item.kind !== 'file') continue
    const entry = item.webkitGetAsEntry?.()
    if (entry) dropped.push({ entry, file: entry.isDirectory ? null : item.getAsFile() })
  }

  for (const { entry, file: looseFile } of dropped) {
    if (entry.isDirectory) {
      const files = await readDirectoryRecursive(entry)

      const filesByLocale = {}
      for (const { file, path } of files) {
        const pathParts = path.split('/')
        const localeFolder = pathParts.length > 1 ? pathParts[0] : entry.name
        const normalizedLocale = normalizeLocaleCode(localeFolder)

        if (!filesByLocale[normalizedLocale]) {
          filesByLocale[normalizedLocale] = []
        }
        if (accept(file)) {
          filesByLocale[normalizedLocale].push(file)
        }
      }

      for (const [locale, localeFiles] of Object.entries(filesByLocale)) {
        if (localeFiles.length > 0) {
          localeFiles.sort((a, b) => a.name.localeCompare(b.name))
          queue.push({ locale, files: localeFiles, status: 'pending' })
        }
      }
    } else if (looseFile && accept(looseFile)) {
      const existing = queue.find(q => q.locale === fallbackLocale)
      if (existing) {
        existing.files.push(looseFile)
      } else {
        queue.push({ locale: fallbackLocale, files: [looseFile], status: 'pending' })
      }
    }
  }

  return queue
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
