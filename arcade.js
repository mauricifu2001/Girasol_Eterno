const config = window.appConfig || {};
const storyConfig = config.story || {};
const arcadeConfig = storyConfig.arcade || {};

const pageEyebrow = document.getElementById("arcadePageEyebrow");
const pageTitle = document.getElementById("arcadePageTitle");
const pageMessage = document.getElementById("arcadePageMessage");
const backLink = document.getElementById("arcadeBackLink");
const grid = document.getElementById("arcadeGrid");
const emptyState = document.getElementById("arcadeEmpty");

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

    if (!grid) {
        return;
    }

    if (!games.length) {
        grid.innerHTML = "";
        if (emptyState) {
            emptyState.classList.remove("hidden");
        }
        return;
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    grid.innerHTML = games
        .map((game) => {
            const safeTitle = escapeHtml(game.title);
            const safeNote = escapeHtml(game.note);
            const safeTag = escapeHtml(game.tag);
            const safeUrl = escapeHtml(game.url);

            return `
                <article class="arcade-card glass">
                    <div class="arcade-card-top">
                        <div class="arcade-card-head">
                            ${safeTag ? `<span class="arcade-tag">${safeTag}</span>` : ""}
                            <h3 class="arcade-title">${safeTitle}</h3>
                        </div>
                        <a class="primary arcade-open" href="${safeUrl}" target="_blank" rel="noopener">Abrir</a>
                    </div>
                    ${safeNote ? `<p class="arcade-note">${safeNote}</p>` : ""}
                </article>
            `;
        })
        .join("");
}

window.addEventListener("load", renderArcade);
