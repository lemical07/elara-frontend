import { getSession, initShell } from "../components/shell.js";
import { closeModal, openFormModal, showNotice } from "../components/modal.js";
import { api, getApiMessage } from "../services/api.js";
import { element, formatDate, setStatus } from "../utils/dom.js";

await initShell();

const profileStatus = document.querySelector("#profile-status");
const content = document.querySelector("#profile-content");

function renderActivity(reviews, reactions) {
  const activity = element("section", { className: "panel profile-activity" });
  activity.append(element("p", { className: "eyebrow", text: "TU ACTIVIDAD" }));
  activity.append(element("h2", { text: "Reseñas y reacciones" }));
  const reviewSection = element("div", { className: "activity-group" });
  reviewSection.append(element("h3", { text: `Mis reseñas · ${reviews.length}` }));
  if (!reviews.length) {
    reviewSection.append(element("p", { className: "muted", text: "Aún no has publicado reseñas." }));
  } else {
    const list = element("ul", { className: "activity-list" });
    for (const review of reviews) {
      const link = element("a", {
        text: `${review.contenido_titulo || "Contenido"} · ${review.calificacion}/10`,
        attrs: { href: `details.html?id=${encodeURIComponent(review.contenido_id)}` }
      });
      const row = element("li");
      row.append(link, element("span", { className: "muted", text: review.titulo || "" }));
      list.append(row);
    }
    reviewSection.append(list);
  }
  const reactionSection = element("div", { className: "activity-group" });
  reactionSection.append(element("h3", { text: `Mis reacciones · ${reactions.length}` }));
  if (!reactions.length) {
    reactionSection.append(element("p", { className: "muted", text: "Aún no has reaccionado a reseñas." }));
  } else {
    const list = element("ul", { className: "activity-list" });
    for (const reaction of reactions) {
      const row = element("li");
      row.append(
        element("span", { text: reaction.tipo === "like" ? "Me gusta" : "No me gusta" }),
        element("span", { text: reaction.review_titulo || "Reseña" })
      );
      list.append(row);
    }
    reactionSection.append(list);
  }
  const proposalSection = element("div", { className: "activity-group" });
  proposalSection.append(element("h3", { text: "Mis contenidos" }));
  proposalSection.append(element("p", {
    className: "muted",
    text: "La API actual no permite consultar tus propuestas; no se muestra un listado ni un contador ficticio."
  }));
  activity.append(reviewSection, reactionSection, proposalSection);
  return activity;
}

