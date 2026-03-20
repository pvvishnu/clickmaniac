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
const defaultTransitionPreset = "cinema";

let allPhotos = [];
let activeFilter = "All";
let autoThemeInterval = null;
let lookbookMode = false;

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
loadPhotos();
