// ==============================
// DOM refs yey 
// ==============================
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");

const qInput = document.getElementById("q");
const clearBtn = document.getElementById("clear");
const onlyFavCheckbox = document.getElementById("onlyFav");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalSub = document.getElementById("modalSub");
const modalImg = document.getElementById("modalImg");
const metaYear = document.getElementById("metaYear");
const metaLink = document.getElementById("metaLink");
const metaTags = document.getElementById("metaTags");
const modalPalette = document.getElementById("modalPalette"); // ok als leeg
const favBtn = document.getElementById("favBtn");

const themeBtn = document.getElementById("themeToggle");
const hiContrastCheckbox = document.getElementById("hiContrast");

const sortBtns = Array.from(document.querySelectorAll(".seg-btn"));

// ==============================
// State
// ==============================
let data = [];
let filtered = [];
let currentItem = null;

let favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
let activeSort = "trending";

// ==============================
// Helpers
// ==============================
function safeText(v, fallback = "—") {
  return (v === null || v === undefined || v === "") ? fallback : String(v);
}

function safeHref(v) {
  if (!v || typeof v !== "string") return "#";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return "https://" + v;
}

function saveFavs() {
  localStorage.setItem("favorites", JSON.stringify(Array.from(favorites)));
}

function isFav(id) {
  return favorites.has(id);
}

function updateFavBtn() {
  if (!favBtn || !currentItem) return;
  favBtn.textContent = isFav(currentItem.id) ? "★" : "☆";
}

function toggleFavorite(id) {
  if (!id) return;
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavs();
  updateFavBtn();
  if (onlyFavCheckbox.checked) applyFilters();
}

// ==============================
// Theme + Contrast
// ==============================
function applyTheme(theme) {
  // verwacht: "dark" of "light"
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  if (themeBtn) {
    themeBtn.textContent = theme === "dark" ? "🌙 Dark" : "☀️ Light";
  }
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  applyTheme(saved || "dark");
}

function applyContrast(on) {
  document.documentElement.classList.toggle("hi-contrast", !!on);
  localStorage.setItem("hi_contrast", on ? "1" : "0");
}

function initContrast() {
  const saved = localStorage.getItem("hi_contrast") === "1";
  if (hiContrastCheckbox) hiContrastCheckbox.checked = saved;
  applyContrast(saved);
}

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

if (hiContrastCheckbox) {
  hiContrastCheckbox.addEventListener("change", () => {
    applyContrast(hiContrastCheckbox.checked);
  });
}

// ==============================
// Data load (GitHub Pages safe)
// ==============================
async function loadData() {
  const url = new URL("./data/paintings.json", import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} bij ${res.url}`);
  return await res.json();
}

// ==============================
// Filtering + sorting
// ==============================
function applySort() {
  const arr = filtered;

  if (activeSort === "trending") {
    arr.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  } else if (activeSort === "newest") {
    arr.sort((a, b) => (b.year || -Infinity) - (a.year || -Infinity));
  } else if (activeSort === "title") {
    arr.sort((a, b) => safeText(a.title, "").localeCompare(safeText(b.title, ""), "nl"));
  } else if (activeSort === "artist") {
    arr.sort((a, b) => safeText(a.artist, "").localeCompare(safeText(b.artist, ""), "nl"));
  }
}

function applyFilters() {
  const term = qInput.value.trim().toLowerCase();

  filtered = data.filter((item) => {
    const hay = [
      item.title,
      item.artist,
      (item.tags || []).join(" ")
    ].filter(Boolean).join(" ").toLowerCase();

    const matchSearch = !term || hay.includes(term);
    const matchFav = !onlyFavCheckbox.checked || isFav(item.id);

    return matchSearch && matchFav;
  });

  applySort();
  render();
}

// ==============================
// Render grid
// ==============================
function render() {
  grid.innerHTML = "";

  if (!filtered.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const item of filtered) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";

    const title = safeText(item.title);
    const artist = safeText(item.artist, "");
    const imgSrc = item.imageUrl || "";

    card.innerHTML = `
      <img src="${imgSrc}" alt="${title}" loading="lazy" />
      <div class="card-body">
        <div class="card-title">${title}</div>
        <div class="card-sub">${artist}</div>
      </div>
    `;

    card.addEventListener("click", () => openModal(item));
    grid.appendChild(card);
  }
}

// ==============================
// Modal
// ==============================
function renderPalette(colors) {
  // jouw data heeft meestal geen palette → leeg is prima
  modalPalette.innerHTML = "";
  if (!Array.isArray(colors) || !colors.length) return;

  for (const c of colors) {
    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = c;
    modalPalette.appendChild(sw);
  }
}

function openModal(item) {
  currentItem = item;

  modalTitle.textContent = safeText(item.title);
  modalSub.textContent = safeText(item.artist, "");

  modalImg.src = item.imageUrl || "";
  modalImg.alt = safeText(item.title, "");

  metaYear.textContent = safeText(item.year);
  metaTags.textContent = Array.isArray(item.tags) && item.tags.length ? item.tags.join(", ") : "—";

  metaLink.href = safeHref(item.sourceUrl);
  metaLink.textContent = metaLink.href === "#" ? "—" : "open";

  renderPalette(item.palette);
  updateFavBtn();

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  currentItem = null;
}

// close buttons/backdrop
document.addEventListener("click", (e) => {
  const el = e.target;
  if (el && el.hasAttribute("data-close")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key.toLowerCase() === "f" && currentItem) toggleFavorite(currentItem.id);
});

// favorite button
if (favBtn) {
  favBtn.addEventListener("click", () => {
    if (!currentItem) return;
    toggleFavorite(currentItem.id);
  });
}

// ==============================
// UI events
// ==============================
qInput.addEventListener("input", applyFilters);

clearBtn.addEventListener("click", () => {
  qInput.value = "";
  applyFilters();
});

onlyFavCheckbox.addEventListener("change", applyFilters);

sortBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sortBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeSort = btn.dataset.sort || "trending";
    applyFilters();
  });
});

// ==============================
// Init
// ==============================
(async function init() {
  try {
    initTheme();
    initContrast();

    data = await loadData();
    data = Array.isArray(data) ? data.filter((x) => x && x.id) : [];

    filtered = [...data];
    applyFilters();
  } catch (err) {
    console.error(err);
    empty.classList.remove("hidden");
    empty.querySelector(".empty-title").textContent = "Data kon niet laden";
    empty.querySelector(".empty-sub").textContent = String(err);
  }
})();