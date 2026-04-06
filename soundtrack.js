const config = window.appConfig || {};
const storyConfig = config.story || {};

const SOUNDTRACK_STORAGE_KEY = "girasolSoundtrackPlaylist";
const SOUNDTRACK_HIDDEN_STORAGE_KEY = "girasolSoundtrackHiddenTracks";
const PORTAL_UNLOCK_STORAGE_KEY = "girasolPortalUnlocked";

const state = {
    playlistAudio: null,
    playlistActiveCard: null
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character] || character;
    });
}

function formatTimeSeconds(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value < 0) {
        return "0:00";
    }

    const whole = Math.floor(value);
    const minutes = Math.floor(whole / 60);
    const remainder = whole % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function hashSeed(value) {
    const text = String(value ?? "");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash || 1;
}

function buildSoundtrackWaveBars(seedKey, barCount = 42) {
    let seed = hashSeed(seedKey) % 2147483647;
    if (seed <= 0) {
        seed += 2147483646;
    }

    const next = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    return Array.from({ length: barCount })
        .map(() => {
            const height = Math.round(24 + next() * 76);
            const duration = (0.72 + next() * 0.88).toFixed(2);
            const delay = (-next() * 1.1).toFixed(2);
            return `<span class="soundtrack-bar" style="--h:${height}%;--dur:${duration}s;--delay:${delay}s"></span>`;
        })
        .join("");
}

function normalizeSpotifyTrackUrl(rawUrl) {
    const text = String(rawUrl || "").trim();

    if (!text) {
        return null;
    }

    try {
        const url = new URL(text);

        if (!/spotify\.com$/i.test(url.hostname)) {
            return null;
        }

        const match = url.pathname.match(/\/track\/([a-zA-Z0-9]+)/);
        if (!match) {
            return null;
        }

        return `https://open.spotify.com/track/${match[1]}`;
    } catch (error) {
        return null;
    }
}

function getStoredSoundtrackPlaylist() {
    try {
        const raw = window.localStorage.getItem(SOUNDTRACK_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
                title: String(item.title || "").trim(),
                artist: String(item.artist || "").trim(),
                previewUrl: String(item.previewUrl || "").trim(),
                url: String(item.url || "").trim()
            }))
            .filter((item) => item.title && item.url);
    } catch (error) {
        return [];
    }
}

function setStoredSoundtrackPlaylist(items) {
    try {
        window.localStorage.setItem(SOUNDTRACK_STORAGE_KEY, JSON.stringify(items || []));
    } catch (error) {
    }
}

function getHiddenSoundtrackKeys() {
    try {
        const raw = window.localStorage.getItem(SOUNDTRACK_HIDDEN_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((value) => String(value || "").trim())
            .filter(Boolean);
    } catch (error) {
        return [];
    }
}

function setHiddenSoundtrackKeys(keys) {
    try {
        window.localStorage.setItem(SOUNDTRACK_HIDDEN_STORAGE_KEY, JSON.stringify(keys || []));
    } catch (error) {
    }
}

function unhideSoundtrackKey(key) {
    if (!key) {
        return false;
    }

    const hiddenKeys = getHiddenSoundtrackKeys();
    const nextHidden = hiddenKeys.filter((entry) => entry !== key);

    if (nextHidden.length !== hiddenKeys.length) {
        setHiddenSoundtrackKeys(nextHidden);
        return true;
    }

    return false;
}

function normalizeTracks(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
            title: String(item.title || "").trim(),
            artist: String(item.artist || "").trim(),
            previewUrl: String(item.previewUrl || "").trim(),
            url: String(item.url || "").trim()
        }))
        .filter((item) => item.title && item.url);
}

