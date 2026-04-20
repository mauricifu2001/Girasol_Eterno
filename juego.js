import * as THREE from "./vendor/three.module.js";
import { PointerLockControls } from "./vendor/PointerLockControls.js";

function clampInt(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, Math.round(value)));
}

const WORLD_MAX_Y = 48;
const CHUNK_SIZE = 16;
const CHUNK_MANAGEMENT_INTERVAL = 0.22;
const CHUNK_REBUILD_BUDGET_PER_FRAME = 2;
const INITIAL_CHUNK_BUILD_BUDGET = 10;
const CLOUD_EDIT_WRITE_BATCH_MS = 220;
const CLOUD_EDIT_RETRY_MS = 1200;
const SEA_LEVEL = 14;
const CLOUD_COUNT = 22;
const RABBIT_MAX_COUNT = 22;
const RABBIT_SPAWN_INTERVAL_MIN = 3.8;
const RABBIT_SPAWN_INTERVAL_MAX = 11.4;
const RABBIT_SPAWN_ATTEMPTS = 9;
const RABBIT_DESPAWN_DISTANCE = 175;
const RABBIT_MIN_PLAYER_DISTANCE = 10;
const RABBIT_MIN_RABBIT_DISTANCE = 2.4;
const DEBUG_VISIBILITY_STORAGE_KEY = "girasolDebugHudVisible";
const TUTORIAL_SEEN_STORAGE_KEY = "girasolTutorialSeenV1";
const BLOCK_HIGHLIGHT_SIZE = 1.02;

const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.32;
const EYE_HEIGHT = 1.62;
const GRAVITY = 26;
const BASE_SPEED = 6.2;
const SPRINT_SPEED = 9.4;
const JUMP_SPEED = 9.2;
const MAX_REACH = 6;

const BLOCK = {
    AIR: 0,
    BEDROCK: 1,
    STONE: 2,
    DIRT: 3,
    GRASS: 4,
    WOOD: 5,
    LEAVES: 6,
    SAND: 7,
    WATER: 8
};

const PLACEABLE_BLOCKS = [
    { id: BLOCK.STONE, label: "Piedra" },
    { id: BLOCK.DIRT, label: "Tierra" },
    { id: BLOCK.GRASS, label: "Cesped" },
    { id: BLOCK.WOOD, label: "Madera" },
    { id: BLOCK.LEAVES, label: "Hojas" },
    { id: BLOCK.SAND, label: "Arena" }
];

const BLOCK_COLORS = {
    [BLOCK.BEDROCK]: 0x3b3b41,
    [BLOCK.STONE]: 0x77777f,
    [BLOCK.DIRT]: 0x6c4d31,
    [BLOCK.GRASS]: 0x4d8a3f,
    [BLOCK.WOOD]: 0x8b633d,
    [BLOCK.LEAVES]: 0x3c7b3f,
    [BLOCK.SAND]: 0xd4bf8d,
    [BLOCK.WATER]: 0x4f8dff
};

const BLOCK_LABELS = {
    [BLOCK.AIR]: "Aire",
    [BLOCK.BEDROCK]: "Roca base",
    [BLOCK.STONE]: "Piedra",
    [BLOCK.DIRT]: "Tierra",
    [BLOCK.GRASS]: "Cesped",
    [BLOCK.WOOD]: "Madera",
    [BLOCK.LEAVES]: "Hojas",
    [BLOCK.SAND]: "Arena",
    [BLOCK.WATER]: "Agua"
};

const PORTAL_UNLOCK_STORAGE_KEY = "girasolPortalUnlocked";
const PORTAL_ACCESS_LABEL_STORAGE_KEY = "girasolPortalAccessLabel";
const MULTIPLAYER_SESSION_ID_KEY = "girasolMultiplayerSessionId";

const PROFILE_COLORS = {
    Mauricio: "#f4cf85",
    Valentina: "#ff96c9"
};

const RABBIT_VARIANTS = [
    {
        id: "nube",
        fur: 0xf1f1ef,
        belly: 0xe5dfd6,
        innerEar: 0xf0abb3,
        eye: 0x111111,
        nose: 0xed9dab,
        patch: null
    },
    {
        id: "caramelo",
        fur: 0xcda06a,
        belly: 0xe2c59c,
        innerEar: 0xefb2b8,
        eye: 0x111111,
        nose: 0xf1a2ad,
        patch: null
    },
    {
        id: "gris",
        fur: 0xadadb1,
        belly: 0xcecbcb,
        innerEar: 0xf1a6ae,
        eye: 0x111111,
        nose: 0xf0a3ad,
        patch: null
    },
    {
        id: "manchas",
        fur: 0xf3f1eb,
        belly: 0xe7e0d8,
        innerEar: 0xf3abb2,
        eye: 0x111111,
        nose: 0xf09eab,
        patch: 0xbd8c5d
    }
];

const gameConfig = window.appConfig?.game || {};
const multiplayerConfig = gameConfig.multiplayer || {};
const urlParams = new URLSearchParams(window.location.search);
const MAX_EDITED_BLOCKS = clampInt(Number(gameConfig.maxEditedBlocks) || 120000, 2000, 500000);
const WORLD_SAVE_KEY = `girasolWorldEdits:${sanitizeRoomId(urlParams.get("room") || multiplayerConfig.roomId || "mundo-principal")}`;
const WORLD_SAVE_VERSION = 1;
const AUTO_SAVE_SECONDS = 12;

const WORLD_SEED = Number(gameConfig.worldSeed) || 42173;
const INITIAL_CHUNK_RADIUS = clampInt(
    Number(urlParams.get("chunks") || gameConfig.renderChunkRadius || 4),
    2,
    8
);

const canvas = document.getElementById("gameCanvas");
const coordsEl = document.getElementById("coords");
const hotbarEl = document.getElementById("hotbar");
const overlayEl = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const helpMiniEl = document.getElementById("helpMini");
const hudTopEl = document.getElementById("hudTop");
const debugPanelEl = document.getElementById("debugPanel");
const selectedMaterialHudEl = document.getElementById("selectedMaterialHud");
const hotbarSelectedMaterialEl = document.getElementById("hotbarSelectedMaterial");
const targetBlockLabelEl = document.getElementById("targetBlockLabel");
const toastContainerEl = document.getElementById("toastContainer");
const pauseButton = document.getElementById("pauseButton");
const pauseMenuEl = document.getElementById("pauseMenu");
const pauseContinueButton = document.getElementById("pauseContinueButton");
const pauseSettingsButton = document.getElementById("pauseSettingsButton");
const pauseSaveButton = document.getElementById("pauseSaveButton");
const pauseRestartButton = document.getElementById("pauseRestartButton");
const pauseSettingsSection = document.getElementById("pauseSettingsSection");
const tutorialPanelEl = document.getElementById("tutorialPanel");
const tutorialCloseButton = document.getElementById("tutorialCloseButton");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7ff);
scene.fog = new THREE.Fog(0x9bc7ff, 30, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const basePixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(basePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.68;
scene.add(controls.getObject());

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x6e748f, 0.9);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(16, 30, 8);
scene.add(sun);

const skyDecorRoot = new THREE.Group();
scene.add(skyDecorRoot);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

const remotePlayersRoot = new THREE.Group();
scene.add(remotePlayersRoot);

const wildlifeRoot = new THREE.Group();
scene.add(wildlifeRoot);

function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(colorHex) {
    return {
        r: (colorHex >> 16) & 0xff,
        g: (colorHex >> 8) & 0xff,
        b: colorHex & 0xff
    };
}

function makeTextureRng(seed) {
    let stateValue = (seed >>> 0) ^ 0xa5a5a5a5;
    return () => {
        stateValue = Math.imul(stateValue, 1664525) + 1013904223;
        return ((stateValue >>> 0) & 0xffffffff) / 0x100000000;
    };
}

function fillNoisyBase(ctx, size, baseColor, variance, rng, alpha = 255) {
    const image = ctx.createImageData(size, size);
    const data = image.data;

    for (let i = 0; i < data.length; i += 4) {
        const jitter = (rng() - 0.5) * 2;
        data[i] = clampByte(baseColor.r + jitter * variance);
        data[i + 1] = clampByte(baseColor.g + jitter * variance);
        data[i + 2] = clampByte(baseColor.b + jitter * variance);
        data[i + 3] = alpha;
    }

    ctx.putImageData(image, 0, 0);
}

function drawSpeckles(ctx, size, count, colorHex, alpha, rng, minSize = 1, maxSize = 2) {
    const color = hexToRgb(colorHex);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

    for (let i = 0; i < count; i += 1) {
        const px = Math.floor(rng() * size);
        const py = Math.floor(rng() * size);
        const s = minSize + Math.floor(rng() * (maxSize - minSize + 1));
        ctx.fillRect(px, py, s, s);
    }
}

function drawRockCracks(ctx, size, rng, colorHex, alpha, lines) {
    const color = hexToRgb(colorHex);
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < lines; i += 1) {
        const x = Math.floor(rng() * size);
        const y = Math.floor(rng() * size);
        const len = 8 + Math.floor(rng() * 18);
        const angle = rng() * Math.PI * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
    }
}

function createProceduralBlockTexture(blockId, fallbackColor) {
    const size = 64;
    const canvasTexture = document.createElement("canvas");
    canvasTexture.width = size;
    canvasTexture.height = size;
    const ctx = canvasTexture.getContext("2d");

    if (!ctx) {
        const texture = new THREE.Texture();
        texture.needsUpdate = true;
        return texture;
    }

    const rng = makeTextureRng(blockId * 7919 + WORLD_SEED * 17);
    const fallbackRgb = hexToRgb(fallbackColor);

    if (blockId === BLOCK.BEDROCK) {
        fillNoisyBase(ctx, size, hexToRgb(0x3d3e45), 30, rng);
        drawSpeckles(ctx, size, 280, 0x4c4e55, 0.42, rng, 1, 2);
        drawRockCracks(ctx, size, rng, 0x2a2b30, 0.35, 8);
    } else if (blockId === BLOCK.STONE) {
        fillNoisyBase(ctx, size, hexToRgb(0x787b84), 24, rng);
        drawSpeckles(ctx, size, 240, 0x8f949e, 0.32, rng, 1, 2);
        drawRockCracks(ctx, size, rng, 0x535861, 0.28, 10);
    } else if (blockId === BLOCK.DIRT) {
        fillNoisyBase(ctx, size, hexToRgb(0x704f33), 22, rng);
        drawSpeckles(ctx, size, 280, 0x4e3522, 0.33, rng, 1, 2);
        drawSpeckles(ctx, size, 180, 0x876341, 0.2, rng, 1, 1);
    } else if (blockId === BLOCK.GRASS) {
        fillNoisyBase(ctx, size, hexToRgb(0x4f8f42), 18, rng);
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, "rgba(170, 220, 125, 0.22)");
        grad.addColorStop(0.45, "rgba(120, 180, 90, 0.06)");
        grad.addColorStop(1, "rgba(35, 80, 28, 0.2)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        drawSpeckles(ctx, size, 260, 0x376f2f, 0.18, rng, 1, 1);
    } else if (blockId === BLOCK.WOOD) {
        fillNoisyBase(ctx, size, hexToRgb(0x91663f), 16, rng);
        for (let y = 0; y < size; y += 5) {
            const shade = 0.13 + rng() * 0.08;
            ctx.fillStyle = `rgba(72, 43, 19, ${shade})`;
            ctx.fillRect(0, y, size, 2);
        }
        drawSpeckles(ctx, size, 170, 0xb18355, 0.2, rng, 1, 1);
    } else if (blockId === BLOCK.LEAVES) {
        fillNoisyBase(ctx, size, hexToRgb(0x3f7f43), 24, rng);
        drawSpeckles(ctx, size, 320, 0x2f5f34, 0.22, rng, 1, 2);
        drawSpeckles(ctx, size, 170, 0x6aa85d, 0.2, rng, 1, 1);
    } else if (blockId === BLOCK.SAND) {
        fillNoisyBase(ctx, size, hexToRgb(0xd8c595), 16, rng);
        drawSpeckles(ctx, size, 330, 0xbba777, 0.2, rng, 1, 1);
        drawSpeckles(ctx, size, 170, 0xf2e2b4, 0.15, rng, 1, 1);
    } else if (blockId === BLOCK.WATER) {
        fillNoisyBase(ctx, size, hexToRgb(0x5a92ff), 10, rng, 235);
        ctx.strokeStyle = "rgba(188, 220, 255, 0.32)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i += 1) {
            const y = 4 + i * 8 + Math.floor(rng() * 3);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(size * 0.25, y + 2, size * 0.5, y - 2, size, y + 1);
            ctx.stroke();
        }
    } else {
        fillNoisyBase(ctx, size, fallbackRgb, 18, rng);
    }

    const texture = new THREE.CanvasTexture(canvasTexture);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

