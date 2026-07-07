"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const assistantIndex = newMessages.length;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[assistantIndex] = { role: "assistant", content: `Erreur : ${err.error}` };
          return updated;
        });
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const captured = full;
        setMessages(prev => {
          const updated = [...prev];
          updated[assistantIndex] = { role: "assistant", content: captured };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[assistantIndex] = { role: "assistant", content: `Erreur : ${err.message}` };
        return updated;
      });
    }

    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const S = {
    userBubble: {
      maxWidth: "70%",
      alignSelf: "flex-end",
      background: "var(--primary)",
      color: "#fff",
      borderRadius: "18px 18px 4px 18px",
      padding: "12px 16px",
      fontSize: 15,
      lineHeight: 1.5,
      wordBreak: "break-word",
    },
    aiBubble: {
      maxWidth: "70%",
      alignSelf: "flex-start",
      background: "#fff",
      border: "1px solid var(--border)",
      color: "var(--ink)",
      borderRadius: "18px 18px 18px 4px",
      padding: "12px 16px",
      fontSize: 15,
      lineHeight: 1.5,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ background: "var(--secondary)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>S</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14 }}>Assistant IA</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--ink-muted)", marginTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Assistant IA Spacefill</p>
            <p style={{ fontSize: 14 }}>Posez une question, demandez un résumé, une analyse…</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column" }}>
            <div style={m.role === "user" ? S.userBubble : S.aiBubble}>
              {m.content || (m.role === "assistant" && loading && i === messages.length - 1 ? (
                <span style={{ color: "var(--ink-muted)", fontStyle: "italic" }}>En train de répondre…</span>
              ) : m.content)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px", background: "#fff", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 12, alignItems: "flex-end", background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 8px 8px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message… (Entrée pour envoyer)"
            rows={1}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 15, lineHeight: 1.5, background: "transparent", fontFamily: "inherit", padding: "4px 0" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{ background: input.trim() && !loading ? "var(--primary)" : "var(--border)", color: "#fff", border: "none", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0, fontSize: 18, transition: "background 0.2s" }}
          >
            ↑
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-muted)", marginTop: 8 }}>Shift+Entrée pour un saut de ligne</p>
      </div>
    </div>
  );
}