function getCombinedSoundtrackTracks() {
    const hiddenKeys = new Set(getHiddenSoundtrackKeys());

    const baseTracks = normalizeTracks(storyConfig.playlist).map((track) => ({
        ...track,
        source: "base",
        key: normalizeSpotifyTrackUrl(track.url) || ""
    }));

    const storedTracks = getStoredSoundtrackPlaylist().map((track) => ({
        ...track,
        source: "stored",
        key: normalizeSpotifyTrackUrl(track.url) || ""
    }));

    const byKey = new Map();

    const addToMap = (track) => {
        const key = track.key;
        if (!key || hiddenKeys.has(key)) {
            return;
        }

        byKey.set(key, track);
    };

    baseTracks.forEach(addToMap);
    storedTracks.forEach(addToMap);

    return Array.from(byKey.values());
}

function updateRangeFill(range) {
    if (!range) {
        return;
    }

    const max = Number(range.max) || 0;
    const value = Number(range.value) || 0;
    const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
    range.style.setProperty("--progress", `${percent}%`);
}

function resetCardProgress(card, durationFallback = 30) {
    if (!card) {
        return;
    }

    const range = card.querySelector(".soundtrack-seek");
    const currentLabel = card.querySelector('[data-soundtrack-time="current"]');
    const durationLabel = card.querySelector('[data-soundtrack-time="duration"]');

    if (range) {
        range.max = String(durationFallback);
        range.value = "0";
        updateRangeFill(range);
    }

    if (currentLabel) {
        currentLabel.textContent = "0:00";
    }

    if (durationLabel) {
        durationLabel.textContent = formatTimeSeconds(durationFallback);
    }
}

function setCardPlayingState(card, isPlaying) {
    if (!card) {
        return;
    }

    const playButton = card.querySelector(".soundtrack-play");
    card.classList.toggle("is-playing", isPlaying);

    if (playButton) {
        playButton.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    }
}

function stopOtherCards(activeCard) {
    const playlistList = document.getElementById("playlistList");
    if (!playlistList) {
        return;
    }

    playlistList.querySelectorAll(".soundtrack-card").forEach((card) => {
        if (card === activeCard) {
            return;
        }

        setCardPlayingState(card, false);
    });
}

function stopPlayback() {
    const audio = state.playlistAudio;

    if (audio) {
        try {
            audio.pause();
        } catch (error) {
        }

        audio.currentTime = 0;
        audio.removeAttribute("src");
    }

    if (state.playlistActiveCard) {
        setCardPlayingState(state.playlistActiveCard, false);
        resetCardProgress(state.playlistActiveCard);
    }

    state.playlistActiveCard = null;
}

