const config = window.appConfig || {};
const storyConfig = config.story || {};
const museumConfig = storyConfig.museum || {};

const posterGrid = document.getElementById("posterGrid");
const headlineRow = document.getElementById("museumHeadlineRow");
const archiveCount = document.getElementById("museumArchiveCount");
const archiveLabel = document.getElementById("museumArchiveLabel");
const archiveNote = document.getElementById("museumArchiveNote");
const pageEyebrow = document.getElementById("museumPageEyebrow");
const pageTitle = document.getElementById("museumPageTitle");
const pageMessage = document.getElementById("museumPageMessage");
const videoModal = document.getElementById("videoModal");
const videoModalFrame = document.getElementById("videoModalFrame");
const videoModalTitle = document.getElementById("videoModalTitle");
const closeVideoModalButton = document.getElementById("closeVideoModalButton");

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

function isHttpUrl(value) {
    return /^https?:\/\//i.test(value || "");
}

function padSequenceNumber(value) {
    return String(value).padStart(3, "0");
}

function parseMuseumEntriesFromText(sourceText, sourceConfig) {
    const lines = String(sourceText || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

    return lines.map((line, index) => {
        const segments = line.split("|").map((segment) => segment.trim()).filter(Boolean);
        const urlIndex = segments.findIndex((segment) => isHttpUrl(segment));
        const defaultEntry = {
            title: `Fucknews - archivo ${padSequenceNumber(index + 1)}`,
            series: sourceConfig.seriesLabel || "Fucknews Fridays",
            note: sourceConfig.defaultNote || "Otro viernes guardado en nuestro museo.",
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
    const inlineEntries = Array.isArray(museumConfig.entries) ? museumConfig.entries : [];

    if (!museumConfig.source) {
        return inlineEntries;
    }

    try {
        const response = await fetch(museumConfig.source, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`No pude leer ${museumConfig.source}: ${response.status}`);
        }

        const sourceText = await response.text();
        const parsedEntries = parseMuseumEntriesFromText(sourceText, museumConfig);
        return parsedEntries.length ? parsedEntries : inlineEntries;
    } catch (error) {
        console.warn("No pude cargar el archivo de capitulos. Uso las entradas del config como respaldo.", error);
        return inlineEntries;
    }
}

function getYouTubeVideoId(url) {
    if (!url) {
        return "";
    }

    try {
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

        if (host === "youtu.be") {
            return parsedUrl.pathname.slice(1).split("/")[0];
        }

        if (host === "youtube.com" || host === "m.youtube.com") {
            if (parsedUrl.pathname === "/watch") {
                return parsedUrl.searchParams.get("v") || "";
            }

            if (parsedUrl.pathname.startsWith("/embed/") || parsedUrl.pathname.startsWith("/shorts/")) {
                return parsedUrl.pathname.split("/")[2] || "";
            }
        }
    } catch (error) {
        return "";
    }

    return "";
}

function getYouTubeThumbnail(url) {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
}

function getYouTubeEmbedUrl(url) {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : "";
}

function openVideoModal(embedUrl, title) {
    if (!embedUrl) {
        return;
    }

    videoModalTitle.textContent = title || "Nuestro capitulo";
    videoModalFrame.src = embedUrl;
    videoModal.classList.remove("hidden");
    videoModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    requestAnimationFrame(() => {
        videoModal.classList.add("visible");
    });
}

function closeVideoModal() {
    if (videoModal.classList.contains("hidden")) {
        return;
    }

    videoModal.classList.remove("visible");
    videoModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    window.setTimeout(() => {
        videoModal.classList.add("hidden");
        videoModalFrame.src = "";
    }, 220);
}

function renderEmptyState() {
    posterGrid.innerHTML = `
        <article class="cinema-empty">
            <p class="eyebrow">Sala esperando</p>
            <h3>Todavia no hay capitulos en cartelera</h3>
            <p>En cuanto haya enlaces en el archivo del museo, esta sala se llenara sola con todos los episodios.</p>
        </article>
    `;
}

function renderMuseumPage(entries) {
    pageEyebrow.textContent = museumConfig.pageEyebrow || museumConfig.eyebrow || "Cartelera privada";
    pageTitle.textContent = museumConfig.pageTitle || museumConfig.title || "La sala de nuestros viernes con Fucknews";
    pageMessage.textContent = museumConfig.pageMessage || museumConfig.message || "";
    archiveCount.textContent = String(entries.length || 0);
    archiveLabel.textContent = museumConfig.pageStatLabel || "Capitulos en cartelera";
    archiveNote.textContent = museumConfig.pageStatNote || "Cada titulo sale del archivo que me compartiste.";

    headlineRow.innerHTML = entries.slice(0, 10)
        .map((entry) => `<span class="cinema-chip">${escapeHtml(entry.title || "Capitulo compartido")}</span>`)
        .join("");

    if (!entries.length) {
        renderEmptyState();
        return;
    }

    posterGrid.innerHTML = entries
        .map((entry, index) => {
            const title = entry.title || `Fucknews - archivo ${padSequenceNumber(index + 1)}`;
            const thumbnail = entry.coverImage || getYouTubeThumbnail(entry.url);
            const embedUrl = getYouTubeEmbedUrl(entry.url);
            const note = entry.note || museumConfig.defaultNote || "Otro viernes guardado en nuestro museo.";
            const series = entry.series || museumConfig.seriesLabel || "Archivo compartido";

            return `
                <article class="poster-card">
                    <button class="poster-thumb" type="button" data-video-embed="${escapeHtml(embedUrl)}" data-video-title="${escapeHtml(title)}">
                        ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="Caratula de ${escapeHtml(title)}" loading="lazy">` : ""}
                        <span class="poster-badge">Ver capitulo</span>
                    </button>
                    <div class="poster-body">
                        <p class="poster-topline">
                            <span>${escapeHtml(series)}</span>
                            <span>${padSequenceNumber(index + 1)}</span>
                        </p>
                        <h3>${escapeHtml(title)}</h3>
                        <p class="poster-note">${escapeHtml(note)}</p>
                        <div class="poster-actions">
                            <button class="ghost poster-open-button" type="button" data-video-embed="${escapeHtml(embedUrl)}" data-video-title="${escapeHtml(title)}">Ver dentro de la sala</button>
                            <a class="secondary poster-link" href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer noopener">Abrir en YouTube</a>
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");
}

function ensureAccess() {
    if (window.sessionStorage.getItem("girasolPortalUnlocked") === "true") {
        return true;
    }

    window.location.replace("index.html");
    return false;
}

async function initializeMuseumPage() {
    if (!ensureAccess()) {
        return;
    }

    renderMuseumPage(await loadMuseumEntries());
}

posterGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-video-embed]");

    if (!trigger) {
        return;
    }

    openVideoModal(trigger.dataset.videoEmbed, trigger.dataset.videoTitle || "Nuestro capitulo");
});

closeVideoModalButton.addEventListener("click", closeVideoModal);

videoModal.addEventListener("click", (event) => {
    if (event.target === videoModal || event.target.dataset.closeVideo === "true") {
        closeVideoModal();
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeVideoModal();
    }
});

window.addEventListener("beforeunload", closeVideoModal);
window.addEventListener("load", initializeMuseumPage);