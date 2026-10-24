import { readDirectoryRecursive } from '@/utils/mediaDrop'
import {
  GP_IMAGE_TYPES,
  resolveImageType,
  resolveLocaleCode,
  validateImageForType,
} from '@/services/googlePlayService'

const SINGLE_IMAGE_TYPES = Object.keys(GP_IMAGE_TYPES).filter(type => GP_IMAGE_TYPES[type].max === 1)
const TYPE_ORDER = Object.keys(GP_IMAGE_TYPES)
const MIME_BY_EXTENSION = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }
const DIMENSION_BATCH = 8

// Dropped files sometimes come with an empty MIME type — fall back to the extension
export function getImageMimeType(file) {
  if (file.type) return file.type
  return MIME_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase()] || ''
}

export async function readImageDimensions(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dims
  } catch {
    return { width: 0, height: 0 }
  }
}

// Read size/format, pick the image type when the path didn't say, then validate against
// the Play Console rules. Returns the image record the upload queue works with.
export async function inspectImageFile(file, { imageType, typeFromPath = true, path = file.name }) {
  const mimeType = getImageMimeType(file)
  const { width, height } = await readImageDimensions(file)
  let type = imageType
  // A 1024×500 image dropped without a type folder can only be a feature graphic
  if (!typeFromPath && width === 1024 && height === 500) type = 'featureGraphic'
  return {
    file,
    name: file.name,
    path,
    imageType: type,
    width,
    height,
    mimeType,
    error: validateImageForType(type, { width, height, size: file.size, mimeType }),
  }
}

async function inspectAll(candidates) {
  const images = []
  for (let i = 0; i < candidates.length; i += DIMENSION_BATCH) {
    images.push(...await Promise.all(candidates.slice(i, i + DIMENSION_BATCH).map(c => inspectImageFile(c.file, c))))
  }
  return images
}

// Work out where a file belongs from its folders: the first folder that is a Google Play
// language is the locale, the deepest folder after it that names an image type is the type
// ("fr-FR/phone/1.png", "fr_FR/7-inch/1.png", "phone/fr-FR/1.png" all work).
// Single-image types can also be told by file name ("fr-FR/featureGraphic.png").
function classify(folders, fileName, defaultType) {
  const localeIndex = folders.findIndex(name => resolveLocaleCode(name))
  const locale = localeIndex >= 0 ? resolveLocaleCode(folders[localeIndex]) : null
  const folder = localeIndex >= 0 ? folders[localeIndex] : folders[folders.length - 1]

  let imageType = null
  for (const name of folders) {
    const type = resolveImageType(name)
    if (type) imageType = type
  }
  if (!imageType) {
    const byName = resolveImageType(fileName)
    if (byName && SINGLE_IMAGE_TYPES.includes(byName)) imageType = byName
  }
  return { locale, folder, imageType: imageType || defaultType, typeFromPath: Boolean(imageType) }
}

// Turn a drop event into a validated upload queue grouped by Google Play language.
// A dropped folder is expected to hold one subfolder per locale (fr-FR/, en-US/…), each
// optionally split by image type; a dropped locale folder works too, and loose files go to
// `fallbackLocale`. `defaultType` applies to images that don't say which type they are.
//
// Returns [{ key, locale, folder, images: [{ file, name, imageType, width, height, error }], skipped, status }]
// — `locale` is null when the folder isn't a Google Play language.
export async function readGooglePlayMediaDrop(dataTransfer, { fallbackLocale = 'en-US', defaultType = 'phoneScreenshots' } = {}) {
  // Grab every entry synchronously: the DataTransferItemList is emptied as soon
  // as the drop handler yields, so awaiting inside the first loop drops items.
  const dropped = []
  for (const item of dataTransfer.items) {
    if (item.kind !== 'file') continue
    const entry = item.webkitGetAsEntry?.()
    if (entry) dropped.push({ entry, file: entry.isDirectory ? null : item.getAsFile() })
  }

  const groups = new Map()
  const groupFor = (locale, folder) => {
    const key = locale || `?${folder}`
    if (!groups.has(key)) groups.set(key, { key, locale, folder, candidates: [], skipped: 0 })
    return groups.get(key)
  }

  for (const { entry, file: looseFile } of dropped) {
    if (entry.isDirectory) {
      const files = await readDirectoryRecursive(entry)
      for (const { file, path } of files) {
        const folders = [entry.name, ...path.split('/').slice(0, -1)]
        const { locale, folder, imageType, typeFromPath } = classify(folders, file.name, defaultType)
        const group = groupFor(locale, folder)
        if (getImageMimeType(file).startsWith('image/')) {
          group.candidates.push({ file, imageType, typeFromPath, path: `${entry.name}/${path}` })
        } else {
          group.skipped++
        }
      }
    } else if (looseFile && getImageMimeType(looseFile).startsWith('image/')) {
      const type = resolveImageType(looseFile.name)
      const typeFromPath = Boolean(type && SINGLE_IMAGE_TYPES.includes(type))
      groupFor(fallbackLocale, fallbackLocale).candidates.push({
        file: looseFile, imageType: typeFromPath ? type : defaultType, typeFromPath, path: looseFile.name,
      })
    }
  }

  const queue = []
  for (const group of groups.values()) {
    const images = await inspectAll(group.candidates)
    if (images.length === 0 && group.skipped === 0) continue
    images.sort((a, b) =>
      TYPE_ORDER.indexOf(a.imageType) - TYPE_ORDER.indexOf(b.imageType) ||
      a.name.localeCompare(b.name, undefined, { numeric: true }))
    queue.push({ key: group.key, locale: group.locale, folder: group.folder, images, skipped: group.skipped, status: 'pending' })
  }

  // Recognised locales first, alphabetically; unknown folders last
  queue.sort((a, b) => (a.locale ? 0 : 1) - (b.locale ? 0 : 1) || a.key.localeCompare(b.key))
  return queue
}
