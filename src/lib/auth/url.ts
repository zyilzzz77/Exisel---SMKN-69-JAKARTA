const FORBIDDEN_PRODUCTION_HOSTS = new Set([
  "0.0.0.0",
  "localhost",
  "127.0.0.1",
  "::1",
]);

/**
 * Returns the canonical public origin of the application.
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL / APP_URL environment variable
 * 2. Host and Protocol from Request headers (e.g. X-Forwarded-Host / Host)
 * 3. Fallback request.url origin (for local dev)
 */
export function getCanonicalAppOrigin(request?: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();

  if (configured) {
    try {
      const url = new URL(configured);
      if (
        process.env.NODE_ENV === "production" &&
        FORBIDDEN_PRODUCTION_HOSTS.has(url.hostname)
      ) {
        console.warn(
          `[AUTH WARNING] NEXT_PUBLIC_APP_URL berisi host internal (${url.hostname}) pada production. Fallback ke request header.`,
        );
      } else {
        return url.origin;
      }
    } catch {
      // Ignore malformed env URL
    }
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (request.url.startsWith("https") ? "https" : "http");

    if (host) {
      const cleanHost = host.split(":")[0];
      if (
        process.env.NODE_ENV === "production" &&
        FORBIDDEN_PRODUCTION_HOSTS.has(cleanHost)
      ) {
        // In production container behind proxy, host might be 0.0.0.0 if not properly forwarded
        // Return configured domain or fallback
      } else {
        return `${forwardedProto}://${host}`;
      }
    }

    try {
      return new URL(request.url).origin;
    } catch {
      // ignore
    }
  }

  if (process.env.NODE_ENV === "production") {
    const domain = process.env.DOMAIN?.trim();
    if (domain) {
      return `https://${domain}`;
    }
  }

  return "http://localhost:3000";
}

/**
 * Safely sanitizes internal relative redirects and ensures absolute redirects
 * always point to the canonical public application origin.
 */
export function sanitizeInternalRedirect(
  targetPath: string,
  request?: Request,
): string {
  const origin = getCanonicalAppOrigin(request);
  const cleanTarget = targetPath.trim();

  if (!cleanTarget || !cleanTarget.startsWith("/") || cleanTarget.startsWith("//")) {
    return `${origin}/`;
  }

  return `${origin}${cleanTarget}`;
}
