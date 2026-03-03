import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ChatPanel from "./ChatPanel";
import { addToCart } from "../../store/cartSlice";
import { getOrCreateSessionId } from "../../services/session";
import "../../styles/chat.css";

const ChatWidget = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [hasWhatsAppButton, setHasWhatsAppButton] = useState(false);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  useEffect(() => {
    const detectWhatsappButton = () => {
      setHasWhatsAppButton(Boolean(document.querySelector(".whatsapp-cta")));
    };
    detectWhatsappButton();
    window.addEventListener("resize", detectWhatsappButton);
    return () => window.removeEventListener("resize", detectWhatsappButton);
  }, []);

  const pageContext = {
    path: window.location.pathname,
    title: document.title,
  };

  const handleAddToCart = (card) => {
    dispatch(
      addToCart({
        product: {
          id: card.id,
          name: card.name,
          nameEn: card.name,
          price: card.price,
          images: card.image ? [card.image] : [],
        },
        quantity: 1,
      })
    );
  };

  const handleViewProduct = (productId) => {
    navigate(`/store#product-${productId}`);
  };

  return (
    <div className={`chat-widget-root ${hasWhatsAppButton ? "with-whatsapp" : ""}`} dir="rtl">
      {open ? (
        <div className="chat-widget-panel-wrap">
          <div className="chat-widget-toolbar">
            <span className="chat-widget-toolbar-title">مساعد المتجر</span>
            <button type="button" onClick={() => setOpen(false)}>×</button>
          </div>
          <ChatPanel
            sessionId={sessionId}
            locale="ar"
            userId={user?.uid || null}
            pageContext={pageContext}
            onAddToCart={handleAddToCart}
            onViewProduct={handleViewProduct}
          />
        </div>
      ) : null}

      {!open ? (
        <button type="button" className="chat-fab" onClick={() => setOpen(true)}>
          محادثة
        </button>
      ) : null}
    </div>
  );
};

export default ChatWidget;
