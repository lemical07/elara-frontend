import { getSession, initShell } from "../components/shell.js";
import { openFormModal, showNotice } from "../components/modal.js";
import { api, getApiMessage } from "../services/api.js";
import { element, formatContentType, proposalStatusBadge, setStatus } from "../utils/dom.js";

const session = await initShell();

const form = document.querySelector("#catalog-filters");
const categorySelect = document.querySelector("#category-filter");
const results = document.querySelector("#catalog-results");
const status = document.querySelector("#catalog-status");
const proposalToggle = document.querySelector("#proposal-toggle");
const proposalForm = document.querySelector("#proposal-form");
const proposalCategory = document.querySelector("#proposal-category");

function renderContent(items) {
  results.replaceChildren();
  if (!items.length) {
    setStatus(status, "No encontramos títulos con esos filtros. Prueba con otra búsqueda.");
    return;
  }
  setStatus(status, `${items.length} ${items.length === 1 ? "título disponible" : "títulos disponibles"}`);
  for (const item of items) {
    const card = element("article", { className: "title-card" });
    const cardTop = element("div", { className: "title-card__top" });
    cardTop.append(
      element("span", { className: "type-chip", text: formatContentType(item.tipo) }),
      element("span", { className: "title-card__year", text: String(item.anioLanzamiento ?? "") })
    );
    card.append(cardTop);
    card.append(element("p", { className: "title-card__category", text: item.categoria || "Sin categoría" }));
    card.append(element("h2", { text: item.titulo || "Título sin nombre" }));
    const link = element("a", {
      className: "text-link",
      text: "Ver detalles",
      attrs: { href: `details.html?id=${encodeURIComponent(item.id)}`, "aria-label": `Ver detalles de ${item.titulo}` }
    });
    card.append(link);
    results.append(card);
  }
}

async function loadCategories() {
  try {
    const response = await api.get("/categorias");
    const categories = Array.isArray(response?.datos) ? response.datos : [];
    for (const category of categories) {
      const option = element("option", { text: category.nombre || "" });
      option.value = category.nombre || "";
      categorySelect.append(option);
      const proposalOption = element("option", { text: category.nombre || "" });
      proposalOption.value = String(category.id);
      proposalCategory.append(proposalOption);
    }
  } catch (error) {
    setStatus(status, `No fue posible cargar las categorías: ${getApiMessage(error)}`, "error");
  }
}

async function loadCatalog(event) {
  event?.preventDefault();
  const query = new URLSearchParams();
  for (const [name, value] of new FormData(form).entries()) {
    if (typeof value === "string" && value.trim()) query.set(name, value.trim());
  }
  results.replaceChildren();
  setStatus(status, "Cargando catálogo…");
  try {
    const queryString = query.toString();
    const response = await api.get(`/contenidos/catalogo${queryString ? `?${queryString}` : ""}`);
    renderContent(Array.isArray(response?.datos) ? response.datos : []);
  } catch (error) {
    setStatus(status, getApiMessage(error), "error");
  }
}

if (session) {
  proposalToggle.hidden = false;
  proposalToggle.addEventListener("click", () => {
    openFormModal({ title: "Proponer contenido", form: proposalForm });
  });
  proposalForm.querySelector('[name="anio"]').value = String(new Date().getFullYear());
  proposalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = proposalForm.querySelector('[type="submit"]');
    const proposalStatus = document.querySelector("#proposal-status");
    const values = new FormData(proposalForm);
    const optional = (name) => String(values.get(name) || "").trim() || null;
    const body = {
      titulo: String(values.get("titulo")).trim(),
      descripcion: String(values.get("descripcion")).trim(),
      anio: Number(values.get("anio")),
      tipo: String(values.get("tipo")),
      categoria_id: Number(values.get("categoria_id")),
      director: optional("director"),
      url_imagen: optional("url_imagen"),
      url_trailer: optional("url_trailer")
    };
    submit.disabled = true;
    setStatus(proposalStatus, "Enviando propuesta…");
    try {
      const response = await api.post("/propuestas", body);
      proposalForm.reset();
      proposalForm.querySelector('[name="anio"]').value = String(new Date().getFullYear());
      proposalStatus.replaceChildren(
        proposalStatusBadge(response?.datos?.estadoActual),
        document.createTextNode(` ${response?.datos?.mensajeInformativo || response?.mensaje || "La propuesta fue enviada para revisión."}`)
      );
      showNotice({
        title: "Propuesta recibida",
        message: response?.mensaje || "El contenido se envió para revisión administrativa.",
        tone: "success"
      });
    } catch (error) {
      setStatus(proposalStatus, getApiMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });
}

form.addEventListener("submit", loadCatalog);
form.addEventListener("reset", () => window.setTimeout(() => loadCatalog(), 0));
await loadCategories();
await loadCatalog();