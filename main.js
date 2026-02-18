import { extractPalette, paletteToCssVars } from "./utils/palette.js";
import { loadState, toggleFavorite, saveState } from "./utils/storage.js";
import { el, renderCard, copyToClipboard, downloadText } from "./utils/dom.js";

const $ = (s)=> document.querySelector(s);

const grid = $("#grid");
const empty = $("#empty");
const q = $("#q");
const clear = $("#clear");
const onlyFav = $("#onlyFav");
const hiContrast = $("#hiContrast");
const statCount = $("#statCount");
const statFav = $("#statFav");
const statLast = $("#statLast");

const exportCssAll = $("#exportCssAll");
const exportJsonAll = $("#exportJsonAll");

const modal = $("#modal");
const modalTitle = $("#modalTitle");
const modalSub = $("#modalSub");
const modalImg = $("#modalImg");
const metaYear = $("#metaYear");
const metaLink = $("#metaLink");
const metaTags = $("#metaTags");
const modalPalette = $("#modalPalette");
const favBtn = $("#favBtn");
const copyCss = $("#copyCss");
const copyJson = $("#copyJson");
const downloadTxt = $("#downloadTxt");
const toast = $("#toast");

const themeToggle = document.querySelector("#themeToggle");
const THEME_KEY = "schilderij_theme_v1";

function applyTheme(theme){
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    if (themeToggle) themeToggle.textContent = isDark ? "🌙 Dark" : "☀️ Light";
    localStorage.setItem(THEME_KEY, theme);
}

// default: light
applyTheme(localStorage.getItem(THEME_KEY) || "light");

if (themeToggle){
    themeToggle.addEventListener("click", ()=>{
        const next = document.body.classList.contains("dark") ? "light" : "dark";
        applyTheme(next);
    });
}


let state = loadState();
let data = [];
let palettes = new Map(); // id -> palette array
let currentId = null;
let sortMode = "trending";

function setToast(msg){
    toast.textContent = msg;
    if (!msg) return;
    setTimeout(()=> { if (toast.textContent === msg) toast.textContent = ""; }, 1800);
}

function setStats(){
    statCount.textContent = String(data.length);
    statFav.textContent = String(Object.keys(state.favorites).length);
    statLast.textContent = state.lastExport ? state.lastExport : "—";
}

function matches(item, query){
    if (!query) return true;
    const hay = `${item.title} ${item.artist} ${(item.tags||[]).join(" ")}`.toLowerCase();
    return hay.includes(query.toLowerCase());
}

function sortItems(items){
    const arr = [...items];
    if (sortMode === "newest"){
        arr.sort((a,b)=> (b.year ?? -Infinity) - (a.year ?? -Infinity));
    } else if (sortMode === "title"){
        arr.sort((a,b)=> a.title.localeCompare(b.title));
    } else if (sortMode === "artist"){
        arr.sort((a,b)=> a.artist.localeCompare(b.artist));
    } else {
        // trending: popularity then favorites boost
        arr.sort((a,b)=> {
            const af = state.favorites[a.id] ? 10 : 0;
            const bf = state.favorites[b.id] ? 10 : 0;
            return ((b.popularity ?? 0) + bf) - ((a.popularity ?? 0) + af);
        });
    }
    return arr;
}

async function ensurePalette(item){
    if (palettes.has(item.id)) return palettes.get(item.id);
    try{
        const pal = await extractPalette(item.imageUrl, { colors: 5, sample: 2200 });
        palettes.set(item.id, pal);
        return pal;
    } catch {
        const fallback = ["#7C5CFF","#33D3FF","#F2E9FF","#0B0D12","#E8ECF6"];
        palettes.set(item.id, fallback);
        return fallback;
    }
}

