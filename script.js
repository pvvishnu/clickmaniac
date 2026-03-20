const galleryGrid = document.getElementById("galleryGrid");
const filtersWrap = document.getElementById("filters");
const galleryViewport = document.getElementById("galleryViewport");
const resetCanvasBtn = document.getElementById("resetCanvasBtn");
const fullscreenCanvasBtn = document.getElementById("fullscreenCanvasBtn");

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
let orbitalAnimationFrame = 0;

const watchGridConfig = {
  width: 3600,
  height: 2600,
  radiusStepX: 320,
  radiusStepY: 270,
  minScale: 0.82,
  maxScale: 1.45,
  maxPanX: 560,
  maxPanY: 460,
  minTiles: 28,
  baseTileSize: 220
};

const watchGridState = {
  currentX: 0,
  currentY: 0,
  targetX: 0,
  targetY: 0,
  currentScale: 0.96,
  targetScale: 0.96,
  currentRotation: 0,
  targetRotation: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, factor) {
  return from + ((to - from) * factor);
}

function updateGridTransform() {
  if (!galleryGrid) {
    return;
  }

  galleryGrid.style.setProperty("--pan-x", `${watchGridState.currentX}px`);
  galleryGrid.style.setProperty("--pan-y", `${watchGridState.currentY}px`);
  galleryGrid.style.setProperty("--grid-scale", String(watchGridState.currentScale));
  galleryGrid.style.setProperty("--grid-rotation", `${watchGridState.currentRotation}deg`);
}

function animateGrid() {
  watchGridState.currentX = lerp(watchGridState.currentX, watchGridState.targetX, 0.12);
  watchGridState.currentY = lerp(watchGridState.currentY, watchGridState.targetY, 0.12);
  watchGridState.currentScale = lerp(watchGridState.currentScale, watchGridState.targetScale, 0.1);
  watchGridState.currentRotation = lerp(watchGridState.currentRotation, watchGridState.targetRotation, 0.1);
  updateGridTransform();
  orbitalAnimationFrame = window.requestAnimationFrame(animateGrid);
}

function resetGridView() {
  watchGridState.targetX = 0;
  watchGridState.targetY = 0;
  watchGridState.targetScale = 0.96;
  watchGridState.targetRotation = 0;
}

function computeWatchGridPosition(index) {
  if (index === 0) {
    return { x: 0, y: 0 };
  }

  let remaining = index;
  let ring = 1;

  while (remaining > (6 * ring)) {
    remaining -= (6 * ring);
    ring += 1;
  }

  const angle = ((Math.PI * 2) * (remaining - 1)) / (6 * ring);
  const x = Math.cos(angle) * ring * watchGridConfig.radiusStepX;
  const y = Math.sin(angle) * ring * watchGridConfig.radiusStepY;

  return {
    x: x + (((index * 37) % 40) - 20),
    y: y + (((index * 53) % 44) - 22)
  };
}

function buildWatchGridTiles(photos) {
  if (photos.length === 0) {
    return [];
  }

  const count = Math.max(photos.length, watchGridConfig.minTiles);
  return Array.from({ length: count }, (_, index) => photos[index % photos.length]);
}

async function toggleFullscreenCanvas() {
  if (!galleryViewport || !document.fullscreenEnabled) {
    return;
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await galleryViewport.requestFullscreen();
}

function initInfiniteCanvas() {
  if (!galleryViewport || !galleryGrid || infiniteCanvasReady) {
    return;
  }

  infiniteCanvasReady = true;
  galleryGrid.classList.add("watch-grid");
  galleryGrid.style.width = `${watchGridConfig.width}px`;
  galleryGrid.style.height = `${watchGridConfig.height}px`;
  updateGridTransform();
  orbitalAnimationFrame = window.requestAnimationFrame(animateGrid);

  galleryViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target.closest("button, a, input, textarea, label")) {
      return;
    }

    watchGridState.dragging = true;
    watchGridState.dragStartX = event.clientX;
    watchGridState.dragStartY = event.clientY;
    watchGridState.dragOriginX = watchGridState.targetX;
    watchGridState.dragOriginY = watchGridState.targetY;
    galleryViewport.classList.add("panning");
  });

  window.addEventListener("pointermove", (event) => {
    if (watchGridState.dragging) {
      const deltaX = event.clientX - watchGridState.dragStartX;
      const deltaY = event.clientY - watchGridState.dragStartY;
      watchGridState.targetX = clamp(watchGridState.dragOriginX + deltaX, -watchGridConfig.maxPanX, watchGridConfig.maxPanX);
      watchGridState.targetY = clamp(watchGridState.dragOriginY + deltaY, -watchGridConfig.maxPanY, watchGridConfig.maxPanY);
      watchGridState.targetRotation = clamp(watchGridState.targetX / 90, -9, 9);
      return;
    }

    const rect = galleryViewport.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    watchGridState.targetX = clamp(-normalizedX * 180, -watchGridConfig.maxPanX, watchGridConfig.maxPanX);
    watchGridState.targetY = clamp(-normalizedY * 130, -watchGridConfig.maxPanY, watchGridConfig.maxPanY);
    watchGridState.targetRotation = clamp(normalizedX * 4.5, -9, 9);
  });

  window.addEventListener("pointerup", () => {
    if (!watchGridState.dragging) {
      return;
    }

    watchGridState.dragging = false;
    galleryViewport.classList.remove("panning");
  });

  galleryViewport.addEventListener("mouseleave", () => {
    if (watchGridState.dragging) {
      return;
    }

    watchGridState.targetX = 0;
    watchGridState.targetY = 0;
    watchGridState.targetRotation = 0;
  });

  galleryViewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.95 : 1.05;
    watchGridState.targetScale = clamp(
      watchGridState.targetScale * factor,
      watchGridConfig.minScale,
      watchGridConfig.maxScale
    );
  }, { passive: false });

  if (resetCanvasBtn) {
    resetCanvasBtn.addEventListener("click", resetGridView);
  }

  if (fullscreenCanvasBtn) {
    if (!document.fullscreenEnabled) {
      fullscreenCanvasBtn.hidden = true;
    }

    fullscreenCanvasBtn.addEventListener("click", toggleFullscreenCanvas);
    document.addEventListener("fullscreenchange", () => {
      fullscreenCanvasBtn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
    });
    fullscreenCanvasBtn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
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
  galleryGrid.classList.remove("lookbook-mode", "infinite-canvas");
  galleryGrid.classList.add("watch-grid");
  const gridTiles = buildWatchGridTiles(filtered);

  gridTiles.forEach((photo, index) => {
    const card = document.createElement("article");
    const cardId = `photo-tile-${index + 1}`;
    const position = computeWatchGridPosition(index);
    const tileSize = watchGridConfig.baseTileSize - Math.min(70, Math.floor(index / 6) * 10);
    card.className = "photo-card";
    card.id = cardId;
    card.style.left = `${position.x}px`;
    card.style.top = `${position.y}px`;
    card.style.setProperty("--tile-size", `${Math.max(138, tileSize)}px`);

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

  updateGridTransform();
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
