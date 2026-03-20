const galleryGrid = document.getElementById("galleryGrid");
const filtersWrap = document.getElementById("filters");
const galleryViewport = document.getElementById("galleryViewport");
const resetCanvasBtn = document.getElementById("resetCanvasBtn");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxMeta = document.getElementById("lightboxMeta");
const lightboxShareBtn = document.getElementById("lightboxShareBtn");
const closeLightbox = document.getElementById("closeLightbox");
const layoutToggle = document.getElementById("layoutToggle");
const themeVeil = document.getElementById("themeVeil");
const shareButtons = document.querySelectorAll("[data-share-platform]");
const nativeShareBtn = document.getElementById("nativeShareBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const shareStatus = document.getElementById("shareStatus");
const commentForm = document.getElementById("commentForm");
const commentName = document.getElementById("commentName");
const commentMessage = document.getElementById("commentMessage");
const commentsList = document.getElementById("commentsList");
const commentStatus = document.getElementById("commentStatus");
const giscusThread = document.getElementById("giscusThread");
const localCommentsFallback = document.getElementById("localCommentsFallback");

const defaultTheme = "studio";
const layoutStorageKey = "portfolio-lookbook";
const commentsStorageKey = "portfolio-comments-v1";

const giscusConfig = {
  repo: "pvvishnu/clickmaniac",
  repoId: "R_kgDORryDpQ",
  category: "General",
  categoryId: "DIC_kwDORryDpc4C44X3",
  mapping: "pathname",
  strict: "0",
  reactionsEnabled: "1",
  emitMetadata: "0",
  inputPosition: "bottom",
  theme: "dark_dimmed",
  lang: "en"
};

let allPhotos = [];
let activeFilter = "All";
let autoThemeInterval = null;
let lookbookMode = false;
let viewerComments = [];
let activeLightboxPhoto = null;
let activeLightboxCardId = "";
let infiniteCanvasReady = false;

const canvasConfig = {
  width: 4200,
  height: 2600,
  minScale: 0.45,
  maxScale: 1.9,
  edgePadding: 120
};

const canvasState = {
  x: 0,
  y: 0,
  scale: 0.8,
  panning: false,
  startX: 0,
  startY: 0
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampCanvasPosition() {
  if (!galleryViewport) {
    return;
  }

  const scaledWidth = canvasConfig.width * canvasState.scale;
  const scaledHeight = canvasConfig.height * canvasState.scale;
  const minX = galleryViewport.clientWidth - scaledWidth - canvasConfig.edgePadding;
  const maxX = canvasConfig.edgePadding;
  const minY = galleryViewport.clientHeight - scaledHeight - canvasConfig.edgePadding;
  const maxY = canvasConfig.edgePadding;

  canvasState.x = clamp(canvasState.x, minX, maxX);
  canvasState.y = clamp(canvasState.y, minY, maxY);
}

function applyCanvasTransform() {
  if (!galleryGrid) {
    return;
  }

  galleryGrid.style.transform = `translate3d(${canvasState.x}px, ${canvasState.y}px, 0) scale(${canvasState.scale})`;
}

function centerInfiniteCanvas() {
  if (!galleryViewport) {
    return;
  }

  canvasState.x = (galleryViewport.clientWidth - (canvasConfig.width * canvasState.scale)) / 2;
  canvasState.y = (galleryViewport.clientHeight - (canvasConfig.height * canvasState.scale)) / 2;
  clampCanvasPosition();
  applyCanvasTransform();
}

function computeCanvasCardPosition(index) {
  const columns = 6;
  const baseX = 220;
  const baseY = 160;
  const gapX = 610;
  const gapY = 430;
  const col = index % columns;
  const row = Math.floor(index / columns);
  const stagger = row % 2 === 0 ? 0 : 120;
  const jitterX = ((index * 97) % 80) - 40;
  const jitterY = ((index * 83) % 70) - 35;

  return {
    x: baseX + (col * gapX) + stagger + jitterX,
    y: baseY + (row * gapY) + jitterY
  };
}

function initInfiniteCanvas() {
  if (!galleryViewport || !galleryGrid || infiniteCanvasReady) {
    return;
  }

  infiniteCanvasReady = true;
  galleryGrid.classList.add("infinite-canvas");
  galleryGrid.style.width = `${canvasConfig.width}px`;
  galleryGrid.style.height = `${canvasConfig.height}px`;
  centerInfiniteCanvas();

  galleryViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target.closest("button, a, input, textarea, label")) {
      return;
    }

    canvasState.panning = true;
    canvasState.startX = event.clientX - canvasState.x;
    canvasState.startY = event.clientY - canvasState.y;
    galleryViewport.classList.add("panning");
  });

  window.addEventListener("pointermove", (event) => {
    if (!canvasState.panning) {
      return;
    }

    canvasState.x = event.clientX - canvasState.startX;
    canvasState.y = event.clientY - canvasState.startY;
    clampCanvasPosition();
    applyCanvasTransform();
  });

  window.addEventListener("pointerup", () => {
    if (!canvasState.panning) {
      return;
    }

    canvasState.panning = false;
    galleryViewport.classList.remove("panning");
  });

  galleryViewport.addEventListener("wheel", (event) => {
    event.preventDefault();

    const previousScale = canvasState.scale;
    const zoomStep = event.deltaY > 0 ? 0.93 : 1.07;
    const nextScale = clamp(previousScale * zoomStep, canvasConfig.minScale, canvasConfig.maxScale);

    if (nextScale === previousScale) {
      return;
    }

    const rect = galleryViewport.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - canvasState.x) / previousScale;
    const worldY = (pointerY - canvasState.y) / previousScale;

    canvasState.scale = nextScale;
    canvasState.x = pointerX - (worldX * nextScale);
    canvasState.y = pointerY - (worldY * nextScale);
    clampCanvasPosition();
    applyCanvasTransform();
  }, { passive: false });

  window.addEventListener("resize", () => {
    clampCanvasPosition();
    applyCanvasTransform();
  });

  if (resetCanvasBtn) {
    resetCanvasBtn.addEventListener("click", centerInfiniteCanvas);
  }
}