function renderSoundtrackPlaylist() {
    const playlistList = document.getElementById("playlistList");
    if (!playlistList) {
        return;
    }

    const tracks = getCombinedSoundtrackTracks();

    playlistList.innerHTML = tracks
        .map((track, index) => {
            const title = escapeHtml(track.title);
            const artist = escapeHtml(track.artist || "Spotify");
            const previewUrl = escapeHtml(track.previewUrl || "");
            const trackUrl = escapeHtml(track.url || "");
            const trackLabel = `Track ${String(index + 1).padStart(2, "0")}`;
            const waveBars = buildSoundtrackWaveBars(`${track.url || title}-${index}`);
            const playAriaLabel = escapeHtml(`Reproducir ${track.title || ""}`.trim());
            const disabled = previewUrl ? "" : "disabled";
            const titleHtml = trackUrl
                ? `<a href="${trackUrl}" target="_blank" rel="noopener noreferrer">${title}</a>`
                : title;

            return `
                <article
                    class="soundtrack-card"
                    data-preview-url="${previewUrl}"
                    data-track-url="${trackUrl}"
                    data-track-source="${escapeHtml(track.source || "base")}" 
                    data-track-key="${escapeHtml(track.key || normalizeSpotifyTrackUrl(track.url) || "")}" 
                >
                    <div class="soundtrack-card-top">
                        <p class="soundtrack-track">${escapeHtml(trackLabel)}</p>
                        <button class="ghost soundtrack-remove" type="button" data-soundtrack-action="remove" aria-label="Quitar esta cancion">Quitar</button>
                    </div>
                    <div class="soundtrack-meta">
                        <button class="soundtrack-play" type="button" data-soundtrack-action="toggle" aria-label="${playAriaLabel}" aria-pressed="false" ${disabled}>
                            <svg class="soundtrack-icon soundtrack-icon-play" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            <svg class="soundtrack-icon soundtrack-icon-pause" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                            </svg>
                        </button>
                        <div class="soundtrack-text">
                            <p class="soundtrack-title">${titleHtml}</p>
                            <p class="soundtrack-artist">${artist}</p>
                        </div>
                    </div>
                    <div class="soundtrack-divider" aria-hidden="true"></div>
                    <div class="soundtrack-wave" aria-hidden="true">${waveBars}</div>
                    <div class="soundtrack-progress">
                        <div class="soundtrack-progress-top">
                            <span class="soundtrack-time" data-soundtrack-time="current">0:00</span>
                            <span class="soundtrack-time" data-soundtrack-time="duration">0:30</span>
                        </div>
                        <input class="soundtrack-seek" type="range" min="0" max="30" step="0.1" value="0" data-soundtrack-action="seek" aria-label="Progreso de la cancion" style="--progress:0%" ${disabled}>
                    </div>
                    <p class="soundtrack-caption">Guardada en nuestra historia</p>
                    <button class="primary soundtrack-cta" type="button" data-soundtrack-action="toggle" ${disabled}>Escuchar</button>
                </article>
            `;
        })
        .join("");
}

function removeTrackFromStorage(card) {
    const key = card?.dataset?.trackKey || "";
    const source = card?.dataset?.trackSource || "base";

    if (!key) {
        return;
    }

    if (source === "stored") {
        const stored = getStoredSoundtrackPlaylist();
        const nextStored = stored.filter((song) => normalizeSpotifyTrackUrl(song?.url) !== key);
        setStoredSoundtrackPlaylist(nextStored);
        return;
    }

    const hiddenKeys = getHiddenSoundtrackKeys();
    if (!hiddenKeys.includes(key)) {
        setHiddenSoundtrackKeys([...hiddenKeys, key]);
    }
}

