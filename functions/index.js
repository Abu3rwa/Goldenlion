const { onCall } = require("firebase-functions/v2/https");
const { chatSendMessage } = require("./src/api/chatSendMessage");
const { startOrderVerificationApi } = require("./src/api/startOrderVerification");
const { confirmOrderVerificationApi } = require("./src/api/confirmOrderVerification");
const { createSupportTicketApi } = require("./src/api/createSupportTicket");
const { deleteSessionTranscriptApi } = require("./src/api/deleteSessionTranscript");

const baseCallableOptions = {
  region: "us-central1",
  timeoutSeconds: 30,
  memory: "512MiB",
};

exports.chatSendMessage = onCall(
  { ...baseCallableOptions, secrets: ["GEMINI_API_KEY", "CHAT_JWT_SECRET"] },
  chatSendMessage
);
exports.startOrderVerification = onCall(baseCallableOptions, startOrderVerificationApi);
exports.confirmOrderVerification = onCall(
  { ...baseCallableOptions, secrets: ["CHAT_JWT_SECRET"] },
  confirmOrderVerificationApi
);
exports.createSupportTicket = onCall(baseCallableOptions, createSupportTicketApi);
exports.deleteSessionTranscript = onCall(baseCallableOptions, deleteSessionTranscriptApi);