function createBlockMaterial(blockId, color) {
    const texture = createProceduralBlockTexture(blockId, color);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texture,
        roughness: blockId === BLOCK.WATER ? 0.08 : 0.92,
        metalness: blockId === BLOCK.WATER ? 0.02 : 0
    });

    if (blockId === BLOCK.GRASS || blockId === BLOCK.LEAVES) {
        material.roughness = 0.86;
    }

    if (blockId === BLOCK.WOOD || blockId === BLOCK.DIRT || blockId === BLOCK.SAND) {
        material.roughness = 0.95;
    }

    if (blockId === BLOCK.WATER) {
        material.transparent = true;
        material.opacity = 0.72;
        material.depthWrite = false;
    }

    return material;
}

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const blockMaterials = Object.fromEntries(
    Object.entries(BLOCK_COLORS).map(([id, color]) => [
        Number(id),
        createBlockMaterial(Number(id), color)
    ])
);

const chunkMap = new Map();
const chunkRebuildQueue = new Set();
const editedBlocks = new Map();
const columnCache = new Map();

const blockMeshes = [];
const blockPositionLookup = new Map();

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const targetHighlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_HIGHLIGHT_SIZE, BLOCK_HIGHLIGHT_SIZE, BLOCK_HIGHLIGHT_SIZE)),
    new THREE.LineBasicMaterial({ color: 0xffd789, transparent: true, opacity: 0.92 })
);
targetHighlight.visible = false;
scene.add(targetHighlight);

const state = {
    selectedHotbarIndex: 0,
    velocityY: 0,
    onGround: false,
    keyDown: new Set(),
    playerPosition: new THREE.Vector3(0, 17, 0),
    worldStarted: false,
    worldReady: false,
    paused: false,
    pauseSettingsOpen: false,
    debugVisible: false,
    tutorialVisible: false,
    chunkRadius: INITIAL_CHUNK_RADIUS,
    chunkTick: 0,
    loadedChunkCount: 0,
    pendingChunkBuildCount: 0,
    lastForward: new THREE.Vector3(0, 0, -1),
    autoSaveTick: 0
};

const multiplayer = {
    enabled: false,
    ready: false,
    roomId: "mundo-principal",
    worldPath: "",
    profile: null,
    firebase: null,
    refs: {
        playersRef: null,
        myPlayerRef: null,
        chunksRootRef: null
    },
    remotePlayers: new Map(),
    chunkEditSubscriptions: new Map(),
    sendIntervalMs: 120,
    lastBroadcastMs: 0,
    unsubscribers: [],
    pendingEditWrites: new Map(),
    writeTimerId: null
};

const saveState = {
    dirty: false,
    writeTimerId: null,
    lastSavedAt: 0
};

const perfState = {
    dynamicPixelRatio: basePixelRatio,
    fpsEma: 60,
    adjustCooldown: 0
};

const skyState = {
    clouds: []
};

const uiState = {
    toastHideTimerId: null,
    noSpaceToastAt: 0
};

const wildlifeState = {
    rabbits: new Map(),
    nextId: 1,
    spawnTimer: 5.2
};

function setBootStatus(message, isError = false) {
    if (!overlayEl) {
        return;
    }

    let statusEl = document.getElementById("bootStatus");
    if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.id = "bootStatus";
        overlayEl.querySelector(".overlay-card")?.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.style.color = isError ? "#ffb3b3" : "#d9d2c3";
}

function ensureOnlineStatusElement() {
    return document.getElementById("onlineStatus");
}

function setOnlineStatus(message) {
    const el = ensureOnlineStatusElement();
    if (el) {
        el.textContent = message;
    }
}

function ensureChunkInfoElement() {
    return document.getElementById("chunkInfo");
}

function setChunkInfo(message) {
    const el = ensureChunkInfoElement();
    if (el) {
        el.textContent = message;
    }
}

function showToast(message, tone = "info", durationMs = 1500) {
    if (!toastContainerEl) {
        return;
    }

    if (uiState.toastHideTimerId !== null) {
        window.clearTimeout(uiState.toastHideTimerId);
        uiState.toastHideTimerId = null;
    }

    let toast = toastContainerEl.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        toastContainerEl.appendChild(toast);
    }

    toast.className = `toast show ${tone}`;
    toast.textContent = message;

    uiState.toastHideTimerId = window.setTimeout(() => {
        toast.classList.remove("show");
        uiState.toastHideTimerId = window.setTimeout(() => {
            if (toast.parentElement === toastContainerEl) {
                toastContainerEl.removeChild(toast);
            }
            uiState.toastHideTimerId = null;
        }, 170);
    }, durationMs);
}

function setDebugVisible(visible, showFeedback = false) {
    state.debugVisible = Boolean(visible);

    if (debugPanelEl) {
        debugPanelEl.classList.toggle("hidden", !state.debugVisible);
    }

    try {
        window.localStorage.setItem(DEBUG_VISIBILITY_STORAGE_KEY, state.debugVisible ? "1" : "0");
    } catch (error) {
    }

    if (showFeedback) {
        showToast(state.debugVisible ? "Debug activado" : "Debug desactivado");
    }
}

function loadDebugVisibility() {
    try {
        const value = window.localStorage.getItem(DEBUG_VISIBILITY_STORAGE_KEY);
        return value === "1";
    } catch (error) {
        return false;
    }
}

function setPauseSettingsOpen(open) {
    state.pauseSettingsOpen = Boolean(open);
    if (pauseSettingsSection) {
        pauseSettingsSection.classList.toggle("hidden", !state.pauseSettingsOpen);
    }
}

function setPauseMenuOpen(open) {
    if (!state.worldStarted) {
        state.paused = false;
        if (pauseMenuEl) {
            pauseMenuEl.classList.add("hidden");
        }
        return;
    }

    state.paused = Boolean(open);

    if (pauseMenuEl) {
        pauseMenuEl.classList.toggle("hidden", !state.paused);
    }

    if (pauseButton) {
        pauseButton.setAttribute("aria-expanded", state.paused ? "true" : "false");
    }

    if (state.paused) {
        state.keyDown.clear();
        setPauseSettingsOpen(false);
        if (controls.isLocked) {
            try {
                controls.unlock();
            } catch (error) {
            }
        }
    }
}

function showTutorialIfNeeded() {
    try {
        const seen = window.localStorage.getItem(TUTORIAL_SEEN_STORAGE_KEY) === "1";
        if (seen) {
            state.tutorialVisible = false;
            if (tutorialPanelEl) {
                tutorialPanelEl.classList.add("hidden");
            }
            return;
        }
    } catch (error) {
    }

    state.tutorialVisible = true;
    if (tutorialPanelEl) {
        tutorialPanelEl.classList.remove("hidden");
    }
}

function closeTutorial(remember = true) {
    state.tutorialVisible = false;
    if (tutorialPanelEl) {
        tutorialPanelEl.classList.add("hidden");
    }

    if (remember) {
        try {
            window.localStorage.setItem(TUTORIAL_SEEN_STORAGE_KEY, "1");
        } catch (error) {
        }
    }
}

function saveWorldNow(showFeedback = false) {
    flushWorldSave(true);
    flushCloudEditWrites();
    if (showFeedback) {
        showToast("Mundo guardado", "success");
    }
}

function getBlockLabel(blockId) {
    return BLOCK_LABELS[blockId] || `Bloque ${blockId}`;
}

function updateTargetedBlockUi() {
    if (!state.worldStarted || !state.worldReady || state.paused || !controls.isLocked) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = MAX_REACH;

    const intersects = raycaster.intersectObjects(blockMeshes, false);
    if (!intersects.length) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    const hit = intersects[0];
    const instanceId = hit.instanceId;
    if (instanceId === undefined || instanceId === null) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    const lookup = blockPositionLookup.get(`${hit.object.id}:${instanceId}`);
    if (!lookup) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    targetHighlight.visible = true;
    targetHighlight.position.set(lookup.x + 0.5, lookup.y + 0.5, lookup.z + 0.5);

    if (targetBlockLabelEl) {
        targetBlockLabelEl.textContent = `Bloque: ${getBlockLabel(lookup.id)}`;
        targetBlockLabelEl.classList.remove("hidden");
    }
}

function createCloudCluster(index) {
    const group = new THREE.Group();
    const puffCount = 4 + (index % 4);

    for (let i = 0; i < puffCount; i += 1) {
        const puff = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshLambertMaterial({ color: 0xf8fbff, transparent: true, opacity: 0.9 })
        );

        const sx = 2.3 + Math.random() * 2.2;
        const sy = 0.8 + Math.random() * 0.7;
        const sz = 1.4 + Math.random() * 1.7;
        puff.scale.set(sx, sy, sz);
        puff.position.set(
            (i - puffCount * 0.5) * (1.8 + Math.random() * 0.8),
            (Math.random() - 0.35) * 0.8,
            (Math.random() - 0.5) * 2.2
        );
        group.add(puff);
    }

    return group;
}

function createSkyDecor() {
    if (skyState.clouds.length > 0) {
        return;
    }

    const sunCore = new THREE.Mesh(
        new THREE.SphereGeometry(5.4, 20, 16),
        new THREE.MeshBasicMaterial({ color: 0xffe7a1 })
    );
    sunCore.position.set(95, 78, -135);
    skyDecorRoot.add(sunCore);

    const sunGlow = new THREE.Mesh(
        new THREE.SphereGeometry(7.8, 20, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff4c7, transparent: true, opacity: 0.24 })
    );
    sunGlow.position.copy(sunCore.position);
    skyDecorRoot.add(sunGlow);

    const cloudRange = 240;

    for (let i = 0; i < CLOUD_COUNT; i += 1) {
        const cloud = createCloudCluster(i);
        cloud.position.set(
            (Math.random() * 2 - 1) * cloudRange,
            31 + Math.random() * 12,
            (Math.random() * 2 - 1) * cloudRange
        );
        cloud.rotation.y = Math.random() * Math.PI * 2;
        skyDecorRoot.add(cloud);

        skyState.clouds.push({
            node: cloud,
            speed: 1.3 + Math.random() * 1.8,
            driftRange: cloudRange
        });
    }
}

function updateSky(deltaSeconds) {
    for (const cloud of skyState.clouds) {
        cloud.node.position.x += cloud.speed * deltaSeconds;

        const minX = state.playerPosition.x - cloud.driftRange;
        const maxX = state.playerPosition.x + cloud.driftRange;
        if (cloud.node.position.x > maxX) {
            cloud.node.position.x = minX;
            cloud.node.position.z = state.playerPosition.z + (Math.random() * 2 - 1) * cloud.driftRange;
            cloud.node.position.y = 31 + Math.random() * 12;
        }
    }
}

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

function randomIntInclusive(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(randomInRange(lo, hi + 1));
}

function approachAngle(current, target, factor) {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta * factor;
}

function createRabbitPart(size, position, material, rotation = null) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.set(position.x, position.y, position.z);
    if (rotation) {
        mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }

    return mesh;
}

