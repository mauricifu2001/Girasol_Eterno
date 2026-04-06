const config = window.appConfig || {};
const storyConfig = config.story || {};
const arcadeConfig = storyConfig.arcade || {};

const pageEyebrow = document.getElementById("arcadePageEyebrow");
const pageTitle = document.getElementById("arcadePageTitle");
const pageMessage = document.getElementById("arcadePageMessage");
const backLink = document.getElementById("arcadeBackLink");
const stage = document.getElementById("arcadeStage");
const grid = document.getElementById("arcadeGrid");
const emptyState = document.getElementById("arcadeEmpty");
const roomVolumeSlider = document.getElementById("roomVolumeSlider");
const addGameButton = document.getElementById("arcadeAddButton");
const gameModal = document.getElementById("gameModal");
const gameModalForm = document.getElementById("gameModalForm");
const gameTitleInput = document.getElementById("gameTitleInput");
const gameUrlInput = document.getElementById("gameUrlInput");
const gameTagInput = document.getElementById("gameTagInput");
const gameNoteInput = document.getElementById("gameNoteInput");
const gameModalStatus = document.getElementById("gameModalStatus");
const closeGameModalButton = document.getElementById("closeGameModalButton");
const cancelGameButton = document.getElementById("cancelGameButton");

const ROOM_SOUNDTRACK_SRC = "assets/audio/Mario_Kart_Music.mp3";
const ROOM_SOUNDTRACK_VOLUME = 0.16;

const ARCADE_GAMES_STORAGE_KEY = "girasolArcadeGames";
const ARCADE_HIDDEN_GAMES_STORAGE_KEY = "girasolArcadeHiddenGames";

let roomSoundtrack = null;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updateRoomVolumeFill() {
    if (!roomVolumeSlider) {
        return;
    }

    const max = Number(roomVolumeSlider.max) || 100;
    const value = Number(roomVolumeSlider.value) || 0;
    const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
    roomVolumeSlider.style.setProperty("--progress", `${percent}%`);
}

function getDesiredRoomSoundtrackVolume() {
    if (!roomVolumeSlider) {
        return clamp(Number(ROOM_SOUNDTRACK_VOLUME), 0, 1);
    }

    const max = Number(roomVolumeSlider.max) || 100;
    const value = Number(roomVolumeSlider.value);

    if (!Number.isFinite(value) || max <= 0) {
        return clamp(Number(ROOM_SOUNDTRACK_VOLUME), 0, 1);
    }

    return clamp(value / max, 0, 1);
}

function ensureRoomSoundtrack() {
    if (!roomSoundtrack) {
        const audio = new Audio(ROOM_SOUNDTRACK_SRC);
        audio.preload = "auto";
        audio.loop = true;
        roomSoundtrack = audio;
    }

    roomSoundtrack.volume = getDesiredRoomSoundtrackVolume();

    return roomSoundtrack;
}

function bindRoomVolumeSlider() {
    if (!roomVolumeSlider || roomVolumeSlider.dataset.bound === "true") {
        return;
    }

    roomVolumeSlider.value = String(Math.round(clamp(Number(ROOM_SOUNDTRACK_VOLUME), 0, 1) * 100));
    updateRoomVolumeFill();

    roomVolumeSlider.addEventListener("input", () => {
        updateRoomVolumeFill();
        ensureRoomSoundtrack();
    });

    roomVolumeSlider.dataset.bound = "true";
}

async function playRoomSoundtrack() {
    const audio = ensureRoomSoundtrack();

    try {
        await audio.play();
        return true;
    } catch (error) {
        console.warn("No pude reproducir la musica de la sala.", error);
        return false;
    }
}

function pauseRoomSoundtrack() {
    if (!roomSoundtrack) {
        return;
    }

    roomSoundtrack.pause();
}

function bindRoomSoundtrackAutoplay() {
    const attempt = () => {
        playRoomSoundtrack().then((played) => {
            if (!played) {
                return;
            }

            window.removeEventListener("pointerdown", attempt);
            window.removeEventListener("keydown", attempt);
        });
    };

    window.addEventListener("pointerdown", attempt, { passive: true });
    window.addEventListener("keydown", attempt);
    attempt();
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

function normalizeGameUrl(rawUrl) {
    const text = String(rawUrl || "").trim();

    if (!text) {
        return null;
    }

    try {
        const url = new URL(text);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }

        url.hash = "";
        return url.toString();
    } catch (error) {
        return null;
    }
}

function getGameUrlKey(rawUrl) {
    const normalized = normalizeGameUrl(rawUrl);
    if (!normalized) {
        return null;
    }

    try {
        const url = new URL(normalized);
        const host = url.host.toLowerCase();
        const protocol = url.protocol.toLowerCase();
        const search = url.search;
        const pathname = url.pathname.replace(/\/+$/, "") || "/";
        return `${protocol}//${host}${pathname}${search}`;
    } catch (error) {
        return null;
    }
}

