// Saves in-memory text as a file download (nothing is sent anywhere).
export function downloadTextFile(filename, content, mimeType = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// "my-project" -> "my-project-service-account.json"; falls back when the JSON can't be parsed
export function serviceAccountFilename(serviceAccountJson) {
  try {
    const { project_id: projectId, client_email: email } = JSON.parse(serviceAccountJson)
    const base = projectId || email?.split('@')[0]
    if (base) return `${String(base).replace(/[^\w.-]+/g, '-')}-service-account.json`
  } catch { /* not valid JSON — use the generic name */ }
  return 'service-account.json'
}