function createRabbitNode(variant) {
    const root = new THREE.Group();

    const furMaterial = new THREE.MeshLambertMaterial({ color: variant.fur });
    const bellyMaterial = new THREE.MeshLambertMaterial({ color: variant.belly });
    const earInnerMaterial = new THREE.MeshLambertMaterial({ color: variant.innerEar });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: variant.eye });
    const noseMaterial = new THREE.MeshLambertMaterial({ color: variant.nose });
    const blushMaterial = new THREE.MeshLambertMaterial({ color: 0xf7b9c2 });
    const patchMaterial = variant.patch ? new THREE.MeshLambertMaterial({ color: variant.patch }) : null;

    root.add(createRabbitPart({ x: 0.6, y: 0.66, z: 0.42 }, { x: 0, y: 0.5, z: 0 }, furMaterial));
    root.add(createRabbitPart({ x: 0.34, y: 0.38, z: 0.03 }, { x: 0, y: 0.43, z: 0.22 }, bellyMaterial));

    root.add(createRabbitPart({ x: 0.64, y: 0.56, z: 0.58 }, { x: 0, y: 1.04, z: 0.05 }, furMaterial));
    root.add(createRabbitPart({ x: 0.16, y: 0.62, z: 0.16 }, { x: -0.18, y: 1.59, z: 0.08 }, furMaterial));
    root.add(createRabbitPart({ x: 0.16, y: 0.62, z: 0.16 }, { x: 0.18, y: 1.59, z: 0.08 }, furMaterial));
    root.add(createRabbitPart({ x: 0.08, y: 0.44, z: 0.02 }, { x: -0.18, y: 1.55, z: 0.17 }, earInnerMaterial));
    root.add(createRabbitPart({ x: 0.08, y: 0.44, z: 0.02 }, { x: 0.18, y: 1.55, z: 0.17 }, earInnerMaterial));

    root.add(createRabbitPart({ x: 0.08, y: 0.1, z: 0.05 }, { x: -0.16, y: 1.04, z: 0.34 }, eyeMaterial));
    root.add(createRabbitPart({ x: 0.08, y: 0.1, z: 0.05 }, { x: 0.16, y: 1.04, z: 0.34 }, eyeMaterial));
    root.add(createRabbitPart({ x: 0.08, y: 0.08, z: 0.04 }, { x: 0, y: 0.95, z: 0.35 }, noseMaterial));
    root.add(createRabbitPart({ x: 0.14, y: 0.02, z: 0.04 }, { x: 0, y: 0.89, z: 0.35 }, eyeMaterial));
    root.add(createRabbitPart({ x: 0.08, y: 0.06, z: 0.04 }, { x: -0.22, y: 0.88, z: 0.34 }, blushMaterial));
    root.add(createRabbitPart({ x: 0.08, y: 0.06, z: 0.04 }, { x: 0.22, y: 0.88, z: 0.34 }, blushMaterial));

    root.add(createRabbitPart({ x: 0.14, y: 0.32, z: 0.16 }, { x: -0.24, y: 0.28, z: 0.13 }, furMaterial));
    root.add(createRabbitPart({ x: 0.14, y: 0.32, z: 0.16 }, { x: 0.24, y: 0.28, z: 0.13 }, furMaterial));
    root.add(createRabbitPart({ x: 0.18, y: 0.2, z: 0.2 }, { x: -0.19, y: 0.1, z: -0.11 }, furMaterial));
    root.add(createRabbitPart({ x: 0.18, y: 0.2, z: 0.2 }, { x: 0.19, y: 0.1, z: -0.11 }, furMaterial));
    root.add(createRabbitPart({ x: 0.16, y: 0.14, z: 0.16 }, { x: 0, y: 0.53, z: -0.28 }, furMaterial));

    if (patchMaterial) {
        root.add(createRabbitPart({ x: 0.21, y: 0.2, z: 0.12 }, { x: 0.21, y: 1.08, z: 0.24 }, patchMaterial));
        root.add(createRabbitPart({ x: 0.18, y: 0.3, z: 0.12 }, { x: 0.19, y: 0.5, z: 0.21 }, patchMaterial));
        root.add(createRabbitPart({ x: 0.1, y: 0.14, z: 0.1 }, { x: -0.24, y: 0.32, z: 0.12 }, patchMaterial));
    }

    root.scale.set(0.86, 0.86, 0.86);
    return root;
}

function pickRabbitVariant() {
    return RABBIT_VARIANTS[Math.floor(Math.random() * RABBIT_VARIANTS.length)];
}

function isRabbitGroundBlock(id) {
    return id === BLOCK.GRASS || id === BLOCK.DIRT || id === BLOCK.SAND;
}

function sampleSurfaceForRabbit(worldX, worldZ) {
    const x = Math.floor(worldX);
    const z = Math.floor(worldZ);

    for (let y = WORLD_MAX_Y - 2; y >= 1; y -= 1) {
        const groundId = getBlock(x, y, z);
        if (groundId === BLOCK.AIR || groundId === BLOCK.WATER || groundId === BLOCK.LEAVES) {
            continue;
        }

        if (!isRabbitGroundBlock(groundId)) {
            return null;
        }

        const above = getBlock(x, y + 1, z);
        const above2 = getBlock(x, y + 2, z);
        if (above !== BLOCK.AIR || above2 !== BLOCK.AIR) {
            return null;
        }

        return {
            x: x + 0.5,
            y: y + 1.02,
            z: z + 0.5
        };
    }

    return null;
}

function resetRabbitSpawnTimer() {
    wildlifeState.spawnTimer = randomInRange(RABBIT_SPAWN_INTERVAL_MIN, RABBIT_SPAWN_INTERVAL_MAX);
}

function removeRabbitEntity(rabbitId) {
    const rabbit = wildlifeState.rabbits.get(rabbitId);
    if (!rabbit) {
        return;
    }

    rabbit.node.traverse((child) => {
        if (child.isMesh) {
            child.geometry?.dispose?.();
            child.material?.dispose?.();
        }
    });

    wildlifeRoot.remove(rabbit.node);
    wildlifeState.rabbits.delete(rabbitId);
}

function clearWildlife() {
    for (const rabbitId of Array.from(wildlifeState.rabbits.keys())) {
        removeRabbitEntity(rabbitId);
    }
}

function trySpawnRabbitNearPlayer(force = false) {
    if (!force && !state.worldStarted) {
        return false;
    }

    if (wildlifeState.rabbits.size >= RABBIT_MAX_COUNT) {
        return false;
    }

    const searchRadius = Math.max(28, state.chunkRadius * CHUNK_SIZE * 2.4);

    for (let attempt = 0; attempt < RABBIT_SPAWN_ATTEMPTS; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInRange(RABBIT_MIN_PLAYER_DISTANCE + 8, searchRadius);
        const candidateX = state.playerPosition.x + Math.cos(angle) * distance;
        const candidateZ = state.playerPosition.z + Math.sin(angle) * distance;
        const spawnPoint = sampleSurfaceForRabbit(candidateX, candidateZ);
        if (!spawnPoint) {
            continue;
        }

        const spawnChunkKey = chunkKey(worldToChunkCoord(spawnPoint.x), worldToChunkCoord(spawnPoint.z));
        if (!chunkMap.has(spawnChunkKey)) {
            continue;
        }

        const playerDx = spawnPoint.x - state.playerPosition.x;
        const playerDz = spawnPoint.z - state.playerPosition.z;
        if (playerDx * playerDx + playerDz * playerDz < RABBIT_MIN_PLAYER_DISTANCE * RABBIT_MIN_PLAYER_DISTANCE) {
            continue;
        }

        let tooClose = false;
        for (const rabbit of wildlifeState.rabbits.values()) {
            const dx = spawnPoint.x - rabbit.x;
            const dz = spawnPoint.z - rabbit.z;
            if (dx * dx + dz * dz < RABBIT_MIN_RABBIT_DISTANCE * RABBIT_MIN_RABBIT_DISTANCE) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) {
            continue;
        }

        const variant = pickRabbitVariant();
        const node = createRabbitNode(variant);
        node.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        node.rotation.y = Math.random() * Math.PI * 2;
        wildlifeRoot.add(node);

        const rabbitId = `rabbit-${wildlifeState.nextId}`;
        wildlifeState.nextId += 1;

        wildlifeState.rabbits.set(rabbitId, {
            id: rabbitId,
            variantId: variant.id,
            node,
            x: spawnPoint.x,
            z: spawnPoint.z,
            baseY: spawnPoint.y,
            targetX: spawnPoint.x,
            targetZ: spawnPoint.z,
            speed: randomInRange(0.95, 1.68),
            roamTimer: randomInRange(0.7, 2.2),
            idleTimer: randomInRange(0.1, 1.3),
            hopPhase: Math.random() * Math.PI * 2,
            hopStrength: randomInRange(0.06, 0.13)
        });
        return true;
    }

    return false;
}

function pickRabbitTarget(rabbit) {
    for (let attempt = 0; attempt < 7; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInRange(2.1, 8.7);
        const targetX = rabbit.x + Math.cos(angle) * distance;
        const targetZ = rabbit.z + Math.sin(angle) * distance;
        const surface = sampleSurfaceForRabbit(targetX, targetZ);
        if (!surface) {
            continue;
        }

        if (Math.abs(surface.y - rabbit.baseY) > 1.35) {
            continue;
        }

        rabbit.targetX = surface.x;
        rabbit.targetZ = surface.z;
        rabbit.roamTimer = randomInRange(2.3, 5.9);
        rabbit.idleTimer = 0;
        return;
    }

    rabbit.roamTimer = randomInRange(1.1, 2.4);
    rabbit.idleTimer = randomInRange(0.8, 2.1);
}

function updateSingleRabbit(rabbitId, rabbit, deltaSeconds) {
    const dxPlayer = rabbit.x - state.playerPosition.x;
    const dzPlayer = rabbit.z - state.playerPosition.z;
    if (dxPlayer * dxPlayer + dzPlayer * dzPlayer > RABBIT_DESPAWN_DISTANCE * RABBIT_DESPAWN_DISTANCE) {
        removeRabbitEntity(rabbitId);
        return;
    }

    rabbit.roamTimer -= deltaSeconds;
    rabbit.idleTimer -= deltaSeconds;

    let moving = false;

    if (rabbit.idleTimer <= 0) {
        if (rabbit.roamTimer <= 0) {
            pickRabbitTarget(rabbit);
        }

        const targetDx = rabbit.targetX - rabbit.x;
        const targetDz = rabbit.targetZ - rabbit.z;
        const targetDist = Math.hypot(targetDx, targetDz);

        if (targetDist > 0.22) {
            const step = Math.min(targetDist, rabbit.speed * deltaSeconds);
            const nextX = rabbit.x + (targetDx / targetDist) * step;
            const nextZ = rabbit.z + (targetDz / targetDist) * step;
            const nextSurface = sampleSurfaceForRabbit(nextX, nextZ);

            if (nextSurface && Math.abs(nextSurface.y - rabbit.baseY) <= 1.35) {
                rabbit.x = nextX;
                rabbit.z = nextZ;
                rabbit.baseY = nextSurface.y;
                const targetYaw = Math.atan2(targetDx, targetDz);
                rabbit.node.rotation.y = approachAngle(rabbit.node.rotation.y, targetYaw, Math.min(1, deltaSeconds * 9));
                moving = true;
            } else {
                rabbit.roamTimer = 0;
                rabbit.idleTimer = randomInRange(0.7, 1.8);
            }
        } else {
            rabbit.roamTimer = 0;
            rabbit.idleTimer = randomInRange(0.6, 1.7);
        }
    }

    rabbit.hopPhase += deltaSeconds * (moving ? 9.2 : 3.4);
    const hop = moving ? Math.max(0, Math.sin(rabbit.hopPhase)) * rabbit.hopStrength : 0;
    rabbit.node.position.set(rabbit.x, rabbit.baseY + hop, rabbit.z);
}

function updateWildlife(deltaSeconds) {
    if (!state.worldReady) {
        return;
    }

    wildlifeState.spawnTimer -= deltaSeconds;
    if (wildlifeState.spawnTimer <= 0) {
        resetRabbitSpawnTimer();

        const occupancy = wildlifeState.rabbits.size / RABBIT_MAX_COUNT;
        const spawnChance = Math.max(0.18, 0.82 - occupancy * 0.7);
        if (Math.random() < spawnChance) {
            const spawnBursts = wildlifeState.rabbits.size < 6 ? randomIntInclusive(1, 2) : 1;
            for (let i = 0; i < spawnBursts; i += 1) {
                if (!trySpawnRabbitNearPlayer(false)) {
                    break;
                }
            }
        }
    }

    for (const [rabbitId, rabbit] of Array.from(wildlifeState.rabbits.entries())) {
        updateSingleRabbit(rabbitId, rabbit, deltaSeconds);
    }
}

function initWildlife() {
    clearWildlife();
    wildlifeState.nextId = 1;
    resetRabbitSpawnTimer();

    const initialCount = randomIntInclusive(2, 4);
    for (let i = 0; i < initialCount; i += 1) {
        if (!trySpawnRabbitNearPlayer(true)) {
            break;
        }
    }
}

function normalizeProfileLabel(label) {
    const text = String(label || "").trim();
    if (!text) {
        return "";
    }

    const lower = text.toLowerCase();
    if (lower === "mauricio") {
        return "Mauricio";
    }

    if (lower === "valentina") {
        return "Valentina";
    }

    return text;
}

function getSessionId() {
    let id = "";
    try {
        id = window.sessionStorage.getItem(MULTIPLAYER_SESSION_ID_KEY) || "";
    } catch (error) {
    }

    if (id) {
        return id;
    }

    id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

    try {
        window.sessionStorage.setItem(MULTIPLAYER_SESSION_ID_KEY, id);
    } catch (error) {
    }

    return id;
}