function hasGiscusConfig() {
  return Boolean(
    giscusConfig.repo &&
    giscusConfig.repoId &&
    giscusConfig.category &&
    giscusConfig.categoryId
  );
}

function initGiscusThread() {
  if (!giscusThread) {
    return false;
  }

  if (!hasGiscusConfig()) {
    return false;
  }

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", giscusConfig.repo);
  script.setAttribute("data-repo-id", giscusConfig.repoId);
  script.setAttribute("data-category", giscusConfig.category);
  script.setAttribute("data-category-id", giscusConfig.categoryId);
  script.setAttribute("data-mapping", giscusConfig.mapping);
  script.setAttribute("data-strict", giscusConfig.strict);
  script.setAttribute("data-reactions-enabled", giscusConfig.reactionsEnabled);
  script.setAttribute("data-emit-metadata", giscusConfig.emitMetadata);
  script.setAttribute("data-input-position", giscusConfig.inputPosition);
  script.setAttribute("data-theme", giscusConfig.theme);
  script.setAttribute("data-lang", giscusConfig.lang);
  script.setAttribute("data-loading", "lazy");

  giscusThread.innerHTML = "";
  giscusThread.appendChild(script);

  if (localCommentsFallback) {
    localCommentsFallback.hidden = true;
  }

  return true;
}

function updateStatus(target, message) {
  if (target) {
    target.textContent = message;
  }
}

function buildShareUrl(platform) {
  const pageUrl = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(document.title);

  if (platform === "x") {
    return `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
  }

  if (platform === "linkedin") {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;
  }

  if (platform === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
  }

  if (platform === "whatsapp") {
    return `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
  }

  return "";
}

async function copyPortfolioLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    updateStatus(shareStatus, "Link copied. Thanks for sharing.");
  } catch (error) {
    updateStatus(shareStatus, "Could not copy link automatically.");
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    return false;
  }
}

function buildPhotoSharePayload(photo, cardId) {
  const photoTitle = photo.title || "Untitled";
  const url = new URL(window.location.href);
  url.hash = cardId;

  return {
    title: `${photoTitle} | ${document.title}`,
    text: `Check out this photo: ${photoTitle}`,
    url: url.toString()
  };
}

async function sharePhoto(photo, cardId) {
  const payload = buildPhotoSharePayload(photo, cardId);

  if (navigator.share) {
    try {
      await navigator.share(payload);
      updateStatus(shareStatus, `Shared ${photo.title || "photo"}.`);
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    }
  }

  const copied = await copyText(payload.url);
  updateStatus(
    shareStatus,
    copied
      ? `Share link copied for ${photo.title || "photo"}.`
      : "Could not copy this photo link automatically."
  );
}

