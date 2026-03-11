import { describe, expect, it } from "vitest";
import {
  buildOrderNumberPrompt,
  buildTicketSummary,
  extractOrderNumberFromText,
  shouldOpenSupportTicket,
  shouldPromptForOrderNumber,
} from "./chatFlowUtils";

describe("chatFlowUtils", () => {
  it("extracts order number from Arabic and mixed text", () => {
    expect(extractOrderNumberFromText("تتبع الطلب GL-202603-123")).toBe("GL-202603-123");
    expect(extractOrderNumberFromText("Order #ab12")).toBe("ab12");
  });

  it("detects when user asked to track without order number", () => {
    expect(shouldPromptForOrderNumber("تتبع الطلب")).toBe(true);
    expect(shouldPromptForOrderNumber("تتبع الطلب GL-1")).toBe(false);
  });

  it("detects support intent and builds ticket summary", () => {
    expect(shouldOpenSupportTicket("أبغى دعم")).toBe(true);
    expect(buildTicketSummary({ name: "أحمد", issue: "تأخر الطلب" })).toContain("أحمد");
  });

  it("returns localized order-number prompt", () => {
    expect(buildOrderNumberPrompt("ar")).toContain("اكتب رقم الطلب");
    expect(buildOrderNumberPrompt("en")).toContain("order number");
  });
});