function getStoredArcadeGames() {
    try {
        const raw = window.localStorage.getItem(ARCADE_GAMES_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((item) => item && typeof item === "object")
            .map((item) => {
                const url = normalizeGameUrl(item.url);

                return {
                    title: String(item.title || "").trim(),
                    note: String(item.note || "").trim(),
                    tag: String(item.tag || "").trim(),
                    url: url || ""
                };
            })
            .filter((item) => item.title && item.url);
    } catch (error) {
        return [];
    }
}

function setStoredArcadeGames(items) {
    try {
        window.localStorage.setItem(ARCADE_GAMES_STORAGE_KEY, JSON.stringify(items || []));
    } catch (error) {
    }
}

function getHiddenArcadeGameKeys() {
    try {
        const raw = window.localStorage.getItem(ARCADE_HIDDEN_GAMES_STORAGE_KEY);
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

function setHiddenArcadeGameKeys(keys) {
    try {
        window.localStorage.setItem(ARCADE_HIDDEN_GAMES_STORAGE_KEY, JSON.stringify(keys || []));
    } catch (error) {
    }
}

function unhideArcadeGameKey(key) {
    if (!key) {
        return;
    }

    const hiddenKeys = getHiddenArcadeGameKeys();
    const nextHidden = hiddenKeys.filter((entry) => entry !== key);

    if (nextHidden.length !== hiddenKeys.length) {
        setHiddenArcadeGameKeys(nextHidden);
    }
}

function normalizeGames(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const url = normalizeGameUrl(item.url);
            return {
                title: typeof item.title === "string" ? item.title.trim() : "",
                note: typeof item.note === "string" ? item.note.trim() : "",
                tag: typeof item.tag === "string" ? item.tag.trim() : "",
                url: url || ""
            };
        })
        .filter((item) => item.title && item.url);
}

function getCombinedArcadeGames() {
    const hiddenKeys = new Set(getHiddenArcadeGameKeys());

    const baseGames = normalizeGames(arcadeConfig.games)
        .map((game) => ({
            ...game,
            source: "base"
        }));

    const storedGames = getStoredArcadeGames()
        .map((game) => ({
            ...game,
            source: "stored"
        }));

    const byKey = new Map();

    const addToMap = (game) => {
        const key = getGameUrlKey(game.url);
        if (!key || hiddenKeys.has(key)) {
            return;
        }

        byKey.set(key, { ...game, key });
    };

    baseGames.forEach(addToMap);
    storedGames.forEach(addToMap);

    return Array.from(byKey.values());
}

function renderGames(games) {
    if (!grid) {
        return;
    }

    if (!games.length) {
        grid.innerHTML = "";
        grid.classList.add("hidden");
        return;
    }

    grid.classList.remove("hidden");
    grid.innerHTML = games
        .map((game) => {
            const safeTitle = escapeHtml(game.title);
            const safeNote = escapeHtml(game.note);
            const safeTag = escapeHtml(game.tag);
            const safeUrl = escapeHtml(game.url);
            const safeKey = escapeHtml(game.key || getGameUrlKey(game.url) || "");
            const safeSource = escapeHtml(game.source || "base");

            return `
                <a
                    class="arcade-mini-card glass"
                    href="${safeUrl}"
                    target="_blank"
                    rel="noopener"
                    data-arcade-url="${safeUrl}"
                    data-arcade-key="${safeKey}"
                    data-arcade-source="${safeSource}"
                >
                    <div class="arcade-mini-top">
                        <div class="arcade-mini-copy">
                            <div class="arcade-mini-head">
                                <h3 class="arcade-mini-title">${safeTitle}</h3>
                                <button class="ghost soundtrack-remove arcade-game-remove" type="button" data-arcade-action="remove" aria-label="Quitar este juego">Quitar</button>
                            </div>
                            ${safeNote ? `<p class="arcade-mini-note">${safeNote}</p>` : ""}
                        </div>
                        <span class="arcade-mini-icon" aria-hidden="true"></span>
                    </div>
                    ${safeTag ? `<span class="arcade-mini-badge">${safeTag}</span>` : ""}
                </a>
            `;
        })
        .join("");
}

function setGameModalStatus(message = "") {
    if (gameModalStatus) {
        gameModalStatus.textContent = message;
    }
}

function openGameModal() {
    if (!gameModal || gameModal.classList.contains("visible")) {
        return;
    }

    setGameModalStatus("");

    if (gameTitleInput) {
        gameTitleInput.value = "";
    }

    if (gameUrlInput) {
        gameUrlInput.value = "";
    }

    if (gameTagInput) {
        gameTagInput.value = "";
    }

    if (gameNoteInput) {
        gameNoteInput.value = "";
    }

    gameModal.classList.remove("hidden");
    gameModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    requestAnimationFrame(() => {
        gameModal.classList.add("visible");
    });

    window.setTimeout(() => {
        gameTitleInput?.focus();
    }, 0);
}

function closeGameModal() {
    if (!gameModal || gameModal.classList.contains("hidden")) {
        return;
    }

    gameModal.classList.remove("visible");
    gameModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    window.setTimeout(() => {
        gameModal.classList.add("hidden");
    }, 220);
}

function removeGameFromStorage({ key, source }) {
    if (!key) {
        return;
    }

    if (source === "stored") {
        const stored = getStoredArcadeGames();
        const nextStored = stored.filter((game) => getGameUrlKey(game.url) !== key);
        setStoredArcadeGames(nextStored);
        return;
    }

    const hiddenKeys = getHiddenArcadeGameKeys();
    if (!hiddenKeys.includes(key)) {
        setHiddenArcadeGameKeys([...hiddenKeys, key]);
    }
}

function setupArcadeEditor() {
    if (document.body.dataset.arcadeEditorBound === "true") {
        return;
    }

    if (addGameButton) {
        addGameButton.addEventListener("click", openGameModal);
    }

    if (closeGameModalButton) {
        closeGameModalButton.addEventListener("click", closeGameModal);
    }

    if (cancelGameButton) {
        cancelGameButton.addEventListener("click", closeGameModal);
    }

    if (gameModal) {
        gameModal.addEventListener("click", (event) => {
            if (event.target === gameModal || event.target?.dataset?.closeGame === "true") {
                closeGameModal();
            }
        });
    }

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeGameModal();
        }
    });

    if (gameModalForm) {
        gameModalForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const title = String(gameTitleInput?.value || "").trim();
            const note = String(gameNoteInput?.value || "").trim();
            const tag = String(gameTagInput?.value || "").trim();
            const normalizedUrl = normalizeGameUrl(gameUrlInput?.value);

            if (!title) {
                setGameModalStatus("Escribe un nombre para el juego.");
                return;
            }

            if (!normalizedUrl) {
                setGameModalStatus("Ese link no parece valido. Usa un enlace http(s). ");
                return;
            }

            const key = getGameUrlKey(normalizedUrl);
            if (!key) {
                setGameModalStatus("No pude validar ese link. Intenta con otro.");
                return;
            }

            unhideArcadeGameKey(key);

            const stored = getStoredArcadeGames();
            const nextStored = [];
            let replaced = false;

            stored.forEach((game) => {
                if (getGameUrlKey(game.url) === key) {
                    nextStored.push({ title, note, tag, url: normalizedUrl });
                    replaced = true;
                    return;
                }

                nextStored.push(game);
            });

            if (!replaced) {
                nextStored.push({ title, note, tag, url: normalizedUrl });
            }

            setStoredArcadeGames(nextStored);
            closeGameModal();
            renderArcade();
        });
    }

    if (grid) {
        grid.addEventListener("click", (event) => {
            const removeTrigger = event.target.closest('[data-arcade-action="remove"]');
            if (!removeTrigger) {
                return;
            }

            const card = removeTrigger.closest("[data-arcade-key]");
            if (!card) {
                return;
            }

            event.preventDefault();

            removeGameFromStorage({
                key: card.dataset.arcadeKey || "",
                source: card.dataset.arcadeSource || "base"
            });

            renderArcade();
        });
    }

    document.body.dataset.arcadeEditorBound = "true";
}

