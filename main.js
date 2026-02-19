// ==============================
// DOM refs
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

const modalPalette = document.getElementById("modalPalette");
const favBtn = document.getElementById("favBtn");

// Sort buttons
const sortBtns = Array.from(document.querySelectorAll(".seg-btn"));

// ==============================
// State
// ==============================
let data = [];
let filtered = [];
let activeSort = "trending";

// favorites by id
let favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
let currentItem = null;

// ==============================
// Helpers
// ==============================
function safeText(v, fallback = "—") {
  return (v === null || v === undefined || v === "") ? fallback : String(v);
}

function safeHref(v) {
  if (!v) return "#";
  if (typeof v !== "string") return "#";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return "https://" + v; // fallback
}

function isFav(id) {
  return favorites.has(id);
}

function saveFavs() {
  localStorage.setItem("favorites", JSON.stringify(Array.from(favorites)));
}

function updateFavBtn() {
  if (!favBtn || !currentItem) return;
  favBtn.textContent = isFav(currentItem.id) ? "★" : "☆";
}

// ==============================
// Data load (GitHub Pages safe)
// ==============================
async function loadData() {
  // jouw bestand: /data/paintings.json
  const url = new URL("./data/paintings.json", import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} bij ${res.url}`);
  return await res.json();
}

// ==============================
// Filtering + sorting
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
    card.setAttribute("aria-label", `${safeText(item.title)} — ${safeText(item.artist, "")}`);

    // let op: jouw JSON heeft imageUrl
    const imgSrc = item.imageUrl || "";
    const title = safeText(item.title);
    const artist = safeText(item.artist, "");

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
  modalPalette.innerHTML = "";
  // jouw JSON heeft geen palette; we laten dit gewoon leeg
  if (!Array.isArray(colors) || colors.length === 0) return;

  for (const c of colors) {
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = c;
    modalPalette.appendChild(swatch);
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

  // jouw JSON heeft sourceUrl
  metaLink.href = safeHref(item.sourceUrl);
  metaLink.textContent = metaLink.href === "#" ? "—" : "open";

  renderPalette(item.palette); // meestal leeg bij jou
  updateFavBtn();

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  currentItem = null;
}

// backdrop + close buttons
document.addEventListener("click", (e) => {
  const el = e.target;
  if (el && el.hasAttribute("data-close")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key.toLowerCase() === "f" && currentItem) {
    toggleFavorite(currentItem.id);
  }
});

// favorite button
function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavs();
  updateFavBtn();
  // her-render als "Alleen favorieten" aan staat
  if (onlyFavCheckbox.checked) applyFilters();
}

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

// sort buttons
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
    data = await loadData();

    // basis-validatie: zorg dat elk item een id heeft
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