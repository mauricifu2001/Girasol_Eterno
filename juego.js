import * as THREE from "./vendor/three.module.js";
import { PointerLockControls } from "./vendor/PointerLockControls.js";

const WORLD_SIZE_X = 48;
const WORLD_SIZE_Z = 48;
const WORLD_MAX_Y = 24;
const HALF_WORLD_X = Math.floor(WORLD_SIZE_X / 2);
const HALF_WORLD_Z = Math.floor(WORLD_SIZE_Z / 2);

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

const canvas = document.getElementById("gameCanvas");
const coordsEl = document.getElementById("coords");
const hotbarEl = document.getElementById("hotbar");
const overlayEl = document.getElementById("overlay");
const startButton = document.getElementById("startButton");

const PORTAL_UNLOCK_STORAGE_KEY = "girasolPortalUnlocked";
const PORTAL_ACCESS_LABEL_STORAGE_KEY = "girasolPortalAccessLabel";
const MULTIPLAYER_SESSION_ID_KEY = "girasolMultiplayerSessionId";

const PROFILE_COLORS = {
    Mauricio: "#f4cf85",
    Valentina: "#ff96c9"
};

const gameConfig = window.appConfig?.game || {};
const multiplayerConfig = gameConfig.multiplayer || {};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7ff);
scene.fog = new THREE.Fog(0x9bc7ff, 26, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new PointerLockControls(camera, document.body);
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

const blocks = new Map();
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
    worldReady: false
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
        opsRef: null
    },
    remotePlayers: new Map(),
    sendIntervalMs: 120,
    lastBroadcastMs: 0,
    unsubscribers: []
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

    const playerFromQuery = normalizeProfileLabel(new URLSearchParams(window.location.search).get("player") || "");
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

async function setupRealtimeMultiplayer() {
    multiplayer.profile = resolvePlayerIdentity();
    const profileLabel = multiplayer.profile.displayName || multiplayer.profile.label;
    setOnlineStatus(`Jugador: ${profileLabel} · modo solo`);

    if (!multiplayerConfig?.enabled) {
        return;
    }

    const firebaseConfig = multiplayerConfig.firebase;
    if (!isFirebaseConfigReady(firebaseConfig)) {
        setOnlineStatus("Multijugador: falta configurar Firebase en config.js");
        return;
    }

    const roomFromQuery = new URLSearchParams(window.location.search).get("room") || "";
    multiplayer.roomId = sanitizeRoomId(roomFromQuery || multiplayerConfig.roomId || "mundo-principal");

    try {
        const appModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const dbModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");

        const appName = `girasol-${multiplayer.roomId}`;
        const existingApp = appModule.getApps().find((item) => item.name === appName);
        const app = existingApp || appModule.initializeApp(firebaseConfig, appName);
        const db = dbModule.getDatabase(app);
        const worldPath = `worlds/${multiplayer.roomId}`;

        multiplayer.firebase = { dbModule, db };
        multiplayer.refs.playersRef = dbModule.ref(db, `${worldPath}/players`);
        multiplayer.refs.myPlayerRef = dbModule.ref(db, `${worldPath}/players/${multiplayer.profile.id}`);
        multiplayer.refs.opsRef = dbModule.ref(db, `${worldPath}/ops`);

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
            const roomLabel = multiplayer.roomId;
            setOnlineStatus(`Sala ${roomLabel}: ${totalOnline} conectado(s)`);
        });

        const unsubOps = dbModule.onChildAdded(multiplayer.refs.opsRef, (snapshot) => {
            const op = snapshot.val();
            if (!op || op.by === multiplayer.profile.id) {
                return;
            }

            const x = Number(op.x);
            const y = Number(op.y);
            const z = Number(op.z);
            const id = Number(op.id);

            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(id)) {
                return;
            }

            applyBlockMutation(x, y, z, id, "remote");
        });

        multiplayer.unsubscribers.push(unsubConnected, unsubPlayers, unsubOps);
        multiplayer.enabled = true;
        multiplayer.ready = true;
        setOnlineStatus(`Sala ${multiplayer.roomId}: multijugador activo`);
        setBootStatus("Mundo listo. Presiona Entrar al mundo.");
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
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.opsRef) {
        return;
    }

    const payload = {
        x,
        y,
        z,
        id,
        by: multiplayer.profile.id,
        at: Date.now()
    };

    multiplayer.firebase.dbModule.push(multiplayer.refs.opsRef, payload).catch((error) => {
        console.warn("No pude sincronizar bloque", error);
    });
}

function applyBlockMutation(x, y, z, id, origin = "local") {
    if (!inWorldBounds(x, y, z)) {
        return;
    }

    if (getBlock(x, y, z) === id) {
        return;
    }

    setBlock(x, y, z, id);
    rebuildWorldMeshes();

    if (origin === "local") {
        publishBlockMutation(x, y, z, id);
    }
}

function blockKey(x, y, z) {
    return `${x}|${y}|${z}`;
}

function setBlock(x, y, z, id) {
    const key = blockKey(x, y, z);
    if (id === BLOCK.AIR) {
        blocks.delete(key);
    } else {
        blocks.set(key, id);
    }
}

function getBlock(x, y, z) {
    return blocks.get(blockKey(x, y, z)) ?? BLOCK.AIR;
}

function inWorldBounds(x, y, z) {
    return x >= -HALF_WORLD_X && x < HALF_WORLD_X
        && z >= -HALF_WORLD_Z && z < HALF_WORLD_Z
        && y >= 0
        && y < WORLD_MAX_Y;
}

