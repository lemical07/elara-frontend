import { element } from "../utils/dom.js";

let activeDialog = null;
let activeForm = null;
let formPlaceholder = null;
let activeFormWasHidden = false;
let confirmResolver = null;
let confirmDecision = false;

function ensureModal() {
  if (activeDialog?.isConnected) return activeDialog;

  activeDialog = element("dialog", {
    className: "elara-modal",
    attrs: {
      id: "elara-modal",
      "aria-labelledby": "elara-modal-title",
      "aria-describedby": "elara-modal-description"
    }
  });

  const frame = element("section", { className: "elara-modal__frame" });
  const heading = element("header", { className: "elara-modal__heading" });
  const title = element("h2", { attrs: { id: "elara-modal-title" } });
  const close = element("button", {
    className: "icon-button",
    text: "×",
    attrs: { type: "button", "aria-label": "Cerrar ventana" }
  });
  heading.append(title, close);

  const description = element("p", {
    className: "elara-modal__description",
    attrs: { id: "elara-modal-description", "aria-live": "polite" }
  });
  const body = element("div", { className: "elara-modal__body" });
  const status = element("div", {
    className: "elara-modal__notice",
    attrs: { "aria-live": "polite", role: "status" }
  });
  const actions = element("div", { className: "elara-modal__actions" });

  frame.append(heading, description, status, body, actions);
  activeDialog.append(frame);
  document.body.append(activeDialog);

  close.addEventListener("click", () => activeDialog.close());
  activeDialog.addEventListener("click", (event) => {
    if (event.target === activeDialog) activeDialog.close();
  });
  activeDialog.addEventListener("cancel", () => {
    confirmDecision = false;
  });
  activeDialog.addEventListener("close", () => {
    if (activeForm && formPlaceholder?.parentNode) {
      formPlaceholder.parentNode.replaceChild(activeForm, formPlaceholder);
      activeForm.hidden = activeFormWasHidden;
    }
    activeForm = null;
    formPlaceholder = null;
    activeFormWasHidden = false;
    body.replaceChildren();
    status.replaceChildren();
    actions.replaceChildren();
    activeDialog.dataset.mode = "";
    confirmResolver?.(confirmDecision);
    confirmResolver = null;
    confirmDecision = false;
  });

  return activeDialog;
}

function show(titleText, message, tone = "info", mode = "notice") {
  const dialog = ensureModal();
  if (dialog.open && dialog.dataset.mode === "confirm") {
    confirmResolver?.(false);
    confirmResolver = null;
  }
  const title = dialog.querySelector("#elara-modal-title");
  const description = dialog.querySelector("#elara-modal-description");
  const status = dialog.querySelector(".elara-modal__notice");

  title.textContent = titleText;
  description.textContent = message;
  dialog.dataset.mode = mode;

  if (mode === "notice") {
    status.className = `elara-modal__notice elara-modal__notice--${tone}`;
    status.replaceChildren();
    if (activeForm) {
      status.textContent = message;
      description.textContent = "";
    } else {
      status.append(element("span", { className: "elara-modal__indicator", text: toneSymbol(tone), attrs: { "aria-hidden": "true" } }));
      status.append(element("p", { text: message }));
    }
    dialog.querySelector(".elara-modal__actions").replaceChildren(
      element("button", {
        className: "button button--gold",
        text: "Entendido",
        attrs: { type: "button", "data-modal-close": "" }
      })
    );
    dialog.querySelector("[data-modal-close]").addEventListener("click", () => dialog.close(), { once: true });
  }

  if (!dialog.open) dialog.showModal();
  return dialog;
}

function toneSymbol(tone) {
  return { error: "!", success: "✓", warning: "!", info: "i" }[tone] || "i";
}

export function showNotice({ title, message, tone = "info" }) {
  const authDialog = document.querySelector("#auth-dialog");
  if (authDialog?.open) {
    const authStatus = authDialog.querySelector("[data-auth-status]");
    if (authStatus) {
      authStatus.textContent = message;
      authStatus.className = `status-message status-message--${tone}`;
    }
    return authDialog;
  }
  return show(title || noticeTitle(tone), message, tone);
}

export function noticeTitle(tone) {
  return {
    error: "No se pudo completar",
    success: "Operación completada",
    warning: "Atención",
    info: "Información"
  }[tone] || "Información";
}

export function openFormModal({ title, form }) {
  const dialog = ensureModal();
  const body = dialog.querySelector(".elara-modal__body");

  if (dialog.open) return;
  formPlaceholder = document.createComment("form modal placeholder");
  form.parentNode?.insertBefore(formPlaceholder, form);
  activeForm = form;
  activeFormWasHidden = form.hidden;
  form.hidden = false;
  body.append(form);

  dialog.querySelector("#elara-modal-title").textContent = title;
  dialog.querySelector("#elara-modal-description").textContent = "";
  dialog.querySelector(".elara-modal__notice").replaceChildren();
  dialog.querySelector(".elara-modal__actions").replaceChildren();
  dialog.dataset.mode = "form";
  dialog.showModal();
  form.querySelector("input, select, textarea, button")?.focus();
}

export function closeModal() {
  if (!activeDialog?.open) return Promise.resolve();
  return new Promise((resolve) => {
    activeDialog.addEventListener("close", resolve, { once: true });
    activeDialog.close();
  });
}

export function confirmAction({ title = "Confirmar acción", message, confirmText = "Continuar", tone = "warning" }) {
  const dialog = ensureModal();
  if (dialog.open) return Promise.resolve(false);

  return new Promise((resolve) => {
    confirmResolver = resolve;
    confirmDecision = false;
    const body = dialog.querySelector(".elara-modal__body");
    const status = dialog.querySelector(".elara-modal__notice");
    const actions = dialog.querySelector(".elara-modal__actions");
    dialog.querySelector("#elara-modal-title").textContent = title;
    dialog.querySelector("#elara-modal-description").textContent = message;
    status.className = `elara-modal__notice elara-modal__notice--${tone}`;
    status.replaceChildren(element("span", { className: "elara-modal__indicator", text: toneSymbol(tone), attrs: { "aria-hidden": "true" } }));
    actions.replaceChildren();
    const cancel = element("button", { className: "button button--quiet", text: "Cancelar", attrs: { type: "button" } });
    const confirm = element("button", { className: "button button--gold", text: confirmText, attrs: { type: "button" } });
    cancel.addEventListener("click", () => {
      confirmDecision = false;
      dialog.close();
    });
    confirm.addEventListener("click", () => {
      confirmDecision = true;
      dialog.close();
    });
    actions.append(cancel, confirm);
    body.replaceChildren();
    dialog.dataset.mode = "confirm";
    dialog.showModal();
    confirm.focus();
  });
}
