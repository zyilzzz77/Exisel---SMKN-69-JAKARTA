"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { getEskulChatbotReply, type ChatbotReply } from "@/lib/chatbot/eskul-keyword-dataset";
import styles from "./eskul-chatbot.module.css";

type ChatMessage = ChatbotReply & {
  id: number;
  sender: "bot" | "user";
};

const initialMessage: ChatMessage = {
  id: 1,
  sender: "bot",
  text: "Halo! Aku EksiBot 👋 Tanyakan ekskul, jadwal, lokasi, kuota, atau ceritakan minatmu.",
};

const quickQuestions = ["Ekskul apa saja?", "Saya suka coding", "Jadwal PMR kapan?"];

export function EskulChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const nextId = useRef(2);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  function sendMessage(value: string) {
    const question = value.trim();
    if (!question) return;

    const userMessage: ChatMessage = {
      id: nextId.current++,
      sender: "user",
      text: question,
    };
    const botMessage: ChatMessage = {
      id: nextId.current++,
      sender: "bot",
      ...getEskulChatbotReply(question),
    };

    setMessages((current) => [...current, userMessage, botMessage]);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
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
            <span className={styles.botMark} aria-hidden="true">E</span>
            <div>
              <strong>EksiBot</strong>
              <small><span aria-hidden="true" /> Dataset keyword aktif</small>
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
            {messages.map((message) => (
              <article
                className={message.sender === "user" ? styles.userMessage : styles.botMessage}
                key={message.id}
              >
                <span>{message.sender === "user" ? "Kamu" : "EksiBot"}</span>
                <p>{message.text}</p>
                {message.action ? (
                  <Link href={message.action.href} onClick={() => setIsOpen(false)}>
                    {message.action.label} <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </article>
            ))}
            <div ref={messageEndRef} />
          </div>

          {messages.length === 1 ? (
            <div className={styles.quickQuestions} aria-label="Pertanyaan cepat">
              {quickQuestions.map((question) => (
                <button key={question} onClick={() => sendMessage(question)} type="button">
                  {question}
                </button>
              ))}
            </div>
          ) : null}

          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Tulis pertanyaan tentang ekstrakurikuler
            </label>
            <input
              autoComplete="off"
              id={`${panelId}-input`}
              maxLength={180}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Contoh: jadwal ITC kapan?"
              ref={inputRef}
              value={input}
            />
            <button aria-label="Kirim pertanyaan" disabled={!input.trim()} type="submit">
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