async function render(){
    grid.innerHTML = "";
    const query = q.value.trim();
    let items = data.filter(d => matches(d, query));
    if (onlyFav.checked) items = items.filter(d => !!state.favorites[d.id]);
    items = sortItems(items);

    empty.classList.toggle("hidden", items.length !== 0);

    // Render progressively: skeleton first
    for (const item of items){
        const isFav = !!state.favorites[item.id];
        const placeholder = el("article", { class:"card" }, [
            el("div", { class:"card-top" }, [
                el("div", { style:"width:100%;height:100%;background:rgba(255,255,255,.03);" })
            ]),
            el("div", { class:"swatches" }, Array.from({length:5}, ()=> el("div", { class:"swatch", style:"background:rgba(255,255,255,.05)" }))),
            el("div", { class:"card-foot" }, [el("div", {}, ["Laden…"]), el("div", {}, [""])])
        ]);
        grid.appendChild(placeholder);

        const palette = await ensurePalette(item);

        const card = renderCard({
            item,
            palette,
            isFav,
            onOpen: openModal,
            onFavToggle: (id)=> {
                toggleFavorite(state, id);
                setStats();
                render();
                if (currentId === id) syncModalFav();
            },
            onCopyHex: async (hex)=> {
                await copyToClipboard(hex);
                setToast(`Gekopieerd: ${hex}`);
            }
        });

        placeholder.replaceWith(card);
    }

    setStats();
}

function openModal(id){
    const item = data.find(d => d.id === id);
    if (!item) return;
    currentId = id;

    modalTitle.textContent = item.title;
    modalSub.textContent = item.artist;
    modalImg.src = item.imageUrl;
    modalImg.alt = `${item.title} — ${item.artist}`;
    metaYear.textContent = item.year ?? "—";
    metaLink.href = item.sourceUrl ?? "#";
    metaTags.textContent = (item.tags ?? []).join(", ") || "—";

    syncModalFav();

    modal.classList.remove("hidden");

    // build palette UI
    modalPalette.innerHTML = "";
    ensurePalette(item).then(pal => {
        modalPalette.innerHTML = "";
        pal.forEach((hex, i)=>{
            const chip = el("div", { class:"pchip" }, [
                el("div", { class:"c", style:`background:${hex}` }),
                el("div", { class:"t", style:`background:${hex}; color: ${hexToReadable(hex)};` }, [
                    el("span", {}, [`c${i+1}`]),
                    el("span", {}, [hex])
                ])
            ]);
            chip.addEventListener("click", async ()=>{
                await copyToClipboard(hex);
                setToast(`Gekopieerd: ${hex}`);
            });
            modalPalette.appendChild(chip);
        });
    });

    // keyboard focus
    favBtn.focus();
}

function closeModal(){
    modal.classList.add("hidden");
    currentId = null;
    setToast("");
}

function syncModalFav(){
    const fav = !!state.favorites[currentId];
    favBtn.textContent = fav ? "★" : "☆";
    favBtn.title = fav ? "Verwijder favoriet (F)" : "Favoriet (F)";
}

function hexToReadable(hex){
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const y = (r*299 + g*587 + b*114)/1000;
    return y > 150 ? "rgba(0,0,0,.78)" : "rgba(255,255,255,.92)";
}

async function exportCssForItem(item){
    const pal = await ensurePalette(item);
    const css = `/* ${item.title} — ${item.artist} */\n:root{\n${pal.map((h,i)=> `  --c${i+1}: ${h};`).join("\n")}\n}\n`;
    state.lastExport = `${item.id} (CSS)`;
    saveState(state);
    setStats();
    return css;
}

async function exportJsonForItem(item){
    const pal = await ensurePalette(item);
    const json = JSON.stringify({
        id: item.id,
        title: item.title,
        artist: item.artist,
        year: item.year,
        imageUrl: item.imageUrl,
        palette: pal
    }, null, 2);
    state.lastExport = `${item.id} (JSON)`;
    saveState(state);
    setStats();
    return json;
}

