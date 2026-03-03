const { onCall } = require("firebase-functions/v2/https");
const { chatSendMessage } = require("./src/api/chatSendMessage");
const { startOrderVerificationApi } = require("./src/api/startOrderVerification");
const { confirmOrderVerificationApi } = require("./src/api/confirmOrderVerification");
const { createSupportTicketApi } = require("./src/api/createSupportTicket");
const { deleteSessionTranscriptApi } = require("./src/api/deleteSessionTranscript");

const secureCallableOptions = {
  region: "us-central1",
  timeoutSeconds: 30,
  memory: "512MiB",
  secrets: ["GEMINI_API_KEY", "CHAT_JWT_SECRET"],
};

exports.chatSendMessage = onCall(secureCallableOptions, chatSendMessage);
exports.startOrderVerification = onCall(secureCallableOptions, startOrderVerificationApi);
exports.confirmOrderVerification = onCall(secureCallableOptions, confirmOrderVerificationApi);
exports.createSupportTicket = onCall(secureCallableOptions, createSupportTicketApi);
exports.deleteSessionTranscript = onCall(secureCallableOptions, deleteSessionTranscriptApi);
