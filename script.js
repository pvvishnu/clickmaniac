const galleryGrid = document.getElementById("galleryGrid");
const filtersWrap = document.getElementById("filters");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxMeta = document.getElementById("lightboxMeta");
const closeLightbox = document.getElementById("closeLightbox");
const themePicker = document.getElementById("themePicker");
const themeLine = document.getElementById("themeLine");
const autoThemeToggle = document.getElementById("autoTheme");
const layoutToggle = document.getElementById("layoutToggle");
const themeVeil = document.getElementById("themeVeil");
const transitionPreset = document.getElementById("transitionPreset");
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

const themeLabels = {
  "editorial-burn": "Editorial Burn",
  "mono-noir": "Mono Noir",
  "sunset-pop": "Sunset Pop"
};

const themeVeilTones = {
  "editorial-burn": ["#f06b2f", "#ffd25f"],
  "mono-noir": ["#f3f3f3", "#8f97a8"],
  "sunset-pop": ["#ff6d50", "#ffd97a"]
};

const defaultTheme = "editorial-burn";
const autoThemeStorageKey = "portfolio-auto-theme";
const layoutStorageKey = "portfolio-lookbook";
const transitionPresetStorageKey = "portfolio-transition-preset";
const commentsStorageKey = "portfolio-comments-v1";
const defaultTransitionPreset = "cinema";

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
  theme: "light",
  lang: "en"
};

let allPhotos = [];
let activeFilter = "All";
let autoThemeInterval = null;
let lookbookMode = false;
let viewerComments = [];

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
  const preset = document.body.dataset.veilStyle || defaultTransitionPreset;
  return preset === "minimal" ? 540 : 1120;
}

function getTransitionSwapDelay() {
  const preset = document.body.dataset.veilStyle || defaultTransitionPreset;
  return preset === "minimal" ? 110 : 190;
}

function applyTransitionPreset(presetName) {
  const resolvedPreset = presetName === "minimal" || presetName === "cinema"
    ? presetName
    : defaultTransitionPreset;

  document.body.dataset.veilStyle = resolvedPreset;
  localStorage.setItem(transitionPresetStorageKey, resolvedPreset);

  if (transitionPreset) {
    transitionPreset.value = resolvedPreset;
  }
}

function getThemeByTime() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "sunset-pop";
  }

  if (hour >= 12 && hour < 19) {
    return "editorial-burn";
  }

  return "mono-noir";
}

function applyTheme(themeName) {
  const selectedTheme = themeLabels[themeName] ? themeName : defaultTheme;
  document.body.dataset.theme = selectedTheme;

  if (themePicker) {
    themePicker.value = selectedTheme;
  }

  if (themeLine) {
    themeLine.textContent = `Current mood: ${themeLabels[selectedTheme]}`;
  }

  localStorage.setItem("portfolio-theme", selectedTheme);
}

function setVeilTone(themeName) {
  if (!themeVeil) {
    return;
  }

  const tones = themeVeilTones[themeName] || themeVeilTones[defaultTheme];
  themeVeil.style.setProperty("--veil-a", tones[0]);
  themeVeil.style.setProperty("--veil-b", tones[1]);
}

function transitionTheme(themeName) {
  const selectedTheme = themeLabels[themeName] ? themeName : defaultTheme;
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
  transitionTheme(getThemeByTime());
  autoThemeInterval = window.setInterval(() => {
    transitionTheme(getThemeByTime());
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
  const savedTheme = localStorage.getItem("portfolio-theme") || defaultTheme;
  const autoThemeEnabled = localStorage.getItem(autoThemeStorageKey) === "on";
  const savedTransitionPreset = localStorage.getItem(transitionPresetStorageKey) || defaultTransitionPreset;

  applyTransitionPreset(savedTransitionPreset);

  if (autoThemeToggle) {
    autoThemeToggle.checked = autoThemeEnabled;
  }

  if (autoThemeEnabled) {
    startAutoThemeClock();
  } else {
    applyTheme(savedTheme);
    setVeilTone(savedTheme);
  }

  if (themePicker) {
    themePicker.addEventListener("change", (event) => {
      if (autoThemeToggle && autoThemeToggle.checked) {
        autoThemeToggle.checked = false;
        localStorage.setItem(autoThemeStorageKey, "off");
        stopAutoThemeClock();
      }

      transitionTheme(event.target.value);
    });
  }

  if (autoThemeToggle) {
    autoThemeToggle.addEventListener("change", (event) => {
      const enabled = event.target.checked;
      localStorage.setItem(autoThemeStorageKey, enabled ? "on" : "off");

      if (enabled) {
        startAutoThemeClock();
        return;
      }

      stopAutoThemeClock();
      transitionTheme(themePicker ? themePicker.value : savedTheme);
    });
  }

  if (transitionPreset) {
    transitionPreset.addEventListener("change", (event) => {
      applyTransitionPreset(event.target.value);
    });
  }

  const savedLayout = localStorage.getItem(layoutStorageKey) === "on";
  applyLookbookMode(savedLayout);

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
  filtered.forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";
    card.style.animationDelay = `${index * 60}ms`;

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

    card.querySelector("button").addEventListener("click", () => openLightbox(photo));
    galleryGrid.appendChild(card);
  });
}

function openLightbox(photo) {
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt || photo.title || "Portfolio photo";
  lightboxTitle.textContent = photo.title || "Untitled";

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
