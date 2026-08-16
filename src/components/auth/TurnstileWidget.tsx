"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
  | "error";

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
};

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ onVerify, onExpire, onError }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>("loading");
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  function renderWidget() {
    const container = containerRef.current;
    if (!container) return;
    if (typeof window.turnstile?.render !== "function") return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "login",
      theme: "auto",
      size: "flexible",
      appearance: "always",
      callback: (token: string) => {
        setStatus("verified");
        callbacksRef.current.onVerify(token);
      },
      "expired-callback": () => {
        setStatus("expired");
        callbacksRef.current.onExpire();
      },
      "error-callback": () => {
        setStatus("error");
        callbacksRef.current.onError();
      },
    });
    setStatus("ready");
  }

  useImperativeHandle(ref, () => ({
    reset() {
      widgetIdRef.current && typeof window.turnstile?.reset === "function"
        ? window.turnstile.reset(widgetIdRef.current)
        : null;
      setStatus("ready");
    },
  }));

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && typeof window.turnstile?.remove === "function") {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
        onError={() => setStatus("error")}
      />
      <div ref={containerRef} data-turnstile-status={status} />
    </>
  );
});