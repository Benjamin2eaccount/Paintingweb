// ==============================
// DOM
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
let activeSort = "trending";

let favorites = new Set(
  JSON.parse(localStorage.getItem("favorites") || "[]")
);

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

function isFav(id) {
  return favorites.has(id);
}

function saveFavs() {
  localStorage.setItem("favorites", JSON.stringify([...favorites]));
}

function toggleFavorite(id) {
  if (!id) return;
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavs();
  updateFavBtn();
  if (onlyFavCheckbox.checked) applyFilters();
}

function updateFavBtn() {
  if (!favBtn || !currentItem) return;
  favBtn.textContent = isFav(currentItem.id) ? "★" : "☆";
}

// ==============================
// Theme (matcht jouw CSS)
// ==============================
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);

  if (themeBtn) {
    themeBtn.textContent = theme === "dark" ? "🌙 Dark" : "☀️ Light";
  }
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  applyTheme(saved || "dark");
}

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
  });
}

// ==============================
// High contrast (matcht jouw CSS)
// ==============================
function applyContrast(on) {
  document.body.classList.toggle("hicontrast", !!on);
  localStorage.setItem("hi_contrast", on ? "1" : "0");
}

function initContrast() {
  const saved = localStorage.getItem("hi_contrast") === "1";
  if (hiContrastCheckbox) hiContrastCheckbox.checked = saved;
  applyContrast(saved);
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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// ==============================
// Sort
// ==============================
function applySort() {
  if (activeSort === "trending") {
    filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  } else if (activeSort === "newest") {
    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (activeSort === "title") {
    filtered.sort((a, b) =>
      safeText(a.title, "").localeCompare(safeText(b.title, ""), "nl")
    );
  } else if (activeSort === "artist") {
    filtered.sort((a, b) =>
      safeText(a.artist, "").localeCompare(safeText(b.artist, ""), "nl")
    );
  }
}

// ==============================
// Filtering
// ==============================
function applyFilters() {
  const term = qInput.value.trim().toLowerCase();

  filtered = data.filter((item) => {
    const haystack = [
      item.title,
      item.artist,
      (item.tags || []).join(" ")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchSearch = !term || haystack.includes(term);
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
      <div class="card-top">
        <img src="${imgSrc}" alt="${title}" loading="lazy">
        <div class="card-overlay"></div>
        <div class="card-info">
          <div>
            <div class="card-title">${title}</div>
            <div class="card-sub">${artist}</div>
          </div>
          <div class="badge">${safeText(item.year)}</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openModal(item));
    grid.appendChild(card);
  }
}

// ==============================
// Modal
// ==============================
function openModal(item) {
  currentItem = item;

  modalTitle.textContent = safeText(item.title);
  modalSub.textContent = safeText(item.artist, "");
  modalImg.src = item.imageUrl || "";
  modalImg.alt = safeText(item.title, "");

  metaYear.textContent = safeText(item.year);
  metaTags.textContent =
    Array.isArray(item.tags) && item.tags.length
      ? item.tags.join(", ")
      : "—";

  metaLink.href = safeHref(item.sourceUrl);
  metaLink.textContent = metaLink.href === "#" ? "—" : "open";

  updateFavBtn();
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  currentItem = null;
}

// backdrop / esc
document.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key.toLowerCase() === "f" && currentItem) {
    toggleFavorite(currentItem.id);
  }
});

if (favBtn) {
  favBtn.addEventListener("click", () => {
    if (currentItem) toggleFavorite(currentItem.id);
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
    data = Array.isArray(data) ? data.filter(x => x && x.id) : [];

    filtered = [...data];
    applyFilters();
  } catch (err) {
    console.error(err);
    empty.classList.remove("hidden");
    empty.querySelector(".empty-title").textContent = "Data kon niet laden";
    empty.querySelector(".empty-sub").textContent = String(err);
  }
})();