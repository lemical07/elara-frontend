import { getSession, initShell } from "../components/shell.js";
import { closeModal, confirmAction, openFormModal, showNotice } from "../components/modal.js";
import { api, getApiMessage } from "../services/api.js";
import { element, formatContentType, formatDate, safeImageUrl, setStatus } from "../utils/dom.js";

await initShell();

const contentId = new URLSearchParams(window.location.search).get("id");
const detail = document.querySelector("#content-detail");
const detailStatus = document.querySelector("#detail-status");
const reviewsList = document.querySelector("#reviews-list");
const reviewsStatus = document.querySelector("#reviews-status");
const reviewFormArea = document.querySelector("#review-form-area");

function renderDetail(item) {
  detail.replaceChildren();
  const panel = element("article", { className: "detail-panel panel" });
  const poster = element("div", { className: "detail-poster" });
  const imageUrl = safeImageUrl(item.urlImagen);
  if (imageUrl) {
    const image = element("img", { attrs: { src: imageUrl, alt: `Imagen de ${item.titulo}`, loading: "lazy" } });
    poster.append(image);
  } else {
    poster.append(element("span", { className: "poster-monogram", text: (item.titulo || "E").slice(0, 1).toUpperCase(), attrs: { "aria-hidden": "true" } }));
  }
  const body = element("div", { className: "detail-copy" });
  body.append(element("span", { className: "type-chip", text: formatContentType(item.tipo) }));
  body.append(element("p", { className: "title-card__category", text: `${item.categoria || "Sin categoría"} · ${item.anio ?? ""}` }));
  body.append(element("h1", { text: item.titulo || "Título sin nombre" }));
  if (item.director) body.append(element("p", { className: "detail-director", text: `Director · ${item.director}` }));
  if (item.descripcion) body.append(element("p", { className: "detail-description", text: item.descripcion }));
  if (item.urlTrailer && safeImageUrl(item.urlTrailer)) {
    const trailer = element("a", { className: "button button--quiet", text: "Ver tráiler", attrs: { href: safeImageUrl(item.urlTrailer), target: "_blank", rel: "noopener noreferrer" } });
    body.append(trailer);
  }
  if (Array.isArray(item.personajes) && item.personajes.length) {
    const characters = element("div", { className: "character-block" });
    characters.append(element("h2", { text: "Personajes" }));
    const list = element("ul", { className: "character-list" });
    for (const character of item.personajes) {
      list.append(element("li", { text: `${character.nombre} · ${character.tipo}` }));
    }
    characters.append(list);
    body.append(characters);
  }
  panel.append(poster, body);
  detail.append(panel);
  document.title = `${item.titulo} — ELARA`;
}

