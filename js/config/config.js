const isLocalDevelopment = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

export const API_BASE_URL = (
  window.ELARA_API_BASE_URL ||
  (isLocalDevelopment ? "/elara" : `${window.location.origin}/api`)
).replace(/\/+$/, "");