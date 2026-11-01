import { getSession, initShell } from "../components/shell.js";
import { closeModal, confirmAction, openFormModal, showNotice } from "../components/modal.js";
import { api, getApiMessage } from "../services/api.js";
import { element, formatContentType, proposalStatusBadge, safeImageUrl, setStatus } from "../utils/dom.js";

await initShell();

const session = getSession();
const adminStatus = document.querySelector("#admin-status");
const categoryForm = document.querySelector("#category-form");
const contentForm = document.querySelector("#content-form");
const userForm = document.querySelector("#user-form");
const characterForm = document.querySelector("#character-form");
const characterPanel = document.querySelector("#character-admin-panel");
let categories = [];
let editingCategoryId = null;
let editingContentId = null;
let editingUserId = null;
let selectedCharacterContentId = null;
let editingCharacterId = null;

if (!session || !["admin", "administrador"].includes(session.rol?.trim().toLowerCase())) {
  setStatus(adminStatus, "Esta sección requiere una sesión administrativa confirmada por ELARA.", "error");
  document.querySelector(".admin-tabs").hidden = true;
  document.querySelectorAll(".admin-panel").forEach((panel) => { panel.hidden = true; });
} else {
  function showPanel(name) {
    document.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === name);
      button.setAttribute("aria-selected", String(button.dataset.tab === name));
    });
  }

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      showPanel(button.dataset.tab);
      if (button.dataset.tab === "content") loadContent();
      if (button.dataset.tab === "categories") loadCategories();
      if (button.dataset.tab === "users") loadUsers();
      if (button.dataset.tab === "proposals") loadProposals();
    });
  });
  document.querySelector("#close-characters").addEventListener("click", () => { characterPanel.hidden = true; });
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.refresh === "users") loadUsers();
      else loadProposals();
    });
  });

  async function loadProposals() {
    const status = document.querySelector("#proposals-status");
    const list = document.querySelector("#proposals-list");
    list.replaceChildren();
    setStatus(status, "Cargando propuestas…");
    try {
      const response = await api.get("/propuestas/pendientes");
      const proposals = Array.isArray(response?.datos) ? response.datos : [];
      if (!proposals.length) {
        setStatus(status, "No hay propuestas pendientes.");
        return;
      }
      setStatus(status, "");
      for (const proposal of proposals) {
        const card = element("article", { className: "admin-list-item" });
        const title = element("div", { className: "admin-list-item__body" });
        title.append(element("h3", { text: proposal.titulo || "Propuesta" }));
        title.append(element("p", {
          className: "muted",
          text: [proposal.tipo ? formatContentType(proposal.tipo) : "", proposal.anio, proposal.categoria].filter(Boolean).join(" · ")
        }));
        title.append(proposalStatusBadge("pendiente"));
        if (proposal.descripcion) title.append(element("p", { text: proposal.descripcion }));
        if (proposal.director) title.append(element("p", { className: "muted", text: `Director · ${proposal.director}` }));
        if (safeImageUrl(proposal.url_imagen)) {
          title.append(element("a", {
            className: "text-link",
            text: "Abrir imagen",
            attrs: { href: safeImageUrl(proposal.url_imagen), target: "_blank", rel: "noopener noreferrer" }
          }));
        }
        const actions = element("div", { className: "inline-actions" });
        for (const [label, state, className] of [
          ["Aprobar", "aprobado", "button button--gold button--small"],
          ["Rechazar", "rechazado", "button button--quiet button--small"]
        ]) {
          const button = element("button", { className, text: label, attrs: { type: "button" } });
          button.addEventListener("click", async () => {
            const confirmed = await confirmAction({
              title: `${label} propuesta`,
              message: `¿${label} la propuesta «${proposal.titulo}»?`,
              confirmText: label
            });
            if (!confirmed) return;
            button.disabled = true;
            setStatus(status, `${label}ndo propuesta…`);
            try {
              await api.patch(`/propuestas/${proposal.id}/estado`, { estado: state });
              await loadProposals();
              showNotice({
                title: "Propuesta actualizada",
                message: `La propuesta se marcó como ${state}.`,
                tone: "success"
              });
            } catch (error) {
              setStatus(status, getApiMessage(error), "error");
              button.disabled = false;
            }
          });
          actions.append(button);
        }
        card.append(title, actions);
        list.append(card);
      }
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    }
  }

  function addField(form, name, labelText, { type = "text", value = "", required = false, maxLength, min, max, options } = {}) {
    const label = element("label", { text: labelText });
    let input;
    if (options) {
      input = element("select", { attrs: { name, required } });
      for (const option of options) {
        const item = element("option", { text: option.label });
        item.value = option.value;
        input.append(item);
      }
    } else if (type === "textarea") {
      input = element("textarea", { attrs: { name, rows: "4", maxlength: maxLength, required } });
    } else {
      input = element("input", { attrs: { name, type, maxlength: maxLength, min, max, required } });
    }
    input.value = value ?? "";
    label.append(input);
    form.append(label);
    return input;
  }

  async function loadCategories() {
    const status = document.querySelector("#categories-admin-status");
    const list = document.querySelector("#categories-admin-list");
    list.replaceChildren();
    setStatus(status, "Cargando categorías…");
    try {
      const response = await api.get("/categorias");
      categories = Array.isArray(response?.datos) ? response.datos : [];
      if (!categories.length) {
        setStatus(status, "No hay categorías.");
      } else {
        setStatus(status, "");
        for (const category of categories) {
          const row = element("article", { className: "admin-list-item" });
          const info = element("div", { className: "admin-list-item__body" });
          info.append(element("h3", { text: category.nombre || "Categoría" }));
          if (category.descripcion) info.append(element("p", { className: "muted", text: category.descripcion }));
          const actions = element("div", { className: "inline-actions" });
          const edit = element("button", { className: "button button--quiet button--small", text: "Editar", attrs: { type: "button" } });
          edit.addEventListener("click", () => openCategoryForm(category));
          const remove = element("button", { className: "button button--quiet button--small", text: "Eliminar", attrs: { type: "button" } });
          remove.addEventListener("click", async () => {
            const confirmed = await confirmAction({
              title: "Eliminar categoría",
              message: `¿Eliminar la categoría «${category.nombre}»? Si tiene contenido asociado, ELARA rechazará la operación.`,
              confirmText: "Eliminar"
            });
            if (!confirmed) return;
            remove.disabled = true;
            try {
              await api.delete(`/categorias/${category.id}`);
              await loadCategories();
              showNotice({ title: "Categoría eliminada", message: "La categoría se eliminó correctamente.", tone: "success" });
            } catch (error) {
              setStatus(status, getApiMessage(error), "error");
              remove.disabled = false;
            }
          });
          actions.append(edit, remove);
          row.append(info, actions);
          list.append(row);
        }
      }
      refreshContentCategoryOptions();
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    }
  }

  function openCategoryForm(category = null) {
    editingCategoryId = category?.id ?? null;
    categoryForm.replaceChildren();
    categoryForm.className = "data-form panel form-inset";
    categoryForm.append(element("h3", { text: category ? "Editar categoría" : "Nueva categoría" }));
    addField(categoryForm, "nombre", "Nombre", { value: category?.nombre || "", required: true, maxLength: 50 });
    addField(categoryForm, "descripcion", "Descripción", { type: "textarea", value: category?.descripcion || "" });
    const actions = element("div", { className: "form-actions" });
    actions.append(element("button", { className: "button button--gold", text: "Guardar categoría", attrs: { type: "submit" } }));
    const cancel = element("button", { className: "button button--quiet", text: "Cancelar", attrs: { type: "button" } });
    cancel.addEventListener("click", closeModal);
    actions.append(cancel);
    categoryForm.append(actions, element("div", { className: "form-status", attrs: { "aria-live": "polite" } }));
    openFormModal({ title: category ? "Editar categoría" : "Nueva categoría", form: categoryForm });
  }

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = categoryForm.querySelector(".form-status");
    const submit = categoryForm.querySelector('[type="submit"]');
    const values = new FormData(categoryForm);
    const body = {
      nombre: String(values.get("nombre")).trim(),
      descripcion: String(values.get("descripcion") || "").trim() || null
    };
    submit.disabled = true;
    setStatus(status, "Guardando categoría…");
    try {
      if (editingCategoryId) await api.put(`/categorias/${editingCategoryId}`, body);
      else await api.post("/categorias", body);
      await closeModal();
      await loadCategories();
      showNotice({ title: "Categoría guardada", message: "Los cambios se guardaron correctamente.", tone: "success" });
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });

  function refreshContentCategoryOptions(selectedId) {
    const select = contentForm.querySelector('[name="categoria_id"]');
    if (!select) return;
    const selected = selectedId ?? select.value;
    select.replaceChildren();
    select.append(element("option", { text: "Selecciona una categoría", attrs: { value: "" } }));
    for (const category of categories) {
      const option = element("option", { text: category.nombre });
      option.value = String(category.id);
      select.append(option);
    }
    select.value = String(selected || "");
  }

  function openContentForm(item = null) {
    editingContentId = item?.id ?? null;
    contentForm.replaceChildren();
    contentForm.className = "data-form panel form-inset";
    contentForm.append(element("h3", { text: item ? `Editar · ${item.titulo}` : "Añadir contenido aprobado" }));
    addField(contentForm, "titulo", "Título", { value: item?.titulo || "", required: true, maxLength: 50 });
    addField(contentForm, "categoria_id", "Categoría", {
      type: "select",
      required: true,
      options: [{ value: "", label: "Selecciona una categoría" }, ...categories.map((category) => ({ value: String(category.id), label: category.nombre }))]
    });
    addField(contentForm, "tipo", "Tipo", {
      type: "select",
      required: true,
      value: item?.tipo || "pelicula",
      options: [
        { value: "pelicula", label: "Película" },
        { value: "serie", label: "Serie" },
        { value: "anime", label: "Anime" }
      ]
    });
    addField(contentForm, "anio", "Año", { type: "number", value: item?.anio ?? new Date().getFullYear(), required: true, min: 1901, max: 2155 });
    addField(contentForm, "director", "Director", { value: item?.director || "", maxLength: 150 });
    addField(contentForm, "url_imagen", "URL de imagen", { type: "url", value: item?.urlImagen || "", maxLength: 500 });
    addField(contentForm, "url_trailer", "URL de tráiler", { type: "url", value: item?.urlTrailer || "", maxLength: 500 });
    addField(contentForm, "descripcion", "Descripción", { type: "textarea", value: item?.descripcion || "" });
    refreshContentCategoryOptions(item?.categoria_id || categories.find((category) => category.nombre === item?.categoria)?.id);
    const actions = element("div", { className: "form-actions" });
    actions.append(element("button", { className: "button button--gold", text: "Guardar contenido", attrs: { type: "submit" } }));
    const cancel = element("button", { className: "button button--quiet", text: "Cancelar", attrs: { type: "button" } });
    cancel.addEventListener("click", closeModal);
    actions.append(cancel);
    contentForm.append(actions, element("div", { className: "form-status", attrs: { "aria-live": "polite" } }));
    openFormModal({ title: item ? `Editar contenido · ${item.titulo}` : "Añadir contenido", form: contentForm });
  }

  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = contentForm.querySelector(".form-status");
    const submit = contentForm.querySelector('[type="submit"]');
    const values = new FormData(contentForm);
    const optional = (name) => String(values.get(name) || "").trim() || null;
    const body = {
      categoria_id: Number(values.get("categoria_id")),
      titulo: String(values.get("titulo")).trim(),
      tipo: String(values.get("tipo")),
      anio: Number(values.get("anio")),
      descripcion: optional("descripcion"),
      director: optional("director"),
      url_imagen: optional("url_imagen"),
      url_trailer: optional("url_trailer")
    };
    submit.disabled = true;
    setStatus(status, "Guardando contenido…");
    try {
      if (editingContentId) await api.put(`/contenidos/${editingContentId}`, body);
      else await api.post("/contenidos", body);
      await closeModal();
      await loadContent();
      showNotice({ title: "Contenido guardado", message: "Los cambios se guardaron correctamente.", tone: "success" });
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });

  async function loadContent() {
    const status = document.querySelector("#content-admin-status");
    const list = document.querySelector("#content-admin-list");
    list.replaceChildren();
    setStatus(status, "Cargando catálogo…");
    try {
      if (!categories.length) {
        const categoryResponse = await api.get("/categorias");
        categories = Array.isArray(categoryResponse?.datos) ? categoryResponse.datos : [];
      }
      refreshContentCategoryOptions();
      const response = await api.get("/contenidos/catalogo");
      const items = Array.isArray(response?.datos) ? response.datos : [];
      if (!items.length) {
        setStatus(status, "No hay contenido aprobado.");
        return;
      }
      setStatus(status, "");
      for (const item of items) {
        const row = element("article", { className: "admin-list-item" });
        const info = element("div", { className: "admin-list-item__body" });
        info.append(element("h3", { text: item.titulo }));
        info.append(element("p", {
          className: "muted",
          text: `${formatContentType(item.tipo)} · ${item.categoria} · ${item.anioLanzamiento}`
        }));
        const actions = element("div", { className: "inline-actions" });
        const edit = element("button", { className: "button button--quiet button--small", text: "Editar", attrs: { type: "button" } });
        edit.addEventListener("click", async () => {
          edit.disabled = true;
          try {
            const detail = await api.get(`/contenidos/${item.id}`);
            openContentForm(detail?.datos || item);
          } catch (error) {
            setStatus(status, getApiMessage(error), "error");
          } finally {
            edit.disabled = false;
          }
        });
        const remove = element("button", { className: "button button--quiet button--small", text: "Eliminar", attrs: { type: "button" } });
        remove.addEventListener("click", async () => {
          const confirmed = await confirmAction({
            title: "Eliminar contenido",
            message: `¿Eliminar «${item.titulo}» del catálogo?`,
            confirmText: "Eliminar"
          });
          if (!confirmed) return;
          remove.disabled = true;
          try {
            await api.delete(`/contenidos/${item.id}`);
            await loadContent();
            showNotice({ title: "Contenido eliminado", message: "El contenido se eliminó del catálogo.", tone: "success" });
          } catch (error) {
            setStatus(status, getApiMessage(error), "error");
            remove.disabled = false;
          }
        });
        const characters = element("button", { className: "button button--quiet button--small", text: "Personajes", attrs: { type: "button" } });
        characters.addEventListener("click", () => loadCharacters(item));
        actions.append(edit, characters, remove);
        row.append(info, actions);
        list.append(row);
      }
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    }
  }

  async function loadUsers() {
    const status = document.querySelector("#users-admin-status");
    const list = document.querySelector("#users-admin-list");
    list.replaceChildren();
    setStatus(status, "Cargando usuarios…");
    try {
      const response = await api.get("/usuarios");
      const users = Array.isArray(response?.datos) ? response.datos : [];
      if (!users.length) {
        setStatus(status, "No hay usuarios registrados.");
        return;
      }
      setStatus(status, "");
      for (const user of users) {
        const row = element("article", { className: "admin-list-item" });
        const info = element("div", { className: "admin-list-item__body" });
        info.append(element("h3", { text: `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario" }));
        info.append(element("p", { className: "muted", text: `${user.correo || ""} · ${user.rol || ""}` }));
        const actions = element("div", { className: "inline-actions" });
        const edit = element("button", { className: "button button--quiet button--small", text: "Editar datos", attrs: { type: "button" } });
        edit.addEventListener("click", () => openUserForm(user));
        const active = Boolean(user.activo);
        const toggle = element("button", {
          className: active ? "button button--quiet button--small" : "button button--gold button--small",
          text: active ? "Desactivar" : "Activar",
          attrs: { type: "button" }
        });
        toggle.addEventListener("click", async () => {
          const nextState = !active;
          const confirmed = await confirmAction({
            title: `${nextState ? "Activar" : "Desactivar"} cuenta`,
            message: `¿${nextState ? "Activar" : "Desactivar"} la cuenta de ${user.nombre || user.correo}?`,
            confirmText: nextState ? "Activar" : "Desactivar"
          });
          if (!confirmed) return;
          toggle.disabled = true;
          try {
            await api.patch(`/usuarios/${user.id}/estado`, { activo: nextState });
            await loadUsers();
            showNotice({ title: "Estado actualizado", message: `La cuenta se ${nextState ? "activó" : "desactivó"} correctamente.`, tone: "success" });
          } catch (error) {
            setStatus(status, getApiMessage(error), "error");
            toggle.disabled = false;
          }
        });
        actions.append(edit, toggle);
        row.append(info, actions);
        list.append(row);
      }
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    }
  }

  async function loadCharacters(content) {
    selectedCharacterContentId = content.id;
    characterPanel.hidden = false;
    characterForm.hidden = true;
    document.querySelector("#character-admin-title").textContent = content.titulo || "Personajes";
    const status = document.querySelector("#characters-status");
    const list = document.querySelector("#characters-list");
    list.replaceChildren();
    setStatus(status, "Cargando personajes…");
    characterPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const response = await api.get(`/contenidos/${content.id}/personajes`);
      const characters = Array.isArray(response?.datos) ? response.datos : [];
      if (!characters.length) {
        setStatus(status, "Este título aún no tiene personajes.");
      } else {
        setStatus(status, "");
        for (const character of characters) {
          const row = element("article", { className: "admin-list-item" });
          const info = element("div", { className: "admin-list-item__body" });
          info.append(element("h3", { text: character.nombre }));
          info.append(element("p", { className: "muted", text: character.tipo }));
          const actions = element("div", { className: "inline-actions" });
          const edit = element("button", { className: "button button--quiet button--small", text: "Editar", attrs: { type: "button" } });
          edit.addEventListener("click", () => openCharacterForm(character));
          const remove = element("button", { className: "button button--quiet button--small", text: "Eliminar", attrs: { type: "button" } });
          remove.addEventListener("click", async () => {
            const confirmed = await confirmAction({
              title: "Eliminar personaje",
              message: `¿Eliminar al personaje «${character.nombre}»?`,
              confirmText: "Eliminar"
            });
            if (!confirmed) return;
            remove.disabled = true;
            try {
              await api.delete(`/contenidos/${selectedCharacterContentId}/personajes/${character.id}`);
              await loadCharacters(content);
              showNotice({ title: "Personaje eliminado", message: "El personaje se eliminó correctamente.", tone: "success" });
            } catch (error) {
              setStatus(status, getApiMessage(error), "error");
              remove.disabled = false;
            }
          });
          actions.append(edit, remove);
          row.append(info, actions);
          list.append(row);
        }
      }
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    }
  }

  function openCharacterForm(character = null) {
    editingCharacterId = character?.id ?? null;
    characterForm.replaceChildren();
    characterForm.className = "data-form panel form-inset";
    characterForm.append(element("h3", { text: character ? "Editar personaje" : "Añadir personaje" }));
    addField(characterForm, "nombre", "Nombre", { value: character?.nombre || "", required: true, maxLength: 100 });
    addField(characterForm, "tipo", "Tipo", {
      type: "select",
      value: character?.tipo || "principal",
      required: true,
      options: [
        { value: "principal", label: "Principal" },
        { value: "secundario", label: "Secundario" }
      ]
    });
    const actions = element("div", { className: "form-actions" });
    actions.append(element("button", { className: "button button--gold", text: "Guardar personaje", attrs: { type: "submit" } }));
    const cancel = element("button", { className: "button button--quiet", text: "Cancelar", attrs: { type: "button" } });
    cancel.addEventListener("click", closeModal);
    actions.append(cancel);
    characterForm.append(actions, element("div", { className: "form-status", attrs: { "aria-live": "polite" } }));
    openFormModal({ title: character ? "Editar personaje" : "Añadir personaje", form: characterForm });
  }

  characterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = characterForm.querySelector(".form-status");
    const submit = characterForm.querySelector('[type="submit"]');
    const values = new FormData(characterForm);
    const body = { nombre: String(values.get("nombre")).trim(), tipo: String(values.get("tipo")) };
    submit.disabled = true;
    setStatus(status, "Guardando personaje…");
    try {
      if (editingCharacterId) {
        await api.put(`/contenidos/${selectedCharacterContentId}/personajes/${editingCharacterId}`, body);
      } else {
        await api.post(`/contenidos/${selectedCharacterContentId}/personajes`, body);
      }
      await closeModal();
      const selectedContent = { id: selectedCharacterContentId, titulo: document.querySelector("#character-admin-title").textContent };
      await loadCharacters(selectedContent);
      showNotice({ title: "Personaje guardado", message: "Los cambios se guardaron correctamente.", tone: "success" });
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });

  function openUserForm(user) {
    editingUserId = user.id;
    userForm.replaceChildren();
    userForm.className = "data-form panel form-inset";
    userForm.append(element("h3", { text: `Editar usuario · ${user.correo}` }));
    addField(userForm, "nombre", "Nombre", { value: user.nombre || "", required: true, maxLength: 60 });
    addField(userForm, "apellido", "Apellido", { value: user.apellido || "", required: true, maxLength: 60 });
    addField(userForm, "correo", "Correo electrónico", { type: "email", value: user.correo || "", required: true, maxLength: 150 });
    const actions = element("div", { className: "form-actions" });
    actions.append(element("button", { className: "button button--gold", text: "Guardar cambios", attrs: { type: "submit" } }));
    const cancel = element("button", { className: "button button--quiet", text: "Cancelar", attrs: { type: "button" } });
    cancel.addEventListener("click", closeModal);
    actions.append(cancel);
    userForm.append(actions, element("div", { className: "form-status", attrs: { "aria-live": "polite" } }));
    openFormModal({ title: `Editar usuario · ${user.correo}`, form: userForm });
  }

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = userForm.querySelector(".form-status");
    const submit = userForm.querySelector('[type="submit"]');
    const values = new FormData(userForm);
    const body = Object.fromEntries(["nombre", "apellido", "correo"].map((name) => [name, String(values.get(name)).trim()]));
    submit.disabled = true;
    setStatus(status, "Actualizando usuario…");
    try {
      await api.patch(`/usuarios/${editingUserId}`, body);
      await closeModal();
      await loadUsers();
      showNotice({ title: "Usuario actualizado", message: "Los datos del usuario se guardaron correctamente.", tone: "success" });
    } catch (error) {
      setStatus(status, getApiMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("#new-category-button").addEventListener("click", () => openCategoryForm());
  document.querySelector("#new-content-button").addEventListener("click", async () => {
    if (!categories.length) await loadCategories();
    openContentForm();
    contentForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#new-character-button")?.addEventListener("click", () => openCharacterForm());

  showPanel("proposals");
  await loadProposals();
}