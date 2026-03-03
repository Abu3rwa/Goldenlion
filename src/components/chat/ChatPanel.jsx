import React, { useEffect, useMemo, useState } from "react";
import MessageList from "./MessageList";
import QuickReplies from "./QuickReplies";
import { chatSendMessage } from "../../services/chatApi";

const historyKey = (sessionId) => `gl_chat_history_${sessionId}`;

const quickRepliesAr = ["تتبع الطلب", "الشحن", "الاسترجاع", "اقتراح منتجات", "التحدث مع الدعم"];

const ChatPanel = ({ sessionId, locale, userId, pageContext, onAddToCart, onViewProduct }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState(quickRepliesAr);

  useEffect(() => {
    const raw = localStorage.getItem(historyKey(sessionId));
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch (error) {
      console.error("Failed to parse chat history", error);
    }
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem(historyKey(sessionId), JSON.stringify(messages.slice(-40)));
  }, [sessionId, messages]);

  const defaultReplies = useMemo(() => quickRepliesAr, []);

  const appendMessage = (role, text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        role,
        text,
        ...extra,
      },
    ]);
  };

  const sendMessage = async (text) => {
    const trimmed = `${text || ""}`.trim();
    if (!trimmed) {
      return;
    }
    setMessage("");
    appendMessage("user", trimmed);
    setIsTyping(true);

    try {
      const data = await chatSendMessage({
        sessionId,
        message: trimmed,
        locale,
        pageContext,
        userId: userId || null,
      });
      const payload = data?.ok ? data : { ok: true, ...data };
      appendMessage("assistant", payload.assistantText || "", {
        productCards: payload.productCards || [],
        citations: payload.citations || [],
      });
      setQuickReplies(payload.quickReplies?.length ? payload.quickReplies : defaultReplies);
    } catch (error) {
      console.error(error);
      appendMessage("assistant", "صار خطأ غير متوقع.");
      setQuickReplies(defaultReplies);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <section className="chat-panel" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="chat-panel-header">كيف نقدر نخدمك اليوم؟</header>
      <MessageList
        messages={messages}
        isTyping={isTyping}
        onAddToCart={onAddToCart}
        onViewProduct={onViewProduct}
      />
      <QuickReplies replies={quickReplies} onSelect={sendMessage} />

      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(message);
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب رسالتك..."
          maxLength={1200}
        />
        <button type="submit">إرسال</button>
      </form>
    </section>
  );
};

export default ChatPanel;
