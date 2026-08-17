"use client";

import Script from "next/script";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export type TurnstileStatus =
  | "loading"
  | "ready"
  | "verified"
  | "expired"
  | "retrying"
  | "error";

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: (code?: string) => void;
};

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const POLL_INTERVAL_MS = 200;
const POLL_MAX_ATTEMPTS = 50;

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ onVerify, onExpire, onError }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const [status, setStatus] = useState<TurnstileStatus>("loading");
  const callbacksRef = useRef({ onVerify, onExpire, onError });

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  const renderWidget = useCallback(() => {
    if (!mountedRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    if (typeof window.turnstile?.render !== "function") return;
    if (widgetIdRef.current) return;

    const currentGeneration = generationRef.current;

    try {
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        action: "login",
        execution: "render",
        appearance: "always",
        theme: "auto",
        size: "flexible",
        retry: "auto",
        "retry-interval": 8000,
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
        callback: (token: string) => {
          if (currentGeneration !== generationRef.current) return;
          setStatus("verified");
          callbacksRef.current.onVerify(token);
        },
        "expired-callback": () => {
          if (currentGeneration !== generationRef.current) return;
          setStatus("expired");
          callbacksRef.current.onExpire();
        },
        "timeout-callback": () => {
          if (currentGeneration !== generationRef.current) return;
          setStatus("retrying");
          callbacksRef.current.onExpire();
        },
        "error-callback": (code?: string) => {
          if (currentGeneration !== generationRef.current) return false;
          setStatus("error");
          callbacksRef.current.onError(code);
          return false;
        },
      });
      setStatus("ready");
    } catch {
      // render can throw when called too early or on unmounted node
    }
  }, []);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && typeof window.turnstile?.reset === "function") {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setStatus("ready");
          return;
        } catch {
          // fallback to recreation if reset failed
        }
      }

      widgetIdRef.current = null;
      renderWidget();
    },
  }), [renderWidget]);

  // Robust init: immediately check window.turnstile + polling fallback for race conditions
  useEffect(() => {
    mountedRef.current = true;
    generationRef.current += 1;

    let cancelled = false;
    let attempts = 0;

    function tryRender() {
      if (cancelled || !mountedRef.current) return;
      if (containerRef.current && typeof window.turnstile?.render === "function") {
        renderWidget();
        return;
      }
      attempts += 1;
      if (attempts > POLL_MAX_ATTEMPTS) {
        setStatus("error");
        callbacksRef.current.onError("timeout");
        return;
      }
      window.setTimeout(tryRender, POLL_INTERVAL_MS);
    }

    tryRender();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      generationRef.current += 1;

      const id = widgetIdRef.current;
      widgetIdRef.current = null;

      if (id && typeof window.turnstile?.remove === "function") {
        try {
          window.turnstile.remove(id);
        } catch {
          // ignore unmount cleanup error
        }
      }

      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
    };
  }, [renderWidget]);

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src={TURNSTILE_SCRIPT_URL}
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => {
          setStatus("error");
          callbacksRef.current.onError("script_failed");
        }}
      />
      <div ref={containerRef} data-turnstile-status={status} />
    </>
  );
});
