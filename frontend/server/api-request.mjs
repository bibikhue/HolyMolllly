export async function readJsonBody(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 32_000) throw new Error('Request too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
export function sameOrigin(request) {
  try { return !request.headers.origin || new URL(request.headers.origin).host === request.headers.host }
  catch { return false }
}
