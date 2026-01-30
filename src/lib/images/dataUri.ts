/**
 * Build a data URI from raw base64 or an existing data URI.
 * Uses mime_type when present for MIME-safe display (e.g. from job.result).
 */
export function toDataUri(
  base64OrDataUri: string,
  mimeType?: string
): string {
  if (!base64OrDataUri) return '';
  if (base64OrDataUri.startsWith('data:')) return base64OrDataUri;
  const mime = mimeType || 'image/jpeg';
  return `data:${mime};base64,${base64OrDataUri}`;
}
