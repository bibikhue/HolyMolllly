import axios from "axios";

const baseURL = import.meta.env?.VITE_API_BASE_URL || "/api";

export const publicApi = axios.create({ baseURL, withCredentials: false });
// TODO: FastAPI Depends에서 쿠키의 JWT를 검증해 관리자 API를 보호합니다.
export const adminApi = axios.create({ baseURL, withCredentials: true });

