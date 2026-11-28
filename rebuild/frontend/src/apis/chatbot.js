import { adminApi, publicApi } from "./request";
import i18n from "../i18n";

export function sendChatMessage(message, history, context, signal) {
  return publicApi.post("/chatbot/messages", { message, history, context, language: i18n.resolvedLanguage }, { signal, timeout: 125000 });
}

export function sendPlanningMessage(message, history, filters, signal) {
  return adminApi.post("/chatbot/planning", { message, history, filters, language: i18n.resolvedLanguage }, { signal, timeout: 165000 });
}

export function sendDataMessage(message, history, filters, signal) {
  return publicApi.post("/chatbot/data", { message, history, filters, language: i18n.resolvedLanguage }, { signal, timeout: 165000 });
}
