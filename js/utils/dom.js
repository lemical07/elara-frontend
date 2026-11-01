export function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    }
  }
  return node;
}

export function setStatus(target, message, tone = "info") {
  target.replaceChildren();
  if (!message) return;
  const status = element("p", {
    className: `status-message status-message--${tone}`,
    text: message,
    attrs: { role: tone === "error" ? "alert" : "status" }
  });
  target.append(status);
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date);
}

export function formatContentType(value) {
  if (typeof value !== "string" || !value.trim()) return "Contenido";
  const normalized = value.trim().toLowerCase();
  return {
    pelicula: "Película",
    "película": "Película",
    serie: "Serie",
    anime: "Anime"
  }[normalized] || value;
}

export function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function proposalStatusBadge(status) {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";
  const labels = {
    pendiente: "Pendiente · en revisión",
    rechazado: "Rechazado",
    aprobado: "Aprobado"
  };
  const label = labels[normalized] || "Estado no disponible";
  const badge = element("span", {
    className: `proposal-badge proposal-badge--${labels[normalized] ? normalized : "desconocido"}`,
    text: label,
    attrs: { role: "status" }
  });
  return badge;
}
