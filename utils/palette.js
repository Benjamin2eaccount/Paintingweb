function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function rgbToHex([r,g,b]){
    const to = (x)=> x.toString(16).padStart(2,"0");
    return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function luminance([r,g,b]){
    // simple relative luminance
    const a = [r,g,b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
}

function dist(a,b){
    return Math.sqrt(
        (a[0]-b[0])**2 +
        (a[1]-b[1])**2 +
        (a[2]-b[2])**2
    );
}

function pickKMeans(points, k=5, iters=8){
    // init centers by random samples
    const centers = [];
    const used = new Set();
    while (centers.length < k && centers.length < points.length){
        const i = Math.floor(Math.random() * points.length);
        if (used.has(i)) continue;
        used.add(i);
        centers.push([...points[i]]);
    }
    if (!centers.length) return [];

    for (let t=0; t<iters; t++){
        const clusters = Array.from({length: centers.length}, ()=> ({sum:[0,0,0], n:0}));
        for (const p of points){
            let bi=0, bd=Infinity;
            for (let i=0;i<centers.length;i++){
                const d = dist(p, centers[i]);
                if (d < bd){ bd=d; bi=i; }
            }
            clusters[bi].sum[0]+=p[0]; clusters[bi].sum[1]+=p[1]; clusters[bi].sum[2]+=p[2];
            clusters[bi].n++;
        }
        for (let i=0;i<centers.length;i++){
            const c = clusters[i];
            if (c.n === 0) continue;
            centers[i] = [
                Math.round(c.sum[0]/c.n),
                Math.round(c.sum[1]/c.n),
                Math.round(c.sum[2]/c.n)
            ];
        }
    }

    // sort by "weight" approximation: count nearest
    const counts = new Array(centers.length).fill(0);
    for (const p of points){
        let bi=0, bd=Infinity;
        for (let i=0;i<centers.length;i++){
            const d = dist(p, centers[i]);
            if (d < bd){ bd=d; bi=i; }
        }
        counts[bi]++;
    }
    return centers
        .map((c,i)=> ({c, n: counts[i]}))
        .sort((x,y)=> y.n - x.n)
        .map(x=> x.c);
}

export async function extractPalette(imageUrl, {colors=5, sample=1800} = {}) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
    });

    const canvas = document.createElement("canvas");
    const maxW = 360;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = Math.max(1, Math.floor(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // random sample pixels, skip near-transparent and near-white/near-black extremes lightly
    const pts = [];
    const step = Math.max(1, Math.floor((data.length/4) / sample));
    for (let i=0; i < data.length; i += step*4){
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 220) continue;
        const lum = luminance([r,g,b]);
        if (lum < 0.03 || lum > 0.98) continue;
        pts.push([r,g,b]);
    }

    const centers = pickKMeans(pts.length ? pts : [[120,120,120]], colors, 10);

    // ensure uniqueness and nice spread
    const uniq = [];
    for (const c of centers){
        if (!uniq.some(u => dist(u,c) < 22)) uniq.push(c);
    }
    while (uniq.length < colors) uniq.push(uniq[uniq.length-1]);

    return uniq.slice(0, colors).map(rgbToHex);
}

export function bestTextColor(hex){
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const lum = luminance([r,g,b]);
    return lum > 0.56 ? "rgba(0,0,0,.78)" : "rgba(255,255,255,.92)";
}

export function paletteToCssVars(palette, prefix="--c"){
    return palette.map((h,i)=> `${prefix}${i+1}: ${h};`).join("\n");
}
