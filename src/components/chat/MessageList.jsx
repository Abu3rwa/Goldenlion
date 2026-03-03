import React, { useEffect, useRef } from "react";
import ProductCard from "./ProductCard";

const MessageList = ({ messages, isTyping, onViewProduct, onAddToCart }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  return (
    <div className="chat-message-list">
      {messages.map((message) => (
        <div key={message.id} className={`chat-message ${message.role}`}>
          <div className="chat-bubble">{message.text}</div>
          {message.citations?.length ? (
            <div className="chat-citations">
              {message.citations.map((citation) => (
                <span key={citation.id || citation.label} className="chat-citation-pill">
                  {citation.label}
                </span>
              ))}
            </div>
          ) : null}
          {message.productCards?.length ? (
            <div className="chat-product-grid">
              {message.productCards.map((card) => (
                <ProductCard
                  key={card.id}
                  card={card}
                  onViewProduct={onViewProduct}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {isTyping ? <div className="chat-typing">...</div> : null}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
