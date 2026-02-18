const KEY = "schilderij_palette_v1";

export function loadState() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { favorites: {}, lastExport: null };
        const parsed = JSON.parse(raw);
        return {
            favorites: parsed.favorites ?? {},
            lastExport: parsed.lastExport ?? null
        };
    } catch {
        return { favorites: {}, lastExport: null };
    }
}

export function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
}

export function toggleFavorite(state, id) {
    state.favorites[id] = !state.favorites[id];
    if (!state.favorites[id]) delete state.favorites[id];
    saveState(state);
    return !!state.favorites[id];
}
