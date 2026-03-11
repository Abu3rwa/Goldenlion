import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useNavigate } from "react-router-dom";
import ChatPanel from "./ChatPanel";
import { addToCart } from "../../store/cartSlice";
import { handleCartIntent } from "../../chatbot/handlers/cartIntentHandler";
import { publicProductService } from "../../services/publicProductService";
import { getOrCreateSessionId } from "../../services/session";
import "../../styles/chat.css";

const ChatWidget = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const currency = useSelector((state) => state.company.currency);
  const catalogProducts = useSelector((state) => state.publicProducts.products);
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
    hash: window.location.hash,
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

  const handleLocalMessage = async (payload) => {
    return handleCartIntent({
      ...payload,
      dispatch,
      getState: store.getState,
      companyCurrency: currency || "د.ل",
      catalogProducts,
      productService: publicProductService,
    });
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
            onLocalMessage={handleLocalMessage}
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
