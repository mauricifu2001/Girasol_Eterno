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
    SAND: 7
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
    [BLOCK.SAND]: 0xd4bf8d
};

const PORTAL_UNLOCK_STORAGE_KEY = "girasolPortalUnlocked";
const PORTAL_ACCESS_LABEL_STORAGE_KEY = "girasolPortalAccessLabel";
const MULTIPLAYER_SESSION_ID_KEY = "girasolMultiplayerSessionId";

const PROFILE_COLORS = {
    Mauricio: "#f4cf85",
    Valentina: "#ff96c9"
};

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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7ff);
scene.fog = new THREE.Fog(0x9bc7ff, 30, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const basePixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(basePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.68;
scene.add(controls.getObject());

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x6e748f, 0.9);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(16, 30, 8);
scene.add(sun);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

const remotePlayersRoot = new THREE.Group();
scene.add(remotePlayersRoot);

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const blockMaterials = Object.fromEntries(
    Object.entries(BLOCK_COLORS).map(([id, color]) => [
        Number(id),
        new THREE.MeshLambertMaterial({ color })
    ])
);

const chunkMap = new Map();
const chunkRebuildQueue = new Set();
const editedBlocks = new Map();

const blockMeshes = [];
const blockPositionLookup = new Map();

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();

const state = {
    selectedHotbarIndex: 0,
    velocityY: 0,
    onGround: false,
    keyDown: new Set(),
    playerPosition: new THREE.Vector3(0, 17, 0),
    worldStarted: false,
    worldReady: false,
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
    profile: null,
    firebase: null,
    refs: {
        playersRef: null,
        myPlayerRef: null,
        editsRef: null
    },
    remotePlayers: new Map(),
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
    let el = document.getElementById("onlineStatus");
    if (el) {
        return el;
    }

    const hudTop = document.getElementById("hudTop");
    if (!hudTop) {
        return null;
    }

    el = document.createElement("p");
    el.id = "onlineStatus";
    el.textContent = "Modo solo";
    hudTop.appendChild(el);
    return el;
}

function setOnlineStatus(message) {
    const el = ensureOnlineStatusElement();
    if (el) {
        el.textContent = message;
    }
}

function ensureChunkInfoElement() {
    let el = document.getElementById("chunkInfo");
    if (el) {
        return el;
    }

    const hudTop = document.getElementById("hudTop");
    if (!hudTop) {
        return null;
    }

    el = document.createElement("p");
    el.id = "chunkInfo";
    hudTop.appendChild(el);
    return el;
}

function setChunkInfo(message) {
    const el = ensureChunkInfoElement();
    if (el) {
        el.textContent = message;
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
    return Number.isInteger(id) && id >= BLOCK.AIR && id <= BLOCK.SAND;
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

function createRemotePlayerNode(playerId, payload) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 0.82, 4, 10),
        new THREE.MeshLambertMaterial({ color: parseHexColor(payload.color, 0x8ad1ff) })
    );
    body.position.y = 0.95;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 10),
        new THREE.MeshLambertMaterial({ color: 0xfff4da })
    );
    head.position.y = 1.63;
    group.add(head);

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
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.editsRef) {
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
    multiplayer.firebase.dbModule.update(multiplayer.refs.editsRef, updates).catch((error) => {
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
    const editsRef = dbModule.ref(db, `${worldPath}/edits`);
    const editsSnap = await dbModule.get(editsRef);
    if (editsSnap.exists()) {
        return;
    }

    const opsRef = dbModule.ref(db, `${worldPath}/ops`);
    const opsSnap = await dbModule.get(opsRef);
    if (!opsSnap.exists()) {
        return;
    }

    const compact = collectCompactEditsFromLegacyOps(opsSnap.val());
    if (!compact.size) {
        return;
    }

    const payload = {};
    for (const [key, id] of compact.entries()) {
        payload[key] = id;
    }

    await dbModule.set(editsRef, payload);
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
        multiplayer.refs.playersRef = dbModule.ref(db, `${worldPath}/players`);
        multiplayer.refs.myPlayerRef = dbModule.ref(db, `${worldPath}/players/${multiplayer.profile.id}`);
        multiplayer.refs.editsRef = dbModule.ref(db, `${worldPath}/edits`);

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

        const unsubEditAdded = dbModule.onChildAdded(multiplayer.refs.editsRef, (snapshot) => {
            applyRemoteEditEntry(snapshot.key || "", snapshot.val());
        });

        const unsubEditChanged = dbModule.onChildChanged(multiplayer.refs.editsRef, (snapshot) => {
            applyRemoteEditEntry(snapshot.key || "", snapshot.val());
        });

        const unsubEditRemoved = dbModule.onChildRemoved(multiplayer.refs.editsRef, (snapshot) => {
            applyRemoteEditRemoval(snapshot.key || "");
        });

        multiplayer.unsubscribers.push(unsubConnected, unsubPlayers, unsubEditAdded, unsubEditChanged, unsubEditRemoved);
        multiplayer.enabled = true;
        multiplayer.ready = true;
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
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.editsRef) {
        return;
    }

    const key = blockKey(x, y, z);
    const overrideValue = editedBlocks.get(key);
    queueCloudEditWrite(key, overrideValue === undefined ? null : overrideValue);
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

function hash2D(x, z, salt = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul((WORLD_SEED + salt) | 0, 1442695041);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return h;
}

function terrainHeight(x, z) {
    const waveA = Math.sin((x + WORLD_SEED * 0.13) * 0.045) * 5.2;
    const waveB = Math.cos((z - WORLD_SEED * 0.19) * 0.042) * 4.8;
    const waveC = Math.sin((x + z + WORLD_SEED * 0.33) * 0.021) * 2.6;
    const rough = ((hash2D(x, z, 17) & 1023) / 1023 - 0.5) * 2.6;
    return clampInt(18 + waveA + waveB + waveC + rough, 4, WORLD_MAX_Y - 6);
}

function isTreeBase(x, z, surfaceY) {
    if (surfaceY < 10) {
        return false;
    }

    return hash2D(x, z, 91) % 43 === 0;
}

function treeHeightAt(x, z) {
    return 3 + (hash2D(x, z, 103) % 2);
}

function getTreeBlockAt(x, y, z) {
    for (let tx = x - 2; tx <= x + 2; tx += 1) {
        for (let tz = z - 2; tz <= z + 2; tz += 1) {
            const surfaceY = terrainHeight(tx, tz);
            if (!isTreeBase(tx, tz, surfaceY)) {
                continue;
            }

            const trunkStart = surfaceY + 1;
            const trunkTop = trunkStart + treeHeightAt(tx, tz);

            if (x === tx && z === tz && y >= trunkStart && y < trunkTop) {
                return BLOCK.WOOD;
            }

            const topY = trunkTop;
            const dx = x - tx;
            const dy = y - topY;
            const dz = z - tz;

            if (dy < -2 || dy > 2) {
                continue;
            }

            const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
            if (dist <= 4) {
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

    const h = terrainHeight(x, z);
    if (y === 0) {
        return BLOCK.BEDROCK;
    }

    if (y > h) {
        return getTreeBlockAt(x, y, z);
    }

    if (y === h) {
        return h < 11 ? BLOCK.SAND : BLOCK.GRASS;
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
        return;
    }

    setBlock(x, y, z, id);
    scheduleWorldSave();

    if (origin === "local") {
        publishBlockMutation(x, y, z, id);
    }
}

function isSolidBlock(id) {
    return id !== BLOCK.AIR;
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
    setChunkInfo(`Chunks: ${state.chunkRadius} | Cargados: ${state.loadedChunkCount} | Pendientes: ${state.pendingChunkBuildCount} | Edits: ${editedBlocks.size}/${MAX_EDITED_BLOCKS} | Q: ${perfState.dynamicPixelRatio.toFixed(2)}x`);
}

function refreshHotbarUi() {
    hotbarEl.innerHTML = "";
    PLACEABLE_BLOCKS.forEach((blockInfo, index) => {
        const slot = document.createElement("div");
        slot.className = `slot${index === state.selectedHotbarIndex ? " selected" : ""}`;
        slot.style.backgroundColor = `#${BLOCK_COLORS[blockInfo.id].toString(16).padStart(6, "0")}33`;
        slot.textContent = `${index + 1}\n${blockInfo.label}`;
        hotbarEl.appendChild(slot);
    });
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
        if (lookup.id === BLOCK.BEDROCK) {
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

    if (getBlock(placeX, placeY, placeZ) !== BLOCK.AIR) {
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
}

function onKeyDown(event) {
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

    window.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    controls.addEventListener("lock", () => {
        overlayEl.classList.add("hidden");
    });

    controls.addEventListener("unlock", () => {
        if (!state.worldStarted) {
            overlayEl.classList.remove("hidden");
        }
    });

    startButton.addEventListener("click", () => {
        state.worldStarted = true;
        overlayEl.classList.add("hidden");

        try {
            controls.lock();
        } catch (error) {
        }
    });

    window.addEventListener("beforeunload", () => {
        flushWorldSave(true);
        flushCloudEditWrites();
    });
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 1 / 30);
    state.chunkTick += delta;
    state.autoSaveTick += delta;
    updateAdaptiveQuality(delta);

    if (state.worldStarted) {
        updatePlayer(delta);
    }

    updateChunkStreaming(false);
    const budget = getDynamicChunkBuildBudget();
    if (budget > 0) {
        processChunkRebuildQueue(budget);
    }

    updateRemotePlayers(delta);
    broadcastLocalPlayerState();

    if (state.autoSaveTick >= AUTO_SAVE_SECONDS) {
        state.autoSaveTick = 0;
        flushWorldSave();
    }

    updateHud();
    renderer.render(scene, camera);
}

function findSpawnPoint() {
    const sx = 0;
    const sz = 0;

    for (let y = WORLD_MAX_Y - 1; y >= 1; y -= 1) {
        const id = getBlock(sx, y, sz);
        if (id !== BLOCK.AIR) {
            return new THREE.Vector3(sx + 0.5, y + 1.01, sz + 0.5);
        }
    }

    return new THREE.Vector3(0.5, 18, 0.5);
}

function init() {
    setBootStatus("Cargando mundo guardado...");

    const loadedEdits = loadWorldFromStorage();
    if (loadedEdits > 0) {
        setBootStatus(`Cargados ${loadedEdits} cambios guardados.`);
    } else {
        setBootStatus("Generando mundo por chunks...");
    }

    const spawn = findSpawnPoint();
    state.playerPosition.copy(spawn);
    controls.getObject().position.set(spawn.x, spawn.y + EYE_HEIGHT, spawn.z);

    refreshHotbarUi();
    setupEvents();

    updateChunkStreaming(true);
    processChunkRebuildQueue(INITIAL_CHUNK_BUILD_BUDGET);

    setupRealtimeMultiplayer();

    if (helpMiniEl) {
        helpMiniEl.textContent = "WASD mover · Mouse mirar · Click izq minar · Click der colocar · Espacio saltar · +/- chunks";
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
