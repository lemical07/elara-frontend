import { API_BASE_URL } from "../config/config.js";

const TOKEN_KEY = "elara.jwt";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken() {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

function errorMessage(payload, status) {
  if (status >= 500) return "El servidor no pudo completar la solicitud. Inténtalo más tarde.";
  if (typeof payload?.mensaje === "string") return payload.mensaje;
  if (typeof payload?.error === "string") return payload.error;
  if (Array.isArray(payload?.errores)) {
    return payload.errores.map((error) => error.mensaje).filter(Boolean).join(" ");
  }
  if (typeof payload?.errores === "string") return payload.errores;
  if (status === 401) return "Tu sesión no es válida o ha expirado. Inicia sesión de nuevo.";
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "No se encontró el recurso solicitado.";
  if (status === 429) return "Se alcanzó el límite de solicitudes. Inténtalo más tarde.";
  return "No se pudo completar la solicitud.";
}

async function request(path, { method = "GET", body, authenticated = true } = {}) {
  const headers = new Headers({ Accept: "application/json" });
  const token = authenticated ? getToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const options = {
    method,
    headers,
    credentials: "include"
  };
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error instanceof TypeError) {
      const failure = new ApiError("No se pudo conectar con ELARA. Comprueba que el servidor esté disponible.");
      window.dispatchEvent(new CustomEvent("elara:notice", {
        detail: { title: "Conexión no disponible", message: failure.message, tone: "error" }
      }));
      throw failure;
    }
    throw error;
  }

  if (response.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new CustomEvent("elara:unauthorized"));
  }

  if (response.status === 204) {
    if (!response.ok) throw new ApiError(errorMessage(null, response.status), response.status);
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      throw new ApiError("El servidor devolvió una respuesta JSON no válida.", response.status);
    }
  } else {
    const text = await response.text();
    if (text && response.ok) {
      throw new ApiError("El servidor devolvió un formato de respuesta no esperado.", response.status);
    }
  }

  if (!response.ok) {
    const failure = new ApiError(errorMessage(payload, response.status), response.status);
    const tone = response.status === 401 || response.status === 403 ? "warning" : "error";
    window.dispatchEvent(new CustomEvent("elara:notice", {
      detail: {
        title: response.status === 401 ? "Autenticación requerida" : response.status === 403 ? "Acceso denegado" : response.status === 400 ? "Revisa los datos" : undefined,
        message: failure.message,
        tone
      }
    }));
    throw failure;
  }
  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" })
};

export function getApiMessage(error) {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado. Inténtalo de nuevo.";
}