function resolvePlayerIdentity() {
    const profileList = Array.isArray(window.appConfig?.portal?.authorizedProfiles)
        ? window.appConfig.portal.authorizedProfiles
        : [];
    const profileByLabel = new Map(
        profileList
            .filter((profile) => profile && profile.label)
            .map((profile) => [String(profile.label), profile])
    );

    const sessionUnlocked = window.sessionStorage.getItem(PORTAL_UNLOCK_STORAGE_KEY) === "true";
    const sessionLabel = sessionUnlocked
        ? normalizeProfileLabel(window.sessionStorage.getItem(PORTAL_ACCESS_LABEL_STORAGE_KEY) || "")
        : "";

    const playerFromQuery = normalizeProfileLabel(urlParams.get("player") || "");
    const resolvedLabel = sessionLabel || playerFromQuery || "Invitado";
    const profile = profileByLabel.get(resolvedLabel);
    const displayName = profile?.displayName || resolvedLabel;
    const color = PROFILE_COLORS[resolvedLabel] || "#8ad1ff";

    let id = resolvedLabel;
    if (!PROFILE_COLORS[resolvedLabel]) {
        id = `Invitado-${getSessionId().slice(0, 8)}`;
    }

    return {
        id,
        label: resolvedLabel,
        displayName,
        color
    };
}

function sanitizeRoomId(value) {
    const normalized = String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 48);

    return normalized || "mundo-principal";
}

function isValidBlockId(id) {
    return Number.isInteger(id) && id >= BLOCK.AIR && id <= BLOCK.WATER;
}

function parseBlockKey(key) {
    const [xText, yText, zText] = String(key).split("|");
    const x = Number(xText);
    const y = Number(yText);
    const z = Number(zText);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }

    return { x, y, z };
}

function flushWorldSave(force = false) {
    if (!saveState.dirty && !force) {
        return;
    }

    if (saveState.writeTimerId !== null) {
        window.clearTimeout(saveState.writeTimerId);
        saveState.writeTimerId = null;
    }

    const edits = [...editedBlocks.entries()]
        .filter(([, id]) => isValidBlockId(id))
        .map(([key, id]) => [key, id]);

    try {
        if (edits.length === 0) {
            window.localStorage.removeItem(WORLD_SAVE_KEY);
        } else {
            const payload = {
                version: WORLD_SAVE_VERSION,
                seed: WORLD_SEED,
                savedAt: Date.now(),
                edits
            };

            window.localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(payload));
        }

        saveState.dirty = false;
        saveState.lastSavedAt = Date.now();
    } catch (error) {
        console.warn("No se pudo guardar el mundo localmente", error);
    }
}

function scheduleWorldSave() {
    saveState.dirty = true;

    if (saveState.writeTimerId !== null) {
        return;
    }

    saveState.writeTimerId = window.setTimeout(() => {
        saveState.writeTimerId = null;
        flushWorldSave();
    }, 1500);
}

function loadWorldFromStorage() {
    let raw = "";
    try {
        raw = window.localStorage.getItem(WORLD_SAVE_KEY) || "";
    } catch (error) {
        return 0;
    }

    if (!raw) {
        return 0;
    }

    try {
        const payload = JSON.parse(raw);
        const edits = Array.isArray(payload?.edits) ? payload.edits : [];

        editedBlocks.clear();
        let loaded = 0;

        for (const item of edits) {
            if (!Array.isArray(item) || item.length !== 2) {
                continue;
            }

            const key = String(item[0] || "");
            const id = Number(item[1]);
            const parsed = parseBlockKey(key);

            if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z) || !isValidBlockId(id)) {
                continue;
            }

            editedBlocks.set(key, id);
            loaded += 1;
        }

        return loaded;
    } catch (error) {
        console.warn("No se pudo leer el guardado local del mundo", error);
        return 0;
    }
}

function parseHexColor(color, fallback = 0x8ad1ff) {
    const normalized = String(color || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return Number.parseInt(normalized, 16);
    }

    return fallback;
}

function createNameTagSprite(labelText, colorText) {
    const canvasTag = document.createElement("canvas");
    canvasTag.width = 512;
    canvasTag.height = 128;

    const context = canvasTag.getContext("2d");
    if (!context) {
        return null;
    }

    context.clearRect(0, 0, canvasTag.width, canvasTag.height);
    context.fillStyle = "rgba(8, 9, 12, 0.78)";
    context.fillRect(0, 24, canvasTag.width, 80);

    context.fillStyle = colorText || "#f4cf85";
    context.fillRect(0, 24, 8, 80);

    context.font = "700 48px Sora, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f5efe2";
    context.fillText(labelText, canvasTag.width / 2, canvasTag.height / 2 + 2);

    const texture = new THREE.CanvasTexture(canvasTag);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.9, 0.46, 1);

    return sprite;
}

function createAvatarPart(size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.set(position.x, position.y, position.z);
    return mesh;
}

function createAvatarMaterials(palette) {
    return {
        skin: new THREE.MeshLambertMaterial({ color: palette.skin }),
        cloth: new THREE.MeshLambertMaterial({ color: palette.cloth }),
        pants: new THREE.MeshLambertMaterial({ color: palette.pants }),
        shoe: new THREE.MeshLambertMaterial({ color: palette.shoe }),
        sole: new THREE.MeshLambertMaterial({ color: palette.sole }),
        hair: new THREE.MeshLambertMaterial({ color: palette.hair }),
        detailDark: new THREE.MeshLambertMaterial({ color: palette.detailDark }),
        detailAccent: new THREE.MeshLambertMaterial({ color: palette.detailAccent }),
        lens: new THREE.MeshLambertMaterial({
            color: palette.lens,
            transparent: true,
            opacity: 0.62
        })
    };
}

function addAvatarPart(root, size, position, material, rotation = null) {
    const part = createAvatarPart(size, position, material);
    if (rotation) {
        part.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }

    root.add(part);
    return part;
}

function buildMauricioAvatar(root, materials) {
    addAvatarPart(root, { x: 0.5, y: 0.5, z: 0.5 }, { x: 0, y: 1.68, z: 0 }, materials.skin);
    addAvatarPart(root, { x: 0.62, y: 0.78, z: 0.34 }, { x: 0, y: 1.08, z: 0 }, materials.cloth);
    addAvatarPart(root, { x: 0.21, y: 0.72, z: 0.22 }, { x: -0.41, y: 1.09, z: 0 }, materials.skin, { z: 0.06 });
    addAvatarPart(root, { x: 0.21, y: 0.72, z: 0.22 }, { x: 0.41, y: 1.09, z: 0 }, materials.skin, { z: -0.06 });

    addAvatarPart(root, { x: 0.24, y: 0.78, z: 0.25 }, { x: -0.14, y: 0.4, z: 0 }, materials.pants);
    addAvatarPart(root, { x: 0.24, y: 0.78, z: 0.25 }, { x: 0.14, y: 0.4, z: 0 }, materials.pants);

    addAvatarPart(root, { x: 0.27, y: 0.12, z: 0.31 }, { x: -0.14, y: 0.06, z: 0.02 }, materials.shoe);
    addAvatarPart(root, { x: 0.27, y: 0.12, z: 0.31 }, { x: 0.14, y: 0.06, z: 0.02 }, materials.shoe);
    addAvatarPart(root, { x: 0.23, y: 0.05, z: 0.28 }, { x: -0.14, y: 0.0, z: 0.03 }, materials.sole);
    addAvatarPart(root, { x: 0.23, y: 0.05, z: 0.28 }, { x: 0.14, y: 0.0, z: 0.03 }, materials.sole);

    addAvatarPart(root, { x: 0.56, y: 0.23, z: 0.56 }, { x: 0, y: 2.03, z: 0 }, materials.hair);
    addAvatarPart(root, { x: 0.58, y: 0.21, z: 0.2 }, { x: 0, y: 1.88, z: -0.19 }, materials.hair);
    addAvatarPart(root, { x: 0.16, y: 0.26, z: 0.38 }, { x: -0.24, y: 1.88, z: 0.02 }, materials.hair);
    addAvatarPart(root, { x: 0.16, y: 0.26, z: 0.38 }, { x: 0.24, y: 1.88, z: 0.02 }, materials.hair);
    addAvatarPart(root, { x: 0.12, y: 0.23, z: 0.2 }, { x: -0.17, y: 1.86, z: 0.26 }, materials.hair);
    addAvatarPart(root, { x: 0.12, y: 0.26, z: 0.2 }, { x: -0.04, y: 1.83, z: 0.26 }, materials.hair);
    addAvatarPart(root, { x: 0.12, y: 0.24, z: 0.2 }, { x: 0.09, y: 1.84, z: 0.26 }, materials.hair);
    addAvatarPart(root, { x: 0.11, y: 0.2, z: 0.2 }, { x: 0.2, y: 1.87, z: 0.24 }, materials.hair);

    addAvatarPart(root, { x: 0.21, y: 0.17, z: 0.05 }, { x: -0.12, y: 1.71, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.21, y: 0.17, z: 0.05 }, { x: 0.12, y: 1.71, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.08, y: 0.05, z: 0.05 }, { x: 0, y: 1.71, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.15, y: 0.11, z: 0.03 }, { x: -0.12, y: 1.71, z: 0.29 }, materials.lens);
    addAvatarPart(root, { x: 0.15, y: 0.11, z: 0.03 }, { x: 0.12, y: 1.71, z: 0.29 }, materials.lens);

    addAvatarPart(root, { x: 0.06, y: 0.03, z: 0.04 }, { x: -0.08, y: 1.61, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.06, y: 0.03, z: 0.04 }, { x: 0.08, y: 1.61, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.12, y: 0.03, z: 0.04 }, { x: 0, y: 1.49, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.07, y: 0.11, z: 0.04 }, { x: 0, y: 1.43, z: 0.27 }, materials.detailDark);
}

function buildValentinaAvatar(root, materials) {
    addAvatarPart(root, { x: 0.5, y: 0.5, z: 0.5 }, { x: 0, y: 1.68, z: 0 }, materials.skin);
    addAvatarPart(root, { x: 0.6, y: 0.74, z: 0.34 }, { x: 0, y: 1.1, z: 0 }, materials.cloth);
    addAvatarPart(root, { x: 0.17, y: 0.17, z: 0.04 }, { x: 0, y: 1.31, z: 0.19 }, materials.skin);
    addAvatarPart(root, { x: 0.21, y: 0.72, z: 0.22 }, { x: -0.41, y: 1.09, z: 0 }, materials.skin, { z: 0.04 });
    addAvatarPart(root, { x: 0.21, y: 0.72, z: 0.22 }, { x: 0.41, y: 1.09, z: 0 }, materials.skin, { z: -0.04 });

    addAvatarPart(root, { x: 0.24, y: 0.78, z: 0.25 }, { x: -0.14, y: 0.4, z: 0 }, materials.pants);
    addAvatarPart(root, { x: 0.24, y: 0.78, z: 0.25 }, { x: 0.14, y: 0.4, z: 0 }, materials.pants);
    addAvatarPart(root, { x: 0.07, y: 0.06, z: 0.04 }, { x: 0, y: 0.78, z: 0.17 }, materials.detailAccent);

    addAvatarPart(root, { x: 0.27, y: 0.12, z: 0.31 }, { x: -0.14, y: 0.06, z: 0.02 }, materials.shoe);
    addAvatarPart(root, { x: 0.27, y: 0.12, z: 0.31 }, { x: 0.14, y: 0.06, z: 0.02 }, materials.shoe);
    addAvatarPart(root, { x: 0.23, y: 0.05, z: 0.28 }, { x: -0.14, y: 0.0, z: 0.03 }, materials.sole);
    addAvatarPart(root, { x: 0.23, y: 0.05, z: 0.28 }, { x: 0.14, y: 0.0, z: 0.03 }, materials.sole);

    addAvatarPart(root, { x: 0.58, y: 0.22, z: 0.58 }, { x: 0, y: 2.03, z: 0 }, materials.hair);
    addAvatarPart(root, { x: 0.56, y: 0.2, z: 0.2 }, { x: 0, y: 1.88, z: -0.19 }, materials.hair);
    addAvatarPart(root, { x: 0.56, y: 0.86, z: 0.2 }, { x: 0, y: 1.47, z: -0.2 }, materials.hair);
    addAvatarPart(root, { x: 0.16, y: 0.8, z: 0.22 }, { x: -0.26, y: 1.46, z: -0.02 }, materials.hair);
    addAvatarPart(root, { x: 0.16, y: 0.8, z: 0.22 }, { x: 0.26, y: 1.46, z: -0.02 }, materials.hair);
    addAvatarPart(root, { x: 0.12, y: 0.55, z: 0.2 }, { x: -0.19, y: 1.38, z: 0.24 }, materials.hair, { z: 0.14 });
    addAvatarPart(root, { x: 0.12, y: 0.55, z: 0.2 }, { x: 0.19, y: 1.38, z: 0.24 }, materials.hair, { z: -0.14 });

    addAvatarPart(root, { x: 0.21, y: 0.17, z: 0.05 }, { x: -0.12, y: 1.71, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.21, y: 0.17, z: 0.05 }, { x: 0.12, y: 1.71, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.08, y: 0.05, z: 0.05 }, { x: 0, y: 1.71, z: 0.27 }, materials.detailDark);
    addAvatarPart(root, { x: 0.15, y: 0.11, z: 0.03 }, { x: -0.12, y: 1.71, z: 0.29 }, materials.lens);
    addAvatarPart(root, { x: 0.15, y: 0.11, z: 0.03 }, { x: 0.12, y: 1.71, z: 0.29 }, materials.lens);

    addAvatarPart(root, { x: 0.04, y: 0.06, z: 0.04 }, { x: -0.29, y: 1.64, z: 0.03 }, materials.detailAccent);
    addAvatarPart(root, { x: 0.04, y: 0.06, z: 0.04 }, { x: 0.29, y: 1.64, z: 0.03 }, materials.detailAccent);
    addAvatarPart(root, { x: 0.09, y: 0.02, z: 0.04 }, { x: 0, y: 1.52, z: 0.27 }, materials.detailAccent);
}

