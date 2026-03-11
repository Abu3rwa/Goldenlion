import React, { useEffect, useMemo, useState } from "react";
import MessageList from "./MessageList";
import QuickReplies from "./QuickReplies";
import SupportTicketBlock from "./SupportTicketBlock";
import {
  buildOrderNumberPrompt,
  buildTicketSummary,
  getChatApiErrorText,
  shouldOpenSupportTicket,
  shouldPromptForOrderNumber,
} from "./chatFlowUtils";
import {
  chatSendMessage,
  createSupportTicket,
  deleteSessionTranscript,
} from "../../services/chatApi";

const historyKey = (sessionId) => `gl_chat_history_${sessionId}`;

const quickRepliesAr = ["تتبع الطلب", "الشحن", "الاسترجاع", "اقتراح منتجات", "التحدث مع الدعم"];

const buildMessage = (role, text, extra = {}) => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  role,
  text,
  ...extra,
});

const ChatPanel = ({
  sessionId,
  locale,
  userId,
  pageContext,
  onAddToCart,
  onViewProduct,
  onLocalMessage = null,
}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState(quickRepliesAr);
  const [skipPersistOnce, setSkipPersistOnce] = useState(false);
  const [pendingLocalAction, setPendingLocalAction] = useState(null);
  const [ticketState, setTicketState] = useState({
    open: false,
    name: "",
    contact: "",
    issue: "",
    isSubmitting: false,
  });
  const [isClearingHistory, setIsClearingHistory] = useState(false);

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
    if (skipPersistOnce) {
      localStorage.removeItem(historyKey(sessionId));
      setSkipPersistOnce(false);
      return;
    }

    if (!messages.length) {
      localStorage.removeItem(historyKey(sessionId));
      return;
    }

    localStorage.setItem(historyKey(sessionId), JSON.stringify(messages.slice(-40)));
  }, [sessionId, messages, skipPersistOnce]);

  const defaultReplies = useMemo(() => quickRepliesAr, []);

  const appendMessage = (role, text, extra = {}) => {
    setMessages((prev) => [...prev, buildMessage(role, text, extra)]);
  };

  const appendAssistantPayload = (payload) => {
    appendMessage("assistant", payload?.assistantText || "", {
      productCards: payload?.productCards || [],
      citations: payload?.citations || [],
      orderDetailsUrl: payload?.orderDetailsUrl || null,
    });
    setQuickReplies(payload?.quickReplies?.length ? payload.quickReplies : defaultReplies);
    setPendingLocalAction(payload?.pendingAction || null);
  };

  const sendMessage = async (text, options = {}) => {
    const appendUserMessage = options.appendUserMessage !== false;
    const trimmed = `${text || ""}`.trim();
    if (!trimmed) {
      return;
    }
    if (appendUserMessage) {
      setMessage("");
      appendMessage("user", trimmed);
    }

    if (onLocalMessage) {
      const localPayload = await onLocalMessage({
        message: trimmed,
        locale,
        pageContext,
        messages,
        pendingAction: pendingLocalAction,
      });

      if (localPayload?.handled) {
        appendAssistantPayload(localPayload);
        return;
      }
    }

    if (shouldPromptForOrderNumber(trimmed)) {
      appendMessage("assistant", buildOrderNumberPrompt(locale));
      setQuickReplies(defaultReplies);
      setPendingLocalAction(null);
      return;
    }

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
      appendAssistantPayload(payload);

      if (shouldOpenSupportTicket(trimmed)) {
        setTicketState((prev) => ({ ...prev, open: true }));
      }
    } catch (error) {
      console.error(error);
      appendMessage("assistant", getChatApiErrorText(error, "صار خطأ غير متوقع."));
      setQuickReplies(defaultReplies);
      setPendingLocalAction(null);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTicketChange = (field, value) => {
    setTicketState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitTicket = async () => {
    const name = ticketState.name.trim();
    const contact = ticketState.contact.trim();
    const issue = ticketState.issue.trim();

    if (!name || !contact || issue.length < 8) {
      appendMessage("assistant", "يرجى تعبئة الاسم ووسيلة التواصل ووصف المشكلة (8 أحرف على الأقل).");
      return;
    }

    setTicketState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const result = await createSupportTicket({
        sessionId,
        contact,
        summary: buildTicketSummary({ name, issue }),
      });
      const ticketId = result?.ticketId || "غير متوفر";
      appendMessage(
        "assistant",
        `تم إنشاء تذكرة الدعم بنجاح. رقم المتابعة: ${ticketId}${result?.whatsappLink ? "\nيمكنك المتابعة أيضاً عبر واتساب إذا لزم." : ""}`
      );
      setTicketState({
        open: false,
        name: "",
        contact: "",
        issue: "",
        isSubmitting: false,
      });
    } catch (error) {
      console.error(error);
      appendMessage(
        "assistant",
        getChatApiErrorText(error, "تعذر إرسال تذكرة الدعم حالياً. حاول مرة ثانية أو استخدم التواصل المباشر.")
      );
      setTicketState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      await deleteSessionTranscript({ sessionId });
      localStorage.removeItem(historyKey(sessionId));
      setSkipPersistOnce(true);
      setMessages([
        buildMessage(
          "assistant",
          "تم مسح سجل المحادثة لهذه الجلسة بنجاح."
        ),
      ]);
      setQuickReplies(defaultReplies);
      setPendingLocalAction(null);
      setTicketState({
        open: false,
        name: "",
        contact: "",
        issue: "",
        isSubmitting: false,
      });
    } catch (error) {
      console.error(error);
      appendMessage("assistant", getChatApiErrorText(error, "تعذر مسح سجل المحادثة الآن. حاول مرة ثانية بعد قليل."));
    } finally {
      setIsClearingHistory(false);
    }
  };

  return (
    <section className="chat-panel" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="chat-panel-header">
        <span>كيف نقدر نخدمك اليوم؟</span>
        <button type="button" className="chat-ghost-btn" onClick={handleClearHistory} disabled={isClearingHistory}>
          {isClearingHistory ? "جارٍ المسح..." : "مسح السجل"}
        </button>
      </header>
      <MessageList
        messages={messages}
        isTyping={isTyping}
        onAddToCart={onAddToCart}
        onViewProduct={onViewProduct}
      />
      <QuickReplies replies={quickReplies} onSelect={sendMessage} />
      <SupportTicketBlock
        open={ticketState.open}
        form={{
          name: ticketState.name,
          contact: ticketState.contact,
          issue: ticketState.issue,
        }}
        isSubmitting={ticketState.isSubmitting}
        onToggle={() => setTicketState((prev) => ({ ...prev, open: !prev.open }))}
        onChange={handleTicketChange}
        onSubmit={handleSubmitTicket}
      />

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
