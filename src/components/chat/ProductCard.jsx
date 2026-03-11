import React from "react";
import { formatCents } from "../../utils/decimalUtils";

const ProductCard = ({ card, onViewProduct, onAddToCart }) => {
  return (
    <article className="chat-product-card">
      {card.image ? <img src={card.image} alt={card.name} className="chat-product-image" loading="lazy" /> : null}
      <div className="chat-product-body">
        <h6>{card.name}</h6>
        <p>{formatCents(Number(card.price || 0), card.currency || "LYD")}</p>
        <div className="chat-product-actions">
          <button type="button" onClick={() => onViewProduct(card.id)}>
            عرض المنتج
          </button>
          <button type="button" className="primary" onClick={() => onAddToCart(card)}>
            إضافة للسلة
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