function clampPlayerToWorld() {
    state.playerPosition.x = THREE.MathUtils.clamp(state.playerPosition.x, -HALF_WORLD_X + 1, HALF_WORLD_X - 1);
    state.playerPosition.z = THREE.MathUtils.clamp(state.playerPosition.z, -HALF_WORLD_Z + 1, HALF_WORLD_Z - 1);
    state.playerPosition.y = Math.max(0.01, state.playerPosition.y);
}

function terrainHeight(x, z) {
    const n1 = Math.sin(x * 0.22) * 1.8;
    const n2 = Math.cos(z * 0.19) * 1.6;
    const n3 = Math.sin((x + z) * 0.11) * 1.2;
    return Math.floor(9 + n1 + n2 + n3);
}

function buildTree(baseX, baseY, baseZ) {
    const trunkHeight = 3 + ((Math.abs(baseX * 11 + baseZ * 7) % 2));
    for (let y = 0; y < trunkHeight; y += 1) {
        const yy = baseY + y;
        if (inWorldBounds(baseX, yy, baseZ)) {
            setBlock(baseX, yy, baseZ, BLOCK.WOOD);
        }
    }

    const topY = baseY + trunkHeight;
    for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
            for (let dz = -2; dz <= 2; dz += 1) {
                const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                if (dist > 4) {
                    continue;
                }
                const xx = baseX + dx;
                const yy = topY + dy;
                const zz = baseZ + dz;
                if (!inWorldBounds(xx, yy, zz)) {
                    continue;
                }
                if (getBlock(xx, yy, zz) === BLOCK.AIR) {
                    setBlock(xx, yy, zz, BLOCK.LEAVES);
                }
            }
        }
    }
}

function generateWorld() {
    blocks.clear();

    for (let x = -HALF_WORLD_X; x < HALF_WORLD_X; x += 1) {
        for (let z = -HALF_WORLD_Z; z < HALF_WORLD_Z; z += 1) {
            const h = THREE.MathUtils.clamp(terrainHeight(x, z), 4, WORLD_MAX_Y - 3);

            for (let y = 0; y <= h; y += 1) {
                if (y === 0) {
                    setBlock(x, y, z, BLOCK.BEDROCK);
                    continue;
                }

                if (y === h) {
                    if (h < 8) {
                        setBlock(x, y, z, BLOCK.SAND);
                    } else {
                        setBlock(x, y, z, BLOCK.GRASS);
                    }
                    continue;
                }

                if (y >= h - 2) {
                    setBlock(x, y, z, BLOCK.DIRT);
                } else {
                    setBlock(x, y, z, BLOCK.STONE);
                }
            }

            const treeChance = Math.abs((x * 17 + z * 13) % 29);
            if (h > 8 && treeChance === 0) {
                buildTree(x, h + 1, z);
            }
        }
    }
}

function clearWorldMeshes() {
    while (worldRoot.children.length) {
        const child = worldRoot.children[0];
        worldRoot.remove(child);
    }
    blockMeshes.length = 0;
    blockPositionLookup.clear();
}

function rebuildWorldMeshes() {
    clearWorldMeshes();

    const counts = {};
    for (const id of blocks.values()) {
        counts[id] = (counts[id] || 0) + 1;
    }

    const matrix = new THREE.Matrix4();

    Object.entries(counts).forEach(([idText, count]) => {
        const id = Number(idText);
        const material = blockMaterials[id];
        if (!material || count <= 0) {
            return;
        }

        const mesh = new THREE.InstancedMesh(blockGeometry, material, count);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.userData.blockId = id;
        mesh.userData.positions = [];

        let index = 0;
        for (const [key, blockId] of blocks.entries()) {
            if (blockId !== id) {
                continue;
            }

            const [xText, yText, zText] = key.split("|");
            const x = Number(xText);
            const y = Number(yText);
            const z = Number(zText);

            matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
            mesh.setMatrixAt(index, matrix);
            mesh.userData.positions[index] = { x, y, z };
            blockPositionLookup.set(`${mesh.id}:${index}`, { x, y, z, id });
            index += 1;
        }

        mesh.instanceMatrix.needsUpdate = true;
        worldRoot.add(mesh);
        blockMeshes.push(mesh);
    });
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
                if (!inWorldBounds(xx, yy, zz)) {
                    if (yy < 0) {
                        return true;
                    }
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

function getForwardRightVectors() {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    return { forward: direction, right };
}

function updatePlayer(deltaSeconds) {
    const turnSpeed = 1.8 * deltaSeconds;
    const pitchSpeed = 1.4 * deltaSeconds;

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
    if (!state.worldStarted) {
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
    renderer.setSize(window.innerWidth, window.innerHeight);
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
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    if (state.worldStarted) {
        updatePlayer(delta);
    }

    updateRemotePlayers(delta);
    broadcastLocalPlayerState();

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

    return new THREE.Vector3(0.5, 14, 0.5);
}

function init() {
    setBootStatus("Cargando mundo local...");

    generateWorld();
    rebuildWorldMeshes();

    const spawn = findSpawnPoint();
    state.playerPosition.copy(spawn);
    controls.getObject().position.set(spawn.x, spawn.y + EYE_HEIGHT, spawn.z);

    refreshHotbarUi();
    setupEvents();
    setupRealtimeMultiplayer();
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
