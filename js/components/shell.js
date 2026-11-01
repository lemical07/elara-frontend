import { api, clearToken, getApiMessage, getToken, saveToken } from "../services/api.js";
import { showNotice } from "./modal.js";
import { element, setStatus } from "../utils/dom.js";

let currentSession = null;

window.addEventListener("elara:unauthorized", () => {
  currentSession = null;
  renderHeader();
});

window.addEventListener("elara:notice", (event) => showNotice(event.detail));

function pageHref(page) {
  return window.location.pathname.includes("/pages/") ? `${page}.html` : `pages/${page}.html`;
}

function isAdmin(session) {
  const role = session?.rol?.trim().toLowerCase();
  return role === "admin" || role === "administrador";
}

function renderHeader() {
  const header = document.querySelector("#site-header");
  if (!header) return;
  const role = currentSession ? (isAdmin(currentSession) ? "admin" : "usuario") : "visitante";
  const assetBase = window.location.pathname.includes("/pages/") ? "../assets" : "assets";
  document.body.dataset.role = role;

  const brand = element("a", { className: "brand", attrs: { href: pageHref("catalog"), "aria-label": "ELARA, ir al catálogo" } });
  brand.append(element("img", { attrs: { src: `${assetBase}/icons/logo.png`, alt: "", width: "42", height: "42" } }));
  brand.append(element("span", { text: "ELARA" }));

  const nav = element("nav", { className: "main-nav", attrs: { "aria-label": "Navegación principal" } });
  for (const [label, page] of [["Catálogo", "catalog"]]) {
    nav.append(element("a", { text: label, attrs: { href: pageHref(page) } }));
  }
  if (currentSession) nav.append(element("a", { text: "Mi perfil", attrs: { href: pageHref("profile") } }));
  if (isAdmin(currentSession)) nav.append(element("a", { className: "nav-admin", text: "Administración", attrs: { href: pageHref("admin") } }));

  const actions = element("div", { className: "header-actions" });
  if (currentSession) {
    const avatar = element("img", {
      className: "header-avatar",
      attrs: {
        src: `${assetBase}/icons/perfil-${role}.png`,
        alt: "",
        width: "38",
        height: "38"
      }
    });
    const displayName = element("span", { className: "header-name", text: currentSession.nombre || "Mi cuenta" });
    const profileLink = element("a", { className: "avatar-link", attrs: { href: pageHref("profile"), "aria-label": "Abrir mi perfil" } });
    profileLink.append(avatar);
    actions.append(profileLink, displayName);
    const logout = element("button", { className: "button button--quiet button--small", text: "Cerrar sesión", attrs: { type: "button" } });
    logout.addEventListener("click", () => {
      clearToken();
      currentSession = null;
      window.location.assign(pageHref("catalog"));
    });
    actions.append(logout);
  } else {
    const login = element("button", { className: "button button--quiet button--small", text: "Iniciar sesión", attrs: { type: "button" } });
    login.addEventListener("click", () => openAuthDialog("login"));
    const register = element("button", { className: "button button--gold button--small", text: "Crear cuenta", attrs: { type: "button" } });
    register.addEventListener("click", () => openAuthDialog("register"));
    actions.append(login, register);
  }

  header.replaceChildren();
  header.append(brand, nav, actions);
}

function ensureAuthDialog() {
  if (document.querySelector("#auth-dialog")) return;
  const dialog = element("dialog", { className: "auth-dialog", attrs: { id: "auth-dialog", "aria-labelledby": "auth-title" } });
  dialog.innerHTML = `
    <div class="dialog-heading">
      <div><p class="eyebrow">BIENVENIDO A ELARA</p><h2 id="auth-title">Tu próxima historia te espera.</h2></div>
      <button class="icon-button" type="button" data-close-dialog aria-label="Cerrar">×</button>
    </div>
    <div class="auth-switch" role="tablist" aria-label="Acceso o registro">
      <button type="button" role="tab" data-auth-mode="login" aria-selected="true">Iniciar sesión</button>
      <button type="button" role="tab" data-auth-mode="register" aria-selected="false">Crear cuenta</button>
    </div>
    <div data-auth-status></div>
    <form class="auth-form" data-auth-form="login">
      <label>Correo electrónico<input name="correo" type="email" autocomplete="email" maxlength="150" required></label>
      <label>Contraseña<input name="contrasena" type="password" autocomplete="current-password" required></label>
      <button class="button button--gold button--full" type="submit">Entrar</button>
    </form>
    <form class="auth-form" data-auth-form="register" hidden>
      <div class="form-grid form-grid--two">
        <label>Nombre<input name="nombre" autocomplete="given-name" maxlength="60" required></label>
        <label>Apellido<input name="apellido" autocomplete="family-name" maxlength="60" required></label>
      </div>
      <label>Correo electrónico<input name="correo" type="email" autocomplete="email" maxlength="150" required></label>
      <label>Contraseña <span class="field-hint">Mínimo 8 caracteres</span><input name="contrasena" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="button button--gold button--full" type="submit">Crear mi cuenta</button>
    </form>`;
  document.body.append(dialog);
  dialog.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });
  dialog.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", submitAuthForm);
  });
}

function setAuthMode(mode) {
  const dialog = document.querySelector("#auth-dialog");
  dialog.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.authMode === mode));
  });
  dialog.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.hidden = form.dataset.authForm !== mode;
  });
  setStatus(dialog.querySelector("[data-auth-status]"), "");
}

function openAuthDialog(mode) {
  const dialog = document.querySelector("#auth-dialog");
  setAuthMode(mode);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector(`[data-auth-form="${mode}"] input`)?.focus();
}

async function submitAuthForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const mode = form.dataset.authForm;
  const dialog = document.querySelector("#auth-dialog");
  const status = dialog.querySelector("[data-auth-status]");
  const submit = form.querySelector('[type="submit"]');
  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());
  submit.disabled = true;
  setStatus(status, mode === "login" ? "Verificando tus datos…" : "Creando tu cuenta…");
  try {
    const result = await api.post(`/auth/${mode}`, body, { authenticated: false });
    const token = result?.datos?.token;
    if (typeof token !== "string" || !token) throw new Error("La respuesta no incluyó una sesión válida.");
    saveToken(token);
    const response = await api.get("/auth/me");
    currentSession = response?.datos || null;
    if (!currentSession?.rol) throw new Error("No fue posible confirmar el rol de la sesión.");
    dialog.close();
    renderHeader();
    window.dispatchEvent(new CustomEvent("elara:session", { detail: { session: currentSession } }));
    window.location.reload();
  } catch (error) {
    if (error.status === 401 && getToken()) clearToken();
    setStatus(status, getApiMessage(error), "error");
  } finally {
    submit.disabled = false;
  }
}

export function getSession() {
  return currentSession;
}

export async function initShell() {
  ensureAuthDialog();
  currentSession = null;
  if (getToken()) {
    try {
      const response = await api.get("/auth/me");
      currentSession = response?.datos || null;
    } catch (error) {
      if (error.status === 401) clearToken();
      const toast = document.querySelector("#toast-region");
      if (toast) setStatus(toast, getApiMessage(error), "error");
    }
  }
  renderHeader();
  return currentSession;
}