function resolveAvatarPreset(payload) {
    const profileLabel = normalizeProfileLabel(payload?.label || payload?.displayName || "");

    if (profileLabel === "Mauricio") {
        return {
            style: "mauricio",
            palette: {
                skin: 0xf0b27f,
                cloth: 0xf3efe7,
                pants: 0x292a31,
                shoe: 0x2d2622,
                sole: 0xe9e5dc,
                hair: 0x2b221d,
                detailDark: 0x171419,
                detailAccent: 0xb9874f,
                lens: 0x5668cc
            }
        };
    }

    if (profileLabel === "Valentina") {
        return {
            style: "valentina",
            palette: {
                skin: 0xf0b073,
                cloth: 0x1f1f26,
                pants: 0x292a30,
                shoe: 0x2a2421,
                sole: 0xe8e3dc,
                hair: 0x2c211d,
                detailDark: 0x151219,
                detailAccent: 0xc19843,
                lens: 0x7a66ca
            }
        };
    }

    return {
        style: "default",
        palette: {
            skin: 0xffdfbf,
            cloth: parseHexColor(payload?.color, 0x8ad1ff),
            pants: 0x2d3a50,
            shoe: 0x2b2c33,
            sole: 0xdddddd,
            hair: 0x3a2d24,
            detailDark: 0x191919,
            detailAccent: 0x7aa9ff,
            lens: 0x6c7fe0
        }
    };
}

function createBlockyAvatar(payload) {
    const avatarRoot = new THREE.Group();
    const preset = resolveAvatarPreset(payload || {});
    const materials = createAvatarMaterials(preset.palette);

    if (preset.style === "mauricio") {
        buildMauricioAvatar(avatarRoot, materials);
        return avatarRoot;
    }

    if (preset.style === "valentina") {
        buildValentinaAvatar(avatarRoot, materials);
        return avatarRoot;
    }

    addAvatarPart(avatarRoot, { x: 0.48, y: 0.46, z: 0.48 }, { x: 0, y: 1.67, z: 0 }, materials.skin);
    addAvatarPart(avatarRoot, { x: 0.54, y: 0.72, z: 0.28 }, { x: 0, y: 1.08, z: 0 }, materials.cloth);
    addAvatarPart(avatarRoot, { x: 0.2, y: 0.68, z: 0.2 }, { x: -0.37, y: 1.08, z: 0 }, materials.skin);
    addAvatarPart(avatarRoot, { x: 0.2, y: 0.68, z: 0.2 }, { x: 0.37, y: 1.08, z: 0 }, materials.skin);
    addAvatarPart(avatarRoot, { x: 0.23, y: 0.72, z: 0.23 }, { x: -0.13, y: 0.36, z: 0 }, materials.pants);
    addAvatarPart(avatarRoot, { x: 0.23, y: 0.72, z: 0.23 }, { x: 0.13, y: 0.36, z: 0 }, materials.pants);

    return avatarRoot;
}

function createRemotePlayerNode(playerId, payload) {
    const group = new THREE.Group();
    group.add(createBlockyAvatar(payload || {}));

    const nameTag = createNameTagSprite(payload.displayName || playerId, payload.color || "#8ad1ff");
    if (nameTag) {
        nameTag.position.set(0, 2.25, 0);
        group.add(nameTag);
    }

    group.position.set(
        Number(payload.x) || 0,
        Number(payload.y) || 10,
        Number(payload.z) || 0
    );
    group.rotation.y = Number(payload.yaw) || 0;

    remotePlayersRoot.add(group);

    return {
        id: playerId,
        group,
        targetPosition: group.position.clone(),
        targetYaw: group.rotation.y,
        nameTag,
        lastSeenAt: Date.now()
    };
}

function upsertRemotePlayer(playerId, payload) {
    if (!payload || playerId === multiplayer.profile?.id) {
        return;
    }

    let node = multiplayer.remotePlayers.get(playerId);
    if (!node) {
        node = createRemotePlayerNode(playerId, payload);
        multiplayer.remotePlayers.set(playerId, node);
    }

    node.targetPosition.set(
        Number(payload.x) || 0,
        Number(payload.y) || 10,
        Number(payload.z) || 0
    );
    node.targetYaw = Number(payload.yaw) || 0;
    node.lastSeenAt = Date.now();
}

function removeRemotePlayer(playerId) {
    const node = multiplayer.remotePlayers.get(playerId);
    if (!node) {
        return;
    }

    if (node.nameTag?.material?.map) {
        node.nameTag.material.map.dispose();
    }

    node.group.traverse((child) => {
        if (child.isMesh) {
            child.geometry?.dispose?.();
            child.material?.dispose?.();
        }
    });

    remotePlayersRoot.remove(node.group);
    multiplayer.remotePlayers.delete(playerId);
}

function updateRemotePlayers(deltaSeconds) {
    const lerpFactor = Math.min(1, 12 * deltaSeconds);
    for (const node of multiplayer.remotePlayers.values()) {
        node.group.position.lerp(node.targetPosition, lerpFactor);

        let yawDelta = node.targetYaw - node.group.rotation.y;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        node.group.rotation.y += yawDelta * lerpFactor;
    }
}

function isFirebaseConfigReady(config) {
    if (!config || typeof config !== "object") {
        return false;
    }

    const keys = [
        "apiKey",
        "authDomain",
        "databaseURL",
        "projectId",
        "storageBucket",
        "messagingSenderId",
        "appId"
    ];

    return keys.every((key) => {
        const value = String(config[key] || "").trim();
        return value && value !== "REEMPLAZA_ESTO";
    });
}

function flushCloudEditWrites() {
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.chunksRootRef) {
        return;
    }

    if (!multiplayer.pendingEditWrites.size) {
        return;
    }

    const updates = {};
    for (const [key, value] of multiplayer.pendingEditWrites.entries()) {
        updates[key] = value;
    }

    multiplayer.pendingEditWrites.clear();
    multiplayer.firebase.dbModule.update(multiplayer.refs.chunksRootRef, updates).catch((error) => {
        console.warn("No pude sincronizar cambios de bloques (batch)", error);

        for (const [key, value] of Object.entries(updates)) {
            if (!multiplayer.pendingEditWrites.has(key)) {
                multiplayer.pendingEditWrites.set(key, value);
            }
        }

        if (multiplayer.writeTimerId === null) {
            multiplayer.writeTimerId = window.setTimeout(() => {
                multiplayer.writeTimerId = null;
                flushCloudEditWrites();
            }, CLOUD_EDIT_RETRY_MS);
        }
    });
}

function queueCloudEditWrite(key, value) {
    multiplayer.pendingEditWrites.set(key, value);

    if (multiplayer.writeTimerId !== null) {
        return;
    }

    multiplayer.writeTimerId = window.setTimeout(() => {
        multiplayer.writeTimerId = null;
        flushCloudEditWrites();
    }, CLOUD_EDIT_WRITE_BATCH_MS);
}

function subscribeChunkEditStream(chunkId) {
    if (!multiplayer.ready || multiplayer.chunkEditSubscriptions.has(chunkId)) {
        return;
    }

    const dbModule = multiplayer.firebase?.dbModule;
    const db = multiplayer.firebase?.db;
    if (!dbModule || !db) {
        return;
    }

    const chunkRef = dbModule.ref(db, `${multiplayer.worldPath}/chunks/${chunkId}/edits`);

    const unsubAdded = dbModule.onChildAdded(chunkRef, (snapshot) => {
        applyRemoteEditEntry(snapshot.key || "", snapshot.val());
    });

    const unsubChanged = dbModule.onChildChanged(chunkRef, (snapshot) => {
        applyRemoteEditEntry(snapshot.key || "", snapshot.val());
    });

    const unsubRemoved = dbModule.onChildRemoved(chunkRef, (snapshot) => {
        applyRemoteEditRemoval(snapshot.key || "");
    });

    multiplayer.chunkEditSubscriptions.set(chunkId, [unsubAdded, unsubChanged, unsubRemoved]);
}

function unsubscribeChunkEditStream(chunkId) {
    const unsubscribers = multiplayer.chunkEditSubscriptions.get(chunkId);
    if (!unsubscribers) {
        return;
    }

    for (const unsubscribe of unsubscribers) {
        if (typeof unsubscribe === "function") {
            unsubscribe();
        }
    }

    multiplayer.chunkEditSubscriptions.delete(chunkId);
}

function syncChunkEditSubscriptions() {
    if (!multiplayer.ready) {
        return;
    }

    const desired = new Set(chunkMap.keys());

    for (const chunkId of desired) {
        subscribeChunkEditStream(chunkId);
    }

    for (const chunkId of Array.from(multiplayer.chunkEditSubscriptions.keys())) {
        if (!desired.has(chunkId)) {
            unsubscribeChunkEditStream(chunkId);
        }
    }
}

function clearChunkEditSubscriptions() {
    for (const chunkId of Array.from(multiplayer.chunkEditSubscriptions.keys())) {
        unsubscribeChunkEditStream(chunkId);
    }
}

function applyRemoteEditEntry(key, rawValue) {
    const parsed = parseBlockKey(key);
    if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z)) {
        return;
    }

    const id = Number(rawValue);
    if (!isValidBlockId(id)) {
        return;
    }

    applyBlockMutation(parsed.x, parsed.y, parsed.z, id, "remote");
}

function applyRemoteEditRemoval(key) {
    const parsed = parseBlockKey(key);
    if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z)) {
        return;
    }

    const procedural = getProceduralBlock(parsed.x, parsed.y, parsed.z);
    applyBlockMutation(parsed.x, parsed.y, parsed.z, procedural, "remote");
}

function collectCompactEditsFromLegacyOps(opsPayload) {
    const compact = new Map();
    const entries = Object.entries(opsPayload || {}).sort(([a], [b]) => a.localeCompare(b));

    for (const [, op] of entries) {
        const x = Number(op?.x);
        const y = Number(op?.y);
        const z = Number(op?.z);
        const id = Number(op?.id);

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !isValidBlockId(id)) {
            continue;
        }

        if (!inWorldBounds(x, y, z)) {
            continue;
        }

        const key = blockKey(x, y, z);
        const procedural = getProceduralBlock(x, y, z);

        if (id === procedural) {
            compact.delete(key);
        } else {
            compact.set(key, id);
        }
    }

    return compact;
}

async function migrateLegacyOpsIfNeeded(dbModule, db, worldPath) {
    const chunksRef = dbModule.ref(db, `${worldPath}/chunks`);
    const chunksSnap = await dbModule.get(chunksRef);
    if (chunksSnap.exists()) {
        return;
    }

    const editsRef = dbModule.ref(db, `${worldPath}/edits`);
    const editsSnap = await dbModule.get(editsRef);
    let compact = new Map();

    if (editsSnap.exists()) {
        const payload = editsSnap.val() || {};
        for (const [key, rawId] of Object.entries(payload)) {
            const parsed = parseBlockKey(key);
            const id = Number(rawId);

            if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z) || !isValidBlockId(id)) {
                continue;
            }

            const procedural = getProceduralBlock(parsed.x, parsed.y, parsed.z);
            if (id === procedural) {
                compact.delete(key);
            } else {
                compact.set(key, id);
            }
        }
    }

    const opsRef = dbModule.ref(db, `${worldPath}/ops`);
    if (!compact.size) {
        const opsSnap = await dbModule.get(opsRef);
        if (opsSnap.exists()) {
            compact = collectCompactEditsFromLegacyOps(opsSnap.val());
        }
    }

    if (!compact.size) {
        return;
    }

    const payload = {};
    for (const [key, id] of compact.entries()) {
        const parsed = parseBlockKey(key);
        if (!parsed) {
            continue;
        }

        const cx = worldToChunkCoord(parsed.x);
        const cz = worldToChunkCoord(parsed.z);
        payload[`chunks/${chunkKey(cx, cz)}/edits/${key}`] = id;
    }

    if (Object.keys(payload).length > 0) {
        await dbModule.update(dbModule.ref(db, worldPath), payload);
    }

    await dbModule.remove(editsRef);
    await dbModule.remove(opsRef);
}