function setupSoundtrackPlaylistPlayback() {
    const playlistList = document.getElementById("playlistList");

    if (!playlistList || playlistList.dataset.soundtrackBound === "true") {
        return;
    }

    if (!state.playlistAudio) {
        state.playlistAudio = new Audio();
        state.playlistAudio.preload = "none";
    }

    const audio = state.playlistAudio;

    const stopPlaybackInternal = () => {
        if (audio.src) {
            try {
                audio.pause();
            } catch (error) {
            }

            audio.currentTime = 0;
            audio.removeAttribute("src");
        }

        if (state.playlistActiveCard) {
            setCardPlayingState(state.playlistActiveCard, false);
            resetCardProgress(state.playlistActiveCard);
        }

        state.playlistActiveCard = null;
    };

    audio.addEventListener("ended", () => {
        stopPlaybackInternal();
    });

    audio.addEventListener("loadedmetadata", () => {
        if (!state.playlistActiveCard) {
            return;
        }

        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
        const range = state.playlistActiveCard.querySelector(".soundtrack-seek");
        const durationLabel = state.playlistActiveCard.querySelector('[data-soundtrack-time="duration"]');

        if (range) {
            range.max = String(duration);
            updateRangeFill(range);
        }

        if (durationLabel) {
            durationLabel.textContent = formatTimeSeconds(duration);
        }
    });

    audio.addEventListener("timeupdate", () => {
        if (!state.playlistActiveCard) {
            return;
        }

        const range = state.playlistActiveCard.querySelector(".soundtrack-seek");
        const currentLabel = state.playlistActiveCard.querySelector('[data-soundtrack-time="current"]');

        if (range) {
            range.value = String(audio.currentTime || 0);
            updateRangeFill(range);
        }

        if (currentLabel) {
            currentLabel.textContent = formatTimeSeconds(audio.currentTime || 0);
        }
    });

    audio.addEventListener("pause", () => {
        if (!state.playlistActiveCard) {
            return;
        }

        setCardPlayingState(state.playlistActiveCard, false);
    });

    audio.addEventListener("play", () => {
        if (!state.playlistActiveCard) {
            return;
        }

        setCardPlayingState(state.playlistActiveCard, true);
    });

    playlistList.addEventListener("click", (event) => {
        const removeTrigger = event.target.closest('[data-soundtrack-action="remove"]');
        if (removeTrigger) {
            const card = removeTrigger.closest(".soundtrack-card");
            const trackTitle = card?.querySelector(".soundtrack-title")?.textContent?.trim() || "esta cancion";

            if (!window.confirm(`¿Seguro que quieres quitar "${trackTitle}"?`)) {
                return;
            }

            removeTrackFromStorage(card);
            stopPlaybackInternal();
            stopOtherCards(null);
            renderSoundtrackPlaylist();
            return;
        }

        const trigger = event.target.closest('[data-soundtrack-action="toggle"]');
        if (!trigger) {
            return;
        }

        const card = trigger.closest(".soundtrack-card");
        if (!card) {
            return;
        }

        const previewUrl = card.dataset.previewUrl || "";
        if (!previewUrl) {
            return;
        }

        const isSameCard = state.playlistActiveCard === card;

        if (isSameCard) {
            if (audio.paused) {
                audio.play().catch((error) => {
                    console.warn("No pude reanudar la previa.", error);
                    stopPlaybackInternal();
                });
                return;
            }

            audio.pause();
            return;
        }

        stopPlaybackInternal();
        stopOtherCards(card);
        resetCardProgress(card);

        state.playlistActiveCard = card;
        audio.src = previewUrl;
        audio.currentTime = 0;

        audio.play().catch((error) => {
            console.warn("No pude reproducir la previa de Spotify.", error);
            stopPlaybackInternal();
        });
    });

    playlistList.addEventListener("input", (event) => {
        const range = event.target.closest(".soundtrack-seek");
        if (!range) {
            return;
        }

        updateRangeFill(range);

        const card = range.closest(".soundtrack-card");
        if (!card) {
            return;
        }

        const desiredTime = Number(range.value) || 0;
        const currentLabel = card.querySelector('[data-soundtrack-time="current"]');
        if (currentLabel) {
            currentLabel.textContent = formatTimeSeconds(desiredTime);
        }

        const previewUrl = card.dataset.previewUrl || "";
        if (!previewUrl) {
            return;
        }

        if (state.playlistActiveCard !== card) {
            stopPlaybackInternal();
            stopOtherCards(card);

            state.playlistActiveCard = card;
            audio.src = previewUrl;
        }

        audio.currentTime = desiredTime;
    });

    playlistList.dataset.soundtrackBound = "true";
}

async function resolveSpotifyTrack(rawUrl) {
    const normalizedUrl = normalizeSpotifyTrackUrl(rawUrl);
    if (!normalizedUrl) {
        throw new Error("El link no parece ser una cancion valida de Spotify.");
    }

    const endpoint = new URL("/.netlify/functions/spotify-track", window.location.origin);
    endpoint.searchParams.set("url", normalizedUrl);

    let response;

    try {
        response = await fetch(endpoint.toString());
    } catch (error) {
        throw new Error(
            "No pude conectarme para leer la cancion. Abre esta pagina con el servidor local (serve.ps1) o despliegala en Netlify."
        );
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(
                "Aqui no esta disponible el servicio para leer canciones (404). Abre esta pagina con serve.ps1 o despliegala en Netlify para usar el boton +."
            );
        }
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `No pude leer la cancion (${response.status}).`);
    }

    const payload = await response.json();

    return {
        title: String(payload?.title || "").trim(),
        artist: String(payload?.artist || "").trim() || "Spotify",
        previewUrl: String(payload?.previewUrl || "").trim(),
        url: String(payload?.url || normalizedUrl).trim() || normalizedUrl
    };
}

