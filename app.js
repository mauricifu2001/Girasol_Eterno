const config = window.appConfig || {};
const portalConfig = config.portal || {};
const storyConfig = config.story || {};
const soundtrackConfig = portalConfig.soundtrack || {};

const state = {
    stream: null,
    modelsReady: false,
    authorizedDescriptors: [],
    matcher: null,
    loadingStarted: false,
    soundtrack: null,
    soundtrackPrimed: false,
    playlistAudio: null,
    playlistActiveCard: null,
    museumEntries: []
};

const SOUNDTRACK_STORAGE_KEY = "girasolSoundtrackPlaylist";

const gateSection = document.getElementById("gateSection");
const experienceSection = document.getElementById("experienceSection");
const gateTitle = document.getElementById("gateTitle");
const gateCopy = document.getElementById("gateCopy");
const statusText = document.getElementById("statusText");
const cameraVideo = document.getElementById("cameraVideo");
const captureCanvas = document.getElementById("captureCanvas");
const captureButton = document.getElementById("captureButton");
const retryCameraButton = document.getElementById("retryCameraButton");
const cameraOverlay = document.getElementById("cameraOverlay");
const secretForm = document.getElementById("secretForm");
const secretInput = document.getElementById("secretInput");
const hintText = document.getElementById("hintText");
const welcomeScreen = document.getElementById("welcomeScreen");
const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeMessage = document.getElementById("welcomeMessage");
const museumGrid = document.getElementById("museumGrid");
const scopedExperienceElements = Array.from(document.querySelectorAll("[data-experience-scope]"));
const welcomeRevealDelay = 2800;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function padSequenceNumber(value) {
    return String(value).padStart(3, "0");
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

    const updateRangeFill = (range) => {
        if (!range) {
            return;
        }

        const max = Number(range.max) || 0;
        const value = Number(range.value) || 0;
        const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
        range.style.setProperty("--progress", `${percent}%`);
    };

    const resetCardProgress = (card, durationFallback = 30) => {
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
    };

    const setCardPlayingState = (card, isPlaying) => {
        if (!card) {
            return;
        }

        const playButton = card.querySelector(".soundtrack-play");
        card.classList.toggle("is-playing", isPlaying);

        if (playButton) {
            playButton.setAttribute("aria-pressed", isPlaying ? "true" : "false");
        }
    };

    const stopPlayback = () => {
        if (state.playlistActiveCard) {
            setCardPlayingState(state.playlistActiveCard, false);
            resetCardProgress(state.playlistActiveCard);
        }

        state.playlistActiveCard = null;
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
    };

    const stopOtherCards = (keepCard) => {
        playlistList.querySelectorAll(".soundtrack-card.is-playing").forEach((card) => {
            if (keepCard && card === keepCard) {
                return;
            }

            setCardPlayingState(card, false);
        });
    };

    audio.addEventListener("ended", () => {
        stopPlayback();
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
            const cardUrl = card?.dataset?.trackUrl || "";
            const normalizedUrl = normalizeSpotifyTrackUrl(cardUrl);

            if (normalizedUrl) {
                const stored = getStoredSoundtrackPlaylist();
                const nextStored = stored.filter(
                    (song) => normalizeSpotifyTrackUrl(song?.url) !== normalizedUrl
                );
                setStoredSoundtrackPlaylist(nextStored);
            }

            stopSoundtrack();
            stopPlayback();
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

        stopSoundtrack();

        const isSameCard = state.playlistActiveCard === card;

        if (isSameCard) {
            if (audio.paused) {
                audio.play().catch((error) => {
                    console.warn("No pude reanudar la previa.", error);
                    stopPlayback();
                });
                return;
            }

            audio.pause();
            return;
        }

        stopPlayback();
        stopOtherCards(card);
        resetCardProgress(card);

        state.playlistActiveCard = card;
        audio.src = previewUrl;
        audio.currentTime = 0;

        audio.play().catch((error) => {
            console.warn("No pude reproducir la previa de Spotify.", error);
            stopPlayback();
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
            stopSoundtrack();
            stopPlayback();
            stopOtherCards(card);

            state.playlistActiveCard = card;
            audio.src = previewUrl;
        }

        audio.currentTime = desiredTime;
    });

    playlistList.dataset.soundtrackBound = "true";
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

function getCombinedSoundtrackPlaylist() {
    return [...(storyConfig.playlist || []), ...getStoredSoundtrackPlaylist()];
}

function renderSoundtrackPlaylist() {
    const playlistList = document.getElementById("playlistList");
    if (!playlistList) {
        return;
    }

    const baseSongs = Array.isArray(storyConfig.playlist) ? storyConfig.playlist : [];
    const storedSongs = getStoredSoundtrackPlaylist();
    const songs = [...baseSongs, ...storedSongs];

    playlistList.innerHTML = songs
        .map((song, index) => {
            const isStoredSong = index >= baseSongs.length;
            const title = escapeHtml(song.title);
            const artist = escapeHtml(song.artist);
            const previewUrl = escapeHtml(song.previewUrl || "");
            const trackUrl = escapeHtml(song.url || "");
            const trackLabel = `Track ${String(index + 1).padStart(2, "0")}`;
            const waveBars = buildSoundtrackWaveBars(`${song.url || title}-${index}`);
            const playAriaLabel = escapeHtml(`Reproducir ${song.title || ""}`.trim());
            const disabled = previewUrl ? "" : "disabled";
            const titleHtml = trackUrl
                ? `<a href="${trackUrl}" target="_blank" rel="noopener noreferrer">${title}</a>`
                : title;
            const removeButtonHtml = isStoredSong
                ? `<button class="ghost soundtrack-remove" type="button" data-soundtrack-action="remove" aria-label="Quitar esta cancion">Quitar</button>`
                : "";

            return `
                <article class="soundtrack-card" data-preview-url="${previewUrl}" data-track-url="${trackUrl}">
                    <div class="soundtrack-card-top">
                        <p class="soundtrack-track">${escapeHtml(trackLabel)}</p>
                        ${removeButtonHtml}
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
            const stored = getStoredSoundtrackPlaylist();
            const storedHas = stored.some((song) => normalizeSpotifyTrackUrl(song?.url) === normalizedResolvedUrl);
            const baseHas = (storyConfig.playlist || []).some((song) => normalizeSpotifyTrackUrl(song?.url) === normalizedResolvedUrl);

            if (storedHas || baseHas) {
                status.textContent = "Esa cancion ya estaba en la lista.";
                return;
            }

            stored.push(resolved);
            setStoredSoundtrackPlaylist(stored);

            stopSoundtrack();
            if (state.playlistAudio) {
                state.playlistAudio.pause();
                state.playlistAudio.currentTime = 0;
                state.playlistAudio.removeAttribute("src");
            }
            state.playlistActiveCard = null;

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

function buildHeroTitleHtml(titleText) {
    const rawTitle = String(titleText || "");
    const highlightTarget = "Girasol Hermosa";
    const normalizedTitle = rawTitle.toLowerCase();
    const normalizedTarget = highlightTarget.toLowerCase();
    const index = normalizedTitle.lastIndexOf(normalizedTarget);

    const escapeWithLineBreaks = (value) => escapeHtml(value).replace(/\r?\n/g, "<br>");

    if (index < 0) {
        return escapeWithLineBreaks(rawTitle);
    }

    const before = rawTitle.slice(0, index);
    const match = rawTitle.slice(index, index + highlightTarget.length);
    const after = rawTitle.slice(index + highlightTarget.length);

    return `${escapeWithLineBreaks(before)}<span class="hero-title-accent">${escapeWithLineBreaks(match)}</span>${escapeWithLineBreaks(after)}`;
}

function shouldPlaySoundtrackForLabel(label) {
    if (!soundtrackConfig.enabled || !soundtrackConfig.src) {
        return false;
    }

    return !soundtrackConfig.onlyForLabel || soundtrackConfig.onlyForLabel === label;
}

function ensureSoundtrack() {
    if (!soundtrackConfig.enabled || !soundtrackConfig.src) {
        return null;
    }

    if (!state.soundtrack) {
        const audio = new Audio(soundtrackConfig.src);
        audio.preload = "auto";
        audio.loop = soundtrackConfig.loop !== false;
        audio.volume = clamp(Number(soundtrackConfig.volume ?? 0.16), 0, 1);
        state.soundtrack = audio;
    }

    return state.soundtrack;
}

function stopSoundtrack(resetPosition = true) {
    if (!state.soundtrack) {
        return;
    }

    state.soundtrack.pause();

    if (resetPosition) {
        state.soundtrack.currentTime = 0;
    }
}

async function primeSoundtrackPlayback() {
    if (state.soundtrackPrimed || !soundtrackConfig.enabled || !soundtrackConfig.src) {
        return;
    }

    const audio = ensureSoundtrack();

    if (!audio) {
        return;
    }

    const originalVolume = audio.volume;

    try {
        audio.volume = 0.001;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        state.soundtrackPrimed = true;
    } catch (error) {
        console.warn("No pude preparar la pista de fondo.", error);
    } finally {
        audio.volume = originalVolume;
    }
}

async function playSoundtrackForLabel(label) {
    if (!shouldPlaySoundtrackForLabel(label)) {
        stopSoundtrack();
        return;
    }

    const audio = ensureSoundtrack();

    if (!audio) {
        return;
    }

    try {
        audio.currentTime = 0;
        await audio.play();
    } catch (error) {
        console.warn("No pude reproducir la pista de fondo.", error);
    }
}

function setStatus(message, type = "neutral") {
    statusText.textContent = message;
    document.getElementById("statusBar").dataset.state = type;
}

function normalizeText(value) {
    return (value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function buildCandidateImagePaths(imagePath) {
    if (!imagePath) {
        return [];
    }

    const extensionMatch = imagePath.match(/\.[a-z0-9]+$/i);

    if (!extensionMatch) {
        return [imagePath];
    }

    const extension = extensionMatch[0].toLowerCase();
    const basePath = imagePath.slice(0, -extension.length);
    const extensions = [extension, ".jpeg", ".jpg", ".png", ".webp"];

    return [...new Set(extensions.map((candidateExtension) => `${basePath}${candidateExtension}`))];
}

async function loadReferenceImage(imagePath) {
    const candidatePaths = buildCandidateImagePaths(imagePath);

    for (const candidatePath of candidatePaths) {
        try {
            return await faceapi.fetchImage(candidatePath);
        } catch (error) {
            console.warn(`No pude cargar ${candidatePath}`, error);
        }
    }

    return null;
}

function daysBetween(dateString) {
    if (!dateString) {
        return null;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const normalizedValue = String(dateString).trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);

    let targetDayNumber = null;

    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const monthIndex = Number(isoMatch[2]) - 1;
        const day = Number(isoMatch[3]);
        targetDayNumber = Math.floor(Date.UTC(year, monthIndex, day) / msPerDay);
    } else {
        const targetDate = new Date(normalizedValue);
        if (!Number.isFinite(targetDate.getTime())) {
            return null;
        }

        targetDayNumber = Math.floor(
            Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()) / msPerDay
        );
    }

    const now = new Date();
    const todayDayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / msPerDay);
    return targetDayNumber - todayDayNumber;
}

function toFiniteNumber(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function getValidCoordinates(candidate) {
    if (!candidate || typeof candidate !== "object") {
        return null;
    }

    const lat = toFiniteNumber(candidate.lat);
    const lon = toFiniteNumber(candidate.lon ?? candidate.lng);

    if (lat === null || lon === null) {
        return null;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return null;
    }

    return { lat, lon };
}

function haversineDistanceKm(origin, destination) {
    const earthRadiusKm = 6371;
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLon = ((destination.lon - origin.lon) * Math.PI) / 180;
    const originLatRad = (origin.lat * Math.PI) / 180;
    const destinationLatRad = (destination.lat * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(originLatRad) * Math.cos(destinationLatRad) * Math.sin(dLon / 2) ** 2;

    return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistanceKm(distanceKm, decimals = null) {
    const numberValue = toFiniteNumber(distanceKm);

    if (numberValue === null) {
        return "";
    }

    if (Number.isInteger(decimals) && decimals >= 0) {
        const safeDecimals = clamp(decimals, 0, 4);
        const factor = 10 ** safeDecimals;
        const rounded = Math.round(numberValue * factor) / factor;
        return rounded.toLocaleString("es-CO", {
            minimumFractionDigits: safeDecimals,
            maximumFractionDigits: safeDecimals
        });
    }

    const rounded = numberValue < 10 ? Math.round(numberValue * 10) / 10 : Math.round(numberValue);
    return rounded.toLocaleString("es-CO");
}

const distanceMetricState = {
    initialized: false,
    watchId: null,
    maxKm: 2000,
    targetCoords: null,
    elements: null
};

const timeMetricsState = {
    intervalId: null
};

function updateTimeMetrics() {
    const relationshipValue = document.getElementById("relationshipDaysValue");
    const nextMeetingValue = document.getElementById("nextMeetingDaysValue");
    const nextMeetingNote = document.getElementById("nextMeetingDaysNote");
    const heroCountdownValue = document.getElementById("heroCountdownValue");
    const heroCountdownUnit = document.getElementById("heroCountdownUnit");

    const relationshipDays = daysBetween(storyConfig.relationshipStart);
    const nextMeetingDays = daysBetween(storyConfig.nextMeeting);

    if (relationshipValue) {
        if (relationshipDays !== null) {
            relationshipValue.textContent = String(Math.abs(relationshipDays));
        }
    }

    if (nextMeetingValue) {
        if (nextMeetingDays !== null) {
            nextMeetingValue.textContent = nextMeetingDays > 0 ? String(nextMeetingDays) : "Hoy";

            if (nextMeetingNote) {
                nextMeetingNote.textContent =
                    nextMeetingDays > 0 ? "Cada dia que pasa nos acerca." : "Si ya llego este dia, corre a abrazarla.";
            }
        }
    }

    if (heroCountdownValue && heroCountdownUnit) {
        if (nextMeetingDays === null) {
            heroCountdownValue.textContent = "--";
            heroCountdownUnit.textContent = "dias";
        } else if (nextMeetingDays > 0) {
            heroCountdownValue.textContent = String(nextMeetingDays);
            heroCountdownUnit.textContent = nextMeetingDays === 1 ? "dia" : "dias";
        } else {
            heroCountdownValue.textContent = "Hoy";
            heroCountdownUnit.textContent = "";
        }
    }
}

function startTimeMetricsTicker() {
    updateTimeMetrics();

    if (timeMetricsState.intervalId !== null) {
        return;
    }

    timeMetricsState.intervalId = window.setInterval(updateTimeMetrics, 60 * 1000);
}

function stopTimeMetricsTicker() {
    if (timeMetricsState.intervalId === null) {
        return;
    }

    window.clearInterval(timeMetricsState.intervalId);
    timeMetricsState.intervalId = null;
}

function getDistanceFeatureConfig() {
    const distanceConfig = storyConfig.distance;
    return distanceConfig && typeof distanceConfig === "object" ? distanceConfig : {};
}

function getDistanceAccessLabel() {
    return window.sessionStorage.getItem("girasolPortalAccessLabel") || "";
}

function resolveDistancePair(accessLabel, distanceConfig) {
    const locations = distanceConfig?.locations && typeof distanceConfig.locations === "object" ? distanceConfig.locations : {};
    const labels = Object.keys(locations).filter(Boolean);

    if (!labels.length) {
        return {
            fromLabel: "",
            toLabel: "",
            fromCoords: null,
            toCoords: null
        };
    }

    const resolvedFromLabel = accessLabel && locations[accessLabel] ? accessLabel : locations.Mauricio ? "Mauricio" : labels[0];
    const resolvedToLabel = labels.find((label) => label !== resolvedFromLabel) || "";

    return {
        fromLabel: resolvedFromLabel,
        toLabel: resolvedToLabel,
        fromCoords: getValidCoordinates(locations[resolvedFromLabel]),
        toCoords: resolvedToLabel ? getValidCoordinates(locations[resolvedToLabel]) : null
    };
}

function setupDistanceMetricCard() {
    if (distanceMetricState.initialized) {
        return;
    }

    const card = document.querySelector("[data-metric='distance']");
    const value = document.getElementById("distanceMetricValue");
    const bar = document.getElementById("distanceMetricBar");
    const fill = document.getElementById("distanceMetricFill");
    const marker = document.getElementById("distanceMetricMarker");
    const fromLabel = document.getElementById("distanceMetricFrom");
    const toLabel = document.getElementById("distanceMetricTo");
    const button = document.getElementById("distanceLiveButton");
    const status = document.getElementById("distanceLiveStatus");

    if (!card || !value || !bar || !fill || !marker || !fromLabel || !toLabel || !button || !status) {
        return;
    }

    distanceMetricState.elements = {
        card,
        value,
        bar,
        fill,
        marker,
        fromLabel,
        toLabel,
        button,
        status
    };

    button.addEventListener("click", () => {
        if (distanceMetricState.watchId !== null) {
            stopLiveDistanceMetric();
            refreshDistanceMetricCard();
            return;
        }

        startLiveDistanceMetric();
    });

    distanceMetricState.initialized = true;
    refreshDistanceMetricCard();
}

function updateDistanceMetricBar(distanceKm, maxKm) {
    const elements = distanceMetricState.elements;
    const safeDistance = toFiniteNumber(distanceKm);

    if (!elements || safeDistance === null) {
        return;
    }

    const safeMax = Math.max(toFiniteNumber(maxKm) ?? 0, 1);
    const progressRatio = clamp(1 - safeDistance / safeMax, 0, 1);
    const percentage = progressRatio * 100;

    const isLive = distanceMetricState.watchId !== null;
    elements.value.textContent = isLive ? formatDistanceKm(safeDistance, 1) : formatDistanceKm(safeDistance);
    elements.bar.setAttribute("aria-valuemin", "0");
    elements.bar.setAttribute("aria-valuemax", String(Math.round(safeMax)));
    elements.bar.setAttribute("aria-valuenow", String(Math.round(safeDistance)));
    elements.fill.style.width = `${percentage}%`;
    elements.marker.style.left = `${percentage}%`;

    const markerTranslateY = "-90%";

    if (percentage <= 0.5) {
        elements.marker.style.transform = `translate(0, ${markerTranslateY})`;
    } else if (percentage >= 99.5) {
        elements.marker.style.transform = `translate(-100%, ${markerTranslateY})`;
    } else {
        elements.marker.style.transform = `translate(-50%, ${markerTranslateY})`;
    }
}

function refreshDistanceMetricCard(accessLabelOverride = "") {
    const elements = distanceMetricState.elements;

    if (!elements) {
        return;
    }

    const distanceConfig = getDistanceFeatureConfig();
    const distanceEnabled = distanceConfig.enabled !== false;
    const accessLabel = accessLabelOverride || getDistanceAccessLabel();
    const { fromLabel, toLabel, fromCoords, toCoords } = resolveDistancePair(accessLabel, distanceConfig);
    const fallbackDistance = toFiniteNumber(storyConfig.distanceKm);

    elements.fromLabel.textContent = "Yo";
    if (toLabel === "Valentina") {
        elements.toLabel.textContent = "Ella";
    } else if (toLabel === "Mauricio") {
        elements.toLabel.textContent = "Él";
    } else {
        elements.toLabel.textContent = "Tu";
    }

    const configuredMaxKm = toFiniteNumber(distanceConfig.maxKm);
    const resolvedMaxKm = Math.max(configuredMaxKm ?? 2000, fallbackDistance ?? 0, 50);
    distanceMetricState.maxKm = resolvedMaxKm;
    elements.bar.setAttribute("aria-label", "Distancia entre nosotros");

    const canUseGeo = Boolean(navigator.geolocation);
    const canStartLive = distanceEnabled && canUseGeo && Boolean(toLabel) && Boolean(toCoords);

    elements.button.disabled = !canStartLive;
    elements.button.textContent = distanceMetricState.watchId !== null ? "Detener ubicacion en vivo" : "Ubicacion en vivo";

    if (!distanceEnabled) {
        elements.status.textContent = "";
        return;
    }

    if (!canUseGeo) {
        elements.status.textContent = "Tu navegador no soporta ubicacion en vivo.";
    } else if (!toCoords) {
        elements.status.textContent = "Para activarlo, llena las coordenadas en config.js.";
    } else {
        elements.status.textContent = "Si quieres, lo puedo actualizar en vivo con tu ubicacion.";
    }

    if (distanceMetricState.watchId !== null) {
        return;
    }

    if (fromCoords && toCoords) {
        const computedDistance = haversineDistanceKm(fromCoords, toCoords);
        updateDistanceMetricBar(computedDistance, resolvedMaxKm);
        return;
    }

    if (fallbackDistance !== null) {
        updateDistanceMetricBar(fallbackDistance, resolvedMaxKm);
    }
}

function shouldAutoStartLiveDistanceOnEnter() {
    const distanceConfig = getDistanceFeatureConfig();
    return distanceConfig.autoStartLiveOnEnter === true;
}

function maybeAutoStartLiveDistance(accessLabelOverride = "") {
    if (!shouldAutoStartLiveDistanceOnEnter()) {
        return;
    }

    setupDistanceMetricCard();
    refreshDistanceMetricCard(accessLabelOverride);

    if (distanceMetricState.watchId !== null) {
        return;
    }

    const distanceConfig = getDistanceFeatureConfig();
    const distanceEnabled = distanceConfig.enabled !== false;

    if (!distanceEnabled) {
        return;
    }

    const { toCoords } = resolveDistancePair(accessLabelOverride || getDistanceAccessLabel(), distanceConfig);

    if (!toCoords || !navigator.geolocation) {
        return;
    }

    startLiveDistanceMetric();
}

function startLiveDistanceMetric() {
    const elements = distanceMetricState.elements;

    if (!elements) {
        return;
    }

    const distanceConfig = getDistanceFeatureConfig();
    const distanceEnabled = distanceConfig.enabled !== false;

    if (!distanceEnabled) {
        return;
    }

    if (!navigator.geolocation) {
        elements.status.textContent = "Tu navegador no soporta ubicacion en vivo.";
        return;
    }

    const accessLabel = getDistanceAccessLabel();
    const { toCoords } = resolveDistancePair(accessLabel, distanceConfig);

    if (!toCoords) {
        elements.status.textContent = "Para activarlo, llena las coordenadas en config.js.";
        return;
    }

    stopLiveDistanceMetric();

    distanceMetricState.targetCoords = toCoords;
    elements.card.classList.add("is-live");
    elements.button.textContent = "Detener ubicacion en vivo";
    elements.status.textContent = "Buscando tu ubicacion...";

    const watchOptions = {
        enableHighAccuracy: false,
        maximumAge: 15000,
        timeout: 15000
    };

    distanceMetricState.watchId = navigator.geolocation.watchPosition(
        (position) => {
            if (!distanceMetricState.targetCoords) {
                return;
            }

            const coords = position?.coords;
            const origin = coords
                ? {
                    lat: toFiniteNumber(coords.latitude),
                    lon: toFiniteNumber(coords.longitude)
                }
                : null;

            if (!origin || origin.lat === null || origin.lon === null) {
                return;
            }

            const distanceKm = haversineDistanceKm(
                { lat: origin.lat, lon: origin.lon },
                distanceMetricState.targetCoords
            );

            updateDistanceMetricBar(distanceKm, distanceMetricState.maxKm);

            const accuracyMeters = toFiniteNumber(coords.accuracy);
            elements.status.textContent = accuracyMeters !== null ? `En vivo · ±${Math.round(accuracyMeters)}m` : "En vivo";
        },
        (error) => {
            stopLiveDistanceMetric();

            if (error?.code === 1) {
                elements.status.textContent = "Permiso de ubicacion denegado.";
                return;
            }

            if (error?.code === 2) {
                elements.status.textContent = "No pude obtener tu ubicacion.";
                return;
            }

            if (error?.code === 3) {
                elements.status.textContent = "La ubicacion tardo demasiado.";
                return;
            }

            elements.status.textContent = "No pude activar la ubicacion en vivo.";
        },
        watchOptions
    );
}

function stopLiveDistanceMetric() {
    const elements = distanceMetricState.elements;

    if (distanceMetricState.watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(distanceMetricState.watchId);
    }

    distanceMetricState.watchId = null;
    distanceMetricState.targetCoords = null;

    if (elements) {
        elements.card.classList.remove("is-live");
        elements.button.textContent = "Ubicacion en vivo";
    }
}

function getAuthorizedProfile(label) {
    return (portalConfig.authorizedProfiles || []).find((profile) => profile.label === label) || null;
}

function getSecretAccess(labelOrPhrase) {
    const normalizedValue = normalizeText(labelOrPhrase);
    const secretEntries = Array.isArray(portalConfig.secretPhrases) ? portalConfig.secretPhrases : [];

    return secretEntries.find((entry) => normalizeText(entry.phrase) === normalizedValue) || null;
}

function getExperienceModeForLabel(label) {
    const profile = getAuthorizedProfile(label);

    return profile?.experienceMode || portalConfig.defaultExperienceMode || "full";
}

function shouldShowElementForMode(scope, mode) {
    if (!scope || mode === "full") {
        return true;
    }

    const allowedModes = String(scope)
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);

    return allowedModes.includes(mode) || allowedModes.includes("all");
}

function applyExperienceMode(accessLabel) {
    const mode = getExperienceModeForLabel(accessLabel);

    document.body.dataset.experienceMode = mode;

    scopedExperienceElements.forEach((element) => {
        const scope = element.dataset.experienceScope;
        element.classList.toggle("hidden", !shouldShowElementForMode(scope, mode));
    });
}

function buildWelcomeContent(label) {
    const profile = getAuthorizedProfile(label);

    if (!profile) {
        return {
            title: `Bienvenida, ${label}`,
            message: "El portal ya reconocio a la persona correcta."
        };
    }

    return {
        title: profile.welcomeTitle || `Bienvenida, ${profile.displayName || profile.label}`,
        message: profile.welcomeMessage || "El portal ya reconocio a la persona correcta."
    };
}

function getMuseumConfig() {
    return storyConfig.museum || {};
}

function isHttpUrl(value) {
    return /^https?:\/\//i.test(value || "");
}

function parseMuseumEntriesFromText(sourceText, museumConfig) {
    const lines = String(sourceText || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

    return lines.map((line, index) => {
        const segments = line.split("|").map((segment) => segment.trim()).filter(Boolean);
        const urlIndex = segments.findIndex((segment) => isHttpUrl(segment));
        const defaultEntry = {
            title: `Fucknews - archivo ${padSequenceNumber(index + 1)}`,
            series: museumConfig.seriesLabel || "Fucknews Fridays",
            note: museumConfig.defaultNote || "Otro viernes guardado en nuestro museo.",
            url: line
        };

        if (segments.length === 1 && isHttpUrl(segments[0])) {
            return {
                ...defaultEntry,
                url: segments[0]
            };
        }

        if (urlIndex !== -1) {
            return {
                ...defaultEntry,
                title: segments.slice(0, urlIndex).join(" | ") || defaultEntry.title,
                url: segments[urlIndex],
                note: segments.slice(urlIndex + 1).join(" | ") || defaultEntry.note
            };
        }

        return defaultEntry;
    });
}

async function loadMuseumEntries() {
    const museumConfig = getMuseumConfig();
    const inlineEntries = Array.isArray(museumConfig.entries) ? museumConfig.entries : [];
    const sortEntries = (entries, sourceOrder = "oldest-first") => {
        const normalizedEntries = [...entries];
        const wantsNewestFirst = museumConfig.reverseOrder !== false;
        const isNewestFirst = sourceOrder === "newest-first";

        if (wantsNewestFirst === isNewestFirst) {
            return normalizedEntries;
        }

        return normalizedEntries.reverse();
    };

    const loadAutomaticEntries = async () => {
        const autoFeedConfig = museumConfig.autoFeed || {};

        if (!autoFeedConfig.enabled || !autoFeedConfig.channelId) {
            return null;
        }

        try {
            const params = new URLSearchParams({
                channelId: autoFeedConfig.channelId,
                limit: String(autoFeedConfig.limit || 80),
                series: museumConfig.seriesLabel || "Fucknews Fridays",
                note: museumConfig.defaultNote || "Otro viernes guardado en nuestro museo."
            });
            const response = await fetch(`/.netlify/functions/youtube-feed?${params.toString()}`, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`No pude cargar el feed automatico: ${response.status}`);
            }

            const payload = await response.json();
            const entries = Array.isArray(payload.entries) ? payload.entries : [];

            return entries.length ? sortEntries(entries, "newest-first") : null;
        } catch (error) {
            console.warn("No pude cargar el feed automatico. Uso el archivo local como respaldo.", error);
            return null;
        }
    };

    const automaticEntries = await loadAutomaticEntries();

    if (automaticEntries?.length) {
        state.museumEntries = automaticEntries;
        return automaticEntries;
    }

    if (!museumConfig.source) {
        state.museumEntries = sortEntries(inlineEntries, "oldest-first");
        return state.museumEntries;
    }

    try {
        const response = await fetch(museumConfig.source, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`No pude leer ${museumConfig.source}: ${response.status}`);
        }

        const sourceText = await response.text();
        const parsedEntries = parseMuseumEntriesFromText(sourceText, museumConfig);
        state.museumEntries = sortEntries(parsedEntries.length ? parsedEntries : inlineEntries, "oldest-first");
        return state.museumEntries;
    } catch (error) {
        console.warn("No pude cargar el archivo del museo. Uso las entradas del config como respaldo.", error);
        state.museumEntries = sortEntries(inlineEntries, "oldest-first");
        return state.museumEntries;
    }
}

function renderMuseum(entries) {
    const museumConfig = getMuseumConfig();
    const museumStats = document.getElementById("museumStats");

    const chaptersCount = entries.length || 0;
    const chaptersNote = chaptersCount
        ? "La lista completa te la deje aparte."
        : "Cuando haya capitulos, aqui se van a ir sumando.";

    const ritualValue = museumConfig.frequencyLabel || "Cada viernes";
    const ritualNote = museumConfig.frequencyNote || "Ya es plan fijo entre tu y yo.";

    const teaserMessage = museumConfig.message || "";

    const yearsValue = museumConfig.yearsLabel || "3 años";
    const yearsNote = museumConfig.yearsNote || "Y espero que sigan siendo muchos mas.";

    const firstChapterLabel = padSequenceNumber(1);
    const lastChapterLabel = padSequenceNumber(Math.max(1, Math.min(Number(chaptersCount) || 1, 999)));

    if (museumStats) {
        museumStats.innerHTML = `
            <article class="museum-ritual-card glass">
                <p class="museum-ritual-eyebrow">El ritual</p>
                <div class="museum-ritual-body">
                    <div class="museum-ritual-copy">
                        <p class="museum-ritual-value">${escapeHtml(ritualValue)}</p>
                        <p class="museum-ritual-note">${escapeHtml(ritualNote)}</p>
                        ${teaserMessage ? `<p class="museum-ritual-message">${escapeHtml(teaserMessage)}</p>` : ""}
                    </div>
                    <div class="museum-ritual-visual" aria-hidden="true">
                        <svg class="museum-filmstrip" viewBox="0 0 280 140" focusable="false" aria-hidden="true">
                            <rect class="museum-filmstrip-body" x="10" y="24" width="260" height="92" rx="22" />
                            <rect class="museum-filmstrip-inner" x="16" y="30" width="248" height="80" rx="20" />
                            <g class="museum-filmstrip-holes">
                                <rect x="28" y="34" width="10" height="10" rx="3" />
                                <rect x="54" y="34" width="10" height="10" rx="3" />
                                <rect x="80" y="34" width="10" height="10" rx="3" />
                                <rect x="106" y="34" width="10" height="10" rx="3" />
                                <rect x="132" y="34" width="10" height="10" rx="3" />
                                <rect x="158" y="34" width="10" height="10" rx="3" />
                                <rect x="184" y="34" width="10" height="10" rx="3" />
                                <rect x="210" y="34" width="10" height="10" rx="3" />
                                <rect x="236" y="34" width="10" height="10" rx="3" />

                                <rect x="28" y="96" width="10" height="10" rx="3" />
                                <rect x="54" y="96" width="10" height="10" rx="3" />
                                <rect x="80" y="96" width="10" height="10" rx="3" />
                                <rect x="106" y="96" width="10" height="10" rx="3" />
                                <rect x="132" y="96" width="10" height="10" rx="3" />
                                <rect x="158" y="96" width="10" height="10" rx="3" />
                                <rect x="184" y="96" width="10" height="10" rx="3" />
                                <rect x="210" y="96" width="10" height="10" rx="3" />
                                <rect x="236" y="96" width="10" height="10" rx="3" />
                            </g>
                            <g class="museum-filmstrip-frames">
                                <rect class="museum-filmstrip-frame" x="66" y="52" width="70" height="40" rx="14" />
                                <path class="museum-filmstrip-play" d="M96 62v26l22-13z" />
                                <text class="museum-filmstrip-number" x="126" y="72" text-anchor="end">${escapeHtml(firstChapterLabel)}</text>
                                <rect class="museum-filmstrip-frame" x="152" y="52" width="70" height="40" rx="14" />
                                <path class="museum-filmstrip-play" d="M182 62v26l22-13z" />
                                <text class="museum-filmstrip-number" x="212" y="72" text-anchor="end">${escapeHtml(lastChapterLabel)}</text>
                            </g>
                        </svg>
                    </div>
                </div>
            </article>

            <div class="museum-stats-side">
                <article class="museum-stat glass">
                    <p class="museum-stat-value">${escapeHtml(chaptersCount || "0")}</p>
                    <p class="museum-stat-label">Capítulos guardados</p>
                    <p class="museum-stat-note">${escapeHtml(chaptersNote)}</p>
                </article>
                <article class="museum-stat glass">
                    <p class="museum-stat-value">${escapeHtml(yearsValue)}</p>
                    <p class="museum-stat-label">Historia guardada</p>
                    <p class="museum-stat-note">${escapeHtml(yearsNote)}</p>
                </article>
            </div>
        `;
    }

    if (museumGrid) {
        museumGrid.innerHTML = "";
        museumGrid.classList.add("hidden");
    }
}

async function renderStory() {
    gateTitle.textContent = portalConfig.title || gateTitle.textContent;
    gateCopy.textContent = portalConfig.intro || gateCopy.textContent;
    hintText.textContent = portalConfig.secretHint || "";

    document.getElementById("heroEyebrow").textContent = storyConfig.eyebrow || "";

    const heroTitle = document.getElementById("heroTitle");
    if (heroTitle) {
        heroTitle.innerHTML = buildHeroTitleHtml(storyConfig.title || "");
    }

    document.getElementById("heroMessage").textContent = storyConfig.message || "";
    document.getElementById("finalTitle").textContent = storyConfig.finalTitle || "";
    document.getElementById("finalMessage").textContent = storyConfig.finalMessage || "";

    const museumConfig = getMuseumConfig();
    const museumLaunchButton = document.getElementById("museumLaunchButton");

    document.getElementById("museumEyebrow").textContent = museumConfig.eyebrow || "Nuestros viernes";
    document.getElementById("museumTitle").textContent = museumConfig.title || "Los Fucknews que he visto contigo";
    const museumMessage = document.getElementById("museumMessage");
    if (museumMessage) {
        museumMessage.textContent = "";
    }

    const museumPill = document.getElementById("museumPill");
    if (museumPill) {
        museumPill.textContent = museumConfig.teaserPill || "Sala separada · ritual compartido · entrada especial";
    }

    if (museumLaunchButton) {
        museumLaunchButton.textContent = museumConfig.ctaLabel || "Entrar";
    }

    const arcadeConfig = storyConfig.arcade || {};
    const arcadeEyebrow = document.getElementById("arcadeEyebrow");
    const arcadeTitle = document.getElementById("arcadeTitle");
    const arcadeMessage = document.getElementById("arcadeMessage");
    const arcadePill = document.getElementById("arcadePill");
    const arcadeLaunchButton = document.getElementById("arcadeLaunchButton");

    if (arcadeEyebrow) {
        arcadeEyebrow.textContent = arcadeConfig.eyebrow || "Sala de juegos";
    }

    if (arcadeTitle) {
        arcadeTitle.textContent = arcadeConfig.title || "Un arcade para nosotros";
    }

    if (arcadeMessage) {
        arcadeMessage.textContent = arcadeConfig.message || "";
    }

    if (arcadePill) {
        arcadePill.textContent = arcadeConfig.teaserPill || "Arcade · multiplayer · noche de juegos";
    }

    if (arcadeLaunchButton) {
        arcadeLaunchButton.textContent = arcadeConfig.ctaLabel || "Entrar";
    }

    const metricsSection = document.getElementById("metricsSection");
    const relationshipDays = daysBetween(storyConfig.relationshipStart);
    const nextMeetingDays = daysBetween(storyConfig.nextMeeting);
    const metricCards = [];

    const heroFridaysValue = document.getElementById("heroFridaysValue");
    const heroFridaysNote = document.getElementById("heroFridaysNote");
    const heroEffectValue = document.getElementById("heroEffectValue");
    const heroEffectNote = document.getElementById("heroEffectNote");

    if (heroFridaysValue) {
        const wantsFucknews = /fucknews/i.test(`${museumConfig.title || ""} ${museumConfig.pageTitle || ""} ${museumConfig.previewTitle || ""}`);
        heroFridaysValue.textContent = wantsFucknews ? "F*cknews" : (museumConfig.seriesLabel || "Nuestros viernes");
    }

    if (heroFridaysNote) {
        heroFridaysNote.textContent = museumConfig.frequencyNote || "Ya se siente tradicion";
    }

    const effectMetric = Array.isArray(storyConfig.metrics)
        ? storyConfig.metrics.find((item) => item && (item.value ?? "") !== "" && (item.label ?? "") !== "")
        : null;

    if (heroEffectValue) {
        if (effectMetric?.value) {
            heroEffectValue.textContent = effectMetric.value;
        }
    }

    if (heroEffectNote) {
        if (effectMetric?.label) {
            heroEffectNote.textContent = effectMetric.label;
        }
    }

    if (relationshipDays !== null) {
        metricCards.push({
            type: "relationshipDays",
            label: "Dias desde que comenzo lo nuestro",
            value: Math.abs(relationshipDays),
            note: "Y todavia me sigues pareciendo una casualidad hermosa."
        });
    }

    if (nextMeetingDays !== null) {
        metricCards.push({
            type: "nextMeetingDays",
            label: "Dias para volvernos a ver",
            value: nextMeetingDays > 0 ? nextMeetingDays : "Hoy",
            note: nextMeetingDays > 0 ? "Cada dia que pasa nos acerca." : "Si ya llego este dia, corre a abrazarla."
        });
    }

    if (storyConfig.distanceKm) {
        metricCards.push({
            type: "distance",
            label: "Kilometros entre nosotros",
            value: storyConfig.distanceKm,
            note: "No son pocos, pero tampoco suficientes para apagar esto."
        });
    }

    (storyConfig.metrics || []).forEach((item) => metricCards.push(item));

    metricsSection.innerHTML = metricCards
        .map((item) => {
            if (item.type === "relationshipDays") {
                return `
                    <article class="metric-card glass" data-metric="relationship-days">
                        <p class="metric-value" id="relationshipDaysValue">${escapeHtml(item.value)}</p>
                        <p class="metric-label">${escapeHtml(item.label)}</p>
                        <p class="metric-note">${escapeHtml(item.note || "")}</p>
                    </article>
                `;
            }

            if (item.type === "nextMeetingDays") {
                return `
                    <article class="metric-card glass" data-metric="next-meeting-days">
                        <p class="metric-value" id="nextMeetingDaysValue">${escapeHtml(item.value)}</p>
                        <p class="metric-label">${escapeHtml(item.label)}</p>
                        <p class="metric-note" id="nextMeetingDaysNote">${escapeHtml(item.note || "")}</p>
                    </article>
                `;
            }

            if (item.type === "distance") {
                const rawValue = toFiniteNumber(item.value) ?? 0;

                return `
                    <article class="metric-card glass metric-distance" data-metric="distance">
                        <p class="metric-value"><span id="distanceMetricValue">${escapeHtml(formatDistanceKm(rawValue) || rawValue)}</span><span class="metric-unit">km</span></p>
                        <p class="metric-label">${escapeHtml(item.label)}</p>
                        <div class="metric-distance-bar" id="distanceMetricBar" role="progressbar" aria-valuemin="0" aria-valuenow="${escapeHtml(String(Math.round(rawValue)))}" aria-valuemax="${escapeHtml(String(Math.max(rawValue, 2000)))}">
                            <div class="metric-distance-track">
                                <div class="metric-distance-fill" id="distanceMetricFill"></div>
                                <div class="metric-distance-marker" id="distanceMetricMarker" aria-hidden="true">
                                    <svg class="metric-distance-marker-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                        <path d="M2.4 13.2L21.6 3.4 14.4 21.4 11.3 14.7 2.4 13.2Z" fill="currentColor" />
                                    </svg>
                                </div>
                            </div>
                            <div class="metric-distance-legend">
                                <span id="distanceMetricFrom">Yo</span>
                                <span id="distanceMetricTo">Tu</span>
                            </div>
                        </div>
                        <div class="metric-distance-actions">
                            <button class="ghost metric-action" id="distanceLiveButton" type="button">Ubicacion en vivo</button>
                            <p class="tiny metric-distance-status" id="distanceLiveStatus"></p>
                        </div>
                        <p class="metric-note">${escapeHtml(item.note || "")}</p>
                    </article>
                `;
            }

            return `
                <article class="metric-card glass">
                    <p class="metric-value">${escapeHtml(item.value)}</p>
                    <p class="metric-label">${escapeHtml(item.label)}</p>
                    <p class="metric-note">${escapeHtml(item.note || "")}</p>
                </article>
            `;
        })
        .join("");

    setupDistanceMetricCard();
    startTimeMetricsTicker();

    document.getElementById("timelineList").innerHTML = (storyConfig.timeline || [])
        .map(
            (item) => `
                <article class="timeline-item">
                    <p class="timeline-date">${item.date}</p>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </article>
            `
        )
        .join("");

    document.getElementById("reasonGrid").innerHTML = (storyConfig.reasons || [])
        .map(
            (reason, index) => `
                <article class="reason-card">
                    <span>${String(index + 1).padStart(2, "0")}</span>
                    <p>${reason}</p>
                </article>
            `
        )
        .join("");

    document.getElementById("letterGrid").innerHTML = (storyConfig.letters || [])
        .map(
            (letter, index) => `
                <details class="letter-card" ${index === 0 ? "open" : ""}>
                    <summary>
                        <span>${letter.title}</span>
                        <span class="letter-indicator">Abrir</span>
                    </summary>
                    <p>${letter.body}</p>
                </details>
            `
        )
        .join("");

    renderSoundtrackPlaylist();
    setupSoundtrackPlaylistPlayback();
    setupSoundtrackAddSongModal();

    renderMuseum(await loadMuseumEntries());
}

async function startCamera() {
    stopSoundtrack();
    cameraOverlay.innerHTML = "<p>Solicitando permiso para la camara...</p>";
    setStatus("Solicitando acceso a la camara...");

    try {
        if (state.stream) {
            state.stream.getTracks().forEach((track) => track.stop());
        }

        state.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        cameraVideo.srcObject = state.stream;
        cameraOverlay.innerHTML = "<p>Camara activa. Cuando estes listo, toma la foto.</p>";
        captureButton.disabled = false;
        setStatus("Camara lista.", "ready");
    } catch (error) {
        captureButton.disabled = true;
        cameraOverlay.innerHTML = "<p>No pude abrir la camara. Puedes intentarlo otra vez o usar la clave secreta.</p>";
        setStatus("No fue posible acceder a la camara.", "error");
        console.error(error);
    }
}

async function loadModels() {
    if (state.modelsReady || state.loadingStarted) {
        return;
    }

    state.loadingStarted = true;
    setStatus("Cargando modelo de reconocimiento...");

    const modelUrl = "https://justadudewhohacks.github.io/face-api.js/models";

    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);

        state.modelsReady = true;
        setStatus("Modelo cargado. Preparando rostros autorizados...");
    } catch (error) {
        setStatus("No pude cargar el modelo de reconocimiento.", "error");
        console.error(error);
        throw error;
    }
}

async function buildAuthorizedMatcher() {
    if (!state.modelsReady) {
        return null;
    }

    const profiles = portalConfig.authorizedProfiles || [];
    const labeledDescriptors = [];

    for (const profile of profiles) {
        const descriptors = [];

        for (const imagePath of profile.images || []) {
            try {
                const image = await loadReferenceImage(imagePath);

                if (!image) {
                    continue;
                }

                const detection = await faceapi
                    .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    descriptors.push(detection.descriptor);
                }
            } catch (error) {
                console.warn(`No pude procesar ${imagePath}`, error);
            }
        }

        if (descriptors.length) {
            labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(profile.label, descriptors));
        }
    }

    state.authorizedDescriptors = labeledDescriptors;

    if (!labeledDescriptors.length) {
        setStatus("No hay fotos de referencia validas. Revisa config.js y que las imagenes existan en assets/references.", "error");
        return null;
    }

    state.matcher = new faceapi.FaceMatcher(
        labeledDescriptors,
        portalConfig.recognitionThreshold || 0.52
    );
    setStatus("Listo para verificar el rostro.", "ready");
    return state.matcher;
}

async function initializePortal() {
    await renderStory();
    ensureSoundtrack();
    stopSoundtrack();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("Este navegador no soporta acceso a la camara.", "error");
        return;
    }

    try {
        await loadModels();
        await buildAuthorizedMatcher();
    } catch (error) {
        console.error(error);
    }

    await startCamera();
}

async function captureAndVerify() {
    if (!state.modelsReady) {
        setStatus("El modelo aun no esta listo.", "error");
        return;
    }

    await primeSoundtrackPlayback();

    const context = captureCanvas.getContext("2d");
    captureCanvas.width = cameraVideo.videoWidth || 720;
    captureCanvas.height = cameraVideo.videoHeight || 540;
    context.drawImage(cameraVideo, 0, 0, captureCanvas.width, captureCanvas.height);

    setStatus("Analizando rostro...");

    try {
        const detection = await faceapi
            .detectSingleFace(captureCanvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            setStatus("No detecte ningun rostro claro. Intenta otra foto.", "error");
            return;
        }

        if (!state.matcher) {
            setStatus("No hay perfiles configurados. Usa la clave secreta mientras agregas las fotos.", "error");
            return;
        }

        const bestMatch = state.matcher.findBestMatch(detection.descriptor);

        if (bestMatch.label !== "unknown") {
            const welcomeContent = buildWelcomeContent(bestMatch.label);
            grantAccess(`Acceso concedido: ${bestMatch.label}`, welcomeContent, bestMatch.label);
            return;
        }

        setStatus("Rostro no reconocido. Puedes intentar de nuevo o usar la clave.", "error");
    } catch (error) {
        setStatus("Hubo un problema al analizar la foto.", "error");
        console.error(error);
    }
}

function grantAccess(message, welcomeContent = null, accessLabel = "") {
    const resolvedAccessLabel = accessLabel || portalConfig.secretAccessLabel || "";

    setStatus(message, "ready");
    gateSection.classList.add("fade-out");
    window.sessionStorage.setItem("girasolPortalUnlocked", "true");
    window.sessionStorage.setItem("girasolPortalAccessLabel", resolvedAccessLabel);

    refreshDistanceMetricCard(resolvedAccessLabel);

    window.setTimeout(
        () => {
            maybeAutoStartLiveDistance(resolvedAccessLabel);
        },
        welcomeContent ? welcomeRevealDelay + 450 : 950
    );

    if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
    }

    applyExperienceMode(resolvedAccessLabel);
    playSoundtrackForLabel(resolvedAccessLabel);

    if (welcomeContent) {
        welcomeTitle.textContent = welcomeContent.title;
        welcomeMessage.textContent = welcomeContent.message;
        welcomeScreen.classList.remove("hidden");
        requestAnimationFrame(() => {
            welcomeScreen.classList.add("visible");
        });
    }

    window.setTimeout(() => {
        gateSection.classList.add("hidden");
        experienceSection.classList.remove("hidden");
        document.body.classList.add("unlocked");
        welcomeScreen.classList.remove("visible");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, welcomeContent ? welcomeRevealDelay : 700);

    if (welcomeContent) {
        window.setTimeout(() => {
            welcomeScreen.classList.add("hidden");
        }, welcomeRevealDelay + 400);
    }
}

retryCameraButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", captureAndVerify);

secretForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const attemptedSecret = normalizeText(secretInput.value);

    if (!attemptedSecret) {
        setStatus("Escribe la clave secreta.", "error");
        return;
    }

    const secretAccess = getSecretAccess(attemptedSecret);

    if (secretAccess) {
        const fallbackLabel = secretAccess.accessLabel || "";
        const fallbackWelcomeContent = fallbackLabel ? buildWelcomeContent(fallbackLabel) : null;

        grantAccess("Clave valida. Bienvenida al portal.", fallbackWelcomeContent, fallbackLabel);
        return;
    }

    setStatus("La clave no coincide.", "error");
});

window.addEventListener("beforeunload", () => {
    stopSoundtrack(false);
    stopLiveDistanceMetric();
    stopTimeMetricsTicker();
});

window.addEventListener("load", initializePortal);