import { headers, cookies } from "next/headers";

export interface CoreFetchOptions extends RequestInit {
  timeoutMs?: number;
  forwardAuth?: boolean;
}

export interface CoreApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

export async function coreFetch<T = unknown>(
  path: string,
  options: CoreFetchOptions = {}
): Promise<CoreApiResponse<T>> {
  const coreUrl = process.env.EXISEL_CORE_URL || "http://localhost:8080";
  const { timeoutMs = 5000, forwardAuth = true, ...init } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = new Headers(init.headers);
  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  // Propagate Context Headers
  try {
    const incomingHeaders = await headers();
    const requestId = incomingHeaders.get("x-request-id");
    if (requestId) requestHeaders.set("x-request-id", requestId);

    const clientIp =
      incomingHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      incomingHeaders.get("x-real-ip");
    if (clientIp) requestHeaders.set("x-real-ip", clientIp);

    if (forwardAuth) {
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      if (cookieHeader) requestHeaders.set("Cookie", cookieHeader);
    }
  } catch {
    // Headers or cookies may not be available outside request context (e.g. background tasks or tests)
  }

  try {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${coreUrl}${normalizedPath}`;
    const response = await fetch(url, {
      ...init,
      headers: requestHeaders,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: json?.code || json?.error || "INTERNAL_ERROR",
        error: json?.message || `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: (json?.data !== undefined ? json.data : json) as T,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    return {
      ok: false,
      status: isAbort ? 504 : 502,
      code: isAbort ? "GATEWAY_TIMEOUT" : "CORE_UNREACHABLE",
      error: isAbort ? "Go Core service timed out." : "Go Core service is unreachable.",
    };
  }
}