function initShareOptions() {
  shareButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const platform = button.getAttribute("data-share-platform");
      const shareUrl = buildShareUrl(platform);

      if (!shareUrl) {
        return;
      }

      window.open(shareUrl, "_blank", "noopener,noreferrer");
      updateStatus(shareStatus, "Share window opened.");
    });
  });

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", copyPortfolioLink);
  }

  if (nativeShareBtn && navigator.share) {
    nativeShareBtn.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: document.title,
          text: "Take a look at this photography portfolio.",
          url: window.location.href
        });
        updateStatus(shareStatus, "Shared successfully.");
      } catch (error) {
        if (error && error.name !== "AbortError") {
          updateStatus(shareStatus, "Share action was not completed.");
        }
      }
    });
  } else if (nativeShareBtn) {
    nativeShareBtn.hidden = true;
  }
}

function readStoredComments() {
  try {
    const parsed = JSON.parse(localStorage.getItem(commentsStorageKey) || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => (
      typeof entry === "object" &&
      typeof entry.name === "string" &&
      typeof entry.message === "string" &&
      typeof entry.createdAt === "string"
    ));
  } catch (error) {
    return [];
  }
}

function saveComments() {
  localStorage.setItem(commentsStorageKey, JSON.stringify(viewerComments));
}

function renderComments() {
  if (!commentsList) {
    return;
  }

  commentsList.innerHTML = "";

  if (viewerComments.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "comment-empty";
    emptyState.textContent = "No comments yet. Be the first to post one.";
    commentsList.appendChild(emptyState);
    return;
  }

  viewerComments.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "comment-item";

    const header = document.createElement("div");
    header.className = "comment-meta";

    const author = document.createElement("strong");
    author.textContent = entry.name;

    const timestamp = document.createElement("span");
    timestamp.textContent = new Date(entry.createdAt).toLocaleString();

    const body = document.createElement("p");
    body.className = "comment-body";
    body.textContent = entry.message;

    header.appendChild(author);
    header.appendChild(timestamp);
    item.appendChild(header);
    item.appendChild(body);
    commentsList.appendChild(item);
  });
}

function initComments() {
  if (initGiscusThread()) {
    return;
  }

  if (commentStatus) {
    updateStatus(commentStatus, "Global comments are available after adding Giscus repo and category IDs in script.js.");
  }

  viewerComments = readStoredComments();
  renderComments();

  if (!commentForm || !commentMessage) {
    return;
  }

  commentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nameValue = commentName && commentName.value.trim() ? commentName.value.trim() : "Anonymous";
    const messageValue = commentMessage.value.trim();

    if (messageValue.length < 3) {
      updateStatus(commentStatus, "Please write a slightly longer comment.");
      return;
    }

    viewerComments.unshift({
      name: nameValue.slice(0, 50),
      message: messageValue.slice(0, 500),
      createdAt: new Date().toISOString()
    });

    viewerComments = viewerComments.slice(0, 60);
    saveComments();
    renderComments();
    commentForm.reset();
    updateStatus(commentStatus, "Comment posted.");
  });
}

function getTransitionDuration() {
  return 720;
}

function getTransitionSwapDelay() {
  return 140;
}

function applyTheme(themeName) {
  const selectedTheme = themeName || defaultTheme;
  document.body.dataset.theme = selectedTheme;

  localStorage.setItem("portfolio-theme", selectedTheme);
}

function setVeilTone(themeName) {
  if (!themeVeil) {
    return;
  }

  themeVeil.style.setProperty("--veil-a", "#3b66ff");
  themeVeil.style.setProperty("--veil-b", "#61efca");
}

function transitionTheme(themeName) {
  const selectedTheme = themeName || defaultTheme;
  const currentTheme = document.body.dataset.theme || defaultTheme;

  if (currentTheme === selectedTheme) {
    applyTheme(selectedTheme);
    return;
  }

  setVeilTone(selectedTheme);
  document.body.classList.remove("theme-transitioning");
  void document.body.offsetWidth;
  document.body.classList.add("theme-transitioning");

  window.setTimeout(() => {
    applyTheme(selectedTheme);
  }, getTransitionSwapDelay());

  window.setTimeout(() => {
    document.body.classList.remove("theme-transitioning");
  }, getTransitionDuration() + 70);
}

function stopAutoThemeClock() {
  if (autoThemeInterval) {
    window.clearInterval(autoThemeInterval);
    autoThemeInterval = null;
  }
}

function startAutoThemeClock() {
  stopAutoThemeClock();
  transitionTheme(defaultTheme);
  autoThemeInterval = window.setInterval(() => {
    transitionTheme(defaultTheme);
  }, 300000);
}

