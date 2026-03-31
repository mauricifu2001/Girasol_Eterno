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
    soundtrackPrimed: false
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
const welcomeRevealDelay = 2800;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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

function renderStory() {
    gateTitle.textContent = portalConfig.title || gateTitle.textContent;
    gateCopy.textContent = portalConfig.intro || gateCopy.textContent;
    hintText.textContent = portalConfig.secretHint || "";

    document.getElementById("heroEyebrow").textContent = storyConfig.eyebrow || "";
    document.getElementById("heroTitle").textContent = storyConfig.title || "";
    document.getElementById("heroMessage").textContent = storyConfig.message || "";
    document.getElementById("finalTitle").textContent = storyConfig.finalTitle || "";
    document.getElementById("finalMessage").textContent = storyConfig.finalMessage || "";

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
    renderStory();
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
});

window.addEventListener("load", initializePortal);