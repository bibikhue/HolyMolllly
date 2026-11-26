import { adminApi } from "./request.js";

export function login(username, password) {
  return adminApi.post("/auth/login", { username, password });
}

export function getCurrentUser() {
  return adminApi.get("/auth/me");
}

export function logout() {
  return adminApi.post("/auth/logout");
}
