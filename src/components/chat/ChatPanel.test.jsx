import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPanel from "./ChatPanel";
import {
  chatSendMessage,
  createSupportTicket,
  deleteSessionTranscript,
} from "../../services/chatApi";

vi.mock("../../services/chatApi", () => ({
  chatSendMessage: vi.fn(),
  createSupportTicket: vi.fn(),
  deleteSessionTranscript: vi.fn(),
}));

const createBaseProps = () => ({
  locale: "ar",
  userId: null,
  pageContext: { path: "/store", hash: "", title: "Store" },
  onAddToCart: vi.fn(),
  onViewProduct: vi.fn(),
  onLocalMessage: vi.fn(async () => ({ handled: false })),
});

const renderPanel = (sessionId = "session-test", overrides = {}) => {
  const props = { ...createBaseProps(), ...overrides };
  return {
    ...render(<ChatPanel {...props} sessionId={sessionId} />),
    props,
  };
};

const sendChatMessage = async (user, text) => {
  await user.type(screen.getByPlaceholderText("اكتب رسالتك..."), text);
  await user.click(screen.getByRole("button", { name: "إرسال" }));
};

describe("ChatPanel chat flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows prompt when tracking is requested without order number", async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await sendChatMessage(user, "تتبع الطلب");

    expect(await screen.findByText(/اكتب رقم الطلب أولاً/i)).toBeInTheDocument();
    expect(chatSendMessage).not.toHaveBeenCalled();
    expect(props.onLocalMessage).toHaveBeenCalled();
  });

  it("uses the local handler for cart messages before calling the API", async () => {
    const user = userEvent.setup();
    const onLocalMessage = vi.fn(async () => ({
      handled: true,
      assistantText: "تمت إضافة المنتج من داخل المعالج المحلي.",
      quickReplies: ["اعرض السلة"],
      productCards: [],
      citations: [],
      pendingAction: null,
    }));

    renderPanel("session-local", { onLocalMessage });

    await sendChatMessage(user, "add iphone charger");

    expect(await screen.findByText(/تمت إضافة المنتج من داخل المعالج المحلي/i)).toBeInTheDocument();
    expect(chatSendMessage).not.toHaveBeenCalled();
    expect(onLocalMessage).toHaveBeenCalledWith(expect.objectContaining({
      message: "add iphone charger",
      pendingAction: null,
    }));
  });

  it("shows order tracking details directly after order number is provided", async () => {
    const user = userEvent.setup();

    chatSendMessage.mockResolvedValueOnce({
      ok: true,
      assistantText: "حالة الطلب GL-1: shipped، رقم التتبع: TRK-9.",
      quickReplies: [],
      requiresVerification: false,
    });

    renderPanel();

    await sendChatMessage(user, "تتبع الطلب GL-1");
    expect(await screen.findByText(/رقم التتبع: TRK-9/i)).toBeInTheDocument();
  });

  it("submits support ticket and shows ticket reference", async () => {
    const user = userEvent.setup();
    createSupportTicket.mockResolvedValueOnce({ ticketId: "TICK-77" });

    renderPanel();
    await user.click(screen.getByRole("button", { name: "فتح نموذج التذكرة" }));

    await user.type(screen.getByPlaceholderText("الاسم"), "أحمد");
    await user.type(screen.getByPlaceholderText("رقم الهاتف أو البريد الإلكتروني"), "0912345678");
    await user.type(screen.getByPlaceholderText("اكتب المشكلة باختصار"), "الطلب تأخر أكثر من المتوقع");

    await user.click(screen.getByRole("button", { name: "إرسال تذكرة الدعم" }));

    await waitFor(() => {
      expect(createSupportTicket).toHaveBeenCalledWith({
        sessionId: "session-test",
        contact: "0912345678",
        summary: expect.stringContaining("الاسم: أحمد"),
      });
    });
    expect(await screen.findByText(/رقم المتابعة: TICK-77/i)).toBeInTheDocument();
  }, 15000);

  it("clears transcript via callable and local storage", async () => {
    const user = userEvent.setup();
    const sessionId = "session-clear";
    localStorage.setItem(
      `gl_chat_history_${sessionId}`,
      JSON.stringify([{ id: "m1", role: "assistant", text: "مرحبا" }])
    );
    deleteSessionTranscript.mockResolvedValueOnce({ deleted: true });

    renderPanel(sessionId);
    await user.click(screen.getByRole("button", { name: "مسح السجل" }));

    await waitFor(() => expect(deleteSessionTranscript).toHaveBeenCalledWith({ sessionId }));
    expect(await screen.findByText(/تم مسح سجل المحادثة/i)).toBeInTheDocument();
    const storedHistory = localStorage.getItem(`gl_chat_history_${sessionId}`);
    expect(storedHistory === null || storedHistory.includes("تم مسح سجل المحادثة لهذه الجلسة بنجاح")).toBe(true);
  });
});