async function exportAllCss(){
    const blocks = [];
    for (const item of sortItems(data)){
        const pal = await ensurePalette(item);
        blocks.push(`/* ${item.title} — ${item.artist} */\n:root{\n${pal.map((h,i)=> `  --${item.id}-c${i+1}: ${h};`).join("\n")}\n}\n`);
    }
    const out = blocks.join("\n");
    await copyToClipboard(out);
    state.lastExport = "ALL (CSS)";
    saveState(state);
    setStats();
    setToast("Alles (CSS) gekopieerd");
}

async function exportAllJson(){
    const arr = [];
    for (const item of sortItems(data)){
        const pal = await ensurePalette(item);
        arr.push({ ...item, palette: pal });
    }
    const out = JSON.stringify(arr, null, 2);
    await copyToClipboard(out);
    state.lastExport = "ALL (JSON)";
    saveState(state);
    setStats();
    setToast("Alles (JSON) gekopieerd");
}

// Events
document.addEventListener("click", (e)=>{
    const t = e.target;
    if (t?.dataset?.close !== undefined) closeModal();
});

document.addEventListener("keydown", async (e)=>{
    const isOpen = !modal.classList.contains("hidden");
    if (e.key === "Escape" && isOpen) closeModal();

    if (!isOpen) return;

    const item = data.find(d => d.id === currentId);
    if (!item) return;

    if (e.key.toLowerCase() === "f"){
        toggleFavorite(state, item.id);
        setStats();
        syncModalFav();
        render();
    }
    if (e.key.toLowerCase() === "c"){
        const pal = await ensurePalette(item);
        await copyToClipboard(pal[0]);
        setToast(`Gekopieerd: ${pal[0]}`);
    }
});

q.addEventListener("input", render);
clear.addEventListener("click", ()=> { q.value=""; render(); });
onlyFav.addEventListener("change", render);
hiContrast.addEventListener("change", ()=>{
    document.body.classList.toggle("hicontrast", hiContrast.checked);
});

// sort buttons
document.querySelectorAll(".seg-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
        document.querySelectorAll(".seg-btn").forEach(b=> b.classList.remove("is-active"));
        btn.classList.add("is-active");
        sortMode = btn.dataset.sort;
        render();
    });
});

// modal actions
favBtn.addEventListener("click", ()=>{
    if (!currentId) return;
    toggleFavorite(state, currentId);
    setStats();
    syncModalFav();
    render();
});

copyCss.addEventListener("click", async ()=>{
    const item = data.find(d => d.id === currentId);
    if (!item) return;
    const css = await exportCssForItem(item);
    await copyToClipboard(css);
    setToast("CSS vars gekopieerd");
});

copyJson.addEventListener("click", async ()=>{
    const item = data.find(d => d.id === currentId);
    if (!item) return;
    const json = await exportJsonForItem(item);
    await copyToClipboard(json);
    setToast("JSON gekopieerd");
});

downloadTxt.addEventListener("click", async ()=>{
    const item = data.find(d => d.id === currentId);
    if (!item) return;
    const css = await exportCssForItem(item);
    const json = await exportJsonForItem(item);
    const pal = await ensurePalette(item);
    const txt = [
        `${item.title} — ${item.artist} (${item.year ?? "—"})`,
        `Image: ${item.imageUrl}`,
        `Source: ${item.sourceUrl ?? "-"}`,
        ``,
        `Palette: ${pal.join(", ")}`,
        ``,
        `CSS:\n${css}`,
        `JSON:\n${json}`
    ].join("\n");
    downloadText(`${item.id}-palette.txt`, txt);
    setToast("Gedownload");
});

exportCssAll.addEventListener("click", exportAllCss);
exportJsonAll.addEventListener("click", exportAllJson);

// Load data
(async function init(){
    try{
        const res = await fetch("./src/data/paintings.json");
        data = await res.json();
        setStats();
        render();
    } catch (err){
        grid.innerHTML = `<div style="padding:16px;color:rgba(232,236,246,.8)">
      <b>Data kon niet laden.</b><br/>
      Open dit via een (lokale) server i.p.v. direct file:// zodat fetch werkt.
      <br/><br/>Fout: ${String(err)}
    </div>`;
    }
})();
