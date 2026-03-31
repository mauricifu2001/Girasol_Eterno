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
    museumEntries: []
};

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
const closeVideoModalButton = document.getElementById("closeVideoModalButton");
const videoModal = document.getElementById("videoModal");
const videoModalFrame = document.getElementById("videoModalFrame");
const videoModalTitle = document.getElementById("videoModalTitle");
const welcomeRevealDelay = 2800;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function padSequenceNumber(value) {
    return String(value).padStart(3, "0");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, (character) => {
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

    const now = new Date();
    const target = new Date(dateString);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getAuthorizedProfile(label) {
    return (portalConfig.authorizedProfiles || []).find((profile) => profile.label === label) || null;
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
        const sequence = padSequenceNumber(index + 1);
        const segments = line.split("|").map((segment) => segment.trim()).filter(Boolean);
        const defaultEntry = {
            title: `Fucknews - archivo ${sequence}`,
            series: museumConfig.seriesLabel || "Fucknews Fridays",
            date: `Viernes ${sequence}`,
            note: museumConfig.defaultNote || "Otro viernes guardado en nuestro museo.",
            url: line
        };

        if (segments.length === 1 && isHttpUrl(segments[0])) {
            return {
                ...defaultEntry,
                url: segments[0]
            };
        }

        if (segments.length === 2 && isHttpUrl(segments[1])) {
            return {
                ...defaultEntry,
                title: segments[0] || defaultEntry.title,
                url: segments[1]
            };
        }

        if (segments.length >= 3 && isHttpUrl(segments[2])) {
            return {
                ...defaultEntry,
                date: segments[0] || defaultEntry.date,
                title: segments[1] || defaultEntry.title,
                url: segments[2],
                note: segments.slice(3).join(" | ") || defaultEntry.note
            };
        }

        return defaultEntry;
    });
}

async function loadMuseumEntries() {
    const museumConfig = getMuseumConfig();
    const inlineEntries = Array.isArray(museumConfig.entries) ? museumConfig.entries : [];

    if (!museumConfig.source) {
        state.museumEntries = inlineEntries;
        return inlineEntries;
    }

    try {
        const response = await fetch(museumConfig.source, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`No pude leer ${museumConfig.source}: ${response.status}`);
        }

        const sourceText = await response.text();
        const parsedEntries = parseMuseumEntriesFromText(sourceText, museumConfig);
        state.museumEntries = parsedEntries.length ? parsedEntries : inlineEntries;
        return state.museumEntries;
    } catch (error) {
        console.warn("No pude cargar el archivo del museo. Uso las entradas del config como respaldo.", error);
        state.museumEntries = inlineEntries;
        return inlineEntries;
    }
}

