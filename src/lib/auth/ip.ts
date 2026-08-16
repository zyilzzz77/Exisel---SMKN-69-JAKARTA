import "server-only";

/**
 * Client IP dari trusted reverse proxy headers.
 * Prioritas: CF-Connecting-IP → X-Forwarded-For → X-Real-IP.
 * Jangan pernah percaya IP yang dikirim frontend sebagai header biasa.
 */
export function getClientIp(request: Request): string | undefined {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return undefined;
}