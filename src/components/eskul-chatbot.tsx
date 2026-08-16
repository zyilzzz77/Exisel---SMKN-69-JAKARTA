"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  createChatbotContext,
  getChatbotTechnicalErrorReply,
  getEskulChatbotReply,
  type ChatbotReply,
  type ChatbotTelemetry,
} from "@/lib/chatbot/eskul-keyword-dataset";
import styles from "./eskul-chatbot.module.css";

type ChatMessage = ChatbotReply & {
  id: number;
  sender: "bot" | "user";
  animate?: boolean;
};

const initialMessage: ChatMessage = {
  id: 1,
  sender: "bot",
  text: "Halo! Aku EksiBot 👋 Tanyakan ekskul, jadwal, lokasi, kuota, atau ceritakan minatmu.",
  animate: false,
};

const quickQuestions = [
  "Ekskul apa saja?",
  "Saya suka coding",
  "Jadwal dan lokasi PMR?",
];

function persistTelemetry(telemetry?: ChatbotTelemetry) {
  if (!telemetry) return;

  try {
    if (telemetry.unanswered) {
      const key = "eksibot:unanswered-queries";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
      localStorage.setItem(
        key,
        JSON.stringify([...current, telemetry.unanswered].slice(-50)),
      );
    }

    if (telemetry.slangCandidate) {
      const key = "eksibot:slang-candidates";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<
        ChatbotTelemetry["slangCandidate"] & { count: number }
      >;
      const existing = current.find(
        (candidate) => candidate?.phrase === telemetry.slangCandidate?.phrase,
      );
      const updated = existing
        ? current.map((candidate) =>
            candidate?.phrase === telemetry.slangCandidate?.phrase
              ? { ...candidate, count: candidate.count + 1 }
              : candidate,
          )
        : [...current, { ...telemetry.slangCandidate, count: 1 }];
      localStorage.setItem(key, JSON.stringify(updated.slice(-50)));
    }
  } catch {
    // Telemetry lokal bersifat opsional; bot tetap berfungsi jika storage diblokir.
  }
}

function TypewriterBotMessage({
  message,
  onClosePanel,
  onTypingStep,
}: {
  message: ChatMessage;
  onClosePanel: () => void;
  onTypingStep: () => void;
}) {
  const [displayedText, setDisplayedText] = useState(
    message.animate ? "" : message.text,
  );
  const [isFinished, setIsFinished] = useState(!message.animate);

  useEffect(() => {
    if (!message.animate || isFinished) return;

    let index = 0;
    const fullText = message.text;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(fullText.slice(0, index));
      onTypingStep();

      if (index >= fullText.length) {
        clearInterval(interval);
        setIsFinished(true);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [message.animate, message.text, isFinished, onTypingStep]);

  return (
    <article className={styles.botMessage}>
      <span>EksiBot</span>
      <p>
        {displayedText}
        {!isFinished ? <span className={styles.typingCursor}>|</span> : null}
      </p>
      {isFinished && message.action ? (
        <Link href={message.action.href} onClick={onClosePanel}>
          {message.action.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}

export function EskulChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isThinking, setIsThinking] = useState(false);
  const nextId = useRef(2);
  const conversationContext = useRef(createChatbotContext());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  async function sendMessage(value: string) {
    const question = value.trim();
    if (!question || isThinking) return;

    const userMessage: ChatMessage = {
      id: nextId.current++,
      sender: "user",
      text: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);

    const historyForLLM = messages.map((m) => ({
      role: (m.sender === "bot" ? "assistant" : "user") as "assistant" | "user",
      content: m.text,
    }));

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          context: conversationContext.current,
          history: historyForLLM,
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP error");
      }

      const data = await response.json();
      conversationContext.current = data.context;
      persistTelemetry(data.telemetry);

      const botMessage: ChatMessage = {
        id: nextId.current++,
        sender: "bot",
        text: data.reply?.text || "Maaf, tidak ada respon yang diterima.",
        action: data.reply?.action,
        animate: true,
      };
      setMessages((current) => [...current, botMessage]);
    } catch {
      // Fallback lokal jika fetch network gagal total
      let localFallback;
      try {
        localFallback = getEskulChatbotReply(question, conversationContext.current);
      } catch {
        localFallback = getChatbotTechnicalErrorReply(conversationContext.current);
      }
      conversationContext.current = localFallback.context;
      persistTelemetry(localFallback.telemetry);

      const botMessage: ChatMessage = {
        id: nextId.current++,
        sender: "bot",
        text: localFallback.text,
        action: localFallback.action,
        animate: true,
      };
      setMessages((current) => [...current, botMessage]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleInputKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className={styles.chatbot}>
      {isOpen ? (
        <section
          aria-label="Chatbot informasi ekstrakurikuler"
          className={styles.panel}
          id={panelId}
          role="dialog"
        >
          <header className={styles.header}>
            <span className={styles.botMark} aria-hidden="true">
              <Image
                alt=""
                height={512}
                priority
                src="/eksibot-avatar.webp"
                width={512}
              />
            </span>
            <div>
              <strong>EksiBot</strong>
              <small>
                <span aria-hidden="true" /> Multi-intent aktif
              </small>
            </div>
            <button
              aria-label="Tutup chatbot"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          <div aria-live="polite" className={styles.messages}>
            {messages.map((message) =>
              message.sender === "user" ? (
                <article className={styles.userMessage} key={message.id}>
                  <span>Kamu</span>
                  <p>{message.text}</p>
                </article>
              ) : (
                <TypewriterBotMessage
                  key={message.id}
                  message={message}
                  onClosePanel={() => setIsOpen(false)}
                  onTypingStep={scrollToBottom}
                />
              ),
            )}

            {isThinking ? (
              <div
                aria-label="EksiBot sedang mengetik"
                className={styles.typingIndicator}
              >
                <span className={styles.typingLabel}>EKSIBOT</span>
                <div className={styles.dotsWrapper}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          {messages.length === 1 ? (
            <div
              className={styles.quickQuestions}
              aria-label="Pertanyaan cepat"
            >
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => sendMessage(question)}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}

          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Tulis pertanyaan tentang ekstrakurikuler
            </label>
            <textarea
              autoComplete="off"
              id={`${panelId}-input`}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Tanya beberapa hal sekaligus…"
              ref={inputRef}
              rows={2}
              value={input}
            />
            <button
              aria-label="Kirim pertanyaan"
              disabled={!input.trim()}
              type="submit"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m4 4 17 8-17 8 3-8-3-8Z" />
                <path d="M7 12h14" />
              </svg>
            </button>
          </form>
        </section>
      ) : null}

      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup chatbot ekskul" : "Buka chatbot ekskul"}
        className={styles.floatingButton}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? (
          <span aria-hidden="true">×</span>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 32 32">
            <path d="M7 6h18a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H14l-7 5v-5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
            <path d="M10 13h12M10 18h8" />
          </svg>
        )}
        <strong>{isOpen ? "Tutup" : "Tanya EksiBot"}</strong>
      </button>
    </div>
  );
}