function createReviewForm(review = null, openImmediately = false) {
  reviewFormArea.replaceChildren();
  const form = element("form", { className: "panel review-form" });
  form.append(element("h3", { text: review ? "Editar tu reseña" : "Comparte tu reseña" }));
  const grid = element("div", { className: "form-grid form-grid--two" });
  if (!getSession()) {
    const guestName = element("label", { text: "Tu nombre" });
    const nameInput = element("input", { attrs: { name: "nombre_visitante", maxlength: "60", autocomplete: "name" } });
    if (review?.autor?.nombre) nameInput.value = review.autor.nombre;
    guestName.append(nameInput);
    grid.append(guestName);
  }
  const titleLabel = element("label", { text: "Título de la reseña" });
  const titleInput = element("input", { attrs: { name: "titulo", maxlength: "25", required: true } });
  titleInput.value = review?.titulo || "";
  titleLabel.append(titleInput);
  const ratingLabel = element("label", { text: "Calificación (1–10)" });
  const ratingInput = element("input", { attrs: { name: "calificacion", type: "number", min: "1", max: "10", step: "1", required: true } });
  ratingInput.value = review ? String(review.calificacion) : "";
  ratingLabel.append(ratingInput);
  grid.append(titleLabel, ratingLabel);
  form.append(grid);
  const commentLabel = element("label", { text: "Comentario (opcional)" });
  const commentInput = element("textarea", { attrs: { name: "comentario", rows: "4" } });
  commentInput.value = review?.comentario || "";
  commentLabel.append(commentInput);
  form.append(commentLabel);
  const actions = element("div", { className: "form-actions" });
  const submit = element("button", { className: "button button--gold", text: review ? "Guardar cambios" : "Publicar reseña", attrs: { type: "submit" } });
  actions.append(submit);
  if (review) {
    const cancel = element("button", { className: "button button--quiet", text: "Cancelar", attrs: { type: "button" } });
    cancel.addEventListener("click", closeModal);
    actions.append(cancel);
  }
  form.append(actions);
  const formStatus = element("div", { className: "form-status", attrs: { "aria-live": "polite" } });
  form.append(formStatus);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const body = {
      titulo: String(formData.get("titulo")).trim(),
      comentario: String(formData.get("comentario") || "").trim() || null,
      calificacion: Number(formData.get("calificacion"))
    };
    if (!review) {
      body.contenido_id = Number(contentId);
      if (!getSession()) body.nombre_visitante = String(formData.get("nombre_visitante") || "").trim();
    }
    submit.disabled = true;
    setStatus(formStatus, review ? "Guardando cambios…" : "Publicando reseña…");
    try {
      if (review) await api.put(`/reviews/${review.id}`, body);
      else await api.post("/reviews", body);
      await closeModal();
      await loadReviews();
      showNotice({
        title: review ? "Reseña actualizada" : "Reseña publicada",
        message: review ? "Los cambios se guardaron correctamente." : "Tu reseña ya está disponible para la comunidad.",
        tone: "success"
      });
    } catch (error) {
      setStatus(formStatus, getApiMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });
  const trigger = element("button", {
    className: review ? "button button--quiet" : "button button--gold",
    text: review ? "Editar mi reseña" : "Escribir una reseña",
    attrs: { type: "button" }
  });
  const stash = element("div");
  stash.hidden = true;
  stash.append(form);
  trigger.addEventListener("click", () => {
    openFormModal({ title: review ? "Editar reseña" : "Crear reseña", form });
  });
  reviewFormArea.append(trigger, stash);
  if (openImmediately) openFormModal({ title: "Editar reseña", form });
}

function createReactionButton(kind, review, currentReaction, totals, isOwnReview) {
  const active = currentReaction?.tipo === kind;
  const button = element("button", {
    className: `reaction-button${active ? " is-active" : ""}`,
    attrs: {
      type: "button",
      "aria-pressed": String(active),
      "aria-label": `${kind === "like" ? "Me gusta" : "No me gusta"}: ${kind === "like" ? totals.total_likes : totals.total_dislikes}`
    }
  });
  const icon = element("img", {
    attrs: {
      src: `../assets/icons/${kind}.png`,
      alt: "",
      width: "24",
      height: "24"
    }
  });
  button.append(icon, element("span", { text: String(kind === "like" ? totals.total_likes : totals.total_dislikes) }));
  if (isOwnReview && getSession()) button.disabled = true;
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (active) await api.delete(`/reacciones/${review.id}`);
      else await api.post("/reacciones", { review_id: review.id, tipo: kind });
      await loadReviews();
    } catch (error) {
      setStatus(reviewsStatus, getApiMessage(error), "error");
      button.disabled = false;
    }
  });
  return button;
}

