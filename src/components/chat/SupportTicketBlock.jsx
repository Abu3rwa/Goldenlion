import React from "react";

const SupportTicketBlock = ({
  open,
  form,
  isSubmitting,
  onToggle,
  onChange,
  onSubmit,
}) => {
  return (
    <section className="chat-block">
      <div className="chat-block-row">
        <strong>الدعم الفني</strong>
        <button type="button" className="chat-ghost-btn" onClick={onToggle}>
          {open ? "إخفاء النموذج" : "فتح نموذج التذكرة"}
        </button>
      </div>

      {open ? (
        <>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="الاسم"
            maxLength={80}
            autoComplete="name"
          />
          <input
            type="text"
            value={form.contact}
            onChange={(e) => onChange("contact", e.target.value)}
            placeholder="رقم الهاتف أو البريد الإلكتروني"
            maxLength={120}
            autoComplete="email"
          />
          <textarea
            value={form.issue}
            onChange={(e) => onChange("issue", e.target.value)}
            placeholder="اكتب المشكلة باختصار"
            maxLength={1200}
          />
          <button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "جارٍ الإرسال..." : "إرسال تذكرة الدعم"}
          </button>
        </>
      ) : null}
    </section>
  );
};

export default SupportTicketBlock;
