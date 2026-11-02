// Reads the Info.plist of an .ipa in the browser without loading the whole
// archive: only the zip's central directory and the one plist entry are read
// (Blob.slice), then inflated with DecompressionStream.

const EOCD_SIGNATURE = 0x06054b50
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const INFO_PLIST_PATH = /^Payload\/[^/]+\.app\/Info\.plist$/

async function readBytes(file, start, length) {
  return new Uint8Array(await file.slice(start, start + length).arrayBuffer())
}

function u64(view, offset) {
  return Number(view.getBigUint64(offset, true))
}

async function readCentralDirectory(file) {
  const tailLength = Math.min(file.size, 65557)
  const tail = await readBytes(file, file.size - tailLength, tailLength)
  const view = new DataView(tail.buffer)
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Not a valid .ipa (zip end record missing)')

  let size = view.getUint32(eocd + 12, true)
  let offset = view.getUint32(eocd + 16, true)

  // ZIP64: the real sizes live in the ZIP64 end record pointed to by the locator
  if (offset === 0xffffffff || size === 0xffffffff) {
    const locator = eocd - 20
    if (locator < 0 || view.getUint32(locator, true) !== ZIP64_LOCATOR_SIGNATURE) {
      throw new Error('Unsupported .ipa (ZIP64 locator missing)')
    }
    const recordOffset = u64(view, locator + 8)
    const record = new DataView((await readBytes(file, recordOffset, 56)).buffer)
    size = u64(record, 40)
    offset = u64(record, 48)
  }

  return readBytes(file, offset, size)
}

function findEntry(directory, matcher) {
  const view = new DataView(directory.buffer)
  const decoder = new TextDecoder()
  let p = 0
  while (p + 46 <= directory.length && view.getUint32(p, true) === CENTRAL_SIGNATURE) {
    const method = view.getUint16(p + 10, true)
    let compressedSize = view.getUint32(p + 20, true)
    let size = view.getUint32(p + 24, true)
    const nameLength = view.getUint16(p + 28, true)
    const extraLength = view.getUint16(p + 30, true)
    const commentLength = view.getUint16(p + 32, true)
    let localOffset = view.getUint32(p + 42, true)
    const name = decoder.decode(directory.subarray(p + 46, p + 46 + nameLength))

    if (matcher.test(name)) {
      // ZIP64 extra field: only the values saturated in the header are present, in this order
      let e = p + 46 + nameLength
      const end = e + extraLength
      while (e + 4 <= end) {
        const id = view.getUint16(e, true)
        const length = view.getUint16(e + 2, true)
        if (id === 0x0001) {
          let q = e + 4
          if (size === 0xffffffff) { size = u64(view, q); q += 8 }
          if (compressedSize === 0xffffffff) { compressedSize = u64(view, q); q += 8 }
          if (localOffset === 0xffffffff) { localOffset = u64(view, q) }
        }
        e += 4 + length
      }
      return { name, method, compressedSize, size, localOffset }
    }
    p += 46 + nameLength + extraLength + commentLength
  }
  return null
}

async function readEntry(file, entry) {
  const header = new DataView((await readBytes(file, entry.localOffset, 30)).buffer)
  if (header.getUint32(0, true) !== LOCAL_SIGNATURE) throw new Error('Corrupted .ipa (local header missing)')
  const dataStart = entry.localOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true)
  const blob = file.slice(dataStart, dataStart + entry.compressedSize)

  if (entry.method === 0) return new Uint8Array(await blob.arrayBuffer())
  if (entry.method !== 8) throw new Error(`Unsupported compression in .ipa (method ${entry.method})`)
  const stream = blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// ─── Property lists ──────────────────────────────────────────────────────────