function formatMuseumDate(value) {
    if (!value) {
        return "Fecha pendiente";
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(parsedDate);
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
    if (!videoModal || videoModal.classList.contains("hidden")) {
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

function renderMuseum(entries) {
    const museumConfig = getMuseumConfig();

    document.getElementById("museumStats").innerHTML = [
        {
            value: entries.length || "0",
            label: "Capitulos guardados",
            note: entries.length ? "Cada uno puede abrirse desde aqui mismo." : "Cuando pegues links, esta cuenta sube sola."
        },
        {
            value: museumConfig.frequencyLabel || "Cada viernes",
            label: "Ritual",
            note: museumConfig.frequencyNote || "Ideal para registrar ese acto fijo que ya es tan de ustedes."
        },
        {
            value: museumConfig.yearsLabel || "3 anos",
            label: "Tiempo compartido",
            note: museumConfig.yearsNote || "Perfecto para que se sienta como archivo vivo y no como lista suelta."
        }
    ]
        .map(
            (item) => `
                <article class="museum-stat glass">
                    <p class="museum-stat-value">${escapeHtml(item.value)}</p>
                    <p class="museum-stat-label">${escapeHtml(item.label)}</p>
                    <p class="museum-stat-note">${escapeHtml(item.note)}</p>
                </article>
            `
        )
        .join("");

    if (!entries.length) {
        museumGrid.innerHTML = `
            <article class="museum-empty glass">
                <p class="eyebrow">Archivo esperando</p>
                <h3>Este museo queda listo para llenarlo con sus capitulos</h3>
                <p>Pega enlaces de YouTube en <strong>config.js</strong> o en el archivo fuente del museo y cada tarjeta sacara su miniatura automaticamente. Tambien puedes anotar la fecha, una frase y cualquier recuerdo de ese viernes.</p>
            </article>
        `;
        return;
    }

    museumGrid.innerHTML = entries
        .map((entry) => {
            const title = entry.title || "Capitulo compartido";
            const embedUrl = getYouTubeEmbedUrl(entry.url);
            const thumbnail = entry.coverImage || getYouTubeThumbnail(entry.url);
            const series = entry.series || museumConfig.seriesLabel || "Archivo compartido";
            const note = entry.note || "";
            const thumbContent = thumbnail
                ? `
                    <img src="${escapeHtml(thumbnail)}" alt="Caratula de ${escapeHtml(title)}" loading="lazy">
                    <span class="museum-play">${embedUrl ? "Ver aqui" : "Sin video"}</span>
                `
                : `
                    <div class="museum-placeholder-copy">
                        <strong>${escapeHtml(title)}</strong>
                        <span>Pega un link de YouTube para que aparezca la caratula automaticamente.</span>
                    </div>
                `;
            const thumbMarkup = embedUrl
                ? `
                    <button
                        class="museum-thumb museum-thumb-button"
                        type="button"
                        data-video-embed="${escapeHtml(embedUrl)}"
                        data-video-title="${escapeHtml(title)}"
                    >
                        ${thumbContent}
                    </button>
                `
                : `
                    <div class="museum-thumb museum-thumb-placeholder">
                        ${thumbContent}
                    </div>
                `;

            return `
                <article class="museum-card">
                    ${thumbMarkup}
                    <div class="museum-card-body">
                        <p class="museum-meta">
                            <span>${escapeHtml(series)}</span>
                            <span>${escapeHtml(formatMuseumDate(entry.date))}</span>
                        </p>
                        <h3>${escapeHtml(title)}</h3>
                        <p class="museum-note">${escapeHtml(note)}</p>
                        <div class="museum-actions">
                            ${embedUrl ? `<button class="ghost museum-watch-button" type="button" data-video-embed="${escapeHtml(embedUrl)}" data-video-title="${escapeHtml(title)}">Ver dentro de la pagina</button>` : ""}
                            ${entry.url ? `<a class="secondary museum-link" href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer noopener">Abrir enlace</a>` : ""}
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");
}

async function renderStory() {
    gateTitle.textContent = portalConfig.title || gateTitle.textContent;
    gateCopy.textContent = portalConfig.intro || gateCopy.textContent;
    hintText.textContent = portalConfig.secretHint || "";

    document.getElementById("heroEyebrow").textContent = storyConfig.eyebrow || "";
    document.getElementById("heroTitle").textContent = storyConfig.title || "";
    document.getElementById("heroMessage").textContent = storyConfig.message || "";
    document.getElementById("finalTitle").textContent = storyConfig.finalTitle || "";
    document.getElementById("finalMessage").textContent = storyConfig.finalMessage || "";

    const museumConfig = getMuseumConfig();

    document.getElementById("museumEyebrow").textContent = museumConfig.eyebrow || "Museo compartido";
    document.getElementById("museumTitle").textContent = museumConfig.title || "Los shows que hemos visto juntos";
    document.getElementById("museumMessage").textContent = museumConfig.message || "";

    const metricsSection = document.getElementById("metricsSection");
    const relationshipDays = daysBetween(storyConfig.relationshipStart);
    const nextMeetingDays = daysBetween(storyConfig.nextMeeting);
    const metricCards = [];

    if (relationshipDays !== null) {
        metricCards.push({
            label: "Dias desde que comenzo lo nuestro",
            value: Math.abs(relationshipDays),
            note: "Y todavia me sigues pareciendo una casualidad hermosa."
        });
    }

    if (nextMeetingDays !== null) {
        metricCards.push({
            label: "Dias para volvernos a ver",
            value: nextMeetingDays > 0 ? nextMeetingDays : "Hoy",
            note: nextMeetingDays > 0 ? "Cada dia que pasa nos acerca." : "Si ya llego este dia, corre a abrazarla."
        });
    }

    if (storyConfig.distanceKm) {
        metricCards.push({
            label: "Kilometros entre nosotros",
            value: storyConfig.distanceKm,
            note: "No son pocos, pero tampoco suficientes para apagar esto."
        });
    }

    (storyConfig.metrics || []).forEach((item) => metricCards.push(item));

    metricsSection.innerHTML = metricCards
        .map(
            (item) => `
                <article class="metric-card glass">
                    <p class="metric-value">${item.value}</p>
                    <p class="metric-label">${item.label}</p>
                    <p class="metric-note">${item.note || ""}</p>
                </article>
            `
        )
        .join("");

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

    document.getElementById("playlistList").innerHTML = (storyConfig.playlist || [])
        .map(
            (song) => `
                <a class="song-card" href="${song.url}" target="_blank" rel="noreferrer noopener">
                    <div>
                        <p class="song-title">${song.title}</p>
                        <p class="song-artist">${song.artist}</p>
                    </div>
                    <span>Escuchar</span>
                </a>
            `
        )
        .join("");

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
    setStatus(message, "ready");
    gateSection.classList.add("fade-out");

    if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
    }

    playSoundtrackForLabel(accessLabel);

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

museumGrid.addEventListener("click", (event) => {
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

secretForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const secretPhrase = normalizeText(portalConfig.secretPhrase);
    const attemptedSecret = normalizeText(secretInput.value);

    if (!attemptedSecret) {
        setStatus("Escribe la clave secreta.", "error");
        return;
    }

    if (attemptedSecret === secretPhrase) {
        grantAccess("Clave valida. Bienvenida al portal.");
        return;
    }

    setStatus("La clave no coincide.", "error");
});

window.addEventListener("beforeunload", () => {
    stopSoundtrack(false);
    closeVideoModal();
});

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeVideoModal();
    }
});

window.addEventListener("load", initializePortal);