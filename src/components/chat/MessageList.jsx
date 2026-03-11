import React, { useEffect, useRef } from "react";
import ProductCard from "./ProductCard";

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const renderInlineWithLinks = (text, keyPrefix) => {
  const raw = `${text || ""}`;
  const matches = [...raw.matchAll(URL_REGEX)];
  if (!matches.length) {
    return raw;
  }

  const nodes = [];
  let cursor = 0;

  matches.forEach((match, idx) => {
    const url = match[0];
    const start = match.index ?? 0;
    if (start > cursor) {
      nodes.push(raw.slice(cursor, start));
    }
    nodes.push(
      <a
        key={`${keyPrefix}_url_${idx}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-inline-link"
      >
        {url}
      </a>
    );
    cursor = start + url.length;
  });

  if (cursor < raw.length) {
    nodes.push(raw.slice(cursor));
  }

  return nodes;
};

const splitMessageLines = (text) => `${text || ""}`.split(/\r?\n/);

const isListItemLine = (line) => /^\s*(?:[-*•]|\d+[\.)])\s+/.test(line);

const stripListPrefix = (line) => line.replace(/^\s*(?:[-*•]|\d+[\.)])\s+/, "").trim();

const isSectionTitleLine = (line) => {
  const trimmed = `${line || ""}`.trim();
  if (!trimmed || isListItemLine(trimmed)) return false;
  return trimmed.endsWith(":") || trimmed.endsWith("؟") || /^\s*[\u{1F300}-\u{1FAFF}]/u.test(trimmed);
};

const renderAssistantStructured = (text) => {
  const lines = splitMessageLines(text);
  const blocks = [];
  let idx = 0;

  while (idx < lines.length) {
    const current = lines[idx].trim();

    if (!current) {
      idx += 1;
      continue;
    }

    if (isListItemLine(current)) {
      const items = [];
      while (idx < lines.length && isListItemLine(lines[idx].trim())) {
        items.push(stripListPrefix(lines[idx]));
        idx += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (isSectionTitleLine(current)) {
      blocks.push({ type: "title", text: current });
      idx += 1;
      continue;
    }

    const paragraph = [current];
    idx += 1;
    while (idx < lines.length) {
      const candidate = lines[idx].trim();
      if (!candidate || isListItemLine(candidate) || isSectionTitleLine(candidate)) {
        break;
      }
      paragraph.push(candidate);
      idx += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  if (!blocks.length) {
    return text;
  }

  return (
    <div className="chat-structured-text">
      {blocks.map((block, blockIndex) => {
        if (block.type === "title") {
          return (
            <p key={`title_${blockIndex}`} className="chat-block-title">
              {renderInlineWithLinks(block.text, `title_${blockIndex}`)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list_${blockIndex}`} className="chat-block-list">
              {block.items.map((item, itemIndex) => (
                <li key={`item_${blockIndex}_${itemIndex}`}>
                  {renderInlineWithLinks(item, `item_${blockIndex}_${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`para_${blockIndex}`} className="chat-block-paragraph">
            {renderInlineWithLinks(block.text, `para_${blockIndex}`)}
          </p>
        );
      })}
    </div>
  );
};

const MessageList = ({ messages, isTyping, onViewProduct, onAddToCart }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  return (
    <div className="chat-message-list">
      {messages.map((message) => (
        <div key={message.id} className={`chat-message ${message.role}`}>
          <div className="chat-bubble">
            {message.role === "assistant"
              ? renderAssistantStructured(message.text)
              : renderInlineWithLinks(message.text, `user_${message.id}`)}
          </div>
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
          {message.role === "assistant" && message.orderDetailsUrl ? (
            <div className="chat-message-actions">
              <a
                className="chat-order-details-btn"
                href={message.orderDetailsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                تفاصيل طلبك
              </a>
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
