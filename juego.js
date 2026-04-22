import * as THREE from "./vendor/three.module.js";
import { PointerLockControls } from "./vendor/PointerLockControls.js";
import {
    BLOCK,
    blockRegistry,
    BLOCK_COLORS,
    getBlockDefinitionById,
    isValidBlockId as isValidBlockIdFromRegistry
} from "./content/blockRegistry.js";
import {
    PROP_TYPE,
    VALID_PROP_TYPES,
    PROP_PROFILES,
    propRegistry,
    getPropDefinition,
    isLightPropType
} from "./content/propRegistry.js";
import {
    ITEM_KIND,
    HOTBAR_SIZE,
    INVENTORY_CATEGORY,
    INVENTORY_CATEGORY_ORDER,
    INVENTORY_CATEGORY_LABELS,
    INVENTORY_ITEMS,
    DEFAULT_HOTBAR_ITEM_IDS,
    INVENTORY_ITEM_BY_ID,
    getInventoryItemTintByDefinition,
    validateContentRegistry
} from "./content/contentRegistry.js";

function clampInt(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, Math.round(value)));
}

const WORLD_MAX_Y = 48;
const CHUNK_SIZE = 16;
const CHUNK_MANAGEMENT_INTERVAL = 0.22;
const CHUNK_REBUILD_BUDGET_PER_FRAME = 1;
const INITIAL_CHUNK_BUILD_BUDGET = 10;
const CLOUD_EDIT_WRITE_BATCH_MS = 220;
const CLOUD_EDIT_RETRY_MS = 1200;
const SEA_LEVEL = 14;
const CLOUD_COUNT = 22;
const RABBIT_MAX_COUNT = 12;
const RABBIT_SPAWN_INTERVAL_MIN = 7.2;
const RABBIT_SPAWN_INTERVAL_MAX = 18.4;
const RABBIT_SPAWN_ATTEMPTS = 6;
const RABBIT_DESPAWN_DISTANCE = 155;
const RABBIT_MIN_PLAYER_DISTANCE = 10;
const RABBIT_MIN_RABBIT_DISTANCE = 2.4;
const DEBUG_VISIBILITY_STORAGE_KEY = "girasolDebugHudVisible";
const TUTORIAL_SEEN_STORAGE_KEY = "girasolTutorialSeenV1";
const BLOCK_HIGHLIGHT_SIZE = 1.02;
const AVATAR_VOXEL_TARGET_HEIGHT = 2.1;
const AVATAR_PREVIEW_ORBIT_SPEED = 0.72;
const AVATAR_PREVIEW_RADIUS = 2.55;
const AVATAR_WALK_BLEND_SPEED = 9.5;
const AVATAR_WALK_MIN_SPEED = 0.05;
const AVATAR_WALK_SWING = 0.78;
const REMOTE_AVATAR_YAW_OFFSET = Math.PI;

const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.32;
const EYE_HEIGHT = 1.62;
const GRAVITY = 26;
const BASE_SPEED = 6.2;
const SPRINT_SPEED = 9.4;
const JUMP_SPEED = 9.2;
const MAX_REACH = 6;
const DEFAULT_POINTER_SPEED = 0.68;
const TARGET_UI_SCAN_INTERVAL = 0.055;
const HUD_UPDATE_INTERVAL = 0.12;
const PROP_SPATIAL_CELL_SIZE = 1.5;

const PORTAL_UNLOCK_STORAGE_KEY = "girasolPortalUnlocked";
const PORTAL_ACCESS_LABEL_STORAGE_KEY = "girasolPortalAccessLabel";
const MULTIPLAYER_SESSION_ID_KEY = "girasolMultiplayerSessionId";
const CHUNK_RADIUS_STORAGE_KEY = "girasolChunkRadiusV1";
const POINTER_SENSITIVITY_STORAGE_KEY = "girasolPointerSensitivityV1";
const QUALITY_PRESET_STORAGE_KEY = "girasolQualityPresetV1";
const HOTBAR_STORAGE_KEY = "girasolHotbarSlotsV1";
const SUNFLOWER_CURRENCY_STORAGE_KEY = "girasolSunflowerCurrencyV1";

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
const MAX_PLACED_PROPS = clampInt(Number(gameConfig.maxPlacedProps) || 2400, 100, 10000);
const WORLD_SAVE_KEY = `girasolWorldEdits:${sanitizeRoomId(urlParams.get("room") || multiplayerConfig.roomId || "mundo-principal")}`;
const DAY_NIGHT_EPOCH_STORAGE_KEY = `girasolDayNightEpochV1:${sanitizeRoomId(urlParams.get("room") || multiplayerConfig.roomId || "mundo-principal")}`;
const WORLD_SAVE_VERSION = 2;
const AUTO_SAVE_SECONDS = 12;
const SUNFLOWER_MAX_COUNT = clampInt(Number(gameConfig.sunflowerMaxCount) || 68, 12, 300);
const SUNFLOWER_SPAWN_INTERVAL_MIN = 3.6;
const SUNFLOWER_SPAWN_INTERVAL_MAX = 8.9;
const SUNFLOWER_SPAWN_ATTEMPTS = 10;
const SUNFLOWER_DESPAWN_DISTANCE = 130;
const SUNFLOWER_MIN_PLAYER_DISTANCE = 5;
const SUNFLOWER_MIN_FLOWER_DISTANCE = 1.25;
const DAY_DURATION_SECONDS = 30 * 60;
const NIGHT_DURATION_SECONDS = 10 * 60;
const DAY_NIGHT_CYCLE_SECONDS = DAY_DURATION_SECONDS + NIGHT_DURATION_SECONDS;
const SUN_ORBIT_RADIUS = 150;
const SUN_ORBIT_HEIGHT = 98;
const LAMP_INTENSITY_LEVELS = [0, 0.85, 1.7, 2.75];
const LAMP_DISTANCE_LEVELS = [0, 8, 11, 14];
const LAMP_BULB_EMISSIVE_LEVELS = [0.01, 0.28, 0.56, 0.92];
const LAMP_SHADOW_MAP_SIZE = 96;
const MAX_SHADOW_CASTING_LAMPS = 2;
const LAMP_SHADOW_MAX_DISTANCE = 20;
const LAMP_SHADOW_REFRESH_SECONDS = 0.45;
const LAMP_SHADOW_MIN_LEVEL = 3;
const SKY_SHADOW_REFRESH_SECONDS = 0.82;
const PROP_ROTATION_STEP = Math.PI * 0.5;
const SKY_DAY_COLOR = new THREE.Color(0x9bc7ff);
const SKY_DUSK_COLOR = new THREE.Color(0xffb579);
const SKY_NIGHT_COLOR = new THREE.Color(0x091327);
const TERRAIN_SYNC_SAMPLE_POINTS = [
    [-96, -96], [-96, -32], [-96, 32], [-96, 96],
    [-32, -96], [-32, -32], [-32, 32], [-32, 96],
    [32, -96], [32, -32], [32, 32], [32, 96],
    [96, -96], [96, -32], [96, 32], [96, 96],
    [0, 0], [0, 64], [64, 0], [-64, 0], [0, -64]
];
const TERRAIN_REACOMODO_MIN_COLUMNS = 12;
const TERRAIN_REACOMODO_MIN_ABS_SHIFT = 2;
const TERRAIN_REACOMODO_MAX_SHIFT = 22;

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
const sunflowerCurrencyHudEl = document.getElementById("sunflowerCurrencyHud");
const hotbarSelectedMaterialEl = document.getElementById("hotbarSelectedMaterial");
const inventoryToggleButtonEl = document.getElementById("inventoryToggleButton");
const inventoryPanelEl = document.getElementById("inventoryPanel");
const inventoryCloseButtonEl = document.getElementById("inventoryCloseButton");
const inventoryGridEl = document.getElementById("inventoryGrid");
const targetBlockLabelEl = document.getElementById("targetBlockLabel");
const crosshairEl = document.getElementById("crosshair");
const toastContainerEl = document.getElementById("toastContainer");
const pauseButton = document.getElementById("pauseButton");
const pauseMenuEl = document.getElementById("pauseMenu");
const pauseContinueButton = document.getElementById("pauseContinueButton");
const pauseSettingsButton = document.getElementById("pauseSettingsButton");
const pauseSaveButton = document.getElementById("pauseSaveButton");
const pauseRestartButton = document.getElementById("pauseRestartButton");
const pauseSettingsSection = document.getElementById("pauseSettingsSection");
const chunkRadiusSliderEl = document.getElementById("chunkRadiusSlider");
const chunkRadiusValueEl = document.getElementById("chunkRadiusValue");
const qualityPresetSelectEl = document.getElementById("qualityPresetSelect");
const pointerSensitivitySliderEl = document.getElementById("pointerSensitivitySlider");
const pointerSensitivityValueEl = document.getElementById("pointerSensitivityValue");
const tutorialPanelEl = document.getElementById("tutorialPanel");
const tutorialCloseButton = document.getElementById("tutorialCloseButton");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7ff);
scene.fog = new THREE.Fog(0x9bc7ff, 30, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
camera.rotation.order = "YXZ";
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const basePixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(basePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = DEFAULT_POINTER_SPEED;
scene.add(controls.getObject());

const hemiLight = new THREE.HemisphereLight(0xcfe7ff, 0x5f6177, 0.32);
scene.add(hemiLight);
const ambientFill = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambientFill);

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(16, 30, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(768, 768);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 280;
sun.shadow.camera.left = -64;
sun.shadow.camera.right = 64;
sun.shadow.camera.top = 64;
sun.shadow.camera.bottom = -64;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.autoUpdate = false;
sun.shadow.needsUpdate = true;
scene.add(sun);

const moon = new THREE.DirectionalLight(0x8ba9ff, 0.16);
moon.castShadow = true;
moon.shadow.mapSize.set(384, 384);
moon.shadow.camera.near = 20;
moon.shadow.camera.far = 240;
moon.shadow.camera.left = -54;
moon.shadow.camera.right = 54;
moon.shadow.camera.top = 54;
moon.shadow.camera.bottom = -54;
moon.shadow.bias = -0.00035;
moon.shadow.normalBias = 0.016;
moon.shadow.autoUpdate = false;
moon.shadow.needsUpdate = true;
scene.add(moon);

const sunTarget = new THREE.Object3D();
scene.add(sunTarget);
sun.target = sunTarget;

const moonTarget = new THREE.Object3D();
scene.add(moonTarget);
moon.target = moonTarget;

const skyColorScratch = new THREE.Color();
const skyVectorScratchA = new THREE.Vector3();
const skyVectorScratchB = new THREE.Vector3();

const skyDecorRoot = new THREE.Group();
scene.add(skyDecorRoot);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

const propsRoot = new THREE.Group();
scene.add(propsRoot);

const remotePlayersRoot = new THREE.Group();
scene.add(remotePlayersRoot);

const wildlifeRoot = new THREE.Group();
scene.add(wildlifeRoot);

const sunflowerRoot = new THREE.Group();
scene.add(sunflowerRoot);

const localAvatarPreviewRoot = new THREE.Group();
localAvatarPreviewRoot.visible = false;
scene.add(localAvatarPreviewRoot);

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
    const definition = getBlockDefinitionById(blockId);
    const textureStyle = String(definition?.visual?.textureStyle || "default");
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

    if (textureStyle === "bedrock") {
        fillNoisyBase(ctx, size, hexToRgb(0x3d3e45), 30, rng);
        drawSpeckles(ctx, size, 280, 0x4c4e55, 0.42, rng, 1, 2);
        drawRockCracks(ctx, size, rng, 0x2a2b30, 0.35, 8);
    } else if (textureStyle === "stone") {
        fillNoisyBase(ctx, size, hexToRgb(0x787b84), 24, rng);
        drawSpeckles(ctx, size, 240, 0x8f949e, 0.32, rng, 1, 2);
        drawRockCracks(ctx, size, rng, 0x535861, 0.28, 10);
    } else if (textureStyle === "dirt") {
        fillNoisyBase(ctx, size, hexToRgb(0x704f33), 22, rng);
        drawSpeckles(ctx, size, 280, 0x4e3522, 0.33, rng, 1, 2);
        drawSpeckles(ctx, size, 180, 0x876341, 0.2, rng, 1, 1);
    } else if (textureStyle === "grass") {
        fillNoisyBase(ctx, size, hexToRgb(0x4f8f42), 18, rng);
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, "rgba(170, 220, 125, 0.22)");
        grad.addColorStop(0.45, "rgba(120, 180, 90, 0.06)");
        grad.addColorStop(1, "rgba(35, 80, 28, 0.2)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        drawSpeckles(ctx, size, 260, 0x376f2f, 0.18, rng, 1, 1);
    } else if (textureStyle === "wood") {
        fillNoisyBase(ctx, size, hexToRgb(0x91663f), 16, rng);
        for (let y = 0; y < size; y += 5) {
            const shade = 0.13 + rng() * 0.08;
            ctx.fillStyle = `rgba(72, 43, 19, ${shade})`;
            ctx.fillRect(0, y, size, 2);
        }
        drawSpeckles(ctx, size, 170, 0xb18355, 0.2, rng, 1, 1);
    } else if (textureStyle === "leaves") {
        fillNoisyBase(ctx, size, hexToRgb(0x3f7f43), 24, rng);
        drawSpeckles(ctx, size, 320, 0x2f5f34, 0.22, rng, 1, 2);
        drawSpeckles(ctx, size, 170, 0x6aa85d, 0.2, rng, 1, 1);
    } else if (textureStyle === "sand") {
        fillNoisyBase(ctx, size, hexToRgb(0xd8c595), 16, rng);
        drawSpeckles(ctx, size, 330, 0xbba777, 0.2, rng, 1, 1);
        drawSpeckles(ctx, size, 170, 0xf2e2b4, 0.15, rng, 1, 1);
    } else if (textureStyle === "water") {
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
    } else if (textureStyle === "glass" || textureStyle === "tinted_glass") {
        fillNoisyBase(ctx, size, hexToRgb(0xcde7ff), 8, rng, 212);
        ctx.strokeStyle = "rgba(240, 250, 255, 0.42)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 9; i += 1) {
            const x = 3 + i * 7 + Math.floor(rng() * 2);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + Math.sin(i) * 2, size);
            ctx.stroke();
        }
        if (textureStyle === "tinted_glass") {
            ctx.fillStyle = "rgba(74, 95, 142, 0.36)";
            ctx.fillRect(0, 0, size, size);
        }
    } else if (textureStyle === "cobblestone") {
        fillNoisyBase(ctx, size, hexToRgb(0x7b7f86), 28, rng);
        drawSpeckles(ctx, size, 280, 0x5a5e66, 0.26, rng, 1, 2);
        drawRockCracks(ctx, size, rng, 0x4d5159, 0.35, 12);
    } else if (textureStyle === "stone_bricks") {
        fillNoisyBase(ctx, size, hexToRgb(0x8a8f98), 16, rng);
        ctx.strokeStyle = "rgba(67, 72, 80, 0.44)";
        ctx.lineWidth = 2;
        const step = 16;
        for (let i = 0; i <= size; i += step) {
            ctx.beginPath();
            ctx.moveTo(0, i + ((Math.floor(i / step) % 2) ? 2 : 0));
            ctx.lineTo(size, i + ((Math.floor(i / step) % 2) ? 2 : 0));
            ctx.stroke();
        }
        for (let x = 0; x <= size; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
        drawSpeckles(ctx, size, 140, 0xacb2bb, 0.22, rng, 1, 1);
    } else if (textureStyle === "marble") {
        fillNoisyBase(ctx, size, hexToRgb(0xe6e9ef), 10, rng);
        ctx.strokeStyle = "rgba(150, 158, 173, 0.34)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i += 1) {
            const y = Math.floor(rng() * size);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(size * 0.3, y - 6, size * 0.65, y + 8, size, y + Math.floor(rng() * 6) - 3);
            ctx.stroke();
        }
    } else if (textureStyle === "basalt") {
        fillNoisyBase(ctx, size, hexToRgb(0x3d4148), 16, rng);
        ctx.strokeStyle = "rgba(90, 96, 108, 0.24)";
        ctx.lineWidth = 2;
        for (let x = 0; x <= size; x += 6) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + Math.sin(x * 0.2) * 2, size);
            ctx.stroke();
        }
        drawSpeckles(ctx, size, 110, 0x525863, 0.18, rng, 1, 1);
    } else if (textureStyle === "gravel") {
        fillNoisyBase(ctx, size, hexToRgb(0x8c8e96), 22, rng);
        drawSpeckles(ctx, size, 420, 0x6f727a, 0.28, rng, 1, 2);
        drawSpeckles(ctx, size, 220, 0xa8abb4, 0.2, rng, 1, 1);
    } else if (textureStyle === "mud") {
        fillNoisyBase(ctx, size, hexToRgb(0x5b4334), 14, rng);
        drawSpeckles(ctx, size, 220, 0x3f2f24, 0.24, rng, 1, 2);
        ctx.fillStyle = "rgba(190, 145, 95, 0.08)";
        for (let i = 0; i < 7; i += 1) {
            const px = Math.floor(rng() * size);
            const py = Math.floor(rng() * size);
            const w = 5 + Math.floor(rng() * 11);
            const h = 3 + Math.floor(rng() * 8);
            ctx.fillRect(px, py, w, h);
        }
    } else if (textureStyle === "snow") {
        fillNoisyBase(ctx, size, hexToRgb(0xf2f6ff), 8, rng);
        drawSpeckles(ctx, size, 260, 0xdde7fb, 0.24, rng, 1, 1);
        drawSpeckles(ctx, size, 140, 0xbecfe8, 0.16, rng, 1, 1);
    } else if (textureStyle === "ice") {
        fillNoisyBase(ctx, size, hexToRgb(0xb9dcff), 10, rng, 214);
        ctx.strokeStyle = "rgba(224, 244, 255, 0.38)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 11; i += 1) {
            const startX = Math.floor(rng() * size);
            const startY = Math.floor(rng() * size);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + (rng() - 0.5) * 24, startY + (rng() - 0.5) * 24);
            ctx.stroke();
        }
    } else if (textureStyle === "dark_planks") {
        fillNoisyBase(ctx, size, hexToRgb(0x4b3525), 14, rng);
        for (let y = 0; y < size; y += 5) {
            const shade = 0.15 + rng() * 0.1;
            ctx.fillStyle = `rgba(35, 24, 16, ${shade})`;
            ctx.fillRect(0, y, size, 2);
        }
        drawSpeckles(ctx, size, 130, 0x6a4d34, 0.22, rng, 1, 1);
    } else if (textureStyle === "bamboo") {
        fillNoisyBase(ctx, size, hexToRgb(0xa6c46c), 12, rng);
        for (let x = 0; x < size; x += 8) {
            ctx.fillStyle = "rgba(108, 134, 66, 0.26)";
            ctx.fillRect(x, 0, 2, size);
        }
        for (let y = 0; y < size; y += 10) {
            ctx.fillStyle = "rgba(72, 99, 47, 0.24)";
            ctx.fillRect(0, y, size, 2);
        }
    } else if (textureStyle === "glow_block") {
        fillNoisyBase(ctx, size, hexToRgb(0xffd98f), 12, rng);
        drawSpeckles(ctx, size, 230, 0xffedba, 0.28, rng, 1, 2);
        drawSpeckles(ctx, size, 150, 0xc58f3a, 0.2, rng, 1, 1);
        const glow = ctx.createRadialGradient(size * 0.5, size * 0.5, 6, size * 0.5, size * 0.5, size * 0.58);
        glow.addColorStop(0, "rgba(255, 240, 190, 0.34)");
        glow.addColorStop(1, "rgba(255, 216, 139, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);
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
    const definition = getBlockDefinitionById(blockId);
    const visual = definition?.visual || {};
    const useTexture = visual.useTexture !== false;
    const texture = useTexture ? createProceduralBlockTexture(blockId, color) : null;
    const baseColor = Number.isFinite(visual.color) ? visual.color : color;
    const material = new THREE.MeshStandardMaterial({
        color: useTexture ? 0xffffff : baseColor,
        map: texture,
        roughness: THREE.MathUtils.clamp(Number(visual.roughness ?? 0.9), 0, 1),
        metalness: THREE.MathUtils.clamp(Number(visual.metalness ?? 0), 0, 1),
        emissive: Number(visual.emissive ?? 0x000000),
        emissiveIntensity: Math.max(0, Number(visual.emissiveIntensity ?? 0))
    });

    const opacity = THREE.MathUtils.clamp(Number(visual.opacity ?? 1), 0, 1);
    const isTransparent = Boolean(definition?.transparent) || opacity < 0.999 || Boolean(definition?.liquid);
    if (isTransparent) {
        material.transparent = true;
        material.opacity = opacity;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
    }

    if (definition?.liquid) {
        material.depthTest = true;
        material.alphaTest = 0.01;
        material.premultipliedAlpha = true;
    }

    if (definition?.emitsLight && material.emissiveIntensity <= 0) {
        material.emissive.setHex(baseColor);
        material.emissiveIntensity = 0.32;
    }

    return material;
}

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const detailUnitGeometry = new THREE.BoxGeometry(1, 1, 1);
const detailMaterialCache = new Map();
const blockMaterials = Object.fromEntries(
    blockRegistry.definitions
        .filter((definition) => definition.id !== BLOCK.AIR)
        .map((definition) => {
            const color = Number.isFinite(definition.visual?.color) ? Number(definition.visual.color) : 0x8fa3bf;
            return [definition.id, createBlockMaterial(definition.id, color)];
        })
);
const LIQUID_BLOCK_IDS = new Set(
    blockRegistry.definitions
        .filter((definition) => definition.liquid)
        .map((definition) => definition.id)
);

function getDetailMaterial(colorHex) {
    const key = Number(colorHex) >>> 0;
    let material = detailMaterialCache.get(key);
    if (material) {
        return material;
    }

    material = new THREE.MeshLambertMaterial({ color: key });
    detailMaterialCache.set(key, material);
    return material;
}

function createDetailPart(size, position, colorHex, rotation = null) {
    const mesh = new THREE.Mesh(detailUnitGeometry, getDetailMaterial(colorHex));
    mesh.scale.set(size.x, size.y, size.z);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (rotation) {
        mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }

    return mesh;
}

const chunkMap = new Map();
const chunkRebuildQueue = new Set();
const editedBlocks = new Map();
const columnCache = new Map();
const placedProps = new Map();
const propSpatialGrid = new Map();
const propTypeIndex = new Map(Object.values(PROP_TYPE).map((type) => [type, new Set()]));

const blockMeshes = [];
const blockPositionLookup = new Map();

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const cameraYawScratch = new THREE.Vector3();
const blockRayCenterNdc = new THREE.Vector2(0, 0);
const cameraForwardScratch = new THREE.Vector3();
const cameraRightScratch = new THREE.Vector3();
const moveVectorScratch = new THREE.Vector3();
const worldUpVector = new THREE.Vector3(0, 1, 0);
const worldNormalScratch = new THREE.Vector3();
const blockSamplePointScratch = new THREE.Vector3();
const propSpatialQueryIds = new Set();
const propRaycastCandidates = [];
const playerCollisionBoundsScratch = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    minZ: 0,
    maxZ: 0
};
const forwardRightResult = {
    forward: cameraForwardScratch,
    right: cameraRightScratch
};
const targetHighlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_HIGHLIGHT_SIZE, BLOCK_HIGHLIGHT_SIZE, BLOCK_HIGHLIGHT_SIZE)),
    new THREE.LineBasicMaterial({ color: 0xffd789, transparent: true, opacity: 0.92 })
);
targetHighlight.visible = false;
scene.add(targetHighlight);

