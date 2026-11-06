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
      <label>Contraseña <span class="field-hint">Déjala vacía en el primer registro; después es obligatoria</span><input name="contrasena" type="password" autocomplete="new-password" minlength="8"></label>
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

function mostrarBienvenidaPrimerAdministrador(usuario, contrasenaTemporal) {
  const dialog = document.querySelector("#auth-dialog");
  dialog?.close();
  dialog?.remove();

  document.querySelectorAll("body > main, body > header").forEach((elemento) => {
    elemento.hidden = true;
  });

  const pantalla = element("main", {
    className: "first-admin-screen",
    attrs: { "aria-labelledby": "first-admin-title" }
  });
  const tarjeta = element("section", { className: "first-admin-card" });
  const rutaRecursos = window.location.pathname.includes("/pages/") ? "../assets" : "assets";
  tarjeta.append(element("img", {
    className: "first-admin-logo",
    attrs: { src: `${rutaRecursos}/icons/logo.png`, alt: "ELARA", width: "90", height: "90" }
  }));
  tarjeta.append(element("p", { className: "eyebrow", text: "INICIALIZACIÓN DE ELARA" }));
  tarjeta.append(element("h1", {
    className: "first-admin-title",
    text: `¡Bienvenido, ${[usuario.nombre, usuario.apellido].filter(Boolean).join(" ")}!`,
    attrs: { id: "first-admin-title" }
  }));
  tarjeta.append(element("p", { className: "first-admin-message", text: "Asumes el rol de Administrador de ELARA." }));
  tarjeta.append(element("p", {
    className: "first-admin-description",
    text: "Tu contraseña como administrador de la plataforma:"
  }));

  let contrasena = contrasenaTemporal;
  contrasenaTemporal = null;
  const campoContrasena = element("input", {
    className: "first-admin-password",
    attrs: {
      type: "password",
      readonly: true,
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": "Contraseña temporal del administrador"
    }
  });
  campoContrasena.value = contrasena;

  const controles = element("div", { className: "first-admin-controls" });
  const botonVisibilidad = element("button", {
    className: "icon-button first-admin-icon-button",
    attrs: { type: "button", "aria-label": "Mostrar contraseña", "aria-pressed": "false" }
  });
  botonVisibilidad.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  const botonCopiar = element("button", {
    className: "button button--quiet first-admin-copy",
    text: "Copiar contraseña",
    attrs: { type: "button" }
  });
  const estadoCopia = element("span", {
    className: "first-admin-copy-status",
    attrs: { role: "status", "aria-live": "polite" }
  });
  controles.append(campoContrasena, botonVisibilidad, botonCopiar);
  tarjeta.append(controles, estadoCopia);

  const cuentaRegresiva = element("p", {
    className: "first-admin-countdown",
    attrs: { role: "timer", "aria-live": "off" }
  });
  tarjeta.append(cuentaRegresiva);
  const estadoExpiracion = element("p", {
    className: "first-admin-expiration",
    attrs: { role: "status", "aria-live": "polite" }
  });
  tarjeta.append(estadoExpiracion);
  const botonContinuar = element("button", {
    className: "button button--gold first-admin-continue",
    text: "Continuar",
    attrs: { type: "button" }
  });
  tarjeta.append(botonContinuar);
  pantalla.append(tarjeta);
  document.body.append(pantalla);

  let finalizada = false;
  let intervalo;
  let demoraNavegacion;
  const navegarAlPanel = () => window.location.assign(pageHref("catalog"));
  const borrarContrasena = () => {
    contrasena = null;
    campoContrasena.value = "";
    campoContrasena.type = "password";
    botonVisibilidad.disabled = true;
    botonCopiar.disabled = true;
    botonVisibilidad.setAttribute("aria-pressed", "false");
    botonVisibilidad.setAttribute("aria-label", "Mostrar contraseña");
  };
  const continuar = () => {
    if (finalizada) return;
    finalizada = true;
    window.clearInterval(intervalo);
    window.clearTimeout(demoraNavegacion);
    borrarContrasena();
    navegarAlPanel();
  };

  botonVisibilidad.addEventListener("click", () => {
    const visible = campoContrasena.type === "password";
    campoContrasena.type = visible ? "text" : "password";
    botonVisibilidad.setAttribute("aria-pressed", String(visible));
    botonVisibilidad.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
  });

  botonCopiar.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.writeText || !contrasena) {
        throw new Error("El navegador no permite copiar la contraseña.");
      }
      await navigator.clipboard.writeText(contrasena);
      estadoCopia.textContent = "Contraseña copiada correctamente.";
      estadoCopia.dataset.tone = "success";
    } catch {
      estadoCopia.textContent = "No se pudo copiar. Selecciona la contraseña y cópiala manualmente.";
      estadoCopia.dataset.tone = "error";
    }
  });
  botonContinuar.addEventListener("click", continuar);

  const venceEn = Date.now() + 60_000;
  const actualizarCuentaRegresiva = () => {
    const segundos = Math.max(0, Math.ceil((venceEn - Date.now()) / 1000));
    cuentaRegresiva.textContent = `Tiempo disponible: ${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
    if (segundos === 0 && !finalizada) {
      finalizada = true;
      window.clearInterval(intervalo);
      borrarContrasena();
      botonContinuar.disabled = true;
      estadoExpiracion.textContent = "El tiempo para consultar la contraseña terminó.";
      demoraNavegacion = window.setTimeout(navegarAlPanel, 800);
    }
  };
  actualizarCuentaRegresiva();
  intervalo = window.setInterval(actualizarCuentaRegresiva, 250);
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
  if (mode === "register" && !body.contrasena) delete body.contrasena;
  submit.disabled = true;
  setStatus(status, mode === "login" ? "Verificando tus datos…" : "Creando tu cuenta…");
  try {
    const result = await api.post(`/auth/${mode}`, body, { authenticated: false });
    const datos = result?.datos;
    const token = datos?.token;
    if (typeof token !== "string" || !token) throw new Error("La respuesta no incluyó una sesión válida.");
    saveToken(token);
    if (mode === "register" && datos.primer_administrador === true) {
      if (
        typeof datos.contrasena_temporal !== "string" ||
        datos.contrasena_temporal.length !== 13 ||
        !datos.usuario?.nombre ||
        !datos.usuario?.rol
      ) {
        clearToken();
        throw new Error("La respuesta de inicialización no es válida.");
      }
      currentSession = datos.usuario;
      const contrasenaTemporal = datos.contrasena_temporal;
      datos.contrasena_temporal = null;
      window.dispatchEvent(new CustomEvent("elara:session", { detail: { session: currentSession } }));
      mostrarBienvenidaPrimerAdministrador(currentSession, contrasenaTemporal);
      return;
    }
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
