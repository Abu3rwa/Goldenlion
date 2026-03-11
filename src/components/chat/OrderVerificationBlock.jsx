import React from "react";

const OrderVerificationBlock = ({
  orderNumber,
  destination,
  code,
  otpSent,
  isSendingOtp,
  isConfirmingOtp,
  onDestinationChange,
  onCodeChange,
  onStartVerification,
  onConfirmVerification,
}) => {
  if (!orderNumber) {
    return null;
  }

  return (
    <section className="chat-block" aria-live="polite">
      <strong>تتبع الطلب: {orderNumber}</strong>
      <p className="chat-block-hint">
        لحماية بيانات الطلب، سنرسل رمز تحقق لمرة واحدة إلى بريدك الإلكتروني ثم ندخله هنا.
      </p>

      {!otpSent ? (
        <>
          <input
            type="email"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            placeholder="البريد الإلكتروني المرتبط بالطلب"
            autoComplete="email"
          />
          <button type="button" onClick={onStartVerification} disabled={isSendingOtp}>
            {isSendingOtp ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="أدخل رمز التحقق"
            maxLength={10}
            inputMode="numeric"
          />
          <button type="button" onClick={onConfirmVerification} disabled={isConfirmingOtp}>
            {isConfirmingOtp ? "جارٍ التحقق..." : "تأكيد الرمز"}
          </button>
        </>
      )}
    </section>
  );
};

export default OrderVerificationBlock;