function setupSoundtrackAddSongModal() {
    const openButton = document.getElementById("soundtrackAddButton");
    const modal = document.getElementById("songModal");
    const closeButton = document.getElementById("closeSongModalButton");
    const cancelButton = document.getElementById("cancelSongButton");
    const form = document.getElementById("songModalForm");
    const input = document.getElementById("songUrlInput");
    const status = document.getElementById("songModalStatus");
    const saveButton = document.getElementById("saveSongButton");

    if (!openButton || !modal || !form || !input || !status || !saveButton || modal.dataset.bound === "true") {
        return;
    }

    const openModal = () => {
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        status.textContent = "";
        input.value = "";
        input.disabled = false;
        saveButton.disabled = false;

        requestAnimationFrame(() => {
            modal.classList.add("visible");
            input.focus();
        });
    };

    const closeModal = () => {
        if (modal.classList.contains("hidden")) {
            return;
        }

        modal.classList.remove("visible");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        window.setTimeout(() => {
            modal.classList.add("hidden");
        }, 220);
    };

    openButton.addEventListener("click", openModal);
    closeButton?.addEventListener("click", closeModal);
    cancelButton?.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal || event.target.dataset.closeSong === "true") {
            closeModal();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rawUrl = String(input.value || "").trim();
        if (!rawUrl) {
            status.textContent = "Pega un link de Spotify.";
            return;
        }

        status.textContent = "Buscando la cancion...";
        input.disabled = true;
        saveButton.disabled = true;

        try {
            const resolved = await resolveSpotifyTrack(rawUrl);

            if (!resolved.title || !resolved.url) {
                throw new Error("No pude leer esa cancion.");
            }

            if (!resolved.previewUrl) {
                throw new Error("Esa cancion no tiene previa disponible para reproducir aqui.");
            }

            const normalizedResolvedUrl = normalizeSpotifyTrackUrl(resolved.url);
            if (!normalizedResolvedUrl) {
                throw new Error("No pude validar ese link.");
            }

            const baseHas = normalizeTracks(storyConfig.playlist).some(
                (song) => normalizeSpotifyTrackUrl(song?.url) === normalizedResolvedUrl
            );

            const stored = getStoredSoundtrackPlaylist();
            const storedHas = stored.some((song) => normalizeSpotifyTrackUrl(song?.url) === normalizedResolvedUrl);

            const wasHidden = unhideSoundtrackKey(normalizedResolvedUrl);

            if (storedHas || baseHas) {
                if (wasHidden) {
                    renderSoundtrackPlaylist();
                    closeModal();
                    return;
                }

                status.textContent = "Esa cancion ya estaba en la lista.";
                return;
            }

            stored.push(resolved);
            setStoredSoundtrackPlaylist(stored);

            stopPlayback();
            renderSoundtrackPlaylist();
            closeModal();
        } catch (error) {
            status.textContent = error?.message || "No pude agregar la cancion.";
        } finally {
            input.disabled = false;
            saveButton.disabled = false;
        }
    });

    modal.dataset.bound = "true";
}

function ensureAccess() {
    if (window.sessionStorage.getItem(PORTAL_UNLOCK_STORAGE_KEY) === "true") {
        return true;
    }

    window.location.replace("index.html");
    return false;
}

function initializeSoundtrackRoom() {
    if (!ensureAccess()) {
        return;
    }

    setupSoundtrackPlaylistPlayback();
    setupSoundtrackAddSongModal();
    renderSoundtrackPlaylist();
}

window.addEventListener("beforeunload", stopPlayback);
window.addEventListener("load", initializeSoundtrackRoom);