const state = {
    selectedHotbarIndex: 0,
    hotbarItemIds: [...DEFAULT_HOTBAR_ITEM_IDS.slice(0, HOTBAR_SIZE)],
    velocityY: 0,
    onGround: false,
    keyDown: new Set(),
    playerPosition: new THREE.Vector3(0, 17, 0),
    worldStarted: false,
    worldReady: false,
    paused: false,
    inventoryOpen: false,
    pauseSettingsOpen: false,
    debugVisible: false,
    tutorialVisible: false,
    avatarPreviewOpen: false,
    avatarPreviewAngle: 0,
    chunkRadius: INITIAL_CHUNK_RADIUS,
    chunkTick: 0,
    loadedChunkCount: 0,
    pendingChunkBuildCount: 0,
    lastForward: new THREE.Vector3(0, 0, -1),
    autoSaveTick: 0,
    targetUiTick: 0,
    hudTick: 0
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
        chunksRootRef: null,
        propsRootRef: null,
        metaRef: null,
        dayNightRef: null
    },
    remotePlayers: new Map(),
    chunkEditSubscriptions: new Map(),
    propSnapshotUnsubscribe: null,
    sendIntervalMs: 120,
    lastBroadcastMs: 0,
    unsubscribers: [],
    pendingEditWrites: new Map(),
    pendingPropWrites: new Map(),
    writeTimerId: null,
    propWriteTimerId: null,
    idleHeartbeatMs: 1200,
    lastSentState: null
};

const saveState = {
    dirty: false,
    writeTimerId: null,
    lastSavedAt: 0
};

const perfState = {
    dynamicPixelRatio: basePixelRatio,
    fpsEma: 60,
    adjustCooldown: 0,
    adaptiveEnabled: true,
    minPixelRatio: 0.72,
    qualityPreset: "auto"
};

const skyState = {
    clouds: [],
    sunCore: null,
    sunGlow: null,
    moonCore: null,
    moonGlow: null,
    cycleSeconds: DAY_DURATION_SECONDS * 0.35,
    sharedEpochMs: 0,
    clockSynced: false,
    shadowRefreshTimer: 0,
    lastShadowAnchorX: 0,
    lastShadowAnchorZ: 0,
    lastShadowSunY: 0
};

const uiState = {
    toastHideTimerId: null,
    noSpaceToastAt: 0,
    lastCoordsText: "",
    lastChunkInfoText: ""
};

const warnedUnknownBlockIds = new Set();
const warnedUnknownPropTypes = new Set();

const wildlifeState = {
    rabbits: new Map(),
    nextId: 1,
    spawnTimer: 5.2
};

const economyState = {
    sunflowers: 0
};

const propState = {
    nextId: 1,
    shadowRefreshTimer: 0,
    shadowDirty: true,
    cullingDirty: true
};

const floraState = {
    sunflowers: new Map(),
    nextId: 1,
    spawnTimer: 3,
    lastHarvestAt: 0
};

let draggedInventoryItemId = "";

const localAvatarPreviewState = {
    modelKey: ""
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

function readStorageNumber(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        if (raw === null || raw === "") {
            return fallback;
        }

        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    } catch (error) {
        return fallback;
    }
}

function readStorageString(key, fallback = "") {
    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : String(raw);
    } catch (error) {
        return fallback;
    }
}

function writeStorageValue(key, value) {
    try {
        window.localStorage.setItem(key, String(value));
    } catch (error) {
    }
}

function sanitizeHotbarItemIds(rawSlots) {
    const fallback = DEFAULT_HOTBAR_ITEM_IDS.filter((itemId) => INVENTORY_ITEM_BY_ID.has(itemId));
    const source = Array.isArray(rawSlots) ? rawSlots.map((value) => String(value || "")) : [];
    const next = [];

    for (let i = 0; i < HOTBAR_SIZE; i += 1) {
        const candidate = source[i];
        if (candidate && INVENTORY_ITEM_BY_ID.has(candidate)) {
            next.push(candidate);
            continue;
        }

        const fallbackId = fallback[i] || fallback[i % Math.max(1, fallback.length)] || INVENTORY_ITEMS[0].id;
        next.push(fallbackId);
    }

    return next;
}

function saveHotbarConfiguration() {
    try {
        window.localStorage.setItem(HOTBAR_STORAGE_KEY, JSON.stringify(state.hotbarItemIds));
    } catch (error) {
    }
}

function loadHotbarConfiguration() {
    let parsed = null;

    try {
        const raw = window.localStorage.getItem(HOTBAR_STORAGE_KEY);
        if (raw) {
            parsed = JSON.parse(raw);
        }
    } catch (error) {
    }

    state.hotbarItemIds = sanitizeHotbarItemIds(parsed);
}

function getHotbarItemByIndex(index) {
    const safeIndex = THREE.MathUtils.clamp(Math.floor(Number(index) || 0), 0, HOTBAR_SIZE - 1);
    const itemId = state.hotbarItemIds[safeIndex];
    return INVENTORY_ITEM_BY_ID.get(itemId) || INVENTORY_ITEMS[0];
}

function getSelectedHotbarItem() {
    return getHotbarItemByIndex(state.selectedHotbarIndex);
}

function getInventoryItemTint(item) {
    return getInventoryItemTintByDefinition(item, BLOCK_COLORS);
}

function updateSunflowerCurrencyHud() {
    if (sunflowerCurrencyHudEl) {
        sunflowerCurrencyHudEl.textContent = `Girasoles: ${Math.max(0, Math.floor(economyState.sunflowers || 0))}`;
    }
}

function addSunflowerCurrency(amount, reason = "Recolectaste girasoles") {
    const gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (gain <= 0) {
        return;
    }

    economyState.sunflowers = Math.max(0, Math.floor(economyState.sunflowers || 0)) + gain;
    writeStorageValue(SUNFLOWER_CURRENCY_STORAGE_KEY, economyState.sunflowers);
    updateSunflowerCurrencyHud();
    showToast(`${reason}: +${gain} girasol${gain === 1 ? "" : "es"}`, "success", 1300);
}

function loadSunflowerCurrency() {
    economyState.sunflowers = Math.max(0, Math.floor(readStorageNumber(SUNFLOWER_CURRENCY_STORAGE_KEY, 0)));
    updateSunflowerCurrencyHud();
}

function updateGameplaySettingsUi() {
    if (chunkRadiusSliderEl) {
        chunkRadiusSliderEl.value = String(state.chunkRadius);
    }

    if (chunkRadiusValueEl) {
        chunkRadiusValueEl.textContent = String(state.chunkRadius);
    }

    if (pointerSensitivitySliderEl) {
        pointerSensitivitySliderEl.value = String(controls.pointerSpeed.toFixed(2));
    }

    if (pointerSensitivityValueEl) {
        pointerSensitivityValueEl.textContent = controls.pointerSpeed.toFixed(2);
    }

    if (qualityPresetSelectEl) {
        qualityPresetSelectEl.value = perfState.qualityPreset;
    }
}

function normalizeQualityPreset(value) {
    const raw = String(value || "").toLowerCase();
    if (raw === "low" || raw === "medium" || raw === "high") {
        return raw;
    }

    return "auto";
}

