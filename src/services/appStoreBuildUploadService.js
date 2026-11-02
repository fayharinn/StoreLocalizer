// App Store Connect build uploads (API 4.1): send an .ipa without Xcode or
// Transporter. buildUploads is the upload as a whole, buildUploadFiles the
// binary itself: create upload → reserve file → PUT the parts → commit → poll.
import { apiRequest, generateToken } from './appStoreConnectService'

const UPLOAD_CONCURRENCY = 4

// AWAITING_UPLOAD → PROCESSING → COMPLETE | FAILED
export const BUILD_UPLOAD_DONE_STATES = ['COMPLETE', 'FAILED']

async function getToken(credentials) {
  const { keyId, issuerId, privateKey } = credentials
  return generateToken(keyId, issuerId, privateKey)
}

function mapBuildUpload(data) {
  const a = data?.attributes || {}
  return {
    id: data.id,
    version: a.cfBundleShortVersionString || '',
    build: a.cfBundleVersion || '',
    platform: a.platform || '',
    createdDate: a.createdDate || null,
    uploadedDate: a.uploadedDate || null,
    state: a.state?.state || 'AWAITING_UPLOAD',
    errors: a.state?.errors || [],
    warnings: a.state?.warnings || [],
  }
}

export async function listBuildUploads(credentials, appId) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/apps/${appId}/buildUploads?limit=20`, token)
  return (data?.data || [])
    .map(mapBuildUpload)
    .sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''))
}

export async function getBuildUpload(credentials, buildUploadId) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/buildUploads/${buildUploadId}`, token)
  return mapBuildUpload(data.data)
}

// PUT each reserved byte range straight to Apple's upload URLs, reporting bytes sent
async function uploadParts(uploadOperations, file, onBytes) {
  let sent = 0
  const queue = [...uploadOperations]
  const worker = async () => {
    while (queue.length) {
      const { method, url, offset, length, requestHeaders } = queue.shift()
      const headers = Object.fromEntries((requestHeaders || []).map(h => [h.name, h.value]))
      const response = await fetch(url, { method, headers, body: file.slice(offset, offset + length) })
      if (!response.ok) throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      sent += length
      onBytes?.(sent)
    }
  }
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, uploadOperations.length) }, worker))
}

// info: { version, build, platform } read from the .ipa's Info.plist
// onProgress({ stage: 'creating' | 'uploading' | 'committing', sent, total })
export async function uploadBuild(credentials, appId, file, info, { onProgress } = {}) {
  onProgress?.({ stage: 'creating', sent: 0, total: file.size })
  const created = await apiRequest('/buildUploads', await getToken(credentials), {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'buildUploads',
        attributes: {
          cfBundleShortVersionString: info.version,
          cfBundleVersion: info.build,
          platform: info.platform,
        },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    }),
  })
  const buildUploadId = created.data.id

  const reserved = await apiRequest('/buildUploadFiles', await getToken(credentials), {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'buildUploadFiles',
        attributes: { assetType: 'ASSET', fileName: file.name, fileSize: file.size, uti: 'com.apple.ipa' },
        relationships: { buildUpload: { data: { type: 'buildUploads', id: buildUploadId } } },
      },
    }),
  })
  const fileId = reserved.data.id

  onProgress?.({ stage: 'uploading', sent: 0, total: file.size })
  await uploadParts(reserved.data.attributes?.uploadOperations || [], file, (sent) => {
    onProgress?.({ stage: 'uploading', sent, total: file.size })
  })

  // Checksums are optional on the commit; Apple verifies the parts it received
  onProgress?.({ stage: 'committing', sent: file.size, total: file.size })
  await apiRequest(`/buildUploadFiles/${fileId}`, await getToken(credentials), {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: 'buildUploadFiles', id: fileId, attributes: { uploaded: true } } }),
  })

  return getBuildUpload(credentials, buildUploadId)
}
