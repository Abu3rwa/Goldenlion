import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

const chatSendMessageFn = httpsCallable(functions, "chatSendMessage");
const startOrderVerificationFn = httpsCallable(functions, "startOrderVerification");
const confirmOrderVerificationFn = httpsCallable(functions, "confirmOrderVerification");
const createSupportTicketFn = httpsCallable(functions, "createSupportTicket");
const deleteSessionTranscriptFn = httpsCallable(functions, "deleteSessionTranscript");

export async function chatSendMessage(payload) {
  const result = await chatSendMessageFn(payload);
  return result.data;
}

export async function startOrderVerification(payload) {
  const result = await startOrderVerificationFn(payload);
  return result.data;
}

export async function confirmOrderVerification(payload) {
  const result = await confirmOrderVerificationFn(payload);
  return result.data;
}

export async function createSupportTicket(payload) {
  const result = await createSupportTicketFn(payload);
  return result.data;
}

export async function deleteSessionTranscript(payload) {
  const result = await deleteSessionTranscriptFn(payload);
  return result.data;
}