function setQualityPreset(preset, persist = true, showFeedback = false) {
    const normalized = normalizeQualityPreset(preset);
    perfState.qualityPreset = normalized;
    perfState.adjustCooldown = 0;

    if (normalized === "auto") {
        perfState.adaptiveEnabled = true;
        perfState.minPixelRatio = 0.72;
        perfState.dynamicPixelRatio = THREE.MathUtils.clamp(perfState.dynamicPixelRatio, perfState.minPixelRatio, basePixelRatio);
    } else {
        perfState.adaptiveEnabled = false;
        const manualRatio = normalized === "low"
            ? Math.min(basePixelRatio, 0.78)
            : normalized === "medium"
                ? Math.min(basePixelRatio, 1)
                : basePixelRatio;
        perfState.dynamicPixelRatio = manualRatio;
    }

    renderer.setPixelRatio(perfState.dynamicPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    if (persist) {
        writeStorageValue(QUALITY_PRESET_STORAGE_KEY, normalized);
    }

    if (showFeedback) {
        const label = normalized === "auto"
            ? "automatica"
            : normalized === "low"
                ? "baja"
                : normalized === "medium"
                    ? "media"
                    : "alta";
        showToast(`Calidad: ${label}`, "info", 1100);
    }

    updateGameplaySettingsUi();
}

function setPointerSensitivity(value, persist = true, showFeedback = false) {
    const numeric = Number(value);
    const next = THREE.MathUtils.clamp(
        Number.isFinite(numeric) ? numeric : DEFAULT_POINTER_SPEED,
        0.35,
        1.5
    );

    controls.pointerSpeed = Number(next.toFixed(2));

    if (persist) {
        writeStorageValue(POINTER_SENSITIVITY_STORAGE_KEY, controls.pointerSpeed);
    }

    if (showFeedback) {
        showToast(`Sensibilidad: ${controls.pointerSpeed.toFixed(2)}`, "info", 900);
    }

    updateGameplaySettingsUi();
}

function loadGameplayPreferences() {
    const storedChunkRadius = clampInt(readStorageNumber(CHUNK_RADIUS_STORAGE_KEY, state.chunkRadius), 2, 8);
    state.chunkRadius = storedChunkRadius;

    const storedPointerSensitivity = readStorageNumber(POINTER_SENSITIVITY_STORAGE_KEY, DEFAULT_POINTER_SPEED);
    setPointerSensitivity(storedPointerSensitivity, false, false);

    const storedQualityPreset = readStorageString(QUALITY_PRESET_STORAGE_KEY, "auto");
    setQualityPreset(storedQualityPreset, false, false);

    loadHotbarConfiguration();
    loadSunflowerCurrency();
    updateGameplaySettingsUi();
}

function setPauseSettingsOpen(open) {
    state.pauseSettingsOpen = Boolean(open);
    if (pauseSettingsSection) {
        pauseSettingsSection.classList.toggle("hidden", !state.pauseSettingsOpen);
    }
}

function setAvatarPreviewOpen(open, showFeedback = false) {
    const next = Boolean(open);
    if (next === state.avatarPreviewOpen) {
        return;
    }

    state.avatarPreviewOpen = next;

    if (state.avatarPreviewOpen) {
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        state.keyDown.clear();
        state.avatarPreviewAngle = controls.getObject().rotation.y || 0;
        ensureLocalAvatarPreviewModel();
        localAvatarPreviewRoot.visible = true;

        if (crosshairEl) {
            crosshairEl.classList.add("hidden");
        }

        if (controls.isLocked) {
            try {
                controls.unlock();
            } catch (error) {
            }
        }

        if (showFeedback) {
            showToast("Vista de avatar activada. Presiona V para volver.", "info", 1900);
        }
        return;
    }

    localAvatarPreviewRoot.visible = false;

    if (crosshairEl && !state.inventoryOpen) {
        crosshairEl.classList.remove("hidden");
    }

    if (showFeedback) {
        showToast("Vista de avatar cerrada", "info", 900);
    }

    if (state.worldStarted && !state.paused && !state.tutorialVisible && !state.inventoryOpen && !controls.isLocked) {
        try {
            controls.lock();
        } catch (error) {
        }
    }
}

function updateAvatarPreviewCamera(deltaSeconds) {
    if (!state.avatarPreviewOpen) {
        return;
    }

    ensureLocalAvatarPreviewModel();
    localAvatarPreviewRoot.visible = true;

    const baseX = state.playerPosition.x;
    const baseY = state.playerPosition.y;
    const baseZ = state.playerPosition.z;
    const lookY = baseY + 1.08;

    state.avatarPreviewAngle += deltaSeconds * AVATAR_PREVIEW_ORBIT_SPEED;

    const camX = baseX + Math.cos(state.avatarPreviewAngle) * AVATAR_PREVIEW_RADIUS;
    const camZ = baseZ + Math.sin(state.avatarPreviewAngle) * AVATAR_PREVIEW_RADIUS;
    const camY = lookY + 0.58;

    const previewAvatar = localAvatarPreviewRoot.children[0];
    if (previewAvatar) {
        let moveForward = 0;
        let moveRight = 0;
        if (state.keyDown.has("KeyW")) moveForward += 1;
        if (state.keyDown.has("KeyS")) moveForward -= 1;
        if (state.keyDown.has("KeyD")) moveRight += 1;
        if (state.keyDown.has("KeyA")) moveRight -= 1;
        const walkIntent = Math.hypot(moveForward, moveRight) > 0 ? 1 : 0;
        const previewSpeed = walkIntent > 0
            ? (state.keyDown.has("ShiftLeft") ? SPRINT_SPEED : BASE_SPEED)
            : 0;
        updateAvatarWalkAnimation(previewAvatar, previewSpeed, deltaSeconds);
    }

    localAvatarPreviewRoot.position.set(baseX, baseY, baseZ);
    localAvatarPreviewRoot.rotation.y = state.avatarPreviewAngle + Math.PI * 1.5;

    controls.getObject().position.set(camX, camY, camZ);
    camera.lookAt(baseX, lookY, baseZ);
}

function setPauseMenuOpen(open) {
    if (!state.worldStarted) {
        state.paused = false;
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        if (state.avatarPreviewOpen) {
            setAvatarPreviewOpen(false);
        }
        if (pauseMenuEl) {
            pauseMenuEl.classList.add("hidden");
        }
        return;
    }

    if (open && state.avatarPreviewOpen) {
        setAvatarPreviewOpen(false);
    }
    if (open && state.inventoryOpen) {
        setInventoryOpen(false);
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
    flushCloudPropWrites();
    if (showFeedback) {
        showToast("Mundo guardado", "success");
    }
}

function getBlockLabel(blockId) {
    const definition = getBlockDefinitionById(Number(blockId));
    return definition?.label || `Bloque ${blockId}`;
}

function updateTargetedBlockUi(deltaSeconds = 0) {
    if (!state.worldStarted || !state.worldReady || state.paused || state.avatarPreviewOpen || state.inventoryOpen || !controls.isLocked) {
        state.targetUiTick = 0;
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    state.targetUiTick -= Math.max(0, deltaSeconds);
    if (state.targetUiTick > 0) {
        return;
    }
    state.targetUiTick = TARGET_UI_SCAN_INTERVAL;

    const blockHit = findTargetedBlockHit();
    const blockDistance = blockHit?.hit?.distance ?? Number.POSITIVE_INFINITY;
    const propHit = findTargetedPropHit(blockDistance);

    let flowerDistance = Number.POSITIVE_INFINITY;
    let flowerId = "";
    if (sunflowerRoot.children.length > 0) {
        raycaster.setFromCamera(blockRayCenterNdc, camera);
        raycaster.far = MAX_REACH;
        const flowerHits = raycaster.intersectObjects(sunflowerRoot.children, true);
        const nearestFlowerHit = getFirstVisibleRayHit(flowerHits);
        if (nearestFlowerHit) {
            flowerDistance = nearestFlowerHit.distance;
            flowerId = String(findAncestorUserDataValue(nearestFlowerHit.object, "sunflowerId") || "");
        }
    }

    const propDistance = propHit?.distance ?? Number.POSITIVE_INFINITY;

    if (flowerId && flowerDistance <= blockDistance + 0.001 && flowerDistance <= propDistance + 0.001) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.textContent = "Girasol: tecla E para cosechar";
            targetBlockLabelEl.classList.remove("hidden");
        }
        return;
    }

    if (propHit && propDistance <= blockDistance + 0.001) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            if (isLightPropType(propHit.placed.propType)) {
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)} ${getLampIntensityLabel(normalizeLampLevel(propHit.placed.lampLevel))} (click der cambiar luz, click izq quitar)`;
            } else {
                targetBlockLabelEl.textContent = `Objeto: ${getPropLabel(propHit.placed.propType)} (click izq para quitar)`;
            }
            targetBlockLabelEl.classList.remove("hidden");
        }
        return;
    }

    if (!blockHit) {
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    targetHighlight.visible = true;
    targetHighlight.position.set(blockHit.lookup.x + 0.5, blockHit.lookup.y + 0.5, blockHit.lookup.z + 0.5);

    if (targetBlockLabelEl) {
        targetBlockLabelEl.textContent = `Bloque: ${getBlockLabel(blockHit.lookup.id)}`;
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
    sunCore.renderOrder = 5;
    skyDecorRoot.add(sunCore);

    const sunGlow = new THREE.Mesh(
        new THREE.SphereGeometry(7.8, 20, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff4c7, transparent: true, opacity: 0.24 })
    );
    sunGlow.position.copy(sunCore.position);
    sunGlow.renderOrder = 5;
    skyDecorRoot.add(sunGlow);

    const moonCore = new THREE.Mesh(
        new THREE.SphereGeometry(4.3, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0xe6ebff })
    );
    moonCore.position.set(-92, 64, 132);
    moonCore.renderOrder = 5;
    skyDecorRoot.add(moonCore);

    const moonGlow = new THREE.Mesh(
        new THREE.SphereGeometry(6.5, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0xbccfff, transparent: true, opacity: 0.16 })
    );
    moonGlow.position.copy(moonCore.position);
    moonGlow.renderOrder = 5;
    skyDecorRoot.add(moonGlow);

    skyState.sunCore = sunCore;
    skyState.sunGlow = sunGlow;
    skyState.moonCore = moonCore;
    skyState.moonGlow = moonGlow;

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

function normalizeDayNightCycleSeconds(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    const wrapped = numeric % DAY_NIGHT_CYCLE_SECONDS;
    return wrapped < 0 ? wrapped + DAY_NIGHT_CYCLE_SECONDS : wrapped;
}

function cycleSecondsToEpochMs(cycleSeconds, referenceMs = Date.now()) {
    const normalizedSeconds = normalizeDayNightCycleSeconds(cycleSeconds);
    return Math.floor(Number(referenceMs) - normalizedSeconds * 1000);
}

function computeCycleSecondsFromEpochMs(epochMs, referenceMs = Date.now()) {
    const epoch = Number(epochMs);
    const now = Number(referenceMs);
    if (!Number.isFinite(epoch) || epoch <= 0 || !Number.isFinite(now)) {
        return null;
    }

    return normalizeDayNightCycleSeconds((now - epoch) / 1000);
}

function applyDayNightEpochMs(epochMs, persist = true) {
    const epoch = Math.floor(Number(epochMs));
    if (!Number.isFinite(epoch) || epoch <= 0) {
        return false;
    }

    skyState.sharedEpochMs = epoch;
    skyState.clockSynced = true;
    const syncedCycle = computeCycleSecondsFromEpochMs(epoch);
    if (syncedCycle !== null) {
        skyState.cycleSeconds = syncedCycle;
    }

    if (persist) {
        writeStorageValue(DAY_NIGHT_EPOCH_STORAGE_KEY, epoch);
    }
    return true;
}

function initDayNightClockFromStorage() {
    const storedEpoch = Math.floor(readStorageNumber(DAY_NIGHT_EPOCH_STORAGE_KEY, 0));
    if (Number.isFinite(storedEpoch) && storedEpoch > 0) {
        if (applyDayNightEpochMs(storedEpoch, false)) {
            return;
        }
    }

    const fallbackEpoch = cycleSecondsToEpochMs(skyState.cycleSeconds);
    applyDayNightEpochMs(fallbackEpoch, true);
}

function resolveRemoteAvatarYaw(yawValue) {
    const yaw = Number(yawValue);
    return (Number.isFinite(yaw) ? yaw : 0) + REMOTE_AVATAR_YAW_OFFSET;
}

function getSkyOrbitAngle(cycleSeconds) {
    const wrapped = ((cycleSeconds % DAY_NIGHT_CYCLE_SECONDS) + DAY_NIGHT_CYCLE_SECONDS) % DAY_NIGHT_CYCLE_SECONDS;
    if (wrapped < DAY_DURATION_SECONDS) {
        const dayProgress = wrapped / DAY_DURATION_SECONDS;
        return THREE.MathUtils.lerp(-Math.PI * 0.08, Math.PI * 1.08, dayProgress);
    }

    const nightProgress = (wrapped - DAY_DURATION_SECONDS) / NIGHT_DURATION_SECONDS;
    return THREE.MathUtils.lerp(Math.PI * 1.08, Math.PI * 1.92, nightProgress);
}

function updateSky(deltaSeconds) {
    const syncedCycle = computeCycleSecondsFromEpochMs(skyState.sharedEpochMs);
    if (syncedCycle === null) {
        skyState.cycleSeconds = normalizeDayNightCycleSeconds(skyState.cycleSeconds + deltaSeconds);
    } else {
        skyState.cycleSeconds = syncedCycle;
    }
    const orbitAngle = getSkyOrbitAngle(skyState.cycleSeconds);
    const sunDir = skyVectorScratchA
        .set(Math.cos(orbitAngle), Math.sin(orbitAngle), Math.sin(orbitAngle * 0.42 + 1.1))
        .normalize();
    const moonDir = skyVectorScratchB.copy(sunDir).multiplyScalar(-1);
    const dayFactor = smoothstep(-0.09, 0.2, sunDir.y);
    const nightFactor = smoothstep(-0.08, 0.2, moonDir.y);
    const twilightFactor = 1 - Math.min(1, Math.abs(sunDir.y) * 5);
    const sunShadowActive = dayFactor > 0.12;
    const moonShadowActive = nightFactor > 0.18;

    const anchorX = state.playerPosition.x;
    const anchorY = state.playerPosition.y + 6;
    const anchorZ = state.playerPosition.z;
    const sunPosX = anchorX + sunDir.x * SUN_ORBIT_RADIUS;
    const sunPosY = anchorY + sunDir.y * SUN_ORBIT_HEIGHT;
    const sunPosZ = anchorZ + sunDir.z * SUN_ORBIT_RADIUS;
    const moonPosX = anchorX + moonDir.x * SUN_ORBIT_RADIUS;
    const moonPosY = anchorY + moonDir.y * SUN_ORBIT_HEIGHT;
    const moonPosZ = anchorZ + moonDir.z * SUN_ORBIT_RADIUS;

    sun.position.set(sunPosX, sunPosY, sunPosZ);
    moon.position.set(moonPosX, moonPosY, moonPosZ);
    sunTarget.position.set(anchorX, anchorY - 2, anchorZ);
    moonTarget.position.set(anchorX, anchorY - 2, anchorZ);
    sun.target.updateMatrixWorld();
    moon.target.updateMatrixWorld();

    if (sun.castShadow !== sunShadowActive) {
        sun.castShadow = sunShadowActive;
    }
    if (moon.castShadow !== moonShadowActive) {
        moon.castShadow = moonShadowActive;
    }

    skyState.shadowRefreshTimer -= deltaSeconds;
    const movedX = Math.abs(anchorX - skyState.lastShadowAnchorX);
    const movedZ = Math.abs(anchorZ - skyState.lastShadowAnchorZ);
    const sunYDelta = Math.abs(sunDir.y - skyState.lastShadowSunY);
    if (skyState.shadowRefreshTimer <= 0 || movedX > 1.25 || movedZ > 1.25 || sunYDelta > 0.025) {
        if (sunShadowActive) {
            sun.shadow.needsUpdate = true;
        }
        if (moonShadowActive) {
            moon.shadow.needsUpdate = true;
        }
        skyState.shadowRefreshTimer = SKY_SHADOW_REFRESH_SECONDS;
        skyState.lastShadowAnchorX = anchorX;
        skyState.lastShadowAnchorZ = anchorZ;
        skyState.lastShadowSunY = sunDir.y;
    }

    if (skyState.sunCore) {
        skyState.sunCore.position.set(sunPosX, sunPosY, sunPosZ);
    }
    if (skyState.sunGlow) {
        skyState.sunGlow.position.set(sunPosX, sunPosY, sunPosZ);
    }
    if (skyState.moonCore) {
        skyState.moonCore.position.set(moonPosX, moonPosY, moonPosZ);
    }
    if (skyState.moonGlow) {
        skyState.moonGlow.position.set(moonPosX, moonPosY, moonPosZ);
    }

    skyColorScratch.copy(SKY_NIGHT_COLOR).lerp(SKY_DAY_COLOR, dayFactor);
    if (twilightFactor > 0.001) {
        skyColorScratch.lerp(SKY_DUSK_COLOR, twilightFactor * (1 - dayFactor * 0.6));
    }
    scene.background.copy(skyColorScratch);
    scene.fog.color.copy(skyColorScratch);

    sun.intensity = 0.14 + dayFactor * 1.08;
    moon.intensity = 0.03 + nightFactor * 0.26;
    hemiLight.intensity = 0.2 + dayFactor * 0.4 + nightFactor * 0.1;
    ambientFill.intensity = 0.08 + dayFactor * 0.2 + nightFactor * 0.12;
    sun.color.setHSL(0.1, 0.85 - twilightFactor * 0.28, 0.56 + twilightFactor * 0.08);
    moon.color.setHSL(0.62, 0.45, 0.62);

    if (skyState.sunGlow?.material) {
        skyState.sunGlow.material.opacity = 0.1 + dayFactor * 0.25;
    }
    if (skyState.moonGlow?.material) {
        skyState.moonGlow.material.opacity = 0.04 + nightFactor * 0.2;
    }

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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
        const spawnChance = Math.max(0.08, 0.36 - occupancy * 0.3);
        if (Math.random() < spawnChance) {
            const spawnBursts = 1;
            for (let i = 0; i < spawnBursts; i += 1) {
                if (!trySpawnRabbitNearPlayer(false)) {
                    break;
                }
            }
        }
    }

    for (const [rabbitId, rabbit] of Array.from(wildlifeState.rabbits.entries())) {
        const dx = rabbit.x - state.playerPosition.x;
        const dz = rabbit.z - state.playerPosition.z;
        if (dx * dx + dz * dz > RABBIT_DESPAWN_DISTANCE * RABBIT_DESPAWN_DISTANCE) {
            removeRabbitEntity(rabbitId);
            continue;
        }

        const isVisibleInLoadedChunk = isWorldPositionChunkLoaded(rabbit.x, rabbit.z);
        rabbit.node.visible = isVisibleInLoadedChunk;
        if (!isVisibleInLoadedChunk) {
            continue;
        }

        updateSingleRabbit(rabbitId, rabbit, deltaSeconds);
    }
}

function initWildlife() {
    clearWildlife();
    wildlifeState.nextId = 1;
    resetRabbitSpawnTimer();

    const initialCount = randomIntInclusive(1, 2);
    for (let i = 0; i < initialCount; i += 1) {
        if (!trySpawnRabbitNearPlayer(true)) {
            break;
        }
    }
}

function findAncestorUserDataValue(object, key) {
    let current = object;
    while (current) {
        if (current.userData && current.userData[key] !== undefined) {
            return current.userData[key];
        }
        current = current.parent || null;
    }
    return null;
}

function getPropLabel(propType) {
    const definition = getPropDefinition(propType);
    return definition?.label || "Objeto";
}

function getPropProfile(propType) {
    const fallbackProfile = PROP_PROFILES[PROP_TYPE.PLANTER] || {
        halfExtents: { x: 0.25, z: 0.25 },
        minY: 0,
        maxY: 1,
        supportY: 0.5
    };
    return getPropDefinition(propType)?.profile || fallbackProfile;
}

function getRotatedPropHalfExtents(propType, yaw = 0) {
    const profile = getPropProfile(propType);
    const base = profile.halfExtents || { x: 0.25, z: 0.25 };
    const normalized = Math.abs(Math.round(normalizeYawRadians(yaw) / PROP_ROTATION_STEP)) % 2;
    if (normalized === 1) {
        return { x: base.z, z: base.x };
    }

    return { x: base.x, z: base.z };
}

function getPlacedPropBoundsAt(propType, x, y, z, yaw = 0, expand = 0) {
    const profile = getPropProfile(propType);
    const extents = getRotatedPropHalfExtents(propType, yaw);
    return {
        minX: x - extents.x - expand,
        maxX: x + extents.x + expand,
        minY: y + profile.minY - expand,
        maxY: y + profile.maxY + expand,
        minZ: z - extents.z - expand,
        maxZ: z + extents.z + expand
    };
}

function getPlacedPropBounds(placed, expand = 0) {
    if (!placed) {
        return null;
    }
    return getPlacedPropBoundsAt(
        placed.propType,
        Number(placed.x) || 0,
        Number(placed.y) || 0,
        Number(placed.z) || 0,
        Number(placed.yaw) || 0,
        expand
    );
}

function getPlacedPropSupportY(placed) {
    if (!placed) {
        return 0;
    }
    const profile = getPropProfile(placed.propType);
    return (Number(placed.y) || 0) + profile.supportY;
}

function getPropSpatialCellCoord(value) {
    return Math.floor((Number(value) || 0) / PROP_SPATIAL_CELL_SIZE);
}

function getPropSpatialCellKey(cx, cy, cz) {
    return `${cx}|${cy}|${cz}`;
}

function addPropIdToSpatialCell(cellKey, propId) {
    let bucket = propSpatialGrid.get(cellKey);
    if (!bucket) {
        bucket = new Set();
        propSpatialGrid.set(cellKey, bucket);
    }
    bucket.add(propId);
}

function removePropIdFromSpatialCell(cellKey, propId) {
    const bucket = propSpatialGrid.get(cellKey);
    if (!bucket) {
        return;
    }

    bucket.delete(propId);
    if (bucket.size === 0) {
        propSpatialGrid.delete(cellKey);
    }
}

function setIndexedPropType(propType, propId, shouldInclude) {
    const byType = propTypeIndex.get(propType);
    if (!byType) {
        return;
    }

    if (shouldInclude) {
        byType.add(propId);
    } else {
        byType.delete(propId);
    }
}

function indexPlacedProp(placed) {
    if (!placed) {
        return;
    }

    const bounds = getPlacedPropBounds(placed, 0);
    if (!bounds) {
        return;
    }

    const minCx = getPropSpatialCellCoord(bounds.minX);
    const maxCx = getPropSpatialCellCoord(bounds.maxX);
    const minCy = getPropSpatialCellCoord(bounds.minY);
    const maxCy = getPropSpatialCellCoord(bounds.maxY);
    const minCz = getPropSpatialCellCoord(bounds.minZ);
    const maxCz = getPropSpatialCellCoord(bounds.maxZ);
    const occupiedCells = [];

    for (let cx = minCx; cx <= maxCx; cx += 1) {
        for (let cy = minCy; cy <= maxCy; cy += 1) {
            for (let cz = minCz; cz <= maxCz; cz += 1) {
                const cellKey = getPropSpatialCellKey(cx, cy, cz);
                occupiedCells.push(cellKey);
                addPropIdToSpatialCell(cellKey, placed.id);
            }
        }
    }

    placed.spatialCells = occupiedCells;
    setIndexedPropType(placed.propType, placed.id, true);
}

function unindexPlacedProp(placed) {
    if (!placed) {
        return;
    }

    if (Array.isArray(placed.spatialCells)) {
        for (const cellKey of placed.spatialCells) {
            removePropIdFromSpatialCell(cellKey, placed.id);
        }
    }

    placed.spatialCells = [];
    setIndexedPropType(placed.propType, placed.id, false);
}

function fillNearbyPropIds(minX, maxX, minY, maxY, minZ, maxZ, targetSet) {
    if (!targetSet) {
        return;
    }

    const loX = Math.min(minX, maxX);
    const hiX = Math.max(minX, maxX);
    const loY = Math.min(minY, maxY);
    const hiY = Math.max(minY, maxY);
    const loZ = Math.min(minZ, maxZ);
    const hiZ = Math.max(minZ, maxZ);

    const minCx = getPropSpatialCellCoord(loX);
    const maxCx = getPropSpatialCellCoord(hiX);
    const minCy = getPropSpatialCellCoord(loY);
    const maxCy = getPropSpatialCellCoord(hiY);
    const minCz = getPropSpatialCellCoord(loZ);
    const maxCz = getPropSpatialCellCoord(hiZ);

    for (let cx = minCx; cx <= maxCx; cx += 1) {
        for (let cy = minCy; cy <= maxCy; cy += 1) {
            for (let cz = minCz; cz <= maxCz; cz += 1) {
                const bucket = propSpatialGrid.get(getPropSpatialCellKey(cx, cy, cz));
                if (!bucket || bucket.size === 0) {
                    continue;
                }

                for (const propId of bucket) {
                    targetSet.add(propId);
                }
            }
        }
    }
}

function queryNearbyPropIdsReusable(minX, maxX, minY, maxY, minZ, maxZ) {
    propSpatialQueryIds.clear();
    fillNearbyPropIds(minX, maxX, minY, maxY, minZ, maxZ, propSpatialQueryIds);
    return propSpatialQueryIds;
}

function isWorldPositionChunkLoaded(x, z) {
    const cx = worldToChunkCoord(x);
    const cz = worldToChunkCoord(z);
    return chunkMap.has(chunkKey(cx, cz));
}

function refreshSinglePropVisibility(placed) {
    if (!placed?.node) {
        return;
    }
    placed.chunkKey = chunkKey(worldToChunkCoord(placed.x), worldToChunkCoord(placed.z));
    placed.node.visible = isWorldPositionChunkLoaded(placed.x, placed.z);
}

function updatePlacedPropCulling() {
    for (const placed of placedProps.values()) {
        refreshSinglePropVisibility(placed);
    }
    propState.cullingDirty = false;
}

function intersectsAabb(a, b) {
    if (!a || !b) {
        return false;
    }
    return (
        a.minX < b.maxX
        && a.maxX > b.minX
        && a.minY < b.maxY
        && a.maxY > b.minY
        && a.minZ < b.maxZ
        && a.maxZ > b.minZ
    );
}

function isObjectHierarchyVisible(object) {
    let current = object;
    while (current) {
        if (current.visible === false) {
            return false;
        }
        current = current.parent || null;
    }
    return true;
}

function getFirstVisibleRayHit(hits) {
    for (const hit of hits || []) {
        if (isObjectHierarchyVisible(hit.object)) {
            return hit;
        }
    }
    return null;
}

function getWorldNormalFromRayHit(hit) {
    const localNormal = hit?.face?.normal;
    if (!localNormal) {
        return null;
    }

    const worldNormal = worldNormalScratch.copy(localNormal);
    if (hit.object?.matrixWorld) {
        worldNormal.transformDirection(hit.object.matrixWorld);
    }
    return worldNormal.normalize();
}

function findNearestPlacedPropOfType(propType, x, z, maxDistance = 2.3) {
    const maxDistanceSq = maxDistance * maxDistance;
    let nearest = null;
    let nearestSq = Number.POSITIVE_INFINITY;
    const byType = propTypeIndex.get(propType);
    if (!byType || byType.size === 0) {
        return null;
    }

    for (const propId of byType) {
        const placed = placedProps.get(propId);
        if (!placed) {
            continue;
        }
        const dx = placed.x - x;
        const dz = placed.z - z;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq < nearestSq && distanceSq <= maxDistanceSq) {
            nearest = placed;
            nearestSq = distanceSq;
        }
    }
    return nearest;
}

function normalizeLampLevel(value) {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }

    return Math.min(numeric, LAMP_INTENSITY_LEVELS.length - 1);
}

function getLampIntensityLabel(level) {
    if (level === 0) return "Apagada";
    if (level === 1) return "Minima";
    if (level === 2) return "Media";
    return "Maxima";
}

function normalizeYawRadians(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    let yaw = numeric % (Math.PI * 2);
    if (yaw > Math.PI) {
        yaw -= Math.PI * 2;
    } else if (yaw < -Math.PI) {
        yaw += Math.PI * 2;
    }
    return yaw;
}

function getAngularDistanceRadians(a, b) {
    let delta = (Number(a) || 0) - (Number(b) || 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta);
}

function snapYawToStep(value, step = PROP_ROTATION_STEP) {
    const normalized = normalizeYawRadians(value);
    const snapped = Math.round(normalized / step) * step;
    return normalizeYawRadians(snapped);
}

function resolvePropPlacementYaw(propType, propX, propZ) {
    let yaw = controls.getObject().rotation.y || 0;
    if (propType === PROP_TYPE.CHAIR) {
        const nearestTable = findNearestPlacedPropOfType(PROP_TYPE.TABLE, propX, propZ, 2.25);
        if (nearestTable) {
            const lookDx = nearestTable.x - propX;
            const lookDz = nearestTable.z - propZ;
            if (lookDx * lookDx + lookDz * lookDz > 0.0001) {
                yaw = Math.atan2(lookDx, lookDz);
                return snapYawToStep(yaw);
            }
        }

        const dx = state.playerPosition.x - propX;
        const dz = state.playerPosition.z - propZ;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq > 0.0001) {
            yaw = Math.atan2(dx, dz);
        }
    } else if (propType === PROP_TYPE.TABLE) {
        const nearestTable = findNearestPlacedPropOfType(PROP_TYPE.TABLE, propX, propZ, 1.55);
        if (nearestTable) {
            yaw = nearestTable.yaw || 0;
        } else {
            const dx = state.playerPosition.x - propX;
            const dz = state.playerPosition.z - propZ;
            if (dx * dx + dz * dz > 0.0001) {
                yaw = Math.atan2(dx, dz);
            }
        }
    }

    return snapYawToStep(yaw);
}

function createLampPointLightRig(root, {
    baseColor = 0xffe6b4,
    emissiveColor = 0xffd185,
    pointLightColor = 0xffe6aa,
    bulbScale = { x: 0.12, y: 0.11, z: 0.12 },
    bulbPosition = { x: 0, y: 0.82, z: 0 }
} = {}) {
    const bulbMaterial = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.26,
        metalness: 0.02,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    bulbMaterial.userData.disposeOnRemove = true;
    bulbMaterial.userData.lampEmissiveColor = emissiveColor;
    const bulb = new THREE.Mesh(detailUnitGeometry, bulbMaterial);
    bulb.scale.set(bulbScale.x, bulbScale.y, bulbScale.z);
    bulb.position.set(bulbPosition.x, bulbPosition.y, bulbPosition.z);
    bulb.castShadow = false;
    bulb.receiveShadow = false;
    bulb.userData.isLampBulb = true;
    root.add(bulb);

    const pointLight = new THREE.PointLight(pointLightColor, 0, 0, 2);
    pointLight.position.set(bulbPosition.x, bulbPosition.y, bulbPosition.z);
    pointLight.castShadow = false;
    pointLight.shadow.mapSize.set(LAMP_SHADOW_MAP_SIZE, LAMP_SHADOW_MAP_SIZE);
    pointLight.shadow.bias = -0.0006;
    pointLight.shadow.normalBias = 0.022;
    pointLight.shadow.camera.near = 0.1;
    pointLight.shadow.camera.far = 24;
    pointLight.shadow.autoUpdate = false;
    pointLight.shadow.needsUpdate = true;
    root.add(pointLight);
    root.userData.lampPointLight = pointLight;
    root.userData.lampBulbMaterial = bulbMaterial;
}

function buildChairNode(root) {
    root.add(createDetailPart({ x: 0.5, y: 0.08, z: 0.5 }, { x: 0, y: 0.45, z: 0 }, 0x986f45));
    root.add(createDetailPart({ x: 0.5, y: 0.5, z: 0.08 }, { x: 0, y: 0.74, z: -0.21 }, 0x8b643e));
    root.add(createDetailPart({ x: 0.08, y: 0.44, z: 0.08 }, { x: -0.2, y: 0.22, z: -0.2 }, 0x7e5836));
    root.add(createDetailPart({ x: 0.08, y: 0.44, z: 0.08 }, { x: 0.2, y: 0.22, z: -0.2 }, 0x7e5836));
    root.add(createDetailPart({ x: 0.08, y: 0.44, z: 0.08 }, { x: -0.2, y: 0.22, z: 0.2 }, 0x7e5836));
    root.add(createDetailPart({ x: 0.08, y: 0.44, z: 0.08 }, { x: 0.2, y: 0.22, z: 0.2 }, 0x7e5836));
}

function buildTableNode(root) {
    root.add(createDetailPart({ x: 0.98, y: 0.08, z: 0.94 }, { x: 0, y: 0.72, z: 0 }, 0xb58657));
    root.add(createDetailPart({ x: 0.1, y: 0.68, z: 0.1 }, { x: -0.39, y: 0.34, z: -0.36 }, 0x8c633e));
    root.add(createDetailPart({ x: 0.1, y: 0.68, z: 0.1 }, { x: 0.39, y: 0.34, z: -0.36 }, 0x8c633e));
    root.add(createDetailPart({ x: 0.1, y: 0.68, z: 0.1 }, { x: -0.39, y: 0.34, z: 0.36 }, 0x8c633e));
    root.add(createDetailPart({ x: 0.1, y: 0.68, z: 0.1 }, { x: 0.39, y: 0.34, z: 0.36 }, 0x8c633e));
}

function buildLampNode(root) {
    root.add(createDetailPart({ x: 0.2, y: 0.05, z: 0.2 }, { x: 0, y: 0.03, z: 0 }, 0x6f573b));
    root.add(createDetailPart({ x: 0.06, y: 0.68, z: 0.06 }, { x: 0, y: 0.37, z: 0 }, 0x5d4a35));
    root.add(createDetailPart({ x: 0.3, y: 0.2, z: 0.3 }, { x: 0, y: 0.84, z: 0 }, 0xffd890));
    root.add(createDetailPart({ x: 0.18, y: 0.08, z: 0.18 }, { x: 0, y: 0.96, z: 0 }, 0xcf9d56));
    createLampPointLightRig(root, {
        baseColor: 0xffe6b4,
        emissiveColor: 0xffd185,
        pointLightColor: 0xffe6aa,
        bulbScale: { x: 0.12, y: 0.11, z: 0.12 },
        bulbPosition: { x: 0, y: 0.82, z: 0 }
    });
}

function buildPlanterNode(root) {
    root.add(createDetailPart({ x: 0.5, y: 0.22, z: 0.5 }, { x: 0, y: 0.11, z: 0 }, 0x8a6540));
    root.add(createDetailPart({ x: 0.38, y: 0.2, z: 0.38 }, { x: 0, y: 0.32, z: 0 }, 0x3f8947));
    root.add(createDetailPart({ x: 0.16, y: 0.34, z: 0.16 }, { x: 0, y: 0.45, z: 0 }, 0x4f9f51));
}

function buildChestNode(root) {
    root.add(createDetailPart({ x: 0.78, y: 0.34, z: 0.56 }, { x: 0, y: 0.17, z: 0 }, 0x8e613a));
    root.add(createDetailPart({ x: 0.8, y: 0.18, z: 0.58 }, { x: 0, y: 0.43, z: 0 }, 0xaa7a4a));
    root.add(createDetailPart({ x: 0.1, y: 0.16, z: 0.06 }, { x: 0, y: 0.34, z: 0.31 }, 0xccb57a));
    root.add(createDetailPart({ x: 0.82, y: 0.02, z: 0.02 }, { x: 0, y: 0.25, z: 0.29 }, 0x6c482a));
}

function buildBedNode(root) {
    root.add(createDetailPart({ x: 0.92, y: 0.12, z: 1.82 }, { x: 0, y: 0.18, z: 0 }, 0x8c603b));
    root.add(createDetailPart({ x: 0.82, y: 0.18, z: 1.68 }, { x: 0, y: 0.34, z: 0 }, 0xd8d7da));
    root.add(createDetailPart({ x: 0.82, y: 0.06, z: 0.6 }, { x: 0, y: 0.46, z: 0.34 }, 0xb77a88));
    root.add(createDetailPart({ x: 0.82, y: 0.08, z: 0.28 }, { x: 0, y: 0.47, z: -0.63 }, 0xf0ecdf));
    root.add(createDetailPart({ x: 0.12, y: 0.24, z: 0.12 }, { x: -0.37, y: 0.12, z: -0.8 }, 0x6d482a));
    root.add(createDetailPart({ x: 0.12, y: 0.24, z: 0.12 }, { x: 0.37, y: 0.12, z: -0.8 }, 0x6d482a));
    root.add(createDetailPart({ x: 0.12, y: 0.24, z: 0.12 }, { x: -0.37, y: 0.12, z: 0.8 }, 0x6d482a));
    root.add(createDetailPart({ x: 0.12, y: 0.24, z: 0.12 }, { x: 0.37, y: 0.12, z: 0.8 }, 0x6d482a));
}

function buildFenceNode(root) {
    root.add(createDetailPart({ x: 0.16, y: 1, z: 0.16 }, { x: 0, y: 0.5, z: 0 }, 0x8c623d));
    root.add(createDetailPart({ x: 0.84, y: 0.1, z: 0.1 }, { x: 0, y: 0.68, z: 0 }, 0x9f7045));
    root.add(createDetailPart({ x: 0.84, y: 0.1, z: 0.1 }, { x: 0, y: 0.38, z: 0 }, 0x9f7045));
}

function buildLanternNode(root) {
    root.add(createDetailPart({ x: 0.14, y: 0.05, z: 0.14 }, { x: 0, y: 0.03, z: 0 }, 0x58442f));
    root.add(createDetailPart({ x: 0.26, y: 0.06, z: 0.26 }, { x: 0, y: 0.18, z: 0 }, 0x2f2a28));
    root.add(createDetailPart({ x: 0.2, y: 0.32, z: 0.2 }, { x: 0, y: 0.38, z: 0 }, 0xcda868));
    root.add(createDetailPart({ x: 0.26, y: 0.06, z: 0.26 }, { x: 0, y: 0.58, z: 0 }, 0x2f2a28));
    root.add(createDetailPart({ x: 0.06, y: 0.22, z: 0.06 }, { x: 0, y: 0.74, z: 0 }, 0x4a3b2d));
    root.add(createDetailPart({ x: 0.22, y: 0.04, z: 0.22 }, { x: 0, y: 0.86, z: 0 }, 0x2f2a28));
    createLampPointLightRig(root, {
        baseColor: 0xffe2a8,
        emissiveColor: 0xffc873,
        pointLightColor: 0xffd892,
        bulbScale: { x: 0.1, y: 0.1, z: 0.1 },
        bulbPosition: { x: 0, y: 0.39, z: 0 }
    });
}

const PROP_NODE_BUILDERS = Object.freeze({
    [PROP_TYPE.CHAIR]: buildChairNode,
    [PROP_TYPE.TABLE]: buildTableNode,
    [PROP_TYPE.LAMP]: buildLampNode,
    [PROP_TYPE.PLANTER]: buildPlanterNode,
    [PROP_TYPE.CHEST]: buildChestNode,
    [PROP_TYPE.BED]: buildBedNode,
    [PROP_TYPE.FENCE]: buildFenceNode,
    [PROP_TYPE.LANTERN]: buildLanternNode
});

const registryValidationIssues = [
    ...validateContentRegistry(),
    ...propRegistry.definitions
        .filter((definition) => !PROP_NODE_BUILDERS[definition.builderKey])
        .map((definition) => `Prop sin builder/factory: ${definition.id} (${definition.builderKey})`)
];

function createPlacedPropNode(propType) {
    const root = new THREE.Group();
    const definition = getPropDefinition(propType);
    const builderKey = definition?.builderKey || PROP_TYPE.PLANTER;
    const builder = PROP_NODE_BUILDERS[builderKey] || PROP_NODE_BUILDERS[PROP_TYPE.PLANTER];
    if (builder) {
        builder(root);
    }
    root.userData.propType = propType;
    return root;
}

function applyLampVisualState(placed, lampLevel, persist = true) {
    if (!placed || !isLightPropType(placed.propType)) {
        return false;
    }

    const normalizedLevel = normalizeLampLevel(lampLevel);
    placed.lampLevel = normalizedLevel;
    const pointLight = placed.node?.userData?.lampPointLight || null;
    const bulbMaterial = placed.node?.userData?.lampBulbMaterial || null;
    if (pointLight) {
        pointLight.intensity = LAMP_INTENSITY_LEVELS[normalizedLevel];
        pointLight.distance = LAMP_DISTANCE_LEVELS[normalizedLevel];
        pointLight.visible = normalizedLevel > 0;
        pointLight.shadow.needsUpdate = normalizedLevel >= LAMP_SHADOW_MIN_LEVEL;
    }

    if (bulbMaterial) {
        const emissiveColor = Number(bulbMaterial.userData?.lampEmissiveColor ?? 0xffd185);
        bulbMaterial.emissive.setHex(emissiveColor);
        bulbMaterial.emissiveIntensity = LAMP_BULB_EMISSIVE_LEVELS[normalizedLevel];
    }

    markLampShadowsDirty();
    if (persist) {
        scheduleWorldSave();
    }
    return true;
}

function markLampShadowsDirty() {
    propState.shadowDirty = true;
    propState.shadowRefreshTimer = 0;
}

function updateActiveLampShadowCasters(deltaSeconds) {
    propState.shadowRefreshTimer -= deltaSeconds;
    if (!propState.shadowDirty && propState.shadowRefreshTimer > 0) {
        return;
    }

    const forceShadowRefresh = propState.shadowDirty;
    propState.shadowDirty = false;
    propState.shadowRefreshTimer = LAMP_SHADOW_REFRESH_SECONDS;

    const candidates = [];
    const maxDistanceSq = LAMP_SHADOW_MAX_DISTANCE * LAMP_SHADOW_MAX_DISTANCE;
    const playerX = state.playerPosition.x;
    const playerY = state.playerPosition.y;
    const playerZ = state.playerPosition.z;
    const lightPropIds = [];
    for (const [type, ids] of propTypeIndex.entries()) {
        if (!isLightPropType(type) || !ids || ids.size === 0) {
            continue;
        }
        for (const propId of ids) {
            lightPropIds.push(propId);
        }
    }
    if (lightPropIds.length === 0) {
        return;
    }

    for (const lampId of lightPropIds) {
        const placed = placedProps.get(lampId);
        if (!placed) {
            continue;
        }

        const lampLevel = normalizeLampLevel(placed.lampLevel);
        const dx = placed.x - playerX;
        const dy = placed.y - playerY;
        const dz = placed.z - playerZ;
        const distanceSq = dx * dx + dy * dy + dz * dz;
        const pointLight = placed.node?.userData?.lampPointLight || null;
        if (!pointLight) {
            continue;
        }

        if (placed.node?.visible === false || lampLevel < LAMP_SHADOW_MIN_LEVEL) {
            if (pointLight.castShadow) {
                pointLight.castShadow = false;
                pointLight.shadow.needsUpdate = true;
            }
            continue;
        }

        if (distanceSq <= maxDistanceSq) {
            candidates.push({ placed, pointLight, distanceSq, lampLevel });
        } else if (pointLight.castShadow) {
            pointLight.castShadow = false;
            pointLight.shadow.needsUpdate = true;
        }
    }

    candidates.sort((a, b) => a.distanceSq - b.distanceSq);
    for (let i = 0; i < candidates.length; i += 1) {
        const shouldCast = i < MAX_SHADOW_CASTING_LAMPS;
        const pointLight = candidates[i].pointLight;
        if (pointLight.castShadow !== shouldCast) {
            pointLight.castShadow = shouldCast;
            pointLight.shadow.needsUpdate = true;
        } else if (shouldCast && forceShadowRefresh) {
            pointLight.shadow.needsUpdate = true;
        }
    }
}

function allocateNextPropId() {
    const id = `prop-${propState.nextId}`;
    propState.nextId += 1;
    return id;
}

function bumpNextPropIdFromValue(propId) {
    const numericPart = Number(String(propId || "").replace(/^prop-/, ""));
    if (Number.isFinite(numericPart) && numericPart >= propState.nextId) {
        propState.nextId = numericPart + 1;
    }
}

function normalizePropEntry(rawEntry, fallbackId = "") {
    const id = String(rawEntry?.id || fallbackId || "");
    const propType = String(rawEntry?.propType || "");
    const x = Number(rawEntry?.x);
    const y = Number(rawEntry?.y);
    const z = Number(rawEntry?.z);
    const yawRaw = Number(rawEntry?.yaw);
    const yaw = Number.isFinite(yawRaw) ? snapYawToStep(yawRaw) : 0;
    if (!id || !VALID_PROP_TYPES.has(propType) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(yaw)) {
        if (id && propType && !VALID_PROP_TYPES.has(propType)) {
            warnUnknownPropType(propType, "normalizePropEntry");
        }
        return null;
    }

    if (!inWorldBounds(Math.floor(x), Math.floor(y), Math.floor(z))) {
        return null;
    }

    const normalized = {
        id,
        propType,
        x,
        y,
        z,
        yaw
    };

    if (isLightPropType(propType)) {
        normalized.lampLevel = normalizeLampLevel(rawEntry?.lampLevel);
    }

    return normalized;
}

function serializePropForCloud(rawEntry, fallbackId = "") {
    const normalized = normalizePropEntry(rawEntry, fallbackId);
    if (!normalized) {
        return null;
    }

    const serialized = {
        propType: normalized.propType,
        x: normalized.x,
        y: normalized.y,
        z: normalized.z,
        yaw: normalized.yaw
    };

    if (isLightPropType(normalized.propType)) {
        serialized.lampLevel = normalizeLampLevel(normalized.lampLevel);
    }

    return serialized;
}

function registerPropNode(node, propId) {
    node.userData.propId = propId;
    node.traverse((child) => {
        if (!child.isMesh) {
            return;
        }
        child.userData.propId = propId;
    });
}

function disposePropNodeResources(node) {
    if (!node) {
        return;
    }

    node.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        const material = child.material;
        if (Array.isArray(material)) {
            for (const item of material) {
                if (item?.userData?.disposeOnRemove) {
                    item.dispose?.();
                }
            }
            return;
        }

        if (material?.userData?.disposeOnRemove) {
            material.dispose?.();
        }
    });
}

function addPlacedPropEntry(entry, origin = "local") {
    const generatedId = entry?.id ? String(entry.id) : allocateNextPropId();
    const normalized = normalizePropEntry({
        ...entry,
        id: generatedId
    }, generatedId);
    if (!normalized) {
        return null;
    }

    const { id, propType, x, y, z, yaw, lampLevel } = normalized;
    const existing = placedProps.get(id);
    if (!existing && origin === "local" && placedProps.size >= MAX_PLACED_PROPS) {
        showToast("Limite de objetos alcanzado", "warning", 1100);
        return null;
    }

    if (existing) {
        if (existing.propType !== propType) {
            removePlacedPropEntry(id, "remote", false);
        } else {
            unindexPlacedProp(existing);
            existing.x = x;
            existing.y = y;
            existing.z = z;
            existing.yaw = yaw;
            existing.node.position.set(x, y, z);
            existing.node.rotation.y = yaw;
            refreshSinglePropVisibility(existing);
            indexPlacedProp(existing);
            if (isLightPropType(propType)) {
                applyLampVisualState(existing, lampLevel, false);
            } else {
                existing.lampLevel = 0;
            }

            bumpNextPropIdFromValue(id);
            markLampShadowsDirty();
            propState.cullingDirty = true;
            if (origin === "local") {
                scheduleWorldSave();
                publishPropUpsert(id);
            }
            return id;
        }
    }

    const node = createPlacedPropNode(propType);
    node.position.set(x, y, z);
    node.rotation.y = yaw;
    registerPropNode(node, id);
    propsRoot.add(node);

    const placedEntry = {
        id,
        propType,
        x,
        y,
        z,
        yaw,
        lampLevel,
        chunkKey: chunkKey(worldToChunkCoord(x), worldToChunkCoord(z)),
        node
    };
    placedProps.set(id, placedEntry);
    refreshSinglePropVisibility(placedEntry);
    indexPlacedProp(placedEntry);

    if (isLightPropType(propType)) {
        applyLampVisualState(placedEntry, placedEntry.lampLevel, false);
    }

    bumpNextPropIdFromValue(id);
    markLampShadowsDirty();
    propState.cullingDirty = true;
    if (origin === "local") {
        scheduleWorldSave();
        publishPropUpsert(id);
    }

    return id;
}

function removePlacedPropEntry(propId, origin = "local", showFeedback = false) {
    const id = String(propId || "");
    if (!id) {
        return false;
    }

    const placed = placedProps.get(id);
    if (!placed) {
        return false;
    }

    const supportY = getPlacedPropSupportY(placed);
    const supportBounds = getPlacedPropBounds(placed, 0.02);
    const dependentIds = [];
    if (supportBounds) {
        const nearbyIds = new Set();
        fillNearbyPropIds(
            supportBounds.minX,
            supportBounds.maxX,
            supportY - 0.12,
            supportY + 0.12,
            supportBounds.minZ,
            supportBounds.maxZ,
            nearbyIds
        );
        for (const otherId of nearbyIds) {
            const other = placedProps.get(otherId);
            if (!other || other.id === id) {
                continue;
            }
            if (Math.abs(other.y - supportY) > 0.12) {
                continue;
            }
            if (
                other.x > supportBounds.minX
                && other.x < supportBounds.maxX
                && other.z > supportBounds.minZ
                && other.z < supportBounds.maxZ
            ) {
                dependentIds.push(other.id);
            }
        }
    }

    disposePropNodeResources(placed.node);
    propsRoot.remove(placed.node);
    unindexPlacedProp(placed);
    placedProps.delete(id);
    markLampShadowsDirty();
    propState.cullingDirty = true;

    if (origin === "local") {
        scheduleWorldSave();
        publishPropRemoval(id);
    }

    if (showFeedback) {
        showToast(`${getPropLabel(placed.propType)} guardado al inventario`, "success", 950);
    }

    for (const dependentId of dependentIds) {
        removePlacedPropEntry(dependentId, origin, false);
    }

    return true;
}

function clearPlacedProps() {
    for (const propId of Array.from(placedProps.keys())) {
        removePlacedPropEntry(propId, "remote", false);
    }
    markLampShadowsDirty();
}

function removePropsSupportedByBlock(x, y, z, origin = "local") {
    const supportX = Math.floor(x);
    const supportY = Math.floor(y);
    const supportZ = Math.floor(z);

    const nearbyIds = queryNearbyPropIdsReusable(
        supportX,
        supportX + 1,
        supportY + 0.5,
        supportY + 2.2,
        supportZ,
        supportZ + 1
    );

    for (const propId of Array.from(nearbyIds)) {
        const prop = placedProps.get(propId);
        if (!prop) {
            continue;
        }

        const propSupportX = Math.floor(prop.x);
        const propSupportY = Math.floor(prop.y) - 1;
        const propSupportZ = Math.floor(prop.z);

        if (propSupportX === supportX && propSupportY === supportY && propSupportZ === supportZ) {
            removePlacedPropEntry(propId, origin, false);
        }
    }
}

function isSunflowerGroundBlock(id) {
    return id === BLOCK.GRASS || id === BLOCK.DIRT || id === BLOCK.SAND;
}

function sampleSurfaceForSunflower(worldX, worldZ) {
    const x = Math.floor(worldX);
    const z = Math.floor(worldZ);

    for (let y = WORLD_MAX_Y - 2; y >= 1; y -= 1) {
        const groundId = getBlock(x, y, z);
        if (groundId === BLOCK.AIR || groundId === BLOCK.WATER || groundId === BLOCK.LEAVES) {
            continue;
        }

        if (!isSunflowerGroundBlock(groundId)) {
            return null;
        }

        if (getBlock(x, y + 1, z) !== BLOCK.AIR || getBlock(x, y + 2, z) !== BLOCK.AIR) {
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

function createSunflowerNode() {
    const root = new THREE.Group();
    root.add(createDetailPart({ x: 0.08, y: 0.76, z: 0.08 }, { x: 0, y: 0.38, z: 0 }, 0x4a963f));
    root.add(createDetailPart({ x: 0.3, y: 0.06, z: 0.16 }, { x: 0.12, y: 0.34, z: 0 }, 0x4d9e42, { y: 0.5 }));
    root.add(createDetailPart({ x: 0.3, y: 0.06, z: 0.16 }, { x: -0.12, y: 0.52, z: 0 }, 0x4d9e42, { y: -0.5 }));
    root.add(createDetailPart({ x: 0.2, y: 0.2, z: 0.07 }, { x: 0, y: 0.86, z: 0.1 }, 0xf4ce4c));
    root.add(createDetailPart({ x: 0.2, y: 0.2, z: 0.07 }, { x: 0, y: 0.86, z: -0.1 }, 0xf4ce4c));
    root.add(createDetailPart({ x: 0.07, y: 0.2, z: 0.2 }, { x: 0.1, y: 0.86, z: 0 }, 0xf4ce4c));
    root.add(createDetailPart({ x: 0.07, y: 0.2, z: 0.2 }, { x: -0.1, y: 0.86, z: 0 }, 0xf4ce4c));
    root.add(createDetailPart({ x: 0.16, y: 0.16, z: 0.16 }, { x: 0, y: 0.86, z: 0 }, 0x57351f));
    return root;
}

function resetSunflowerSpawnTimer() {
    floraState.spawnTimer = randomInRange(SUNFLOWER_SPAWN_INTERVAL_MIN, SUNFLOWER_SPAWN_INTERVAL_MAX);
}

function removeSunflowerEntity(flowerId) {
    const sunflower = floraState.sunflowers.get(flowerId);
    if (!sunflower) {
        return false;
    }

    sunflowerRoot.remove(sunflower.node);
    floraState.sunflowers.delete(flowerId);
    return true;
}

function clearSunflowers() {
    for (const flowerId of Array.from(floraState.sunflowers.keys())) {
        removeSunflowerEntity(flowerId);
    }
}

function harvestSunflower(flowerId) {
    if (!removeSunflowerEntity(flowerId)) {
        return false;
    }

    addSunflowerCurrency(1, "Girasol cosechado");
    return true;
}

function trySpawnSunflowerNearPlayer(force = false) {
    if (!force && !state.worldStarted) {
        return false;
    }

    if (floraState.sunflowers.size >= SUNFLOWER_MAX_COUNT) {
        return false;
    }

    const searchRadius = Math.max(24, state.chunkRadius * CHUNK_SIZE * 2.2);

    for (let attempt = 0; attempt < SUNFLOWER_SPAWN_ATTEMPTS; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInRange(SUNFLOWER_MIN_PLAYER_DISTANCE + 3, searchRadius);
        const candidateX = state.playerPosition.x + Math.cos(angle) * distance;
        const candidateZ = state.playerPosition.z + Math.sin(angle) * distance;
        const spawnPoint = sampleSurfaceForSunflower(candidateX, candidateZ);
        if (!spawnPoint) {
            continue;
        }

        const spawnChunk = chunkKey(worldToChunkCoord(spawnPoint.x), worldToChunkCoord(spawnPoint.z));
        if (!chunkMap.has(spawnChunk)) {
            continue;
        }

        let tooClose = false;
        for (const sunflower of floraState.sunflowers.values()) {
            const dx = spawnPoint.x - sunflower.x;
            const dz = spawnPoint.z - sunflower.z;
            if (dx * dx + dz * dz < SUNFLOWER_MIN_FLOWER_DISTANCE * SUNFLOWER_MIN_FLOWER_DISTANCE) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) {
            continue;
        }

        const node = createSunflowerNode();
        node.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        node.rotation.y = Math.random() * Math.PI * 2;
        const id = `sunflower-${floraState.nextId}`;
        floraState.nextId += 1;

        node.userData.sunflowerId = id;
        node.traverse((child) => {
            if (child.isMesh) {
                child.userData.sunflowerId = id;
            }
        });

        sunflowerRoot.add(node);
        floraState.sunflowers.set(id, {
            id,
            node,
            x: spawnPoint.x,
            y: spawnPoint.y,
            z: spawnPoint.z,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: randomInRange(1.2, 2.2)
        });
        return true;
    }

    return false;
}

function initSunflowers() {
    clearSunflowers();
    floraState.nextId = 1;
    resetSunflowerSpawnTimer();

    const initialCount = randomIntInclusive(8, 16);
    for (let i = 0; i < initialCount; i += 1) {
        if (!trySpawnSunflowerNearPlayer(true)) {
            break;
        }
    }
}

function updateSunflowers(deltaSeconds) {
    if (!state.worldReady) {
        return;
    }

    floraState.spawnTimer -= deltaSeconds;
    if (floraState.spawnTimer <= 0) {
        resetSunflowerSpawnTimer();
        const occupancy = floraState.sunflowers.size / SUNFLOWER_MAX_COUNT;
        const spawnChance = Math.max(0.06, 0.28 - occupancy * 0.24);
        if (Math.random() < spawnChance) {
            const bursts = 1;
            for (let i = 0; i < bursts; i += 1) {
                if (!trySpawnSunflowerNearPlayer(false)) {
                    break;
                }
            }
        }
    }

    for (const [flowerId, flower] of Array.from(floraState.sunflowers.entries())) {
        const dx = flower.x - state.playerPosition.x;
        const dz = flower.z - state.playerPosition.z;
        if (dx * dx + dz * dz > SUNFLOWER_DESPAWN_DISTANCE * SUNFLOWER_DESPAWN_DISTANCE) {
            removeSunflowerEntity(flowerId);
            continue;
        }

        const isVisibleInLoadedChunk = isWorldPositionChunkLoaded(flower.x, flower.z);
        flower.node.visible = isVisibleInLoadedChunk;
        if (!isVisibleInLoadedChunk) {
            continue;
        }

        flower.swayPhase += deltaSeconds * flower.swaySpeed;
        flower.node.rotation.z = Math.sin(flower.swayPhase) * 0.06;
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

function warnUnknownBlockId(blockId, context = "runtime") {
    const numericId = Number(blockId);
    if (!Number.isInteger(numericId) || warnedUnknownBlockIds.has(numericId)) {
        return;
    }

    warnedUnknownBlockIds.add(numericId);
    console.warn(`[BlockRegistry] bloque desconocido (${numericId}) en ${context}. Se ignora por seguridad.`);
}

function warnUnknownPropType(propType, context = "runtime") {
    const normalized = String(propType || "");
    if (!normalized || warnedUnknownPropTypes.has(normalized)) {
        return;
    }

    warnedUnknownPropTypes.add(normalized);
    console.warn(`[PropRegistry] prop desconocido (${normalized}) en ${context}. Se ignora por seguridad.`);
}

function logRegistryValidationIssues() {
    if (!Array.isArray(registryValidationIssues) || registryValidationIssues.length === 0) {
        return;
    }

    console.warn("[Registry] Se detectaron inconsistencias de contenido:");
    for (const issue of registryValidationIssues) {
        console.warn(`- ${issue}`);
    }
}

function isValidBlockId(id) {
    return isValidBlockIdFromRegistry(id);
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

function getTerrainFingerprint() {
    const samples = TERRAIN_SYNC_SAMPLE_POINTS.map(([x, z]) => `${x},${z}:${getColumnInfo(x, z).height}`);
    return `${WORLD_SEED}|${samples.join(";")}`;
}

function getMedian(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) * 0.5;
    }

    return sorted[middle];
}

function computeTerrainReacomodoShift(edits, props = []) {
    const solidYByColumn = new Map();
    for (const item of edits) {
        if (!Array.isArray(item) || item.length !== 2) {
            continue;
        }

        const key = String(item[0] || "");
        const id = Number(item[1]);
        const parsed = parseBlockKey(key);
        if (!parsed) {
            continue;
        }
        if (!isValidBlockId(id)) {
            warnUnknownBlockId(id, "computeTerrainReacomodoShift");
            continue;
        }
        if (!isSolidBlock(id)) {
            continue;
        }

        const columnKey = `${parsed.x}|${parsed.z}`;
        const values = solidYByColumn.get(columnKey) || [];
        values.push(parsed.y);
        if (!solidYByColumn.has(columnKey)) {
            solidYByColumn.set(columnKey, values);
        }
    }

    const deltas = [];
    for (const [columnKey, values] of solidYByColumn.entries()) {
        const [xText, zText] = columnKey.split("|");
        const x = Number(xText);
        const z = Number(zText);
        if (!Number.isFinite(x) || !Number.isFinite(z)) {
            continue;
        }

        const targetY = getColumnInfo(x, z).height + 1;
        let nearestY = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const rawY of values) {
            const y = Number(rawY);
            if (!Number.isFinite(y)) {
                continue;
            }
            const distance = Math.abs(y - targetY);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestY = y;
            }
        }
        if (nearestY === null) {
            continue;
        }

        deltas.push(nearestY - targetY);
    }

    if (deltas.length < TERRAIN_REACOMODO_MIN_COLUMNS) {
        for (const prop of props) {
            const x = Math.floor(Number(prop?.x));
            const y = Math.floor(Number(prop?.y));
            const z = Math.floor(Number(prop?.z));
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                continue;
            }

            const surfaceY = getColumnInfo(x, z).height;
            deltas.push(y - (surfaceY + 1));
        }
    }

    if (deltas.length < TERRAIN_REACOMODO_MIN_COLUMNS) {
        return 0;
    }

    const sorted = [...deltas].sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.2);
    const core = sorted.slice(trim, sorted.length - trim);
    const median = getMedian(core.length > 0 ? core : sorted);
    let shift = clampInt(-median, -TERRAIN_REACOMODO_MAX_SHIFT, TERRAIN_REACOMODO_MAX_SHIFT);
    const safetyIndex = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * 0.3)));
    const safetyDelta = sorted[safetyIndex];
    const minSafeShift = clampInt(Math.ceil(-safetyDelta), -TERRAIN_REACOMODO_MAX_SHIFT, TERRAIN_REACOMODO_MAX_SHIFT);
    if (shift < minSafeShift) {
        shift = minSafeShift;
    }

    if (Math.abs(shift) < TERRAIN_REACOMODO_MIN_ABS_SHIFT) {
        return 0;
    }

    return shift;
}

function remapEditsWithVerticalShift(edits, shiftY) {
    if (!Number.isFinite(shiftY) || shiftY === 0) {
        return edits
            .filter((item) => Array.isArray(item) && item.length === 2)
            .map((item) => [String(item[0] || ""), Number(item[1])]);
    }

    const next = new Map();
    for (const item of edits) {
        if (!Array.isArray(item) || item.length !== 2) {
            continue;
        }

        const key = String(item[0] || "");
        const id = Number(item[1]);
        const parsed = parseBlockKey(key);
        if (!parsed) {
            continue;
        }
        if (!isValidBlockId(id)) {
            warnUnknownBlockId(id, "remapEditsWithVerticalShift");
            continue;
        }

        const y = parsed.y + shiftY;
        if (!inWorldBounds(parsed.x, y, parsed.z)) {
            continue;
        }

        const nextKey = blockKey(parsed.x, y, parsed.z);
        const procedural = getProceduralBlock(parsed.x, y, parsed.z);
        if (id === procedural) {
            next.delete(nextKey);
        } else {
            next.set(nextKey, id);
        }
    }

    return Array.from(next.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function remapPropsWithVerticalShift(props, shiftY) {
    if (!Number.isFinite(shiftY) || shiftY === 0) {
        return Array.isArray(props) ? props : [];
    }

    const next = [];
    for (const rawProp of Array.isArray(props) ? props : []) {
        const x = Number(rawProp?.x);
        const y = Number(rawProp?.y) + shiftY;
        const z = Number(rawProp?.z);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            continue;
        }

        if (!inWorldBounds(Math.floor(x), Math.floor(y), Math.floor(z))) {
            continue;
        }

        next.push({
            ...rawProp,
            x,
            y,
            z
        });
    }

    return next;
}

function applyTerrainReacomodoToPayload(edits, props, previousFingerprint, showFeedback = false) {
    const currentFingerprint = getTerrainFingerprint();
    const sourceEdits = Array.isArray(edits) ? edits : [];
    const sourceProps = Array.isArray(props) ? props : [];
    const fingerprintChanged = String(previousFingerprint || "") !== currentFingerprint;

    if (!fingerprintChanged) {
        return {
            edits: sourceEdits,
            props: sourceProps,
            fingerprint: currentFingerprint,
            shiftY: 0,
            migrated: false
        };
    }

    const shiftY = computeTerrainReacomodoShift(sourceEdits, sourceProps);
    if (!shiftY) {
        return {
            edits: sourceEdits,
            props: sourceProps,
            fingerprint: currentFingerprint,
            shiftY: 0,
            migrated: false
        };
    }

    const migratedEdits = remapEditsWithVerticalShift(sourceEdits, shiftY);
    const migratedProps = remapPropsWithVerticalShift(sourceProps, shiftY);
    if (showFeedback) {
        const prefix = shiftY > 0 ? "+" : "";
        showToast(`Terreno actualizado: reacomodo vertical ${prefix}${shiftY}`, "info", 2600);
    }

    return {
        edits: migratedEdits,
        props: migratedProps,
        fingerprint: currentFingerprint,
        shiftY,
        migrated: true
    };
}

function collectChunkEditEntriesFromPayload(chunksPayload) {
    const entries = [];
    for (const [, chunk] of Object.entries(chunksPayload || {})) {
        const edits = chunk?.edits;
        if (!edits || typeof edits !== "object") {
            continue;
        }

        for (const [key, value] of Object.entries(edits)) {
            const parsed = parseBlockKey(key);
            const id = Number(value);
            if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z)) {
                continue;
            }
            if (!isValidBlockId(id)) {
                warnUnknownBlockId(id, "collectChunkEditEntriesFromPayload");
                continue;
            }
            entries.push([key, id]);
        }
    }

    return entries;
}

function collectPropEntriesFromPayload(propsPayload) {
    const entries = [];
    for (const [propId, rawProp] of Object.entries(propsPayload || {})) {
        const normalized = normalizePropEntry({
            ...(rawProp || {}),
            id: propId
        }, propId);
        if (!normalized) {
            continue;
        }
        entries.push(normalized);
    }

    return entries;
}

function buildChunkUpdatePatch(previousEntries, nextEntries) {
    const patch = {};
    const previous = new Map(previousEntries);
    const next = new Map(nextEntries);

    for (const [key, previousId] of previous.entries()) {
        const parsed = parseBlockKey(key);
        if (!parsed) {
            continue;
        }

        const nextId = next.get(key);
        if (nextId === previousId) {
            continue;
        }

        const ck = chunkKey(worldToChunkCoord(parsed.x), worldToChunkCoord(parsed.z));
        patch[`chunks/${ck}/edits/${key}`] = null;
    }

    for (const [key, nextId] of next.entries()) {
        const parsed = parseBlockKey(key);
        if (!parsed) {
            continue;
        }

        const previousId = previous.get(key);
        if (previousId === nextId) {
            continue;
        }

        const ck = chunkKey(worldToChunkCoord(parsed.x), worldToChunkCoord(parsed.z));
        patch[`chunks/${ck}/edits/${key}`] = nextId;
    }

    return patch;
}

function buildPropUpdatePatch(previousProps, nextProps) {
    const patch = {};
    const previousById = new Map();
    const nextById = new Map();

    for (const prop of Array.isArray(previousProps) ? previousProps : []) {
        const normalized = normalizePropEntry(prop, prop?.id);
        if (normalized) {
            previousById.set(normalized.id, normalized);
        }
    }

    for (const prop of Array.isArray(nextProps) ? nextProps : []) {
        const normalized = normalizePropEntry(prop, prop?.id);
        if (normalized) {
            nextById.set(normalized.id, normalized);
        }
    }

    for (const propId of previousById.keys()) {
        if (!nextById.has(propId)) {
            patch[`props/${propId}`] = null;
        }
    }

    for (const [propId, prop] of nextById.entries()) {
        const serialized = serializePropForCloud(prop, propId);
        if (serialized) {
            patch[`props/${propId}`] = serialized;
        }
    }

    return patch;
}

function serializePlacedPropsForSave() {
    return Array.from(placedProps.values())
        .map((prop) => normalizePropEntry(prop, prop?.id))
        .filter((prop) => Boolean(prop));
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
            const props = serializePlacedPropsForSave();
            if (props.length === 0) {
                window.localStorage.removeItem(WORLD_SAVE_KEY);
            } else {
                const payload = {
                    version: WORLD_SAVE_VERSION,
                    seed: WORLD_SEED,
                    terrainFingerprint: getTerrainFingerprint(),
                    savedAt: Date.now(),
                    edits: [],
                    props
                };
                window.localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(payload));
            }
        } else {
            const props = serializePlacedPropsForSave();
            const payload = {
                version: WORLD_SAVE_VERSION,
                seed: WORLD_SEED,
                terrainFingerprint: getTerrainFingerprint(),
                savedAt: Date.now(),
                edits,
                props
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
        const rawEdits = Array.isArray(payload?.edits) ? payload.edits : [];
        const rawProps = Array.isArray(payload?.props) ? payload.props : [];
        const reacomodo = applyTerrainReacomodoToPayload(rawEdits, rawProps, payload?.terrainFingerprint, true);
        const edits = reacomodo.edits;
        const props = reacomodo.props;

        editedBlocks.clear();
        clearPlacedProps();
        propState.nextId = 1;
        let loaded = 0;

        for (const item of edits) {
            if (!Array.isArray(item) || item.length !== 2) {
                continue;
            }

            const key = String(item[0] || "");
            const id = Number(item[1]);
            const parsed = parseBlockKey(key);

            if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z)) {
                continue;
            }
            if (!isValidBlockId(id)) {
                warnUnknownBlockId(id, "loadWorldFromStorage");
                continue;
            }

            editedBlocks.set(key, id);
            loaded += 1;
        }

        for (const rawProp of props) {
            const id = addPlacedPropEntry(rawProp, "remote");
            if (!id) {
                continue;
            }

            const numericPart = Number(String(id).replace(/^prop-/, ""));
            if (Number.isFinite(numericPart) && numericPart >= propState.nextId) {
                propState.nextId = numericPart + 1;
            }
        }

        const previousFingerprint = String(payload?.terrainFingerprint || "");
        if (previousFingerprint !== reacomodo.fingerprint || reacomodo.migrated) {
            try {
                const refreshedPayload = {
                    version: WORLD_SAVE_VERSION,
                    seed: WORLD_SEED,
                    terrainFingerprint: reacomodo.fingerprint,
                    savedAt: Date.now(),
                    edits,
                    props
                };
                window.localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(refreshedPayload));
            } catch (error) {
            }
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

function buildStylizedMinecraftAvatar(root, materials, style = "default") {
    const isFemale = style === "valentina";
    const isMauricio = style === "mauricio";

    const bodyWidth = isFemale ? 0.56 : 0.62;
    const bodyHeight = isFemale ? 0.72 : 0.76;
    const bodyDepth = 0.32;
    const legWidth = 0.24;
    const legHeight = 0.78;
    const legDepth = 0.26;
    const armWidth = 0.2;
    const armHeight = 0.66;
    const armDepth = 0.22;
    const headSize = 0.5;

    const hipY = legHeight;
    const torsoCenterY = hipY + bodyHeight * 0.5;
    const shoulderY = hipY + bodyHeight - 0.03;
    const headCenterY = hipY + bodyHeight + headSize * 0.52;
    const shoulderOffsetX = bodyWidth * 0.5 + armWidth * 0.5 + 0.02;
    const legOffsetX = legWidth * 0.55;

    const rig = {
        leftArmPivot: null,
        rightArmPivot: null,
        leftLegPivot: null,
        rightLegPivot: null,
        body: null,
        head: null,
        bodyBaseY: 0,
        headBaseY: 0,
        walkPhase: Math.random() * Math.PI * 2,
        walkBlend: 0
    };

    rig.body = addAvatarPart(
        root,
        { x: bodyWidth, y: bodyHeight, z: bodyDepth },
        { x: 0, y: torsoCenterY, z: 0 },
        materials.cloth
    );
    addAvatarPart(
        root,
        { x: 0.22, y: 0.1, z: 0.18 },
        { x: 0, y: hipY + bodyHeight - 0.03, z: 0.06 },
        materials.skin
    );
    rig.head = addAvatarPart(
        root,
        { x: headSize, y: headSize, z: headSize },
        { x: 0, y: headCenterY, z: 0 },
        materials.skin
    );

    if (isFemale) {
        addAvatarPart(root, { x: 0.54, y: 0.2, z: 0.54 }, { x: 0, y: headCenterY + 0.15, z: 0 }, materials.hair);
        addAvatarPart(root, { x: 0.56, y: 0.58, z: 0.2 }, { x: 0, y: headCenterY - 0.07, z: -0.18 }, materials.hair);
        addAvatarPart(root, { x: 0.14, y: 0.44, z: 0.18 }, { x: -0.22, y: headCenterY - 0.05, z: -0.04 }, materials.hair);
        addAvatarPart(root, { x: 0.14, y: 0.44, z: 0.18 }, { x: 0.22, y: headCenterY - 0.05, z: -0.04 }, materials.hair);
        addAvatarPart(root, { x: bodyWidth + 0.02, y: 0.1, z: bodyDepth + 0.02 }, { x: 0, y: torsoCenterY + 0.22, z: 0 }, materials.detailAccent);
        addAvatarPart(root, { x: 0.08, y: 0.04, z: 0.04 }, { x: -0.1, y: headCenterY + 0.03, z: 0.26 }, materials.detailDark);
        addAvatarPart(root, { x: 0.08, y: 0.04, z: 0.04 }, { x: 0.1, y: headCenterY + 0.03, z: 0.26 }, materials.detailDark);
        addAvatarPart(root, { x: 0.1, y: 0.03, z: 0.03 }, { x: 0, y: headCenterY - 0.1, z: 0.26 }, materials.detailAccent);
    } else {
        addAvatarPart(root, { x: 0.54, y: 0.24, z: 0.54 }, { x: 0, y: headCenterY + 0.14, z: 0 }, materials.hair);
        addAvatarPart(root, { x: 0.52, y: 0.26, z: 0.14 }, { x: 0, y: headCenterY + 0.02, z: 0.2 }, materials.hair);
        addAvatarPart(root, { x: 0.14, y: 0.24, z: 0.14 }, { x: -0.23, y: headCenterY + 0.02, z: 0.06 }, materials.hair);
        addAvatarPart(root, { x: 0.14, y: 0.24, z: 0.14 }, { x: 0.23, y: headCenterY + 0.02, z: 0.06 }, materials.hair);
        if (isMauricio) {
            addAvatarPart(root, { x: 0.46, y: 0.18, z: 0.05 }, { x: 0, y: headCenterY + 0.03, z: 0.27 }, materials.detailDark);
            addAvatarPart(root, { x: 0.16, y: 0.11, z: 0.03 }, { x: -0.12, y: headCenterY + 0.03, z: 0.29 }, materials.lens);
            addAvatarPart(root, { x: 0.16, y: 0.11, z: 0.03 }, { x: 0.12, y: headCenterY + 0.03, z: 0.29 }, materials.lens);
            addAvatarPart(root, { x: 0.22, y: 0.05, z: 0.05 }, { x: 0, y: headCenterY - 0.09, z: 0.26 }, materials.detailDark);
            addAvatarPart(root, { x: 0.12, y: 0.06, z: 0.05 }, { x: 0, y: headCenterY - 0.18, z: 0.25 }, materials.detailDark);
        } else {
            addAvatarPart(root, { x: 0.08, y: 0.04, z: 0.04 }, { x: -0.1, y: headCenterY + 0.03, z: 0.26 }, materials.detailDark);
            addAvatarPart(root, { x: 0.08, y: 0.04, z: 0.04 }, { x: 0.1, y: headCenterY + 0.03, z: 0.26 }, materials.detailDark);
        }
    }

    const buildLeg = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * legOffsetX, hipY, 0);
        root.add(pivot);
        addAvatarPart(
            pivot,
            { x: legWidth, y: legHeight, z: legDepth },
            { x: 0, y: -legHeight * 0.5, z: 0 },
            materials.pants
        );
        addAvatarPart(
            pivot,
            { x: legWidth + 0.08, y: 0.14, z: legDepth + 0.1 },
            { x: 0, y: -legHeight - 0.05, z: 0.04 },
            materials.shoe
        );
        addAvatarPart(
            pivot,
            { x: legWidth + 0.07, y: 0.05, z: legDepth + 0.09 },
            { x: 0, y: -legHeight - 0.12, z: 0.05 },
            materials.sole
        );
        return pivot;
    };

    const buildArm = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * shoulderOffsetX, shoulderY, 0);
        root.add(pivot);
        addAvatarPart(
            pivot,
            { x: armWidth, y: armHeight, z: armDepth },
            { x: 0, y: -armHeight * 0.5, z: 0 },
            materials.skin
        );
        addAvatarPart(
            pivot,
            { x: armWidth + 0.01, y: 0.24, z: armDepth + 0.01 },
            { x: 0, y: -0.13, z: 0 },
            materials.cloth
        );
        return pivot;
    };

    rig.leftLegPivot = buildLeg(-1);
    rig.rightLegPivot = buildLeg(1);
    rig.leftArmPivot = buildArm(-1);
    rig.rightArmPivot = buildArm(1);

    rig.bodyBaseY = rig.body.position.y;
    rig.headBaseY = rig.head.position.y;
    root.userData.walkRig = rig;
    return rig;
}

function updateAvatarWalkAnimation(avatarRoot, movementSpeed, deltaSeconds) {
    const rig = avatarRoot?.userData?.walkRig;
    if (!rig) {
        return;
    }

    const normalizedSpeed = THREE.MathUtils.clamp((Number(movementSpeed) || 0) / BASE_SPEED, 0, 1.5);
    const targetBlend = normalizedSpeed > AVATAR_WALK_MIN_SPEED ? Math.min(1, normalizedSpeed) : 0;
    const blendStep = Math.min(1, deltaSeconds * AVATAR_WALK_BLEND_SPEED);
    rig.walkBlend = THREE.MathUtils.lerp(rig.walkBlend, targetBlend, blendStep);

    if (rig.walkBlend > 0.001) {
        rig.walkPhase += deltaSeconds * (5.2 + normalizedSpeed * 8.4);
    }

    const wave = Math.sin(rig.walkPhase);
    const legSwing = wave * AVATAR_WALK_SWING * rig.walkBlend;
    const armSwing = -wave * (AVATAR_WALK_SWING * 0.82) * rig.walkBlend;

    rig.leftLegPivot.rotation.x = legSwing;
    rig.rightLegPivot.rotation.x = -legSwing;
    rig.leftArmPivot.rotation.x = armSwing;
    rig.rightArmPivot.rotation.x = -armSwing;

    const bob = Math.abs(Math.sin(rig.walkPhase * 2)) * 0.035 * rig.walkBlend;
    if (rig.body) {
        rig.body.position.y = rig.bodyBaseY + bob * 0.35;
    }
    if (rig.head) {
        rig.head.position.y = rig.headBaseY + bob * 0.48;
    }
}

function clearAvatarRoot(root) {
    if (!root) {
        return;
    }

    while (root.children.length > 0) {
        const child = root.children[0];
        root.remove(child);

        if (!child || !child.isObject3D) {
            continue;
        }

        child.traverse((node) => {
            if (!node.isMesh) {
                return;
            }

            node.geometry?.dispose?.();
            if (Array.isArray(node.material)) {
                node.material.forEach((material) => material?.dispose?.());
            } else {
                node.material?.dispose?.();
            }
        });
    }
}

function normalizeAvatarHeight(root, targetHeight = AVATAR_VOXEL_TARGET_HEIGHT, alignGround = true) {
    if (!root) {
        return;
    }

    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    if (!Number.isFinite(bounds.min.y) || !Number.isFinite(bounds.max.y)) {
        return;
    }

    const currentHeight = bounds.max.y - bounds.min.y;
    if (!(currentHeight > 0.0001)) {
        return;
    }

    const scaleFactor = targetHeight / currentHeight;
    root.scale.multiplyScalar(scaleFactor);
    root.updateMatrixWorld(true);

    if (!alignGround) {
        return;
    }

    const groundedBounds = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(groundedBounds.min.y)) {
        root.position.y -= groundedBounds.min.y;
    }
}
function buildMauricioAvatar(root, materials) {
    buildStylizedMinecraftAvatar(root, materials, "mauricio");
}

function buildValentinaAvatar(root, materials) {
    buildStylizedMinecraftAvatar(root, materials, "valentina");
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
                cloth: 0xe7d4e9,
                pants: 0x3a2e45,
                shoe: 0x2f2732,
                sole: 0xede7e6,
                hair: 0x2b211d,
                detailDark: 0x1c1520,
                detailAccent: 0xc078b3,
                lens: 0xb487cf
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
        normalizeAvatarHeight(avatarRoot);
        return avatarRoot;
    }

    if (preset.style === "valentina") {
        buildValentinaAvatar(avatarRoot, materials);
        normalizeAvatarHeight(avatarRoot);
        return avatarRoot;
    }

    buildStylizedMinecraftAvatar(avatarRoot, materials, "default");
    normalizeAvatarHeight(avatarRoot);
    return avatarRoot;
}

function getAvatarModelKey(payload) {
    const profileLabel = normalizeProfileLabel(payload?.label || payload?.displayName || "Invitado");
    return `${profileLabel}|${String(payload?.color || "")}`;
}

function ensureLocalAvatarPreviewModel() {
    const payload = multiplayer.profile || resolvePlayerIdentity();
    const modelKey = getAvatarModelKey(payload);

    if (localAvatarPreviewState.modelKey === modelKey && localAvatarPreviewRoot.children.length > 0) {
        return;
    }

    clearAvatarRoot(localAvatarPreviewRoot);
    localAvatarPreviewRoot.add(createBlockyAvatar(payload));
    localAvatarPreviewState.modelKey = modelKey;
}

function createRemotePlayerNode(playerId, payload) {
    const group = new THREE.Group();
    const avatarModel = createBlockyAvatar(payload || {});
    group.add(avatarModel);

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
    group.rotation.y = resolveRemoteAvatarYaw(payload.yaw);

    remotePlayersRoot.add(group);

    return {
        id: playerId,
        group,
        avatarModel,
        targetPosition: group.position.clone(),
        targetYaw: group.rotation.y,
        nameTag,
        lastSeenAt: Date.now(),
        moveSpeed: 0
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
    node.targetYaw = resolveRemoteAvatarYaw(payload.yaw);
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
        const prevX = node.group.position.x;
        const prevZ = node.group.position.z;
        node.group.position.lerp(node.targetPosition, lerpFactor);

        let yawDelta = node.targetYaw - node.group.rotation.y;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        node.group.rotation.y += yawDelta * lerpFactor;

        const distance = Math.hypot(node.group.position.x - prevX, node.group.position.z - prevZ);
        node.moveSpeed = distance / Math.max(deltaSeconds, 1e-4);
        updateAvatarWalkAnimation(node.avatarModel, node.moveSpeed, deltaSeconds);
    }
}

function getCameraYawForMultiplayer() {
    camera.getWorldDirection(cameraYawScratch);
    cameraYawScratch.y = 0;

    if (cameraYawScratch.lengthSq() < 1e-6) {
        return Number(controls.getObject().rotation.y) || 0;
    }

    cameraYawScratch.normalize();
    return Math.atan2(-cameraYawScratch.x, -cameraYawScratch.z);
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

function flushCloudPropWrites() {
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.refs.propsRootRef) {
        return;
    }

    if (!multiplayer.pendingPropWrites.size) {
        return;
    }

    const updates = {};
    for (const [key, value] of multiplayer.pendingPropWrites.entries()) {
        updates[key] = value;
    }

    multiplayer.pendingPropWrites.clear();
    multiplayer.firebase.dbModule.update(multiplayer.refs.propsRootRef, updates).catch((error) => {
        console.warn("No pude sincronizar cambios de objetos/lamparas (batch)", error);

        for (const [key, value] of Object.entries(updates)) {
            if (!multiplayer.pendingPropWrites.has(key)) {
                multiplayer.pendingPropWrites.set(key, value);
            }
        }

        if (multiplayer.propWriteTimerId === null) {
            multiplayer.propWriteTimerId = window.setTimeout(() => {
                multiplayer.propWriteTimerId = null;
                flushCloudPropWrites();
            }, CLOUD_EDIT_RETRY_MS);
        }
    });
}

function queueCloudPropWrite(propId, value) {
    const key = String(propId || "");
    if (!key) {
        return;
    }

    multiplayer.pendingPropWrites.set(key, value === undefined ? null : value);
    if (multiplayer.propWriteTimerId !== null) {
        return;
    }

    multiplayer.propWriteTimerId = window.setTimeout(() => {
        multiplayer.propWriteTimerId = null;
        flushCloudPropWrites();
    }, CLOUD_EDIT_WRITE_BATCH_MS);
}

function publishPropUpsert(propId) {
    if (!multiplayer.ready || !multiplayer.refs.propsRootRef) {
        return;
    }

    const id = String(propId || "");
    if (!id) {
        return;
    }

    const placed = placedProps.get(id);
    const payload = placed ? serializePropForCloud(placed, id) : null;
    queueCloudPropWrite(id, payload);
}

function publishPropRemoval(propId) {
    if (!multiplayer.ready || !multiplayer.refs.propsRootRef) {
        return;
    }

    const id = String(propId || "");
    if (!id) {
        return;
    }

    queueCloudPropWrite(id, null);
}

function applyRemotePropsSnapshot(rawPayload) {
    const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
    const seenIds = new Set();

    for (const [propId, rawProp] of Object.entries(payload)) {
        if (multiplayer.pendingPropWrites.get(propId) === null) {
            continue;
        }

        const normalized = normalizePropEntry({
            ...(rawProp || {}),
            id: propId
        }, propId);
        if (!normalized) {
            continue;
        }

        addPlacedPropEntry(normalized, "remote");
        seenIds.add(normalized.id);
    }

    for (const propId of Array.from(placedProps.keys())) {
        const pendingValue = multiplayer.pendingPropWrites.get(propId);
        const hasPendingCreateOrUpdate = pendingValue !== undefined && pendingValue !== null;
        if (!seenIds.has(propId) && !hasPendingCreateOrUpdate) {
            removePlacedPropEntry(propId, "remote", false);
        }
    }
}

function applyRemotePropEntry(propId, rawProp) {
    const id = String(propId || "");
    if (!id) {
        return;
    }

    if (multiplayer.pendingPropWrites.get(id) === null) {
        return;
    }

    const normalized = normalizePropEntry({
        ...(rawProp || {}),
        id
    }, id);
    if (!normalized) {
        return;
    }

    addPlacedPropEntry(normalized, "remote");
}

function applyRemotePropRemoval(propId) {
    const id = String(propId || "");
    if (!id) {
        return;
    }

    const pendingValue = multiplayer.pendingPropWrites.get(id);
    if (pendingValue !== undefined && pendingValue !== null) {
        return;
    }

    removePlacedPropEntry(id, "remote", false);
}

function clearPropSnapshotSubscription() {
    if (typeof multiplayer.propSnapshotUnsubscribe === "function") {
        multiplayer.propSnapshotUnsubscribe();
    }
    multiplayer.propSnapshotUnsubscribe = null;
}

function subscribePropSnapshot() {
    if (!multiplayer.ready || multiplayer.propSnapshotUnsubscribe) {
        return;
    }

    const dbModule = multiplayer.firebase?.dbModule;
    const db = multiplayer.firebase?.db;
    if (!dbModule || !db) {
        return;
    }

    const propsRef = multiplayer.refs.propsRootRef || dbModule.ref(db, `${multiplayer.worldPath}/props`);
    multiplayer.refs.propsRootRef = propsRef;
    const unsubAdded = dbModule.onChildAdded(propsRef, (snapshot) => {
        applyRemotePropEntry(snapshot.key || "", snapshot.val());
    });
    const unsubChanged = dbModule.onChildChanged(propsRef, (snapshot) => {
        applyRemotePropEntry(snapshot.key || "", snapshot.val());
    });
    const unsubRemoved = dbModule.onChildRemoved(propsRef, (snapshot) => {
        applyRemotePropRemoval(snapshot.key || "");
    });

    multiplayer.propSnapshotUnsubscribe = () => {
        if (typeof unsubAdded === "function") unsubAdded();
        if (typeof unsubChanged === "function") unsubChanged();
        if (typeof unsubRemoved === "function") unsubRemoved();
    };

    dbModule.get(propsRef).then((snapshot) => {
        applyRemotePropsSnapshot(snapshot.val() || {});
    }).catch(() => {
    });
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
        warnUnknownBlockId(id, "applyRemoteEditEntry");
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

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            continue;
        }
        if (!isValidBlockId(id)) {
            warnUnknownBlockId(id, "collectCompactEditsFromLegacyOps");
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

            if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z)) {
                continue;
            }
            if (!isValidBlockId(id)) {
                warnUnknownBlockId(id, "migrateLegacyOpsIfNeeded");
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

async function migrateTerrainLayoutIfNeeded(dbModule, db, worldPath) {
    const worldRef = dbModule.ref(db, worldPath);
    const chunksRef = dbModule.ref(db, `${worldPath}/chunks`);
    const propsRef = dbModule.ref(db, `${worldPath}/props`);
    const metaRef = dbModule.ref(db, `${worldPath}/meta`);
    const currentFingerprint = getTerrainFingerprint();

    const metaSnap = await dbModule.get(metaRef);
    const meta = metaSnap.exists() ? (metaSnap.val() || {}) : {};
    const storedFingerprint = String(meta?.terrainFingerprint || "");
    const fingerprintChanged = storedFingerprint !== currentFingerprint;
    const storedShift = Number(meta?.terrainShiftY || 0);
    const canAutoCorrect = !fingerprintChanged && Math.abs(storedShift) >= TERRAIN_REACOMODO_MIN_ABS_SHIFT;
    if (!fingerprintChanged && !canAutoCorrect) {
        return { migrated: false, shiftY: 0 };
    }

    const [chunksSnap, propsSnap] = await Promise.all([
        dbModule.get(chunksRef),
        dbModule.get(propsRef)
    ]);

    const entries = chunksSnap.exists() ? collectChunkEditEntriesFromPayload(chunksSnap.val()) : [];
    const props = propsSnap.exists() ? collectPropEntriesFromPayload(propsSnap.val()) : [];
    if (entries.length === 0 && props.length === 0) {
        if (storedFingerprint !== currentFingerprint) {
            await dbModule.update(worldRef, {
                "meta/terrainFingerprint": currentFingerprint,
                "meta/terrainShiftY": 0,
                "meta/terrainMigratedAt": Date.now()
            });
        }
        return { migrated: false, shiftY: 0 };
    }

    const shiftY = computeTerrainReacomodoShift(entries, props);
    const nextAccumulatedShift = canAutoCorrect ? (storedShift + shiftY) : shiftY;
    const patch = {
        "meta/terrainFingerprint": currentFingerprint,
        "meta/terrainShiftY": nextAccumulatedShift,
        "meta/terrainMigratedAt": Date.now()
    };
    if (canAutoCorrect) {
        patch["meta/terrainAutoCorrectedAt"] = Date.now();
    }

    if (!shiftY) {
        await dbModule.update(worldRef, patch);
        return { migrated: false, shiftY: 0 };
    }

    const migratedEntries = remapEditsWithVerticalShift(entries, shiftY);
    const migratedProps = remapPropsWithVerticalShift(props, shiftY);
    const chunkPatch = buildChunkUpdatePatch(entries, migratedEntries);
    const propPatch = buildPropUpdatePatch(props, migratedProps);
    const fullPatch = { ...chunkPatch, ...propPatch, ...patch };
    await dbModule.update(worldRef, fullPatch);
    return { migrated: true, shiftY };
}

function updateAdaptiveQuality(deltaSeconds) {
    const fpsInstant = deltaSeconds > 0 ? 1 / deltaSeconds : 60;
    perfState.fpsEma = perfState.fpsEma * 0.92 + fpsInstant * 0.08;
    perfState.adjustCooldown -= deltaSeconds;

    if (!perfState.adaptiveEnabled) {
        return;
    }

    if (perfState.adjustCooldown > 0) {
        return;
    }

    const minRatio = perfState.minPixelRatio;
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
        return 2;
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

async function ensureSharedDayNightClock(dbModule, db, worldPath) {
    const dayNightRef = dbModule.ref(db, `${worldPath}/meta/dayNightEpochMs`);
    multiplayer.refs.dayNightRef = dayNightRef;

    const localEpochFallback = Math.floor(
        skyState.sharedEpochMs > 0
            ? skyState.sharedEpochMs
            : cycleSecondsToEpochMs(skyState.cycleSeconds)
    );
    applyDayNightEpochMs(localEpochFallback, true);

    try {
        if (typeof dbModule.runTransaction === "function") {
            await dbModule.runTransaction(
                dayNightRef,
                (currentValue) => {
                    const currentEpoch = Math.floor(Number(currentValue));
                    if (Number.isFinite(currentEpoch) && currentEpoch > 0) {
                        return currentEpoch;
                    }
                    return localEpochFallback;
                },
                { applyLocally: false }
            );
        } else {
            const currentSnap = await dbModule.get(dayNightRef);
            if (!currentSnap.exists()) {
                await dbModule.set(dayNightRef, localEpochFallback);
            }
        }
    } catch (error) {
        console.warn("No pude asegurar reloj compartido de dia/noche", error);
    }

    const unsubDayNight = dbModule.onValue(dayNightRef, (snapshot) => {
        const remoteEpoch = Math.floor(Number(snapshot.val()));
        if (Number.isFinite(remoteEpoch) && remoteEpoch > 0) {
            applyDayNightEpochMs(remoteEpoch, true);
            return;
        }

        if (!snapshot.exists()) {
            const fallbackEpoch = Math.floor(
                skyState.sharedEpochMs > 0
                    ? skyState.sharedEpochMs
                    : cycleSecondsToEpochMs(skyState.cycleSeconds)
            );
            applyDayNightEpochMs(fallbackEpoch, true);
            dbModule.set(dayNightRef, fallbackEpoch).catch((error) => {
                console.warn("No pude restaurar reloj compartido de dia/noche", error);
            });
        }
    });

    multiplayer.unsubscribers.push(unsubDayNight);
}

async function setupRealtimeMultiplayer() {
    multiplayer.profile = resolvePlayerIdentity();
    ensureLocalAvatarPreviewModel();
    const profileLabel = multiplayer.profile.displayName || multiplayer.profile.label;
    setOnlineStatus(`Jugador: ${profileLabel} - modo solo`);

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
        const terrainMigration = await migrateTerrainLayoutIfNeeded(dbModule, db, worldPath);

        multiplayer.firebase = { dbModule, db };
        multiplayer.worldPath = worldPath;
        multiplayer.refs.playersRef = dbModule.ref(db, `${worldPath}/players`);
        multiplayer.refs.myPlayerRef = dbModule.ref(db, `${worldPath}/players/${multiplayer.profile.id}`);
        multiplayer.refs.chunksRootRef = dbModule.ref(db, `${worldPath}/chunks`);
        multiplayer.refs.propsRootRef = dbModule.ref(db, `${worldPath}/props`);
        multiplayer.refs.metaRef = dbModule.ref(db, `${worldPath}/meta`);
        await ensureSharedDayNightClock(dbModule, db, worldPath);

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
        multiplayer.lastSentState = null;
        syncChunkEditSubscriptions();
        subscribePropSnapshot();
        setOnlineStatus(`Sala ${multiplayer.roomId}: multijugador activo`);
        if (terrainMigration.migrated) {
            const prefix = terrainMigration.shiftY > 0 ? "+" : "";
            showToast(`Terreno actualizado en nube: reacomodo ${prefix}${terrainMigration.shiftY}`, "info", 2800);
        }
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
    const cameraYaw = getCameraYawForMultiplayer();
    const x = Number(state.playerPosition.x.toFixed(3));
    const y = Number(state.playerPosition.y.toFixed(3));
    const z = Number(state.playerPosition.z.toFixed(3));
    const yaw = Number(cameraYaw.toFixed(4));
    const pitch = Number(camera.rotation.x.toFixed(4));
    const sentAt = Date.now();

    if (!force && multiplayer.lastSentState) {
        const previous = multiplayer.lastSentState;
        const moved = Math.abs(x - previous.x) > 0.01
            || Math.abs(y - previous.y) > 0.01
            || Math.abs(z - previous.z) > 0.01;
        const turned = getAngularDistanceRadians(yaw, previous.yaw) > 0.012
            || Math.abs(pitch - previous.pitch) > 0.012;
        const heartbeatDue = sentAt - previous.sentAt >= multiplayer.idleHeartbeatMs;

        if (!moved && !turned && !heartbeatDue) {
            return;
        }
    }

    const payload = {
        label: multiplayer.profile.label,
        displayName: multiplayer.profile.displayName,
        color: multiplayer.profile.color,
        x,
        y,
        z,
        yaw,
        pitch,
        started: state.worldStarted,
        updatedAt: sentAt
    };

    multiplayer.lastSentState = {
        x,
        y,
        z,
        yaw,
        pitch,
        sentAt
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

function isSeeThroughBlock(id) {
    const definition = getBlockDefinitionById(id);
    if (!definition) {
        return false;
    }

    return Boolean(
        definition.transparent
        || definition.liquid
        || definition.tags.includes("foliage")
        || definition.tags.includes("leaves")
    );
}

function isTranslucentBlock(id) {
    const definition = getBlockDefinitionById(id);
    return Boolean(definition?.transparent || definition?.liquid);
}

function doesNeighborOccludeFace(id, neighborId) {
    if (neighborId === BLOCK.AIR) {
        return false;
    }

    const definition = getBlockDefinitionById(id);
    if (!definition) {
        return neighborId !== BLOCK.AIR;
    }

    if (definition.liquid || definition.transparent || definition.tags.includes("foliage")) {
        return neighborId === id;
    }

    if (isSeeThroughBlock(neighborId)) {
        return false;
    }

    const neighborDefinition = getBlockDefinitionById(neighborId);
    return neighborDefinition?.solid !== false;
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
        if (!doesNeighborOccludeFace(id, neighborId)) {
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

function appendWaterFaceGeometry(positions, normals, indices, x, y, z, corners, normal) {
    const baseIndex = positions.length / 3;
    for (const corner of corners) {
        positions.push(x + corner[0], y + corner[1], z + corner[2]);
        normals.push(normal[0], normal[1], normal[2]);
    }

    indices.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex,
        baseIndex + 2,
        baseIndex + 3
    );
}

function buildLiquidChunkMesh(liquidBlockId, positions) {
    if (!Array.isArray(positions) || positions.length === 0) {
        return null;
    }

    const waterFaces = [
        { offset: [1, 0, 0], normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
        { offset: [-1, 0, 0], normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
        { offset: [0, 1, 0], normal: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
        { offset: [0, -1, 0], normal: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },
        { offset: [0, 0, 1], normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
        { offset: [0, 0, -1], normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
    ];

    const vertexData = [];
    const normalData = [];
    const indexData = [];

    for (const position of positions) {
        const x = position.x;
        const y = position.y;
        const z = position.z;

        for (const face of waterFaces) {
            const neighborId = getBlock(
                x + face.offset[0],
                y + face.offset[1],
                z + face.offset[2]
            );
            if (neighborId === liquidBlockId) {
                continue;
            }

            appendWaterFaceGeometry(vertexData, normalData, indexData, x, y, z, face.corners, face.normal);
        }
    }

    if (vertexData.length === 0 || indexData.length === 0) {
        return null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertexData, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normalData, 3));
    geometry.setIndex(indexData);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const mesh = new THREE.Mesh(geometry, blockMaterials[liquidBlockId]);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = Number(getBlockDefinitionById(liquidBlockId)?.visual?.renderOrder ?? 4);
    mesh.userData.blockId = liquidBlockId;
    mesh.userData.lookupKeys = [];
    return mesh;
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

        if (LIQUID_BLOCK_IDS.has(id)) {
            const liquidMesh = buildLiquidChunkMesh(id, positions);
            if (!liquidMesh) {
                return;
            }
            worldRoot.add(liquidMesh);
            blockMeshes.push(liquidMesh);
            chunk.meshes.push(liquidMesh);
            return;
        }

        const mesh = new THREE.InstancedMesh(blockGeometry, material, positions.length);
        const transparentBlock = isTranslucentBlock(id);
        const definition = getBlockDefinitionById(id);
        const isFoliage = Boolean(definition?.tags?.includes("foliage"));
        const renderOrder = Number(definition?.visual?.renderOrder ?? (transparentBlock ? 2 : 1));
        mesh.castShadow = !transparentBlock && !isFoliage;
        mesh.receiveShadow = !LIQUID_BLOCK_IDS.has(id) && !isFoliage;
        mesh.renderOrder = renderOrder;
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
    let chunksChanged = false;

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
        if (!chunkMap.has(target.key)) {
            chunksChanged = true;
        }
        ensureChunk(target.cx, target.cz);
    }

    for (const key of chunkMap.keys()) {
        if (!desired.has(key)) {
            chunksChanged = true;
            unloadChunk(key);
        }
    }

    if (multiplayer.ready) {
        syncChunkEditSubscriptions();
    }

    state.loadedChunkCount = chunkMap.size;
    state.pendingChunkBuildCount = chunkRebuildQueue.size;
    if (chunksChanged) {
        propState.cullingDirty = true;
        updatePlacedPropCulling();
    }
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
    const changed = clamped !== state.chunkRadius;

    state.chunkRadius = clamped;
    updateGameplaySettingsUi();

    writeStorageValue(CHUNK_RADIUS_STORAGE_KEY, clamped);

    if (!changed) {
        return;
    }
    updateChunkStreaming(true);
    setChunkInfo(`Chunks: ${state.chunkRadius} | Cargados: ${state.loadedChunkCount} | Pendientes: ${state.pendingChunkBuildCount}`);
}

function applyBlockMutation(x, y, z, id, origin = "local") {
    if (!inWorldBounds(x, y, z)) {
        return;
    }

    if (!isValidBlockId(id)) {
        warnUnknownBlockId(id, `applyBlockMutation:${origin}`);
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
    if (id === BLOCK.AIR || !isSolidBlock(id)) {
        removePropsSupportedByBlock(x, y, z, origin);
    }
    markLampShadowsDirty();
    scheduleWorldSave();

    if (origin === "local") {
        publishBlockMutation(x, y, z, id);
    }
}

function isSolidBlock(id) {
    const definition = getBlockDefinitionById(id);
    return Boolean(definition && definition.solid && !definition.liquid);
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

    if (placedProps.size === 0) {
        return false;
    }

    const playerBounds = playerCollisionBoundsScratch;
    playerBounds.minX = x - PLAYER_RADIUS;
    playerBounds.maxX = x + PLAYER_RADIUS;
    playerBounds.minY = y;
    playerBounds.maxY = y + PLAYER_HEIGHT - 0.001;
    playerBounds.minZ = z - PLAYER_RADIUS;
    playerBounds.maxZ = z + PLAYER_RADIUS;

    const nearbyIds = queryNearbyPropIdsReusable(
        playerBounds.minX,
        playerBounds.maxX,
        playerBounds.minY,
        playerBounds.maxY,
        playerBounds.minZ,
        playerBounds.maxZ
    );

    for (const propId of nearbyIds) {
        const placed = placedProps.get(propId);
        if (!placed) {
            continue;
        }
        if (!placed?.node || placed.node.visible === false) {
            continue;
        }
        const propBounds = getPlacedPropBounds(placed, 0);
        if (intersectsAabb(playerBounds, propBounds)) {
            return true;
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
    const direction = cameraForwardScratch;
    camera.getWorldDirection(direction);
    direction.y = 0;

    if (direction.lengthSq() < 1e-8) {
        direction.copy(state.lastForward);
    } else {
        direction.normalize();
        state.lastForward.copy(direction);
    }

    const right = cameraRightScratch;
    right.crossVectors(direction, worldUpVector).normalize();

    return forwardRightResult;
}

function updatePlayer(deltaSeconds) {
    const turnSpeed = 1.6 * deltaSeconds;
    const isSprinting = state.keyDown.has("ShiftLeft");

    if (!controls.isLocked) {
        if (state.keyDown.has("ArrowLeft")) {
            controls.getObject().rotation.y += turnSpeed;
        }

        if (state.keyDown.has("ArrowRight")) {
            controls.getObject().rotation.y -= turnSpeed;
        }
    }

    const speed = isSprinting ? SPRINT_SPEED : BASE_SPEED;
    const { forward, right } = getForwardRightVectors();

    let moveForward = 0;
    let moveRight = 0;

    if (state.keyDown.has("KeyW")) moveForward += 1;
    if (state.keyDown.has("KeyS")) moveForward -= 1;
    if (state.keyDown.has("KeyD")) moveRight += 1;
    if (state.keyDown.has("KeyA")) moveRight -= 1;

    const moveVector = moveVectorScratch;
    moveVector.set(0, 0, 0);
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
    const previewSuffix = state.avatarPreviewOpen ? " | Vista avatar" : "";
    const coordsText = `X: ${p.x.toFixed(1)} Y: ${p.y.toFixed(1)} Z: ${p.z.toFixed(1)}${previewSuffix}`;
    if (coordsText !== uiState.lastCoordsText) {
        coordsEl.textContent = coordsText;
        uiState.lastCoordsText = coordsText;
    }

    const chunkInfoText = `Chunks: ${state.chunkRadius} | Cargados: ${state.loadedChunkCount} | Pendientes: ${state.pendingChunkBuildCount} | Edits: ${editedBlocks.size}/${MAX_EDITED_BLOCKS} | Objetos: ${placedProps.size}/${MAX_PLACED_PROPS} | Conejos: ${wildlifeState.rabbits.size} | Flores activas: ${floraState.sunflowers.size} | Girasoles (moneda): ${economyState.sunflowers} | Q: ${perfState.dynamicPixelRatio.toFixed(2)}x`;
    if (chunkInfoText !== uiState.lastChunkInfoText) {
        setChunkInfo(chunkInfoText);
        uiState.lastChunkInfoText = chunkInfoText;
    }
}

function updateSelectedMaterialHud() {
    const item = getSelectedHotbarItem();
    const label = item?.label || "Material";
    const kindLabel = item?.kind === ITEM_KIND.PROP ? "Objeto" : "Material";

    if (selectedMaterialHudEl) {
        selectedMaterialHudEl.textContent = `${kindLabel}: ${label}`;
    }

    if (hotbarSelectedMaterialEl) {
        hotbarSelectedMaterialEl.textContent = `Seleccionado: ${label}`;
    }
}

function renderInventoryUi() {
    if (!inventoryGridEl) {
        return;
    }

    inventoryGridEl.innerHTML = "";
    for (const category of INVENTORY_CATEGORY_ORDER) {
        const items = INVENTORY_ITEMS.filter((item) => item.category === category);
        if (items.length === 0) {
            continue;
        }

        const section = document.createElement("section");
        section.className = "inventory-section";
        const title = document.createElement("p");
        title.className = "inventory-section-title";
        title.textContent = INVENTORY_CATEGORY_LABELS[category] || "Otros";
        section.appendChild(title);

        const sectionGrid = document.createElement("div");
        sectionGrid.className = "inventory-section-grid";

        for (const item of items) {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "inventory-item";
            card.draggable = true;
            card.style.backgroundColor = getInventoryItemTint(item);
            card.innerHTML = `<span class="inventory-item-label">${item.label}</span><span class="inventory-item-meta">${item.meta || (item.kind === ITEM_KIND.PROP ? "Objeto decorativo" : "Bloque")}</span>`;

            card.addEventListener("dragstart", (event) => {
                draggedInventoryItemId = item.id;
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("text/plain", item.id);
                }
            });
            card.addEventListener("dragend", () => {
                draggedInventoryItemId = "";
            });

            card.addEventListener("click", () => {
                assignHotbarSlot(state.selectedHotbarIndex, item.id, true);
            });

            sectionGrid.appendChild(card);
        }

        section.appendChild(sectionGrid);
        inventoryGridEl.appendChild(section);
    }
}

function setInventoryOpen(open, showFeedback = false) {
    const next = Boolean(open);
    if (next === state.inventoryOpen) {
        return;
    }

    state.inventoryOpen = next;
    state.keyDown.clear();
    if (inventoryPanelEl) {
        inventoryPanelEl.classList.toggle("hidden", !state.inventoryOpen);
    }

    if (state.inventoryOpen) {
        if (crosshairEl) {
            crosshairEl.classList.add("hidden");
        }

        if (controls.isLocked) {
            try {
                controls.unlock();
            } catch (error) {
            }
        }

        renderInventoryUi();
        if (showFeedback) {
            showToast("Inventario abierto", "info", 900);
        }
        return;
    }

    if (!state.avatarPreviewOpen && !state.paused && !state.tutorialVisible) {
        if (crosshairEl) {
            crosshairEl.classList.remove("hidden");
        }

        if (state.worldStarted && !controls.isLocked) {
            try {
                controls.lock();
            } catch (error) {
            }
        }
    }

    if (showFeedback) {
        showToast("Inventario cerrado", "info", 800);
    }
}

function assignHotbarSlot(slotIndex, itemId, showFeedback = false) {
    const index = THREE.MathUtils.clamp(Math.floor(Number(slotIndex) || 0), 0, HOTBAR_SIZE - 1);
    const normalizedId = String(itemId || "");
    if (!INVENTORY_ITEM_BY_ID.has(normalizedId)) {
        return;
    }

    state.hotbarItemIds[index] = normalizedId;
    saveHotbarConfiguration();
    refreshHotbarUi();

    if (showFeedback) {
        const item = INVENTORY_ITEM_BY_ID.get(normalizedId);
        showToast(`Slot ${index + 1}: ${item?.label || "Item"}`, "success", 900);
    }
}

function refreshHotbarUi() {
    if (!hotbarEl) {
        return;
    }

    hotbarEl.innerHTML = "";
    for (let index = 0; index < HOTBAR_SIZE; index += 1) {
        const item = getHotbarItemByIndex(index);
        const slot = document.createElement("div");
        slot.className = `slot${index === state.selectedHotbarIndex ? " selected" : ""}`;
        slot.setAttribute("aria-label", `${index + 1} ${item.label}`);
        slot.style.backgroundColor = getInventoryItemTint(item);
        slot.textContent = `${index + 1}\n${item.label}`;

        slot.addEventListener("click", () => {
            setSelectedHotbar(index);
        });

        slot.addEventListener("dragover", (event) => {
            event.preventDefault();
            slot.classList.add("drag-target");
        });

        slot.addEventListener("dragleave", () => {
            slot.classList.remove("drag-target");
        });

        slot.addEventListener("drop", (event) => {
            event.preventDefault();
            slot.classList.remove("drag-target");
            const droppedId = event.dataTransfer?.getData("text/plain") || draggedInventoryItemId;
            assignHotbarSlot(index, droppedId, true);
            draggedInventoryItemId = "";
        });

        hotbarEl.appendChild(slot);
    }

    updateSelectedMaterialHud();
}

function selectedBlockId() {
    const selected = getSelectedHotbarItem();
    if (!selected || selected.kind !== ITEM_KIND.BLOCK) {
        return null;
    }

    return selected.blockId;
}

function selectedPropType() {
    const selected = getSelectedHotbarItem();
    if (!selected || selected.kind !== ITEM_KIND.PROP) {
        return "";
    }

    return selected.propType || "";
}

function resolveBlockLookupFromRayHit(hit, fallbackBlockId = null) {
    if (!hit?.point) {
        return null;
    }

    const normal = getWorldNormalFromRayHit(hit) || (hit.face?.normal ? worldNormalScratch.copy(hit.face.normal).normalize() : null);
    if (!normal) {
        return null;
    }

    const samplePoint = blockSamplePointScratch.copy(hit.point).addScaledVector(normal, -0.0012);
    const x = Math.floor(samplePoint.x);
    const y = Math.floor(samplePoint.y);
    const z = Math.floor(samplePoint.z);
    if (!inWorldBounds(x, y, z)) {
        return null;
    }

    let id = getBlock(x, y, z);
    if (id === BLOCK.AIR && isValidBlockId(Number(fallbackBlockId))) {
        id = Number(fallbackBlockId);
    }

    return { x, y, z, id };
}

function findTargetedBlockHit() {
    raycaster.setFromCamera(blockRayCenterNdc, camera);
    raycaster.far = MAX_REACH;
    const intersects = raycaster.intersectObjects(blockMeshes, false);
    if (!intersects.length) {
        return null;
    }

    const hit = intersects[0];
    const instanceId = hit.instanceId;
    if (instanceId === undefined || instanceId === null) {
        const fallbackBlockId = Number(hit.object?.userData?.blockId);
        const lookup = resolveBlockLookupFromRayHit(hit, fallbackBlockId);
        if (!lookup) {
            return null;
        }
        return { hit, lookup };
    }

    const lookup = blockPositionLookup.get(`${hit.object.id}:${instanceId}`);
    if (!lookup) {
        const fallbackBlockId = Number(hit.object?.userData?.blockId);
        const resolved = resolveBlockLookupFromRayHit(hit, fallbackBlockId);
        if (!resolved) {
            return null;
        }
        return { hit, lookup: resolved };
    }

    return { hit, lookup };
}

function findTargetedPropHit(blockingDistance = null) {
    if (placedProps.size === 0 || propsRoot.children.length === 0) {
        return null;
    }

    const searchRadius = MAX_REACH + 1.2;
    const nearbyIds = queryNearbyPropIdsReusable(
        state.playerPosition.x - searchRadius,
        state.playerPosition.x + searchRadius,
        state.playerPosition.y - searchRadius,
        state.playerPosition.y + searchRadius,
        state.playerPosition.z - searchRadius,
        state.playerPosition.z + searchRadius
    );
    propRaycastCandidates.length = 0;
    for (const propId of nearbyIds) {
        const placed = placedProps.get(propId);
        if (!placed?.node || placed.node.visible === false) {
            continue;
        }
        propRaycastCandidates.push(placed.node);
    }
    if (propRaycastCandidates.length === 0) {
        return null;
    }

    raycaster.setFromCamera(blockRayCenterNdc, camera);
    raycaster.far = MAX_REACH;
    const propHits = raycaster.intersectObjects(propRaycastCandidates, true);
    if (!propHits.length) {
        return null;
    }

    const blockHit = blockingDistance === null ? findTargetedBlockHit() : null;
    const nearestProp = getFirstVisibleRayHit(propHits);
    if (!nearestProp) {
        return null;
    }
    const blockerDistance = blockingDistance === null
        ? (blockHit ? blockHit.hit.distance : Number.POSITIVE_INFINITY)
        : blockingDistance;
    if (nearestProp.distance > blockerDistance + 0.001) {
        return null;
    }

    const propId = String(findAncestorUserDataValue(nearestProp.object, "propId") || "");
    if (!propId) {
        return null;
    }

    const placed = placedProps.get(propId);
    if (!placed) {
        return null;
    }

    return {
        propId,
        placed,
        hit: nearestProp,
        distance: nearestProp.distance
    };
}

function hasPropNearPosition(x, y, z, radius = 0.32) {
    if (placedProps.size === 0) {
        return false;
    }

    const radiusSq = radius * radius;
    const nearbyIds = queryNearbyPropIdsReusable(
        x - radius,
        x + radius,
        y - radius,
        y + radius,
        z - radius,
        z + radius
    );
    for (const propId of nearbyIds) {
        const prop = placedProps.get(propId);
        if (!prop) {
            continue;
        }
        const dx = prop.x - x;
        const dy = prop.y - y;
        const dz = prop.z - z;
        if (dx * dx + dy * dy + dz * dz <= radiusSq) {
            return true;
        }
    }

    return false;
}

function attemptMineOrPlace(isPlacing) {
    if (!state.worldStarted || !state.worldReady) {
        return;
    }

    const targetedBlock = findTargetedBlockHit();
    const blockDistance = targetedBlock?.hit?.distance ?? Number.POSITIVE_INFINITY;
    const targetedProp = findTargetedPropHit(blockDistance);

    if (!isPlacing) {
        if (!targetedBlock) {
            return;
        }

        const { lookup } = targetedBlock;
        if (lookup.id === BLOCK.BEDROCK) {
            return;
        }

        applyBlockMutation(lookup.x, lookup.y, lookup.z, BLOCK.AIR, "local");
        return;
    }

    const propType = selectedPropType();
    if (propType) {
        let propX = 0;
        let propY = 0;
        let propZ = 0;
        let hasAnchor = false;

        if (targetedProp && targetedProp.distance <= blockDistance + 0.001) {
            const worldNormal = getWorldNormalFromRayHit(targetedProp.hit);
            if (!worldNormal || worldNormal.y < 0.45) {
                showToast("Ese objeto no tiene una cara superior para apoyar", "warning", 1000);
                return;
            }

            propX = Math.floor(targetedProp.hit.point.x) + 0.5;
            propY = getPlacedPropSupportY(targetedProp.placed);
            propZ = Math.floor(targetedProp.hit.point.z) + 0.5;
            hasAnchor = true;
        } else if (targetedBlock) {
            const { hit, lookup } = targetedBlock;
            const normal = hit.face?.normal?.clone();
            if (!normal) {
                return;
            }

            if (normal.y < 0.4) {
                showToast("Los objetos se colocan sobre una superficie", "warning", 900);
                return;
            }

            const placeX = lookup.x + Math.round(normal.x);
            const placeY = lookup.y + Math.round(normal.y);
            const placeZ = lookup.z + Math.round(normal.z);

            if (!inWorldBounds(placeX, placeY, placeZ)) {
                return;
            }

            const targetId = getBlock(placeX, placeY, placeZ);
            if (targetId !== BLOCK.AIR && isSolidBlock(targetId)) {
                const now = performance.now();
                if (now - uiState.noSpaceToastAt > 700) {
                    showToast("No hay espacio", "warning", 800);
                    uiState.noSpaceToastAt = now;
                }
                return;
            }

            propX = placeX + 0.5;
            propY = placeY;
            propZ = placeZ + 0.5;
            hasAnchor = true;
        }

        if (!hasAnchor || !inWorldBounds(Math.floor(propX), Math.floor(propY), Math.floor(propZ))) {
            return;
        }

        if (hasPropNearPosition(propX, propY, propZ, 0.34)) {
            showToast("Ya hay un objeto en ese espacio", "warning", 900);
            return;
        }

        const propYaw = resolvePropPlacementYaw(propType, propX, propZ);
        const playerBounds = {
            minX: state.playerPosition.x - PLAYER_RADIUS,
            maxX: state.playerPosition.x + PLAYER_RADIUS,
            minY: state.playerPosition.y,
            maxY: state.playerPosition.y + PLAYER_HEIGHT - 0.001,
            minZ: state.playerPosition.z - PLAYER_RADIUS,
            maxZ: state.playerPosition.z + PLAYER_RADIUS
        };
        const nextPropBounds = getPlacedPropBoundsAt(propType, propX, propY, propZ, propYaw, 0.001);
        if (intersectsAabb(playerBounds, nextPropBounds)) {
            return;
        }

        const propId = addPlacedPropEntry({
            propType,
            x: propX,
            y: propY,
            z: propZ,
            lampLevel: isLightPropType(propType) ? 0 : undefined,
            yaw: propYaw
        }, "local");

        if (propId) {
            showToast(`${getPropLabel(propType)} colocada`, "success", 900);
        }
        return;
    }

    if (!targetedBlock) {
        return;
    }

    const { hit, lookup } = targetedBlock;
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
    if (targetId !== BLOCK.AIR && isSolidBlock(targetId)) {
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

    const placeId = selectedBlockId();
    if (placeId === null) {
        return;
    }
    applyBlockMutation(placeX, placeY, placeZ, placeId, "local");
}

function setSelectedHotbar(index) {
    const clamped = THREE.MathUtils.clamp(index, 0, HOTBAR_SIZE - 1);
    if (clamped === state.selectedHotbarIndex) {
        return;
    }

    state.selectedHotbarIndex = clamped;
    refreshHotbarUi();
    const label = getSelectedHotbarItem()?.label || "Material";
    showToast(`Material seleccionado: ${label}`, "success", 900);
}

function tryHarvestSunflowerAtCrosshair() {
    const now = performance.now();
    if (now - floraState.lastHarvestAt < 180) {
        return false;
    }

    if (sunflowerRoot.children.length === 0) {
        return false;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = MAX_REACH;
    const flowerHits = raycaster.intersectObjects(sunflowerRoot.children, true);
    const nearestFlower = getFirstVisibleRayHit(flowerHits);
    if (!nearestFlower) {
        return false;
    }

    const blockHit = findTargetedBlockHit();
    const blockingDistance = blockHit ? blockHit.hit.distance : Number.POSITIVE_INFINITY;
    if (nearestFlower.distance > blockingDistance + 0.001) {
        return false;
    }

    const flowerId = findAncestorUserDataValue(nearestFlower.object, "sunflowerId");
    if (!flowerId) {
        return false;
    }

    const harvested = harvestSunflower(flowerId);
    if (harvested) {
        floraState.lastHarvestAt = now;
    }
    return harvested;
}

function cycleLampIntensity(propId, showFeedback = true) {
    const id = String(propId || "");
    if (!id) {
        return false;
    }

    const placed = placedProps.get(id);
    if (!placed || !isLightPropType(placed.propType)) {
        return false;
    }

    const nextLevel = (normalizeLampLevel(placed.lampLevel) + 1) % LAMP_INTENSITY_LEVELS.length;
    if (!applyLampVisualState(placed, nextLevel, true)) {
        return false;
    }
    publishPropUpsert(id);

    if (showFeedback) {
        showToast(`${getPropLabel(placed.propType)}: ${getLampIntensityLabel(nextLevel)}`, "info", 900);
    }
    return true;
}

function tryCycleLampAtCrosshair() {
    const propHit = findTargetedPropHit();
    if (!propHit || !isLightPropType(propHit.placed.propType)) {
        return false;
    }

    return cycleLampIntensity(propHit.propId, true);
}

function tryRemovePlacedPropAtCrosshair() {
    const propHit = findTargetedPropHit();
    if (!propHit) {
        return false;
    }

    return removePlacedPropEntry(propHit.propId, "local", true);
}

function onMouseWheel(event) {
    if (!state.worldStarted || !state.worldReady || state.paused || state.tutorialVisible || state.inventoryOpen || !controls.isLocked) {
        return;
    }

    if (event.deltaY === 0) {
        return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    const total = HOTBAR_SIZE;
    const next = (state.selectedHotbarIndex + direction + total) % total;
    setSelectedHotbar(next);
}

function onKeyDown(event) {
    if (
        event.code === "ArrowUp"
        || event.code === "ArrowDown"
        || event.code === "ArrowLeft"
        || event.code === "ArrowRight"
    ) {
        event.preventDefault();
    }

    if (event.code === "F3" || event.code === "Backquote") {
        event.preventDefault();
        setDebugVisible(!state.debugVisible, true);
        return;
    }

    if (event.code === "KeyV") {
        event.preventDefault();

        if (!state.worldStarted || !state.worldReady) {
            return;
        }

        if (state.tutorialVisible) {
            closeTutorial(true);
        }

        if (state.paused) {
            setPauseMenuOpen(false);
        }

        setAvatarPreviewOpen(!state.avatarPreviewOpen, true);
        return;
    }

    if (event.code === "KeyI") {
        event.preventDefault();
        if (!state.worldStarted || !state.worldReady) {
            return;
        }

        if (state.tutorialVisible) {
            closeTutorial(true);
        }

        if (state.paused) {
            setPauseMenuOpen(false);
        }

        if (state.avatarPreviewOpen) {
            setAvatarPreviewOpen(false);
        }

        setInventoryOpen(!state.inventoryOpen, true);
        return;
    }

    if (event.code === "Escape") {
        event.preventDefault();

        if (!state.worldStarted) {
            return;
        }

        if (state.inventoryOpen) {
            setInventoryOpen(false, true);
            return;
        }

        if (state.avatarPreviewOpen) {
            setAvatarPreviewOpen(false, true);
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

    if (state.paused || state.tutorialVisible || state.inventoryOpen) {
        return;
    }

    if (state.avatarPreviewOpen) {
        if (
            event.code === "KeyW"
            || event.code === "KeyA"
            || event.code === "KeyS"
            || event.code === "KeyD"
            || event.code === "ShiftLeft"
        ) {
            state.keyDown.add(event.code);
        }
        return;
    }

    if (event.code === "KeyE") {
        event.preventDefault();
        if (event.repeat || !controls.isLocked) {
            return;
        }
        tryHarvestSunflowerAtCrosshair();
        return;
    }

    if (/^Digit[1-8]$/.test(event.code)) {
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

    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
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

    if (state.paused || state.tutorialVisible || state.avatarPreviewOpen || state.inventoryOpen) {
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
        if (tryRemovePlacedPropAtCrosshair()) {
            return;
        }
        attemptMineOrPlace(false);
        return;
    }

    if (event.button === 2) {
        if (tryCycleLampAtCrosshair()) {
            return;
        }
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
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
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

    if (inventoryToggleButtonEl) {
        inventoryToggleButtonEl.addEventListener("click", () => {
            if (!state.worldStarted || !state.worldReady) {
                return;
            }
            if (state.avatarPreviewOpen) {
                setAvatarPreviewOpen(false);
            }
            setInventoryOpen(!state.inventoryOpen, true);
        });
    }

    if (inventoryCloseButtonEl) {
        inventoryCloseButtonEl.addEventListener("click", () => {
            setInventoryOpen(false, true);
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

    if (chunkRadiusSliderEl) {
        chunkRadiusSliderEl.addEventListener("input", (event) => {
            const value = Number(event.target?.value);
            setChunkRadius(value);
        });
    }

    if (qualityPresetSelectEl) {
        qualityPresetSelectEl.addEventListener("change", (event) => {
            const value = event.target?.value || "auto";
            setQualityPreset(value, true, true);
        });
    }

    if (pointerSensitivitySliderEl) {
        pointerSensitivitySliderEl.addEventListener("input", (event) => {
            const value = Number(event.target?.value);
            setPointerSensitivity(value, true, false);
        });

        pointerSensitivitySliderEl.addEventListener("change", (event) => {
            const value = Number(event.target?.value);
            setPointerSensitivity(value, true, true);
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
        flushCloudPropWrites();
        clearChunkEditSubscriptions();
        clearPropSnapshotSubscription();
        clearWildlife();
        clearSunflowers();
        clearPlacedProps();
        clearAvatarRoot(localAvatarPreviewRoot);
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

    if (state.worldStarted && !state.paused && !state.avatarPreviewOpen && !state.inventoryOpen) {
        updatePlayer(delta);
    }

    updateSky(delta);
    if (!state.paused) {
        updateWildlife(delta);
        updateSunflowers(delta);
    }
    if (state.worldStarted && state.worldReady) {
        updateActiveLampShadowCasters(delta);
    }

    updateChunkStreaming(false);
    const budget = getDynamicChunkBuildBudget();
    if (budget > 0) {
        processChunkRebuildQueue(budget);
    }
    if (propState.cullingDirty) {
        updatePlacedPropCulling();
    }

    updateRemotePlayers(delta);
    broadcastLocalPlayerState();

    if (!state.paused && state.autoSaveTick >= AUTO_SAVE_SECONDS) {
        state.autoSaveTick = 0;
        flushWorldSave();
    }

    updateAvatarPreviewCamera(delta);
    updateTargetedBlockUi(delta);
    state.hudTick -= delta;
    if (state.hudTick <= 0) {
        updateHud();
        state.hudTick = HUD_UPDATE_INTERVAL;
    }
    renderer.render(scene, camera);
}

function findSpawnPoint() {
    const sx = 0;
    const sz = 0;

    for (let y = WORLD_MAX_Y - 1; y >= 1; y -= 1) {
        const id = getBlock(sx, y, sz);
        if (isSolidBlock(id)) {
            return new THREE.Vector3(sx + 0.5, y + 1.01, sz + 0.5);
        }
    }

    return new THREE.Vector3(0.5, 18, 0.5);
}

function init() {
    setBootStatus("Cargando mundo guardado...");
    logRegistryValidationIssues();
    initDayNightClockFromStorage();
    createSkyDecor();
    setPauseMenuOpen(false);
    setPauseSettingsOpen(false);
    setDebugVisible(loadDebugVisibility(), false);
    loadGameplayPreferences();
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
    renderInventoryUi();
    updateSunflowerCurrencyHud();
    setupEvents();

    updateChunkStreaming(true);
    processChunkRebuildQueue(INITIAL_CHUNK_BUILD_BUDGET);
    initWildlife();
    initSunflowers();

    setupRealtimeMultiplayer();

    if (helpMiniEl) {
        helpMiniEl.textContent = "WASD mover - Mouse mirar - Click izq minar - Click der colocar - E cosechar girasol - Espacio saltar - Rueda o 1-8 material - I inventario - F3 debug - V ver avatar - ESC pausa";
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