function renderReviews(reviews, ownReviews, ownReactions, totalsByReview) {
  reviewsList.replaceChildren();
  const ownReviewIds = new Set(ownReviews.map((review) => Number(review.id)));
  const ownReactionByReview = new Map(ownReactions.map((reaction) => [Number(reaction.review_id), reaction]));
  const visibleOwnReview = reviews.find((review) => ownReviewIds.has(Number(review.id)));
  createReviewForm(visibleOwnReview || null);

  if (!reviews.length) {
    setStatus(reviewsStatus, "Todavía no hay reseñas para este título.");
    return;
  }
  setStatus(reviewsStatus, "");
  for (const review of reviews) {
    const card = element("article", { className: "review-card" });
    const heading = element("div", { className: "review-card__heading" });
    const title = element("div");
    title.append(element("h3", { text: review.titulo || "Reseña" }));
    title.append(element("p", {
      className: "review-meta",
      text: `${[review.autor?.nombre, review.autor?.apellido].filter(Boolean).join(" ") || "Visitante"}${review.creado_en ? ` · ${formatDate(review.creado_en)}` : ""}`
    }));
    heading.append(title, element("span", { className: "rating-badge", text: `${review.calificacion}/10` }));
    card.append(heading);
    if (review.comentario) card.append(element("p", { className: "review-comment", text: review.comentario }));
    const totals = totalsByReview.get(Number(review.id)) || { total_likes: 0, total_dislikes: 0 };
    const reaction = ownReactionByReview.get(Number(review.id));
    const footer = element("div", { className: "review-card__footer" });
    const isOwnReview = ownReviewIds.has(Number(review.id));
    footer.append(
      createReactionButton("like", review, reaction, totals, isOwnReview),
      createReactionButton("dislike", review, reaction, totals, isOwnReview)
    );
    if (ownReviewIds.has(Number(review.id))) {
      const ownerActions = element("div", { className: "inline-actions" });
      const edit = element("button", { className: "text-button", text: "Editar", attrs: { type: "button" } });
      edit.addEventListener("click", () => createReviewForm(review, true));
      const remove = element("button", { className: "text-button text-button--danger", text: "Eliminar", attrs: { type: "button" } });
      remove.addEventListener("click", async () => {
        const confirmed = await confirmAction({
          title: "Eliminar reseña",
          message: "¿Eliminar tu reseña? Esta acción no se puede deshacer.",
          confirmText: "Eliminar"
        });
        if (!confirmed) return;
        remove.disabled = true;
        try {
          await api.delete(`/reviews/${review.id}`);
          await closeModal();
          await loadReviews();
          showNotice({ title: "Reseña eliminada", message: "Tu reseña se eliminó correctamente.", tone: "success" });
        } catch (error) {
          setStatus(reviewsStatus, getApiMessage(error), "error");
          remove.disabled = false;
        }
      });
      ownerActions.append(edit, remove);
      footer.append(ownerActions);
    }
    card.append(footer);
    reviewsList.append(card);
  }
}

async function loadReviews() {
  setStatus(reviewsStatus, "Cargando reseñas…");
  try {
    const ownResponse = await api.get("/reviews/mis-reviews");
    const ownReviews = Array.isArray(ownResponse?.datos) ? ownResponse.datos : [];
    const reactionResponse = await api.get("/reacciones/mis-reacciones");
    const ownReactions = Array.isArray(reactionResponse?.datos) ? reactionResponse.datos : [];
    const listResponse = await api.get(`/reviews/contenido/${encodeURIComponent(contentId)}`);
    const reviews = Array.isArray(listResponse?.datos) ? listResponse.datos : [];
    const totalsEntries = await Promise.all(reviews.map(async (review) => {
      const response = await api.get(`/reacciones/review/${review.id}`);
      return [Number(review.id), response?.datos || { total_likes: 0, total_dislikes: 0 }];
    }));
    renderReviews(reviews, ownReviews, ownReactions, new Map(totalsEntries));
  } catch (error) {
    setStatus(reviewsStatus, getApiMessage(error), "error");
  }
}

async function loadDetail() {
  if (!contentId || !/^\d+$/.test(contentId) || Number(contentId) < 1) {
    setStatus(detailStatus, "No se indicó un título válido.", "error");
    return;
  }
  setStatus(detailStatus, "Cargando detalle…");
  try {
    const response = await api.get(`/contenidos/${encodeURIComponent(contentId)}`);
    if (!response?.datos) throw new Error("No se encontró el detalle solicitado.");
    setStatus(detailStatus, "");
    renderDetail(response.datos);
    await loadReviews();
  } catch (error) {
    setStatus(detailStatus, getApiMessage(error), "error");
  }
}

await loadDetail();