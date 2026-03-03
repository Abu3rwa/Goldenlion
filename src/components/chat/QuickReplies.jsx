import React from "react";

const QuickReplies = ({ replies, onSelect }) => {
  if (!replies?.length) {
    return null;
  }

  return (
    <div className="chat-quick-replies">
      {replies.map((reply) => (
        <button key={reply} type="button" onClick={() => onSelect(reply)}>
          {reply}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