function applyLookbookMode(isEnabled) {
  lookbookMode = Boolean(isEnabled);
  galleryGrid.classList.toggle("lookbook-mode", lookbookMode);

  if (layoutToggle) {
    layoutToggle.setAttribute("aria-pressed", String(lookbookMode));
    layoutToggle.textContent = `Lookbook Mode: ${lookbookMode ? "On" : "Off"}`;
  }

  localStorage.setItem(layoutStorageKey, lookbookMode ? "on" : "off");
}

function initTheme() {
  applyTheme(defaultTheme);
  setVeilTone(defaultTheme);
  initInfiniteCanvas();

  applyLookbookMode(false);

  if (layoutToggle) {
    layoutToggle.addEventListener("click", () => {
      applyLookbookMode(!lookbookMode);
      renderGallery(allPhotos, activeFilter);
    });
  }
}

async function loadPhotos() {
  try {
    const response = await fetch("data/photos.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load photos.json");
    }

    const data = await response.json();
    allPhotos = Array.isArray(data.photos) ? data.photos : [];
    renderFilters(allPhotos);
    renderGallery(allPhotos, activeFilter);
  } catch (error) {
    galleryGrid.innerHTML = `<p>Could not load gallery data. Check <strong>data/photos.json</strong>.</p>`;
    console.error(error);
  }
}

function renderFilters(photos) {
  const tags = new Set(["All"]);
  photos.forEach((photo) => {
    if (photo.category) {
      tags.add(photo.category);
    }
  });

  filtersWrap.innerHTML = "";
  [...tags].forEach((tag) => {
    const button = document.createElement("button");
    button.className = `filter-btn${tag === activeFilter ? " active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      activeFilter = tag;
      updateFilterButtons();
      renderGallery(allPhotos, activeFilter);
    });
    filtersWrap.appendChild(button);
  });
}

function updateFilterButtons() {
  [...filtersWrap.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.textContent === activeFilter);
  });
}

function renderGallery(photos, filter) {
  const filtered = filter === "All"
    ? photos
    : photos.filter((photo) => photo.category === filter);

  if (filtered.length === 0) {
    galleryGrid.innerHTML = "<p>No photos in this category yet.</p>";
    return;
  }

  galleryGrid.innerHTML = "";
  galleryGrid.classList.add("infinite-canvas");
  filtered.forEach((photo, index) => {
    const card = document.createElement("article");
    const cardId = `photo-${index + 1}`;
    const position = computeCanvasCardPosition(index);
    card.className = "photo-card";
    card.id = cardId;
    card.style.left = `${position.x}px`;
    card.style.top = `${position.y}px`;

    if (lookbookMode) {
      if (index % 7 === 0) {
        card.classList.add("feature-wide");
      } else if (index % 5 === 0) {
        card.classList.add("feature-tall");
      }
    }

    card.innerHTML = `
      <button aria-label="Open ${photo.title}">
        <img src="${photo.src}" alt="${photo.alt || photo.title}" loading="lazy" decoding="async" />
        <div class="card-meta">
          <p class="card-title">${photo.title || "Untitled"}</p>
          <p class="card-tag">${photo.category || "Uncategorized"}</p>
        </div>
      </button>
    `;

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "photo-share-btn";
    shareButton.textContent = "Share";
    shareButton.setAttribute("aria-label", `Share ${photo.title || "photo"}`);
    shareButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await sharePhoto(photo, cardId);
    });

    card.querySelector("button").addEventListener("click", () => openLightbox(photo, cardId));
    card.appendChild(shareButton);
    galleryGrid.appendChild(card);
  });

  applyCanvasTransform();
}

function openLightbox(photo, cardId) {
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt || photo.title || "Portfolio photo";
  lightboxTitle.textContent = photo.title || "Untitled";
  activeLightboxPhoto = photo;
  activeLightboxCardId = cardId || "";

  const metaParts = [photo.category, photo.location, photo.year].filter(Boolean);
  lightboxMeta.textContent = metaParts.join(" • ");

  lightbox.showModal();
}

function closeModal() {
  if (lightbox.open) {
    lightbox.close();
  }
}

closeLightbox.addEventListener("click", closeModal);
if (lightboxShareBtn) {
  lightboxShareBtn.addEventListener("click", async () => {
    if (!activeLightboxPhoto) {
      return;
    }

    await sharePhoto(activeLightboxPhoto, activeLightboxCardId || "photo-lightbox");
  });
}
lightbox.addEventListener("click", (event) => {
  const rect = lightbox.getBoundingClientRect();
  const insideDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!insideDialog) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

initTheme();
initShareOptions();
initComments();
loadPhotos();