function parseBinaryPlist(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const trailer = bytes.length - 32
  const offsetSize = view.getUint8(trailer + 6)
  const refSize = view.getUint8(trailer + 7)
  const topObject = u64BE(view, trailer + 16, 8)
  const tableOffset = u64BE(view, trailer + 24, 8)

  const objectOffset = (index) => u64BE(view, tableOffset + index * offsetSize, offsetSize)

  const lengthAt = (marker, p) => {
    const low = marker & 0x0f
    if (low !== 0x0f) return { length: low, start: p + 1 }
    const intMarker = view.getUint8(p + 1)
    const intSize = 1 << (intMarker & 0x0f)
    return { length: u64BE(view, p + 2, intSize), start: p + 2 + intSize }
  }

  const read = (index) => {
    const p = objectOffset(index)
    const marker = view.getUint8(p)
    const type = marker >> 4
    switch (type) {
      case 0x0:
        return marker === 0x09 ? true : marker === 0x08 ? false : null
      case 0x1:
        return u64BE(view, p + 1, 1 << (marker & 0x0f))
      case 0x2:
        return (marker & 0x0f) === 3 ? view.getFloat64(p + 1) : view.getFloat32(p + 1)
      case 0x3:
        return new Date(Date.UTC(2001, 0, 1) + view.getFloat64(p + 1) * 1000)
      case 0x4: {
        const { length, start } = lengthAt(marker, p)
        return bytes.subarray(start, start + length)
      }
      case 0x5: {
        const { length, start } = lengthAt(marker, p)
        return new TextDecoder('ascii').decode(bytes.subarray(start, start + length))
      }
      case 0x6: {
        const { length, start } = lengthAt(marker, p)
        let text = ''
        for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint16(start + i * 2))
        return text
      }
      case 0xa: {
        const { length, start } = lengthAt(marker, p)
        return Array.from({ length }, (_, i) => read(u64BE(view, start + i * refSize, refSize)))
      }
      case 0xd: {
        const { length, start } = lengthAt(marker, p)
        const out = {}
        for (let i = 0; i < length; i++) {
          const key = read(u64BE(view, start + i * refSize, refSize))
          out[key] = read(u64BE(view, start + (length + i) * refSize, refSize))
        }
        return out
      }
      default:
        return null
    }
  }

  return read(topObject)
}

function u64BE(view, offset, size) {
  let value = 0
  for (let i = 0; i < size; i++) value = value * 256 + view.getUint8(offset + i)
  return value
}

function parseXmlPlist(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const convert = (node) => {
    switch (node.nodeName) {
      case 'dict': {
        const out = {}
        const children = [...node.children]
        for (let i = 0; i < children.length; i += 2) out[children[i].textContent] = convert(children[i + 1])
        return out
      }
      case 'array': return [...node.children].map(convert)
      case 'string': return node.textContent
      case 'integer': return Number(node.textContent)
      case 'real': return Number(node.textContent)
      case 'true': return true
      case 'false': return false
      default: return node.textContent
    }
  }
  const root = doc.querySelector('plist > *')
  if (!root) throw new Error('Unreadable Info.plist')
  return convert(root)
}

export function parsePlist(bytes) {
  const magic = new TextDecoder('ascii').decode(bytes.subarray(0, 8))
  if (magic === 'bplist00') return parseBinaryPlist(bytes)
  return parseXmlPlist(new TextDecoder().decode(bytes))
}

// ─── Public ──────────────────────────────────────────────────────────────────

const PLATFORMS = { iphoneos: 'IOS', appletvos: 'TV_OS', xros: 'VISION_OS' }

// → { bundleId, version, build, platform, name, minimumOS }
export async function readIpaInfo(file) {
  if (!/\.ipa$/i.test(file.name)) throw new Error('Drop an .ipa file')
  const directory = await readCentralDirectory(file)
  const entry = findEntry(directory, INFO_PLIST_PATH)
  if (!entry) throw new Error('No Payload/*.app/Info.plist in this .ipa')
  const plist = parsePlist(await readEntry(file, entry))

  const version = plist.CFBundleShortVersionString
  const build = plist.CFBundleVersion
  if (!version || !build) throw new Error('Info.plist has no CFBundleShortVersionString or CFBundleVersion')

  return {
    bundleId: plist.CFBundleIdentifier || '',
    version: String(version),
    build: String(build),
    platform: PLATFORMS[String(plist.DTPlatformName || '').toLowerCase()] || 'IOS',
    name: plist.CFBundleDisplayName || plist.CFBundleName || '',
    minimumOS: plist.MinimumOSVersion || '',
  }
}