function renderArcade() {
    if (pageEyebrow) {
        pageEyebrow.textContent = arcadeConfig.pageEyebrow || arcadeConfig.eyebrow || "Sala de juegos";
    }

    if (pageTitle) {
        pageTitle.textContent = arcadeConfig.pageTitle || arcadeConfig.title || "Arcade de nosotros";
    }

    if (pageMessage) {
        pageMessage.textContent = arcadeConfig.pageMessage || arcadeConfig.message || "";
    }

    if (backLink) {
        backLink.textContent = arcadeConfig.backLabel || "Volver";
    }

    setupArcadeEditor();
    const games = getCombinedArcadeGames();

    if (!stage) {
        return;
    }

    if (!games.length) {
        if (grid) {
            grid.innerHTML = "";
            grid.classList.remove("hidden");
        }

        stage.classList.add("hidden");
        if (emptyState) {
            emptyState.classList.remove("hidden");
        }
        return;
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    stage.classList.remove("hidden");
    stage.classList.toggle("is-solo", games.length === 1);

    renderGames(games);
}

function initializeArcadePage() {
    bindRoomVolumeSlider();
    bindRoomSoundtrackAutoplay();
    renderArcade();
}

window.addEventListener("beforeunload", pauseRoomSoundtrack);
window.addEventListener("load", initializeArcadePage);
