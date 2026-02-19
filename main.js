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

// ==============================
// State
// ==============================

let data = [];
let filtered = [];
let favorites = new Set(
  JSON.parse(localStorage.getItem("favorites") || "[]")
);

// ==============================
// Data laden (werkt op GH Pages)
// ==============================

async function loadData() {
  const url = new URL("./data/paintings.json", import.meta.url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} bij ${res.url}`);
  }
  return await res.json();
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

  filtered.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.image}" alt="${item.title}" loading="lazy" />
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-sub">${item.artist || ""}</div>
      </div>
    `;

    card.addEventListener("click", () => openModal(item));

    grid.appendChild(card);
  });
}

// ==============================
// Modal
// ==============================

function openModal(item) {
  modalTitle.textContent = item.title || "—";
  modalSub.textContent = item.artist || "";
  modalImg.src = item.image || "";
  modalImg.alt = item.title || "";

  metaYear.textContent = item.year || "—";

  if (item.source && item.source.startsWith("http")) {
    metaLink.href = item.source;
    metaLink.textContent = "open";
  } else {
    metaLink.href = "#";
    metaLink.textContent = "—";
  }

  metaTags.textContent = item.tags ? item.tags.join(", ") : "—";

  renderPalette(item.palette || []);

  modal.classList.remove("hidden");
}

function renderPalette(colors) {
  modalPalette.innerHTML = "";

  colors.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = color;
    modalPalette.appendChild(swatch);
  });
}

document.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close")) {
    modal.classList.add("hidden");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modal.classList.add("hidden");
  }
});

// ==============================
// Search / filtering
// ==============================

function applyFilters() {
  const term = qInput.value.toLowerCase();

  filtered = data.filter((item) => {
    const matchSearch =
      item.title?.toLowerCase().includes(term) ||
      item.artist?.toLowerCase().includes(term) ||
      item.tags?.join(" ").toLowerCase().includes(term);

    const matchFav =
      !onlyFavCheckbox.checked || favorites.has(item.id);

    return matchSearch && matchFav;
  });

  render();
}

qInput.addEventListener("input", applyFilters);

clearBtn.addEventListener("click", () => {
  qInput.value = "";
  applyFilters();
});

onlyFavCheckbox.addEventListener("change", applyFilters);

// ==============================
// Init
// ==============================

(async function init() {
  try {
    data = await loadData();
    filtered = [...data];
    render();
  } catch (err) {
    console.error(err);

    grid.innerHTML = `
      <div style="padding:2rem">
        <strong>Data kon niet laden.</strong><br/><br/>
        ${String(err)}
      </div>
    `;
  }
})();