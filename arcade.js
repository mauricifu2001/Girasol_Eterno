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

const ROOM_SOUNDTRACK_SRC = "assets/audio/Mario_Kart_Music.mp3";
const ROOM_SOUNDTRACK_VOLUME = 0.16;

let roomSoundtrack = null;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function ensureRoomSoundtrack() {
    if (!roomSoundtrack) {
        const audio = new Audio(ROOM_SOUNDTRACK_SRC);
        audio.preload = "auto";
        audio.loop = true;
        audio.volume = clamp(Number(ROOM_SOUNDTRACK_VOLUME), 0, 1);
        roomSoundtrack = audio;
    }

    return roomSoundtrack;
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

function normalizeGames(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const url = typeof item.url === "string" ? item.url.trim() : "";
            return {
                title: typeof item.title === "string" ? item.title.trim() : "",
                note: typeof item.note === "string" ? item.note.trim() : "",
                tag: typeof item.tag === "string" ? item.tag.trim() : "",
                url
            };
        })
        .filter((item) => item.title && item.url);
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

            return `
                <a class="arcade-mini-card glass" href="${safeUrl}" target="_blank" rel="noopener">
                    <div class="arcade-mini-top">
                        <div class="arcade-mini-copy">
                            <h3 class="arcade-mini-title">${safeTitle}</h3>
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

    const games = normalizeGames(arcadeConfig.games);

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
    bindRoomSoundtrackAutoplay();
    renderArcade();
}

window.addEventListener("beforeunload", pauseRoomSoundtrack);
window.addEventListener("load", initializeArcadePage);