function renderProfile(user, reviews, reactions) {
  content.replaceChildren();
  const account = element("div", { className: "profile-column" });
  const profileCard = element("section", { className: "panel profile-card" });
  const role = getSession()?.rol?.toLowerCase().includes("admin") ? "admin" : "usuario";
  profileCard.append(element("img", {
    className: "profile-avatar",
    attrs: { src: `../assets/icons/perfil-${role}.png`, alt: "", width: "100", height: "100" }
  }));
  profileCard.append(element("p", { className: "eyebrow", text: user.rol || getSession()?.rol || "Usuario" }));
  const profileName = element("h2", { text: `${user.nombre || ""} ${user.apellido || ""}`.trim() });
  profileCard.append(profileName);
  if (user.activo === false) profileCard.append(element("p", { className: "status-message status-message--error", text: "Esta cuenta está inactiva." }));

  const editForm = element("form", { className: "data-form" });
  editForm.append(element("h3", { text: "Datos personales" }));
  for (const [name, label, value, autocomplete] of [
    ["nombre", "Nombre", user.nombre, "given-name"],
    ["apellido", "Apellido", user.apellido, "family-name"],
    ["correo", "Correo electrónico", user.correo, "email"]
  ]) {
    const field = element("label", { text: label });
    const input = element("input", { attrs: { name, maxlength: name === "correo" ? "150" : "60", autocomplete, required: true } });
    if (name === "correo") input.type = "email";
    input.value = value || "";
    field.append(input);
    editForm.append(field);
  }
  const editStatus = element("div", { className: "form-status", attrs: { "aria-live": "polite" } });
  const save = element("button", { className: "button button--gold", text: "Guardar cambios", attrs: { type: "submit" } });
  editForm.append(save, editStatus);
  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(editForm).entries());
    save.disabled = true;
    setStatus(editStatus, "Guardando perfil…");
    try {
      await api.put("/usuarios/me", body);
      user.nombre = body.nombre;
      user.apellido = body.apellido;
      user.correo = body.correo;
      profileName.textContent = `${user.nombre} ${user.apellido}`.trim();
      await closeModal();
      showNotice({ title: "Perfil actualizado", message: "Tus datos personales se guardaron correctamente.", tone: "success" });
    } catch (error) {
      setStatus(editStatus, getApiMessage(error), "error");
      save.disabled = false;
    }
  });
  const editProfileButton = element("button", {
    className: "button button--quiet",
    text: "Editar perfil",
    attrs: { type: "button" }
  });
  editProfileButton.addEventListener("click", () => openFormModal({ title: "Editar perfil", form: editForm }));
  profileCard.append(editProfileButton, editForm);
  editForm.hidden = true;

  const passwordForm = element("form", { className: "data-form password-form" });
  passwordForm.append(element("h3", { text: "Cambiar contraseña" }));
  for (const [name, label, autocomplete] of [
    ["contrasena_actual", "Contraseña actual", "current-password"],
    ["contrasena_nueva", "Nueva contraseña (mínimo 8 caracteres)", "new-password"]
  ]) {
    const field = element("label", { text: label });
    field.append(element("input", {
      attrs: {
        name,
        type: "password",
        autocomplete,
        minlength: name === "contrasena_nueva" ? "8" : undefined,
        required: true
      }
    }));
    passwordForm.append(field);
  }
  const passwordStatus = element("div", { className: "form-status", attrs: { "aria-live": "polite" } });
  const updatePassword = element("button", { className: "button button--quiet", text: "Actualizar contraseña", attrs: { type: "submit" } });
  passwordForm.append(updatePassword, passwordStatus);
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(passwordForm).entries());
    updatePassword.disabled = true;
    setStatus(passwordStatus, "Actualizando contraseña…");
    try {
      await api.patch("/usuarios/me/contrasena", body);
      passwordForm.reset();
      await closeModal();
      showNotice({ title: "Contraseña actualizada", message: "Tu contraseña se actualizó correctamente.", tone: "success" });
    } catch (error) {
      setStatus(passwordStatus, getApiMessage(error), "error");
    } finally {
      updatePassword.disabled = false;
    }
  });
  const passwordButton = element("button", {
    className: "button button--quiet",
    text: "Cambiar contraseña",
    attrs: { type: "button" }
  });
  passwordButton.addEventListener("click", () => openFormModal({ title: "Cambiar contraseña", form: passwordForm }));
  profileCard.append(passwordButton, passwordForm);
  passwordForm.hidden = true;
  account.append(profileCard);

  content.append(account, renderActivity(reviews, reactions));
}

if (!getSession()) {
  setStatus(profileStatus, "Inicia sesión para consultar y gestionar tu perfil.", "error");
} else {
  setStatus(profileStatus, "Cargando perfil…");
  try {
    const [profileResponse, reviewsResponse, reactionsResponse] = await Promise.all([
      api.get("/usuarios/me"),
      api.get("/reviews/mis-reviews"),
      api.get("/reacciones/mis-reacciones")
    ]);
    setStatus(profileStatus, "");
    renderProfile(
      profileResponse?.datos || {},
      Array.isArray(reviewsResponse?.datos) ? reviewsResponse.datos : [],
      Array.isArray(reactionsResponse?.datos) ? reactionsResponse.datos : []
    );
  } catch (error) {
    setStatus(profileStatus, getApiMessage(error), "error");
  }
}