function updateAdaptiveQuality(deltaSeconds) {
    const fpsInstant = deltaSeconds > 0 ? 1 / deltaSeconds : 60;
    perfState.fpsEma = perfState.fpsEma * 0.92 + fpsInstant * 0.08;
    perfState.adjustCooldown -= deltaSeconds;

    if (perfState.adjustCooldown > 0) {
        return;
    }

    const minRatio = 0.72;
    let nextRatio = perfState.dynamicPixelRatio;

    if (perfState.fpsEma < 47 && nextRatio > minRatio) {
        nextRatio = Math.max(minRatio, nextRatio - 0.08);
    } else if (perfState.fpsEma > 58 && nextRatio < basePixelRatio) {
        nextRatio = Math.min(basePixelRatio, nextRatio + 0.05);
    }

    if (Math.abs(nextRatio - perfState.dynamicPixelRatio) < 0.01) {
        return;
    }

    perfState.dynamicPixelRatio = Number(nextRatio.toFixed(2));
    renderer.setPixelRatio(perfState.dynamicPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    perfState.adjustCooldown = 1.4;
}

function getDynamicChunkBuildBudget() {
    if (state.pendingChunkBuildCount <= 0) {
        return 0;
    }

    if (perfState.fpsEma < 38) {
        return 1;
    }

    if (perfState.fpsEma > 58 && state.pendingChunkBuildCount > 14) {
        return 3;
    }

    return CHUNK_REBUILD_BUDGET_PER_FRAME;
}

let runtimeFirebaseConfigPromise = null;

async function resolveFirebaseConfig() {
    const staticConfig = multiplayerConfig.firebase || {};
    if (isFirebaseConfigReady(staticConfig)) {
        return staticConfig;
    }

    const endpoint = String(multiplayerConfig.firebaseConfigEndpoint || "/.netlify/functions/firebase-client-config");

    if (!runtimeFirebaseConfigPromise) {
        runtimeFirebaseConfigPromise = fetch(endpoint, {
            method: "GET",
            cache: "no-store"
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Config endpoint error (${response.status})`);
                }

                return response.json();
            })
            .then((payload) => payload?.firebase || {})
            .catch((error) => {
                console.warn("No pude leer config Firebase en runtime", error);
                return {};
            });
    }

    return runtimeFirebaseConfigPromise;
}

async function setupRealtimeMultiplayer() {
    multiplayer.profile = resolvePlayerIdentity();
    const profileLabel = multiplayer.profile.displayName || multiplayer.profile.label;
    setOnlineStatus(`Jugador: ${profileLabel} · modo solo`);

    if (!multiplayerConfig?.enabled) {
        return;
    }

    const firebaseConfig = await resolveFirebaseConfig();
    if (!isFirebaseConfigReady(firebaseConfig)) {
        setOnlineStatus("Multijugador: falta config Firebase (Netlify env)");
        return;
    }

    const roomFromQuery = urlParams.get("room") || "";
    multiplayer.roomId = sanitizeRoomId(roomFromQuery || multiplayerConfig.roomId || "mundo-principal");

    try {
        const appModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const dbModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");

        const appName = `girasol-${multiplayer.roomId}`;
        const existingApp = appModule.getApps().find((item) => item.name === appName);
        const app = existingApp || appModule.initializeApp(firebaseConfig, appName);
        const db = dbModule.getDatabase(app);
        const worldPath = `worlds/${multiplayer.roomId}`;

        await migrateLegacyOpsIfNeeded(dbModule, db, worldPath);

        multiplayer.firebase = { dbModule, db };
        multiplayer.worldPath = worldPath;
        multiplayer.refs.playersRef = dbModule.ref(db, `${worldPath}/players`);
        multiplayer.refs.myPlayerRef = dbModule.ref(db, `${worldPath}/players/${multiplayer.profile.id}`);
        multiplayer.refs.chunksRootRef = dbModule.ref(db, `${worldPath}/chunks`);

        const connectedRef = dbModule.ref(db, ".info/connected");
        const unsubConnected = dbModule.onValue(connectedRef, (snapshot) => {
            if (snapshot.val() !== true) {
                return;
            }

            dbModule.onDisconnect(multiplayer.refs.myPlayerRef).remove().catch(() => {
            });
            broadcastLocalPlayerState(true);
        });

        const unsubPlayers = dbModule.onValue(multiplayer.refs.playersRef, (snapshot) => {
            const payload = snapshot.val() || {};
            const aliveIds = new Set();

            Object.entries(payload).forEach(([playerId, playerData]) => {
                aliveIds.add(playerId);
                upsertRemotePlayer(playerId, playerData || {});
            });

            for (const remoteId of multiplayer.remotePlayers.keys()) {
                if (!aliveIds.has(remoteId)) {
                    removeRemotePlayer(remoteId);
                }
            }

            const totalOnline = Object.keys(payload).length;
            setOnlineStatus(`Sala ${multiplayer.roomId}: ${totalOnline} conectado(s)`);
        });

        multiplayer.unsubscribers.push(unsubConnected, unsubPlayers);
        multiplayer.enabled = true;
        multiplayer.ready = true;
        syncChunkEditSubscriptions();
        setOnlineStatus(`Sala ${multiplayer.roomId}: multijugador activo`);
    } catch (error) {
        console.error("No se pudo conectar multijugador", error);
        setOnlineStatus("Multijugador no disponible. Sigues en modo solo.");
    }
}

function broadcastLocalPlayerState(force = false) {
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.myPlayerRef) {
        return;
    }

    const now = performance.now();
    if (!force && now - multiplayer.lastBroadcastMs < multiplayer.sendIntervalMs) {
        return;
    }

    multiplayer.lastBroadcastMs = now;
    const cameraHolder = controls.getObject();

    const payload = {
        label: multiplayer.profile.label,
        displayName: multiplayer.profile.displayName,
        color: multiplayer.profile.color,
        x: Number(state.playerPosition.x.toFixed(3)),
        y: Number(state.playerPosition.y.toFixed(3)),
        z: Number(state.playerPosition.z.toFixed(3)),
        yaw: Number(cameraHolder.rotation.y.toFixed(4)),
        pitch: Number(camera.rotation.x.toFixed(4)),
        started: state.worldStarted,
        updatedAt: Date.now()
    };

    multiplayer.firebase.dbModule.set(multiplayer.refs.myPlayerRef, payload).catch((error) => {
        console.warn("No pude publicar posicion de jugador", error);
    });
}

function publishBlockMutation(x, y, z, id) {
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.chunksRootRef) {
        return;
    }

    const key = blockKey(x, y, z);
    const overrideValue = editedBlocks.get(key);
    const cx = worldToChunkCoord(x);
    const cz = worldToChunkCoord(z);
    const chunkId = chunkKey(cx, cz);

    queueCloudEditWrite(`${chunkId}/edits/${key}`, overrideValue === undefined ? null : overrideValue);
}

function blockKey(x, y, z) {
    return `${x}|${y}|${z}`;
}

function chunkKey(cx, cz) {
    return `${cx}|${cz}`;
}

function parseChunkKey(key) {
    const [cxText, czText] = String(key).split("|");
    return { cx: Number(cxText), cz: Number(czText) };
}

function worldToChunkCoord(value) {
    return Math.floor(value / CHUNK_SIZE);
}

function worldToLocalCoord(value) {
    const mod = value % CHUNK_SIZE;
    return mod < 0 ? mod + CHUNK_SIZE : mod;
}

function inWorldBounds(x, y, z) {
    return y >= 0 && y < WORLD_MAX_Y;
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

function hash2D(x, z, salt = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul((WORLD_SEED + salt) | 0, 1442695041);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return h;
}

function hashUnit(x, z, salt = 0) {
    return (hash2D(x, z, salt) & 0xffff) / 0xffff;
}

function valueNoise2D(x, z, frequency, salt = 0) {
    const fx = x * frequency;
    const fz = z * frequency;

    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    const tx = fx - x0;
    const tz = fz - z0;
    const sx = tx * tx * (3 - 2 * tx);
    const sz = tz * tz * (3 - 2 * tz);

    const n00 = hashUnit(x0, z0, salt);
    const n10 = hashUnit(x1, z0, salt);
    const n01 = hashUnit(x0, z1, salt);
    const n11 = hashUnit(x1, z1, salt);

    const nx0 = lerp(n00, n10, sx);
    const nx1 = lerp(n01, n11, sx);
    return lerp(nx0, nx1, sz) * 2 - 1;
}

function fractalNoise2D(x, z, baseFrequency, octaves, persistence, salt = 0) {
    let amplitude = 1;
    let amplitudeTotal = 0;
    let frequency = baseFrequency;
    let sum = 0;

    for (let octave = 0; octave < octaves; octave += 1) {
        sum += valueNoise2D(x, z, frequency, salt + octave * 97) * amplitude;
        amplitudeTotal += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    if (amplitudeTotal <= 0) {
        return 0;
    }

    return sum / amplitudeTotal;
}

function getColumnInfo(x, z) {
    const key = `${x}|${z}`;
    const cached = columnCache.get(key);
    if (cached) {
        return cached;
    }

    const macro = fractalNoise2D(x, z, 0.0022, 4, 0.52, 31);
    const ridge = 1 - Math.abs(fractalNoise2D(x, z, 0.0038, 3, 0.55, 67));
    const detail = fractalNoise2D(x, z, 0.021, 2, 0.5, 11);

    const mountainMask = smoothstep(0.1, 0.62, macro);
    const plainsMask = smoothstep(0.24, 0.88, -macro);
    const plainsHeight = SEA_LEVEL + 2 + detail * 2.4;
    const mountainsHeight = SEA_LEVEL + 6 + mountainMask * 14 + ridge * 12 + detail * 3;

    let rawHeight = lerp(plainsHeight, mountainsHeight, mountainMask);
    rawHeight -= plainsMask * 2.2;
    const height = clampInt(rawHeight, 4, WORLD_MAX_Y - 6);

    const moisture = fractalNoise2D(x, z, 0.0032, 2, 0.6, 109);
    const treeChance = 0.004 + smoothstep(-0.28, 0.42, moisture) * 0.018;
    const steepPenalty = mountainMask * 0.8;
    const roll = hashUnit(x, z, 91);
    const hasTree = height > SEA_LEVEL + 1 && roll < Math.max(0, treeChance - steepPenalty);
    const treeHeight = 4 + (hash2D(x, z, 103) % 2);

    const info = {
        height,
        mountainMask,
        hasTree,
        treeHeight
    };

    columnCache.set(key, info);
    return info;
}

function terrainHeight(x, z) {
    return getColumnInfo(x, z).height;
}

function isTreeBase(x, z, surfaceY) {
    const info = getColumnInfo(x, z);
    return info.height === surfaceY && info.hasTree;
}

function treeHeightAt(x, z) {
    return getColumnInfo(x, z).treeHeight;
}

function getTreeBlockAt(x, y, z) {
    for (let tx = x - 2; tx <= x + 2; tx += 1) {
        for (let tz = z - 2; tz <= z + 2; tz += 1) {
            const column = getColumnInfo(tx, tz);
            const surfaceY = column.height;
            if (!column.hasTree) {
                continue;
            }

            const trunkStart = surfaceY + 1;
            const trunkTop = trunkStart + column.treeHeight;

            if (x === tx && z === tz && y >= trunkStart && y < trunkTop) {
                return BLOCK.WOOD;
            }

            const topY = trunkTop;
            const dx = x - tx;
            const dy = y - topY;
            const dz = z - tz;
            const ax = Math.abs(dx);
            const az = Math.abs(dz);

            if (dy < -1 || dy > 2) {
                continue;
            }

            if (dy === 2 && ax + az <= 1) {
                return BLOCK.LEAVES;
            }

            if (dy === 1 && ax <= 1 && az <= 1) {
                return BLOCK.LEAVES;
            }

            if (dy === 0 && ax <= 2 && az <= 2 && !(ax === 2 && az === 2)) {
                return BLOCK.LEAVES;
            }

            if (dy === -1 && ax + az <= 1) {
                return BLOCK.LEAVES;
            }
        }
    }

    return BLOCK.AIR;
}

function getProceduralBlock(x, y, z) {
    if (y < 0) {
        return BLOCK.BEDROCK;
    }

    if (y >= WORLD_MAX_Y) {
        return BLOCK.AIR;
    }

    const column = getColumnInfo(x, z);
    const h = column.height;
    if (y === 0) {
        return BLOCK.BEDROCK;
    }

    if (y > h) {
        if (y <= SEA_LEVEL) {
            return BLOCK.WATER;
        }

        if (h > SEA_LEVEL + 1) {
            return getTreeBlockAt(x, y, z);
        }

        return BLOCK.AIR;
    }

    if (y === h) {
        if (h <= SEA_LEVEL + 1) {
            return BLOCK.SAND;
        }

        if (column.mountainMask > 0.62 && h >= SEA_LEVEL + 12) {
            return BLOCK.STONE;
        }

        return BLOCK.GRASS;
    }

    if (h <= SEA_LEVEL + 1 && y >= h - 3) {
        return BLOCK.SAND;
    }

    if (y >= h - 2) {
        return BLOCK.DIRT;
    }

    return BLOCK.STONE;
}

function getBlock(x, y, z) {
    const override = editedBlocks.get(blockKey(x, y, z));
    if (override !== undefined) {
        return override;
    }

    return getProceduralBlock(x, y, z);
}

function markChunkDirty(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = chunkMap.get(key);
    if (!chunk) {
        return;
    }

    chunk.dirty = true;
    chunkRebuildQueue.add(key);
}

function markChunksDirtyAroundBlock(x, z) {
    const cx = worldToChunkCoord(x);
    const cz = worldToChunkCoord(z);
    const lx = worldToLocalCoord(x);
    const lz = worldToLocalCoord(z);

    markChunkDirty(cx, cz);

    if (lx === 0) markChunkDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) markChunkDirty(cx + 1, cz);
    if (lz === 0) markChunkDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) markChunkDirty(cx, cz + 1);

    if (lx === 0 && lz === 0) markChunkDirty(cx - 1, cz - 1);
    if (lx === 0 && lz === CHUNK_SIZE - 1) markChunkDirty(cx - 1, cz + 1);
    if (lx === CHUNK_SIZE - 1 && lz === 0) markChunkDirty(cx + 1, cz - 1);
    if (lx === CHUNK_SIZE - 1 && lz === CHUNK_SIZE - 1) markChunkDirty(cx + 1, cz + 1);
}

function setBlock(x, y, z, id) {
    const key = blockKey(x, y, z);
    const proceduralId = getProceduralBlock(x, y, z);

    if (id === proceduralId) {
        editedBlocks.delete(key);
    } else {
        editedBlocks.set(key, id);
    }

    markChunksDirtyAroundBlock(x, z);
}

function isBlockVisible(x, y, z, id) {
    const neighbors = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1]
    ];

    for (const [dx, dy, dz] of neighbors) {
        const neighborId = getBlock(x + dx, y + dy, z + dz);
        if (neighborId === BLOCK.AIR) {
            return true;
        }

        if (id === BLOCK.LEAVES && neighborId !== BLOCK.LEAVES) {
            return true;
        }
    }

    return false;
}

function removeMeshReferences(mesh) {
    if (mesh.userData?.lookupKeys) {
        for (const key of mesh.userData.lookupKeys) {
            blockPositionLookup.delete(key);
        }
    }

    const index = blockMeshes.indexOf(mesh);
    if (index >= 0) {
        blockMeshes.splice(index, 1);
    }

    worldRoot.remove(mesh);
}

function rebuildChunkMesh(chunk) {
    if (!chunk) {
        return;
    }

    while (chunk.meshes.length) {
        const mesh = chunk.meshes.pop();
        removeMeshReferences(mesh);
    }

    const positionsByBlock = new Map();
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
            const x = baseX + lx;
            const z = baseZ + lz;

            for (let y = 0; y < WORLD_MAX_Y; y += 1) {
                const id = getBlock(x, y, z);
                if (id === BLOCK.AIR) {
                    continue;
                }

                if (!isBlockVisible(x, y, z, id)) {
                    continue;
                }

                let positions = positionsByBlock.get(id);
                if (!positions) {
                    positions = [];
                    positionsByBlock.set(id, positions);
                }

                positions.push({ x, y, z });
            }
        }
    }

    const matrix = new THREE.Matrix4();

    positionsByBlock.forEach((positions, id) => {
        const material = blockMaterials[id];
        if (!material || positions.length === 0) {
            return;
        }

        const mesh = new THREE.InstancedMesh(blockGeometry, material, positions.length);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.userData.blockId = id;
        mesh.userData.lookupKeys = [];

        for (let index = 0; index < positions.length; index += 1) {
            const { x, y, z } = positions[index];
            matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
            mesh.setMatrixAt(index, matrix);

            const lookupKey = `${mesh.id}:${index}`;
            blockPositionLookup.set(lookupKey, { x, y, z, id });
            mesh.userData.lookupKeys.push(lookupKey);
        }

        mesh.instanceMatrix.needsUpdate = true;
        worldRoot.add(mesh);
        blockMeshes.push(mesh);
        chunk.meshes.push(mesh);
    });

    chunk.dirty = false;
}

function ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    let chunk = chunkMap.get(key);
    if (chunk) {
        return chunk;
    }

    chunk = {
        cx,
        cz,
        meshes: [],
        dirty: true
    };

    chunkMap.set(key, chunk);
    chunkRebuildQueue.add(key);
    return chunk;
}

function unloadChunk(key) {
    const chunk = chunkMap.get(key);
    if (!chunk) {
        return;
    }

    while (chunk.meshes.length) {
        const mesh = chunk.meshes.pop();
        removeMeshReferences(mesh);
    }

    chunkMap.delete(key);
    chunkRebuildQueue.delete(key);

    if (multiplayer.ready) {
        unsubscribeChunkEditStream(key);
    }
}

function updateChunkStreaming(force = false) {
    state.chunkTick = force ? CHUNK_MANAGEMENT_INTERVAL : state.chunkTick;

    if (state.chunkTick < CHUNK_MANAGEMENT_INTERVAL) {
        return;
    }

    state.chunkTick = 0;
    const centerCx = worldToChunkCoord(state.playerPosition.x);
    const centerCz = worldToChunkCoord(state.playerPosition.z);

    const desired = new Set();
    const orderedTargets = [];

    for (let dx = -state.chunkRadius; dx <= state.chunkRadius; dx += 1) {
        for (let dz = -state.chunkRadius; dz <= state.chunkRadius; dz += 1) {
            const cx = centerCx + dx;
            const cz = centerCz + dz;
            const key = chunkKey(cx, cz);

            desired.add(key);
            orderedTargets.push({ key, cx, cz, dist: Math.abs(dx) + Math.abs(dz) });
        }
    }

    orderedTargets.sort((a, b) => a.dist - b.dist);

    for (const target of orderedTargets) {
        ensureChunk(target.cx, target.cz);
    }

    for (const key of chunkMap.keys()) {
        if (!desired.has(key)) {
            unloadChunk(key);
        }
    }

    if (multiplayer.ready) {
        syncChunkEditSubscriptions();
    }

    state.loadedChunkCount = chunkMap.size;
    state.pendingChunkBuildCount = chunkRebuildQueue.size;
}

function processChunkRebuildQueue(maxBuilds = CHUNK_REBUILD_BUDGET_PER_FRAME) {
    let builds = 0;
    while (builds < maxBuilds && chunkRebuildQueue.size > 0) {
        const iterator = chunkRebuildQueue.values().next();
        if (iterator.done) {
            break;
        }

        const key = iterator.value;
        chunkRebuildQueue.delete(key);

        const chunk = chunkMap.get(key);
        if (!chunk || !chunk.dirty) {
            continue;
        }

        rebuildChunkMesh(chunk);
        builds += 1;
    }

    state.pendingChunkBuildCount = chunkRebuildQueue.size;
}

function setChunkRadius(nextRadius) {
    const clamped = clampInt(nextRadius, 2, 8);
    if (clamped === state.chunkRadius) {
        return;
    }

    state.chunkRadius = clamped;
    updateChunkStreaming(true);
    setChunkInfo(`Chunks: ${state.chunkRadius} | Cargados: ${state.loadedChunkCount} | Pendientes: ${state.pendingChunkBuildCount}`);
}

function applyBlockMutation(x, y, z, id, origin = "local") {
    if (!inWorldBounds(x, y, z)) {
        return;
    }

    if (getBlock(x, y, z) === id) {
        return;
    }

    const key = blockKey(x, y, z);
    const hadOverride = editedBlocks.has(key);
    const procedural = getProceduralBlock(x, y, z);
    const willHaveOverride = id !== procedural;

    if (origin === "local" && !hadOverride && willHaveOverride && editedBlocks.size >= MAX_EDITED_BLOCKS) {
        setOnlineStatus(`Limite de ciudad alcanzado (${MAX_EDITED_BLOCKS} bloques editados)`);
        showToast("Limite de ciudad alcanzado", "warning", 1300);
        return;
    }

    setBlock(x, y, z, id);
    scheduleWorldSave();

    if (origin === "local") {
        publishBlockMutation(x, y, z, id);
    }
}

function isSolidBlock(id) {
    return id !== BLOCK.AIR && id !== BLOCK.WATER;
}

function collidesAt(x, y, z) {
    const minX = Math.floor(x - PLAYER_RADIUS);
    const maxX = Math.floor(x + PLAYER_RADIUS);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + PLAYER_HEIGHT - 0.001);
    const minZ = Math.floor(z - PLAYER_RADIUS);
    const maxZ = Math.floor(z + PLAYER_RADIUS);

    for (let yy = minY; yy <= maxY; yy += 1) {
        for (let xx = minX; xx <= maxX; xx += 1) {
            for (let zz = minZ; zz <= maxZ; zz += 1) {
                if (yy < 0) {
                    return true;
                }

                if (yy >= WORLD_MAX_Y) {
                    continue;
                }

                if (isSolidBlock(getBlock(xx, yy, zz))) {
                    return true;
                }
            }
        }
    }

    return false;
}

function updateOnGroundFlag() {
    const feetCheckY = state.playerPosition.y - 0.06;
    state.onGround = collidesAt(state.playerPosition.x, feetCheckY, state.playerPosition.z);
}

function movePlayerHorizontal(moveX, moveZ) {
    if (moveX !== 0) {
        const nx = state.playerPosition.x + moveX;
        if (!collidesAt(nx, state.playerPosition.y, state.playerPosition.z)) {
            state.playerPosition.x = nx;
        }
    }

    if (moveZ !== 0) {
        const nz = state.playerPosition.z + moveZ;
        if (!collidesAt(state.playerPosition.x, state.playerPosition.y, nz)) {
            state.playerPosition.z = nz;
        }
    }
}

function movePlayerVertical(deltaY) {
    if (deltaY === 0) {
        return;
    }

    const ny = state.playerPosition.y + deltaY;

    if (!collidesAt(state.playerPosition.x, ny, state.playerPosition.z)) {
        state.playerPosition.y = ny;
        return;
    }

    if (deltaY < 0) {
        state.onGround = true;
    }

    state.velocityY = 0;
}

function clampPlayerToWorld() {
    state.playerPosition.y = Math.max(0.01, state.playerPosition.y);
}

function getForwardRightVectors() {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;

    if (direction.lengthSq() < 1e-8) {
        direction.copy(state.lastForward);
    } else {
        direction.normalize();
        state.lastForward.copy(direction);
    }

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    return { forward: direction, right };
}

function updatePlayer(deltaSeconds) {
    const turnSpeed = 1.6 * deltaSeconds;
    const pitchSpeed = 1.25 * deltaSeconds;

    if (!controls.isLocked) {
        if (state.keyDown.has("ArrowLeft")) {
            controls.getObject().rotation.y += turnSpeed;
        }

        if (state.keyDown.has("ArrowRight")) {
            controls.getObject().rotation.y -= turnSpeed;
        }

        if (state.keyDown.has("ArrowUp")) {
            camera.rotation.x = THREE.MathUtils.clamp(
                camera.rotation.x + pitchSpeed,
                -Math.PI * 0.5,
                Math.PI * 0.5
            );
        }

        if (state.keyDown.has("ArrowDown")) {
            camera.rotation.x = THREE.MathUtils.clamp(
                camera.rotation.x - pitchSpeed,
                -Math.PI * 0.5,
                Math.PI * 0.5
            );
        }
    }

    const speed = state.keyDown.has("ShiftLeft") ? SPRINT_SPEED : BASE_SPEED;
    const { forward, right } = getForwardRightVectors();

    let moveForward = 0;
    let moveRight = 0;

    if (state.keyDown.has("KeyW")) moveForward += 1;
    if (state.keyDown.has("KeyS")) moveForward -= 1;
    if (state.keyDown.has("KeyD")) moveRight += 1;
    if (state.keyDown.has("KeyA")) moveRight -= 1;

    const moveVector = new THREE.Vector3();
    if (moveForward !== 0) moveVector.addScaledVector(forward, moveForward);
    if (moveRight !== 0) moveVector.addScaledVector(right, moveRight);

    if (moveVector.lengthSq() > 0) {
        moveVector.normalize().multiplyScalar(speed * deltaSeconds);
        movePlayerHorizontal(moveVector.x, moveVector.z);
    }

    updateOnGroundFlag();

    if (state.onGround && state.keyDown.has("Space")) {
        state.velocityY = JUMP_SPEED;
        state.onGround = false;
    }

    state.velocityY -= GRAVITY * deltaSeconds;
    movePlayerVertical(state.velocityY * deltaSeconds);
    clampPlayerToWorld();

    controls.getObject().position.set(
        state.playerPosition.x,
        state.playerPosition.y + EYE_HEIGHT,
        state.playerPosition.z
    );
}

function updateHud() {
    const p = state.playerPosition;
    coordsEl.textContent = `X: ${p.x.toFixed(1)} Y: ${p.y.toFixed(1)} Z: ${p.z.toFixed(1)}`;
    setChunkInfo(`Chunks: ${state.chunkRadius} | Cargados: ${state.loadedChunkCount} | Pendientes: ${state.pendingChunkBuildCount} | Edits: ${editedBlocks.size}/${MAX_EDITED_BLOCKS} | Conejos: ${wildlifeState.rabbits.size} | Q: ${perfState.dynamicPixelRatio.toFixed(2)}x`);
}

function updateSelectedMaterialHud() {
    const blockInfo = PLACEABLE_BLOCKS[state.selectedHotbarIndex];
    const label = blockInfo?.label || "Material";

    if (selectedMaterialHudEl) {
        selectedMaterialHudEl.textContent = `Material: ${label}`;
    }

    if (hotbarSelectedMaterialEl) {
        hotbarSelectedMaterialEl.textContent = `Material seleccionado: ${label}`;
    }
}

function refreshHotbarUi() {
    hotbarEl.innerHTML = "";
    PLACEABLE_BLOCKS.forEach((blockInfo, index) => {
        const slot = document.createElement("div");
        slot.className = `slot${index === state.selectedHotbarIndex ? " selected" : ""}`;
        slot.setAttribute("aria-label", `${index + 1} ${blockInfo.label}`);
        slot.style.backgroundColor = `#${BLOCK_COLORS[blockInfo.id].toString(16).padStart(6, "0")}33`;
        slot.textContent = `${index + 1}\n${blockInfo.label}`;
        hotbarEl.appendChild(slot);
    });

    updateSelectedMaterialHud();
}

function selectedBlockId() {
    return PLACEABLE_BLOCKS[state.selectedHotbarIndex].id;
}

function attemptMineOrPlace(isPlacing) {
    if (!state.worldStarted || !state.worldReady) {
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = MAX_REACH;

    const intersects = raycaster.intersectObjects(blockMeshes, false);
    if (!intersects.length) {
        return;
    }

    const hit = intersects[0];
    const instanceId = hit.instanceId;
    if (instanceId === undefined || instanceId === null) {
        return;
    }

    const lookup = blockPositionLookup.get(`${hit.object.id}:${instanceId}`);
    if (!lookup) {
        return;
    }

    if (!isPlacing) {
        if (lookup.id === BLOCK.BEDROCK || lookup.id === BLOCK.WATER) {
            return;
        }

        applyBlockMutation(lookup.x, lookup.y, lookup.z, BLOCK.AIR, "local");
        return;
    }

    const normal = hit.face?.normal?.clone();
    if (!normal) {
        return;
    }

    const placeX = lookup.x + Math.round(normal.x);
    const placeY = lookup.y + Math.round(normal.y);
    const placeZ = lookup.z + Math.round(normal.z);

    if (!inWorldBounds(placeX, placeY, placeZ)) {
        return;
    }

    const targetId = getBlock(placeX, placeY, placeZ);
    if (targetId !== BLOCK.AIR && targetId !== BLOCK.WATER) {
        const now = performance.now();
        if (now - uiState.noSpaceToastAt > 700) {
            showToast("No hay espacio", "warning", 800);
            uiState.noSpaceToastAt = now;
        }
        return;
    }

    const intersectsPlayer = (
        placeX + 1 > state.playerPosition.x - PLAYER_RADIUS
        && placeX < state.playerPosition.x + PLAYER_RADIUS
        && placeY + 1 > state.playerPosition.y
        && placeY < state.playerPosition.y + PLAYER_HEIGHT
        && placeZ + 1 > state.playerPosition.z - PLAYER_RADIUS
        && placeZ < state.playerPosition.z + PLAYER_RADIUS
    );

    if (intersectsPlayer) {
        return;
    }

    applyBlockMutation(placeX, placeY, placeZ, selectedBlockId(), "local");
}

function setSelectedHotbar(index) {
    const clamped = THREE.MathUtils.clamp(index, 0, PLACEABLE_BLOCKS.length - 1);
    if (clamped === state.selectedHotbarIndex) {
        return;
    }

    state.selectedHotbarIndex = clamped;
    refreshHotbarUi();
    const label = PLACEABLE_BLOCKS[state.selectedHotbarIndex]?.label || "Material";
    showToast(`Material seleccionado: ${label}`, "success", 900);
}

function onMouseWheel(event) {
    if (!state.worldStarted || !state.worldReady || state.paused || state.tutorialVisible || !controls.isLocked) {
        return;
    }

    if (event.deltaY === 0) {
        return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    const total = PLACEABLE_BLOCKS.length;
    const next = (state.selectedHotbarIndex + direction + total) % total;
    setSelectedHotbar(next);
}

function onKeyDown(event) {
    if (event.code === "F3" || event.code === "Backquote") {
        event.preventDefault();
        setDebugVisible(!state.debugVisible, true);
        return;
    }

    if (event.code === "Escape") {
        event.preventDefault();

        if (!state.worldStarted) {
            return;
        }

        if (state.tutorialVisible) {
            closeTutorial(true);
            return;
        }

        if (state.paused) {
            setPauseMenuOpen(false);
            if (state.worldStarted) {
                try {
                    controls.lock();
                } catch (error) {
                }
            }
            return;
        }

        setPauseMenuOpen(true);
        return;
    }

    if (event.code === "KeyM" && state.paused) {
        setPauseSettingsOpen(!state.pauseSettingsOpen);
        return;
    }

    if (state.paused || state.tutorialVisible) {
        return;
    }

    if (/^Digit[1-6]$/.test(event.code)) {
        const idx = Number(event.code.slice(-1)) - 1;
        setSelectedHotbar(idx);
        return;
    }

    if (event.code === "Equal") {
        setChunkRadius(state.chunkRadius + 1);
        return;
    }

    if (event.code === "Minus") {
        setChunkRadius(state.chunkRadius - 1);
        return;
    }

    state.keyDown.add(event.code);
}

function onKeyUp(event) {
    state.keyDown.delete(event.code);
}

function onMouseDown(event) {
    if (!state.worldStarted) {
        return;
    }

    if (state.paused || state.tutorialVisible) {
        return;
    }

    if (!controls.isLocked) {
        try {
            controls.lock();
        } catch (error) {
        }
        return;
    }

    if (event.button === 0) {
        attemptMineOrPlace(false);
        return;
    }

    if (event.button === 2) {
        attemptMineOrPlace(true);
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(perfState.dynamicPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function setupEvents() {
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("wheel", onMouseWheel, { passive: false });

    window.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    controls.addEventListener("lock", () => {
        overlayEl.classList.add("hidden");
        setPauseMenuOpen(false);
    });

    controls.addEventListener("unlock", () => {
        if (!state.worldStarted) {
            overlayEl.classList.remove("hidden");
        }
    });

    startButton.addEventListener("click", () => {
        state.worldStarted = true;
        overlayEl.classList.add("hidden");
        setPauseMenuOpen(false);
        if (pauseButton) {
            pauseButton.classList.remove("hidden");
        }
        showTutorialIfNeeded();

        try {
            controls.lock();
        } catch (error) {
        }
    });

    if (pauseButton) {
        pauseButton.addEventListener("click", () => {
            setPauseMenuOpen(true);
        });
    }

    if (pauseContinueButton) {
        pauseContinueButton.addEventListener("click", () => {
            setPauseMenuOpen(false);
            try {
                controls.lock();
            } catch (error) {
            }
        });
    }

    if (pauseSettingsButton) {
        pauseSettingsButton.addEventListener("click", () => {
            setPauseSettingsOpen(!state.pauseSettingsOpen);
        });
    }

    if (pauseSaveButton) {
        pauseSaveButton.addEventListener("click", () => {
            saveWorldNow(true);
        });
    }

    if (pauseRestartButton) {
        pauseRestartButton.addEventListener("click", () => {
            const confirmed = window.confirm("Esto reiniciara los cambios locales guardados del mundo en este navegador. Quieres continuar?");
            if (!confirmed) {
                return;
            }

            try {
                window.localStorage.removeItem(WORLD_SAVE_KEY);
            } catch (error) {
            }

            window.location.reload();
        });
    }

    if (tutorialCloseButton) {
        tutorialCloseButton.addEventListener("click", () => {
            closeTutorial(true);
        });
    }

    window.addEventListener("beforeunload", () => {
        flushWorldSave(true);
        flushCloudEditWrites();
        clearChunkEditSubscriptions();
        clearWildlife();
    });
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 1 / 30);
    if (!state.paused) {
        state.chunkTick += delta;
        state.autoSaveTick += delta;
    }
    updateAdaptiveQuality(delta);

    if (state.worldStarted && !state.paused) {
        updatePlayer(delta);
    }

    updateSky(delta);
    if (!state.paused) {
        updateWildlife(delta);
    }

    updateChunkStreaming(false);
    const budget = getDynamicChunkBuildBudget();
    if (budget > 0) {
        processChunkRebuildQueue(budget);
    }

    updateRemotePlayers(delta);
    broadcastLocalPlayerState();

    if (!state.paused && state.autoSaveTick >= AUTO_SAVE_SECONDS) {
        state.autoSaveTick = 0;
        flushWorldSave();
    }

    updateTargetedBlockUi();
    updateHud();
    renderer.render(scene, camera);
}

function findSpawnPoint() {
    const sx = 0;
    const sz = 0;

    for (let y = WORLD_MAX_Y - 1; y >= 1; y -= 1) {
        const id = getBlock(sx, y, sz);
        if (id !== BLOCK.AIR && id !== BLOCK.WATER) {
            return new THREE.Vector3(sx + 0.5, y + 1.01, sz + 0.5);
        }
    }

    return new THREE.Vector3(0.5, 18, 0.5);
}

function init() {
    setBootStatus("Cargando mundo guardado...");
    createSkyDecor();
    setPauseMenuOpen(false);
    setPauseSettingsOpen(false);
    setDebugVisible(loadDebugVisibility(), false);
    if (pauseButton) {
        pauseButton.classList.add("hidden");
    }

    const loadedEdits = loadWorldFromStorage();
    if (loadedEdits > 0) {
        setBootStatus(`Cargados ${loadedEdits} cambios guardados.`);
    } else {
        setBootStatus("Generando mundo por chunks...");
    }

    const spawn = findSpawnPoint();
    state.playerPosition.copy(spawn);
    controls.getObject().position.set(spawn.x, spawn.y + EYE_HEIGHT, spawn.z);
    camera.position.set(0, 0, 0);

    refreshHotbarUi();
    setupEvents();

    updateChunkStreaming(true);
    processChunkRebuildQueue(INITIAL_CHUNK_BUILD_BUDGET);
    initWildlife();

    setupRealtimeMultiplayer();

    if (helpMiniEl) {
        helpMiniEl.textContent = "WASD mover · Mouse mirar · Click izq minar · Click der colocar · Espacio saltar · Rueda/Numeros material · F3 debug · ESC pausa";
    }

    state.worldReady = true;
    setBootStatus("Mundo listo. Presiona Entrar al mundo.");
    animate();
}

try {
    init();
} catch (error) {
    console.error("No se pudo iniciar el mundo 3D", error);
    setBootStatus("Error al iniciar el mundo 3D. Recarga la pagina.", true);
    if (overlayEl) {
        overlayEl.classList.remove("hidden");
    }
}
