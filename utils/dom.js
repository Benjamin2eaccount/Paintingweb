import { bestTextColor } from "./palette.js";

export function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)){
        if (k === "class") n.className = v;
        else if (k === "dataset") Object.assign(n.dataset, v);
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const c of children){
        if (c === null || c === undefined) continue;
        n.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return n;
}

export function renderCard({item, palette, isFav, onOpen, onFavToggle, onCopyHex}){
    const img = el("img", { src: item.imageUrl, alt: `${item.title} — ${item.artist}`, loading:"lazy" });

    const swatches = el("div", { class:"swatches" },
        palette.map(hex => {
            const s = el("div", { class:"swatch", dataset:{ hex } });
            s.style.background = hex;
            s.addEventListener("click", (e)=>{
                e.stopPropagation();
                onCopyHex(hex);
            });
            return s;
        })
    );

    const favBtn = el("button", { class:"iconbtn", title:"Favoriet", onClick:(e)=>{
            e.stopPropagation();
            onFavToggle(item.id);
        }}, [ isFav ? "★" : "☆" ]);

    const openBtn = el("button", { class:"iconbtn", title:"Details openen", onClick:(e)=>{
            e.stopPropagation();
            onOpen(item.id);
        }}, [ "↗" ]);

    const info = el("div", { class:"card-info" }, [
        el("div", {}, [
            el("div", { class:"card-title" }, [item.title]),
            el("div", { class:"card-sub" }, [`${item.artist} • ${item.year ?? "—"}`])
        ]),
        el("div", { class:"badge" }, [`${palette.length} colors`])
    ]);

    const top = el("div", { class:"card-top" }, [
        img,
        el("div", { class:"card-overlay" }),
        info
    ]);

    const foot = el("div", { class:"card-foot" }, [
        el("div", {}, [isFav ? "In favorieten" : "Klik voor details"]),
        el("div", { style:"display:flex; gap:8px;" }, [favBtn, openBtn])
    ]);

    const card = el("article", { class:"card", tabindex:"0" }, [top, swatches, foot]);

    // improve swatch label contrast
    card.querySelectorAll(".swatch").forEach(s=>{
        const hex = s.dataset.hex;
        s.style.setProperty("--t", bestTextColor(hex));
        s.style.color = "var(--t)";
    });

    card.addEventListener("click", ()=> onOpen(item.id));
    card.addEventListener("keydown", (e)=>{
        if (e.key === "Enter") onOpen(item.id);
    });

    return card;
}

export function downloadText(filename, text){
    const blob = new Blob([text], { type:"text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 500);
}

export async function copyToClipboard(text){
    await navigator.clipboard.writeText(text);
}
