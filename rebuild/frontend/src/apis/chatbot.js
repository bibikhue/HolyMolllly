import { adminApi, publicApi } from "./request";

export function sendChatMessage(message, history, context, signal) {
  return publicApi.post("/chatbot/messages", { message, history, context }, { signal, timeout: 125000 });
}

export function sendPlanningMessage(message, history, filters, signal) {
  return adminApi.post("/chatbot/planning", { message, history, filters }, { signal, timeout: 165000 });
}

export function sendDataMessage(message, history, filters, signal) {
  return publicApi.post("/chatbot/data", { message, history, filters }, { signal, timeout: 165000 });
}
