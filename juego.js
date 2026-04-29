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

function formatMetricCompact(value) {
    const safe = Math.max(0, Math.floor(Number(value) || 0));
    if (safe >= 1000000) {
        return `${(safe / 1000000).toFixed(2)}M`;
    }
    if (safe >= 1000) {
        return `${(safe / 1000).toFixed(1)}k`;
    }
    return String(safe);
}

const WORLD_MAX_Y = 480;
const CHUNK_SIZE = 16;
const CHUNK_RADIUS_MIN = 2;
const CHUNK_RADIUS_MAX = 64;
const CHUNK_MANAGEMENT_INTERVAL = 0.08;
const CHUNK_REBUILD_BUDGET_PER_FRAME = 1;
const INITIAL_CHUNK_BUILD_BUDGET = 36;
const CHUNK_FULL_DETAIL_RADIUS_MIN = 8;
const CHUNK_FULL_DETAIL_RADIUS_MAX = 24;
const CHUNK_REBUILD_FIFO_POP_THRESHOLD = 2200;
const CHUNK_REBUILD_FIFO_POP_SCAN_LIMIT = 28;
const BLOCK_FACE_NEIGHBOR_OFFSETS = Object.freeze([
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
]);
const COLUMN_CACHE_MAX_ENTRIES = 160000;
const COLUMN_CACHE_TRIM_TO_ENTRIES = 130000;
const COLUMN_CACHE_TRIM_BATCH = 4096;
const CLOUD_EDIT_WRITE_BATCH_MS = 220;
const CLOUD_EDIT_RETRY_MS = 1200;
const SEA_LEVEL = 72;
const CLOUD_COUNT = 22;
const CLOUD_BASE_HEIGHT = SEA_LEVEL + 120;
const CLOUD_HEIGHT_VARIANCE = 56;
const RABBIT_MAX_COUNT = 12;
const RABBIT_SPAWN_INTERVAL_MIN = 7.2;
const RABBIT_SPAWN_INTERVAL_MAX = 18.4;
const RABBIT_SPAWN_ATTEMPTS = 6;
const RABBIT_DESPAWN_DISTANCE = 155;
const RABBIT_MIN_PLAYER_DISTANCE = 10;
const RABBIT_MIN_RABBIT_DISTANCE = 2.4;
const FISH_MAX_COUNT = 48;
const FISH_SPAWN_INTERVAL_MIN = 2.6;
const FISH_SPAWN_INTERVAL_MAX = 6.2;
const FISH_SPAWN_ATTEMPTS = 14;
const FISH_DESPAWN_DISTANCE = 250;
const FISH_MIN_PLAYER_DISTANCE = 8;
const FISH_MIN_FISH_DISTANCE = 1.6;
const WILDLIFE_SYNC_INTERVAL_MS = 620;
const WILDLIFE_SYNC_RETRY_MS = 1100;
const WILDLIFE_REMOTE_BLEND_SPEED = 7.5;
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
const FLIGHT_SPEED = 24;
const MAX_REACH = 6;
const DEFAULT_POINTER_SPEED = 0.68;
const TARGET_UI_SCAN_INTERVAL = 0.055;
const HUD_UPDATE_INTERVAL = 0.12;
const PERF_STATS_UPDATE_INTERVAL = 0.45;
const PROP_SPATIAL_CELL_SIZE = 1.5;
const MAP_VIEW_RADIUS_BLOCKS = 180;
const MAP_RENDER_RESOLUTION = 128;
const MAP_REFRESH_INTERVAL = 0.22;
const GLOBAL_MAP_VIEW_RADIUS_BLOCKS = 18000;
const GLOBAL_MAP_RENDER_RESOLUTION = 224;
const GLOBAL_MAP_REFRESH_INTERVAL = 0.85;
const GLOBAL_MAP_MIN_ZOOM = 0.8;
const GLOBAL_MAP_MAX_ZOOM = 4.2;

const PORTAL_UNLOCK_STORAGE_KEY = "girasolPortalUnlocked";
const PORTAL_ACCESS_LABEL_STORAGE_KEY = "girasolPortalAccessLabel";
const MULTIPLAYER_SESSION_ID_KEY = "girasolMultiplayerSessionId";
const CHUNK_RADIUS_STORAGE_KEY = "girasolChunkRadiusV1";
const POINTER_SENSITIVITY_STORAGE_KEY = "girasolPointerSensitivityV1";
const QUALITY_PRESET_STORAGE_KEY = "girasolQualityPresetV1";
const GRAPHICS_MODE_STORAGE_KEY = "girasolGraphicsModeV1";
const FLIGHT_MODE_STORAGE_KEY = "girasolFlightModeV1";
const HOTBAR_STORAGE_KEY = "girasolHotbarSlotsV1";
const SUNFLOWER_CURRENCY_STORAGE_KEY = "girasolSunflowerCurrencyV1";
const MAP_PIN_STORAGE_KEY_PREFIX = "girasolMapPinV1";
const MAP_HOME_PIN_STORAGE_KEY_PREFIX = "girasolMapHomePinV1";
const JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY_PREFIX = "girasolJukeboxTracksV2";
const GRAPHICS_MODE = Object.freeze({
    AUTO: "auto",
    DEDICATED: "dedicated",
    INTEGRATED: "integrated",
    SOFTWARE: "software"
});

const PROFILE_COLORS = {
    Mauricio: "#f4cf85",
    Valentina: "#ff96c9"
};

const FLORA_DECOR_COLORS = Object.freeze({
    stemDark: 0x3f7436,
    stemFresh: 0x5a8e46,
    grassDark: 0x3f7f2f,
    grassMid: 0x5a973e,
    grassBright: 0x7cb356,
    leafDense: 0x4d8944,
    leafSoft: 0x78a861,
    leafCoastal: 0x6c9962,
    leafCold: 0x73909a,
    petalBlue: 0x5e82db,
    petalPink: 0xcd9ad8,
    petalRed: 0xbf5047,
    petalYellow: 0xd7b75a,
    petalWhite: 0xe6edf8,
    berry: 0xb84f86,
    dryStem: 0x8f744b,
    dryLeaf: 0xa38a5a
});

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

const FISH_VARIANTS = [
    {
        id: "tilapia",
        label: "Tilapia",
        body: 0x88b9d7,
        accent: 0x4c6e8a,
        scale: 0.85,
        speedMin: 0.8,
        speedMax: 1.4,
        depthBias: 0.4,
        spawnWeight: 0.28
    },
    {
        id: "puffer",
        label: "Pez globo",
        body: 0xe9c66a,
        accent: 0x6d5322,
        scale: 0.75,
        speedMin: 0.45,
        speedMax: 0.9,
        depthBias: 0.32,
        spawnWeight: 0.14
    },
    {
        id: "shark",
        label: "Tiburon",
        body: 0x6f7f90,
        accent: 0x2b3a47,
        scale: 1.62,
        speedMin: 1.3,
        speedMax: 2.15,
        depthBias: 0.76,
        spawnWeight: 0.34
    },
    {
        id: "manta",
        label: "Manta raya",
        body: 0x3f4e5a,
        accent: 0xadb7bf,
        scale: 1.18,
        speedMin: 0.9,
        speedMax: 1.5,
        depthBias: 0.62,
        spawnWeight: 0.13
    },
    {
        id: "jelly",
        label: "Medusa",
        body: 0x89d8ee,
        accent: 0xcdeeff,
        scale: 0.95,
        speedMin: 0.32,
        speedMax: 0.72,
        depthBias: 0.55,
        spawnWeight: 0.11
    }
];

const gameConfig = window.appConfig?.game || {};
const multiplayerConfig = gameConfig.multiplayer || {};
const urlParams = new URLSearchParams(window.location.search);
const ACTIVE_ROOM_ID = sanitizeRoomId(urlParams.get("room") || multiplayerConfig.roomId || "mundo-principal");
const MAX_EDITED_BLOCKS = clampInt(Number(gameConfig.maxEditedBlocks) || 120000, 2000, 500000);
const MAX_PLACED_PROPS = clampInt(Number(gameConfig.maxPlacedProps) || 2400, 100, 10000);
const WORLD_SAVE_KEY = `girasolWorldEdits:${ACTIVE_ROOM_ID}`;
const PLAYER_STATE_STORAGE_KEY = `girasolPlayerStateV1:${ACTIVE_ROOM_ID}`;
const DAY_NIGHT_EPOCH_STORAGE_KEY = `girasolDayNightEpochV1:${ACTIVE_ROOM_ID}`;
const JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY = `${JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY_PREFIX}:${ACTIVE_ROOM_ID}`;
const MAP_PIN_STORAGE_KEY = `${MAP_PIN_STORAGE_KEY_PREFIX}:${ACTIVE_ROOM_ID}`;
const MAP_HOME_PIN_STORAGE_KEY = `${MAP_HOME_PIN_STORAGE_KEY_PREFIX}:${ACTIVE_ROOM_ID}`;
const WORLD_SAVE_VERSION = 2;
const AUTO_SAVE_SECONDS = 12;
const PLAYER_STATE_SAVE_INTERVAL_SECONDS = 1.8;
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
const SUN_ORBIT_RADIUS = 420;
const SUN_ORBIT_HEIGHT = 310;
const LAMP_INTENSITY_LEVELS = [0, 1.05, 2.35, 6.2];
const LAMP_DISTANCE_LEVELS = [0, 9, 15, 24];
const LAMP_BULB_EMISSIVE_LEVELS = [0.02, 0.42, 0.86, 1.52];
const LAMP_SHADOW_MAP_SIZE = 96;
const MAX_SHADOW_CASTING_LAMPS = 2;
const LAMP_SHADOW_MAX_DISTANCE = 20;
const LAMP_SHADOW_REFRESH_SECONDS = 0.45;
const LAMP_SHADOW_MIN_LEVEL = 3;
const SIGN_TEXT_MAX_LENGTH = 52;
const JUKEBOX_TRACK_COUNT = 4;
const JUKEBOX_SOURCE_DEFAULT = "local-playlist-v1";
const JUKEBOX_SOURCE_PREFIX_SPOTIFY = "spotify-uri:";
const JUKEBOX_SOURCE_PREFIX_YOUTUBE = "youtube-id:";
const JUKEBOX_SOURCE_PREFIX_RECORDING = "recording-track:";
const JUKEBOX_SPATIAL_MAX_DISTANCE = 36;
const JUKEBOX_SPATIAL_NEAR_DISTANCE = 2.6;
const JUKEBOX_SPATIAL_GAIN_SMOOTHING = 0.12;
const JUKEBOX_SPOTIFY_ACTIVE_DISTANCE = 20;
const JUKEBOX_RECORDING_MAX_SECONDS = 18;
const JUKEBOX_RECORDING_MAX_DATA_URL_CHARS = 1200000;
const TV_SPATIAL_MAX_DISTANCE = 72;
const TV_SPATIAL_NEAR_DISTANCE = 4;
const TV_INTERACTION_MAX_DISTANCE = 26;
const TV_SYNC_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const TV_EMBED_MIN_SIZE_PX = 8;
const TV_EMBED_OFFSCREEN_MARGIN_PX = 120;
const TV_EMBED_CLIP_INSET_PX = 0.6;
const TV_OVERLAY_OCCLUSION_ENABLED = false;
const TV_OVERLAY_FRONTFACE_DOT_MIN = 0.06;
const TV_OVERLAY_OCCLUSION_CHECK_INTERVAL_MS = 120;
const TV_OVERLAY_OCCLUSION_RAY_BIAS = 0.04;
const TV_TARGET_UI_IDLE_HIDE_DELAY_SECONDS = 2;
const TV_TARGET_UI_CAMERA_POSITION_EPSILON_SQ = 0.000004;
const TV_TARGET_UI_CAMERA_QUAT_DOT_THRESHOLD = 0.999995;
const TV_MODEL_SCALE = 10;
const TV_SIZE_OPTIONS = Object.freeze([200, 100, 70]);
const TV_WALL_BASE_MIN_Y = 5.5;
const TV_WALL_BASE_MAX_Y = 15.8;
const TV_WALL_BASE_SUPPORT_Y = 10.6;
const WORLD_HARD_RESET_CONFIRM_WORDS = Object.freeze([
    "girasol",
    "eterno",
    "volcan",
    "obsidiana",
    "hogar",
    "luciernaga",
    "brujula",
    "cordillera",
    "aurora",
    "palmera"
]);
const INTERACTION_KEY = "KeyE";
const INTERACTION_EXIT_KEY = "ShiftLeft";
const INTERACTION_MAX_DISTANCE = 3.2;
const SKY_SHADOW_REFRESH_SECONDS = 0.82;
const PROP_ROTATION_STEP = Math.PI * 0.5;
const ENABLE_WORLD_FOG = false;
const FOG_SAMPLE_INTERVAL_SECONDS = 0.3;
const FOG_BLEND_SPEED = 2.6;
const FOG_BASE_PADDING_BLOCKS = 96;
const FOG_MIN_FAR = 220;
const FOG_MAX_FAR = CHUNK_RADIUS_MAX * CHUNK_SIZE + FOG_BASE_PADDING_BLOCKS;
const CAMERA_FAR_PADDING = 120;
const CAMERA_MIN_FAR = 300;
const CAMERA_MAX_FAR = FOG_MAX_FAR + CAMERA_FAR_PADDING + 80;
const SKY_DAY_COLOR = new THREE.Color(0x9bc7ff);
const SKY_DUSK_COLOR = new THREE.Color(0xffb579);
const SKY_NIGHT_COLOR = new THREE.Color(0x091327);
const BIOME = Object.freeze({
    SPAWN_VALLEY: "spawn_valley",
    FOREST: "forest",
    DESERT: "desert",
    CORDILLERA: "cordillera",
    VOLCANIC: "volcanic",
    MARITIME: "maritime",
    COAST: "coast",
    LAKE: "lake",
    PLAINS: "plains"
});
const MAP_MODE = Object.freeze({
    LOCAL: "local",
    GLOBAL: "global"
});
const BIOME_LABELS = Object.freeze({
    [BIOME.SPAWN_VALLEY]: "Valle inicial",
    [BIOME.FOREST]: "Bosque",
    [BIOME.DESERT]: "Desierto",
    [BIOME.CORDILLERA]: "Cordillera",
    [BIOME.VOLCANIC]: "Volcanico",
    [BIOME.MARITIME]: "Maritimo",
    [BIOME.COAST]: "Costa",
    [BIOME.LAKE]: "Lagos",
    [BIOME.PLAINS]: "Llanura"
});
const TERRAIN_SYNC_SAMPLE_POINTS = [
    [-96, -96], [-96, -32], [-96, 32], [-96, 96],
    [-32, -96], [-32, -32], [-32, 32], [-32, 96],
    [32, -96], [32, -32], [32, 32], [32, 96],
    [96, -96], [96, -32], [96, 32], [96, 96],
    [0, 0], [0, 64], [64, 0], [-64, 0], [0, -64]
];
const TERRAIN_REACOMODO_MIN_COLUMNS = 12;
const TERRAIN_REACOMODO_MIN_ABS_SHIFT = 2;
const TERRAIN_REACOMODO_MAX_SHIFT = 320;
const TERRAIN_GENERATION_VERSION = 4;

const WORLD_SEED = Number(gameConfig.worldSeed) || 42173;
const INITIAL_CHUNK_RADIUS = clampInt(
    Number(urlParams.get("chunks") || gameConfig.renderChunkRadius || 4),
    CHUNK_RADIUS_MIN,
    CHUNK_RADIUS_MAX
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
const mapToggleButtonEl = document.getElementById("mapToggleButton");
const inventoryPanelEl = document.getElementById("inventoryPanel");
const inventoryCloseButtonEl = document.getElementById("inventoryCloseButton");
const inventoryGridEl = document.getElementById("inventoryGrid");
const inventoryCategoryQuickFillSelectEl = document.getElementById("inventoryCategoryQuickFillSelect");
const inventoryCategoryQuickFillButtonEl = document.getElementById("inventoryCategoryQuickFillButton");
const mapPanelEl = document.getElementById("mapPanel");
const mapCloseButtonEl = document.getElementById("mapCloseButton");
const mapInfoEl = document.getElementById("mapInfo");
const worldMapCanvasEl = document.getElementById("worldMapCanvas");
const mapModeLocalButtonEl = document.getElementById("mapModeLocalButton");
const mapModeGlobalButtonEl = document.getElementById("mapModeGlobalButton");
const mapSetPinButtonEl = document.getElementById("mapSetPinButton");
const mapGoPinButtonEl = document.getElementById("mapGoPinButton");
const mapClearPinButtonEl = document.getElementById("mapClearPinButton");
const mapSetHomePinButtonEl = document.getElementById("mapSetHomePinButton");
const mapGoHomePinButtonEl = document.getElementById("mapGoHomePinButton");
const targetBlockLabelEl = document.getElementById("targetBlockLabel");
const crosshairEl = document.getElementById("crosshair");
const toastContainerEl = document.getElementById("toastContainer");
const pauseButton = document.getElementById("pauseButton");
const pauseMenuEl = document.getElementById("pauseMenu");
const pauseContinueButton = document.getElementById("pauseContinueButton");
const pauseSettingsButton = document.getElementById("pauseSettingsButton");
const pauseSaveButton = document.getElementById("pauseSaveButton");
const pauseRestartButton = document.getElementById("pauseRestartButton");
const pauseHardResetButton = document.getElementById("pauseHardResetButton");
const pauseSettingsSection = document.getElementById("pauseSettingsSection");
const chunkRadiusSliderEl = document.getElementById("chunkRadiusSlider");
const chunkRadiusValueEl = document.getElementById("chunkRadiusValue");
const qualityPresetSelectEl = document.getElementById("qualityPresetSelect");
const graphicsModeSelectEl = document.getElementById("graphicsModeSelect");
const graphicsModeHelpEl = document.getElementById("graphicsModeHelp");
const graphicsDeviceLabelEl = document.getElementById("graphicsDeviceLabel");
const pointerSensitivitySliderEl = document.getElementById("pointerSensitivitySlider");
const pointerSensitivityValueEl = document.getElementById("pointerSensitivityValue");
const flightModeToggleEl = document.getElementById("flightModeToggle");
const flightModeValueEl = document.getElementById("flightModeValue");
const tutorialPanelEl = document.getElementById("tutorialPanel");
const tutorialCloseButton = document.getElementById("tutorialCloseButton");
const interactionPanelEl = document.getElementById("interactionPanel");
const interactionPanelTitleEl = document.getElementById("interactionPanelTitle");
const interactionPanelHintEl = document.getElementById("interactionPanelHint");
const interactionPanelBodyEl = document.getElementById("interactionPanelBody");
const interactionCloseButtonEl = document.getElementById("interactionCloseButton");
const worldMapCtx = worldMapCanvasEl?.getContext("2d", { alpha: false }) || null;

function normalizeGraphicsMode(value) {
    const raw = String(value || "").toLowerCase();
    if (
        raw === GRAPHICS_MODE.AUTO
        || raw === GRAPHICS_MODE.DEDICATED
        || raw === GRAPHICS_MODE.INTEGRATED
        || raw === GRAPHICS_MODE.SOFTWARE
    ) {
        return raw;
    }
    return GRAPHICS_MODE.AUTO;
}

function resolveRendererPowerPreference(mode) {
    const normalized = normalizeGraphicsMode(mode);
    if (normalized === GRAPHICS_MODE.DEDICATED) {
        return "high-performance";
    }
    if (normalized === GRAPHICS_MODE.INTEGRATED) {
        return "low-power";
    }
    return "default";
}

function readInitialGraphicsModeFromStorage() {
    try {
        const raw = window.localStorage.getItem(GRAPHICS_MODE_STORAGE_KEY);
        return normalizeGraphicsMode(raw || GRAPHICS_MODE.AUTO);
    } catch (error) {
        return GRAPHICS_MODE.AUTO;
    }
}

const INITIAL_GRAPHICS_MODE = readInitialGraphicsModeFromStorage();

function getBaseViewDistanceForChunkRadius(chunkRadius) {
    const radiusBlocks = clampInt(chunkRadius, CHUNK_RADIUS_MIN, CHUNK_RADIUS_MAX) * CHUNK_SIZE;
    return THREE.MathUtils.clamp(radiusBlocks + FOG_BASE_PADDING_BLOCKS, FOG_MIN_FAR, FOG_MAX_FAR);
}

function simplifyRendererLabel(rawLabel) {
    const text = String(rawLabel || "").trim();
    if (!text) {
        return "";
    }

    const angleMatch = text.match(/^ANGLE\s*\((.+)\)$/i);
    if (!angleMatch) {
        return text;
    }

    const parts = angleMatch[1].split(",").map((item) => item.trim()).filter(Boolean);
    if (parts.length < 2) {
        return text;
    }

    const backend = parts[parts.length - 1];
    const adapter = parts[1] || parts[0];
    return `${adapter} [ANGLE ${backend}]`;
}

function classifyGraphicsAdapterLabel(label) {
    const text = String(label || "").toLowerCase();
    if (!text || text === "no disponible") {
        return "unknown";
    }

    if (text.includes("swiftshader") || text.includes("llvmpipe") || text.includes("software")) {
        return "software";
    }

    if (
        text.includes("geforce")
        || text.includes("quadro")
        || text.includes("rtx")
        || text.includes("radeon rx")
        || text.includes("radeon pro")
        || text.includes("intel arc")
        || text.includes("arc a")
    ) {
        return "dedicated";
    }

    if (
        text.includes("intel")
        || text.includes("uhd")
        || text.includes("iris")
        || text.includes("vega")
        || text.includes("radeon graphics")
        || text.includes("apu")
    ) {
        return "integrated";
    }

    return "unknown";
}

function getGraphicsDeviceCategoryLabel(category) {
    if (category === "dedicated") return "dedicada";
    if (category === "integrated") return "integrada";
    if (category === "software") return "software";
    return "sin clasificar";
}

const INITIAL_BASE_VIEW_DISTANCE = getBaseViewDistanceForChunkRadius(INITIAL_CHUNK_RADIUS);
const INITIAL_FOG_NEAR = Math.max(24, INITIAL_BASE_VIEW_DISTANCE * 0.14);
const INITIAL_FOG_FAR = INITIAL_BASE_VIEW_DISTANCE;
const INITIAL_CAMERA_FAR = THREE.MathUtils.clamp(INITIAL_FOG_FAR + CAMERA_FAR_PADDING, CAMERA_MIN_FAR, CAMERA_MAX_FAR);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7ff);
scene.fog = ENABLE_WORLD_FOG ? new THREE.Fog(0x9bc7ff, INITIAL_FOG_NEAR, INITIAL_FOG_FAR) : null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, INITIAL_CAMERA_FAR);
camera.rotation.order = "YXZ";
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: resolveRendererPowerPreference(INITIAL_GRAPHICS_MODE)
});

function detectGraphicsDeviceLabelFromRenderer(targetRenderer) {
    if (!targetRenderer) {
        return "No disponible";
    }
    try {
        const gl = targetRenderer.getContext?.();
        if (!gl) {
            return "No disponible";
        }
        const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
        const rendererLabel = debugExt
            ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER);
        const vendorLabel = debugExt
            ? gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL)
            : gl.getParameter(gl.VENDOR);
        const rendererText = simplifyRendererLabel(rendererLabel);
        const vendorText = String(vendorLabel || "").trim();
        if (rendererText && vendorText && !rendererText.toLowerCase().includes(vendorText.toLowerCase())) {
            return `${rendererText} (${vendorText})`;
        }
        return rendererText || vendorText || "No disponible";
    } catch (error) {
        return "No disponible";
    }
}

function detectGraphicsContextPowerPreference(targetRenderer) {
    if (!targetRenderer) {
        return "default";
    }
    try {
        const gl = targetRenderer.getContext?.();
        const attrs = gl?.getContextAttributes?.();
        const powerPreference = String(attrs?.powerPreference || "default");
        if (powerPreference === "high-performance" || powerPreference === "low-power" || powerPreference === "default") {
            return powerPreference;
        }
    } catch (error) {
    }
    return "default";
}

const INITIAL_GRAPHICS_DEVICE_LABEL = detectGraphicsDeviceLabelFromRenderer(renderer);
const INITIAL_GRAPHICS_CONTEXT_POWER_PREFERENCE = detectGraphicsContextPowerPreference(renderer);
const INITIAL_GRAPHICS_DEVICE_CATEGORY = classifyGraphicsAdapterLabel(INITIAL_GRAPHICS_DEVICE_LABEL);
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
controls.pointerSmoothing = 0.32;
controls.maxMouseDelta = 130;
controls.maxJumpDelta = 420;
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

const fishRoot = new THREE.Group();
scene.add(fishRoot);

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
    } else if (textureStyle === "mossy_cobblestone") {
        fillNoisyBase(ctx, size, hexToRgb(0x6e7568), 24, rng);
        drawSpeckles(ctx, size, 250, 0x555c50, 0.26, rng, 1, 2);
        drawRockCracks(ctx, size, rng, 0x44493f, 0.3, 9);
        drawSpeckles(ctx, size, 170, 0x4f7b49, 0.24, rng, 1, 2);
    } else if (textureStyle === "dark_brick") {
        fillNoisyBase(ctx, size, hexToRgb(0x553e43), 14, rng);
        ctx.strokeStyle = "rgba(35, 24, 28, 0.45)";
        ctx.lineWidth = 2;
        const darkBrickStep = 16;
        for (let y = 0; y <= size; y += darkBrickStep) {
            const offset = (Math.floor(y / darkBrickStep) % 2) ? 2 : 0;
            ctx.beginPath();
            ctx.moveTo(0, y + offset);
            ctx.lineTo(size, y + offset);
            ctx.stroke();
        }
        for (let x = 0; x <= size; x += darkBrickStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
    } else if (textureStyle === "black_marble") {
        fillNoisyBase(ctx, size, hexToRgb(0x2d3038), 8, rng);
        ctx.strokeStyle = "rgba(98, 104, 119, 0.32)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 9; i += 1) {
            const y = Math.floor(rng() * size);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(size * 0.32, y + 6, size * 0.66, y - 8, size, y + Math.floor(rng() * 5) - 2);
            ctx.stroke();
        }
    } else if (textureStyle === "slate") {
        fillNoisyBase(ctx, size, hexToRgb(0x4d5663), 14, rng);
        ctx.strokeStyle = "rgba(64, 73, 84, 0.3)";
        ctx.lineWidth = 1;
        for (let y = 0; y <= size; y += 6) {
            ctx.beginPath();
            ctx.moveTo(0, y + Math.floor(rng() * 2));
            ctx.lineTo(size, y + Math.floor(rng() * 2));
            ctx.stroke();
        }
    } else if (textureStyle === "volcanic_stone") {
        fillNoisyBase(ctx, size, hexToRgb(0x2c2527), 18, rng);
        drawSpeckles(ctx, size, 320, 0x1b1517, 0.3, rng, 1, 2);
        drawSpeckles(ctx, size, 80, 0x7b3a2a, 0.2, rng, 1, 1);
    } else if (textureStyle === "lava") {
        fillNoisyBase(ctx, size, hexToRgb(0xff7f2a), 18, rng, 238);
        for (let i = 0; i < 9; i += 1) {
            const y = 4 + i * 7 + Math.floor(rng() * 2);
            ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 235, 162, 0.45)" : "rgba(255, 96, 20, 0.38)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(size * 0.3, y + 2, size * 0.6, y - 2, size, y + 1);
            ctx.stroke();
        }
        drawSpeckles(ctx, size, 100, 0x3b0f05, 0.15, rng, 1, 1);
    } else if (textureStyle === "ash") {
        fillNoisyBase(ctx, size, hexToRgb(0x6e6766), 14, rng);
        drawSpeckles(ctx, size, 270, 0x575150, 0.24, rng, 1, 2);
        drawSpeckles(ctx, size, 120, 0x8b8584, 0.16, rng, 1, 1);
    } else if (textureStyle === "obsidian") {
        fillNoisyBase(ctx, size, hexToRgb(0x221a2a), 9, rng);
        ctx.strokeStyle = "rgba(118, 88, 160, 0.24)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i += 1) {
            const y = Math.floor(rng() * size);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(size * 0.34, y + 5, size * 0.68, y - 7, size, y + Math.floor(rng() * 4) - 2);
            ctx.stroke();
        }
    } else if (textureStyle === "copper") {
        fillNoisyBase(ctx, size, hexToRgb(0xbc6f45), 10, rng);
        ctx.strokeStyle = "rgba(224, 157, 109, 0.3)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 9; i += 1) {
            const y = 4 + i * 7 + Math.floor(rng() * 3);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y + Math.sin(i * 0.8) * 1.8);
            ctx.stroke();
        }
    } else if (textureStyle === "oxidized_copper") {
        fillNoisyBase(ctx, size, hexToRgb(0x5f9f8d), 11, rng);
        drawSpeckles(ctx, size, 220, 0x3a6e63, 0.22, rng, 1, 2);
        drawSpeckles(ctx, size, 110, 0xbf7d55, 0.14, rng, 1, 1);
    } else if (textureStyle === "terracotta") {
        fillNoisyBase(ctx, size, hexToRgb(0xb66a4f), 12, rng);
        drawSpeckles(ctx, size, 180, 0x8e513d, 0.22, rng, 1, 2);
    } else if (textureStyle === "roof_tiles") {
        fillNoisyBase(ctx, size, hexToRgb(0x7f3d31), 10, rng);
        ctx.strokeStyle = "rgba(57, 24, 19, 0.44)";
        ctx.lineWidth = 2;
        for (let y = 0; y <= size; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }
    } else if (textureStyle === "white_plaster" || textureStyle === "pink_plaster") {
        const plasterBase = textureStyle === "pink_plaster" ? 0xe6c2ce : 0xf4efe8;
        fillNoisyBase(ctx, size, hexToRgb(plasterBase), 6, rng);
        drawSpeckles(ctx, size, 120, textureStyle === "pink_plaster" ? 0xd5aebc : 0xd4cfc8, 0.17, rng, 1, 1);
    } else if (textureStyle === "light_wood" || textureStyle === "reddish_wood") {
        const woodBase = textureStyle === "reddish_wood" ? 0x9a503f : 0xcfa97c;
        fillNoisyBase(ctx, size, hexToRgb(woodBase), 12, rng);
        for (let y = 0; y < size; y += 5) {
            const shade = textureStyle === "reddish_wood" ? 0.19 : 0.14;
            ctx.fillStyle = `rgba(66, 35, 24, ${shade + rng() * 0.08})`;
            ctx.fillRect(0, y, size, 2);
        }
    } else if (textureStyle === "pink_leaves") {
        fillNoisyBase(ctx, size, hexToRgb(0xc97da4), 18, rng);
        drawSpeckles(ctx, size, 260, 0xab648b, 0.24, rng, 1, 2);
        drawSpeckles(ctx, size, 120, 0xe5b8cf, 0.2, rng, 1, 1);
    } else if (textureStyle === "amber_glass" || textureStyle === "blue_glass") {
        const glassBase = textureStyle === "amber_glass" ? 0xe3a63f : 0x61a6e5;
        fillNoisyBase(ctx, size, hexToRgb(glassBase), 8, rng, 212);
        ctx.strokeStyle = "rgba(240, 250, 255, 0.38)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i += 1) {
            const x = 4 + i * 8 + Math.floor(rng() * 2);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + Math.sin(i) * 1.8, size);
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
const signFaceGeometry = new THREE.PlaneGeometry(0.62, 0.34);
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
const chunkOffsetsByRadiusCache = new Map();
const editedBlocks = new Map();
const editedColumnYIndex = new Map();
const columnCache = new Map();
const placedProps = new Map();
const propSpatialGrid = new Map();
const propTypeIndex = new Map(Object.values(PROP_TYPE).map((type) => [type, new Set()]));

const blockMeshes = [];
const decorativeFloraMeshes = [];
const removedDecorativeFloraColumns = new Set();
const blockPositionLookup = new Map();
const chunkBuildMatrixScratch = new THREE.Matrix4();
const floraInstancePositionScratch = new THREE.Vector3();
const floraInstanceScaleScratch = new THREE.Vector3();
const floraInstanceEulerScratch = new THREE.Euler();
const floraInstanceQuaternionScratch = new THREE.Quaternion();

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const cameraYawScratch = new THREE.Vector3();
const blockRayCenterNdc = new THREE.Vector2(0, 0);
const cameraForwardScratch = new THREE.Vector3();
const cameraRightScratch = new THREE.Vector3();
const moveVectorScratch = new THREE.Vector3();
const flightStepVectorScratch = new THREE.Vector3();
const worldUpVector = new THREE.Vector3(0, 1, 0);
const worldNormalScratch = new THREE.Vector3();
const blockSamplePointScratch = new THREE.Vector3();
const propSpatialQueryIds = new Set();
const propRaycastCandidates = [];
const tvOcclusionPropRaycastCandidates = [];
const tvOcclusionRaycaster = new THREE.Raycaster();
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
    mapOpen: false,
    pauseSettingsOpen: false,
    debugVisible: false,
    tutorialVisible: false,
    avatarPreviewOpen: false,
    flightEnabled: false,
    avatarPreviewAngle: 0,
    chunkRadius: INITIAL_CHUNK_RADIUS,
    chunkTick: 0,
    loadedChunkCount: 0,
    pendingChunkBuildCount: 0,
    lastChunkCenterCx: Number.NaN,
    lastChunkCenterCz: Number.NaN,
    lastForward: new THREE.Vector3(0, 0, -1),
    autoSaveTick: 0,
    playerStateSaveTick: 0,
    targetUiTick: 0,
    hudTick: 0,
    interactionPanelOpen: false
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
        dayNightRef: null,
        wildlifeRef: null
    },
    remotePlayers: new Map(),
    chunkEditSubscriptions: new Map(),
    propSnapshotUnsubscribe: null,
    wildlifeSnapshotUnsubscribe: null,
    sendIntervalMs: 120,
    lastBroadcastMs: 0,
    unsubscribers: [],
    pendingEditWrites: new Map(),
    pendingPropWrites: new Map(),
    writeTimerId: null,
    propWriteTimerId: null,
    wildlifeWriteTimerId: null,
    wildlifeLastPublishMs: 0,
    idleHeartbeatMs: 1200,
    lastSentState: null,
    isWildlifeAuthority: false,
    wildlifeSnapshotReady: false
};

const saveState = {
    dirty: false,
    writeTimerId: null,
    lastSavedAt: 0
};

const perfState = {
    dynamicPixelRatio: basePixelRatio,
    fpsEma: 60,
    frameMsEma: 16.7,
    adjustCooldown: 0,
    adaptiveEnabled: true,
    minPixelRatio: 0.72,
    qualityPreset: "auto",
    graphicsMode: INITIAL_GRAPHICS_MODE,
    graphicsDeviceLabel: INITIAL_GRAPHICS_DEVICE_LABEL,
    graphicsDeviceCategory: INITIAL_GRAPHICS_DEVICE_CATEGORY,
    graphicsContextPowerPreference: INITIAL_GRAPHICS_CONTEXT_POWER_PREFERENCE,
    statsTick: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    geometries: 0,
    textures: 0,
    chunkBuildCostEmaMs: 1.2,
    chunkLastBatchMs: 0
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
    lastShadowSunY: 0,
    fogSampleTimer: 0,
    fogNear: INITIAL_FOG_NEAR,
    fogFar: INITIAL_FOG_FAR,
    fogTargetNear: INITIAL_FOG_NEAR,
    fogTargetFar: INITIAL_FOG_FAR
};

const uiState = {
    toastHideTimerId: null,
    noSpaceToastAt: 0,
    lastCoordsText: "",
    lastChunkInfoText: "",
    tvPlacementSizeInches: 200
};

const mapState = {
    pin: null,
    homePin: null,
    mode: MAP_MODE.LOCAL,
    globalZoom: 1,
    globalCenterX: 0,
    globalCenterZ: 0,
    refreshTick: 0,
    sampleCanvas: null,
    sampleCtx: null,
    sampleImageData: null,
    globalCanvas: null,
    globalCtx: null,
    globalImageData: null,
    globalDirty: true
};

if (typeof document !== "undefined" && worldMapCtx) {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = MAP_RENDER_RESOLUTION;
    sampleCanvas.height = MAP_RENDER_RESOLUTION;
    const sampleCtx = sampleCanvas.getContext("2d", { alpha: false });
    if (sampleCtx) {
        mapState.sampleCanvas = sampleCanvas;
        mapState.sampleCtx = sampleCtx;
        mapState.sampleImageData = sampleCtx.createImageData(MAP_RENDER_RESOLUTION, MAP_RENDER_RESOLUTION);
    }

    const globalCanvas = document.createElement("canvas");
    globalCanvas.width = GLOBAL_MAP_RENDER_RESOLUTION;
    globalCanvas.height = GLOBAL_MAP_RENDER_RESOLUTION;
    const globalCtx = globalCanvas.getContext("2d", { alpha: false });
    if (globalCtx) {
        mapState.globalCanvas = globalCanvas;
        mapState.globalCtx = globalCtx;
        mapState.globalImageData = globalCtx.createImageData(GLOBAL_MAP_RENDER_RESOLUTION, GLOBAL_MAP_RENDER_RESOLUTION);
    }
}

const warnedUnknownBlockIds = new Set();
const warnedUnknownPropTypes = new Set();

const wildlifeState = {
    rabbits: new Map(),
    nextId: 1,
    spawnTimer: 5.2
};

const fishState = {
    fishes: new Map(),
    nextId: 1,
    spawnTimer: 3.6
};
const fishBoxGeometryCache = new Map();
const fishVariantMaterialCache = new Map();

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
    lastHarvestAt: 0,
    lastDecorRemovalAt: 0
};

const interactionState = {
    pose: null,
    localUsing: null,
    panelPropId: "",
    panelMode: "",
    panelNeedsRender: false,
    panelRefreshTick: 0,
    remoteUsingByProp: new Map(),
    previousRemoteUsingByProp: new Map(),
    localAudioContext: null,
    jukeboxLinkDraftByProp: new Map()
};

const jukeboxState = {
    customTracksByProp: new Map(),
    activeRuntimes: new Map(),
    recordingSession: null,
    spotifyApi: null,
    spotifyApiPromise: null,
    spotifyApiBootstrapDone: false,
    spotifyNoticeShown: false,
    youtubeApiPromise: null
};

const tvState = {
    activeRuntimes: new Map()
};

const tvProjectionCenterScratch = new THREE.Vector3();
const tvProjectionCameraScratch = new THREE.Vector3();
const tvProjectionScreenNormalScratch = new THREE.Vector3();
const tvProjectionToCameraScratch = new THREE.Vector3();
const tvProjectionCornerWorldScratch = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3()
];
const tvProjectionCornerScreenScratch = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3()
];
const TV_SCREEN_LOCAL_CORNERS_FALLBACK = Object.freeze([
    Object.freeze([-0.5, -0.5, 0.5]),
    Object.freeze([0.5, -0.5, 0.5]),
    Object.freeze([0.5, 0.5, 0.5]),
    Object.freeze([-0.5, 0.5, 0.5])
]);
const tvProjectionScreenHalfExtentsScratch = new THREE.Vector3(0.5, 0.5, 0.01);
const tvProjectionOcclusionSampleWorldScratch = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3()
];
const tvProjectionOcclusionDirectionScratch = new THREE.Vector3();
const tvTargetHudCameraPositionScratch = new THREE.Vector3();
const tvTargetHudCameraQuaternionScratch = new THREE.Quaternion();
const tvTargetHudAutoHideState = {
    eligible: false,
    initialized: false,
    idleSeconds: 0,
    hidden: false,
    lastCameraPosition: new THREE.Vector3(),
    lastCameraQuaternion: new THREE.Quaternion()
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
        if (candidate === "") {
            next.push("");
            continue;
        }
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

function createDefaultJukeboxTrackSlot() {
    return {
        type: "local",
        value: "",
        label: ""
    };
}

function sanitizeJukeboxTrackLabel(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 64);
}

function sanitizeJukeboxTrackSlot(rawSlot) {
    const fallback = createDefaultJukeboxTrackSlot();
    if (!rawSlot || typeof rawSlot !== "object") {
        return fallback;
    }

    const rawType = String(rawSlot.type || "local").toLowerCase();
    const label = sanitizeJukeboxTrackLabel(rawSlot.label);
    if (rawType === "recording") {
        const dataUrl = String(rawSlot.value || rawSlot.dataUrl || "").trim();
        if (
            dataUrl.startsWith("data:audio/")
            && dataUrl.length > 32
            && dataUrl.length <= JUKEBOX_RECORDING_MAX_DATA_URL_CHARS
        ) {
            return {
                type: "recording",
                value: dataUrl,
                label: label || "Grabacion"
            };
        }
        return fallback;
    }

    if (rawType === "spotify") {
        const spotifyUri = sanitizeSpotifyUri(rawSlot.value || rawSlot.uri || rawSlot.url || "");
        if (spotifyUri) {
            return {
                type: "spotify",
                value: spotifyUri,
                label: label || `Spotify ${spotifyUri.split(":").pop()}`
            };
        }
        return fallback;
    }

    if (rawType === "youtube") {
        const youtubeId = sanitizeYouTubeVideoId(rawSlot.value || rawSlot.id || rawSlot.url || "");
        if (youtubeId) {
            return {
                type: "youtube",
                value: youtubeId,
                label: label || `YouTube ${youtubeId}`
            };
        }
        return fallback;
    }

    return {
        type: "local",
        value: "",
        label
    };
}

function sanitizeJukeboxTrackSlots(rawSlots) {
    const normalized = [];
    for (let i = 0; i < JUKEBOX_TRACK_COUNT; i += 1) {
        normalized.push(sanitizeJukeboxTrackSlot(Array.isArray(rawSlots) ? rawSlots[i] : null));
    }
    return normalized;
}

function loadJukeboxCustomTracksFromStorage() {
    jukeboxState.customTracksByProp.clear();

    let parsed = null;
    try {
        const raw = window.localStorage.getItem(JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY);
        if (raw) {
            parsed = JSON.parse(raw);
        }
    } catch (error) {
        parsed = null;
    }

    if (!parsed || typeof parsed !== "object") {
        return;
    }

    for (const [propId, rawSlots] of Object.entries(parsed)) {
        const id = String(propId || "");
        if (!id) {
            continue;
        }
        const slots = sanitizeJukeboxTrackSlots(rawSlots);
        const hasCustomSlot = slots.some((slot) => slot.type !== "local" || Boolean(slot.label));
        if (hasCustomSlot) {
            jukeboxState.customTracksByProp.set(id, slots);
        }
    }
}

function persistJukeboxCustomTracksToStorage() {
    try {
        if (jukeboxState.customTracksByProp.size === 0) {
            window.localStorage.removeItem(JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY);
            return;
        }

        const payload = {};
        for (const [propId, slots] of jukeboxState.customTracksByProp.entries()) {
            const id = String(propId || "");
            if (!id) {
                continue;
            }
            const sanitizedSlots = sanitizeJukeboxTrackSlots(slots);
            const hasCustomSlot = sanitizedSlots.some((slot) => slot.type !== "local" || Boolean(slot.label));
            if (hasCustomSlot) {
                payload[id] = sanitizedSlots;
            }
        }

        if (Object.keys(payload).length === 0) {
            window.localStorage.removeItem(JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
    }
}

function getJukeboxTrackSlotsForProp(propId, createIfMissing = true) {
    const id = String(propId || "");
    if (!id) {
        return sanitizeJukeboxTrackSlots(null);
    }

    const placed = placedProps.get(id);
    if (!placed || placed.propType !== PROP_TYPE.JUKEBOX) {
        if (!createIfMissing) {
            return sanitizeJukeboxTrackSlots(null);
        }
        const fallbackSlots = sanitizeJukeboxTrackSlots(jukeboxState.customTracksByProp.get(id));
        return fallbackSlots;
    }

    const safeState = normalizePropSharedState(placed.propType, placed.state, placed.state)
        || getPropDefaultSharedState(placed.propType)
        || {};
    const slots = sanitizeJukeboxTrackSlots(safeState.tracks);
    const legacySlots = sanitizeJukeboxTrackSlots(jukeboxState.customTracksByProp.get(id));
    if (hasCustomJukeboxTrackSlots(legacySlots) && !hasCustomJukeboxTrackSlots(slots)) {
        if (createIfMissing) {
            updatePropSharedState(id, { tracks: legacySlots }, "");
            if (jukeboxState.customTracksByProp.delete(id)) {
                persistJukeboxCustomTracksToStorage();
            }
        }
        return legacySlots;
    }
    if (!areStateValuesEqual(placed.state?.tracks, slots)) {
        placed.state = {
            ...(placed.state || {}),
            ...safeState,
            tracks: slots
        };
    }
    return slots;
}

function getJukeboxTrackSlot(propId, track) {
    const trackIndex = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT) - 1;
    const slots = getJukeboxTrackSlotsForProp(propId, false);
    return sanitizeJukeboxTrackSlot(slots[trackIndex]);
}

function setJukeboxTrackSlot(propId, track, rawSlot) {
    const id = String(propId || "");
    if (!id) {
        return false;
    }

    const trackIndex = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT) - 1;
    const slots = getJukeboxTrackSlotsForProp(id, true).map((slot) => sanitizeJukeboxTrackSlot(slot));
    slots[trackIndex] = sanitizeJukeboxTrackSlot(rawSlot);
    const applied = updatePropSharedState(id, { tracks: slots }, "");
    if (!applied) {
        return false;
    }

    if (jukeboxState.customTracksByProp.delete(id)) {
        persistJukeboxCustomTracksToStorage();
    }
    return true;
}

function clearJukeboxTrackSlot(propId, track) {
    return setJukeboxTrackSlot(propId, track, createDefaultJukeboxTrackSlot());
}

function encodeJukeboxSourceFromTrackSlot(slot, track) {
    const safeTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT);
    if (slot?.type === "spotify") {
        const spotifyUri = sanitizeSpotifyUri(slot.value);
        if (spotifyUri) {
            return `${JUKEBOX_SOURCE_PREFIX_SPOTIFY}${spotifyUri}`;
        }
    }
    if (slot?.type === "youtube") {
        const youtubeId = sanitizeYouTubeVideoId(slot.value);
        if (youtubeId) {
            return `${JUKEBOX_SOURCE_PREFIX_YOUTUBE}${youtubeId}`;
        }
    }
    if (slot?.type === "recording") {
        return `${JUKEBOX_SOURCE_PREFIX_RECORDING}${safeTrack}`;
    }
    return JUKEBOX_SOURCE_DEFAULT;
}

function getJukeboxTrackDisplayLabel(slot, track) {
    const safeTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT);
    const safeSlot = sanitizeJukeboxTrackSlot(slot);
    if (safeSlot.type === "recording") {
        return safeSlot.label || `Grabacion ${safeTrack}`;
    }
    if (safeSlot.type === "spotify") {
        return safeSlot.label || `Spotify ${safeTrack}`;
    }
    if (safeSlot.type === "youtube") {
        return safeSlot.label || `YouTube ${safeTrack}`;
    }
    return `Pista ${safeTrack}`;
}

function resolveJukeboxTrackDescriptor(propId, track, sourceValue = JUKEBOX_SOURCE_DEFAULT) {
    const safeTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT);
    const slot = getJukeboxTrackSlot(propId, safeTrack);
    const normalizedSource = sanitizeJukeboxSource(sourceValue, JUKEBOX_SOURCE_DEFAULT);
    if (normalizedSource.startsWith(JUKEBOX_SOURCE_PREFIX_SPOTIFY)) {
        const spotifyUri = sanitizeSpotifyUri(normalizedSource.slice(JUKEBOX_SOURCE_PREFIX_SPOTIFY.length));
        if (spotifyUri) {
            return {
                type: "spotify",
                sourceKey: `${JUKEBOX_SOURCE_PREFIX_SPOTIFY}${spotifyUri}`,
                spotifyUri,
                label: slot.type === "spotify" ? getJukeboxTrackDisplayLabel(slot, safeTrack) : `Spotify ${safeTrack}`
            };
        }
    }

    if (normalizedSource.startsWith(JUKEBOX_SOURCE_PREFIX_YOUTUBE)) {
        const youtubeId = sanitizeYouTubeVideoId(normalizedSource.slice(JUKEBOX_SOURCE_PREFIX_YOUTUBE.length));
        if (youtubeId) {
            return {
                type: "youtube",
                sourceKey: `${JUKEBOX_SOURCE_PREFIX_YOUTUBE}${youtubeId}`,
                youtubeId,
                label: slot.type === "youtube" ? getJukeboxTrackDisplayLabel(slot, safeTrack) : `YouTube ${safeTrack}`
            };
        }
    }

    if (normalizedSource.startsWith(JUKEBOX_SOURCE_PREFIX_RECORDING)) {
        const sourceTrack = sanitizeJukeboxTrack(normalizedSource.slice(JUKEBOX_SOURCE_PREFIX_RECORDING.length));
        if (sourceTrack === safeTrack && slot.type === "recording" && slot.value) {
            return {
                type: "recording",
                sourceKey: `${JUKEBOX_SOURCE_PREFIX_RECORDING}${safeTrack}`,
                dataUrl: slot.value,
                label: getJukeboxTrackDisplayLabel(slot, safeTrack)
            };
        }
    }

    if (slot.type === "spotify") {
        const spotifyUri = sanitizeSpotifyUri(slot.value);
        if (spotifyUri) {
            return {
                type: "spotify",
                sourceKey: `${JUKEBOX_SOURCE_PREFIX_SPOTIFY}${spotifyUri}`,
                spotifyUri,
                label: getJukeboxTrackDisplayLabel(slot, safeTrack)
            };
        }
    }

    if (slot.type === "youtube") {
        const youtubeId = sanitizeYouTubeVideoId(slot.value);
        if (youtubeId) {
            return {
                type: "youtube",
                sourceKey: `${JUKEBOX_SOURCE_PREFIX_YOUTUBE}${youtubeId}`,
                youtubeId,
                label: getJukeboxTrackDisplayLabel(slot, safeTrack)
            };
        }
    }

    if (slot.type === "recording" && slot.value) {
        return {
            type: "recording",
            sourceKey: `${JUKEBOX_SOURCE_PREFIX_RECORDING}${safeTrack}`,
            dataUrl: slot.value,
            label: getJukeboxTrackDisplayLabel(slot, safeTrack)
        };
    }

    return {
        type: "local",
        sourceKey: JUKEBOX_SOURCE_DEFAULT,
        label: getJukeboxTrackDisplayLabel(slot, safeTrack)
    };
}

function sanitizeStoredPlayerState(rawPayload) {
    if (!rawPayload || typeof rawPayload !== "object") {
        return null;
    }

    const x = Number(rawPayload.x);
    const yRaw = Number(rawPayload.y);
    const z = Number(rawPayload.z);
    if (!Number.isFinite(x) || !Number.isFinite(yRaw) || !Number.isFinite(z)) {
        return null;
    }

    const y = THREE.MathUtils.clamp(yRaw, 0.01, WORLD_MAX_Y - PLAYER_HEIGHT - 0.02);
    const yaw = normalizeYawRadians(rawPayload.yaw);
    const pitch = THREE.MathUtils.clamp(Number(rawPayload.pitch) || 0, -1.35, 1.35);

    let pose = null;
    if (rawPayload.pose && typeof rawPayload.pose === "object") {
        const propId = String(rawPayload.pose.propId || "");
        const mode = normalizePoseMode(rawPayload.pose.mode);
        if (propId && mode) {
            pose = { propId, mode };
        }
    }

    return { x, y, z, yaw, pitch, pose };
}

function loadPlayerStateSnapshot() {
    try {
        const raw = window.localStorage.getItem(PLAYER_STATE_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        return sanitizeStoredPlayerState(parsed);
    } catch (error) {
        return null;
    }
}

function resolveRestoredPlayerPosition(savedState) {
    const x = Number(savedState?.x);
    const y = Number(savedState?.y);
    const z = Number(savedState?.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }

    if (!collidesAt(x, y, z)) {
        return { x, y, z };
    }

    for (let step = 1; step <= 12; step += 1) {
        const candidateY = y + step * 0.2;
        if (candidateY > WORLD_MAX_Y - PLAYER_HEIGHT - 0.02) {
            break;
        }
        if (!collidesAt(x, candidateY, z)) {
            return { x, y: candidateY, z };
        }
    }

    return null;
}

function persistPlayerStateSnapshot(force = false) {
    if (!state.worldReady) {
        return;
    }
    if (!force && state.playerStateSaveTick < PLAYER_STATE_SAVE_INTERVAL_SECONDS) {
        return;
    }

    state.playerStateSaveTick = 0;
    const pose = interactionState.pose
        ? {
            propId: String(interactionState.pose.propId || ""),
            mode: normalizePoseMode(interactionState.pose.mode)
        }
        : null;

    const payload = {
        version: 1,
        updatedAt: Date.now(),
        x: Number(state.playerPosition.x.toFixed(3)),
        y: Number(state.playerPosition.y.toFixed(3)),
        z: Number(state.playerPosition.z.toFixed(3)),
        yaw: Number(normalizeYawRadians(controls.getObject().rotation.y || 0).toFixed(4)),
        pitch: Number(THREE.MathUtils.clamp(Number(camera.rotation.x) || 0, -1.35, 1.35).toFixed(4))
    };
    if (pose?.propId && pose.mode) {
        payload.pose = pose;
    }

    try {
        window.localStorage.setItem(PLAYER_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
    }
}

function restoreLocalPlayerStateFromSnapshot(savedState) {
    const snapshot = sanitizeStoredPlayerState(savedState);
    if (!snapshot) {
        return false;
    }

    const resolvedPosition = resolveRestoredPlayerPosition(snapshot);
    if (!resolvedPosition) {
        return false;
    }

    state.playerPosition.set(resolvedPosition.x, resolvedPosition.y, resolvedPosition.z);
    controls.getObject().rotation.y = snapshot.yaw;
    camera.rotation.x = snapshot.pitch;
    state.velocityY = 0;
    updateOnGroundFlag();

    if (snapshot.pose?.propId && snapshot.pose.mode && placedProps.has(snapshot.pose.propId)) {
        setLocalPoseActivity(snapshot.pose.propId, snapshot.pose.mode, false);
        if (snapshot.pose.mode === "lie") {
            camera.rotation.x = -0.08;
        }
        updateLocalPoseLock();
    }

    controls.getObject().position.set(
        state.playerPosition.x,
        state.playerPosition.y + EYE_HEIGHT,
        state.playerPosition.z
    );
    return true;
}

function getHotbarItemByIndex(index) {
    const safeIndex = THREE.MathUtils.clamp(Math.floor(Number(index) || 0), 0, HOTBAR_SIZE - 1);
    const itemId = state.hotbarItemIds[safeIndex];
    if (!itemId) {
        return null;
    }
    return INVENTORY_ITEM_BY_ID.get(itemId) || null;
}

function getSelectedHotbarItem() {
    return getHotbarItemByIndex(state.selectedHotbarIndex);
}

function getInventoryItemTint(item) {
    return getInventoryItemTintByDefinition(item, BLOCK_COLORS);
}

function normalizeInventoryCategoryForQuickFill(category) {
    const raw = String(category || "").toLowerCase();
    if (INVENTORY_CATEGORY_ORDER.includes(raw)) {
        return raw;
    }
    return INVENTORY_CATEGORY.CONSTRUCTION;
}

function getInventoryItemIdsForCategory(category) {
    const normalized = normalizeInventoryCategoryForQuickFill(category);
    return INVENTORY_ITEMS
        .filter((item) => item.category === normalized)
        .map((item) => item.id);
}

function populateInventoryCategoryQuickFillOptions() {
    if (!inventoryCategoryQuickFillSelectEl) {
        return;
    }
    if (inventoryCategoryQuickFillSelectEl.options.length > 0) {
        return;
    }
    for (const category of INVENTORY_CATEGORY_ORDER) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = INVENTORY_CATEGORY_LABELS[category] || category;
        inventoryCategoryQuickFillSelectEl.appendChild(option);
    }
    inventoryCategoryQuickFillSelectEl.value = INVENTORY_CATEGORY.CONSTRUCTION;
}

function applyHotbarCategoryQuickFill(category, showFeedback = true) {
    const normalized = normalizeInventoryCategoryForQuickFill(category);
    const categoryIds = getInventoryItemIdsForCategory(normalized);
    if (categoryIds.length === 0) {
        if (showFeedback) {
            showToast("Esa seccion no tiene items disponibles", "warning", 1000);
        }
        return false;
    }

    const nextSlots = new Array(HOTBAR_SIZE).fill("");
    for (let i = 0; i < HOTBAR_SIZE && i < categoryIds.length; i += 1) {
        nextSlots[i] = categoryIds[i];
    }

    state.hotbarItemIds = nextSlots;
    const firstFilledIndex = state.hotbarItemIds.findIndex((itemId) => Boolean(itemId));
    state.selectedHotbarIndex = firstFilledIndex >= 0 ? firstFilledIndex : 0;
    saveHotbarConfiguration();
    refreshHotbarUi();

    if (showFeedback) {
        const categoryLabel = INVENTORY_CATEGORY_LABELS[normalized] || normalized;
        const loadedCount = Math.min(HOTBAR_SIZE, categoryIds.length);
        showToast(`Barra cargada: ${categoryLabel} (${loadedCount}/${HOTBAR_SIZE})`, "success", 1300);
    }
    return true;
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

function syncCameraViewDistanceWithChunkRadius() {
    const baseViewDistance = getBaseViewDistanceForChunkRadius(state.chunkRadius);
    const targetFar = THREE.MathUtils.clamp(baseViewDistance + CAMERA_FAR_PADDING, CAMERA_MIN_FAR, CAMERA_MAX_FAR);
    if (Math.abs(camera.far - targetFar) > 0.5) {
        camera.far = targetFar;
        camera.updateProjectionMatrix();
    }
}

function resolveGraphicsModeUiLabel(mode) {
    if (mode === GRAPHICS_MODE.DEDICATED) return "preferir dedicada";
    if (mode === GRAPHICS_MODE.INTEGRATED) return "preferir integrada";
    if (mode === GRAPHICS_MODE.SOFTWARE) return "software";
    return "auto";
}

function buildGraphicsModeHelpText() {
    const modeLabel = resolveGraphicsModeUiLabel(perfState.graphicsMode);
    const contextPowerPreference = String(perfState.graphicsContextPowerPreference || "default");
    const category = String(perfState.graphicsDeviceCategory || "unknown");
    const baseMessage = `Modo GPU: ${modeLabel}. Contexto WebGL: ${contextPowerPreference}. En web esto es una sugerencia al navegador/SO.`;

    if (perfState.graphicsMode === GRAPHICS_MODE.DEDICATED && category !== "dedicated") {
        return `${baseMessage} Si quieres forzar dedicada: Windows > Sistema > Pantalla > Graficos > navegador > Alto rendimiento, activar aceleracion por hardware y reiniciar el navegador.`;
    }

    if (perfState.graphicsMode === GRAPHICS_MODE.INTEGRATED && category === "dedicated") {
        return `${baseMessage} El sistema priorizo GPU dedicada; ajusta el navegador en Graficos de Windows a "Ahorro de energia" si necesitas integrada.`;
    }

    return baseMessage;
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
    if (graphicsModeSelectEl) {
        graphicsModeSelectEl.value = perfState.graphicsMode;
    }
    if (graphicsModeHelpEl) {
        graphicsModeHelpEl.textContent = buildGraphicsModeHelpText();
    }
    if (graphicsDeviceLabelEl) {
        const categoryLabel = getGraphicsDeviceCategoryLabel(perfState.graphicsDeviceCategory);
        graphicsDeviceLabelEl.textContent = `GPU activa: ${perfState.graphicsDeviceLabel || "No disponible"} | Tipo: ${categoryLabel} | Contexto: ${perfState.graphicsContextPowerPreference}`;
    }

    if (flightModeToggleEl) {
        flightModeToggleEl.checked = state.flightEnabled;
    }
    if (flightModeValueEl) {
        flightModeValueEl.textContent = state.flightEnabled ? "Activado" : "Desactivado";
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

function setGraphicsMode(mode, persist = true, showFeedback = false) {
    const normalized = normalizeGraphicsMode(mode);
    const changed = normalized !== perfState.graphicsMode;
    perfState.graphicsMode = normalized;
    perfState.graphicsContextPowerPreference = detectGraphicsContextPowerPreference(renderer);
    perfState.graphicsDeviceLabel = detectGraphicsDeviceLabelFromRenderer(renderer);
    perfState.graphicsDeviceCategory = classifyGraphicsAdapterLabel(perfState.graphicsDeviceLabel);

    if (persist) {
        writeStorageValue(GRAPHICS_MODE_STORAGE_KEY, normalized);
    }

    updateGameplaySettingsUi();

    if (!showFeedback) {
        return;
    }

    if (normalized === GRAPHICS_MODE.SOFTWARE) {
        showToast("Modo software: desactiva aceleracion por hardware en el navegador y recarga", "info", 2600);
        return;
    }

    const label = normalized === GRAPHICS_MODE.DEDICATED
        ? "preferir GPU dedicada"
        : normalized === GRAPHICS_MODE.INTEGRATED
            ? "preferir GPU integrada"
            : "auto";
    showToast(`Preferencia GPU: ${label}${changed ? " (requiere recarga)" : ""}. En web no se puede forzar desde JavaScript.`, "info", 2600);
    if (changed) {
        let shouldReload = false;
        try {
            shouldReload = window.confirm("Para aplicar la nueva preferencia GPU debes recargar. Recargar ahora?");
        } catch (error) {
            shouldReload = false;
        }
        if (shouldReload) {
            window.location.reload();
        }
    }
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

function ensureSafePlayerPositionAfterFlight() {
    if (!collidesAt(state.playerPosition.x, state.playerPosition.y, state.playerPosition.z)) {
        return;
    }

    for (let step = 1; step <= 30; step += 1) {
        const candidateY = state.playerPosition.y + step * 0.2;
        if (candidateY > WORLD_MAX_Y - PLAYER_HEIGHT - 0.02) {
            break;
        }
        if (!collidesAt(state.playerPosition.x, candidateY, state.playerPosition.z)) {
            state.playerPosition.y = candidateY;
            return;
        }
    }

    const spawn = findSpawnPoint();
    state.playerPosition.copy(spawn);
}

function setFlightMode(enabled, persist = true, showFeedback = false) {
    const next = Boolean(enabled);
    if (next === state.flightEnabled) {
        updateGameplaySettingsUi();
        return;
    }

    state.flightEnabled = next;
    state.velocityY = 0;
    if (!state.flightEnabled) {
        ensureSafePlayerPositionAfterFlight();
        updateOnGroundFlag();
    } else {
        state.onGround = false;
    }

    if (persist) {
        writeStorageValue(FLIGHT_MODE_STORAGE_KEY, state.flightEnabled ? "1" : "0");
    }
    updateGameplaySettingsUi();

    if (showFeedback) {
        showToast(
            state.flightEnabled ? "Modo vuelo activado" : "Modo vuelo desactivado",
            "info",
            1100
        );
    }
}

function loadGameplayPreferences() {
    const storedChunkRadius = clampInt(
        readStorageNumber(CHUNK_RADIUS_STORAGE_KEY, state.chunkRadius),
        CHUNK_RADIUS_MIN,
        CHUNK_RADIUS_MAX
    );
    state.chunkRadius = storedChunkRadius;
    syncCameraViewDistanceWithChunkRadius();

    const storedPointerSensitivity = readStorageNumber(POINTER_SENSITIVITY_STORAGE_KEY, DEFAULT_POINTER_SPEED);
    setPointerSensitivity(storedPointerSensitivity, false, false);

    const storedQualityPreset = readStorageString(QUALITY_PRESET_STORAGE_KEY, "auto");
    setQualityPreset(storedQualityPreset, false, false);
    const storedGraphicsMode = readStorageString(GRAPHICS_MODE_STORAGE_KEY, INITIAL_GRAPHICS_MODE);
    setGraphicsMode(storedGraphicsMode, false, false);
    const storedFlightMode = readStorageBoolean(FLIGHT_MODE_STORAGE_KEY, false);
    setFlightMode(storedFlightMode, false, false);

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

function sanitizeMapPin(rawPin) {
    if (!rawPin || typeof rawPin !== "object") {
        return null;
    }
    const x = Number(rawPin.x);
    const z = Number(rawPin.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return null;
    }
    return {
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        createdAt: Number(rawPin.createdAt) || Date.now()
    };
}

function loadStoredMapPin(storageKey) {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }
        return sanitizeMapPin(JSON.parse(raw));
    } catch (error) {
        return null;
    }
}

function persistStoredMapPin(storageKey, pinValue) {
    try {
        if (!pinValue) {
            window.localStorage.removeItem(storageKey);
            return;
        }
        window.localStorage.setItem(storageKey, JSON.stringify(pinValue));
    } catch (error) {
    }
}

function loadMapPinFromStorage() {
    mapState.pin = loadStoredMapPin(MAP_PIN_STORAGE_KEY);
    mapState.homePin = loadStoredMapPin(MAP_HOME_PIN_STORAGE_KEY);
}

function persistMapPinToStorage() {
    persistStoredMapPin(MAP_PIN_STORAGE_KEY, mapState.pin);
}

function persistMapHomePinToStorage() {
    persistStoredMapPin(MAP_HOME_PIN_STORAGE_KEY, mapState.homePin);
}

function projectWorldToMap(x, z, centerX, centerZ, rangeBlocks, width, height) {
    const safeRange = Math.max(1, Number(rangeBlocks) || MAP_VIEW_RADIUS_BLOCKS);
    const relX = (Number(x) - centerX) / safeRange;
    const relZ = (Number(z) - centerZ) / safeRange;
    const drawX = ((relX + 1) * 0.5) * width;
    const drawY = ((relZ + 1) * 0.5) * height;
    return {
        x: THREE.MathUtils.clamp(drawX, 0, width),
        y: THREE.MathUtils.clamp(drawY, 0, height),
        inside: relX >= -1 && relX <= 1 && relZ >= -1 && relZ <= 1
    };
}

function unprojectMapToWorld(mapX, mapY, centerX, centerZ, rangeBlocks, width, height) {
    const safeRange = Math.max(1, Number(rangeBlocks) || MAP_VIEW_RADIUS_BLOCKS);
    const normalizedX = THREE.MathUtils.clamp((Number(mapX) || 0) / Math.max(1, Number(width) || 1), 0, 1);
    const normalizedY = THREE.MathUtils.clamp((Number(mapY) || 0) / Math.max(1, Number(height) || 1), 0, 1);
    const worldX = centerX + (normalizedX * 2 - 1) * safeRange;
    const worldZ = centerZ + (normalizedY * 2 - 1) * safeRange;
    return {
        x: Number(worldX.toFixed(2)),
        z: Number(worldZ.toFixed(2))
    };
}

function getCompassDirectionFromDelta(dx, dz) {
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || (Math.abs(dx) + Math.abs(dz)) < 1e-5) {
        return "aqui";
    }
    const angle = Math.atan2(dx, dz);
    const sectors = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
    const index = Math.round(normalized / (Math.PI / 4)) % sectors.length;
    return sectors[index];
}

function getMapTerrainColor(column) {
    const height = Number(column?.height) || SEA_LEVEL;
    const biome = String(column?.biome || BIOME.PLAINS);
    const mountainMask = THREE.MathUtils.clamp(Number(column?.mountainMask) || 0, 0, 1);
    const snowMask = THREE.MathUtils.clamp(Number(column?.snowMask) || 0, 0, 1);
    const rockiness = THREE.MathUtils.clamp(Number(column?.rockiness) || 0, 0, 1);
    const moisture = THREE.MathUtils.clamp((Number(column?.moisture) || 0) * 0.5 + 0.5, 0, 1);
    const temperature = THREE.MathUtils.clamp((Number(column?.temperature) || 0) * 0.5 + 0.5, 0, 1);

    if (height < SEA_LEVEL) {
        const depth = clamp01((SEA_LEVEL - height + 6) / 64);
        return {
            r: clampByte(34 + depth * 22),
            g: clampByte(88 + depth * 32),
            b: clampByte(150 + depth * 54)
        };
    }

    let color;
    if ((snowMask > 0.52 && height >= SEA_LEVEL + 16) || biome === BIOME.CORDILLERA) {
        const coldShade = clamp01((height - SEA_LEVEL - 16) / 220);
        color = {
            r: clampByte(228 - coldShade * 28),
            g: clampByte(235 - coldShade * 24),
            b: clampByte(244 - coldShade * 16)
        };
    } else if (biome === BIOME.DESERT) {
        const warmShade = clamp01((height - SEA_LEVEL + 8) / 120);
        color = {
            r: clampByte(202 + warmShade * 10),
            g: clampByte(177 - warmShade * 18),
            b: clampByte(120 - warmShade * 24)
        };
    } else if (biome === BIOME.VOLCANIC) {
        const lavaHint = clamp01(
            (Number(column?.volcanicMask) || 0) * 0.58
            + (Number(column?.craterMask) || 0) * 0.96
            + (Number(column?.lavaChannelMask) || 0) * 0.82
        );
        color = {
            r: clampByte(118 + lavaHint * 124),
            g: clampByte(58 + lavaHint * 38),
            b: clampByte(34 - lavaHint * 14)
        };
    } else if (biome === BIOME.COAST) {
        color = {
            r: clampByte(184 + moisture * 12),
            g: clampByte(170 + moisture * 24),
            b: clampByte(119 + moisture * 12)
        };
    } else if (biome === BIOME.FOREST) {
        const canopy = moisture * 0.38 + (1 - temperature) * 0.12;
        color = {
            r: clampByte(46 + canopy * 18),
            g: clampByte(106 + canopy * 44),
            b: clampByte(44 + canopy * 13)
        };
    } else {
        const grassy = moisture * 0.3 + temperature * 0.16;
        color = {
            r: clampByte(66 + grassy * 20),
            g: clampByte(128 + grassy * 36),
            b: clampByte(62 + grassy * 14)
        };
    }

    if (rockiness > 0.78 && biome !== BIOME.DESERT && biome !== BIOME.FOREST && biome !== BIOME.VOLCANIC) {
        const rockyMix = clamp01((rockiness - 0.78) / 0.22) * 0.62;
        color = {
            r: clampByte(lerp(color.r, 124, rockyMix)),
            g: clampByte(lerp(color.g, 128, rockyMix)),
            b: clampByte(lerp(color.b, 134, rockyMix))
        };
    }

    const altitude = clamp01((height - SEA_LEVEL) / Math.max(1, WORLD_MAX_Y - SEA_LEVEL));
    const mountainShade = mountainMask * 0.3 + altitude * 0.26;
    return {
        r: clampByte(color.r - mountainShade * 22),
        g: clampByte(color.g - mountainShade * 26),
        b: clampByte(color.b - mountainShade * 20)
    };
}

function getBiomeLabel(biomeId) {
    const key = String(biomeId || "");
    return BIOME_LABELS[key] || BIOME_LABELS[BIOME.PLAINS];
}

function normalizeMapMode(mode) {
    return String(mode || "").toLowerCase() === MAP_MODE.GLOBAL ? MAP_MODE.GLOBAL : MAP_MODE.LOCAL;
}

function isMapBlockingGameplay() {
    return state.mapOpen && normalizeMapMode(mapState.mode) === MAP_MODE.GLOBAL;
}

function getMapCenterForMode(mode) {
    if (normalizeMapMode(mode) === MAP_MODE.GLOBAL) {
        return getGlobalMapCenter();
    }
    return {
        x: Number(state.playerPosition.x) || 0,
        z: Number(state.playerPosition.z) || 0
    };
}

function getMapRangeForMode(mode) {
    return normalizeMapMode(mode) === MAP_MODE.GLOBAL
        ? GLOBAL_MAP_VIEW_RADIUS_BLOCKS
        : MAP_VIEW_RADIUS_BLOCKS;
}

function getMapEffectiveRange(mode) {
    const baseRange = getMapRangeForMode(mode);
    if (normalizeMapMode(mode) !== MAP_MODE.GLOBAL) {
        return baseRange;
    }
    const zoom = THREE.MathUtils.clamp(Number(mapState.globalZoom) || 1, GLOBAL_MAP_MIN_ZOOM, GLOBAL_MAP_MAX_ZOOM);
    return baseRange / zoom;
}

function clampGlobalMapCenter(centerX, centerZ, effectiveRange = getMapEffectiveRange(MAP_MODE.GLOBAL)) {
    const baseRange = GLOBAL_MAP_VIEW_RADIUS_BLOCKS;
    const safeRange = THREE.MathUtils.clamp(
        Number(effectiveRange) || baseRange,
        1,
        baseRange
    );
    const maxOffset = Math.max(0, baseRange - safeRange);
    return {
        x: THREE.MathUtils.clamp(Number(centerX) || 0, -maxOffset, maxOffset),
        z: THREE.MathUtils.clamp(Number(centerZ) || 0, -maxOffset, maxOffset)
    };
}

function setGlobalMapCenter(centerX, centerZ, effectiveRange = getMapEffectiveRange(MAP_MODE.GLOBAL)) {
    const clamped = clampGlobalMapCenter(centerX, centerZ, effectiveRange);
    mapState.globalCenterX = clamped.x;
    mapState.globalCenterZ = clamped.z;
}

function getGlobalMapCenter() {
    return clampGlobalMapCenter(mapState.globalCenterX, mapState.globalCenterZ);
}

function updateMapModeButtons() {
    const isGlobal = mapState.mode === MAP_MODE.GLOBAL;
    if (mapModeLocalButtonEl) {
        mapModeLocalButtonEl.classList.toggle("active", !isGlobal);
        mapModeLocalButtonEl.setAttribute("aria-pressed", !isGlobal ? "true" : "false");
    }
    if (mapModeGlobalButtonEl) {
        mapModeGlobalButtonEl.classList.toggle("active", isGlobal);
        mapModeGlobalButtonEl.setAttribute("aria-pressed", isGlobal ? "true" : "false");
    }
}

function ensureMapCanvasResolution(mode) {
    if (!worldMapCanvasEl) {
        return;
    }
    const normalizedMode = normalizeMapMode(mode);
    const targetSize = normalizedMode === MAP_MODE.GLOBAL ? 920 : 360;
    if (worldMapCanvasEl.width !== targetSize || worldMapCanvasEl.height !== targetSize) {
        worldMapCanvasEl.width = targetSize;
        worldMapCanvasEl.height = targetSize;
    }
}

function updateMapPanelLayout() {
    if (!mapPanelEl) {
        return;
    }
    const isGlobal = mapState.mode === MAP_MODE.GLOBAL;
    mapPanelEl.classList.toggle("global-mode", isGlobal && state.mapOpen);
}

function renderLocalMapBase(centerX, centerZ, range, canvasWidth, canvasHeight) {
    if (mapState.sampleCtx && mapState.sampleCanvas && mapState.sampleImageData) {
        const imageData = mapState.sampleImageData;
        const data = imageData.data;
        const resolution = MAP_RENDER_RESOLUTION;
        const pixelToWorld = (range * 2) / resolution;
        let ptr = 0;
        for (let py = 0; py < resolution; py += 1) {
            const worldZ = centerZ + (py - resolution * 0.5 + 0.5) * pixelToWorld;
            for (let px = 0; px < resolution; px += 1) {
                const worldX = centerX + (px - resolution * 0.5 + 0.5) * pixelToWorld;
                const column = getColumnInfo(Math.floor(worldX), Math.floor(worldZ));
                const color = getMapTerrainColor(column);
                data[ptr] = color.r;
                data[ptr + 1] = color.g;
                data[ptr + 2] = color.b;
                data[ptr + 3] = 255;
                ptr += 4;
            }
        }
        mapState.sampleCtx.putImageData(imageData, 0, 0);
        worldMapCtx.imageSmoothingEnabled = false;
        worldMapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        worldMapCtx.drawImage(mapState.sampleCanvas, 0, 0, canvasWidth, canvasHeight);
        return;
    }

    worldMapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    worldMapCtx.fillStyle = "#2f5841";
    worldMapCtx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function ensureGlobalMapImage() {
    if (!mapState.globalCtx || !mapState.globalCanvas || !mapState.globalImageData) {
        return false;
    }
    if (!mapState.globalDirty) {
        return true;
    }

    const imageData = mapState.globalImageData;
    const data = imageData.data;
    const resolution = GLOBAL_MAP_RENDER_RESOLUTION;
    const worldRange = GLOBAL_MAP_VIEW_RADIUS_BLOCKS;
    let ptr = 0;

    for (let py = 0; py < resolution; py += 1) {
        const worldZ = ((py + 0.5) / resolution * 2 - 1) * worldRange;
        for (let px = 0; px < resolution; px += 1) {
            const worldX = ((px + 0.5) / resolution * 2 - 1) * worldRange;
            const column = getColumnInfo(Math.floor(worldX), Math.floor(worldZ));
            const color = getMapTerrainColor(column);
            data[ptr] = color.r;
            data[ptr + 1] = color.g;
            data[ptr + 2] = color.b;
            data[ptr + 3] = 255;
            ptr += 4;
        }
    }

    mapState.globalCtx.putImageData(imageData, 0, 0);
    mapState.globalDirty = false;
    return true;
}

function renderGlobalMapBase(canvasWidth, canvasHeight) {
    if (!ensureGlobalMapImage()) {
        worldMapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        worldMapCtx.fillStyle = "#263948";
        worldMapCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        return;
    }

    const center = getMapCenterForMode(MAP_MODE.GLOBAL);
    const effectiveRange = getMapEffectiveRange(MAP_MODE.GLOBAL);
    const baseRange = GLOBAL_MAP_VIEW_RADIUS_BLOCKS;
    const sourceSizeWorld = effectiveRange * 2;
    const sourceSizeRatio = THREE.MathUtils.clamp(sourceSizeWorld / (baseRange * 2), 1 / GLOBAL_MAP_RENDER_RESOLUTION, 1);
    const sourceSizePx = sourceSizeRatio * GLOBAL_MAP_RENDER_RESOLUTION;
    const centerNormX = (THREE.MathUtils.clamp(center.x, -baseRange, baseRange) + baseRange) / (baseRange * 2);
    const centerNormY = (THREE.MathUtils.clamp(center.z, -baseRange, baseRange) + baseRange) / (baseRange * 2);
    let sourceX = centerNormX * GLOBAL_MAP_RENDER_RESOLUTION - sourceSizePx * 0.5;
    let sourceY = centerNormY * GLOBAL_MAP_RENDER_RESOLUTION - sourceSizePx * 0.5;
    sourceX = THREE.MathUtils.clamp(sourceX, 0, Math.max(0, GLOBAL_MAP_RENDER_RESOLUTION - sourceSizePx));
    sourceY = THREE.MathUtils.clamp(sourceY, 0, Math.max(0, GLOBAL_MAP_RENDER_RESOLUTION - sourceSizePx));

    worldMapCtx.imageSmoothingEnabled = false;
    worldMapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    worldMapCtx.drawImage(
        mapState.globalCanvas,
        sourceX,
        sourceY,
        sourceSizePx,
        sourceSizePx,
        0,
        0,
        canvasWidth,
        canvasHeight
    );
}

function drawMapMarkersAndInfo(mode, centerX, centerZ, range, canvasWidth, canvasHeight) {
    worldMapCtx.strokeStyle = "rgba(255,255,255,0.18)";
    worldMapCtx.lineWidth = 1;
    worldMapCtx.beginPath();
    worldMapCtx.moveTo(canvasWidth * 0.5, 0);
    worldMapCtx.lineTo(canvasWidth * 0.5, canvasHeight);
    worldMapCtx.moveTo(0, canvasHeight * 0.5);
    worldMapCtx.lineTo(canvasWidth, canvasHeight * 0.5);
    worldMapCtx.stroke();

    const localProjection = projectWorldToMap(
        state.playerPosition.x,
        state.playerPosition.z,
        centerX,
        centerZ,
        range,
        canvasWidth,
        canvasHeight
    );

    if (mapState.homePin) {
        const homeProjection = projectWorldToMap(
            mapState.homePin.x,
            mapState.homePin.z,
            centerX,
            centerZ,
            range,
            canvasWidth,
            canvasHeight
        );
        worldMapCtx.beginPath();
        worldMapCtx.fillStyle = "rgba(114, 212, 255, 0.98)";
        worldMapCtx.strokeStyle = "rgba(226, 246, 255, 0.98)";
        worldMapCtx.lineWidth = 1.3;
        worldMapCtx.moveTo(homeProjection.x, homeProjection.y - 6);
        worldMapCtx.lineTo(homeProjection.x + 6, homeProjection.y);
        worldMapCtx.lineTo(homeProjection.x, homeProjection.y + 6);
        worldMapCtx.lineTo(homeProjection.x - 6, homeProjection.y);
        worldMapCtx.closePath();
        worldMapCtx.fill();
        worldMapCtx.stroke();
    }

    if (mapState.pin) {
        const pinProjection = projectWorldToMap(
            mapState.pin.x,
            mapState.pin.z,
            centerX,
            centerZ,
            range,
            canvasWidth,
            canvasHeight
        );
        worldMapCtx.beginPath();
        worldMapCtx.fillStyle = "rgba(255, 112, 122, 0.95)";
        worldMapCtx.strokeStyle = "rgba(255, 233, 233, 0.92)";
        worldMapCtx.lineWidth = 1.4;
        worldMapCtx.arc(pinProjection.x, pinProjection.y, 5, 0, Math.PI * 2);
        worldMapCtx.fill();
        worldMapCtx.stroke();

        worldMapCtx.setLineDash([7, 6]);
        worldMapCtx.lineWidth = 1.5;
        worldMapCtx.strokeStyle = "rgba(255, 214, 156, 0.88)";
        worldMapCtx.beginPath();
        worldMapCtx.moveTo(localProjection.x, localProjection.y);
        worldMapCtx.lineTo(pinProjection.x, pinProjection.y);
        worldMapCtx.stroke();
        worldMapCtx.setLineDash([]);
    }

    for (const remoteNode of multiplayer.remotePlayers.values()) {
        const projection = projectWorldToMap(
            remoteNode?.targetPosition?.x ?? remoteNode?.group?.position?.x ?? 0,
            remoteNode?.targetPosition?.z ?? remoteNode?.group?.position?.z ?? 0,
            centerX,
            centerZ,
            range,
            canvasWidth,
            canvasHeight
        );
        worldMapCtx.beginPath();
        worldMapCtx.fillStyle = "rgba(90, 186, 255, 0.96)";
        worldMapCtx.strokeStyle = "rgba(222, 242, 255, 0.9)";
        worldMapCtx.lineWidth = 1;
        worldMapCtx.arc(projection.x, projection.y, 3.5, 0, Math.PI * 2);
        worldMapCtx.fill();
        worldMapCtx.stroke();
    }

    const forward = cameraForwardScratch;
    camera.getWorldDirection(forward);
    if (forward.lengthSq() < 1e-8) {
        forward.set(0, 0, -1);
    } else {
        forward.normalize();
    }
    const heading = Math.atan2(forward.x, forward.z);
    const coneLength = Math.max(18, Math.min(canvasWidth, canvasHeight) * 0.12);
    const coneSpread = Math.PI * 0.12;
    worldMapCtx.beginPath();
    worldMapCtx.fillStyle = "rgba(255, 219, 114, 0.14)";
    worldMapCtx.moveTo(localProjection.x, localProjection.y);
    worldMapCtx.lineTo(
        localProjection.x + Math.sin(heading - coneSpread) * coneLength,
        localProjection.y + Math.cos(heading - coneSpread) * coneLength
    );
    worldMapCtx.lineTo(
        localProjection.x + Math.sin(heading + coneSpread) * coneLength,
        localProjection.y + Math.cos(heading + coneSpread) * coneLength
    );
    worldMapCtx.closePath();
    worldMapCtx.fill();

    worldMapCtx.beginPath();
    worldMapCtx.strokeStyle = "rgba(255, 238, 189, 0.56)";
    worldMapCtx.lineWidth = 1;
    worldMapCtx.moveTo(localProjection.x, localProjection.y);
    worldMapCtx.lineTo(
        localProjection.x + Math.sin(heading) * coneLength,
        localProjection.y + Math.cos(heading) * coneLength
    );
    worldMapCtx.stroke();

    worldMapCtx.beginPath();
    worldMapCtx.fillStyle = "rgba(255, 219, 114, 0.98)";
    worldMapCtx.strokeStyle = "rgba(255, 248, 222, 0.98)";
    worldMapCtx.lineWidth = 1.4;
    worldMapCtx.arc(localProjection.x, localProjection.y, 4.4, 0, Math.PI * 2);
    worldMapCtx.fill();
    worldMapCtx.stroke();

    const localX = Number(state.playerPosition.x) || 0;
    const localZ = Number(state.playerPosition.z) || 0;
    const localBiome = getBiomeLabel(getColumnInfo(Math.floor(localX), Math.floor(localZ)).biome);
    const remoteCount = multiplayer.remotePlayers.size;
    let infoText = mode === MAP_MODE.GLOBAL
        ? `Mapa global (${(GLOBAL_MAP_VIEW_RADIUS_BLOCKS * 2).toFixed(0)}m) Zoom ${mapState.globalZoom.toFixed(2)}x | Tu bioma: ${localBiome}`
        : `Mapa local | Tu bioma: ${localBiome}`;
    infoText += ` | X: ${localX.toFixed(1)} Z: ${localZ.toFixed(1)} | Avatares: ${remoteCount + 1}`;
    if (mapState.pin) {
        const dx = mapState.pin.x - localX;
        const dz = mapState.pin.z - localZ;
        const distance = Math.hypot(dx, dz);
        const direction = getCompassDirectionFromDelta(dx, dz);
        infoText += ` | Destino: ${distance.toFixed(1)}m ${direction}`;
    } else {
        infoText += " | Destino: no definido";
    }
    if (mapState.homePin) {
        const homeDx = mapState.homePin.x - localX;
        const homeDz = mapState.homePin.z - localZ;
        const homeDistance = Math.hypot(homeDx, homeDz);
        const homeDirection = getCompassDirectionFromDelta(homeDx, homeDz);
        infoText += ` | Casa: ${homeDistance.toFixed(1)}m ${homeDirection}`;
    } else {
        infoText += " | Casa: no definida";
    }
    if (mapInfoEl) {
        mapInfoEl.textContent = infoText;
    }
}

function renderMapPanelNow() {
    if (!worldMapCtx || !worldMapCanvasEl || !state.worldReady) {
        return;
    }

    const mode = normalizeMapMode(mapState.mode);
    ensureMapCanvasResolution(mode);
    updateMapPanelLayout();
    const center = getMapCenterForMode(mode);
    const range = getMapEffectiveRange(mode);
    const canvasWidth = worldMapCanvasEl.width || 320;
    const canvasHeight = worldMapCanvasEl.height || 320;

    if (mode === MAP_MODE.GLOBAL) {
        renderGlobalMapBase(canvasWidth, canvasHeight);
    } else {
        renderLocalMapBase(center.x, center.z, range, canvasWidth, canvasHeight);
    }

    drawMapMarkersAndInfo(mode, center.x, center.z, range, canvasWidth, canvasHeight);
    updateMapModeButtons();
}

function updateMapPanel(deltaSeconds) {
    if (!state.mapOpen) {
        return;
    }
    mapState.refreshTick -= Math.max(0, Number(deltaSeconds) || 0);
    const interval = mapState.mode === MAP_MODE.GLOBAL ? GLOBAL_MAP_REFRESH_INTERVAL : MAP_REFRESH_INTERVAL;
    if (mapState.refreshTick <= 0) {
        mapState.refreshTick = interval;
        renderMapPanelNow();
    }
}

function setMapMode(mode, showFeedback = false) {
    const nextMode = normalizeMapMode(mode);
    if (nextMode === mapState.mode) {
        updateMapModeButtons();
        updateMapPanelLayout();
        if (state.mapOpen) {
            mapState.refreshTick = 0;
            renderMapPanelNow();
        }
        return;
    }

    mapState.mode = nextMode;
    if (mapState.mode !== MAP_MODE.GLOBAL) {
        mapState.globalZoom = 1;
        setGlobalMapCenter(0, 0, GLOBAL_MAP_VIEW_RADIUS_BLOCKS);
    }
    mapState.refreshTick = 0;
    updateMapModeButtons();
    updateMapPanelLayout();
    if (state.mapOpen) {
        const blocksGameplay = isMapBlockingGameplay();
        if (blocksGameplay) {
            if (crosshairEl) {
                crosshairEl.classList.add("hidden");
            }
            if (targetBlockLabelEl) {
                targetBlockLabelEl.classList.add("hidden");
            }
            if (controls.isLocked) {
                try {
                    controls.unlock();
                } catch (error) {
                }
            }
        } else {
            if (!state.avatarPreviewOpen && !state.paused && !state.tutorialVisible && !state.inventoryOpen && !state.interactionPanelOpen) {
                if (crosshairEl) {
                    crosshairEl.classList.remove("hidden");
                }
            }
            if (canRelockGameplayControls() && !controls.isLocked) {
                try {
                    controls.lock();
                } catch (error) {
                }
            }
        }
        renderMapPanelNow();
    }

    if (showFeedback) {
        showToast(
            mapState.mode === MAP_MODE.GLOBAL ? "Mapa global activado" : "Mapa local activado",
            "info",
            1000
        );
    }
}

function setMapOpen(open, showFeedback = false) {
    const next = Boolean(open);
    if (next === state.mapOpen) {
        if (next) {
            renderMapPanelNow();
        }
        return;
    }

    state.mapOpen = next;
    if (!state.mapOpen || normalizeMapMode(mapState.mode) === MAP_MODE.GLOBAL) {
        state.keyDown.clear();
    }
    if (mapPanelEl) {
        mapPanelEl.classList.toggle("hidden", !state.mapOpen);
    }
    updateMapPanelLayout();
    if (mapToggleButtonEl) {
        mapToggleButtonEl.setAttribute("aria-expanded", state.mapOpen ? "true" : "false");
    }

    if (state.mapOpen) {
        if (state.avatarPreviewOpen) {
            setAvatarPreviewOpen(false);
        }
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        if (state.interactionPanelOpen) {
            closeInteractionPanel(false, true);
        }
        if (isMapBlockingGameplay()) {
            if (crosshairEl) {
                crosshairEl.classList.add("hidden");
            }
            targetHighlight.visible = false;
            if (targetBlockLabelEl) {
                targetBlockLabelEl.classList.add("hidden");
            }
            if (controls.isLocked) {
                try {
                    controls.unlock();
                } catch (error) {
                }
            }
        } else if (canRelockGameplayControls() && !controls.isLocked) {
            try {
                controls.lock();
            } catch (error) {
            }
        }
        mapState.refreshTick = 0;
        renderMapPanelNow();
        if (showFeedback) {
            showToast(
                isMapBlockingGameplay()
                    ? "Mapa abierto"
                    : "Mapa local abierto (puedes moverte)",
                "info",
                980
            );
        }
        return;
    }

    if (!state.avatarPreviewOpen && !state.paused && !state.tutorialVisible && !state.inventoryOpen && !state.interactionPanelOpen) {
        if (crosshairEl) {
            crosshairEl.classList.remove("hidden");
        }
    }
    if (canRelockGameplayControls() && !controls.isLocked) {
        try {
            controls.lock();
        } catch (error) {
        }
    }
    if (showFeedback) {
        showToast("Mapa cerrado", "info", 800);
    }
}

function setMapPinAtCurrentPosition(showFeedback = true) {
    setMapPinAtWorldCoordinates(
        state.playerPosition.x,
        state.playerPosition.z,
        showFeedback,
        "Destino temporal guardado en tu posicion"
    );
}

function setMapHomePinAtCurrentPosition(showFeedback = true) {
    const nextX = Number(state.playerPosition.x) || 0;
    const nextZ = Number(state.playerPosition.z) || 0;
    const hasCurrentHome = Boolean(mapState.homePin && Number.isFinite(Number(mapState.homePin.x)) && Number.isFinite(Number(mapState.homePin.z)));
    let confirmMessage = `Guardar esta posicion como casa?\nX: ${nextX.toFixed(1)} Z: ${nextZ.toFixed(1)}`;
    if (hasCurrentHome) {
        confirmMessage = [
            "Vas a reemplazar el pin de casa actual.",
            `Casa actual: X ${Number(mapState.homePin.x).toFixed(1)} Z ${Number(mapState.homePin.z).toFixed(1)}`,
            `Nueva casa: X ${nextX.toFixed(1)} Z ${nextZ.toFixed(1)}`,
            "Quieres continuar?"
        ].join("\n");
    }
    let accepted = true;
    try {
        accepted = window.confirm(confirmMessage);
    } catch (error) {
        accepted = true;
    }
    if (!accepted) {
        if (showFeedback) {
            showToast("Cambio de casa cancelado", "info", 900);
        }
        return false;
    }
    setMapHomePinAtWorldCoordinates(
        nextX,
        nextZ,
        showFeedback,
        "Casa guardada en tu posicion"
    );
    return true;
}

function setMapPinAtWorldCoordinates(x, z, showFeedback = true, successMessage = "Destino temporal guardado") {
    const nx = Number(x);
    const nz = Number(z);
    if (!Number.isFinite(nx) || !Number.isFinite(nz)) {
        return false;
    }
    mapState.pin = {
        x: Number(nx.toFixed(2)),
        z: Number(nz.toFixed(2)),
        createdAt: Date.now()
    };
    persistMapPinToStorage();
    mapState.refreshTick = 0;
    if (state.mapOpen) {
        renderMapPanelNow();
    }
    if (showFeedback) {
        showToast(successMessage, "success", 1000);
    }
    return true;
}

function setMapHomePinAtWorldCoordinates(x, z, showFeedback = true, successMessage = "Casa guardada") {
    const nx = Number(x);
    const nz = Number(z);
    if (!Number.isFinite(nx) || !Number.isFinite(nz)) {
        return false;
    }
    mapState.homePin = {
        x: Number(nx.toFixed(2)),
        z: Number(nz.toFixed(2)),
        createdAt: Date.now()
    };
    persistMapHomePinToStorage();
    mapState.refreshTick = 0;
    if (state.mapOpen) {
        renderMapPanelNow();
    }
    if (showFeedback) {
        showToast(successMessage, "success", 1000);
    }
    return true;
}

function onMapCanvasClick(event) {
    if (!state.mapOpen || mapState.mode !== MAP_MODE.GLOBAL || !worldMapCanvasEl) {
        return;
    }
    const rect = worldMapCanvasEl.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
    }
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    if (canvasX < 0 || canvasY < 0 || canvasX > rect.width || canvasY > rect.height) {
        return;
    }

    const center = getMapCenterForMode(MAP_MODE.GLOBAL);
    const range = getMapEffectiveRange(MAP_MODE.GLOBAL);
    const world = unprojectMapToWorld(canvasX, canvasY, center.x, center.z, range, rect.width, rect.height);
    setMapPinAtWorldCoordinates(world.x, world.z, true, "Destino temporal marcado en el mapa global");
}

function goToStoredMapPoint(pinValue, missingMessage, invalidMessage, successMessage, showFeedback = true) {
    if (!pinValue || !state.worldReady) {
        if (showFeedback) {
            showToast(missingMessage, "warning", 1000);
        }
        return false;
    }

    const targetX = Number(pinValue.x);
    const targetZ = Number(pinValue.z);
    if (!Number.isFinite(targetX) || !Number.isFinite(targetZ)) {
        if (showFeedback) {
            showToast(invalidMessage, "warning", 1000);
        }
        return false;
    }

    if (state.interactionPanelOpen) {
        closeInteractionPanel(false, true);
    }
    clearAllTemporaryInteractionState(true);

    const column = getColumnInfo(Math.floor(targetX), Math.floor(targetZ));
    const targetY = THREE.MathUtils.clamp(column.height + 1.04, 0.12, WORLD_MAX_Y - PLAYER_HEIGHT - 0.04);
    state.playerPosition.set(targetX, targetY, targetZ);
    ensureSafePlayerPositionAfterFlight();
    state.velocityY = 0;
    updateOnGroundFlag();
    controls.getObject().position.set(
        state.playerPosition.x,
        state.playerPosition.y + EYE_HEIGHT,
        state.playerPosition.z
    );
    updateChunkStreaming(true);

    if (state.mapOpen) {
        setMapOpen(false, false);
    }

    if (showFeedback) {
        showToast(successMessage, "success", 1100);
    }
    return true;
}

function goToMapPin(showFeedback = true) {
    return goToStoredMapPoint(
        mapState.pin,
        "No hay destino temporal marcado",
        "Destino temporal invalido",
        "Fuiste al destino temporal",
        showFeedback
    );
}

function goToMapHomePin(showFeedback = true) {
    return goToStoredMapPoint(
        mapState.homePin,
        "No hay casa guardada",
        "Pin de casa invalido",
        "Regresaste a casa",
        showFeedback
    );
}

function clearMapPin(showFeedback = true) {
    mapState.pin = null;
    persistMapPinToStorage();
    mapState.refreshTick = 0;
    if (state.mapOpen) {
        renderMapPanelNow();
    }
    if (showFeedback) {
        showToast("Destino temporal eliminado", "info", 900);
    }
}

function setAvatarPreviewOpen(open, showFeedback = false) {
    const next = Boolean(open);
    if (next === state.avatarPreviewOpen) {
        return;
    }

    state.avatarPreviewOpen = next;

    if (state.avatarPreviewOpen) {
        if (state.interactionPanelOpen) {
            closeInteractionPanel(false, true);
        }
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        if (state.mapOpen) {
            setMapOpen(false);
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

    if (crosshairEl && !state.inventoryOpen && !isMapBlockingGameplay()) {
        crosshairEl.classList.remove("hidden");
    }

    if (showFeedback) {
        showToast("Vista de avatar cerrada", "info", 900);
    }

    if (state.worldStarted && !state.paused && !state.tutorialVisible && !state.inventoryOpen && !isMapBlockingGameplay() && !controls.isLocked) {
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
        if (state.mapOpen) {
            setMapOpen(false);
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
    if (open && state.mapOpen) {
        setMapOpen(false);
    }
    if (open && state.interactionPanelOpen) {
        closeInteractionPanel(false, true);
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
    publishWildlifeSnapshot(true);
    if (showFeedback) {
        showToast("Mundo guardado", "success");
    }
}

function getRandomHardResetWord() {
    if (!Array.isArray(WORLD_HARD_RESET_CONFIRM_WORDS) || WORLD_HARD_RESET_CONFIRM_WORDS.length === 0) {
        return "girasol";
    }
    const index = Math.floor(Math.random() * WORLD_HARD_RESET_CONFIRM_WORDS.length);
    return String(WORLD_HARD_RESET_CONFIRM_WORDS[index] || "girasol");
}

function clearLocalWorldPersistenceKeys() {
    const storageKeys = [
        WORLD_SAVE_KEY,
        PLAYER_STATE_STORAGE_KEY,
        MAP_PIN_STORAGE_KEY,
        MAP_HOME_PIN_STORAGE_KEY,
        JUKEBOX_CUSTOM_TRACKS_STORAGE_KEY
    ];
    for (const key of storageKeys) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
        }
    }
}

async function resetSharedWorldDataFromCloud() {
    if (!multiplayer.ready || !multiplayer.firebase?.dbModule || !multiplayer.firebase?.db || !multiplayer.worldPath) {
        return true;
    }
    const dbModule = multiplayer.firebase.dbModule;
    const db = multiplayer.firebase.db;
    const worldRef = dbModule.ref(db, multiplayer.worldPath);
    await dbModule.update(worldRef, {
        chunks: null,
        props: null,
        wildlife: null,
        meta: null,
        edits: null,
        ops: null
    });
    return true;
}

async function runHardWorldResetFlow() {
    const stepOneAccepted = window.confirm("Confirmacion 1/3: esto borrara TODO el mundo guardado y no se puede deshacer. Quieres continuar?");
    if (!stepOneAccepted) {
        return false;
    }

    const stepTwoAccepted = window.confirm("Confirmacion 2/3: se eliminaran ediciones locales y compartidas de la sala activa. Seguro que quieres borrar todo?");
    if (!stepTwoAccepted) {
        return false;
    }

    const challengeWord = getRandomHardResetWord();
    const typedWord = window.prompt(
        `Confirmacion 3/3.\nComentario del juego: "Si de verdad quieres borrarlo TODO, escribe exactamente la palabra: ${challengeWord}"\n\nEscribe la palabra para continuar:`,
        ""
    );
    if (typedWord === null) {
        return false;
    }
    if (String(typedWord).trim().toLowerCase() !== challengeWord.toLowerCase()) {
        showToast("Palabra incorrecta. Borrado total cancelado", "warning", 1600);
        return false;
    }

    showToast("Borrando mundo completo...", "warning", 1400);
    state.keyDown.clear();
    clearAllTemporaryInteractionState(true);
    clearInteractionPanelState();
    flushWorldSave(true);
    flushCloudEditWrites();
    flushCloudPropWrites();
    publishWildlifeSnapshot(true);

    multiplayer.pendingEditWrites.clear();
    multiplayer.pendingPropWrites.clear();
    if (multiplayer.writeTimerId !== null) {
        window.clearTimeout(multiplayer.writeTimerId);
        multiplayer.writeTimerId = null;
    }
    if (multiplayer.propWriteTimerId !== null) {
        window.clearTimeout(multiplayer.propWriteTimerId);
        multiplayer.propWriteTimerId = null;
    }
    if (multiplayer.wildlifeWriteTimerId !== null) {
        window.clearTimeout(multiplayer.wildlifeWriteTimerId);
        multiplayer.wildlifeWriteTimerId = null;
    }

    try {
        await resetSharedWorldDataFromCloud();
    } catch (error) {
        console.warn("No pude borrar el mundo compartido en la nube", error);
        showToast("No pude borrar el mundo compartido. Intenta de nuevo", "warning", 1900);
        return false;
    }

    clearLocalWorldPersistenceKeys();
    window.location.reload();
    return true;
}

function getBlockLabel(blockId) {
    const definition = getBlockDefinitionById(Number(blockId));
    return definition?.label || `Bloque ${blockId}`;
}

function resetTvTargetHudAutoHideState() {
    tvTargetHudAutoHideState.eligible = false;
    tvTargetHudAutoHideState.initialized = false;
    tvTargetHudAutoHideState.idleSeconds = 0;
    tvTargetHudAutoHideState.hidden = false;
}

function updateTvTargetHudAutoHide(deltaSeconds, eligible) {
    if (!eligible || !controls.isLocked) {
        resetTvTargetHudAutoHideState();
        return false;
    }

    tvTargetHudAutoHideState.eligible = true;
    const cameraObject = controls.getObject?.() || camera;
    if (!cameraObject) {
        resetTvTargetHudAutoHideState();
        return false;
    }

    tvTargetHudCameraPositionScratch.copy(cameraObject.position);
    camera.getWorldQuaternion(tvTargetHudCameraQuaternionScratch);

    if (!tvTargetHudAutoHideState.initialized) {
        tvTargetHudAutoHideState.initialized = true;
        tvTargetHudAutoHideState.idleSeconds = 0;
        tvTargetHudAutoHideState.hidden = false;
        tvTargetHudAutoHideState.lastCameraPosition.copy(tvTargetHudCameraPositionScratch);
        tvTargetHudAutoHideState.lastCameraQuaternion.copy(tvTargetHudCameraQuaternionScratch);
        return false;
    }

    const movedDistanceSq = tvTargetHudAutoHideState.lastCameraPosition.distanceToSquared(tvTargetHudCameraPositionScratch);
    const quatDot = Math.abs(tvTargetHudAutoHideState.lastCameraQuaternion.dot(tvTargetHudCameraQuaternionScratch));
    const cameraMoved = movedDistanceSq > TV_TARGET_UI_CAMERA_POSITION_EPSILON_SQ || quatDot < TV_TARGET_UI_CAMERA_QUAT_DOT_THRESHOLD;

    if (cameraMoved) {
        tvTargetHudAutoHideState.idleSeconds = 0;
        tvTargetHudAutoHideState.hidden = false;
    } else {
        tvTargetHudAutoHideState.idleSeconds += Math.max(0, Number(deltaSeconds) || 0);
        if (tvTargetHudAutoHideState.idleSeconds >= TV_TARGET_UI_IDLE_HIDE_DELAY_SECONDS) {
            tvTargetHudAutoHideState.hidden = true;
        }
    }

    tvTargetHudAutoHideState.lastCameraPosition.copy(tvTargetHudCameraPositionScratch);
    tvTargetHudAutoHideState.lastCameraQuaternion.copy(tvTargetHudCameraQuaternionScratch);
    return tvTargetHudAutoHideState.hidden;
}

function updateTargetedBlockUi(deltaSeconds = 0) {
    if (!state.worldStarted || !state.worldReady || state.paused || state.avatarPreviewOpen || state.inventoryOpen || isMapBlockingGameplay() || state.interactionPanelOpen || !controls.isLocked) {
        state.targetUiTick = 0;
        resetTvTargetHudAutoHideState();
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    state.targetUiTick -= Math.max(0, deltaSeconds);
    if (state.targetUiTick > 0) {
        const shouldHideTvHud = updateTvTargetHudAutoHide(deltaSeconds, tvTargetHudAutoHideState.eligible);
        if (tvTargetHudAutoHideState.eligible && crosshairEl) {
            crosshairEl.classList.toggle("hidden", shouldHideTvHud);
        }
        if (tvTargetHudAutoHideState.eligible && targetBlockLabelEl) {
            targetBlockLabelEl.classList.toggle("hidden", shouldHideTvHud);
        }
        return;
    }
    state.targetUiTick = TARGET_UI_SCAN_INTERVAL;

    const blockHit = findTargetedBlockHit();
    const blockDistance = blockHit?.hit?.distance ?? Number.POSITIVE_INFINITY;
    const propHit = findTargetedPropHit(blockDistance, Math.max(MAX_REACH, TV_INTERACTION_MAX_DISTANCE));

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
        resetTvTargetHudAutoHideState();
        if (crosshairEl) {
            crosshairEl.classList.remove("hidden");
        }
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
            const config = getPropInteractionConfig(propHit.placed.propType);
            const kind = config?.kind || INTERACTION_KIND.NONE;
            const interactionDistanceLimit = getPropInteractionMaxDistance(propHit.placed.propType);
            const canInteract = propDistance <= interactionDistanceLimit + 0.001;
            if (kind !== INTERACTION_KIND.TV_CONTROL) {
                resetTvTargetHudAutoHideState();
                if (crosshairEl) {
                    crosshairEl.classList.remove("hidden");
                }
            }

            if (kind === INTERACTION_KIND.LIGHT_CYCLE && isLightPropType(propHit.placed.propType)) {
                const actionHint = canInteract ? "E cambiar intensidad" : `Acercate (${interactionDistanceLimit.toFixed(1)}m)`;
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)} ${getLampIntensityLabel(normalizeLampLevel(propHit.placed.lampLevel))} (${actionHint} | click izq quitar)`;
            } else if (kind === INTERACTION_KIND.EDIT_TEXT) {
                const textPreview = sanitizeEditableSignText(propHit.placed.state?.text || "").slice(0, 26);
                const actionHint = canInteract ? "E editar" : `Acercate (${interactionDistanceLimit.toFixed(1)}m)`;
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)}: "${textPreview}" (${actionHint} | click izq quitar)`;
            } else if (kind === INTERACTION_KIND.JUKEBOX_CONTROL) {
                const playing = Boolean(propHit.placed.state?.playing);
                const track = sanitizeJukeboxTrack(propHit.placed.state?.track);
                const descriptor = resolveJukeboxTrackDescriptor(propHit.placed.id, track || 1, propHit.placed.state?.source || JUKEBOX_SOURCE_DEFAULT);
                const modeLabel = playing
                    ? `Reproduciendo ${descriptor.label || `pista ${track || 1}`}`
                    : "Detenida";
                const actionHint = canInteract ? "E controlar" : `Acercate (${interactionDistanceLimit.toFixed(1)}m)`;
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)} ${modeLabel} (${actionHint} | click izq quitar)`;
            } else if (kind === INTERACTION_KIND.FURNACE_OPEN) {
                const lit = Boolean(propHit.placed.state?.lit);
                const actionHint = canInteract ? "E abrir" : `Acercate (${interactionDistanceLimit.toFixed(1)}m)`;
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)} ${lit ? "Encendido" : "Apagado"} (${actionHint} | click izq quitar)`;
            } else if (kind === INTERACTION_KIND.TV_CONTROL) {
                const powered = Boolean(propHit.placed.state?.powered);
                const hasSignal = Boolean(sanitizeYouTubeVideoId(propHit.placed.state?.youtubeId || ""));
                const modeLabel = powered ? (hasSignal ? "Reproduciendo" : "Encendida sin senal") : "Apagada";
                const actionHint = canInteract ? "E controlar" : `Acercate (${interactionDistanceLimit.toFixed(1)}m)`;
                const shouldHideTvHud = updateTvTargetHudAutoHide(deltaSeconds, powered && hasSignal);
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)} ${modeLabel} (${actionHint} | click izq quitar)`;
                if (crosshairEl) {
                    crosshairEl.classList.toggle("hidden", shouldHideTvHud);
                }
                targetBlockLabelEl.classList.toggle("hidden", shouldHideTvHud);
                return;
            } else if (kind !== INTERACTION_KIND.NONE) {
                const hint = canInteract
                    ? (config?.hudHint || "E interactuar")
                    : `Acercate (${interactionDistanceLimit.toFixed(1)}m)`;
                targetBlockLabelEl.textContent = `${getPropLabel(propHit.placed.propType)} (${hint} | click izq quitar)`;
            } else {
                targetBlockLabelEl.textContent = `Objeto: ${getPropLabel(propHit.placed.propType)} (click izq quitar)`;
            }
            targetBlockLabelEl.classList.remove("hidden");
        }
        return;
    }

    if (!blockHit) {
        resetTvTargetHudAutoHideState();
        if (crosshairEl) {
            crosshairEl.classList.remove("hidden");
        }
        targetHighlight.visible = false;
        if (targetBlockLabelEl) {
            targetBlockLabelEl.classList.add("hidden");
        }
        return;
    }

    targetHighlight.visible = true;
    targetHighlight.position.set(blockHit.lookup.x + 0.5, blockHit.lookup.y + 0.5, blockHit.lookup.z + 0.5);
    resetTvTargetHudAutoHideState();
    if (crosshairEl) {
        crosshairEl.classList.remove("hidden");
    }

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
            CLOUD_BASE_HEIGHT + Math.random() * CLOUD_HEIGHT_VARIANCE,
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

function computeFogTargetsForPlayerEnvironment(dayFactor, twilightFactor) {
    const playerX = Math.floor(state.playerPosition.x);
    const playerZ = Math.floor(state.playerPosition.z);
    const column = getColumnInfo(playerX, playerZ);
    const biome = String(column?.biome || BIOME.PLAINS);
    const moisture01 = clamp01((Number(column?.moisture) + 1) * 0.5);
    const terrainHeight = Number(column?.height) || SEA_LEVEL;
    const altitudeFactor = smoothstep(SEA_LEVEL + 54, SEA_LEVEL + 132, terrainHeight);
    const driftSignal = valueNoise2D(
        playerX + skyState.cycleSeconds * 2.1,
        playerZ - skyState.cycleSeconds * 1.7,
        0.012,
        877
    );
    const drift01 = clamp01((driftSignal + 1) * 0.5);

    let biomeHaze = 0.035;
    if (biome === BIOME.MARITIME) biomeHaze = 0.17;
    else if (biome === BIOME.LAKE) biomeHaze = 0.16;
    else if (biome === BIOME.COAST) biomeHaze = 0.1;
    else if (biome === BIOME.FOREST) biomeHaze = 0.08;
    else if (biome === BIOME.CORDILLERA) biomeHaze = 0.1;
    else if (biome === BIOME.VOLCANIC) biomeHaze = 0.06;
    else if (biome === BIOME.DESERT) biomeHaze = 0.012;
    else if (biome === BIOME.SPAWN_VALLEY) biomeHaze = 0.04;

    let haze = biomeHaze
        + moisture01 * 0.08
        + twilightFactor * 0.06
        + (1 - dayFactor) * 0.035;

    if (biome !== BIOME.DESERT) {
        haze += altitudeFactor * (0.03 + smoothstep(0.56, 0.9, drift01) * 0.2);
    } else {
        haze *= 0.25;
    }

    haze = clamp01(haze);
    const baseFar = getBaseViewDistanceForChunkRadius(state.chunkRadius);
    const far = THREE.MathUtils.clamp(baseFar * (1 - haze * 0.42), 200, baseFar + 6);
    const near = THREE.MathUtils.clamp(far * (0.11 + haze * 0.15), 24, 220);
    return { near, far };
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
    if (ENABLE_WORLD_FOG && scene.fog) {
        scene.fog.color.copy(skyColorScratch);
        skyState.fogSampleTimer -= deltaSeconds;
        if (skyState.fogSampleTimer <= 0) {
            const fogTargets = computeFogTargetsForPlayerEnvironment(dayFactor, twilightFactor);
            skyState.fogTargetNear = fogTargets.near;
            skyState.fogTargetFar = fogTargets.far;
            skyState.fogSampleTimer = FOG_SAMPLE_INTERVAL_SECONDS;
        }
        const fogBlendAlpha = 1 - Math.exp(-FOG_BLEND_SPEED * Math.max(0, deltaSeconds));
        skyState.fogNear = lerp(skyState.fogNear, skyState.fogTargetNear, fogBlendAlpha);
        skyState.fogFar = lerp(skyState.fogFar, skyState.fogTargetFar, fogBlendAlpha);
        scene.fog.near = skyState.fogNear;
        scene.fog.far = Math.max(scene.fog.near + 26, skyState.fogFar);
    }

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
            cloud.node.position.y = CLOUD_BASE_HEIGHT + Math.random() * CLOUD_HEIGHT_VARIANCE;
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

function getRabbitVariantById(variantId) {
    const safeId = String(variantId || "");
    return RABBIT_VARIANTS.find((variant) => variant.id === safeId) || RABBIT_VARIANTS[0];
}

function bumpNextRabbitIdFromValue(rabbitId) {
    const numericPart = Number(String(rabbitId || "").replace(/^rabbit-/, ""));
    if (Number.isFinite(numericPart) && numericPart >= wildlifeState.nextId) {
        wildlifeState.nextId = numericPart + 1;
    }
}

function isRabbitGroundBlock(id) {
    return id === BLOCK.GRASS || id === BLOCK.DIRT || id === BLOCK.SAND;
}

function sampleSurfaceForRabbit(worldX, worldZ) {
    const x = Math.floor(worldX);
    const z = Math.floor(worldZ);
    const column = getColumnInfo(x, z);
    const topY = Math.min(WORLD_MAX_Y - 2, column.height + 8);

    for (let y = topY; y >= 1; y -= 1) {
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

function collectWildlifeAnchorPoints() {
    const anchors = [];
    const localX = Number(state.playerPosition.x);
    const localZ = Number(state.playerPosition.z);
    if (Number.isFinite(localX) && Number.isFinite(localZ)) {
        anchors.push({ x: localX, z: localZ });
    }

    for (const remoteNode of multiplayer.remotePlayers.values()) {
        const remoteX = Number(remoteNode?.targetPosition?.x ?? remoteNode?.group?.position?.x);
        const remoteZ = Number(remoteNode?.targetPosition?.z ?? remoteNode?.group?.position?.z);
        if (!Number.isFinite(remoteX) || !Number.isFinite(remoteZ)) {
            continue;
        }
        anchors.push({ x: remoteX, z: remoteZ });
    }

    if (!anchors.length) {
        anchors.push({ x: 0, z: 0 });
    }
    return anchors;
}

function getNearestAnchorDistanceSq(x, z, anchors) {
    const targetX = Number(x);
    const targetZ = Number(z);
    if (!Number.isFinite(targetX) || !Number.isFinite(targetZ)) {
        return Number.POSITIVE_INFINITY;
    }
    let nearest = Number.POSITIVE_INFINITY;
    for (const anchor of anchors) {
        const dx = targetX - anchor.x;
        const dz = targetZ - anchor.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < nearest) {
            nearest = distSq;
        }
    }
    return nearest;
}

function pickWildlifeSpawnAnchor(anchors) {
    if (!Array.isArray(anchors) || anchors.length === 0) {
        return {
            x: Number(state.playerPosition.x) || 0,
            z: Number(state.playerPosition.z) || 0
        };
    }
    return anchors[Math.floor(Math.random() * anchors.length)] || anchors[0];
}

function trySpawnRabbitNearPlayer(force = false, anchorX = state.playerPosition.x, anchorZ = state.playerPosition.z) {
    if (!force && !state.worldStarted) {
        return false;
    }

    if (wildlifeState.rabbits.size >= RABBIT_MAX_COUNT) {
        return false;
    }

    const searchRadius = Math.max(28, state.chunkRadius * CHUNK_SIZE * 2.4);
    const originX = Number(anchorX) || 0;
    const originZ = Number(anchorZ) || 0;

    for (let attempt = 0; attempt < RABBIT_SPAWN_ATTEMPTS; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInRange(RABBIT_MIN_PLAYER_DISTANCE + 8, searchRadius);
        const candidateX = originX + Math.cos(angle) * distance;
        const candidateZ = originZ + Math.sin(angle) * distance;
        const spawnPoint = sampleSurfaceForRabbit(candidateX, candidateZ);
        if (!spawnPoint) {
            continue;
        }

        const playerDx = spawnPoint.x - originX;
        const playerDz = spawnPoint.z - originZ;
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

function updateRemoteSyncedRabbit(rabbit, deltaSeconds) {
    const blend = 1 - Math.exp(-WILDLIFE_REMOTE_BLEND_SPEED * Math.max(0, deltaSeconds));
    const targetX = Number.isFinite(rabbit.syncTargetX) ? rabbit.syncTargetX : rabbit.x;
    const targetZ = Number.isFinite(rabbit.syncTargetZ) ? rabbit.syncTargetZ : rabbit.z;
    const targetY = Number.isFinite(rabbit.syncTargetY) ? rabbit.syncTargetY : rabbit.baseY;
    const prevX = rabbit.x;
    const prevZ = rabbit.z;
    rabbit.x = lerp(rabbit.x, targetX, blend);
    rabbit.z = lerp(rabbit.z, targetZ, blend);
    rabbit.baseY = lerp(rabbit.baseY, targetY, blend);

    const moveDx = rabbit.x - prevX;
    const moveDz = rabbit.z - prevZ;
    const moving = moveDx * moveDx + moveDz * moveDz > 0.00006;
    const yawTarget = Number.isFinite(rabbit.syncYaw)
        ? rabbit.syncYaw
        : Math.atan2(moveDx, moveDz);
    rabbit.node.rotation.y = approachAngle(rabbit.node.rotation.y, yawTarget, Math.min(1, deltaSeconds * 9));
    rabbit.hopPhase += deltaSeconds * (moving ? 9.2 : 3.4);
    const hop = moving ? Math.max(0, Math.sin(rabbit.hopPhase)) * rabbit.hopStrength : 0;
    rabbit.node.position.set(rabbit.x, rabbit.baseY + hop, rabbit.z);
}

function updateWildlife(deltaSeconds) {
    if (!state.worldReady) {
        return;
    }

    if (multiplayer.ready && !multiplayer.isWildlifeAuthority) {
        if (!multiplayer.wildlifeSnapshotReady) {
            if (wildlifeState.rabbits.size > 0) {
                clearWildlife();
            }
            return;
        }
        for (const rabbit of wildlifeState.rabbits.values()) {
            const isVisibleInLoadedChunk = isWorldPositionChunkLoaded(rabbit.x, rabbit.z);
            rabbit.node.visible = isVisibleInLoadedChunk;
            if (!isVisibleInLoadedChunk) {
                continue;
            }
            updateRemoteSyncedRabbit(rabbit, deltaSeconds);
        }
        return;
    }

    const anchors = collectWildlifeAnchorPoints();
    wildlifeState.spawnTimer -= deltaSeconds;
    if (wildlifeState.spawnTimer <= 0) {
        resetRabbitSpawnTimer();

        const occupancy = wildlifeState.rabbits.size / RABBIT_MAX_COUNT;
        const spawnChance = Math.max(0.08, 0.36 - occupancy * 0.3);
        if (Math.random() < spawnChance) {
            const spawnBursts = 1;
            for (let i = 0; i < spawnBursts; i += 1) {
                const spawnAnchor = pickWildlifeSpawnAnchor(anchors);
                if (!trySpawnRabbitNearPlayer(false, spawnAnchor.x, spawnAnchor.z)) {
                    break;
                }
            }
        }
    }

    for (const [rabbitId, rabbit] of Array.from(wildlifeState.rabbits.entries())) {
        const nearestDistanceSq = getNearestAnchorDistanceSq(rabbit.x, rabbit.z, anchors);
        if (nearestDistanceSq > RABBIT_DESPAWN_DISTANCE * RABBIT_DESPAWN_DISTANCE) {
            removeRabbitEntity(rabbitId);
            continue;
        }

        const isVisibleInLoadedChunk = isWorldPositionChunkLoaded(rabbit.x, rabbit.z);
        rabbit.node.visible = isVisibleInLoadedChunk;
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

function getFishBoxGeometry(width, height, depth) {
    const w = Number(width) || 1;
    const h = Number(height) || 1;
    const d = Number(depth) || 1;
    const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
    let geometry = fishBoxGeometryCache.get(key);
    if (geometry) {
        return geometry;
    }
    geometry = new THREE.BoxGeometry(w, h, d);
    fishBoxGeometryCache.set(key, geometry);
    return geometry;
}

function getFishVariantMaterials(variant) {
    const safeVariant = variant || FISH_VARIANTS[0];
    const variantId = String(safeVariant?.id || "default");
    let cached = fishVariantMaterialCache.get(variantId);
    if (cached) {
        return cached;
    }
    cached = {
        body: new THREE.MeshLambertMaterial({ color: safeVariant.body, flatShading: true }),
        accent: new THREE.MeshLambertMaterial({ color: safeVariant.accent, flatShading: true }),
        eye: new THREE.MeshLambertMaterial({ color: 0x121820, flatShading: true }),
        belly: new THREE.MeshLambertMaterial({
            color: new THREE.Color(safeVariant.body).lerp(new THREE.Color(0xffffff), 0.24).getHex(),
            flatShading: true
        })
    };
    fishVariantMaterialCache.set(variantId, cached);
    return cached;
}

function createFishNode(variant) {
    const safeVariant = variant || FISH_VARIANTS[0];
    const root = new THREE.Group();
    const mats = getFishVariantMaterials(safeVariant);

    const addPart = (w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const mesh = new THREE.Mesh(getFishBoxGeometry(w, h, d), material);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        root.add(mesh);
        return mesh;
    };

    const addEyes = (xOffset, y, z) => {
        addPart(0.07, 0.07, 0.07, mats.eye, -Math.abs(xOffset), y, z);
        addPart(0.07, 0.07, 0.07, mats.eye, Math.abs(xOffset), y, z);
    };

    if (safeVariant.id === "tilapia") {
        addPart(0.56, 0.36, 1.18, mats.body, 0, 0.02, 0.04);
        addPart(0.42, 0.2, 1.02, mats.belly, 0, -0.1, 0.12);
        addPart(0.28, 0.22, 0.34, mats.accent, 0, 0.02, -0.78);
        addPart(0.22, 0.18, 0.36, mats.accent, 0, 0.22, -0.02);
        addPart(0.1, 0.1, 0.34, mats.accent, -0.33, -0.02, 0.16, 0, 0, 0.3);
        addPart(0.1, 0.1, 0.34, mats.accent, 0.33, -0.02, 0.16, 0, 0, -0.3);
        addPart(0.16, 0.11, 0.24, mats.accent, 0, -0.16, -0.22);
        addEyes(0.19, 0.08, 0.48);
    } else if (safeVariant.id === "puffer") {
        addPart(0.66, 0.66, 0.66, mats.body, 0, 0.02, 0.03);
        addPart(0.5, 0.48, 0.44, mats.belly, 0, -0.08, 0.14);
        addPart(0.22, 0.18, 0.24, mats.accent, 0, 0.02, -0.48);
        addPart(0.18, 0.12, 0.16, mats.accent, 0, -0.2, 0.28);
        const spikes = [
            [-0.28, 0.22, 0.1], [0.28, 0.22, 0.1], [-0.24, -0.22, 0.08], [0.24, -0.22, 0.08],
            [-0.08, 0.3, -0.08], [0.08, 0.3, -0.08], [-0.31, 0.02, -0.04], [0.31, 0.02, -0.04]
        ];
        for (const spike of spikes) {
            addPart(0.08, 0.08, 0.08, mats.accent, spike[0], spike[1], spike[2]);
        }
        addEyes(0.23, 0.11, 0.25);
    } else if (safeVariant.id === "shark") {
        addPart(0.54, 0.42, 1.72, mats.body, 0, 0.01, 0.1);
        addPart(0.42, 0.24, 1.28, mats.belly, 0, -0.12, 0.24);
        addPart(0.24, 0.2, 0.46, mats.body, 0, 0.07, 0.94);
        addPart(0.24, 0.52, 0.24, mats.accent, 0, 0.28, -0.02);
        addPart(0.34, 0.18, 0.16, mats.accent, 0, 0.02, -0.98);
        addPart(0.12, 0.34, 0.44, mats.accent, -0.34, -0.05, 0.1, 0, 0, 0.42);
        addPart(0.12, 0.34, 0.44, mats.accent, 0.34, -0.05, 0.1, 0, 0, -0.42);
        addPart(0.08, 0.22, 0.28, mats.accent, -0.12, -0.16, -0.28, 0, 0, 0.2);
        addPart(0.08, 0.22, 0.28, mats.accent, 0.12, -0.16, -0.28, 0, 0, -0.2);
        addEyes(0.18, 0.08, 0.62);
    } else if (safeVariant.id === "manta") {
        addPart(0.56, 0.2, 0.92, mats.body, 0, 0, 0.12);
        addPart(1.54, 0.1, 0.82, mats.body, 0, -0.02, -0.06, 0, 0, 0.08);
        addPart(0.98, 0.08, 0.54, mats.belly, 0, -0.08, 0.12);
        addPart(0.06, 0.08, 1.04, mats.accent, 0, -0.03, -0.8);
        addPart(0.14, 0.12, 0.28, mats.accent, -0.18, -0.06, 0.32, 0.22, 0, 0);
        addPart(0.14, 0.12, 0.28, mats.accent, 0.18, -0.06, 0.32, 0.22, 0, 0);
        addEyes(0.22, 0.06, 0.28);
    } else if (safeVariant.id === "jelly") {
        addPart(0.62, 0.32, 0.62, mats.body, 0, 0.34, 0);
        addPart(0.76, 0.12, 0.76, mats.accent, 0, 0.16, 0);
        addPart(0.34, 0.1, 0.34, mats.belly, 0, 0.44, 0);
        for (let i = 0; i < 6; i += 1) {
            const strandLength = 0.34 + (i % 2 === 0 ? 0.08 : 0.16);
            const strandX = (i - 2.5) * 0.11;
            const strandZ = (i % 2 === 0 ? -0.08 : 0.06);
            addPart(0.06, strandLength, 0.06, mats.accent, strandX, -0.06 - strandLength * 0.4, strandZ);
        }
        addEyes(0.12, 0.22, 0.2);
    } else {
        addPart(0.56, 0.36, 1.12, mats.body, 0, 0.02, 0.06);
        addPart(0.24, 0.2, 0.34, mats.accent, 0, 0.02, -0.74);
        addPart(0.1, 0.1, 0.28, mats.accent, -0.33, -0.04, 0.1, 0, 0, 0.34);
        addPart(0.1, 0.1, 0.28, mats.accent, 0.33, -0.04, 0.1, 0, 0, -0.34);
        addEyes(0.18, 0.08, 0.44);
    }

    root.scale.setScalar(safeVariant.scale);
    return root;
}

function pickFishVariant() {
    let totalWeight = 0;
    for (const variant of FISH_VARIANTS) {
        totalWeight += Math.max(0.001, Number(variant?.spawnWeight) || 0);
    }
    if (totalWeight <= 0) {
        return FISH_VARIANTS[Math.floor(Math.random() * FISH_VARIANTS.length)] || FISH_VARIANTS[0];
    }
    let roll = Math.random() * totalWeight;
    for (const variant of FISH_VARIANTS) {
        roll -= Math.max(0.001, Number(variant?.spawnWeight) || 0);
        if (roll <= 0) {
            return variant;
        }
    }
    return FISH_VARIANTS[FISH_VARIANTS.length - 1] || FISH_VARIANTS[0];
}

function getFishVariantById(variantId) {
    const safeId = String(variantId || "");
    return FISH_VARIANTS.find((variant) => variant.id === safeId) || FISH_VARIANTS[0];
}

function bumpNextFishIdFromValue(fishId) {
    const numericPart = Number(String(fishId || "").replace(/^fish-/, ""));
    if (Number.isFinite(numericPart) && numericPart >= fishState.nextId) {
        fishState.nextId = numericPart + 1;
    }
}

function isSwimmableWaterBlock(id) {
    return id === BLOCK.WATER;
}

function sampleSurfaceForFish(worldX, worldZ, variant = null) {
    const x = Math.floor(worldX);
    const z = Math.floor(worldZ);
    const column = getColumnInfo(x, z);
    if (column.biome === BIOME.VOLCANIC || column.height >= SEA_LEVEL - 1) {
        return null;
    }

    const waterBottom = column.height + 1;
    const waterTop = SEA_LEVEL;
    if (waterTop - waterBottom < 2) {
        return null;
    }
    if (variant?.id === "shark") {
        const isOpenWater = column.biome === BIOME.MARITIME || column.biome === BIOME.COAST;
        if (!isOpenWater || waterTop - waterBottom < 6) {
            return null;
        }
    }

    const candidates = [];
    const topScan = Math.min(WORLD_MAX_Y - 2, waterTop);
    for (let y = topScan; y >= Math.max(1, waterBottom + 1); y -= 1) {
        const blockHere = getBlock(x, y, z);
        const blockAbove = getBlock(x, y + 1, z);
        if (isSwimmableWaterBlock(blockHere) && isSwimmableWaterBlock(blockAbove)) {
            candidates.push(y);
        }
    }

    if (!candidates.length) {
        return null;
    }

    const depthBias = THREE.MathUtils.clamp(Number(variant?.depthBias) || 0.5, 0.1, 0.92);
    const targetIndex = clampInt((1 - depthBias) * (candidates.length - 1), 0, candidates.length - 1);
    const chosenY = candidates[targetIndex];
    return {
        x: x + 0.5,
        y: chosenY + 0.25,
        z: z + 0.5,
        topY: waterTop - 0.12,
        bottomY: waterBottom + 0.12
    };
}

function resetFishSpawnTimer() {
    fishState.spawnTimer = randomInRange(FISH_SPAWN_INTERVAL_MIN, FISH_SPAWN_INTERVAL_MAX);
}

function removeFishEntity(fishId) {
    const fish = fishState.fishes.get(fishId);
    if (!fish) {
        return;
    }

    fishRoot.remove(fish.node);
    fishState.fishes.delete(fishId);
}

function clearFish() {
    for (const fishId of Array.from(fishState.fishes.keys())) {
        removeFishEntity(fishId);
    }
}

function trySpawnFishNearPlayer(force = false, anchorX = state.playerPosition.x, anchorZ = state.playerPosition.z) {
    if (!force && !state.worldStarted) {
        return false;
    }
    if (fishState.fishes.size >= FISH_MAX_COUNT) {
        return false;
    }

    const searchRadius = Math.max(52, state.chunkRadius * CHUNK_SIZE * 3.8);
    const originX = Number(anchorX) || 0;
    const originZ = Number(anchorZ) || 0;
    for (let attempt = 0; attempt < FISH_SPAWN_ATTEMPTS; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInRange(FISH_MIN_PLAYER_DISTANCE + 7, searchRadius);
        const candidateX = originX + Math.cos(angle) * distance;
        const candidateZ = originZ + Math.sin(angle) * distance;
        const variant = pickFishVariant();
        const spawnPoint = sampleSurfaceForFish(candidateX, candidateZ, variant);
        if (!spawnPoint) {
            continue;
        }

        const playerDx = spawnPoint.x - originX;
        const playerDz = spawnPoint.z - originZ;
        if (playerDx * playerDx + playerDz * playerDz < FISH_MIN_PLAYER_DISTANCE * FISH_MIN_PLAYER_DISTANCE) {
            continue;
        }

        let tooClose = false;
        for (const fish of fishState.fishes.values()) {
            const dx = spawnPoint.x - fish.x;
            const dz = spawnPoint.z - fish.z;
            if (dx * dx + dz * dz < FISH_MIN_FISH_DISTANCE * FISH_MIN_FISH_DISTANCE) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) {
            continue;
        }

        const node = createFishNode(variant);
        node.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        node.rotation.y = Math.random() * Math.PI * 2;
        fishRoot.add(node);

        const fishId = `fish-${fishState.nextId}`;
        fishState.nextId += 1;
        fishState.fishes.set(fishId, {
            id: fishId,
            variant,
            node,
            x: spawnPoint.x,
            y: spawnPoint.y,
            z: spawnPoint.z,
            targetX: spawnPoint.x,
            targetY: spawnPoint.y,
            targetZ: spawnPoint.z,
            speed: randomInRange(variant.speedMin, variant.speedMax),
            targetTimer: randomInRange(0.9, 2.2),
            bobPhase: Math.random() * Math.PI * 2,
            turnRate: randomInRange(4.2, 9.3),
            bottomY: spawnPoint.bottomY,
            topY: spawnPoint.topY
        });
        return true;
    }

    return false;
}

function pickFishTarget(fish) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInRange(1.8, fish.variant.id === "shark" ? 10.5 : 7.2);
        const targetX = fish.x + Math.cos(angle) * distance;
        const targetZ = fish.z + Math.sin(angle) * distance;
        const sample = sampleSurfaceForFish(targetX, targetZ, fish.variant);
        if (!sample) {
            continue;
        }
        fish.targetX = sample.x;
        fish.targetZ = sample.z;
        fish.targetY = THREE.MathUtils.clamp(sample.y, fish.bottomY + 0.1, fish.topY - 0.1);
        fish.targetTimer = randomInRange(1.2, 3.8);
        return;
    }
    fish.targetTimer = randomInRange(0.7, 1.9);
}

function updateSingleFish(fishId, fish, deltaSeconds) {
    fish.targetTimer -= deltaSeconds;
    const dx = fish.targetX - fish.x;
    const dy = fish.targetY - fish.y;
    const dz = fish.targetZ - fish.z;
    const dist = Math.hypot(dx, dy, dz);
    if (fish.targetTimer <= 0 || dist < 0.28) {
        pickFishTarget(fish);
    }

    const moveDx = fish.targetX - fish.x;
    const moveDy = fish.targetY - fish.y;
    const moveDz = fish.targetZ - fish.z;
    const moveDist = Math.hypot(moveDx, moveDy, moveDz);
    if (moveDist > 1e-5) {
        const step = Math.min(moveDist, fish.speed * deltaSeconds);
        fish.x += (moveDx / moveDist) * step;
        fish.y += (moveDy / moveDist) * step;
        fish.z += (moveDz / moveDist) * step;
        fish.y = THREE.MathUtils.clamp(fish.y, fish.bottomY + 0.06, fish.topY - 0.06);
        const targetYaw = Math.atan2(moveDx, moveDz);
        fish.node.rotation.y = approachAngle(fish.node.rotation.y, targetYaw, Math.min(1, deltaSeconds * fish.turnRate));
    }

    fish.bobPhase += deltaSeconds * (fish.variant.id === "jelly" ? 2.8 : 5.2);
    const bob = Math.sin(fish.bobPhase) * (fish.variant.id === "jelly" ? 0.16 : 0.06);
    fish.node.position.set(fish.x, fish.y + bob, fish.z);
    if (fish.variant.id === "jelly") {
        const pulse = 1 + Math.sin(fish.bobPhase * 1.8) * 0.06;
        fish.node.scale.setScalar(fish.variant.scale * pulse);
    }
}

function updateRemoteSyncedFish(fish, deltaSeconds) {
    const blend = 1 - Math.exp(-WILDLIFE_REMOTE_BLEND_SPEED * Math.max(0, deltaSeconds));
    const targetX = Number.isFinite(fish.syncTargetX) ? fish.syncTargetX : fish.x;
    const targetY = Number.isFinite(fish.syncTargetY) ? fish.syncTargetY : fish.y;
    const targetZ = Number.isFinite(fish.syncTargetZ) ? fish.syncTargetZ : fish.z;
    const prevX = fish.x;
    const prevZ = fish.z;
    fish.x = lerp(fish.x, targetX, blend);
    fish.y = lerp(fish.y, targetY, blend);
    fish.z = lerp(fish.z, targetZ, blend);
    fish.y = THREE.MathUtils.clamp(fish.y, fish.bottomY + 0.06, fish.topY - 0.06);
    const moveDx = fish.x - prevX;
    const moveDz = fish.z - prevZ;
    const yawTarget = Number.isFinite(fish.syncYaw)
        ? fish.syncYaw
        : Math.atan2(moveDx, moveDz);
    fish.node.rotation.y = approachAngle(fish.node.rotation.y, yawTarget, Math.min(1, deltaSeconds * fish.turnRate));
    fish.bobPhase += deltaSeconds * (fish.variant.id === "jelly" ? 2.8 : 5.2);
    const bob = Math.sin(fish.bobPhase) * (fish.variant.id === "jelly" ? 0.16 : 0.06);
    fish.node.position.set(fish.x, fish.y + bob, fish.z);
    if (fish.variant.id === "jelly") {
        const pulse = 1 + Math.sin(fish.bobPhase * 1.8) * 0.06;
        fish.node.scale.setScalar(fish.variant.scale * pulse);
    }
}

function updateFish(deltaSeconds) {
    if (!state.worldReady) {
        return;
    }

    if (multiplayer.ready && !multiplayer.isWildlifeAuthority) {
        if (!multiplayer.wildlifeSnapshotReady) {
            if (fishState.fishes.size > 0) {
                clearFish();
            }
            return;
        }
        for (const fish of fishState.fishes.values()) {
            const isVisibleInLoadedChunk = isWorldPositionChunkLoaded(fish.x, fish.z);
            fish.node.visible = isVisibleInLoadedChunk;
            if (!isVisibleInLoadedChunk) {
                continue;
            }
            updateRemoteSyncedFish(fish, deltaSeconds);
        }
        return;
    }

    const anchors = collectWildlifeAnchorPoints();
    fishState.spawnTimer -= deltaSeconds;
    if (fishState.spawnTimer <= 0) {
        resetFishSpawnTimer();
        const occupancy = fishState.fishes.size / FISH_MAX_COUNT;
        const spawnChance = Math.max(0.18, 0.74 - occupancy * 0.58);
        if (Math.random() < spawnChance) {
            const bursts = fishState.fishes.size < 12 ? 4 : (fishState.fishes.size < 30 ? 2 : 1);
            for (let i = 0; i < bursts; i += 1) {
                const spawnAnchor = pickWildlifeSpawnAnchor(anchors);
                if (!trySpawnFishNearPlayer(false, spawnAnchor.x, spawnAnchor.z)) {
                    break;
                }
            }
        }
    }

    for (const [fishId, fish] of Array.from(fishState.fishes.entries())) {
        const nearestDistanceSq = getNearestAnchorDistanceSq(fish.x, fish.z, anchors);
        if (nearestDistanceSq > FISH_DESPAWN_DISTANCE * FISH_DESPAWN_DISTANCE) {
            removeFishEntity(fishId);
            continue;
        }
        const isVisibleInLoadedChunk = isWorldPositionChunkLoaded(fish.x, fish.z);
        fish.node.visible = isVisibleInLoadedChunk;
        updateSingleFish(fishId, fish, deltaSeconds);
    }
}

function initFish() {
    clearFish();
    fishState.nextId = 1;
    resetFishSpawnTimer();

    const initialCount = randomIntInclusive(10, 15);
    for (let i = 0; i < initialCount; i += 1) {
        if (!trySpawnFishNearPlayer(true)) {
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

function getPropProfileForState(propType, sharedState = null) {
    const baseProfile = getPropProfile(propType);
    if (propType !== PROP_TYPE.TV_SCREEN && propType !== PROP_TYPE.TV_WALL) {
        return baseProfile;
    }

    const sizeInches = sanitizeTvSizeInches(sharedState?.sizeInches, 200);
    const scaleFactor = getTvScaleFactorFromSize(sizeInches);
    const baseHalfExtents = baseProfile.halfExtents || { x: 0.25, z: 0.25 };
    const profileMinY = propType === PROP_TYPE.TV_WALL ? TV_WALL_BASE_MIN_Y : (Number(baseProfile.minY) || 0);
    const profileMaxY = propType === PROP_TYPE.TV_WALL ? TV_WALL_BASE_MAX_Y : (Number(baseProfile.maxY) || 1);
    const profileSupportY = propType === PROP_TYPE.TV_WALL ? TV_WALL_BASE_SUPPORT_Y : (Number(baseProfile.supportY) || 0.5);

    return {
        ...baseProfile,
        halfExtents: {
            x: (Number(baseHalfExtents.x) || 0.25) * scaleFactor,
            z: (Number(baseHalfExtents.z) || 0.25) * scaleFactor
        },
        minY: profileMinY * scaleFactor,
        maxY: profileMaxY * scaleFactor,
        supportY: profileSupportY * scaleFactor
    };
}

const INTERACTION_KIND = Object.freeze({
    NONE: "none",
    SIT: "sit",
    LIE: "lie",
    LIGHT_CYCLE: "light-cycle",
    EDIT_TEXT: "edit-text",
    CONTAINER_OPEN: "container-open",
    FURNACE_OPEN: "furnace-open",
    JUKEBOX_CONTROL: "jukebox-control",
    TV_CONTROL: "tv-control",
    CYCLE_VARIANT: "cycle-variant",
    TOGGLE_STATE: "toggle-state"
});

const INTERACTION_USAGE_KIND = Object.freeze({
    CONTAINER: "container",
    FURNACE: "furnace",
    JUKEBOX: "jukebox",
    TV: "tv",
    SIGN: "sign"
});

const VARIANT_MAX_BY_PROP = Object.freeze({
    [PROP_TYPE.PAINTING]: 3,
    [PROP_TYPE.CURTAINS]: 2
});

const PROP_INTERACTION_CONFIG = Object.freeze({
    [PROP_TYPE.CHAIR]: Object.freeze({
        kind: INTERACTION_KIND.SIT,
        hudHint: "E sentarte | Shift levantarte",
        temporarySync: ["pose"]
    }),
    [PROP_TYPE.BENCH]: Object.freeze({
        kind: INTERACTION_KIND.SIT,
        hudHint: "E sentarte | Shift levantarte",
        temporarySync: ["pose"]
    }),
    [PROP_TYPE.BED]: Object.freeze({
        kind: INTERACTION_KIND.LIE,
        hudHint: "E acostarte | Shift levantarte",
        temporarySync: ["pose"]
    }),
    [PROP_TYPE.LAMP]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E cambiar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.LANTERN]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E cambiar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.TORCH]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E encender/apagar",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.WALL_LANTERN]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E cambiar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.WALL_TORCH]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E encender/apagar",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.LIGHT_POST]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E cambiar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.CAMPFIRE]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E encender/apagar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.CAMPFIRE_MEDIUM]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E encender/apagar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.CAMPFIRE_LARGE]: Object.freeze({
        kind: INTERACTION_KIND.LIGHT_CYCLE,
        hudHint: "E encender/apagar intensidad",
        persistentSync: ["lampLevel"]
    }),
    [PROP_TYPE.EDITABLE_SIGN]: Object.freeze({
        kind: INTERACTION_KIND.EDIT_TEXT,
        hudHint: "E editar texto",
        persistentSync: ["state.text"],
        usageKind: INTERACTION_USAGE_KIND.SIGN
    }),
    [PROP_TYPE.JUKEBOX]: Object.freeze({
        kind: INTERACTION_KIND.JUKEBOX_CONTROL,
        hudHint: "E abrir controles jukebox",
        persistentSync: ["state.playing", "state.track", "state.source", "state.tracks"],
        usageKind: INTERACTION_USAGE_KIND.JUKEBOX
    }),
    [PROP_TYPE.TV_SCREEN]: Object.freeze({
        kind: INTERACTION_KIND.TV_CONTROL,
        hudHint: "E abrir controles TV",
        persistentSync: ["state.powered", "state.youtubeId", "state.playbackStartedAtMs", "state.paused", "state.pauseAtSeconds", "state.title", "state.sizeInches"],
        usageKind: INTERACTION_USAGE_KIND.TV
    }),
    [PROP_TYPE.TV_WALL]: Object.freeze({
        kind: INTERACTION_KIND.TV_CONTROL,
        hudHint: "E abrir controles TV",
        persistentSync: ["state.powered", "state.youtubeId", "state.playbackStartedAtMs", "state.paused", "state.pauseAtSeconds", "state.title", "state.sizeInches"],
        usageKind: INTERACTION_USAGE_KIND.TV
    }),
    [PROP_TYPE.CHEST]: Object.freeze({
        kind: INTERACTION_KIND.CONTAINER_OPEN,
        hudHint: "E abrir cofre",
        persistentSync: ["state.items"],
        temporarySync: ["using"],
        usageKind: INTERACTION_USAGE_KIND.CONTAINER
    }),
    [PROP_TYPE.LARGE_CHEST]: Object.freeze({
        kind: INTERACTION_KIND.CONTAINER_OPEN,
        hudHint: "E abrir cofre grande",
        persistentSync: ["state.items"],
        temporarySync: ["using"],
        usageKind: INTERACTION_USAGE_KIND.CONTAINER
    }),
    [PROP_TYPE.FURNACE]: Object.freeze({
        kind: INTERACTION_KIND.FURNACE_OPEN,
        hudHint: "E abrir horno",
        persistentSync: ["state.input", "state.lit", "state.fuel"],
        temporarySync: ["using"],
        usageKind: INTERACTION_USAGE_KIND.FURNACE
    }),
    [PROP_TYPE.PAINTING]: Object.freeze({
        kind: INTERACTION_KIND.CYCLE_VARIANT,
        hudHint: "E cambiar variante",
        persistentSync: ["state.variant"]
    }),
    [PROP_TYPE.CURTAINS]: Object.freeze({
        kind: INTERACTION_KIND.CYCLE_VARIANT,
        hudHint: "E cambiar variante",
        persistentSync: ["state.variant"]
    })
});

function getPropInteractionConfig(propType) {
    return PROP_INTERACTION_CONFIG[propType] || null;
}

function getPropInteractionMaxDistance(propType = "") {
    if (propType === PROP_TYPE.TV_SCREEN || propType === PROP_TYPE.TV_WALL) {
        return TV_INTERACTION_MAX_DISTANCE;
    }
    return INTERACTION_MAX_DISTANCE;
}

function isInteractionDistanceValid(distance, propType = "") {
    const numeric = Number(distance);
    if (!Number.isFinite(numeric)) {
        return false;
    }
    return numeric <= getPropInteractionMaxDistance(propType) + 0.001;
}

function setLocalPoseActivity(propId, mode, forceBroadcast = true) {
    const nextPropId = String(propId || "");
    const nextMode = normalizePoseMode(mode);
    if (!nextPropId || !nextMode) {
        clearLocalPoseActivity(forceBroadcast);
        return;
    }

    if (
        interactionState.pose
        && interactionState.pose.propId === nextPropId
        && interactionState.pose.mode === nextMode
    ) {
        return;
    }

    interactionState.pose = {
        propId: nextPropId,
        mode: nextMode
    };
    state.keyDown.clear();
    if (forceBroadcast) {
        broadcastLocalPlayerState(true);
    }
}

function clearLocalPoseActivity(forceBroadcast = true) {
    if (!interactionState.pose) {
        return;
    }
    interactionState.pose = null;
    if (forceBroadcast) {
        broadcastLocalPlayerState(true);
    }
}

function setLocalUsingActivity(propId, usageKind, forceBroadcast = true) {
    const nextPropId = String(propId || "");
    const nextUsageKind = String(usageKind || "");
    if (!nextPropId || !nextUsageKind) {
        clearLocalUsingActivity(forceBroadcast);
        return;
    }

    const previous = interactionState.localUsing;
    if (
        previous
        && previous.propId === nextPropId
        && previous.usageKind === nextUsageKind
    ) {
        return;
    }

    interactionState.localUsing = {
        propId: nextPropId,
        usageKind: nextUsageKind
    };

    if (previous?.propId && previous.propId !== nextPropId) {
        applyPropVisualStateById(previous.propId);
    }
    applyPropVisualStateById(nextPropId);

    if (forceBroadcast) {
        broadcastLocalPlayerState(true);
    }
}

function clearLocalUsingActivity(forceBroadcast = true) {
    const previous = interactionState.localUsing;
    if (!previous) {
        return;
    }

    interactionState.localUsing = null;
    if (previous.propId) {
        applyPropVisualStateById(previous.propId);
    }

    if (forceBroadcast) {
        broadcastLocalPlayerState(true);
    }
}

function clearAllTemporaryInteractionState(forceBroadcast = true) {
    const hadPose = Boolean(interactionState.pose);
    const hadUsing = Boolean(interactionState.localUsing);
    if (!hadPose && !hadUsing) {
        return;
    }

    interactionState.pose = null;
    const previousUsing = interactionState.localUsing;
    interactionState.localUsing = null;
    if (previousUsing?.propId) {
        applyPropVisualStateById(previousUsing.propId);
    }

    if (forceBroadcast) {
        broadcastLocalPlayerState(true);
    }
}

function sanitizeVariantIndex(propType, value) {
    const max = Number(VARIANT_MAX_BY_PROP[propType]);
    if (!Number.isFinite(max) || max < 0) {
        return 0;
    }
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return Math.min(numeric, max);
}

function sanitizeContainerItems(rawValue, slotCount = 0) {
    const normalizedCount = Math.max(0, Math.floor(Number(slotCount) || 0));
    const incoming = Array.isArray(rawValue) ? rawValue : [];
    const next = [];
    for (let i = 0; i < normalizedCount; i += 1) {
        const id = String(incoming[i] || "");
        next.push(INVENTORY_ITEM_BY_ID.has(id) ? id : "");
    }
    return next;
}

function areStringArraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i += 1) {
        if (String(a[i] || "") !== String(b[i] || "")) {
            return false;
        }
    }
    return true;
}

function getTemporaryUsageEntry(propId) {
    const key = String(propId || "");
    if (!key) {
        return null;
    }
    const remote = interactionState.remoteUsingByProp.get(key);
    const localMatches = interactionState.localUsing?.propId === key
        ? interactionState.localUsing
        : null;
    return {
        total: (remote?.count || 0) + (localMatches ? 1 : 0),
        hasLocal: Boolean(localMatches),
        remoteCount: remote?.count || 0,
        usageKinds: new Set([
            ...(remote?.usageKinds ? Array.from(remote.usageKinds) : []),
            ...(localMatches?.usageKind ? [localMatches.usageKind] : [])
        ])
    };
}

function isPropBeingTemporarilyUsed(propId, usageKind = "") {
    const usage = getTemporaryUsageEntry(propId);
    if (!usage) {
        return false;
    }
    if (!usageKind) {
        return usage.total > 0;
    }
    return usage.usageKinds.has(String(usageKind));
}

function getRotatedPropHalfExtents(propType, yaw = 0, sharedState = null) {
    const profile = getPropProfileForState(propType, sharedState);
    const base = profile.halfExtents || { x: 0.25, z: 0.25 };
    const normalized = Math.abs(Math.round(normalizeYawRadians(yaw) / PROP_ROTATION_STEP)) % 2;
    if (normalized === 1) {
        return { x: base.z, z: base.x };
    }

    return { x: base.x, z: base.z };
}

function getPlacedPropBoundsAt(propType, x, y, z, yaw = 0, expand = 0, sharedState = null) {
    const profile = getPropProfileForState(propType, sharedState);
    const extents = getRotatedPropHalfExtents(propType, yaw, sharedState);
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
        expand,
        placed.state
    );
}

function getPlacedPropSupportY(placed) {
    if (!placed) {
        return 0;
    }
    const profile = getPropProfileForState(placed.propType, placed.state);
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

function sanitizeEditableSignText(value, fallback = "Nuestro lugar") {
    const base = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!base) {
        return String(fallback || "Nuestro lugar").slice(0, SIGN_TEXT_MAX_LENGTH);
    }
    return base.slice(0, SIGN_TEXT_MAX_LENGTH);
}

function sanitizeJukeboxTrack(value) {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return Math.min(numeric, JUKEBOX_TRACK_COUNT);
}

const SPOTIFY_RESOURCE_TYPES = new Set(["track", "album", "playlist", "episode"]);
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function sanitizeSpotifyUri(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    const directMatch = raw.match(/^spotify:(track|album|playlist|episode):([a-z0-9]+)$/i);
    if (directMatch) {
        return `spotify:${directMatch[1].toLowerCase()}:${directMatch[2]}`;
    }

    let parsedUrl = null;
    try {
        parsedUrl = new URL(raw);
    } catch (error) {
        return "";
    }

    const host = String(parsedUrl.hostname || "").toLowerCase();
    if (!host.endsWith("spotify.com")) {
        return "";
    }

    const pathParts = String(parsedUrl.pathname || "").split("/").filter(Boolean);
    if (pathParts.length < 2) {
        return "";
    }

    let typeIndex = 0;
    if (!SPOTIFY_RESOURCE_TYPES.has(String(pathParts[0]).toLowerCase()) && pathParts.length >= 3) {
        typeIndex = 1;
    }

    const type = String(pathParts[typeIndex] || "").toLowerCase();
    const idRaw = String(pathParts[typeIndex + 1] || "");
    const id = idRaw.replace(/[^a-z0-9]/gi, "");
    if (!SPOTIFY_RESOURCE_TYPES.has(type) || !id) {
        return "";
    }

    return `spotify:${type}:${id}`;
}

function hasCustomJukeboxTrackSlots(rawSlots) {
    const slots = sanitizeJukeboxTrackSlots(rawSlots);
    return slots.some((slot) => slot.type !== "local" || Boolean(slot.label));
}

function sanitizeYouTubeVideoId(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    if (YOUTUBE_ID_PATTERN.test(raw)) {
        return raw;
    }

    let parsedUrl = null;
    try {
        parsedUrl = new URL(raw);
    } catch (error) {
        return "";
    }

    const host = String(parsedUrl.hostname || "").toLowerCase();
    if (
        host !== "youtu.be"
        && !host.endsWith("youtube.com")
        && !host.endsWith("youtube-nocookie.com")
    ) {
        return "";
    }

    if (host === "youtu.be") {
        const shortId = String(parsedUrl.pathname || "").split("/").filter(Boolean)[0] || "";
        return YOUTUBE_ID_PATTERN.test(shortId) ? shortId : "";
    }

    const watchId = parsedUrl.searchParams.get("v") || "";
    if (YOUTUBE_ID_PATTERN.test(watchId)) {
        return watchId;
    }

    const pathParts = String(parsedUrl.pathname || "").split("/").filter(Boolean);
    const candidate = pathParts[0] === "embed"
        || pathParts[0] === "shorts"
        || pathParts[0] === "live"
        ? (pathParts[1] || "")
        : "";
    return YOUTUBE_ID_PATTERN.test(candidate) ? candidate : "";
}

function sanitizeTvPlaybackStartAtMs(value, fallback = 0) {
    const numeric = Math.floor(Number(value));
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
    }
    const fallbackNumeric = Math.floor(Number(fallback));
    return Number.isFinite(fallbackNumeric) && fallbackNumeric > 0 ? fallbackNumeric : 0;
}

function sanitizeTvPauseAtSeconds(value, fallback = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
        return Math.min(24 * 60 * 60, numeric);
    }
    const fallbackNumeric = Number(fallback);
    if (Number.isFinite(fallbackNumeric) && fallbackNumeric >= 0) {
        return Math.min(24 * 60 * 60, fallbackNumeric);
    }
    return 0;
}

function sanitizeTvSizeInches(value, fallback = 200) {
    const numeric = Math.floor(Number(value));
    if (TV_SIZE_OPTIONS.includes(numeric)) {
        return numeric;
    }
    const fallbackNumeric = Math.floor(Number(fallback));
    if (TV_SIZE_OPTIONS.includes(fallbackNumeric)) {
        return fallbackNumeric;
    }
    return 200;
}

function getTvScaleFactorFromSize(sizeInches) {
    const size = sanitizeTvSizeInches(sizeInches, 200);
    if (size === 100) {
        return 0.5;
    }
    if (size === 70) {
        return 0.35;
    }
    return 1;
}

function promptTvSizeSelection() {
    const fallbackSize = sanitizeTvSizeInches(uiState.tvPlacementSizeInches, 200);
    let rawInput = null;
    try {
        rawInput = window.prompt("Tamano TV (70, 100, 200):", String(fallbackSize));
    } catch (error) {
        rawInput = String(fallbackSize);
    }
    if (rawInput === null) {
        return null;
    }

    const extracted = String(rawInput).match(/\d+/g);
    const candidate = extracted?.length ? Number(extracted[0]) : Number(rawInput);
    const nextSize = sanitizeTvSizeInches(candidate, fallbackSize);
    uiState.tvPlacementSizeInches = nextSize;
    return nextSize;
}

function sanitizeJukeboxSource(value, fallback = JUKEBOX_SOURCE_DEFAULT) {
    const fallbackText = String(fallback || JUKEBOX_SOURCE_DEFAULT).trim() || JUKEBOX_SOURCE_DEFAULT;
    const raw = String(value ?? fallbackText).trim();
    if (!raw) {
        return fallbackText;
    }
    if (raw === JUKEBOX_SOURCE_DEFAULT) {
        return JUKEBOX_SOURCE_DEFAULT;
    }
    if (raw.startsWith(JUKEBOX_SOURCE_PREFIX_RECORDING)) {
        const recordingTrack = sanitizeJukeboxTrack(raw.slice(JUKEBOX_SOURCE_PREFIX_RECORDING.length));
        return recordingTrack > 0 ? `${JUKEBOX_SOURCE_PREFIX_RECORDING}${recordingTrack}` : fallbackText;
    }
    if (raw.startsWith(JUKEBOX_SOURCE_PREFIX_SPOTIFY)) {
        const spotifyUri = sanitizeSpotifyUri(raw.slice(JUKEBOX_SOURCE_PREFIX_SPOTIFY.length));
        return spotifyUri ? `${JUKEBOX_SOURCE_PREFIX_SPOTIFY}${spotifyUri}` : fallbackText;
    }
    if (raw.startsWith(JUKEBOX_SOURCE_PREFIX_YOUTUBE)) {
        const youtubeId = sanitizeYouTubeVideoId(raw.slice(JUKEBOX_SOURCE_PREFIX_YOUTUBE.length));
        return youtubeId ? `${JUKEBOX_SOURCE_PREFIX_YOUTUBE}${youtubeId}` : fallbackText;
    }
    return fallbackText;
}

function buildLegacyPropStateCandidate(rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object") {
        return {};
    }

    return {
        lit: rawEntry.lit,
        text: rawEntry.text,
        playing: rawEntry.playing,
        track: rawEntry.track,
        source: rawEntry.source,
        tracks: rawEntry.tracks,
        powered: rawEntry.powered,
        youtubeId: rawEntry.youtubeId,
        playbackStartedAtMs: rawEntry.playbackStartedAtMs,
        paused: rawEntry.paused,
        pauseAtSeconds: rawEntry.pauseAtSeconds,
        title: rawEntry.title,
        sizeInches: rawEntry.sizeInches
    };
}

function normalizePropSharedState(propType, rawState, fallbackRaw = null) {
    const definition = getPropDefinition(propType);
    const defaults = definition?.stateDefaults;
    if (!defaults || typeof defaults !== "object" || Object.keys(defaults).length === 0) {
        return undefined;
    }

    const source = rawState && typeof rawState === "object"
        ? rawState
        : buildLegacyPropStateCandidate(fallbackRaw);
    const normalized = {};

    for (const [key, defaultValue] of Object.entries(defaults)) {
        const incoming = source[key];
        if (key === "text") {
            normalized[key] = sanitizeEditableSignText(incoming, defaultValue);
            continue;
        }
        if (key === "track") {
            normalized[key] = sanitizeJukeboxTrack(incoming ?? defaultValue);
            continue;
        }
        if (key === "items") {
            const defaultSize = Array.isArray(defaultValue) ? defaultValue.length : 0;
            const incomingItems = Array.isArray(incoming) ? incoming : defaultValue;
            normalized[key] = sanitizeContainerItems(incomingItems, defaultSize);
            continue;
        }
        if (key === "variant") {
            normalized[key] = sanitizeVariantIndex(propType, incoming ?? defaultValue);
            continue;
        }
        if (key === "fuel") {
            const numericFuel = Number(incoming ?? defaultValue);
            normalized[key] = THREE.MathUtils.clamp(Number.isFinite(numericFuel) ? numericFuel : 0, 0, 100);
            continue;
        }
        if (key === "source") {
            normalized[key] = sanitizeJukeboxSource(incoming ?? defaultValue, defaultValue);
            continue;
        }
        if (key === "tracks") {
            normalized[key] = sanitizeJukeboxTrackSlots(incoming ?? defaultValue);
            continue;
        }
        if (key === "youtubeId") {
            normalized[key] = sanitizeYouTubeVideoId(incoming ?? defaultValue);
            continue;
        }
        if (key === "playbackStartedAtMs") {
            normalized[key] = sanitizeTvPlaybackStartAtMs(incoming ?? defaultValue, defaultValue);
            continue;
        }
        if (key === "pauseAtSeconds") {
            normalized[key] = sanitizeTvPauseAtSeconds(incoming ?? defaultValue, defaultValue);
            continue;
        }
        if (key === "title") {
            normalized[key] = String((incoming ?? defaultValue) || "").slice(0, 120);
            continue;
        }
        if (key === "sizeInches") {
            normalized[key] = sanitizeTvSizeInches(incoming ?? defaultValue, defaultValue);
            continue;
        }

        if (typeof defaultValue === "boolean") {
            normalized[key] = incoming === undefined ? Boolean(defaultValue) : Boolean(incoming);
            continue;
        }

        if (typeof defaultValue === "number") {
            const numeric = Number(incoming);
            normalized[key] = Number.isFinite(numeric) ? numeric : Number(defaultValue) || 0;
            continue;
        }

        if (typeof defaultValue === "string") {
            normalized[key] = String(incoming ?? defaultValue);
            continue;
        }

        normalized[key] = incoming ?? defaultValue;
    }

    return normalized;
}

function getPropDefaultSharedState(propType) {
    const defaults = getPropDefinition(propType)?.stateDefaults;
    if (!defaults || typeof defaults !== "object" || Object.keys(defaults).length === 0) {
        return undefined;
    }
    return normalizePropSharedState(propType, defaults, defaults);
}

function arePropStatesEqual(a, b) {
    const left = a && typeof a === "object" ? a : {};
    const right = b && typeof b === "object" ? b : {};
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    for (const key of leftKeys) {
        if (!areStateValuesEqual(left[key], right[key])) {
            return false;
        }
    }
    return true;
}

function isTypingIntoEditableTarget(target) {
    const node = target || document.activeElement;
    if (!node || typeof node !== "object") {
        return false;
    }

    if (node.isContentEditable) {
        return true;
    }

    const tagName = String(node.tagName || "").toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return true;
    }

    if (typeof node.closest === "function") {
        return Boolean(node.closest("[contenteditable='true']"));
    }

    return false;
}

function isPlainHotkeyEvent(event) {
    return !event.ctrlKey && !event.metaKey && !event.altKey;
}

function areStateValuesEqual(leftValue, rightValue) {
    if (leftValue === rightValue) {
        return true;
    }
    if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
        return true;
    }

    const leftIsArray = Array.isArray(leftValue);
    const rightIsArray = Array.isArray(rightValue);
    if (leftIsArray || rightIsArray) {
        if (!leftIsArray || !rightIsArray || leftValue.length !== rightValue.length) {
            return false;
        }
        for (let i = 0; i < leftValue.length; i += 1) {
            if (!areStateValuesEqual(leftValue[i], rightValue[i])) {
                return false;
            }
        }
        return true;
    }

    const leftIsObject = leftValue && typeof leftValue === "object";
    const rightIsObject = rightValue && typeof rightValue === "object";
    if (leftIsObject || rightIsObject) {
        if (!leftIsObject || !rightIsObject) {
            return false;
        }
        const leftKeys = Object.keys(leftValue);
        const rightKeys = Object.keys(rightValue);
        if (leftKeys.length !== rightKeys.length) {
            return false;
        }
        for (const key of leftKeys) {
            if (!Object.prototype.hasOwnProperty.call(rightValue, key)) {
                return false;
            }
            if (!areStateValuesEqual(leftValue[key], rightValue[key])) {
                return false;
            }
        }
        return true;
    }

    return false;
}

function drawEditableSignFace(node, text) {
    const canvas = node?.userData?.signCanvas;
    const context = node?.userData?.signContext;
    const texture = node?.userData?.signTexture;
    if (!canvas || !context || !texture) {
        return;
    }

    const safeText = sanitizeEditableSignText(text);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#c28a58";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#8f6039";
    context.fillRect(14, 14, canvas.width - 28, canvas.height - 28);
    context.fillStyle = "#dec79f";
    context.fillRect(22, 22, canvas.width - 44, canvas.height - 44);
    context.fillStyle = "#4b2f1f";
    context.font = "700 52px Sora, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";

    const firstLine = safeText.slice(0, 22);
    const remaining = safeText.slice(22);
    if (!remaining) {
        context.fillText(firstLine, canvas.width * 0.5, canvas.height * 0.52);
    } else {
        const secondLine = remaining.slice(0, 22);
        context.fillText(firstLine, canvas.width * 0.5, canvas.height * 0.42);
        context.fillText(secondLine, canvas.width * 0.5, canvas.height * 0.65);
    }
    texture.needsUpdate = true;
}

function applyPropSharedVisualState(placed) {
    if (!placed?.node) {
        return;
    }

    const propType = placed.propType;
    const stateData = normalizePropSharedState(propType, placed.state, placed.state);
    if (stateData && !arePropStatesEqual(placed.state, stateData)) {
        placed.state = stateData;
    }

    if (propType === PROP_TYPE.EDITABLE_SIGN) {
        const textValue = sanitizeEditableSignText(placed.state?.text);
        if (!placed.state || placed.state.text !== textValue) {
            placed.state = {
                ...(placed.state || {}),
                text: textValue
            };
        }
        drawEditableSignFace(placed.node, textValue);
        return;
    }

    if (propType === PROP_TYPE.JUKEBOX) {
        const playing = Boolean(placed.state?.playing);
        const track = sanitizeJukeboxTrack(placed.state?.track);
        const source = sanitizeJukeboxSource(placed.state?.source, JUKEBOX_SOURCE_DEFAULT);
        const tracks = sanitizeJukeboxTrackSlots(placed.state?.tracks);
        if (
            !placed.state
            || placed.state.playing !== playing
            || placed.state.track !== track
            || placed.state.source !== source
            || !areStateValuesEqual(placed.state.tracks, tracks)
        ) {
            placed.state = {
                ...(placed.state || {}),
                playing,
                track,
                source,
                tracks
            };
        }

        const discMaterial = placed.node.userData?.jukeboxDiscMaterial || null;
        if (discMaterial) {
            const emissiveColor = Number(discMaterial.userData?.jukeboxEmissiveColor ?? 0x5aa8ff);
            discMaterial.color.setHex(playing ? 0x2b2f40 : 0x222329);
            discMaterial.emissive.setHex(emissiveColor);
            discMaterial.emissiveIntensity = playing ? 0.46 + (track * 0.07) : 0;
        }

        const ledMaterial = placed.node.userData?.jukeboxLedMaterial || null;
        if (ledMaterial) {
            const ledColor = Number(ledMaterial.userData?.jukeboxLedEmissiveColor ?? 0x80beff);
            ledMaterial.emissive.setHex(ledColor);
            ledMaterial.emissiveIntensity = playing ? 0.68 : 0;
        }

        const usage = getTemporaryUsageEntry(placed.id);
        if (usage && usage.total > 0 && !playing) {
            const ledMaterialMuted = placed.node.userData?.jukeboxLedMaterial || null;
            if (ledMaterialMuted) {
                const ledColor = Number(ledMaterialMuted.userData?.jukeboxLedEmissiveColor ?? 0x80beff);
                ledMaterialMuted.emissive.setHex(ledColor);
                ledMaterialMuted.emissiveIntensity = 0.22;
            }
        }
        return;
    }

    if (propType === PROP_TYPE.TV_SCREEN || propType === PROP_TYPE.TV_WALL) {
        const powered = Boolean(placed.state?.powered);
        const youtubeId = sanitizeYouTubeVideoId(placed.state?.youtubeId || "");
        const playbackStartedAtMs = sanitizeTvPlaybackStartAtMs(placed.state?.playbackStartedAtMs, 0);
        const paused = Boolean(placed.state?.paused);
        const pauseAtSeconds = sanitizeTvPauseAtSeconds(placed.state?.pauseAtSeconds, 0);
        const title = String(placed.state?.title || "").slice(0, 120);
        const sizeInches = sanitizeTvSizeInches(placed.state?.sizeInches, 200);
        if (
            !placed.state
            || placed.state.powered !== powered
            || placed.state.youtubeId !== youtubeId
            || placed.state.playbackStartedAtMs !== playbackStartedAtMs
            || placed.state.paused !== paused
            || Math.abs((Number(placed.state.pauseAtSeconds) || 0) - pauseAtSeconds) > 0.001
            || placed.state.title !== title
            || placed.state.sizeInches !== sizeInches
        ) {
            placed.state = {
                ...(placed.state || {}),
                powered,
                youtubeId,
                playbackStartedAtMs,
                paused,
                pauseAtSeconds,
                title,
                sizeInches
            };
        }

        const previousSizeInches = sanitizeTvSizeInches(placed.node.userData?.tvSizeInchesApplied, sizeInches);
        const previousProfile = getPropProfileForState(propType, { sizeInches: previousSizeInches });
        const nextProfile = getPropProfileForState(propType, { sizeInches });
        const previousMinY = Number(previousProfile.minY) || 0;
        const nextMinY = Number(nextProfile.minY) || 0;
        const scaleFactor = getTvScaleFactorFromSize(sizeInches);
        const currentScaleFactor = Number(placed.node.userData?.tvScaleFactor || 0);
        const scaleChanged = !Number.isFinite(currentScaleFactor) || Math.abs(currentScaleFactor - scaleFactor) > 1e-4;
        if (scaleChanged) {
            const currentY = Number(placed.y) || 0;
            let wallReindexedFromYOffset = false;
            if (propType === PROP_TYPE.TV_WALL) {
                const savedBottomY = Number(placed.node.userData?.tvWallBottomY);
                const fixedBottomY = Number.isFinite(savedBottomY) ? savedBottomY : (currentY + previousMinY);
                placed.node.userData.tvWallBottomY = fixedBottomY;
                const nextY = fixedBottomY - nextMinY;
                if (Math.abs(nextY - currentY) > 1e-4) {
                    unindexPlacedProp(placed);
                    placed.y = nextY;
                    placed.node.position.y = nextY;
                    indexPlacedProp(placed);
                    wallReindexedFromYOffset = true;
                }
            } else {
                placed.node.userData.tvWallBottomY = undefined;
            }
            placed.node.scale.setScalar(scaleFactor);
            placed.node.userData.tvScaleFactor = scaleFactor;
            placed.node.userData.tvSizeInchesApplied = sizeInches;
            if (propType !== PROP_TYPE.TV_WALL || !wallReindexedFromYOffset) {
                unindexPlacedProp(placed);
                indexPlacedProp(placed);
            }
            propState.cullingDirty = true;
        } else {
            placed.node.userData.tvSizeInchesApplied = sizeInches;
            if (propType === PROP_TYPE.TV_WALL && !Number.isFinite(Number(placed.node.userData?.tvWallBottomY))) {
                placed.node.userData.tvWallBottomY = (Number(placed.y) || 0) + nextMinY;
            }
        }

        const screenMaterial = placed.node.userData?.tvScreenMaterial || null;
        if (screenMaterial) {
            screenMaterial.color.setHex(powered ? 0xc3d3e6 : 0x0f1216);
            screenMaterial.emissive.setHex(0x8ec8ff);
            screenMaterial.emissiveIntensity = powered ? 0.45 : 0.01;
        }
        const indicatorMaterial = placed.node.userData?.tvIndicatorMaterial || null;
        if (indicatorMaterial) {
            indicatorMaterial.emissive.setHex(powered ? 0x58ff9a : 0xff5f5f);
            indicatorMaterial.emissiveIntensity = powered ? 0.62 : 0.28;
        }
        return;
    }

    if (propType === PROP_TYPE.FURNACE) {
        const lit = Boolean(placed.state?.lit);
        if (!placed.state || placed.state.lit !== lit) {
            placed.state = {
                ...(placed.state || {}),
                lit
            };
        }

        const emberMaterial = placed.node.userData?.furnaceEmberMaterial || null;
        if (emberMaterial) {
            const emberColor = Number(emberMaterial.userData?.furnaceEmissiveColor ?? 0xff7f34);
            emberMaterial.emissive.setHex(emberColor);
            emberMaterial.emissiveIntensity = lit ? 0.72 : 0;
            emberMaterial.color.setHex(lit ? 0x803723 : 0x391f15);
        }

        const furnaceLight = placed.node.userData?.furnacePointLight || null;
        if (furnaceLight) {
            furnaceLight.intensity = lit ? 0.74 : 0;
            furnaceLight.distance = lit ? 4.6 : 0;
            furnaceLight.visible = lit;
        }
        return;
    }

    if (propType === PROP_TYPE.CHEST || propType === PROP_TYPE.LARGE_CHEST) {
        const lidPivot = placed.node.userData?.containerLidPivot || null;
        if (lidPivot) {
            const isOpen = isPropBeingTemporarilyUsed(placed.id, INTERACTION_USAGE_KIND.CONTAINER);
            lidPivot.rotation.x = isOpen ? -1.02 : 0;
        }
        return;
    }

    if (propType === PROP_TYPE.PAINTING) {
        const variant = sanitizeVariantIndex(propType, placed.state?.variant);
        if (!placed.state || placed.state.variant !== variant) {
            placed.state = {
                ...(placed.state || {}),
                variant
            };
        }
        const canvasMaterial = placed.node.userData?.paintingCanvasMaterial || null;
        if (canvasMaterial) {
            const colors = [0x7e9bc2, 0xc27e8f, 0x8ab67e, 0xd6b779];
            canvasMaterial.color.setHex(colors[variant] || colors[0]);
        }
        return;
    }

    if (propType === PROP_TYPE.CURTAINS) {
        const variant = sanitizeVariantIndex(propType, placed.state?.variant);
        if (!placed.state || placed.state.variant !== variant) {
            placed.state = {
                ...(placed.state || {}),
                variant
            };
        }
        const curtainsMaterial = placed.node.userData?.curtainsFabricMaterial || null;
        if (curtainsMaterial) {
            const colors = [0xc58aa5, 0x8aa5c5, 0xbfd1a2];
            curtainsMaterial.color.setHex(colors[variant] || colors[0]);
        }
    }
}

function applyPropVisualStateById(propId) {
    const id = String(propId || "");
    if (!id) {
        return;
    }
    const placed = placedProps.get(id);
    if (!placed) {
        return;
    }
    applyPropSharedVisualState(placed);
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
    pointLight.shadow.bias = 0.00035;
    pointLight.shadow.normalBias = 0.012;
    pointLight.shadow.camera.near = 0.1;
    pointLight.shadow.camera.far = 26;
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
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.35, -0.26);
    lidPivot.add(createDetailPart({ x: 0.8, y: 0.16, z: 0.58 }, { x: 0, y: 0.08, z: 0.29 }, 0xaa7a4a));
    lidPivot.add(createDetailPart({ x: 0.82, y: 0.02, z: 0.02 }, { x: 0, y: 0.02, z: 0.57 }, 0x6c482a));
    root.add(lidPivot);
    root.add(createDetailPart({ x: 0.1, y: 0.16, z: 0.06 }, { x: 0, y: 0.34, z: 0.31 }, 0xccb57a));
    root.add(createDetailPart({ x: 0.82, y: 0.02, z: 0.02 }, { x: 0, y: 0.25, z: 0.29 }, 0x6c482a));
    root.userData.containerLidPivot = lidPivot;
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

function addTorchFlameRig(root, {
    flamePosition = { x: 0, y: 0.78, z: 0 },
    smokePosition = null,
    pointLightColor = 0xffcf86
} = {}) {
    const smokePos = smokePosition || {
        x: flamePosition.x,
        y: flamePosition.y + 0.14,
        z: flamePosition.z - 0.01
    };

    const emberMaterial = createDisposableStandardMaterial({
        color: 0x2a1f17,
        roughness: 0.85,
        metalness: 0,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    emberMaterial.userData.lampTorchEmberColor = 0x2b1e17;
    root.add(createDynamicPart(
        { x: 0.07, y: 0.08, z: 0.07 },
        { x: flamePosition.x, y: flamePosition.y - 0.01, z: flamePosition.z },
        emberMaterial
    ));

    const flameOuterMaterial = createDisposableStandardMaterial({
        color: 0xffa42e,
        roughness: 0.48,
        metalness: 0,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    flameOuterMaterial.userData.lampFlameEmissiveColor = 0xff8d30;
    root.add(createDynamicPart(
        { x: 0.08, y: 0.16, z: 0.08 },
        { x: flamePosition.x, y: flamePosition.y + 0.06, z: flamePosition.z },
        flameOuterMaterial
    ));

    const flameCoreMaterial = createDisposableStandardMaterial({
        color: 0xfff4ba,
        roughness: 0.22,
        metalness: 0,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    flameCoreMaterial.userData.lampFlameEmissiveColor = 0xffefae;
    root.add(createDynamicPart(
        { x: 0.04, y: 0.1, z: 0.04 },
        { x: flamePosition.x, y: flamePosition.y + 0.055, z: flamePosition.z + 0.005 },
        flameCoreMaterial
    ));

    const smokeMaterial = createDisposableStandardMaterial({
        color: 0x474b52,
        roughness: 0.98,
        metalness: 0,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    smokeMaterial.userData.lampSmokeColor = 0x5a5f68;
    root.add(createDynamicPart(
        { x: 0.07, y: 0.14, z: 0.07 },
        smokePos,
        smokeMaterial
    ));

    createLampPointLightRig(root, {
        baseColor: 0x3f3126,
        emissiveColor: 0xffca6f,
        pointLightColor,
        bulbScale: { x: 0.07, y: 0.07, z: 0.07 },
        bulbPosition: { x: flamePosition.x, y: flamePosition.y + 0.05, z: flamePosition.z }
    });

    root.userData.lampFlameMaterial = flameOuterMaterial;
    root.userData.lampFlameCoreMaterial = flameCoreMaterial;
    root.userData.lampSmokeMaterial = smokeMaterial;
    root.userData.lampTorchEmberMaterial = emberMaterial;
}

function buildTorchNode(root) {
    root.add(createDetailPart(
        { x: 0.08, y: 0.72, z: 0.08 },
        { x: 0, y: 0.36, z: 0 },
        0x8b653f,
        { x: 0.06, y: 0.08, z: -0.04 }
    ));
    root.add(createDetailPart({ x: 0.09, y: 0.06, z: 0.09 }, { x: 0, y: 0.02, z: 0 }, 0x4d3a29));
    addTorchFlameRig(root, {
        flamePosition: { x: 0.02, y: 0.74, z: -0.01 },
        smokePosition: { x: 0.03, y: 0.93, z: -0.02 },
        pointLightColor: 0xffd189
    });
}

function buildWallTorchNode(root) {
    root.add(createDetailPart({ x: 0.12, y: 0.2, z: 0.08 }, { x: 0, y: 0.34, z: -0.2 }, 0x4f3929));
    root.add(createDetailPart(
        { x: 0.08, y: 0.7, z: 0.08 },
        { x: 0, y: 0.33, z: 0.03 },
        0x87623d,
        { x: 0.44, y: 0, z: -0.02 }
    ));
    addTorchFlameRig(root, {
        flamePosition: { x: 0, y: 0.74, z: 0.24 },
        smokePosition: { x: 0, y: 0.92, z: 0.24 },
        pointLightColor: 0xffcf86
    });
}

function createDisposableStandardMaterial(options = {}) {
    const material = new THREE.MeshStandardMaterial(options);
    material.userData.disposeOnRemove = true;
    if (options?.map) {
        material.userData.disposeMapOnRemove = true;
    }
    return material;
}

function createDynamicPart(size, position, material, rotation = null) {
    const mesh = new THREE.Mesh(detailUnitGeometry, material);
    mesh.scale.set(size.x, size.y, size.z);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (rotation) {
        mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    return mesh;
}

function buildBookshelfNode(root) {
    root.add(createDetailPart({ x: 0.92, y: 1.14, z: 0.42 }, { x: 0, y: 0.57, z: 0 }, 0x7e5a39));
    root.add(createDetailPart({ x: 0.82, y: 0.94, z: 0.34 }, { x: 0, y: 0.57, z: 0 }, 0x5b3e2b));
    root.add(createDetailPart({ x: 0.82, y: 0.06, z: 0.38 }, { x: 0, y: 0.34, z: 0 }, 0x9b6f47));
    root.add(createDetailPart({ x: 0.82, y: 0.06, z: 0.38 }, { x: 0, y: 0.62, z: 0 }, 0x9b6f47));
    root.add(createDetailPart({ x: 0.82, y: 0.06, z: 0.38 }, { x: 0, y: 0.9, z: 0 }, 0x9b6f47));
    root.add(createDetailPart({ x: 0.16, y: 0.18, z: 0.1 }, { x: -0.24, y: 0.43, z: 0.13 }, 0x934d4c));
    root.add(createDetailPart({ x: 0.1, y: 0.2, z: 0.1 }, { x: -0.06, y: 0.44, z: 0.13 }, 0x4d6f9d));
    root.add(createDetailPart({ x: 0.12, y: 0.18, z: 0.1 }, { x: 0.1, y: 0.43, z: 0.13 }, 0xa57f53));
    root.add(createDetailPart({ x: 0.14, y: 0.18, z: 0.1 }, { x: 0.26, y: 0.43, z: 0.13 }, 0x5d8d57));
}

function buildBarrelNode(root) {
    root.add(createDetailPart({ x: 0.52, y: 0.68, z: 0.52 }, { x: 0, y: 0.34, z: 0 }, 0x7f5636));
    root.add(createDetailPart({ x: 0.56, y: 0.06, z: 0.56 }, { x: 0, y: 0.67, z: 0 }, 0x4a3830));
    root.add(createDetailPart({ x: 0.56, y: 0.06, z: 0.56 }, { x: 0, y: 0.03, z: 0 }, 0x4a3830));
    root.add(createDetailPart({ x: 0.58, y: 0.08, z: 0.08 }, { x: 0, y: 0.34, z: 0.24 }, 0x4a3830));
    root.add(createDetailPart({ x: 0.58, y: 0.08, z: 0.08 }, { x: 0, y: 0.34, z: -0.24 }, 0x4a3830));
}

function buildWoodCrateNode(root) {
    root.add(createDetailPart({ x: 0.7, y: 0.46, z: 0.7 }, { x: 0, y: 0.23, z: 0 }, 0x9a6d43));
    root.add(createDetailPart({ x: 0.64, y: 0.34, z: 0.64 }, { x: 0, y: 0.23, z: 0 }, 0x744f32));
    root.add(createDetailPart({ x: 0.7, y: 0.06, z: 0.12 }, { x: 0, y: 0.43, z: 0.24 }, 0xb18255));
    root.add(createDetailPart({ x: 0.7, y: 0.06, z: 0.12 }, { x: 0, y: 0.43, z: -0.24 }, 0xb18255));
    root.add(createDetailPart({ x: 0.12, y: 0.46, z: 0.7 }, { x: 0.24, y: 0.23, z: 0 }, 0xb18255));
    root.add(createDetailPart({ x: 0.12, y: 0.46, z: 0.7 }, { x: -0.24, y: 0.23, z: 0 }, 0xb18255));
}

function buildRugNode(root) {
    root.add(createDetailPart({ x: 0.96, y: 0.02, z: 0.96 }, { x: 0, y: 0.01, z: 0 }, 0x8f2f4f));
    root.add(createDetailPart({ x: 0.86, y: 0.01, z: 0.86 }, { x: 0, y: 0.021, z: 0 }, 0xbe6f89));
    root.add(createDetailPart({ x: 0.08, y: 0.02, z: 0.92 }, { x: -0.44, y: 0.01, z: 0 }, 0x784966));
    root.add(createDetailPart({ x: 0.08, y: 0.02, z: 0.92 }, { x: 0.44, y: 0.01, z: 0 }, 0x784966));
}

function buildPaintingNode(root) {
    root.add(createDetailPart({ x: 0.88, y: 0.62, z: 0.06 }, { x: 0, y: 0.72, z: 0 }, 0x6f4b31));
    const paintingMaterial = createDisposableStandardMaterial({
        color: 0x7e9bc2,
        roughness: 0.74,
        metalness: 0.02
    });
    root.add(createDynamicPart({ x: 0.74, y: 0.48, z: 0.04 }, { x: 0, y: 0.72, z: 0.02 }, paintingMaterial));
    root.add(createDetailPart({ x: 0.7, y: 0.02, z: 0.02 }, { x: 0, y: 0.87, z: 0.02 }, 0xe4d384));
    root.add(createDetailPart({ x: 0.06, y: 0.72, z: 0.06 }, { x: -0.28, y: 0.36, z: -0.02 }, 0x6d4b32));
    root.add(createDetailPart({ x: 0.06, y: 0.72, z: 0.06 }, { x: 0.28, y: 0.36, z: -0.02 }, 0x6d4b32));
    root.userData.paintingCanvasMaterial = paintingMaterial;
}

function buildCurtainsNode(root) {
    root.add(createDetailPart({ x: 0.94, y: 0.06, z: 0.1 }, { x: 0, y: 1.0, z: 0 }, 0x7c4f66));
    const curtainsMaterial = createDisposableStandardMaterial({
        color: 0xc58aa5,
        roughness: 0.86,
        metalness: 0
    });
    root.add(createDynamicPart({ x: 0.38, y: 0.88, z: 0.08 }, { x: -0.22, y: 0.54, z: 0 }, curtainsMaterial));
    root.add(createDynamicPart({ x: 0.38, y: 0.88, z: 0.08 }, { x: 0.22, y: 0.54, z: 0 }, curtainsMaterial));
    root.add(createDetailPart({ x: 0.04, y: 0.88, z: 0.09 }, { x: -0.39, y: 0.54, z: 0 }, 0xe7cad8));
    root.add(createDetailPart({ x: 0.04, y: 0.88, z: 0.09 }, { x: 0.39, y: 0.54, z: 0 }, 0xe7cad8));
    root.userData.curtainsFabricMaterial = curtainsMaterial;
}

function buildWallLanternNode(root) {
    root.add(createDetailPart({ x: 0.16, y: 0.8, z: 0.16 }, { x: 0, y: 0.4, z: -0.1 }, 0x4e3c2f));
    root.add(createDetailPart({ x: 0.36, y: 0.08, z: 0.08 }, { x: 0, y: 0.72, z: 0.08 }, 0x584330));
    root.add(createDetailPart({ x: 0.22, y: 0.06, z: 0.22 }, { x: 0, y: 0.52, z: 0.2 }, 0x2f2a28));
    root.add(createDetailPart({ x: 0.18, y: 0.28, z: 0.18 }, { x: 0, y: 0.38, z: 0.2 }, 0xccaa73));
    root.add(createDetailPart({ x: 0.22, y: 0.05, z: 0.22 }, { x: 0, y: 0.24, z: 0.2 }, 0x2f2a28));
    createLampPointLightRig(root, {
        baseColor: 0xffdc9d,
        emissiveColor: 0xffc06c,
        pointLightColor: 0xffd28a,
        bulbScale: { x: 0.09, y: 0.09, z: 0.09 },
        bulbPosition: { x: 0, y: 0.39, z: 0.2 }
    });
}

function buildLightPostNode(root) {
    root.add(createDetailPart({ x: 0.18, y: 1.65, z: 0.18 }, { x: 0, y: 0.83, z: 0 }, 0x4f4f56));
    root.add(createDetailPart({ x: 0.42, y: 0.08, z: 0.14 }, { x: 0.12, y: 1.58, z: 0 }, 0x4f4f56));
    root.add(createDetailPart({ x: 0.08, y: 0.18, z: 0.08 }, { x: 0.28, y: 1.5, z: 0 }, 0x4f4f56));
    root.add(createDetailPart({ x: 0.24, y: 0.3, z: 0.24 }, { x: 0.28, y: 1.3, z: 0 }, 0xcfb37b));
    root.add(createDetailPart({ x: 0.28, y: 0.06, z: 0.28 }, { x: 0.28, y: 1.47, z: 0 }, 0x35343a));
    createLampPointLightRig(root, {
        baseColor: 0xffe2a8,
        emissiveColor: 0xffd58a,
        pointLightColor: 0xffdca2,
        bulbScale: { x: 0.13, y: 0.13, z: 0.13 },
        bulbPosition: { x: 0.28, y: 1.3, z: 0 }
    });
}

function buildBenchNode(root) {
    root.add(createDetailPart({ x: 0.96, y: 0.09, z: 0.26 }, { x: 0, y: 0.5, z: 0 }, 0x8f623d));
    root.add(createDetailPart({ x: 0.96, y: 0.08, z: 0.18 }, { x: 0, y: 0.69, z: -0.08 }, 0x986a43));
    root.add(createDetailPart({ x: 0.08, y: 0.46, z: 0.08 }, { x: -0.36, y: 0.23, z: -0.08 }, 0x6f4f31));
    root.add(createDetailPart({ x: 0.08, y: 0.46, z: 0.08 }, { x: 0.36, y: 0.23, z: -0.08 }, 0x6f4f31));
    root.add(createDetailPart({ x: 0.08, y: 0.46, z: 0.08 }, { x: -0.36, y: 0.23, z: 0.08 }, 0x6f4f31));
    root.add(createDetailPart({ x: 0.08, y: 0.46, z: 0.08 }, { x: 0.36, y: 0.23, z: 0.08 }, 0x6f4f31));
}

function buildPicnicTableNode(root) {
    root.add(createDetailPart({ x: 1.18, y: 0.09, z: 0.72 }, { x: 0, y: 0.68, z: 0 }, 0x9a6a44));
    root.add(createDetailPart({ x: 1.06, y: 0.08, z: 0.18 }, { x: 0, y: 0.42, z: -0.34 }, 0x835a3a));
    root.add(createDetailPart({ x: 1.06, y: 0.08, z: 0.18 }, { x: 0, y: 0.42, z: 0.34 }, 0x835a3a));
    root.add(createDetailPart({ x: 0.12, y: 0.7, z: 0.12 }, { x: -0.38, y: 0.35, z: -0.12 }, 0x724e33));
    root.add(createDetailPart({ x: 0.12, y: 0.7, z: 0.12 }, { x: 0.38, y: 0.35, z: -0.12 }, 0x724e33));
    root.add(createDetailPart({ x: 0.12, y: 0.7, z: 0.12 }, { x: -0.38, y: 0.35, z: 0.12 }, 0x724e33));
    root.add(createDetailPart({ x: 0.12, y: 0.7, z: 0.12 }, { x: 0.38, y: 0.35, z: 0.12 }, 0x724e33));
}

function buildFountainNode(root) {
    root.add(createDetailPart({ x: 0.92, y: 0.18, z: 0.92 }, { x: 0, y: 0.09, z: 0 }, 0x8d939e));
    root.add(createDetailPart({ x: 0.72, y: 0.18, z: 0.72 }, { x: 0, y: 0.21, z: 0 }, 0x75818d));
    root.add(createDetailPart({ x: 0.4, y: 0.46, z: 0.4 }, { x: 0, y: 0.42, z: 0 }, 0x95a4b4));
    root.add(createDetailPart({ x: 0.28, y: 0.06, z: 0.28 }, { x: 0, y: 0.68, z: 0 }, 0xdce9f4));
    root.add(createDetailPart({ x: 0.82, y: 0.08, z: 0.82 }, { x: 0, y: 0.31, z: 0 }, 0x5a94d8));
}

function buildCampfireNode(root) {
    root.add(createDetailPart({ x: 0.52, y: 0.08, z: 0.12 }, { x: 0, y: 0.05, z: 0 }, 0x6a4629, { x: 0, y: Math.PI / 4, z: 0 }));
    root.add(createDetailPart({ x: 0.52, y: 0.08, z: 0.12 }, { x: 0, y: 0.05, z: 0 }, 0x6a4629, { x: 0, y: -Math.PI / 4, z: 0 }));
    root.add(createDetailPart({ x: 0.26, y: 0.12, z: 0.26 }, { x: 0, y: 0.12, z: 0 }, 0x50352b));
    root.add(createDetailPart({ x: 0.14, y: 0.24, z: 0.14 }, { x: 0, y: 0.24, z: 0 }, 0xd56c35));
    root.add(createDetailPart({ x: 0.08, y: 0.2, z: 0.08 }, { x: 0.08, y: 0.27, z: -0.04 }, 0xffaf4e));
    createLampPointLightRig(root, {
        baseColor: 0xffb56b,
        emissiveColor: 0xff8a38,
        pointLightColor: 0xffaf63,
        bulbScale: { x: 0.11, y: 0.11, z: 0.11 },
        bulbPosition: { x: 0, y: 0.27, z: 0 }
    });
}

function buildCampfireMediumNode(root) {
    buildCampfireNode(root);
    root.scale.setScalar(1.35);
}

function buildCampfireLargeNode(root) {
    buildCampfireNode(root);
    root.scale.setScalar(1.75);
}

function buildLargeChestNode(root) {
    root.add(createDetailPart({ x: 1.08, y: 0.38, z: 0.64 }, { x: 0, y: 0.19, z: 0 }, 0x8f623a));
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.38, -0.31);
    lidPivot.add(createDetailPart({ x: 1.1, y: 0.2, z: 0.66 }, { x: 0, y: 0.1, z: 0.33 }, 0xab7c4c));
    lidPivot.add(createDetailPart({ x: 1.12, y: 0.02, z: 0.02 }, { x: 0, y: 0.03, z: 0.65 }, 0x69472a));
    root.add(lidPivot);
    root.add(createDetailPart({ x: 0.12, y: 0.18, z: 0.08 }, { x: 0, y: 0.38, z: 0.35 }, 0xd1bc84));
    root.add(createDetailPart({ x: 1.12, y: 0.02, z: 0.02 }, { x: 0, y: 0.28, z: 0.33 }, 0x69472a));
    root.userData.containerLidPivot = lidPivot;
}

function buildFurnaceNode(root) {
    root.add(createDetailPart({ x: 0.74, y: 0.62, z: 0.74 }, { x: 0, y: 0.31, z: 0 }, 0x6d727a));
    root.add(createDetailPart({ x: 0.66, y: 0.54, z: 0.66 }, { x: 0, y: 0.31, z: -0.01 }, 0x555a62));
    root.add(createDetailPart({ x: 0.7, y: 0.06, z: 0.7 }, { x: 0, y: 0.61, z: 0 }, 0x7f848d));
    root.add(createDetailPart({ x: 0.46, y: 0.44, z: 0.05 }, { x: 0, y: 0.31, z: 0.355 }, 0x464b54));
    root.add(createDetailPart({ x: 0.32, y: 0.06, z: 0.03 }, { x: 0, y: 0.44, z: 0.36 }, 0x262a2f));
    root.add(createDetailPart({ x: 0.28, y: 0.16, z: 0.03 }, { x: 0, y: 0.2, z: 0.36 }, 0x1b1e22));
    root.add(createDetailPart({ x: 0.12, y: 0.07, z: 0.035 }, { x: 0, y: 0.44, z: 0.372 }, 0xa78f69));
    root.add(createDetailPart({ x: 0.66, y: 0.03, z: 0.03 }, { x: 0, y: 0.56, z: 0.326 }, 0x2b2f35));

    const emberMaterial = createDisposableStandardMaterial({
        color: 0x391f15,
        roughness: 0.6,
        metalness: 0.02,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    emberMaterial.userData.furnaceEmissiveColor = 0xff7f34;
    const emberMesh = createDynamicPart(
        { x: 0.22, y: 0.11, z: 0.02 },
        { x: 0, y: 0.2, z: 0.343 },
        emberMaterial
    );
    root.add(emberMesh);

    const furnaceLight = new THREE.PointLight(0xff8a42, 0, 0, 2);
    furnaceLight.position.set(0, 0.22, 0.28);
    furnaceLight.castShadow = false;
    root.add(furnaceLight);

    root.userData.furnaceEmberMaterial = emberMaterial;
    root.userData.furnacePointLight = furnaceLight;
}

function buildEditableSignNode(root) {
    root.add(createDetailPart({ x: 0.08, y: 1.04, z: 0.08 }, { x: 0, y: 0.52, z: 0 }, 0x7e562f));
    root.add(createDetailPart({ x: 0.74, y: 0.42, z: 0.14 }, { x: 0, y: 0.79, z: 0 }, 0xa97748));
    root.add(createDetailPart({ x: 0.72, y: 0.02, z: 0.16 }, { x: 0, y: 1.0, z: 0 }, 0x7d5633));
    root.add(createDetailPart({ x: 0.72, y: 0.02, z: 0.16 }, { x: 0, y: 0.58, z: 0 }, 0x7d5633));
    root.add(createDetailPart({ x: 0.02, y: 0.38, z: 0.16 }, { x: -0.36, y: 0.79, z: 0 }, 0x7d5633));
    root.add(createDetailPart({ x: 0.02, y: 0.38, z: 0.16 }, { x: 0.36, y: 0.79, z: 0 }, 0x7d5633));

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 256;
    const signContext = signCanvas.getContext("2d");
    if (!signContext) {
        return;
    }

    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.needsUpdate = true;
    signTexture.userData.disposeOnRemove = true;
    const signMaterial = createDisposableStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0,
        map: signTexture
    });
    const signFace = new THREE.Mesh(signFaceGeometry, signMaterial);
    signFace.position.set(0, 0.79, 0.081);
    signFace.castShadow = false;
    signFace.receiveShadow = false;
    root.add(signFace);

    root.userData.signCanvas = signCanvas;
    root.userData.signContext = signContext;
    root.userData.signTexture = signTexture;
    root.userData.signMaterial = signMaterial;
}

function buildJukeboxNode(root) {
    root.add(createDetailPart({ x: 0.66, y: 0.62, z: 0.66 }, { x: 0, y: 0.31, z: 0 }, 0x5f3c2e));
    root.add(createDetailPart({ x: 0.58, y: 0.54, z: 0.58 }, { x: 0, y: 0.31, z: 0 }, 0x43281f));

    const discMaterial = createDisposableStandardMaterial({
        color: 0x222329,
        roughness: 0.2,
        metalness: 0.12,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    discMaterial.userData.jukeboxEmissiveColor = 0x5aa8ff;
    const disc = createDynamicPart(
        { x: 0.24, y: 0.04, z: 0.24 },
        { x: 0, y: 0.62, z: 0 },
        discMaterial
    );
    root.add(disc);

    const ledMaterial = createDisposableStandardMaterial({
        color: 0x2f3137,
        roughness: 0.36,
        metalness: 0.04,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    ledMaterial.userData.jukeboxLedEmissiveColor = 0x80beff;
    const ledMesh = createDynamicPart(
        { x: 0.16, y: 0.08, z: 0.06 },
        { x: 0, y: 0.35, z: 0.33 },
        ledMaterial
    );
    root.add(ledMesh);

    root.userData.jukeboxDiscMaterial = discMaterial;
    root.userData.jukeboxLedMaterial = ledMaterial;
}

function createTvBrandPlate(scale = 1, options = {}) {
    const brandCanvas = document.createElement("canvas");
    brandCanvas.width = 512;
    brandCanvas.height = 128;
    const brandContext = brandCanvas.getContext("2d");
    if (!brandContext) {
        return null;
    }
    brandContext.clearRect(0, 0, brandCanvas.width, brandCanvas.height);
    brandContext.font = "800 62px Sora, sans-serif";
    brandContext.textAlign = "center";
    brandContext.textBaseline = "middle";
    brandContext.lineJoin = "round";
    brandContext.strokeStyle = "rgba(0, 0, 0, 0.86)";
    brandContext.lineWidth = 16;
    brandContext.strokeText("PaMeKaChi", brandCanvas.width * 0.5, brandCanvas.height * 0.54);
    brandContext.fillStyle = "#ecf7ff";
    brandContext.fillText("PaMeKaChi", brandCanvas.width * 0.5, brandCanvas.height * 0.54);

    const brandTexture = new THREE.CanvasTexture(brandCanvas);
    brandTexture.needsUpdate = true;
    brandTexture.userData.disposeOnRemove = true;
    const brandMaterial = createDisposableStandardMaterial({
        color: 0xffffff,
        roughness: 0.24,
        metalness: 0.02,
        emissive: 0xb7e7ff,
        emissiveIntensity: 0.24,
        map: brandTexture,
        transparent: true,
        alphaTest: 0.12
    });
    const widthScale = Number(options.widthScale) || 0.52;
    const heightScale = Number(options.heightScale) || 0.08;
    const depthScale = Number(options.depthScale) || 0.01;
    const posXScale = Number(options.positionXScale);
    const posYScale = Number(options.positionYScale);
    const posZScale = Number(options.positionZScale);
    const brandMesh = createDynamicPart(
        { x: widthScale * scale, y: heightScale * scale, z: depthScale * scale },
        {
            x: Number.isFinite(posXScale) ? posXScale * scale : 0,
            y: Number.isFinite(posYScale) ? posYScale * scale : (0.58 * scale),
            z: Number.isFinite(posZScale) ? posZScale * scale : (0.056 * scale)
        },
        brandMaterial
    );
    brandMesh.castShadow = false;
    brandMesh.receiveShadow = false;
    return brandMesh;
}

function buildTvScreenNode(root) {
    const s = TV_MODEL_SCALE;
    root.add(createDetailPart({ x: 0.78 * s, y: 0.08 * s, z: 0.44 * s }, { x: 0, y: 0.04 * s, z: 0 }, 0x21242c));
    root.add(createDetailPart({ x: 0.22 * s, y: 0.18 * s, z: 0.18 * s }, { x: 0, y: 0.14 * s, z: 0 }, 0x2f333b));
    root.add(createDetailPart({ x: 0.1 * s, y: 0.38 * s, z: 0.1 * s }, { x: 0, y: 0.38 * s, z: 0 }, 0x323846));

    root.add(createDetailPart({ x: 1.72 * s, y: 1.02 * s, z: 0.08 * s }, { x: 0, y: 1.06 * s, z: 0.02 * s }, 0x12161c));
    root.add(createDetailPart({ x: 1.64 * s, y: 0.94 * s, z: 0.04 * s }, { x: 0, y: 1.06 * s, z: 0.04 * s }, 0x090b0f));
    root.add(createDetailPart({ x: 1.7 * s, y: 0.02 * s, z: 0.1 * s }, { x: 0, y: 1.57 * s, z: 0.02 * s }, 0x2e3542));

    const screenMaterial = createDisposableStandardMaterial({
        color: 0x0f1216,
        roughness: 0.2,
        metalness: 0.02,
        emissive: 0x000000,
        emissiveIntensity: 0.01
    });
    const screenMesh = createDynamicPart(
        { x: 1.54 * s, y: 0.84 * s, z: 0.02 * s },
        { x: 0, y: 1.06 * s, z: 0.045 * s },
        screenMaterial
    );
    root.add(screenMesh);

    const indicatorMaterial = createDisposableStandardMaterial({
        color: 0x12161a,
        roughness: 0.42,
        metalness: 0,
        emissive: 0xff5f5f,
        emissiveIntensity: 0.28
    });
    const indicator = createDynamicPart(
        { x: 0.04 * s, y: 0.02 * s, z: 0.016 * s },
        { x: 0.76 * s, y: 0.58 * s, z: 0.056 * s },
        indicatorMaterial
    );
    root.add(indicator);
    const brandPlate = createTvBrandPlate(s, {
        positionXScale: 0,
        positionYScale: 0.58,
        positionZScale: 0.056
    });
    if (brandPlate) {
        root.add(brandPlate);
    }

    root.userData.tvScreenMaterial = screenMaterial;
    root.userData.tvScreenMesh = screenMesh;
    root.userData.tvIndicatorMaterial = indicatorMaterial;
}

function buildTvWallNode(root) {
    const s = TV_MODEL_SCALE;
    root.add(createDetailPart({ x: 1.72 * s, y: 1.02 * s, z: 0.06 * s }, { x: 0, y: 1.06 * s, z: 0.01 * s }, 0x12161c));
    root.add(createDetailPart({ x: 1.64 * s, y: 0.94 * s, z: 0.03 * s }, { x: 0, y: 1.06 * s, z: 0.028 * s }, 0x090b0f));
    root.add(createDetailPart({ x: 1.7 * s, y: 0.02 * s, z: 0.08 * s }, { x: 0, y: 1.57 * s, z: 0.01 * s }, 0x2e3542));
    root.add(createDetailPart({ x: 0.22 * s, y: 0.18 * s, z: 0.03 * s }, { x: 0, y: 1.06 * s, z: -0.022 * s }, 0x232a34));
    root.add(createDetailPart({ x: 0.05 * s, y: 0.44 * s, z: 0.03 * s }, { x: 0, y: 1.06 * s, z: -0.022 * s }, 0x232a34));

    const screenMaterial = createDisposableStandardMaterial({
        color: 0x0f1216,
        roughness: 0.2,
        metalness: 0.02,
        emissive: 0x000000,
        emissiveIntensity: 0.01
    });
    const screenMesh = createDynamicPart(
        { x: 1.54 * s, y: 0.84 * s, z: 0.018 * s },
        { x: 0, y: 1.06 * s, z: 0.032 * s },
        screenMaterial
    );
    root.add(screenMesh);

    const indicatorMaterial = createDisposableStandardMaterial({
        color: 0x12161a,
        roughness: 0.42,
        metalness: 0,
        emissive: 0xff5f5f,
        emissiveIntensity: 0.28
    });
    const indicator = createDynamicPart(
        { x: 0.04 * s, y: 0.02 * s, z: 0.016 * s },
        { x: 0.76 * s, y: 0.58 * s, z: 0.038 * s },
        indicatorMaterial
    );
    root.add(indicator);
    const brandPlate = createTvBrandPlate(s, {
        positionXScale: 0,
        positionYScale: 0.58,
        positionZScale: 0.039
    });
    if (brandPlate) {
        root.add(brandPlate);
    }

    root.userData.tvScreenMaterial = screenMaterial;
    root.userData.tvScreenMesh = screenMesh;
    root.userData.tvIndicatorMaterial = indicatorMaterial;
}

function buildGiantSunflowerNode(root) {
    root.add(createDetailPart({ x: 0.08, y: 1.7, z: 0.08 }, { x: 0, y: 0.85, z: 0 }, 0x4d8f43));
    root.add(createDetailPart({ x: 0.24, y: 0.12, z: 0.08 }, { x: -0.14, y: 0.92, z: 0.02 }, 0x4d8f43, { x: 0, y: 0, z: 0.55 }));
    root.add(createDetailPart({ x: 0.24, y: 0.12, z: 0.08 }, { x: 0.14, y: 1.1, z: -0.02 }, 0x4d8f43, { x: 0, y: 0, z: -0.45 }));
    root.add(createDetailPart({ x: 0.5, y: 0.5, z: 0.12 }, { x: 0, y: 1.72, z: 0 }, 0xf4d35e));
    root.add(createDetailPart({ x: 0.52, y: 0.12, z: 0.52 }, { x: 0, y: 1.72, z: 0 }, 0x5c3a26));
    root.add(createDetailPart({ x: 0.1, y: 0.62, z: 0.48 }, { x: 0, y: 1.72, z: 0 }, 0xf4d35e));
    root.add(createDetailPart({ x: 0.48, y: 0.62, z: 0.1 }, { x: 0, y: 1.72, z: 0 }, 0xf4d35e));
}

function buildRabbitHouseNode(root) {
    root.add(createDetailPart({ x: 1.02, y: 0.18, z: 0.82 }, { x: 0, y: 0.09, z: 0 }, 0x8a6243));
    root.add(createDetailPart({ x: 0.94, y: 0.44, z: 0.72 }, { x: 0, y: 0.4, z: 0 }, 0xac7f59));
    root.add(createDetailPart({ x: 0.96, y: 0.08, z: 0.74 }, { x: 0, y: 0.66, z: 0 }, 0x704c2f));
    root.add(createDetailPart({ x: 0.26, y: 0.24, z: 0.04 }, { x: 0, y: 0.24, z: 0.36 }, 0x2a2320));
    root.add(createDetailPart({ x: 0.18, y: 0.36, z: 0.04 }, { x: 0, y: 0.36, z: 0.36 }, 0x2a2320));
    root.add(createDetailPart({ x: 0.42, y: 0.06, z: 0.9 }, { x: 0, y: 0.71, z: 0 }, 0x8f6544, { x: Math.PI * 0.11, y: 0, z: 0 }));
}

const PROP_NODE_BUILDERS = Object.freeze({
    [PROP_TYPE.CHAIR]: buildChairNode,
    [PROP_TYPE.TABLE]: buildTableNode,
    [PROP_TYPE.LAMP]: buildLampNode,
    [PROP_TYPE.PLANTER]: buildPlanterNode,
    [PROP_TYPE.CHEST]: buildChestNode,
    [PROP_TYPE.BED]: buildBedNode,
    [PROP_TYPE.FENCE]: buildFenceNode,
    [PROP_TYPE.LANTERN]: buildLanternNode,
    [PROP_TYPE.TORCH]: buildTorchNode,
    [PROP_TYPE.BOOKSHELF]: buildBookshelfNode,
    [PROP_TYPE.BARREL]: buildBarrelNode,
    [PROP_TYPE.WOOD_CRATE]: buildWoodCrateNode,
    [PROP_TYPE.RUG]: buildRugNode,
    [PROP_TYPE.PAINTING]: buildPaintingNode,
    [PROP_TYPE.CURTAINS]: buildCurtainsNode,
    [PROP_TYPE.WALL_LANTERN]: buildWallLanternNode,
    [PROP_TYPE.WALL_TORCH]: buildWallTorchNode,
    [PROP_TYPE.LIGHT_POST]: buildLightPostNode,
    [PROP_TYPE.BENCH]: buildBenchNode,
    [PROP_TYPE.PICNIC_TABLE]: buildPicnicTableNode,
    [PROP_TYPE.FOUNTAIN]: buildFountainNode,
    [PROP_TYPE.CAMPFIRE]: buildCampfireNode,
    [PROP_TYPE.CAMPFIRE_MEDIUM]: buildCampfireMediumNode,
    [PROP_TYPE.CAMPFIRE_LARGE]: buildCampfireLargeNode,
    [PROP_TYPE.LARGE_CHEST]: buildLargeChestNode,
    [PROP_TYPE.FURNACE]: buildFurnaceNode,
    [PROP_TYPE.EDITABLE_SIGN]: buildEditableSignNode,
    [PROP_TYPE.JUKEBOX]: buildJukeboxNode,
    [PROP_TYPE.TV_SCREEN]: buildTvScreenNode,
    [PROP_TYPE.TV_WALL]: buildTvWallNode,
    [PROP_TYPE.GIANT_SUNFLOWER]: buildGiantSunflowerNode,
    [PROP_TYPE.RABBIT_HOUSE]: buildRabbitHouseNode
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

    const flameMaterial = placed.node?.userData?.lampFlameMaterial || null;
    const flameCoreMaterial = placed.node?.userData?.lampFlameCoreMaterial || null;
    const smokeMaterial = placed.node?.userData?.lampSmokeMaterial || null;
    const emberMaterial = placed.node?.userData?.lampTorchEmberMaterial || null;
    if (flameMaterial) {
        const flameEmissive = Number(flameMaterial.userData?.lampFlameEmissiveColor ?? 0xff8d30);
        flameMaterial.color.setHex(normalizedLevel > 0 ? 0xffa42e : 0x1f1c1b);
        flameMaterial.emissive.setHex(flameEmissive);
        flameMaterial.emissiveIntensity = normalizedLevel > 0 ? 0.5 + normalizedLevel * 0.25 : 0;
    }
    if (flameCoreMaterial) {
        const flameCoreEmissive = Number(flameCoreMaterial.userData?.lampFlameEmissiveColor ?? 0xffefae);
        flameCoreMaterial.color.setHex(normalizedLevel > 0 ? 0xfff4ba : 0x262321);
        flameCoreMaterial.emissive.setHex(flameCoreEmissive);
        flameCoreMaterial.emissiveIntensity = normalizedLevel > 0 ? 0.38 + normalizedLevel * 0.2 : 0;
    }
    if (smokeMaterial) {
        smokeMaterial.color.setHex(normalizedLevel > 0 ? 0x4d525b : 0x656b74);
        smokeMaterial.emissive.setHex(0x000000);
        smokeMaterial.emissiveIntensity = normalizedLevel > 0 ? 0 : 0.02;
    }
    if (emberMaterial) {
        const emberColor = Number(emberMaterial.userData?.lampTorchEmberColor ?? 0x2b1e17);
        emberMaterial.color.setHex(normalizedLevel > 0 ? 0x4a2a1a : 0x2a1f17);
        emberMaterial.emissive.setHex(emberColor);
        emberMaterial.emissiveIntensity = normalizedLevel > 0 ? 0.08 + normalizedLevel * 0.08 : 0;
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

    const normalizedState = normalizePropSharedState(propType, rawEntry?.state, rawEntry);
    if (normalizedState && Object.keys(normalizedState).length > 0) {
        normalized.state = normalizedState;
    }

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

    const defaultState = getPropDefaultSharedState(normalized.propType);
    if (
        normalized.state
        && Object.keys(normalized.state).length > 0
        && !arePropStatesEqual(normalized.state, defaultState)
    ) {
        serialized.state = normalized.state;
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
                if (item?.map?.userData?.disposeOnRemove || item?.userData?.disposeMapOnRemove) {
                    item.map.dispose?.();
                }
                if (item?.userData?.disposeOnRemove) {
                    item.dispose?.();
                }
            }
            return;
        }

        if (material?.map?.userData?.disposeOnRemove || material?.userData?.disposeMapOnRemove) {
            material.map.dispose?.();
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

    const { id, propType, x, y, z, yaw, lampLevel, state: sharedState } = normalized;
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
            existing.state = sharedState && typeof sharedState === "object"
                ? { ...sharedState }
                : undefined;
            existing.node.position.set(x, y, z);
            existing.node.rotation.y = yaw;
            refreshSinglePropVisibility(existing);
            indexPlacedProp(existing);
            if (isLightPropType(propType)) {
                applyLampVisualState(existing, lampLevel, false);
            } else {
                existing.lampLevel = 0;
            }
            applyPropSharedVisualState(existing);
            if (state.interactionPanelOpen && interactionState.panelPropId === id) {
                markInteractionPanelDirty();
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
        state: sharedState && typeof sharedState === "object"
            ? { ...sharedState }
            : undefined,
        chunkKey: chunkKey(worldToChunkCoord(x), worldToChunkCoord(z)),
        node
    };
    placedProps.set(id, placedEntry);
    refreshSinglePropVisibility(placedEntry);
    indexPlacedProp(placedEntry);

    if (isLightPropType(propType)) {
        applyLampVisualState(placedEntry, placedEntry.lampLevel, false);
    }
    applyPropSharedVisualState(placedEntry);
    if (state.interactionPanelOpen && interactionState.panelPropId === id) {
        markInteractionPanelDirty();
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

    if (interactionState.panelPropId === id) {
        closeInteractionPanel(false, true);
    }
    if (interactionState.localUsing?.propId === id) {
        clearLocalUsingActivity(true);
    }
    if (interactionState.pose?.propId === id) {
        exitLocalPose(false);
    }
    if (placed.propType === PROP_TYPE.JUKEBOX) {
        if (jukeboxState.recordingSession?.propId === id) {
            stopJukeboxTrackRecording(false);
        }
        stopJukeboxRuntimeById(id);
        interactionState.jukeboxLinkDraftByProp.delete(id);
        if (jukeboxState.customTracksByProp.delete(id)) {
            persistJukeboxCustomTracksToStorage();
        }
    }
    if (placed.propType === PROP_TYPE.TV_SCREEN || placed.propType === PROP_TYPE.TV_WALL) {
        stopTvRuntimeById(id);
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
    stopAllJukeboxRuntimes();
    stopAllTvRuntimes();
    if (jukeboxState.recordingSession) {
        stopJukeboxTrackRecording(false);
    }
    interactionState.jukeboxLinkDraftByProp.clear();
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
    const column = getColumnInfo(x, z);
    const topY = Math.min(WORLD_MAX_Y - 2, column.height + 8);

    for (let y = topY; y >= 1; y -= 1) {
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
    return `${WORLD_SEED}|terrain-v${TERRAIN_GENERATION_VERSION}|${samples.join(";")}`;
}

function readStorageBoolean(key, fallback = false) {
    const raw = readStorageString(key, fallback ? "1" : "0").toLowerCase();
    if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") {
        return true;
    }
    if (raw === "0" || raw === "false" || raw === "no" || raw === "off") {
        return false;
    }
    return Boolean(fallback);
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

function getPropAnchorY(baseY, propType) {
    const profile = getPropProfile(propType);
    return Number(baseY) + (Number(profile?.minY) || 0);
}

function getShiftedEditOverrideMap(edits) {
    const map = new Map();
    for (const item of Array.isArray(edits) ? edits : []) {
        if (!Array.isArray(item) || item.length !== 2) {
            continue;
        }
        const key = String(item[0] || "");
        const id = Number(item[1]);
        const parsed = parseBlockKey(key);
        if (!parsed || !inWorldBounds(parsed.x, parsed.y, parsed.z) || !isValidBlockId(id)) {
            continue;
        }
        map.set(key, id);
    }
    return map;
}

function getSolidBlockAtWithOverrides(overridesMap, x, y, z) {
    if (!inWorldBounds(x, y, z)) {
        return false;
    }
    const key = blockKey(x, y, z);
    if (overridesMap && overridesMap.has(key)) {
        return isSolidBlock(overridesMap.get(key));
    }
    return isSolidBlock(getProceduralBlock(x, y, z));
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
            const xRaw = Number(prop?.x);
            const yRaw = Number(prop?.y);
            const zRaw = Number(prop?.z);
            const x = Math.floor(xRaw);
            const z = Math.floor(zRaw);
            const propType = String(prop?.type || prop?.propType || "");
            if (!Number.isFinite(xRaw) || !Number.isFinite(yRaw) || !Number.isFinite(zRaw)) {
                continue;
            }

            const supportY = getPropAnchorY(yRaw, propType);
            const surfaceY = getColumnInfo(x, z).height + 1;
            deltas.push(supportY - surfaceY);
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

function remapPropsWithVerticalShift(props, shiftY, overridesMap = null) {
    if (!Number.isFinite(shiftY) || shiftY === 0) {
        return Array.isArray(props) ? props : [];
    }

    const next = [];
    for (const rawProp of Array.isArray(props) ? props : []) {
        const x = Number(rawProp?.x);
        let y = Number(rawProp?.y) + shiftY;
        const z = Number(rawProp?.z);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            continue;
        }

        const xCell = Math.floor(x);
        const zCell = Math.floor(z);
        const propType = String(rawProp?.type || rawProp?.propType || "");
        const anchorY = getPropAnchorY(y, propType);
        const minAnchorY = getColumnInfo(xCell, zCell).height + 1;
        const supportProbeTop = Math.floor(anchorY) - 1;
        const supportProbeBottom = Math.max(0, supportProbeTop - 96);
        const supportSamples = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
        ];
        let nearestSupportY = null;
        for (let probeY = supportProbeTop; probeY >= supportProbeBottom; probeY -= 1) {
            let foundSupport = false;
            for (const [sx, sz] of supportSamples) {
                if (getSolidBlockAtWithOverrides(overridesMap, xCell + sx, probeY, zCell + sz)) {
                    foundSupport = true;
                    break;
                }
            }
            if (foundSupport) {
                nearestSupportY = probeY;
                break;
            }
        }
        const supportGap = nearestSupportY === null
            ? Number.POSITIVE_INFINITY
            : anchorY - (nearestSupportY + 1);

        if (anchorY < minAnchorY - 0.001) {
            y += (minAnchorY - anchorY);
        } else {
            const floatGap = anchorY - minAnchorY;
            const unsupported = !Number.isFinite(supportGap) || supportGap > 1.15;
            if (unsupported && floatGap > 0.35) {
                y -= floatGap;
            }
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
    const migratedEditMap = getShiftedEditOverrideMap(migratedEdits);
    const migratedProps = remapPropsWithVerticalShift(sourceProps, shiftY, migratedEditMap);
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
    const removedDecorFlora = serializeRemovedDecorativeFloraColumns();

    try {
        if (edits.length === 0) {
            const props = serializePlacedPropsForSave();
            if (props.length === 0 && removedDecorFlora.length === 0) {
                window.localStorage.removeItem(WORLD_SAVE_KEY);
            } else {
                const payload = {
                    version: WORLD_SAVE_VERSION,
                    seed: WORLD_SEED,
                    terrainFingerprint: getTerrainFingerprint(),
                    savedAt: Date.now(),
                    edits: [],
                    props,
                    removedDecorFlora
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
                props,
                removedDecorFlora
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
    applyRemovedDecorativeFloraFromPayload([]);
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
        const rawRemovedDecorFlora = Array.isArray(payload?.removedDecorFlora) ? payload.removedDecorFlora : [];
        const reacomodo = applyTerrainReacomodoToPayload(rawEdits, rawProps, payload?.terrainFingerprint, true);
        const edits = reacomodo.edits;
        const props = reacomodo.props;

        editedBlocks.clear();
        editedColumnYIndex.clear();
        clearPlacedProps();
        applyRemovedDecorativeFloraFromPayload(rawRemovedDecorFlora);
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
            addEditedBlockToColumnIndex(parsed.x, parsed.y, parsed.z);
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
                    props,
                    removedDecorFlora: serializeRemovedDecorativeFloraColumns()
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

function normalizePoseMode(value) {
    const mode = String(value || "").toLowerCase();
    if (mode === "sit" || mode === "lie") {
        return mode;
    }
    return "";
}

function normalizePlayerActivityPayload(rawActivity) {
    if (!rawActivity || typeof rawActivity !== "object") {
        return null;
    }

    const type = String(rawActivity.type || "").toLowerCase();
    const propId = String(rawActivity.propId || "");
    if (!propId) {
        return null;
    }

    if (type === "pose") {
        const pose = normalizePoseMode(rawActivity.pose);
        if (!pose) {
            return null;
        }
        return {
            type: "pose",
            propId,
            pose
        };
    }

    if (type === "using") {
        const usageKind = String(rawActivity.usageKind || "").toLowerCase();
        if (!usageKind) {
            return null;
        }
        return {
            type: "using",
            propId,
            usageKind
        };
    }

    return null;
}

function arePlayerActivitiesEqual(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (
        a.type === b.type
        && a.propId === b.propId
        && a.pose === b.pose
        && a.usageKind === b.usageKind
    );
}

function getLocalTemporaryActivityPayload() {
    if (interactionState.pose) {
        return {
            type: "pose",
            propId: String(interactionState.pose.propId || ""),
            pose: normalizePoseMode(interactionState.pose.mode)
        };
    }

    if (interactionState.localUsing) {
        return {
            type: "using",
            propId: String(interactionState.localUsing.propId || ""),
            usageKind: String(interactionState.localUsing.usageKind || "")
        };
    }

    return null;
}

function applyAvatarPose(avatarRoot, poseMode = "") {
    if (!avatarRoot) {
        return;
    }

    const mode = normalizePoseMode(poseMode);
    const rig = avatarRoot.userData?.walkRig || null;
    avatarRoot.userData.activePose = mode || "";
    avatarRoot.rotation.x = 0;
    avatarRoot.position.y = 0;

    if (rig) {
        rig.leftLegPivot.rotation.x = 0;
        rig.rightLegPivot.rotation.x = 0;
        rig.leftArmPivot.rotation.x = 0;
        rig.rightArmPivot.rotation.x = 0;
        if (rig.body) {
            rig.body.position.y = rig.bodyBaseY;
        }
        if (rig.head) {
            rig.head.position.y = rig.headBaseY;
        }
    }

    if (!mode || !rig) {
        return;
    }

    if (mode === "sit") {
        rig.leftLegPivot.rotation.x = -1.28;
        rig.rightLegPivot.rotation.x = -1.28;
        rig.leftArmPivot.rotation.x = 0.16;
        rig.rightArmPivot.rotation.x = 0.16;
        if (rig.body) {
            rig.body.position.y = rig.bodyBaseY - 0.15;
        }
        if (rig.head) {
            rig.head.position.y = rig.headBaseY - 0.15;
        }
        avatarRoot.position.y = -0.34;
        return;
    }

    if (mode === "lie") {
        rig.leftArmPivot.rotation.x = -0.22;
        rig.rightArmPivot.rotation.x = -0.22;
        avatarRoot.rotation.x = -Math.PI * 0.5;
        avatarRoot.position.y = -0.62;
    }
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
        activity: normalizePlayerActivityPayload(payload?.activity),
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
    node.activity = normalizePlayerActivityPayload(payload?.activity);
    node.lastSeenAt = Date.now();
}

function areUsageEntriesEquivalent(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if ((a.count || 0) !== (b.count || 0)) {
        return false;
    }
    const leftKinds = Array.from(a.usageKinds || []).sort().join("|");
    const rightKinds = Array.from(b.usageKinds || []).sort().join("|");
    return leftKinds === rightKinds;
}

function rebuildRemoteUsingByProp() {
    const next = new Map();
    for (const node of multiplayer.remotePlayers.values()) {
        const activity = node?.activity;
        if (!activity || activity.type !== "using") {
            continue;
        }

        const propId = String(activity.propId || "");
        if (!propId) {
            continue;
        }
        let entry = next.get(propId);
        if (!entry) {
            entry = { count: 0, usageKinds: new Set() };
            next.set(propId, entry);
        }
        entry.count += 1;
        entry.usageKinds.add(String(activity.usageKind || ""));
    }

    const keys = new Set([
        ...Array.from(interactionState.remoteUsingByProp.keys()),
        ...Array.from(next.keys())
    ]);
    for (const key of keys) {
        const previous = interactionState.remoteUsingByProp.get(key) || null;
        const current = next.get(key) || null;
        if (!areUsageEntriesEquivalent(previous, current)) {
            applyPropVisualStateById(key);
        }
    }

    interactionState.remoteUsingByProp = next;
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

        const poseMode = node.activity?.type === "pose" ? node.activity.pose : "";
        applyAvatarPose(node.avatarModel, poseMode);

        const distance = Math.hypot(node.group.position.x - prevX, node.group.position.z - prevZ);
        node.moveSpeed = poseMode ? 0 : (distance / Math.max(deltaSeconds, 1e-4));
        if (!poseMode) {
            updateAvatarWalkAnimation(node.avatarModel, node.moveSpeed, deltaSeconds);
        }
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

function clearWildlifeSnapshotSubscription() {
    if (typeof multiplayer.wildlifeSnapshotUnsubscribe === "function") {
        multiplayer.wildlifeSnapshotUnsubscribe();
    }
    multiplayer.wildlifeSnapshotUnsubscribe = null;
}

function serializeRabbitForWildlifeSync(rabbit) {
    return {
        variantId: String(rabbit?.variantId || "nube"),
        x: Number((Number(rabbit?.x) || 0).toFixed(3)),
        y: Number((Number(rabbit?.baseY) || 0).toFixed(3)),
        z: Number((Number(rabbit?.z) || 0).toFixed(3)),
        targetX: Number((Number(rabbit?.targetX) || 0).toFixed(3)),
        targetZ: Number((Number(rabbit?.targetZ) || 0).toFixed(3)),
        speed: Number((Number(rabbit?.speed) || 1).toFixed(3)),
        roamTimer: Number((Number(rabbit?.roamTimer) || 0).toFixed(3)),
        idleTimer: Number((Number(rabbit?.idleTimer) || 0).toFixed(3)),
        hopPhase: Number((Number(rabbit?.hopPhase) || 0).toFixed(4)),
        hopStrength: Number((Number(rabbit?.hopStrength) || 0.08).toFixed(4)),
        yaw: Number((Number(rabbit?.node?.rotation?.y) || 0).toFixed(4))
    };
}

function serializeFishForWildlifeSync(fish) {
    return {
        variantId: String(fish?.variant?.id || ""),
        x: Number((Number(fish?.x) || 0).toFixed(3)),
        y: Number((Number(fish?.y) || 0).toFixed(3)),
        z: Number((Number(fish?.z) || 0).toFixed(3)),
        targetX: Number((Number(fish?.targetX) || 0).toFixed(3)),
        targetY: Number((Number(fish?.targetY) || 0).toFixed(3)),
        targetZ: Number((Number(fish?.targetZ) || 0).toFixed(3)),
        speed: Number((Number(fish?.speed) || 1).toFixed(3)),
        turnRate: Number((Number(fish?.turnRate) || 6).toFixed(3)),
        bobPhase: Number((Number(fish?.bobPhase) || 0).toFixed(4)),
        bottomY: Number((Number(fish?.bottomY) || 0).toFixed(3)),
        topY: Number((Number(fish?.topY) || 0).toFixed(3)),
        yaw: Number((Number(fish?.node?.rotation?.y) || 0).toFixed(4))
    };
}

function upsertRabbitFromWildlifeSnapshot(rabbitId, rawEntry) {
    const id = String(rabbitId || "");
    if (!id) {
        return false;
    }
    const raw = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    const x = Number(raw.x);
    const z = Number(raw.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return false;
    }
    const y = Number.isFinite(Number(raw.y))
        ? Number(raw.y)
        : (sampleSurfaceForRabbit(x, z)?.y ?? (SEA_LEVEL + 1.02));
    const variant = getRabbitVariantById(raw.variantId);
    const targetX = Number.isFinite(Number(raw.targetX)) ? Number(raw.targetX) : x;
    const targetZ = Number.isFinite(Number(raw.targetZ)) ? Number(raw.targetZ) : z;
    const speed = THREE.MathUtils.clamp(Number(raw.speed) || 1.2, 0.3, 3.4);
    const roamTimer = THREE.MathUtils.clamp(Number(raw.roamTimer) || randomInRange(1.1, 2.4), 0, 10);
    const idleTimer = THREE.MathUtils.clamp(Number(raw.idleTimer) || randomInRange(0.6, 1.7), 0, 10);
    const hopPhase = Number.isFinite(Number(raw.hopPhase)) ? Number(raw.hopPhase) : Math.random() * Math.PI * 2;
    const hopStrength = THREE.MathUtils.clamp(Number(raw.hopStrength) || 0.09, 0.04, 0.22);
    const yaw = Number(raw.yaw);

    const existing = wildlifeState.rabbits.get(id);
    if (existing) {
        existing.variantId = variant.id;
        existing.speed = speed;
        existing.roamTimer = roamTimer;
        existing.idleTimer = idleTimer;
        existing.hopStrength = hopStrength;
        existing.syncTargetX = x;
        existing.syncTargetY = y;
        existing.syncTargetZ = z;
        existing.targetX = targetX;
        existing.targetZ = targetZ;
        if (Number.isFinite(yaw)) {
            existing.syncYaw = yaw;
        }
        existing.remoteSync = true;
        return true;
    }

    const node = createRabbitNode(variant);
    node.position.set(x, y, z);
    node.rotation.y = Number.isFinite(yaw) ? yaw : 0;
    wildlifeRoot.add(node);

    wildlifeState.rabbits.set(id, {
        id,
        variantId: variant.id,
        node,
        x,
        z,
        baseY: y,
        targetX,
        targetZ,
        speed,
        roamTimer,
        idleTimer,
        hopPhase,
        hopStrength,
        remoteSync: true,
        syncTargetX: x,
        syncTargetY: y,
        syncTargetZ: z,
        syncYaw: Number.isFinite(yaw) ? yaw : 0
    });
    bumpNextRabbitIdFromValue(id);
    return true;
}

function upsertFishFromWildlifeSnapshot(fishId, rawEntry) {
    const id = String(fishId || "");
    if (!id) {
        return false;
    }
    const raw = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    const x = Number(raw.x);
    const y = Number(raw.y);
    const z = Number(raw.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return false;
    }
    const variant = getFishVariantById(raw.variantId);
    const bottomCandidate = Number(raw.bottomY);
    const topCandidate = Number(raw.topY);
    const bottomY = Number.isFinite(bottomCandidate) ? bottomCandidate : y - 1.4;
    const topY = Number.isFinite(topCandidate) ? topCandidate : y + 1.4;
    const safeTopY = Math.max(bottomY + 0.24, topY);
    const targetX = Number.isFinite(Number(raw.targetX)) ? Number(raw.targetX) : x;
    const targetY = Number.isFinite(Number(raw.targetY)) ? Number(raw.targetY) : y;
    const targetZ = Number.isFinite(Number(raw.targetZ)) ? Number(raw.targetZ) : z;
    const speed = THREE.MathUtils.clamp(Number(raw.speed) || randomInRange(variant.speedMin, variant.speedMax), 0.2, 4.2);
    const turnRate = THREE.MathUtils.clamp(Number(raw.turnRate) || 6.2, 1.5, 14);
    const bobPhase = Number.isFinite(Number(raw.bobPhase)) ? Number(raw.bobPhase) : Math.random() * Math.PI * 2;
    const yaw = Number(raw.yaw);

    const existing = fishState.fishes.get(id);
    if (existing) {
        existing.variant = variant;
        existing.speed = speed;
        existing.turnRate = turnRate;
        existing.bottomY = bottomY;
        existing.topY = safeTopY;
        existing.syncTargetX = x;
        existing.syncTargetY = y;
        existing.syncTargetZ = z;
        existing.targetX = targetX;
        existing.targetY = targetY;
        existing.targetZ = targetZ;
        if (Number.isFinite(yaw)) {
            existing.syncYaw = yaw;
        }
        existing.remoteSync = true;
        return true;
    }

    const node = createFishNode(variant);
    node.position.set(x, y, z);
    node.rotation.y = Number.isFinite(yaw) ? yaw : 0;
    fishRoot.add(node);
    fishState.fishes.set(id, {
        id,
        variant,
        node,
        x,
        y,
        z,
        targetX,
        targetY,
        targetZ,
        speed,
        targetTimer: randomInRange(0.9, 2.2),
        bobPhase,
        turnRate,
        bottomY,
        topY: safeTopY,
        remoteSync: true,
        syncTargetX: x,
        syncTargetY: y,
        syncTargetZ: z,
        syncYaw: Number.isFinite(yaw) ? yaw : 0
    });
    bumpNextFishIdFromValue(id);
    return true;
}

function applyRemoteWildlifeSnapshot(rawPayload) {
    const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
    const rabbitsPayload = payload.rabbits && typeof payload.rabbits === "object" ? payload.rabbits : {};
    const fishesPayload = payload.fishes && typeof payload.fishes === "object" ? payload.fishes : {};
    const seenRabbits = new Set();
    const seenFishes = new Set();

    for (const [rabbitId, rabbitRaw] of Object.entries(rabbitsPayload)) {
        if (upsertRabbitFromWildlifeSnapshot(rabbitId, rabbitRaw)) {
            seenRabbits.add(String(rabbitId));
        }
    }
    for (const [fishId, fishRaw] of Object.entries(fishesPayload)) {
        if (upsertFishFromWildlifeSnapshot(fishId, fishRaw)) {
            seenFishes.add(String(fishId));
        }
    }

    for (const rabbitId of Array.from(wildlifeState.rabbits.keys())) {
        if (!seenRabbits.has(rabbitId)) {
            removeRabbitEntity(rabbitId);
        }
    }
    for (const fishId of Array.from(fishState.fishes.keys())) {
        if (!seenFishes.has(fishId)) {
            removeFishEntity(fishId);
        }
    }
}

function publishWildlifeSnapshot(force = false) {
    if (!multiplayer.ready || !multiplayer.isWildlifeAuthority || !multiplayer.firebase?.dbModule || !multiplayer.refs.wildlifeRef) {
        return;
    }
    const now = performance.now();
    if (!force && now - multiplayer.wildlifeLastPublishMs < WILDLIFE_SYNC_INTERVAL_MS) {
        return;
    }
    multiplayer.wildlifeLastPublishMs = now;
    const rabbitsPayload = {};
    const fishesPayload = {};
    for (const [rabbitId, rabbit] of wildlifeState.rabbits.entries()) {
        rabbitsPayload[rabbitId] = serializeRabbitForWildlifeSync(rabbit);
    }
    for (const [fishId, fish] of fishState.fishes.entries()) {
        fishesPayload[fishId] = serializeFishForWildlifeSync(fish);
    }
    const payload = {
        updatedAt: Date.now(),
        authorityId: String(multiplayer.profile?.id || ""),
        rabbits: rabbitsPayload,
        fishes: fishesPayload
    };
    multiplayer.firebase.dbModule.set(multiplayer.refs.wildlifeRef, payload).catch((error) => {
        console.warn("No pude sincronizar fauna en nube", error);
        if (multiplayer.wildlifeWriteTimerId === null) {
            multiplayer.wildlifeWriteTimerId = window.setTimeout(() => {
                multiplayer.wildlifeWriteTimerId = null;
                publishWildlifeSnapshot(true);
            }, WILDLIFE_SYNC_RETRY_MS);
        }
    });
}

function subscribeWildlifeSnapshot() {
    if (!multiplayer.ready || multiplayer.wildlifeSnapshotUnsubscribe) {
        return;
    }
    const dbModule = multiplayer.firebase?.dbModule;
    const db = multiplayer.firebase?.db;
    if (!dbModule || !db) {
        return;
    }
    const wildlifeRef = multiplayer.refs.wildlifeRef || dbModule.ref(db, `${multiplayer.worldPath}/wildlife`);
    multiplayer.refs.wildlifeRef = wildlifeRef;
    multiplayer.wildlifeSnapshotUnsubscribe = dbModule.onValue(wildlifeRef, (snapshot) => {
        if (multiplayer.isWildlifeAuthority) {
            return;
        }
        multiplayer.wildlifeSnapshotReady = true;
        applyRemoteWildlifeSnapshot(snapshot.val() || {});
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
    const migratedEntryMap = getShiftedEditOverrideMap(migratedEntries);
    const migratedProps = remapPropsWithVerticalShift(props, shiftY, migratedEntryMap);
    const chunkPatch = buildChunkUpdatePatch(entries, migratedEntries);
    const propPatch = buildPropUpdatePatch(props, migratedProps);
    const fullPatch = { ...chunkPatch, ...propPatch, ...patch };
    await dbModule.update(worldRef, fullPatch);
    return { migrated: true, shiftY };
}

function updateRendererPerfStats(deltaSeconds) {
    perfState.statsTick -= Math.max(0, Number(deltaSeconds) || 0);
    if (perfState.statsTick > 0) {
        return;
    }
    perfState.statsTick = PERF_STATS_UPDATE_INTERVAL;

    const info = renderer?.info;
    const renderInfo = info?.render || {};
    const memoryInfo = info?.memory || {};
    perfState.drawCalls = Number(renderInfo.calls) || 0;
    perfState.triangles = Number(renderInfo.triangles) || 0;
    perfState.points = Number(renderInfo.points) || 0;
    perfState.lines = Number(renderInfo.lines) || 0;
    perfState.geometries = Number(memoryInfo.geometries) || 0;
    perfState.textures = Number(memoryInfo.textures) || 0;
}

function updateChunkBuildMetrics(buildCount, elapsedMs) {
    if (buildCount <= 0 || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
        return;
    }
    perfState.chunkLastBatchMs = elapsedMs;
    const perChunkMs = elapsedMs / Math.max(1, buildCount);
    if (!Number.isFinite(perChunkMs) || perChunkMs <= 0) {
        return;
    }
    if (!Number.isFinite(perfState.chunkBuildCostEmaMs) || perfState.chunkBuildCostEmaMs <= 0) {
        perfState.chunkBuildCostEmaMs = perChunkMs;
        return;
    }
    perfState.chunkBuildCostEmaMs = perfState.chunkBuildCostEmaMs * 0.82 + perChunkMs * 0.18;
}

function updateAdaptiveQuality(deltaSeconds) {
    const safeDelta = Math.max(0, Number(deltaSeconds) || 0);
    const fpsInstant = safeDelta > 0 ? 1 / safeDelta : 60;
    const frameMs = Math.max(0.2, safeDelta * 1000);
    perfState.fpsEma = perfState.fpsEma * 0.92 + fpsInstant * 0.08;
    perfState.frameMsEma = perfState.frameMsEma * 0.9 + frameMs * 0.1;
    perfState.adjustCooldown -= safeDelta;
    updateRendererPerfStats(safeDelta);

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

    const fps = perfState.fpsEma;
    const frameMs = perfState.frameMsEma;
    const avgChunkMs = Math.max(0.25, Number(perfState.chunkBuildCostEmaMs) || 1.2);

    let buildTimeBudgetMs = 2.3;
    if (fps >= 58 && frameMs <= 17) {
        buildTimeBudgetMs = 4;
    } else if (fps >= 52 && frameMs <= 19.5) {
        buildTimeBudgetMs = 3.1;
    } else if (fps <= 42 || frameMs >= 24) {
        buildTimeBudgetMs = 1.25;
    }

    let budget = Math.max(1, Math.floor(buildTimeBudgetMs / avgChunkMs));
    if (state.pendingChunkBuildCount > 38 && fps > 50 && frameMs < 20) {
        budget += 1;
    }
    if (state.pendingChunkBuildCount > 1800 && fps > 48 && frameMs < 21) {
        budget += 2;
    }
    if (state.pendingChunkBuildCount > 5200 && fps > 45 && frameMs < 22) {
        budget += 3;
    }

    return clampInt(budget, 1, 12);
}

function getDynamicChunkBuildFrameBudgetMs() {
    if (state.pendingChunkBuildCount <= 0) {
        return 0;
    }

    const fps = perfState.fpsEma;
    const frameMs = perfState.frameMsEma;

    let frameBudgetMs = 2.4;
    if (fps >= 58 && frameMs <= 17) {
        frameBudgetMs = 4.2;
    } else if (fps >= 52 && frameMs <= 19.5) {
        frameBudgetMs = 3.2;
    } else if (fps <= 42 || frameMs >= 24) {
        frameBudgetMs = 1.35;
    }

    if (state.pendingChunkBuildCount > 56 && fps >= 54 && frameMs < 19) {
        frameBudgetMs += 0.65;
    }
    if (state.pendingChunkBuildCount > 1800 && fps >= 48 && frameMs < 21.5) {
        frameBudgetMs += 1.5;
    }
    if (state.pendingChunkBuildCount > 5200 && fps >= 45 && frameMs < 23) {
        frameBudgetMs += 2.2;
    }

    return Math.max(1, Math.min(9.2, frameBudgetMs));
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
        multiplayer.refs.wildlifeRef = dbModule.ref(db, `${worldPath}/wildlife`);
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

            rebuildRemoteUsingByProp();

            const sortedIds = Object.keys(payload).sort();
            const wasAuthority = multiplayer.isWildlifeAuthority;
            multiplayer.isWildlifeAuthority = sortedIds.length === 0 || sortedIds[0] === multiplayer.profile.id;
            if (multiplayer.isWildlifeAuthority && !wasAuthority) {
                multiplayer.wildlifeSnapshotReady = true;
                publishWildlifeSnapshot(true);
            } else if (!multiplayer.isWildlifeAuthority && wasAuthority) {
                multiplayer.wildlifeSnapshotReady = false;
                const wildlifeRef = multiplayer.refs.wildlifeRef;
                if (wildlifeRef) {
                    dbModule.get(wildlifeRef).then((wildlifeSnapshot) => {
                        if (multiplayer.isWildlifeAuthority) {
                            return;
                        }
                        multiplayer.wildlifeSnapshotReady = true;
                        applyRemoteWildlifeSnapshot(wildlifeSnapshot.val() || {});
                    }).catch(() => {
                    });
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
        subscribeWildlifeSnapshot();
        multiplayer.wildlifeSnapshotReady = multiplayer.isWildlifeAuthority;
        if (multiplayer.isWildlifeAuthority) {
            publishWildlifeSnapshot(true);
        }
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
    const activity = getLocalTemporaryActivityPayload();

    if (!force && multiplayer.lastSentState) {
        const previous = multiplayer.lastSentState;
        const moved = Math.abs(x - previous.x) > 0.01
            || Math.abs(y - previous.y) > 0.01
            || Math.abs(z - previous.z) > 0.01;
        const turned = getAngularDistanceRadians(yaw, previous.yaw) > 0.012
            || Math.abs(pitch - previous.pitch) > 0.012;
        const activityChanged = !arePlayerActivitiesEqual(previous.activity, activity);
        const heartbeatDue = sentAt - previous.sentAt >= multiplayer.idleHeartbeatMs;

        if (!moved && !turned && !activityChanged && !heartbeatDue) {
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
        activity,
        started: state.worldStarted,
        updatedAt: sentAt
    };

    multiplayer.lastSentState = {
        x,
        y,
        z,
        yaw,
        pitch,
        activity,
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

function blockColumnKey(x, z) {
    return `${x}|${z}`;
}

function sanitizeDecorativeFloraColumnKey(value) {
    const raw = String(value || "").trim();
    const [xText, zText] = raw.split("|");
    const x = Number.parseInt(xText, 10);
    const z = Number.parseInt(zText, 10);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return "";
    }
    return blockColumnKey(x, z);
}

function serializeRemovedDecorativeFloraColumns() {
    return Array.from(removedDecorativeFloraColumns.values()).sort((a, b) => a.localeCompare(b));
}

function applyRemovedDecorativeFloraFromPayload(rawList) {
    removedDecorativeFloraColumns.clear();
    if (!Array.isArray(rawList)) {
        return;
    }
    for (const entry of rawList) {
        const safeKey = sanitizeDecorativeFloraColumnKey(entry);
        if (safeKey) {
            removedDecorativeFloraColumns.add(safeKey);
        }
    }
}

function addEditedBlockToColumnIndex(x, y, z) {
    const key = blockColumnKey(x, z);
    let ySet = editedColumnYIndex.get(key);
    if (!ySet) {
        ySet = new Set();
        editedColumnYIndex.set(key, ySet);
    }
    ySet.add(y);
}

function removeEditedBlockFromColumnIndex(x, y, z) {
    const key = blockColumnKey(x, z);
    const ySet = editedColumnYIndex.get(key);
    if (!ySet) {
        return;
    }
    ySet.delete(y);
    if (ySet.size === 0) {
        editedColumnYIndex.delete(key);
    }
}

function getEditedColumnRange(x, z) {
    const ySet = editedColumnYIndex.get(blockColumnKey(x, z));
    if (!ySet || ySet.size === 0) {
        return null;
    }

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const y of ySet) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
        return null;
    }

    return { minY, maxY };
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

function wrapCoordinateToWorldMap(value) {
    const half = GLOBAL_MAP_VIEW_RADIUS_BLOCKS;
    const span = half * 2;
    const numeric = Number(value) || 0;
    return ((numeric + half) % span + span) % span - half;
}

function ellipseMask(nx, nz, cx, cz, rx, rz, angleDegrees = 0, softness = 1.8) {
    const radians = angleDegrees * (Math.PI / 180);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = nx - cx;
    const dz = nz - cz;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    const px = localX / Math.max(0.001, rx);
    const pz = localZ / Math.max(0.001, rz);
    const distance = Math.hypot(px, pz);
    const inside = clamp01(1 - distance);
    return Math.pow(inside, Math.max(0.4, Number(softness) || 1));
}

function getEarthLikeContinentMask(worldX, worldZ) {
    const wrappedX = wrapCoordinateToWorldMap(worldX);
    const wrappedZ = wrapCoordinateToWorldMap(worldZ);
    const nx = wrappedX / GLOBAL_MAP_VIEW_RADIUS_BLOCKS;
    const nz = wrappedZ / GLOBAL_MAP_VIEW_RADIUS_BLOCKS;

    let continents = 0;
    const add = (cx, cz, rx, rz, angle, weight = 1, softness = 0.9) => {
        continents += ellipseMask(nx, nz, cx, cz, rx, rz, angle, softness) * weight;
    };

    // Americas
    add(-0.68, -0.2, 0.29, 0.31, -18, 1.02, 0.84);
    add(-0.76, -0.08, 0.16, 0.16, -26, 0.74, 0.86);
    add(-0.58, -0.02, 0.14, 0.2, -16, 0.68, 0.9);
    add(-0.64, 0.16, 0.1, 0.14, -5, 0.56, 0.95);
    add(-0.57, 0.43, 0.16, 0.32, -7, 0.98, 0.9);
    add(-0.53, 0.62, 0.1, 0.2, 8, 0.58, 0.95);

    // Greenland
    add(-0.37, -0.53, 0.12, 0.14, -8, 0.62, 0.92);

    // Europe + Africa
    add(-0.05, -0.16, 0.13, 0.11, -11, 0.86, 0.87);
    add(0.02, 0.09, 0.21, 0.32, 4, 1.08, 0.9);
    add(0.08, 0.29, 0.13, 0.2, 8, 0.74, 0.93);

    // Arabia + India
    add(0.2, 0.08, 0.11, 0.12, 14, 0.64, 0.92);
    add(0.3, 0.13, 0.09, 0.13, 24, 0.58, 0.92);

    // Asia
    add(0.42, -0.17, 0.34, 0.24, 8, 1.08, 0.86);
    add(0.58, -0.04, 0.23, 0.2, 4, 0.94, 0.9);
    add(0.48, 0.1, 0.22, 0.18, 12, 0.76, 0.9);
    add(0.68, 0.02, 0.11, 0.11, 0, 0.56, 0.94);

    // Oceania
    add(0.71, 0.53, 0.16, 0.1, 8, 0.94, 0.87);
    add(0.62, 0.41, 0.14, 0.11, 22, 0.56, 0.92);
    add(0.79, 0.4, 0.08, 0.07, 6, 0.44, 0.9);

    let landMask = smoothstep(0.22, 0.74, continents);
    const atlanticCarve = ellipseMask(nx, nz, -0.21, 0.02, 0.24, 0.62, 2, 1.26);
    const pacificNorthCarve = ellipseMask(nx, nz, -0.88, -0.04, 0.18, 0.42, -8, 1.3);
    const pacificSouthCarve = ellipseMask(nx, nz, 0.9, 0.24, 0.16, 0.4, 8, 1.3);
    landMask -= atlanticCarve * 0.2;
    landMask -= pacificNorthCarve * 0.12;
    landMask -= pacificSouthCarve * 0.12;

    const coastalNoise = fractalNoise2D(wrappedX + 1420, wrappedZ - 1180, 0.00135, 4, 0.56, 420);
    const shorelineRidges = Math.abs(valueNoise2D(wrappedX - 760, wrappedZ + 520, 0.0034, 421));
    const archipelagoNoise = fractalNoise2D(wrappedX + 2600, wrappedZ + 1800, 0.0022, 2, 0.54, 422);
    landMask += coastalNoise * 0.065;
    landMask -= smoothstep(0.4, 0.78, shorelineRidges) * 0.11;
    if (archipelagoNoise > 0.52 && landMask < 0.48) {
        landMask += (archipelagoNoise - 0.52) * 0.16;
    }

    return clamp01(landMask);
}

function trimColumnCacheIfNeeded() {
    if (columnCache.size <= COLUMN_CACHE_MAX_ENTRIES) {
        return;
    }
    let toRemove = Math.max(0, columnCache.size - COLUMN_CACHE_TRIM_TO_ENTRIES);
    toRemove = Math.min(toRemove, COLUMN_CACHE_TRIM_BATCH);
    if (toRemove <= 0) {
        return;
    }
    for (const oldestKey of columnCache.keys()) {
        columnCache.delete(oldestKey);
        toRemove -= 1;
        if (toRemove <= 0) {
            break;
        }
    }
}

function getColumnInfo(x, z) {
    const key = `${x}|${z}`;
    const cached = columnCache.get(key);
    if (cached) {
        return cached;
    }

    const warpLargeX = valueNoise2D(x, z, 0.0018, 501) * 54;
    const warpLargeZ = valueNoise2D(x, z, 0.0018, 503) * 54;
    const warpFineX = valueNoise2D(x, z, 0.0064, 502) * 16;
    const warpFineZ = valueNoise2D(x, z, 0.0064, 504) * 16;
    const wx = x + warpLargeX + warpFineX;
    const wz = z + warpLargeZ + warpFineZ;

    const continentalNoise = fractalNoise2D(wx, wz, 0.00045, 5, 0.56, 31);
    const continentalShapeNoise = fractalNoise2D(wx + 3100, wz - 2700, 0.00072, 3, 0.56, 32);
    const earthLandMask = getEarthLikeContinentMask(x, z);
    const continentalBase = earthLandMask * 2 - 1;
    const continental = THREE.MathUtils.clamp(
        continentalBase * 0.96
        + continentalNoise * 0.1
        + continentalShapeNoise * 0.06,
        -1,
        1
    );
    const erosion = fractalNoise2D(wx + 420, wz - 260, 0.0015, 4, 0.58, 53);
    const erosion01 = clamp01((erosion + 1) * 0.5);
    const ridges = Math.pow(clamp01(1 - Math.abs(fractalNoise2D(wx, wz, 0.0019, 5, 0.5, 67))), 1.12);
    const lowDetail = fractalNoise2D(wx, wz, 0.0058, 4, 0.54, 11);
    const highDetail = fractalNoise2D(wx, wz, 0.0185, 3, 0.5, 12);
    const moistureNoise = fractalNoise2D(wx - 180, wz + 240, 0.0017, 4, 0.6, 109);
    const temperatureNoise = fractalNoise2D(wx + 780, wz - 310, 0.00135, 4, 0.58, 205);
    const macroMoistureNoise = fractalNoise2D(wx - 4200, wz + 3200, 0.00033, 3, 0.6, 406);
    const macroHeatNoise = fractalNoise2D(wx + 6200, wz - 2800, 0.00031, 3, 0.58, 407);
    const macroReliefNoise = fractalNoise2D(wx - 2600, wz - 4700, 0.00036, 3, 0.62, 408);
    const regionalMoisture = clamp01(
        clamp01((macroMoistureNoise + 1) * 0.5) * 0.72
        + clamp01((moistureNoise + 1) * 0.5) * 0.28
    );
    const regionalHeat = clamp01(
        clamp01((macroHeatNoise + 1) * 0.5) * 0.68
        + clamp01((temperatureNoise + 1) * 0.5) * 0.32
    );
    const regionalRelief = clamp01(
        clamp01((macroReliefNoise + 1) * 0.5) * 0.62
        + ridges * 0.38
    );
    const volcanicNoise = fractalNoise2D(wx - 1380, wz + 870, 0.00105, 4, 0.58, 333);
    const volcanicRidged = Math.pow(clamp01(1 - Math.abs(valueNoise2D(wx + 940, wz - 420, 0.0038, 338))), 1.34);
    const volcanicClusterNoise = fractalNoise2D(wx - 3260, wz + 2490, 0.00042, 3, 0.62, 339);
    const tectonicSignal = Math.abs(valueNoise2D(wx - 2200, wz + 1400, 0.00052, 340));
    const tectonicBeltMask = 1 - smoothstep(0.18, 0.42, tectonicSignal);

    const microMoisture01 = clamp01((moistureNoise + 1) * 0.5);
    const microHeat01 = clamp01((temperatureNoise + 1) * 0.5);
    const biomePatchNoise = fractalNoise2D(wx + 1600, wz - 2100, 0.00052, 3, 0.58, 409);
    const biomePatch01 = clamp01((biomePatchNoise + 1) * 0.5);
    let climateMoisture01 = clamp01(
        regionalMoisture * 0.74
        + microMoisture01 * 0.18
        + biomePatch01 * 0.08
    );
    let climateHeat01 = clamp01(
        regionalHeat * 0.76
        + microHeat01 * 0.17
        + (1 - biomePatch01) * 0.07
    );
    let moisture = climateMoisture01 * 2 - 1;
    let temperature = climateHeat01 * 2 - 1;
    const continental01 = clamp01((continental + 1) * 0.5);
    const mountainRegionNoise = fractalNoise2D(wx - 2500, wz + 1700, 0.00028, 3, 0.58, 341);
    const mountainRegionMask = smoothstep(
        0.4,
        0.82,
        clamp01((mountainRegionNoise + 1) * 0.5 + tectonicBeltMask * 0.24 - erosion01 * 0.18)
    );
    const mountainShape = continental * 0.22 + ridges * 0.68 + regionalRelief * 0.22 - erosion01 * 0.52;
    const mountainMaskBase = smoothstep(0.48, 0.9, mountainShape);
    const mountainMask = clamp01(mountainMaskBase * (0.16 + mountainRegionMask * 1.04));
    const valleyMask = smoothstep(0.3, 0.95, -continental + erosion01 * 0.82);
    const ridgePeaks = Math.pow(clamp01(ridges * 0.78 + mountainMask * 0.52 + mountainRegionMask * 0.22), 1.42);
    let dryness = clamp01((1 - climateMoisture01) * 0.66 + climateHeat01 * 0.44 - valleyMask * 0.18);

    let rawHeight = SEA_LEVEL
        + (continental01 - 0.5) * 58
        + lowDetail * 12
        + highDetail * 5
        - erosion01 * 8;
    rawHeight += mountainMask * (18 + ridgePeaks * 98);
    rawHeight += mountainRegionMask * 6;

    if (temperature < -0.14 && mountainMask > 0.58) {
        rawHeight += (mountainMask - 0.58) * 66;
    }

    const oceanDepthSignal = clamp01((fractalNoise2D(wx - 400, wz + 600, 0.0011, 3, 0.57, 280) + 1) * 0.5);
    if (continental < -0.34) {
        rawHeight = SEA_LEVEL - (10 + oceanDepthSignal * 46 + clamp01(-continental - 0.34) * 72);
    } else if (continental < -0.12) {
        rawHeight -= smoothstep(-0.34, -0.12, continental) * (7 + oceanDepthSignal * 22);
    }

    const riverSignal = Math.abs(valueNoise2D(wx + 1330, wz - 870, 0.00125, 191));
    const riverMaskRaw = (1 - smoothstep(0.02, 0.11, riverSignal)) * (1 - mountainMask * 0.58);
    const lakeSignal = fractalNoise2D(wx - 760, wz + 540, 0.0022, 3, 0.57, 145)
        - Math.abs(valueNoise2D(wx, wz, 0.0061, 146)) * 0.34
        + moisture * 0.15;
    const lakeMaskRaw = smoothstep(0.56, 0.9, lakeSignal) * (1 - mountainMask * 0.72);
    const deepLakeMaskRaw = smoothstep(0.68, 0.95, lakeSignal + moisture * 0.2 - continental * 0.08) * (1 - mountainMask * 0.67);

    rawHeight -= valleyMask * 8.4;
    rawHeight -= riverMaskRaw * (8 + valleyMask * 18 + (1 - mountainMask) * 6);
    rawHeight -= lakeMaskRaw * (12 + deepLakeMaskRaw * 30 + (1 - mountainMask) * 10);

    const volcanicClusterMask = smoothstep(
        0.44,
        0.72,
        volcanicClusterNoise * 0.82
        + mountainMask * 0.32
        + mountainRegionMask * 0.26
        + regionalRelief * 0.24
        + tectonicBeltMask * 0.34
        - valleyMask * 0.22
    );
    const volcanicMaskRaw = smoothstep(
        0.42,
        0.7,
        volcanicNoise * 0.76
        + volcanicRidged * 0.56
        + ridgePeaks * 0.3
        + tectonicBeltMask * 0.24
        + (1 - climateMoisture01) * 0.32
        - valleyMask * 0.24
    ) * volcanicClusterMask;
    const craterMaskRaw = smoothstep(0.78, 0.97, volcanicRidged + volcanicMaskRaw * 0.38) * volcanicMaskRaw;
    const lavaChannelMaskRaw = smoothstep(0.44, 0.84, volcanicMaskRaw)
        * (1 - craterMaskRaw * 0.68)
        * (1 - smoothstep(0.05, 0.18, Math.abs(valueNoise2D(wx + 1280, wz - 960, 0.012, 352))));
    rawHeight += volcanicMaskRaw * (30 + ridgePeaks * 96);
    rawHeight -= craterMaskRaw * (18 + volcanicMaskRaw * 38);

    const centerDistance = Math.hypot(x, z);
    const spawnBlend = smoothstep(84, 190, centerDistance);
    const legacyBase = SEA_LEVEL + 4 + fractalNoise2D(x, z, 0.018, 2, 0.5, 11) * 6;
    rawHeight = lerp(legacyBase, rawHeight, spawnBlend);
    const height = clampInt(rawHeight, 4, WORLD_MAX_Y - 6);

    const altitude01 = clamp01((height - (SEA_LEVEL + 10)) / Math.max(1, WORLD_MAX_Y - SEA_LEVEL - 14));
    const mountainClimateBlend = smoothstep(0.42, 0.82, mountainMask);
    climateMoisture01 = clamp01(
        lerp(climateMoisture01, regionalMoisture, mountainClimateBlend * 0.72)
        - ridgePeaks * 0.06
        + valleyMask * 0.05
    );
    climateHeat01 = clamp01(
        lerp(climateHeat01, regionalHeat, mountainClimateBlend * 0.68)
        - altitude01 * 0.24
        + continental01 * 0.05
    );
    moisture = climateMoisture01 * 2 - 1;
    temperature = climateHeat01 * 2 - 1;
    dryness = clamp01((1 - climateMoisture01) * 0.72 + climateHeat01 * 0.5 + regionalRelief * 0.08 - valleyMask * 0.18);
    const coldness = clamp01(0.35 + mountainMask * 0.42 + altitude01 * 0.78 - moisture * 0.18 - temperature * 0.18);
    const snowMask = smoothstep(0.5, 0.86, coldness);
    const rockiness = clamp01(mountainMask * 0.52 + ridgePeaks * 0.54 + (1 - climateMoisture01) * 0.22 + Math.max(0, altitude01 - 0.4) * 0.24);
    const riverMask = riverMaskRaw * spawnBlend;
    const lakeMask = lakeMaskRaw * spawnBlend;
    const deepLakeMask = deepLakeMaskRaw * spawnBlend;
    const volcanicMask = volcanicMaskRaw * spawnBlend;
    const craterMask = craterMaskRaw * spawnBlend;
    const lavaChannelMask = lavaChannelMaskRaw * spawnBlend;

    const isOceanic = continental < -0.3 || height <= SEA_LEVEL - 11;
    const isCoast = !isOceanic && (continental < 0.06 || (height <= SEA_LEVEL + 4 && moisture > -0.12));
    const isDeepLake = deepLakeMask > 0.44 && height <= SEA_LEVEL + 2;
    const mountainDominance = smoothstep(0.42, 0.84, mountainMask + regionalRelief * 0.22);
    const desertScore = clamp01((1 - climateMoisture01) * 0.78 + climateHeat01 * 0.54 + mountainDominance * 0.08 - valleyMask * 0.16);
    const forestScore = clamp01(climateMoisture01 * 0.82 + (1 - climateHeat01) * 0.12 + valleyMask * 0.22 - ridgePeaks * 0.14);

    let biome = BIOME.PLAINS;
    if (spawnBlend < 0.22) {
        biome = BIOME.SPAWN_VALLEY;
    } else if (isOceanic) {
        biome = BIOME.MARITIME;
    } else if (isDeepLake || (lakeMask > 0.42 && height <= SEA_LEVEL + 2)) {
        biome = BIOME.LAKE;
    } else if (
        volcanicMask > 0.3
        && mountainMask > 0.16
        && ridgePeaks > 0.08
        && lakeMask < 0.22
        && height >= SEA_LEVEL + 5
        && continental > -0.12
        && regionalRelief > 0.2
    ) {
        biome = BIOME.VOLCANIC;
    } else if (isCoast) {
        biome = BIOME.COAST;
    } else if (
        (snowMask > 0.62 && mountainMask > 0.54 && ridgePeaks > 0.36)
        || (height > SEA_LEVEL + 120 && mountainMask > 0.48)
        || (mountainMask > 0.72 && climateHeat01 < 0.4)
    ) {
        biome = BIOME.CORDILLERA;
    } else if (desertScore > 0.67 && dryness > 0.6 && climateHeat01 > 0.46) {
        biome = BIOME.DESERT;
    } else if (forestScore > 0.47 && mountainMask < 0.6) {
        biome = BIOME.FOREST;
    }

    const openFieldSignal = clamp01((fractalNoise2D(wx + 1320, wz - 1460, 0.0009, 3, 0.57, 351) + 1) * 0.5);
    const openFieldMask = smoothstep(0.46, 0.88, openFieldSignal);
    let treeChanceBase = 0.0012 + climateMoisture01 * 0.0075 + valleyMask * 0.0028;
    if (biome === BIOME.FOREST) treeChanceBase += 0.007;
    if (biome === BIOME.SPAWN_VALLEY) treeChanceBase += 0.003;
    if (biome === BIOME.COAST) treeChanceBase *= 0.34;
    if (biome === BIOME.DESERT) treeChanceBase *= 0.08;
    if (biome === BIOME.CORDILLERA) treeChanceBase *= 0.14;
    if (biome === BIOME.VOLCANIC) treeChanceBase *= 0.02;
    if (biome === BIOME.SPAWN_VALLEY) treeChanceBase *= 0.24;
    if (biome === BIOME.PLAINS) treeChanceBase *= 0.2;
    if (biome === BIOME.FOREST) treeChanceBase *= 0.62;
    if (biome === BIOME.MARITIME || biome === BIOME.LAKE) treeChanceBase = 0;
    if (biome === BIOME.PLAINS || biome === BIOME.SPAWN_VALLEY || biome === BIOME.COAST) {
        treeChanceBase *= 1 - openFieldMask * 0.92;
    } else if (biome === BIOME.FOREST) {
        treeChanceBase *= 1 - openFieldMask * 0.72;
    }

    const treePenalty = mountainMask * 0.66 + snowMask * 0.92 + lakeMask * 1.12 + riverMask * 0.32 + volcanicMask * 0.9;
    const roll = hashUnit(x, z, 91);
    const hasTree = height > SEA_LEVEL + 1
        && lakeMask < 0.5
        && riverMask < 0.72
        && roll < Math.max(0, treeChanceBase * (1 - treePenalty) + 0.0015);

    const variantRoll = hashUnit(x, z, 305);
    let treeVariant = "oak";
    if (biome === BIOME.CORDILLERA) {
        treeVariant = variantRoll < 0.62 ? "pine" : "cedar";
    } else if (biome === BIOME.VOLCANIC) {
        treeVariant = "pine";
    } else if (biome === BIOME.DESERT) {
        treeVariant = variantRoll < 0.68 ? "cactus" : "desert_shrub";
    } else if (biome === BIOME.COAST) {
        treeVariant = variantRoll < 0.55 ? "cedar" : "fruit";
    } else if (biome === BIOME.FOREST) {
        if (variantRoll < 0.18) treeVariant = "fruit";
        else if (variantRoll < 0.4) treeVariant = "pine";
        else if (variantRoll < 0.6) treeVariant = "cedar";
        else if (variantRoll < 0.78) treeVariant = "tall";
        else if (variantRoll < 0.9) treeVariant = "bush";
        else treeVariant = "oak";
    } else if (biome === BIOME.PLAINS || biome === BIOME.SPAWN_VALLEY) {
        if (variantRoll < 0.16) treeVariant = "fruit";
        else if (variantRoll < 0.34) treeVariant = "pine";
        else if (variantRoll < 0.48) treeVariant = "cedar";
        else if (variantRoll < 0.64) treeVariant = "bush";
        else treeVariant = "oak";
    }

    let treeHeight = 4 + (hash2D(x, z, 103) % 3) + (climateMoisture01 > 0.66 ? 1 : 0);
    if (biome === BIOME.FOREST) treeHeight += 1;
    if (treeVariant === "pine") treeHeight += 2;
    if (treeVariant === "cedar") treeHeight += 3;
    if (treeVariant === "tall") treeHeight += 4;
    if (treeVariant === "bush" || treeVariant === "desert_shrub") treeHeight -= 2;
    if (treeVariant === "cactus") treeHeight = 4 + (hash2D(x, z, 810) % 4);
    treeHeight = clampInt(treeHeight, 2, 12);

    let treeWoodBlock = BLOCK.WOOD;
    let treeLeafBlock = BLOCK.LEAVES;
    let treeFruitBlock = BLOCK.AIR;
    if (biome === BIOME.DESERT) {
        treeWoodBlock = treeVariant === "cactus" ? BLOCK.BAMBOO : BLOCK.REDDISH_WOOD;
        treeLeafBlock = treeVariant === "cactus" ? BLOCK.BAMBOO : BLOCK.PINK_LEAVES;
    } else if (biome === BIOME.COAST) {
        treeWoodBlock = BLOCK.LIGHT_WOOD;
        treeLeafBlock = treeVariant === "fruit" ? BLOCK.PINK_LEAVES : BLOCK.LEAVES;
    } else if (biome === BIOME.CORDILLERA) {
        treeWoodBlock = BLOCK.DARK_PLANKS;
        treeLeafBlock = BLOCK.LEAVES;
    } else if ((biome === BIOME.FOREST || biome === BIOME.PLAINS) && (hash2D(x, z, 777) % 27) === 0) {
        treeWoodBlock = BLOCK.REDDISH_WOOD;
        treeLeafBlock = BLOCK.PINK_LEAVES;
    }
    if (treeVariant === "fruit") {
        treeFruitBlock = BLOCK.COPPER;
    }
    if (treeVariant === "cedar") {
        treeWoodBlock = BLOCK.REDDISH_WOOD;
        treeLeafBlock = biome === BIOME.COAST ? BLOCK.PINK_LEAVES : BLOCK.LEAVES;
    }
    if (treeVariant === "pine") {
        treeWoodBlock = biome === BIOME.CORDILLERA ? BLOCK.DARK_PLANKS : treeWoodBlock;
        treeLeafBlock = BLOCK.LEAVES;
    }

    const floraRoll = hashUnit(x, z, 1182);
    let floraType = "none";
    if (!hasTree && height > SEA_LEVEL + 1 && lakeMask < 0.26 && riverMask < 0.48) {
        if (biome === BIOME.FOREST && floraRoll < 0.035) {
            floraType = floraRoll < 0.03 ? "berry_shrub" : "bush";
        } else if ((biome === BIOME.PLAINS || biome === BIOME.SPAWN_VALLEY) && floraRoll < 0.012 && openFieldMask < 0.82) {
            floraType = "bush";
        } else if (biome === BIOME.DESERT && floraRoll < 0.014) {
            floraType = "dry_shrub";
        } else if (biome === BIOME.COAST && floraRoll < 0.016 && openFieldMask < 0.86) {
            floraType = "coastal_bush";
        } else if (biome === BIOME.CORDILLERA && floraRoll < 0.009) {
            floraType = "cold_shrub";
        }
    }
    const floraHeight = clampInt(1 + (hash2D(x, z, 1183) % 2), 1, 2);

    const info = {
        height,
        mountainMask,
        valleyMask,
        riverMask,
        lakeMask,
        deepLakeMask,
        volcanicMask,
        craterMask,
        lavaChannelMask,
        snowMask,
        moisture,
        temperature,
        rockiness,
        biome,
        hasTree,
        treeHeight,
        treeVariant,
        treeWoodBlock,
        treeLeafBlock,
        treeFruitBlock,
        floraType,
        floraHeight
    };

    columnCache.set(key, info);
    trimColumnCacheIfNeeded();
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
    for (let tx = x - 3; tx <= x + 3; tx += 1) {
        for (let tz = z - 3; tz <= z + 3; tz += 1) {
            const column = getColumnInfo(tx, tz);
            const surfaceY = column.height;
            if (!column.hasTree) {
                continue;
            }

            const trunkStart = surfaceY + 1;
            const trunkTop = trunkStart + column.treeHeight;
            const trunkBlock = isValidBlockId(column.treeWoodBlock) ? column.treeWoodBlock : BLOCK.WOOD;
            const leafBlock = isValidBlockId(column.treeLeafBlock) ? column.treeLeafBlock : BLOCK.LEAVES;
            const fruitBlock = isValidBlockId(column.treeFruitBlock) ? column.treeFruitBlock : BLOCK.AIR;
            const variant = String(column.treeVariant || "oak");

            if (x === tx && z === tz && y >= trunkStart && y < trunkTop) {
                return trunkBlock;
            }

            if (variant === "cactus") {
                const armY = trunkStart + Math.floor(column.treeHeight * 0.5);
                const armOrientation = hash2D(tx, tz, 901) % 4;
                const armAxisX = armOrientation % 2 === 0;
                const armDirection = armOrientation < 2 ? 1 : -1;
                if (
                    y === armY
                    && (
                        (armAxisX && z === tz && x === tx + armDirection)
                        || (!armAxisX && x === tx && z === tz + armDirection)
                    )
                ) {
                    return trunkBlock;
                }
                continue;
            }

            const topY = trunkTop;
            const dx = x - tx;
            const dy = y - topY;
            const dz = z - tz;
            const ax = Math.abs(dx);
            const az = Math.abs(dz);

            if (dy < -8 || dy > 2) {
                continue;
            }

            if (variant === "pine") {
                if (dy === 1 && ax + az <= 1) {
                    return leafBlock;
                }
                if (dy <= 0 && dy >= -6) {
                    const radius = Math.max(1, Math.ceil((-dy + 1) / 2));
                    if (ax <= radius && az <= radius && !(radius >= 2 && ax === radius && az === radius)) {
                        return leafBlock;
                    }
                }
                continue;
            }

            if (variant === "cedar") {
                if (dy === 1 && ax + az <= 1) {
                    return leafBlock;
                }
                if (dy <= 0 && dy >= -7) {
                    if (ax + az <= 1) {
                        return leafBlock;
                    }
                    if (dy % 2 === 0 && ax <= 2 && az <= 2 && (ax === 0 || az === 0) && ax + az <= 2) {
                        return leafBlock;
                    }
                }
                continue;
            }

            if (variant === "bush" || variant === "desert_shrub") {
                const canopyBase = trunkStart + 1;
                const shrubDy = y - canopyBase;
                if (shrubDy < -1 || shrubDy > 1) {
                    continue;
                }
                if (ax <= 1 && az <= 1 && !(shrubDy === 1 && ax === 1 && az === 1)) {
                    return leafBlock;
                }
                continue;
            }

            if (variant === "tall") {
                if (dy === 2 && ax + az <= 1) return leafBlock;
                if (dy === 1 && ax <= 1 && az <= 1) return leafBlock;
                if (dy === 0 && ax <= 3 && az <= 3 && !(ax === 3 && az === 3)) return leafBlock;
                if (dy === -1 && ax <= 2 && az <= 2) return leafBlock;
                if (dy === -2 && ax + az <= 2) return leafBlock;
                continue;
            }

            if (variant === "fruit") {
                if (dy === 2 && ax + az <= 1) return leafBlock;
                if (dy === 1 && ax <= 1 && az <= 1) return leafBlock;
                if (dy === 0 && ax <= 2 && az <= 2 && !(ax === 2 && az === 2)) {
                    const fruitNoise = hash2D(x, z, 1801) % 14;
                    if (fruitBlock !== BLOCK.AIR && dy <= 0 && isFruitEligible(ax, az) && fruitNoise === 0) {
                        return fruitBlock;
                    }
                    return leafBlock;
                }
                if (dy === -1 && ax + az <= 1) {
                    const fruitNoise = hash2D(x, z, 1802) % 10;
                    if (fruitBlock !== BLOCK.AIR && fruitNoise === 0) {
                        return fruitBlock;
                    }
                    return leafBlock;
                }
                continue;
            }

            if (dy === 2 && ax + az <= 1) return leafBlock;
            if (dy === 1 && ax <= 1 && az <= 1) return leafBlock;
            if (dy === 0 && ax <= 2 && az <= 2 && !(ax === 2 && az === 2)) return leafBlock;
            if (dy === -1 && ax + az <= 1) return leafBlock;
        }
    }

    return BLOCK.AIR;
}

function isFruitEligible(ax, az) {
    return (ax + az) >= 1 && ax <= 2 && az <= 2;
}

function getGroundFloraBlockAt(x, y, z) {
    for (let tx = x - 1; tx <= x + 1; tx += 1) {
        for (let tz = z - 1; tz <= z + 1; tz += 1) {
            const column = getColumnInfo(tx, tz);
            const floraType = String(column.floraType || "none");
            if (floraType === "none") {
                continue;
            }

            const floraBaseY = column.height + 1;
            const floraHeight = clampInt(Number(column.floraHeight) || 1, 1, 3);
            const dy = y - floraBaseY;
            const dx = x - tx;
            const dz = z - tz;
            const ax = Math.abs(dx);
            const az = Math.abs(dz);

            if (floraType === "dry_shrub") {
                if (dy === 0 && ax + az <= 1) return BLOCK.REDDISH_WOOD;
                if (dy === 1 && ax === 0 && az === 0) return BLOCK.BAMBOO;
                continue;
            }

            if (floraType === "cold_shrub") {
                if (dy === 0 && ax <= 1 && az <= 1) return BLOCK.LEAVES;
                if (dy === 1 && ax + az <= 1) return BLOCK.SNOW;
                continue;
            }

            if (floraType === "coastal_bush") {
                if (dy >= 0 && dy <= floraHeight && ax <= 1 && az <= 1) return BLOCK.LEAVES;
                if (dy === floraHeight + 1 && ax + az <= 1) return BLOCK.LIGHT_WOOD;
                continue;
            }

            if (floraType === "berry_shrub") {
                    if (dy >= 0 && dy <= floraHeight && ax <= 1 && az <= 1) {
                        const berryNoise = hash2D(x, z, 1901) % 11;
                        if ((ax + az) >= 1 && berryNoise === 0) {
                            return BLOCK.COPPER;
                        }
                        return BLOCK.PINK_LEAVES;
                    }
                if (dy === floraHeight + 1 && ax + az <= 1) return BLOCK.PINK_LEAVES;
                continue;
            }

            if (floraType === "bush") {
                if (dy >= 0 && dy <= floraHeight && ax <= 1 && az <= 1) return BLOCK.LEAVES;
                if (dy === floraHeight + 1 && ax + az <= 1) return BLOCK.LEAVES;
                continue;
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
    const biome = String(column.biome || BIOME.PLAINS);
    if (y === 0) {
        return BLOCK.BEDROCK;
    }

    if (y > h) {
        if (y <= SEA_LEVEL) {
            if (column.snowMask > 0.72 && y >= SEA_LEVEL - 2 && (column.lakeMask > 0.2 || biome === BIOME.CORDILLERA)) {
                return BLOCK.ICE;
            }
            return BLOCK.WATER;
        }

        if (h > SEA_LEVEL + 1 && biome !== BIOME.MARITIME && biome !== BIOME.LAKE && biome !== BIOME.VOLCANIC) {
            if (y <= h + 18) {
                return getTreeBlockAt(x, y, z);
            }
        }

        return BLOCK.AIR;
    }

    if (y === h) {
        if (biome === BIOME.MARITIME) {
            if (h <= SEA_LEVEL - 16) {
                return column.rockiness > 0.56 ? BLOCK.SLATE : BLOCK.BASALT;
            }
            if (column.deepLakeMask > 0.42) {
                return BLOCK.GRAVEL;
            }
            return BLOCK.SAND;
        }

        if (biome === BIOME.LAKE) {
            if (column.snowMask > 0.72 && h >= SEA_LEVEL - 2) {
                return BLOCK.ICE;
            }
            return column.deepLakeMask > 0.44 ? BLOCK.MUD : BLOCK.GRAVEL;
        }

        if (biome === BIOME.COAST) {
            if (column.riverMask > 0.28) {
                return BLOCK.MUD;
            }
            return BLOCK.SAND;
        }

        if (biome === BIOME.DESERT) {
            if (column.rockiness > 0.64 && h >= SEA_LEVEL + 10) {
                const desertRock = hash2D(x, z, 713) % 8;
                if (desertRock === 0) return BLOCK.VOLCANIC_STONE;
                if (desertRock === 1) return BLOCK.SLATE;
                if (desertRock === 2) return BLOCK.DARK_BRICK;
            }
            return (hash2D(x, z, 714) % 5 === 0) ? BLOCK.TERRACOTTA : BLOCK.SAND;
        }

        if (biome === BIOME.VOLCANIC) {
            if (column.craterMask > 0.62 && h >= SEA_LEVEL + 7) {
                return BLOCK.LAVA;
            }
            if (column.lavaChannelMask > 0.52 && h >= SEA_LEVEL + 8 && (hash2D(x, z, 1704) % 3 === 0)) {
                return BLOCK.LAVA;
            }
            const volcanicTopPick = hash2D(x, z, 1705) % 9;
            if (volcanicTopPick <= 1) return BLOCK.OBSIDIAN;
            if (volcanicTopPick <= 3) return BLOCK.ASH;
            if (volcanicTopPick <= 6) return BLOCK.VOLCANIC_STONE;
            return BLOCK.BASALT;
        }

        if (biome === BIOME.CORDILLERA) {
            if (column.snowMask > 0.52 || h >= SEA_LEVEL + 82) {
                return BLOCK.SNOW;
            }
            if (column.rockiness > 0.66) {
                const mountainRock = hash2D(x, z, 715) % 7;
                if (mountainRock === 0) return BLOCK.VOLCANIC_STONE;
                if (mountainRock <= 2) return BLOCK.SLATE;
                if (mountainRock === 3) return BLOCK.BASALT;
                return BLOCK.STONE;
            }
            return BLOCK.GRAVEL;
        }

        if (column.snowMask > 0.64 && h >= SEA_LEVEL + 28) {
            return BLOCK.SNOW;
        }

        if (column.rockiness > 0.76 && h >= SEA_LEVEL + 24) {
            const rockPick = hash2D(x, z, 716) % 7;
            if (rockPick === 0) return BLOCK.SLATE;
            if (rockPick === 1) return BLOCK.BASALT;
            return BLOCK.STONE;
        }

        if (column.riverMask > 0.28) {
            return column.moisture > 0 ? BLOCK.GRASS : BLOCK.GRAVEL;
        }

        return BLOCK.GRASS;
    }

    if (biome === BIOME.MARITIME || biome === BIOME.COAST || biome === BIOME.LAKE) {
        if (y >= h - 4) {
            if (column.lakeMask > 0.22 || column.riverMask > 0.22) {
                return BLOCK.MUD;
            }
            return column.deepLakeMask > 0.4 ? BLOCK.GRAVEL : BLOCK.SAND;
        }

        if (column.rockiness > 0.64) {
            const marineRock = hash2D(x, z, 717) % 6;
            if (marineRock <= 1) return BLOCK.BASALT;
            if (marineRock === 2) return BLOCK.SLATE;
        }
        return BLOCK.STONE;
    }

    if (biome === BIOME.DESERT) {
        if (y >= h - 4) {
            const surfacePick = hash2D(x, z, 718) % 5;
            if (surfacePick === 0) return BLOCK.TERRACOTTA;
            return BLOCK.SAND;
        }

        if (y >= h - 9) {
            return BLOCK.TERRACOTTA;
        }

        if (column.rockiness > 0.58 && y >= SEA_LEVEL - 6) {
            return BLOCK.VOLCANIC_STONE;
        }
        return BLOCK.STONE;
    }

    if (biome === BIOME.CORDILLERA) {
        if (y >= h - 3) {
            if (column.snowMask > 0.5 || h >= SEA_LEVEL + 72) {
                return BLOCK.SNOW;
            }
            return BLOCK.GRAVEL;
        }

        if (column.rockiness > 0.58 && y >= SEA_LEVEL - 4) {
            const coldRock = hash2D(x, z, 719) % 6;
            if (coldRock === 0) return BLOCK.VOLCANIC_STONE;
            if (coldRock <= 2) return BLOCK.SLATE;
            if (coldRock === 3) return BLOCK.BASALT;
        }
        return BLOCK.STONE;
    }

    if (biome === BIOME.VOLCANIC) {
        if (y >= h - 2) {
            if ((column.craterMask > 0.54 || column.lavaChannelMask > 0.52) && h >= SEA_LEVEL + 6 && (hash2D(x, z, 1710) % 3 === 0)) {
                return BLOCK.LAVA;
            }
            const volcanicSurface = hash2D(x, z, 1711) % 8;
            if (volcanicSurface <= 1) return BLOCK.ASH;
            if (volcanicSurface === 2) return BLOCK.OBSIDIAN;
            return BLOCK.VOLCANIC_STONE;
        }
        if (y >= h - 8) {
            if ((column.craterMask > 0.58 || column.lavaChannelMask > 0.55) && y >= h - 6 && (hash2D(x, z, 1713) % 5 === 0)) {
                return BLOCK.LAVA;
            }
            const volcanicDeep = hash2D(x, z, 1712) % 7;
            if (volcanicDeep <= 1) return BLOCK.OBSIDIAN;
            if (volcanicDeep <= 3) return BLOCK.BASALT;
            return BLOCK.VOLCANIC_STONE;
        }
        if (column.rockiness > 0.64 && y >= SEA_LEVEL - 18) {
            return BLOCK.BASALT;
        }
        return BLOCK.STONE;
    }

    if (h <= SEA_LEVEL + 2 && y >= h - 3) {
        if (column.lakeMask > 0.22 || column.riverMask > 0.2) {
            return BLOCK.MUD;
        }
        return BLOCK.SAND;
    }

    if (y >= h - 2) {
        if (column.rockiness > 0.72 && h >= SEA_LEVEL + 26) {
            return BLOCK.GRAVEL;
        }
        if (biome === BIOME.FOREST && column.moisture > 0.24 && column.riverMask > 0.18) {
            return BLOCK.MUD;
        }
        return BLOCK.DIRT;
    }

    if (column.rockiness > 0.78 && y >= SEA_LEVEL + 12) {
        const deepRock = hash2D(x, z, 720) % 6;
        if (deepRock === 0) {
            return BLOCK.SLATE;
        }
        if (deepRock === 1) {
            return BLOCK.BASALT;
        }
        if (deepRock === 2) {
            return BLOCK.VOLCANIC_STONE;
        }
    }

    return BLOCK.STONE;
}

function getBlock(x, y, z) {
    if (editedBlocks.size === 0) {
        return getProceduralBlock(x, y, z);
    }

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
        removeEditedBlockFromColumnIndex(x, y, z);
    } else {
        editedBlocks.set(key, id);
        addEditedBlockToColumnIndex(x, y, z);
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
    for (let index = 0; index < BLOCK_FACE_NEIGHBOR_OFFSETS.length; index += 1) {
        const offset = BLOCK_FACE_NEIGHBOR_OFFSETS[index];
        const neighborId = getBlock(x + offset[0], y + offset[1], z + offset[2]);
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
    const floraIndex = decorativeFloraMeshes.indexOf(mesh);
    if (floraIndex >= 0) {
        decorativeFloraMeshes.splice(floraIndex, 1);
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

    const isFlatArray = typeof positions[0] === "number";
    const count = isFlatArray ? Math.floor(positions.length / 3) : positions.length;
    if (count <= 0) {
        return null;
    }

    for (let index = 0; index < count; index += 1) {
        let x;
        let y;
        let z;
        if (isFlatArray) {
            const base = index * 3;
            x = positions[base];
            y = positions[base + 1];
            z = positions[base + 2];
        } else {
            const position = positions[index];
            x = position.x;
            y = position.y;
            z = position.z;
        }

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

function buildChunkColumnMeshYRanges(baseX, baseZ) {
    const padding = 3;
    const windowSize = 7;
    const extendedSize = CHUNK_SIZE + padding * 2;
    const extendedTotal = extendedSize * extendedSize;
    const hasEditedColumns = editedColumnYIndex.size > 0;
    const terrainHeights = new Int16Array(extendedTotal);
    const vegetationTops = new Int16Array(extendedTotal);
    let editedMins = null;
    let editedMaxs = null;

    if (hasEditedColumns) {
        editedMins = new Int16Array(extendedTotal);
        editedMaxs = new Int16Array(extendedTotal);
        editedMins.fill(WORLD_MAX_Y);
        editedMaxs.fill(-1);
    }

    for (let ez = 0; ez < extendedSize; ez += 1) {
        for (let ex = 0; ex < extendedSize; ex += 1) {
            const x = baseX + ex - padding;
            const z = baseZ + ez - padding;
            const index = ez * extendedSize + ex;
            const column = getColumnInfo(x, z);
            const terrainHeight = clampInt(column.height, 0, WORLD_MAX_Y - 1);
            let vegetationTop = terrainHeight + 3;
            if (column.hasTree) {
                vegetationTop = Math.max(vegetationTop, terrainHeight + (Number(column.treeHeight) || 0) + 7);
            }
            if (column.floraType && column.floraType !== "none") {
                vegetationTop = Math.max(vegetationTop, terrainHeight + (Number(column.floraHeight) || 1) + 3);
            }

            terrainHeights[index] = terrainHeight;
            vegetationTops[index] = clampInt(vegetationTop, 0, WORLD_MAX_Y - 1);

            if (hasEditedColumns) {
                const editedRange = getEditedColumnRange(x, z);
                if (editedRange) {
                    editedMins[index] = clampInt(editedRange.minY, 0, WORLD_MAX_Y - 1);
                    editedMaxs[index] = clampInt(editedRange.maxY, 0, WORLD_MAX_Y - 1);
                }
            }
        }
    }

    const columnCount = CHUNK_SIZE * CHUNK_SIZE;
    const minYByColumn = new Int16Array(columnCount);
    const maxYByColumn = new Int16Array(columnCount);

    for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
            const centerX = lx + padding;
            const centerZ = lz + padding;
            const centerIndex = centerZ * extendedSize + centerX;
            let minTerrain = terrainHeights[centerIndex];
            let maxTerrain = terrainHeights[centerIndex];
            let maxVegetationTop = vegetationTops[centerIndex];
            let minEdited = WORLD_MAX_Y;
            let maxEdited = -1;

            for (let wz = 0; wz < windowSize; wz += 1) {
                const rowBase = (centerZ + wz - padding) * extendedSize + (centerX - padding);
                for (let wx = 0; wx < windowSize; wx += 1) {
                    const index = rowBase + wx;
                    const terrainHeight = terrainHeights[index];
                    if (terrainHeight < minTerrain) minTerrain = terrainHeight;
                    if (terrainHeight > maxTerrain) maxTerrain = terrainHeight;

                    const vegetationTop = vegetationTops[index];
                    if (vegetationTop > maxVegetationTop) {
                        maxVegetationTop = vegetationTop;
                    }

                    if (hasEditedColumns && editedMaxs[index] >= 0) {
                        minEdited = Math.min(minEdited, editedMins[index] - 2);
                        maxEdited = Math.max(maxEdited, editedMaxs[index] + 2);
                    }
                }
            }

            let minY = Math.max(0, minTerrain - 4);
            let maxY = Math.min(
                WORLD_MAX_Y - 1,
                Math.max(
                    maxTerrain + 6,
                    SEA_LEVEL + 2,
                    maxVegetationTop
                )
            );

            if (maxEdited >= 0) {
                minY = Math.min(minY, minEdited);
                maxY = Math.max(maxY, maxEdited);
            }

            minY = clampInt(minY, 0, WORLD_MAX_Y - 1);
            maxY = clampInt(maxY, 0, WORLD_MAX_Y - 1);
            if (maxY < minY) {
                maxY = minY;
            }

            const outIndex = lz * CHUNK_SIZE + lx;
            minYByColumn[outIndex] = minY;
            maxYByColumn[outIndex] = maxY;
        }
    }

    return { minYByColumn, maxYByColumn };
}

function pushFloraDecorInstance(instancesByColor, colorHex, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const key = Number(colorHex) >>> 0;
    let instances = instancesByColor.get(key);
    if (!instances) {
        instances = [];
        instancesByColor.set(key, instances);
    }
    instances.push(x, y, z, sx, sy, sz, rx, ry, rz);
}

function emitFloraDecorForColumn(instancesByColor, x, z, column, grassDensityScale = 1) {
    const floraType = String(column?.floraType || "none");
    const groundY = Number(column?.height);
    if (!Number.isFinite(groundY)) {
        return;
    }
    const columnKey = blockColumnKey(x, z);
    if (removedDecorativeFloraColumns.has(columnKey) || editedColumnYIndex.has(columnKey)) {
        return;
    }

    const groundBlockY = clampInt(Math.floor(groundY), 0, WORLD_MAX_Y - 2);
    if (getBlock(x, groundBlockY + 1, z) !== BLOCK.AIR) {
        return;
    }

    const biome = String(column?.biome || BIOME.PLAINS);
    const groundBlockId = getBlock(x, groundBlockY, z);
    const rootX = x + 0.5;
    const rootY = groundY + 0.02;
    const rootZ = z + 0.5;

    const canEmitGrass = (
        grassDensityScale > 0.01
        && groundBlockId === BLOCK.GRASS
        && biome !== BIOME.DESERT
        && biome !== BIOME.MARITIME
        && biome !== BIOME.LAKE
        && biome !== BIOME.VOLCANIC
    );
    if (canEmitGrass) {
        const moisture01 = clamp01((Number(column?.moisture) || 0) * 0.5 + 0.5);
        const temperature01 = clamp01((Number(column?.temperature) || 0) * 0.5 + 0.5);
        let biomeBias = 0;
        if (biome === BIOME.FOREST) biomeBias = 0.2;
        else if (biome === BIOME.PLAINS || biome === BIOME.SPAWN_VALLEY) biomeBias = 0.15;
        else if (biome === BIOME.COAST) biomeBias = 0.1;
        else if (biome === BIOME.CORDILLERA) biomeBias = 0.06;

        let grassDensity = 0.12 + moisture01 * 0.28 + temperature01 * 0.08 + biomeBias;
        if (floraType !== "none") {
            grassDensity -= 0.08;
        }
        grassDensity = clamp01(grassDensity) * THREE.MathUtils.clamp(Number(grassDensityScale) || 0, 0, 1);

        if (hashUnit(x, z, 1880) < grassDensity) {
            const tuftScale = 0.72 + hashUnit(x, z, 1881) * 0.94;
            const tallFactor = hashUnit(x, z, 1882) > 0.78 ? 1.26 : 1;
            const bladeCount = 4 + (hash2D(x, z, 1883) % 3);
            const grassPalette = [FLORA_DECOR_COLORS.grassDark, FLORA_DECOR_COLORS.grassMid, FLORA_DECOR_COLORS.grassBright];

            for (let i = 0; i < bladeCount; i += 1) {
                const angle = (i / bladeCount) * Math.PI * 2 + (hashUnit(x, z, 1890 + i) - 0.5) * 0.42;
                const spread = 0.035 + hashUnit(x, z, 1910 + i) * 0.07;
                const bladeHeight = (0.3 + hashUnit(x, z, 1930 + i) * 0.62) * tuftScale * tallFactor;
                const bladeWidth = 0.032 + hashUnit(x, z, 1950 + i) * 0.028;
                const bladeDepth = 0.085 + hashUnit(x, z, 1970 + i) * 0.11;
                const tiltX = (hashUnit(x, z, 1990 + i) - 0.5) * 0.24;
                const tiltZ = (hashUnit(x, z, 2010 + i) - 0.5) * 0.24;
                const grassColor = grassPalette[hash2D(x + i * 3, z - i * 5, 2030) % grassPalette.length];

                pushFloraDecorInstance(
                    instancesByColor,
                    grassColor,
                    rootX + Math.cos(angle) * spread,
                    rootY + bladeHeight * 0.5,
                    rootZ + Math.sin(angle) * spread,
                    bladeWidth,
                    bladeHeight,
                    bladeDepth,
                    tiltX,
                    angle,
                    tiltZ
                );
            }
        }
    }

    if (floraType === "none") {
        return;
    }

    const floraHeight = clampInt(Number(column?.floraHeight) || 1, 1, 3);
    const scale = 0.82 + hashUnit(x, z, 1821) * 0.62;
    const yawJitter = (hashUnit(x, z, 1822) - 0.5) * 0.46;
    const blossomPalette = [
        FLORA_DECOR_COLORS.petalBlue,
        FLORA_DECOR_COLORS.petalPink,
        FLORA_DECOR_COLORS.petalRed,
        FLORA_DECOR_COLORS.petalYellow,
        FLORA_DECOR_COLORS.petalWhite
    ];
    const blossomColor = blossomPalette[hash2D(x, z, 1823) % blossomPalette.length];

    const pushPart = (colorHex, sizeX, sizeY, sizeZ, offsetX, offsetY, offsetZ, rotationY = 0, rotationX = 0, rotationZ = 0) => {
        pushFloraDecorInstance(
            instancesByColor,
            colorHex,
            rootX + offsetX * scale,
            rootY + offsetY * scale,
            rootZ + offsetZ * scale,
            Math.max(0.02, sizeX * scale),
            Math.max(0.02, sizeY * scale),
            Math.max(0.02, sizeZ * scale),
            rotationX,
            rotationY + yawJitter,
            rotationZ
        );
    };

    if (floraType === "dry_shrub") {
        const trunkHeight = 0.5 + floraHeight * 0.2;
        pushPart(FLORA_DECOR_COLORS.dryStem, 0.11, trunkHeight, 0.11, 0, trunkHeight * 0.5, 0, 0);
        pushPart(FLORA_DECOR_COLORS.dryStem, 0.08, 0.26, 0.08, 0, trunkHeight + 0.12, 0, 0);
        for (let i = 0; i < 4; i += 1) {
            const angle = i * (Math.PI * 0.5) + (hashUnit(x, z, 1830 + i) - 0.5) * 0.36;
            const branchLen = 0.54 + (hashUnit(x, z, 1840 + i) - 0.5) * 0.16;
            pushPart(
                FLORA_DECOR_COLORS.dryLeaf,
                0.08,
                0.11,
                branchLen,
                Math.cos(angle) * 0.14,
                trunkHeight * 0.58 + (i % 2) * 0.05,
                Math.sin(angle) * 0.14,
                angle
            );
        }
        return;
    }

    if (floraType === "cold_shrub") {
        const trunkHeight = 0.58 + floraHeight * 0.16;
        pushPart(FLORA_DECOR_COLORS.stemDark, 0.1, trunkHeight, 0.1, 0, trunkHeight * 0.5, 0, 0);
        const leafHeight = 0.46 + floraHeight * 0.1;
        for (const angle of [0, Math.PI * 0.5, Math.PI * 0.25, -Math.PI * 0.25]) {
            pushPart(FLORA_DECOR_COLORS.leafCold, 0.08, leafHeight, 0.84, 0, 0.36 + floraHeight * 0.06, 0, angle);
        }
        for (let i = 0; i < 3; i += 1) {
            const angle = i * ((Math.PI * 2) / 3) + 0.35;
            pushPart(
                FLORA_DECOR_COLORS.petalWhite,
                0.18,
                0.16,
                0.18,
                Math.cos(angle) * 0.13,
                trunkHeight + 0.18,
                Math.sin(angle) * 0.13,
                angle
            );
        }
        pushPart(FLORA_DECOR_COLORS.petalPink, 0.18, 0.18, 0.18, 0, trunkHeight + 0.26, 0, 0);
        return;
    }

    if (floraType === "coastal_bush") {
        const trunkHeight = 0.64 + floraHeight * 0.22;
        pushPart(FLORA_DECOR_COLORS.stemFresh, 0.1, trunkHeight, 0.1, 0, trunkHeight * 0.5, 0, 0);
        for (let i = 0; i < 5; i += 1) {
            const angle = i * ((Math.PI * 2) / 5);
            const radius = 0.12 + (i % 2) * 0.05;
            pushPart(
                FLORA_DECOR_COLORS.leafCoastal,
                0.08,
                0.78 + (i % 2) * 0.14,
                0.74,
                Math.cos(angle) * radius,
                trunkHeight * 0.58,
                Math.sin(angle) * radius,
                angle
            );
        }
        if (hashUnit(x, z, 1857) > 0.55) {
            pushPart(blossomColor, 0.2, 0.22, 0.2, 0, trunkHeight + 0.22, 0, 0);
        }
        return;
    }

    if (floraType === "berry_shrub") {
        const trunkHeight = 0.52 + floraHeight * 0.2;
        pushPart(FLORA_DECOR_COLORS.stemDark, 0.1, trunkHeight, 0.1, 0, trunkHeight * 0.5, 0, 0);
        for (const angle of [0, Math.PI * 0.5, Math.PI * 0.25, -Math.PI * 0.25]) {
            pushPart(FLORA_DECOR_COLORS.leafSoft, 0.09, 0.68, 0.86, 0, 0.38 + floraHeight * 0.06, 0, angle);
        }
        for (let i = 0; i < 4; i += 1) {
            const angle = i * (Math.PI * 0.5) + 0.22;
            pushPart(
                FLORA_DECOR_COLORS.berry,
                0.16,
                0.14,
                0.16,
                Math.cos(angle) * 0.22,
                0.46 + (i % 2) * 0.08,
                Math.sin(angle) * 0.22,
                angle
            );
        }
        pushPart(blossomColor, 0.18, 0.18, 0.18, 0, trunkHeight + 0.18, 0, 0);
        return;
    }

    const trunkHeight = 0.54 + floraHeight * 0.18;
    pushPart(FLORA_DECOR_COLORS.stemDark, 0.1, trunkHeight, 0.1, 0, trunkHeight * 0.5, 0, 0);
    for (const angle of [0, Math.PI * 0.5, Math.PI * 0.25, -Math.PI * 0.25]) {
        pushPart(FLORA_DECOR_COLORS.leafDense, 0.08, 0.66, 0.84, 0, 0.34 + floraHeight * 0.08, 0, angle);
    }
    if (hashUnit(x, z, 1860) > 0.4) {
        for (let i = 0; i < 3; i += 1) {
            const angle = i * ((Math.PI * 2) / 3) + 0.18;
            pushPart(
                blossomColor,
                0.2,
                0.18,
                0.2,
                Math.cos(angle) * 0.11,
                trunkHeight + 0.18,
                Math.sin(angle) * 0.11,
                angle
            );
        }
    } else {
        pushPart(FLORA_DECOR_COLORS.leafSoft, 0.24, 0.14, 0.24, 0, trunkHeight + 0.16, 0, 0);
    }
}

function addChunkDecorativeFloraMeshes(chunk, baseX, baseZ) {
    if (!chunk) {
        return;
    }

    const playerChunkX = worldToChunkCoord(state.playerPosition.x);
    const playerChunkZ = worldToChunkCoord(state.playerPosition.z);
    const chunkDistance = Math.max(Math.abs(chunk.cx - playerChunkX), Math.abs(chunk.cz - playerChunkZ));
    let grassDensityScale = 1;
    if (chunkDistance > 10) {
        grassDensityScale = 0;
    } else if (chunkDistance > 8) {
        grassDensityScale = 0.35;
    } else if (chunkDistance > 6) {
        grassDensityScale = 0.62;
    }

    const instancesByColor = new Map();
    for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
            const x = baseX + lx;
            const z = baseZ + lz;
            const column = getColumnInfo(x, z);
            emitFloraDecorForColumn(instancesByColor, x, z, column, grassDensityScale);
        }
    }

    if (instancesByColor.size === 0) {
        return;
    }

    const matrix = chunkBuildMatrixScratch;
    instancesByColor.forEach((instances, colorHex) => {
        const count = Math.floor(instances.length / 9);
        if (count <= 0) {
            return;
        }

        const material = getDetailMaterial(colorHex);
        const mesh = new THREE.InstancedMesh(detailUnitGeometry, material, count);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = 2;
        mesh.userData.lookupKeys = [];
        mesh.userData.isDecorativeFlora = true;

        for (let index = 0; index < count; index += 1) {
            const base = index * 9;
            floraInstancePositionScratch.set(
                instances[base],
                instances[base + 1],
                instances[base + 2]
            );
            floraInstanceScaleScratch.set(
                instances[base + 3],
                instances[base + 4],
                instances[base + 5]
            );
            floraInstanceEulerScratch.set(
                instances[base + 6],
                instances[base + 7],
                instances[base + 8]
            );
            floraInstanceQuaternionScratch.setFromEuler(floraInstanceEulerScratch);
            matrix.compose(
                floraInstancePositionScratch,
                floraInstanceQuaternionScratch,
                floraInstanceScaleScratch
            );
            mesh.setMatrixAt(index, matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
        worldRoot.add(mesh);
        decorativeFloraMeshes.push(mesh);
        chunk.meshes.push(mesh);
    });
}

function addChunkInstancedMeshesFromPositions(chunk, positionsByBlock, options = {}) {
    if (!chunk || !(positionsByBlock instanceof Map)) {
        return;
    }
    const enableLookup = options.enableLookup !== false;
    const useLiquidSurfaceMesh = options.useLiquidSurfaceMesh !== false;
    const allowShadows = options.allowShadows !== false;
    const instanceScale = THREE.MathUtils.clamp(Number(options.instanceScale) || 1, 1, CHUNK_SIZE);
    const matrix = chunkBuildMatrixScratch;

    positionsByBlock.forEach((positions, id) => {
        const material = blockMaterials[id];
        const instanceCount = Math.floor(positions.length / 3);
        if (!material || instanceCount <= 0) {
            return;
        }

        if (useLiquidSurfaceMesh && LIQUID_BLOCK_IDS.has(id)) {
            const liquidMesh = buildLiquidChunkMesh(id, positions);
            if (!liquidMesh) {
                return;
            }
            worldRoot.add(liquidMesh);
            blockMeshes.push(liquidMesh);
            chunk.meshes.push(liquidMesh);
            return;
        }

        const mesh = new THREE.InstancedMesh(blockGeometry, material, instanceCount);
        const transparentBlock = isTranslucentBlock(id);
        const definition = getBlockDefinitionById(id);
        const isFoliage = Boolean(definition?.tags?.includes("foliage"));
        const renderOrder = Number(definition?.visual?.renderOrder ?? (transparentBlock ? 2 : 1));
        mesh.castShadow = allowShadows && !transparentBlock && !isFoliage;
        mesh.receiveShadow = allowShadows && !LIQUID_BLOCK_IDS.has(id) && !isFoliage;
        mesh.renderOrder = renderOrder;
        mesh.userData.blockId = id;
        mesh.userData.lookupKeys = [];

        for (let index = 0; index < instanceCount; index += 1) {
            const base = index * 3;
            const x = positions[base];
            const y = positions[base + 1];
            const z = positions[base + 2];
            if (instanceScale > 1.001) {
                matrix.makeScale(instanceScale, 1, instanceScale);
                matrix.setPosition(
                    x + instanceScale * 0.5,
                    y + 0.5,
                    z + instanceScale * 0.5
                );
            } else {
                matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
            }
            mesh.setMatrixAt(index, matrix);

            if (enableLookup) {
                const lookupKey = `${mesh.id}:${index}`;
                blockPositionLookup.set(lookupKey, { x, y, z, id });
                mesh.userData.lookupKeys.push(lookupKey);
            }
        }

        mesh.instanceMatrix.needsUpdate = true;
        worldRoot.add(mesh);
        blockMeshes.push(mesh);
        chunk.meshes.push(mesh);
    });
}

function rebuildChunkMeshFull(chunk) {
    const positionsByBlock = new Map();
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;
    const columnYRanges = buildChunkColumnMeshYRanges(baseX, baseZ);
    const minYByColumn = columnYRanges.minYByColumn;
    const maxYByColumn = columnYRanges.maxYByColumn;

    for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
            const x = baseX + lx;
            const z = baseZ + lz;
            const columnIndex = lz * CHUNK_SIZE + lx;
            const minY = minYByColumn[columnIndex];
            const maxY = maxYByColumn[columnIndex];

            for (let y = minY; y <= maxY; y += 1) {
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

                positions.push(x, y, z);
            }
        }
    }

    addChunkInstancedMeshesFromPositions(chunk, positionsByBlock, {
        enableLookup: true,
        useLiquidSurfaceMesh: true,
        allowShadows: true
    });
    addChunkDecorativeFloraMeshes(chunk, baseX, baseZ);
}

function rebuildChunkMeshFar(chunk, sampleStep = 2) {
    const columnsByBlock = new Map();
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;
    const step = sampleStep >= 4 ? 4 : 2;
    const matrix = chunkBuildMatrixScratch;

    for (let lx = 0; lx < CHUNK_SIZE; lx += step) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += step) {
            const x = baseX + lx;
            const z = baseZ + lz;
            let bestY = -1;
            let bestBlockId = BLOCK.AIR;
            const cellMaxX = Math.min(CHUNK_SIZE, lx + step);
            const cellMaxZ = Math.min(CHUNK_SIZE, lz + step);

            for (let ox = lx; ox < cellMaxX; ox += 1) {
                for (let oz = lz; oz < cellMaxZ; oz += 1) {
                    const sampleX = baseX + ox;
                    const sampleZ = baseZ + oz;
                    const column = getColumnInfo(sampleX, sampleZ);
                    let sampleY = clampInt(column.height, 0, WORLD_MAX_Y - 1);
                    let sampleId = getBlock(sampleX, sampleY, sampleZ);

                    if (sampleY < SEA_LEVEL) {
                        const waterId = getBlock(sampleX, SEA_LEVEL, sampleZ);
                        if (LIQUID_BLOCK_IDS.has(waterId)) {
                            sampleY = SEA_LEVEL;
                            sampleId = waterId;
                        }
                    }

                    if (sampleId === BLOCK.AIR) {
                        continue;
                    }

                    if (sampleY > bestY) {
                        bestY = sampleY;
                        bestBlockId = sampleId;
                    }
                }
            }

            if (bestBlockId === BLOCK.AIR || bestY < 0) {
                continue;
            }

            let baseY = 0;
            let columnHeight = Math.max(1, bestY + 1);
            if (LIQUID_BLOCK_IDS.has(bestBlockId)) {
                // Far liquids are rendered as thin surface tiles to avoid giant water columns.
                baseY = bestY;
                columnHeight = 1;
            }

            let columns = columnsByBlock.get(bestBlockId);
            if (!columns) {
                columns = [];
                columnsByBlock.set(bestBlockId, columns);
            }
            columns.push(x, baseY, z, columnHeight);
        }
    }

    columnsByBlock.forEach((columns, id) => {
        const material = blockMaterials[id];
        const instanceCount = Math.floor(columns.length / 4);
        if (!material || instanceCount <= 0) {
            return;
        }

        const mesh = new THREE.InstancedMesh(blockGeometry, material, instanceCount);
        const transparentBlock = isTranslucentBlock(id);
        const definition = getBlockDefinitionById(id);
        const isFoliage = Boolean(definition?.tags?.includes("foliage"));
        const renderOrder = Number(definition?.visual?.renderOrder ?? (transparentBlock ? 2 : 1));
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = renderOrder;
        mesh.userData.blockId = id;
        mesh.userData.lookupKeys = [];

        for (let index = 0; index < instanceCount; index += 1) {
            const base = index * 4;
            const x = columns[base];
            const baseY = columns[base + 1];
            const z = columns[base + 2];
            const columnHeight = columns[base + 3];

            matrix.makeScale(step, columnHeight, step);
            matrix.setPosition(
                x + step * 0.5,
                baseY + columnHeight * 0.5,
                z + step * 0.5
            );
            mesh.setMatrixAt(index, matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
        worldRoot.add(mesh);
        blockMeshes.push(mesh);
        chunk.meshes.push(mesh);
    });
}

function rebuildChunkMesh(chunk) {
    if (!chunk) {
        return;
    }

    while (chunk.meshes.length) {
        const mesh = chunk.meshes.pop();
        removeMeshReferences(mesh);
    }

    const desiredLod = chunk.desiredLod === "far4" ? "far4" : chunk.desiredLod === "far2" ? "far2" : "full";
    if (desiredLod === "far4") {
        rebuildChunkMeshFar(chunk, 4);
    } else if (desiredLod === "far2") {
        rebuildChunkMeshFar(chunk, 2);
    } else {
        rebuildChunkMeshFull(chunk);
    }
    chunk.lodLevel = desiredLod;
    chunk.dirty = false;
}

function ensureChunk(cx, cz, desiredLod = "full") {
    const key = chunkKey(cx, cz);
    let chunk = chunkMap.get(key);
    if (chunk) {
        if (chunk.desiredLod !== desiredLod) {
            chunk.desiredLod = desiredLod;
            if (chunk.lodLevel !== desiredLod) {
                chunk.dirty = true;
                chunkRebuildQueue.add(key);
            }
        }
        return chunk;
    }

    chunk = {
        cx,
        cz,
        meshes: [],
        dirty: true,
        desiredLod,
        lodLevel: "none"
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

function getChunkOffsetsForRadius(radius) {
    const clampedRadius = clampInt(radius, CHUNK_RADIUS_MIN, CHUNK_RADIUS_MAX);
    const cached = chunkOffsetsByRadiusCache.get(clampedRadius);
    if (cached) {
        return cached;
    }

    const offsets = [];
    for (let dx = -clampedRadius; dx <= clampedRadius; dx += 1) {
        for (let dz = -clampedRadius; dz <= clampedRadius; dz += 1) {
            offsets.push({ dx, dz, dist: Math.abs(dx) + Math.abs(dz) });
        }
    }
    offsets.sort((a, b) => a.dist - b.dist);
    chunkOffsetsByRadiusCache.set(clampedRadius, offsets);
    return offsets;
}

function getChunkFullDetailRadius() {
    if (state.chunkRadius <= CHUNK_FULL_DETAIL_RADIUS_MAX) {
        return state.chunkRadius;
    }

    let fullRadius = THREE.MathUtils.clamp(
        Math.floor(state.chunkRadius * 0.34),
        CHUNK_FULL_DETAIL_RADIUS_MIN,
        CHUNK_FULL_DETAIL_RADIUS_MAX
    );

    if (perfState.fpsEma < 48 || perfState.frameMsEma > 21) {
        fullRadius = Math.max(CHUNK_FULL_DETAIL_RADIUS_MIN, fullRadius - 2);
    }
    if (state.pendingChunkBuildCount > 3400) {
        fullRadius = Math.max(CHUNK_FULL_DETAIL_RADIUS_MIN, fullRadius - 3);
    } else if (perfState.fpsEma > 58 && state.pendingChunkBuildCount < 850) {
        fullRadius = Math.min(CHUNK_FULL_DETAIL_RADIUS_MAX, fullRadius + 2);
    }

    return Math.min(state.chunkRadius, fullRadius);
}

function resolveChunkDesiredLod(distanceFromCenter) {
    const fullDetailRadius = getChunkFullDetailRadius();
    if (distanceFromCenter <= fullDetailRadius) {
        return "full";
    }

    const far4Start = Math.max(fullDetailRadius + 18, 44);
    if (distanceFromCenter >= far4Start) {
        return "far4";
    }

    return "far2";
}

function updateChunkStreaming(force = false) {
    state.chunkTick = force ? CHUNK_MANAGEMENT_INTERVAL : state.chunkTick;

    if (state.chunkTick < CHUNK_MANAGEMENT_INTERVAL) {
        return;
    }

    state.chunkTick = 0;
    const centerCx = worldToChunkCoord(state.playerPosition.x);
    const centerCz = worldToChunkCoord(state.playerPosition.z);
    const centerUnchanged = centerCx === state.lastChunkCenterCx && centerCz === state.lastChunkCenterCz;
    if (!force && centerUnchanged) {
        state.loadedChunkCount = chunkMap.size;
        state.pendingChunkBuildCount = chunkRebuildQueue.size;
        return;
    }
    state.lastChunkCenterCx = centerCx;
    state.lastChunkCenterCz = centerCz;

    const desired = new Set();
    let chunksChanged = false;
    const orderedOffsets = getChunkOffsetsForRadius(state.chunkRadius);

    for (const offset of orderedOffsets) {
        const cx = centerCx + offset.dx;
        const cz = centerCz + offset.dz;
        const key = chunkKey(cx, cz);
        desired.add(key);
        if (!chunkMap.has(key)) {
            chunksChanged = true;
        }
        const desiredLod = resolveChunkDesiredLod(offset.dist);
        ensureChunk(cx, cz, desiredLod);
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

function popNextChunkRebuildKey(centerCx, centerCz, forwardX, forwardZ) {
    if (chunkRebuildQueue.size >= CHUNK_REBUILD_FIFO_POP_THRESHOLD) {
        let scanned = 0;
        for (const key of chunkRebuildQueue) {
            chunkRebuildQueue.delete(key);
            const chunk = chunkMap.get(key);
            if (chunk && chunk.dirty) {
                return key;
            }
            scanned += 1;
            if (scanned >= CHUNK_REBUILD_FIFO_POP_SCAN_LIMIT) {
                break;
            }
        }
    }

    let bestKey = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const staleKeys = [];

    for (const key of chunkRebuildQueue) {
        const chunk = chunkMap.get(key);
        if (!chunk || !chunk.dirty) {
            staleKeys.push(key);
            continue;
        }

        const dx = chunk.cx - centerCx;
        const dz = chunk.cz - centerCz;
        const distance = Math.abs(dx) + Math.abs(dz);
        const forwardBias = dx * forwardX + dz * forwardZ;
        let score = distance * 8 - forwardBias;
        if (chunk.desiredLod === "full" && chunk.lodLevel !== "full") {
            score -= 1200;
        } else if (chunk.desiredLod === "far2" && chunk.lodLevel === "far4") {
            score -= 280;
        }

        if (score < bestScore) {
            bestScore = score;
            bestKey = key;
        }
    }

    for (const staleKey of staleKeys) {
        chunkRebuildQueue.delete(staleKey);
    }

    if (bestKey !== null) {
        chunkRebuildQueue.delete(bestKey);
    }

    return bestKey;
}

function processChunkRebuildQueue(maxBuilds = CHUNK_REBUILD_BUDGET_PER_FRAME, maxFrameBudgetMs = Number.POSITIVE_INFINITY) {
    const startMs = performance.now();
    const centerCx = worldToChunkCoord(state.playerPosition.x);
    const centerCz = worldToChunkCoord(state.playerPosition.z);
    const forwardLength = Math.hypot(state.lastForward.x, state.lastForward.z);
    const forwardX = forwardLength > 0.0001 ? state.lastForward.x / forwardLength : 0;
    const forwardZ = forwardLength > 0.0001 ? state.lastForward.z / forwardLength : 0;
    let builds = 0;

    while (builds < maxBuilds && chunkRebuildQueue.size > 0) {
        if (builds > 0 && Number.isFinite(maxFrameBudgetMs) && maxFrameBudgetMs > 0) {
            const elapsed = performance.now() - startMs;
            if (elapsed >= maxFrameBudgetMs) {
                break;
            }
        }

        const key = popNextChunkRebuildKey(centerCx, centerCz, forwardX, forwardZ);
        if (key === null) {
            break;
        }

        const chunk = chunkMap.get(key);
        if (!chunk || !chunk.dirty) {
            continue;
        }

        rebuildChunkMesh(chunk);
        builds += 1;
    }

    const elapsedMs = performance.now() - startMs;
    updateChunkBuildMetrics(builds, elapsedMs);
    state.pendingChunkBuildCount = chunkRebuildQueue.size;
}

function setChunkRadius(nextRadius) {
    const clamped = clampInt(nextRadius, CHUNK_RADIUS_MIN, CHUNK_RADIUS_MAX);
    const changed = clamped !== state.chunkRadius;

    state.chunkRadius = clamped;
    syncCameraViewDistanceWithChunkRadius();
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
    removedDecorativeFloraColumns.add(blockColumnKey(x, z));
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
    if (!definition || !definition.solid || definition.liquid) {
        return false;
    }
    if (definition.tags.includes("foliage") || definition.tags.includes("leaves")) {
        return false;
    }
    return true;
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
        const definition = getPropDefinition(placed.propType);
        if (definition && !definition.solid) {
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

function movePlayerWithCollisionSteps(deltaX, deltaY, deltaZ) {
    const totalDistance = Math.hypot(deltaX, deltaY, deltaZ);
    if (!Number.isFinite(totalDistance) || totalDistance <= 1e-8) {
        return;
    }

    const steps = Math.max(1, Math.ceil(totalDistance / 0.28));
    const stepX = deltaX / steps;
    const stepY = deltaY / steps;
    const stepZ = deltaZ / steps;

    for (let i = 0; i < steps; i += 1) {
        if (stepX !== 0) {
            const nx = state.playerPosition.x + stepX;
            if (!collidesAt(nx, state.playerPosition.y, state.playerPosition.z)) {
                state.playerPosition.x = nx;
            }
        }
        if (stepY !== 0) {
            const ny = state.playerPosition.y + stepY;
            if (!collidesAt(state.playerPosition.x, ny, state.playerPosition.z)) {
                state.playerPosition.y = ny;
            }
        }
        if (stepZ !== 0) {
            const nz = state.playerPosition.z + stepZ;
            if (!collidesAt(state.playerPosition.x, state.playerPosition.y, nz)) {
                state.playerPosition.z = nz;
            }
        }
    }
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

function getPoseAnchorFromProp(placed, poseMode) {
    const yaw = Number(placed?.yaw) || 0;
    if (poseMode === "lie") {
        const x = (Number(placed?.x) || 0) + Math.sin(yaw) * 0.16;
        const z = (Number(placed?.z) || 0) + Math.cos(yaw) * 0.16;
        const y = (Number(placed?.y) || 0) + 1.12;
        return { x, y, z, eyeY: y + 0.46 };
    }

    const x = Number(placed?.x) || 0;
    const z = Number(placed?.z) || 0;
    const y = (Number(placed?.y) || 0) + 0.34;
    return { x, y, z, eyeY: y + 1.06 };
}

function findSafeExitPositionFromPose(placed, poseMode = "") {
    if (!placed) {
        return null;
    }

    const yaw = Number(placed.yaw) || 0;
    const extents = getRotatedPropHalfExtents(placed.propType, yaw);
    const baseRadius = Math.max(extents.x, extents.z) + PLAYER_RADIUS + (poseMode === "lie" ? 0.45 : 0.28);
    const angles = [
        yaw,
        yaw + Math.PI,
        yaw + Math.PI * 0.5,
        yaw - Math.PI * 0.5,
        yaw + Math.PI * 0.25,
        yaw - Math.PI * 0.25,
        yaw + Math.PI * 0.75,
        yaw - Math.PI * 0.75
    ];

    const groundY = Math.max(0.01, (Number(placed.y) || 0) + 0.02);
    for (let ring = 0; ring < 5; ring += 1) {
        const radius = baseRadius + ring * 0.38;
        for (const angle of angles) {
            const candidateX = (Number(placed.x) || 0) + Math.sin(angle) * radius;
            const candidateZ = (Number(placed.z) || 0) + Math.cos(angle) * radius;
            for (let yStep = 0; yStep < 5; yStep += 1) {
                const candidateY = groundY + yStep * 0.2;
                if (!collidesAt(candidateX, candidateY, candidateZ)) {
                    return { x: candidateX, y: candidateY, z: candidateZ };
                }
            }
        }
    }

    return null;
}

function updateLocalPoseLock() {
    const pose = interactionState.pose;
    if (!pose) {
        return false;
    }

    const poseMode = normalizePoseMode(pose.mode);
    const placed = placedProps.get(String(pose.propId || ""));
    if (!poseMode || !placed) {
        clearLocalPoseActivity(true);
        return false;
    }

    const anchor = getPoseAnchorFromProp(placed, poseMode);
    state.playerPosition.x = anchor.x;
    state.playerPosition.y = anchor.y;
    state.playerPosition.z = anchor.z;
    state.velocityY = 0;
    state.onGround = true;

    controls.getObject().position.set(anchor.x, anchor.eyeY, anchor.z);
    return true;
}

function updatePlayer(deltaSeconds) {
    if (interactionState.pose) {
        updateLocalPoseLock();
        return;
    }

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

    if (state.flightEnabled) {
        const flightForward = cameraForwardScratch;
        camera.getWorldDirection(flightForward);
        if (flightForward.lengthSq() < 1e-8) {
            flightForward.set(0, 0, -1);
        } else {
            flightForward.normalize();
        }

        const flightRight = cameraRightScratch;
        flightRight.crossVectors(flightForward, worldUpVector);
        if (flightRight.lengthSq() < 1e-8) {
            flightRight.set(1, 0, 0);
        } else {
            flightRight.normalize();
        }

        let moveForward = 0;
        let moveRight = 0;
        if (state.keyDown.has("KeyW")) moveForward += 1;
        if (state.keyDown.has("KeyS")) moveForward -= 1;
        if (state.keyDown.has("KeyD")) moveRight += 1;
        if (state.keyDown.has("KeyA")) moveRight -= 1;

        const flightMoveVector = moveVectorScratch;
        flightMoveVector.set(0, 0, 0);
        if (moveForward !== 0) flightMoveVector.addScaledVector(flightForward, moveForward);
        if (moveRight !== 0) flightMoveVector.addScaledVector(flightRight, moveRight);

        if (flightMoveVector.lengthSq() > 0) {
            const speedBoost = state.keyDown.has("ShiftLeft") ? 1.35 : 1;
            flightMoveVector.normalize().multiplyScalar(FLIGHT_SPEED * speedBoost * deltaSeconds);
            const clampedTargetY = THREE.MathUtils.clamp(
                state.playerPosition.y + flightMoveVector.y,
                0.12,
                WORLD_MAX_Y - PLAYER_HEIGHT - 0.04
            );
            const stepVector = flightStepVectorScratch;
            stepVector.set(
                flightMoveVector.x,
                clampedTargetY - state.playerPosition.y,
                flightMoveVector.z
            );
            movePlayerWithCollisionSteps(stepVector.x, stepVector.y, stepVector.z);
        }

        state.playerPosition.y = THREE.MathUtils.clamp(
            state.playerPosition.y,
            0.12,
            WORLD_MAX_Y - PLAYER_HEIGHT - 0.04
        );
        state.velocityY = 0;
        state.onGround = false;
        controls.getObject().position.set(
            state.playerPosition.x,
            state.playerPosition.y + EYE_HEIGHT,
            state.playerPosition.z
        );
        return;
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

    const fpsLabel = Number.isFinite(perfState.fpsEma) ? perfState.fpsEma.toFixed(1) : "0.0";
    const frameMsLabel = Number.isFinite(perfState.frameMsEma) ? perfState.frameMsEma.toFixed(1) : "0.0";
    const chunkCostLabel = Number.isFinite(perfState.chunkBuildCostEmaMs) ? perfState.chunkBuildCostEmaMs.toFixed(2) : "0.00";
    const chunkInfoText = `Chunks: ${state.chunkRadius} | Cargados: ${state.loadedChunkCount} | Pendientes: ${state.pendingChunkBuildCount} | Edits: ${editedBlocks.size}/${MAX_EDITED_BLOCKS} | Objetos: ${placedProps.size}/${MAX_PLACED_PROPS} | Conejos: ${wildlifeState.rabbits.size} | Peces: ${fishState.fishes.size} | Flores activas: ${floraState.sunflowers.size} | Girasoles (moneda): ${economyState.sunflowers} | FPS: ${fpsLabel} (${frameMsLabel}ms) | Draw: ${formatMetricCompact(perfState.drawCalls)} | Tri: ${formatMetricCompact(perfState.triangles)} | Geo/Tex: ${perfState.geometries}/${perfState.textures} | Chunk ms: ${chunkCostLabel} | ColCache: ${formatMetricCompact(columnCache.size)} | Q: ${perfState.dynamicPixelRatio.toFixed(2)}x`;
    if (chunkInfoText !== uiState.lastChunkInfoText) {
        setChunkInfo(chunkInfoText);
        uiState.lastChunkInfoText = chunkInfoText;
    }
}

function updateSelectedMaterialHud() {
    const item = getSelectedHotbarItem();
    const label = item?.label || "Slot vacio";
    const kindLabel = item
        ? (item.kind === ITEM_KIND.PROP ? "Objeto" : "Material")
        : "Barra";

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
    populateInventoryCategoryQuickFillOptions();

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
    if (state.inventoryOpen && state.mapOpen) {
        setMapOpen(false);
    }
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

    if (!state.avatarPreviewOpen && !state.paused && !state.tutorialVisible && !state.interactionPanelOpen && !isMapBlockingGameplay()) {
        if (crosshairEl) {
            crosshairEl.classList.remove("hidden");
        }

        if (canRelockGameplayControls() && !controls.isLocked) {
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

function canRelockGameplayControls() {
    return (
        state.worldStarted
        && !state.paused
        && !state.tutorialVisible
        && !state.inventoryOpen
        && !state.avatarPreviewOpen
        && !state.interactionPanelOpen
        && !isMapBlockingGameplay()
    );
}

function markInteractionPanelDirty() {
    if (!state.interactionPanelOpen) {
        return;
    }
    interactionState.panelNeedsRender = true;
    interactionState.panelRefreshTick = 0;
}

function clearInteractionPanelState() {
    interactionState.panelPropId = "";
    interactionState.panelMode = "";
    interactionState.panelNeedsRender = false;
    interactionState.panelRefreshTick = 0;
}

function closeInteractionPanel(showFeedback = false, preservePose = false) {
    if (!state.interactionPanelOpen && !interactionState.panelPropId) {
        return;
    }

    const previousPropId = String(interactionState.panelPropId || "");
    state.interactionPanelOpen = false;
    clearInteractionPanelState();
    if (jukeboxState.recordingSession && (!previousPropId || jukeboxState.recordingSession.propId === previousPropId)) {
        stopJukeboxTrackRecording(true);
    }

    if (interactionPanelEl) {
        interactionPanelEl.classList.add("hidden");
    }
    if (interactionPanelBodyEl) {
        interactionPanelBodyEl.innerHTML = "";
    }

    if (interactionState.localUsing && (!previousPropId || interactionState.localUsing.propId === previousPropId)) {
        clearLocalUsingActivity(true);
    }
    if (!preservePose) {
        clearLocalPoseActivity(true);
    }

    if (!state.inventoryOpen && !state.avatarPreviewOpen && !state.paused && !state.tutorialVisible && !isMapBlockingGameplay() && crosshairEl) {
        crosshairEl.classList.remove("hidden");
    }

    if (canRelockGameplayControls() && !controls.isLocked) {
        try {
            controls.lock();
        } catch (error) {
        }
    }

    if (showFeedback) {
        showToast("Interaccion cerrada", "info", 900);
    }
}

function openInteractionPanel(propHit, panelMode, usageKind = "") {
    const propId = String(propHit?.propId || "");
    const placed = propId ? placedProps.get(propId) : null;
    if (!placed) {
        return false;
    }

    if (state.avatarPreviewOpen) {
        setAvatarPreviewOpen(false);
    }
    if (state.mapOpen) {
        setMapOpen(false);
    }
    if (interactionState.pose) {
        clearLocalPoseActivity(true);
    }

    state.interactionPanelOpen = true;
    interactionState.panelPropId = propId;
    interactionState.panelMode = String(panelMode || "");
    interactionState.panelNeedsRender = true;
    interactionState.panelRefreshTick = 0;
    state.keyDown.clear();

    if (usageKind) {
        setLocalUsingActivity(propId, usageKind, true);
    } else {
        clearLocalUsingActivity(true);
    }

    if (interactionPanelTitleEl) {
        interactionPanelTitleEl.textContent = getPropLabel(placed.propType);
    }
    if (interactionPanelHintEl) {
        interactionPanelHintEl.textContent = "E interactuar | Esc cerrar panel";
    }
    if (interactionPanelEl) {
        interactionPanelEl.classList.remove("hidden");
    }
    if (crosshairEl) {
        crosshairEl.classList.add("hidden");
    }

    if (controls.isLocked) {
        try {
            controls.unlock();
        } catch (error) {
        }
    }

    return true;
}

function appendInteractionInfoLine(text) {
    if (!interactionPanelBodyEl) {
        return;
    }
    const line = document.createElement("p");
    line.textContent = text;
    interactionPanelBodyEl.appendChild(line);
}

function appendInteractionAction(label, handler) {
    if (!interactionPanelBodyEl) {
        return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interaction-action";
    button.textContent = label;
    button.addEventListener("click", handler);
    interactionPanelBodyEl.appendChild(button);
}

function resolveDraggedInventoryItemId(event) {
    const droppedId = String(event?.dataTransfer?.getData("text/plain") || draggedInventoryItemId || "").trim();
    if (!droppedId || !INVENTORY_ITEM_BY_ID.has(droppedId)) {
        return "";
    }
    return droppedId;
}

function ensureInteractionAudioContext() {
    let context = interactionState.localAudioContext || null;
    if (!context) {
        try {
            context = new (window.AudioContext || window.webkitAudioContext)();
            interactionState.localAudioContext = context;
        } catch (error) {
            return null;
        }
    }
    return context;
}

function playJukeboxTrackPreview(track = 1) {
    const clampedTrack = THREE.MathUtils.clamp(Math.floor(Number(track) || 1), 1, JUKEBOX_TRACK_COUNT);
    const context = ensureInteractionAudioContext();
    if (!context) {
        return;
    }
    if (context.state === "suspended") {
        context.resume().catch(() => {
        });
    }

    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(190 + clampedTrack * 95, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
}

function ensureJukeboxSpotifyApi() {
    if (jukeboxState.spotifyApi) {
        return Promise.resolve(jukeboxState.spotifyApi);
    }
    if (jukeboxState.spotifyApiPromise) {
        return jukeboxState.spotifyApiPromise;
    }

    jukeboxState.spotifyApiPromise = new Promise((resolve, reject) => {
        const previousReadyHandler = window.onSpotifyIframeApiReady;
        const timeoutId = window.setTimeout(() => {
            reject(new Error("spotify_iframe_timeout"));
        }, 12000);

        window.onSpotifyIframeApiReady = (api) => {
            window.clearTimeout(timeoutId);
            if (typeof previousReadyHandler === "function") {
                try {
                    previousReadyHandler(api);
                } catch (error) {
                }
            }
            jukeboxState.spotifyApi = api || null;
            resolve(jukeboxState.spotifyApi);
        };

        if (!jukeboxState.spotifyApiBootstrapDone) {
            jukeboxState.spotifyApiBootstrapDone = true;
            const script = document.createElement("script");
            script.src = "https://open.spotify.com/embed/iframe-api/v1";
            script.async = true;
            script.onerror = () => {
                window.clearTimeout(timeoutId);
                reject(new Error("spotify_iframe_load_error"));
            };
            document.head.appendChild(script);
        }
    }).catch((error) => {
        jukeboxState.spotifyApiPromise = null;
        return Promise.reject(error);
    });

    return jukeboxState.spotifyApiPromise;
}

function ensureJukeboxYouTubeApi() {
    if (window.YT?.Player) {
        return Promise.resolve(window.YT);
    }
    if (jukeboxState.youtubeApiPromise) {
        return jukeboxState.youtubeApiPromise;
    }

    jukeboxState.youtubeApiPromise = new Promise((resolve, reject) => {
        const previousReadyHandler = window.onYouTubeIframeAPIReady;
        const timeoutId = window.setTimeout(() => {
            reject(new Error("youtube_iframe_timeout"));
        }, 12000);

        window.onYouTubeIframeAPIReady = () => {
            window.clearTimeout(timeoutId);
            if (typeof previousReadyHandler === "function") {
                try {
                    previousReadyHandler();
                } catch (error) {
                }
            }
            if (window.YT?.Player) {
                resolve(window.YT);
            } else {
                reject(new Error("youtube_api_unavailable"));
            }
        };

        const existingScript = document.querySelector("script[data-jukebox-youtube='1']");
        if (!existingScript) {
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.dataset.jukeboxYoutube = "1";
            script.onerror = () => {
                window.clearTimeout(timeoutId);
                reject(new Error("youtube_iframe_load_error"));
            };
            document.head.appendChild(script);
        }
    }).catch((error) => {
        jukeboxState.youtubeApiPromise = null;
        return Promise.reject(error);
    });

    return jukeboxState.youtubeApiPromise;
}

function disposeJukeboxRuntime(runtime) {
    if (!runtime) {
        return;
    }

    runtime.disposed = true;
    if (runtime.timeoutId !== undefined && runtime.timeoutId !== null) {
        window.clearTimeout(runtime.timeoutId);
    }
    if (runtime.oscillator) {
        try {
            runtime.oscillator.stop();
        } catch (error) {
        }
    }
    if (runtime.modulator) {
        try {
            runtime.modulator.stop();
        } catch (error) {
        }
    }
    if (runtime.mediaElement) {
        try {
            runtime.mediaElement.pause();
            runtime.mediaElement.src = "";
        } catch (error) {
        }
    }
    if (runtime.controller?.pause) {
        try {
            runtime.controller.pause();
        } catch (error) {
        }
    }
    if (runtime.controller?.destroy) {
        try {
            runtime.controller.destroy();
        } catch (error) {
        }
    }
    if (runtime.player?.pauseVideo) {
        try {
            runtime.player.pauseVideo();
        } catch (error) {
        }
    }
    if (runtime.player?.stopVideo) {
        try {
            runtime.player.stopVideo();
        } catch (error) {
        }
    }
    if (runtime.player?.destroy) {
        try {
            runtime.player.destroy();
        } catch (error) {
        }
    }
    if (runtime.gainNode) {
        try {
            runtime.gainNode.disconnect();
        } catch (error) {
        }
    }
    if (runtime.sourceNode) {
        try {
            runtime.sourceNode.disconnect();
        } catch (error) {
        }
    }
    if (runtime.modGainNode) {
        try {
            runtime.modGainNode.disconnect();
        } catch (error) {
        }
    }
    if (runtime.hostEl?.parentElement) {
        runtime.hostEl.parentElement.removeChild(runtime.hostEl);
    }
}

function stopJukeboxRuntimeById(propId) {
    const id = String(propId || "");
    if (!id) {
        return;
    }
    const runtime = jukeboxState.activeRuntimes.get(id);
    if (!runtime) {
        return;
    }
    disposeJukeboxRuntime(runtime);
    jukeboxState.activeRuntimes.delete(id);
}

function stopAllJukeboxRuntimes() {
    for (const [propId, runtime] of jukeboxState.activeRuntimes.entries()) {
        disposeJukeboxRuntime(runtime);
        jukeboxState.activeRuntimes.delete(propId);
    }
}

function createJukeboxLocalRuntime(propId, descriptor, track) {
    const context = ensureInteractionAudioContext();
    if (!context) {
        return null;
    }

    const safeTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT);
    if (context.state === "suspended") {
        context.resume().catch(() => {
        });
    }

    const oscillator = context.createOscillator();
    oscillator.type = safeTrack % 2 === 0 ? "triangle" : "sawtooth";
    oscillator.frequency.value = 120 + safeTrack * 70;

    const modulator = context.createOscillator();
    modulator.type = "sine";
    modulator.frequency.value = 0.45 + safeTrack * 0.07;

    const modGainNode = context.createGain();
    modGainNode.gain.value = 6.5 + safeTrack * 0.9;
    modulator.connect(modGainNode);
    modGainNode.connect(oscillator.frequency);

    const gainNode = context.createGain();
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    const now = context.currentTime;
    oscillator.start(now);
    modulator.start(now);

    return {
        propId,
        type: "local",
        sourceKey: descriptor.sourceKey,
        gainNode,
        oscillator,
        modulator,
        modGainNode,
        context,
        playing: true
    };
}

function createJukeboxRecordingRuntime(propId, descriptor) {
    const context = ensureInteractionAudioContext();
    if (!context || !descriptor?.dataUrl) {
        return null;
    }
    if (context.state === "suspended") {
        context.resume().catch(() => {
        });
    }

    const mediaElement = new Audio(descriptor.dataUrl);
    mediaElement.loop = true;
    mediaElement.preload = "auto";
    mediaElement.crossOrigin = "anonymous";

    let sourceNode = null;
    try {
        sourceNode = context.createMediaElementSource(mediaElement);
    } catch (error) {
        return null;
    }

    const gainNode = context.createGain();
    gainNode.gain.value = 0.0001;
    sourceNode.connect(gainNode);
    gainNode.connect(context.destination);

    mediaElement.play().catch(() => {
    });

    return {
        propId,
        type: "recording",
        sourceKey: descriptor.sourceKey,
        gainNode,
        sourceNode,
        mediaElement,
        context,
        playing: true
    };
}

function createJukeboxSpotifyRuntime(propId, descriptor) {
    const hostEl = document.createElement("div");
    hostEl.className = "jukebox-spotify-host";
    hostEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(hostEl);

    const runtime = {
        propId,
        type: "spotify",
        sourceKey: descriptor.sourceKey,
        spotifyUri: descriptor.spotifyUri,
        hostEl,
        controller: null,
        controllerReady: false,
        spotifyPlaying: false,
        playing: true,
        disposed: false
    };

    ensureJukeboxSpotifyApi().then((api) => {
        if (runtime.disposed || !api?.createController) {
            return;
        }
        api.createController(hostEl, { uri: descriptor.spotifyUri, width: 300, height: 80 }, (controller) => {
            if (runtime.disposed) {
                if (controller?.destroy) {
                    try {
                        controller.destroy();
                    } catch (error) {
                    }
                }
                return;
            }
            runtime.controller = controller || null;
            runtime.controllerReady = Boolean(controller);
            if (controller?.loadUri) {
                try {
                    controller.loadUri(descriptor.spotifyUri);
                } catch (error) {
                }
            }
        });
    }).catch(() => {
    });

    return runtime;
}

function createJukeboxYouTubeRuntime(propId, descriptor) {
    const hostEl = document.createElement("div");
    hostEl.className = "jukebox-spotify-host";
    hostEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(hostEl);

    const runtime = {
        propId,
        type: "youtube",
        sourceKey: descriptor.sourceKey,
        youtubeId: descriptor.youtubeId,
        hostEl,
        player: null,
        playerReady: false,
        youtubePlaying: false,
        playing: true,
        pendingVolume: 0,
        pendingShouldPlay: false,
        disposed: false
    };

    ensureJukeboxYouTubeApi().then((YT) => {
        if (runtime.disposed || !YT?.Player) {
            return;
        }

        runtime.player = new YT.Player(hostEl, {
            width: "1",
            height: "1",
            videoId: descriptor.youtubeId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                playsinline: 1,
                rel: 0,
                modestbranding: 1
            },
            events: {
                onReady: () => {
                    if (runtime.disposed || !runtime.player) {
                        return;
                    }
                    runtime.playerReady = true;
                    try {
                        runtime.player.setVolume(Math.round(runtime.pendingVolume));
                    } catch (error) {
                    }
                    if (runtime.pendingShouldPlay) {
                        try {
                            runtime.player.playVideo();
                            runtime.youtubePlaying = true;
                        } catch (error) {
                        }
                    }
                }
            }
        });
    }).catch(() => {
    });

    return runtime;
}

function createJukeboxRuntime(propId, descriptor, track) {
    if (!descriptor) {
        return null;
    }
    if (descriptor.type === "recording") {
        return createJukeboxRecordingRuntime(propId, descriptor);
    }
    if (descriptor.type === "spotify") {
        return createJukeboxSpotifyRuntime(propId, descriptor);
    }
    if (descriptor.type === "youtube") {
        return createJukeboxYouTubeRuntime(propId, descriptor);
    }
    return createJukeboxLocalRuntime(propId, descriptor, track);
}

function getJukeboxSpatialGain(placed) {
    const dx = placed.x - state.playerPosition.x;
    const dy = placed.y - (state.playerPosition.y + 0.3);
    const dz = placed.z - state.playerPosition.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance <= JUKEBOX_SPATIAL_NEAR_DISTANCE) {
        return 0.95;
    }
    if (distance >= JUKEBOX_SPATIAL_MAX_DISTANCE) {
        return 0;
    }
    const normalized = 1 - (distance - JUKEBOX_SPATIAL_NEAR_DISTANCE) / Math.max(0.001, JUKEBOX_SPATIAL_MAX_DISTANCE - JUKEBOX_SPATIAL_NEAR_DISTANCE);
    return normalized * normalized * 0.95;
}

function updateJukeboxSpatialAudio() {
    const jukeboxIds = propTypeIndex.get(PROP_TYPE.JUKEBOX);
    const wantedIds = new Set();
    if (!jukeboxIds || jukeboxIds.size === 0) {
        if (jukeboxState.activeRuntimes.size > 0) {
            stopAllJukeboxRuntimes();
        }
        return;
    }

    for (const propId of jukeboxIds) {
        const placed = placedProps.get(propId);
        if (!placed) {
            continue;
        }

        const safeState = normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {};
        const track = THREE.MathUtils.clamp(sanitizeJukeboxTrack(safeState.track) || 1, 1, JUKEBOX_TRACK_COUNT);
        const playing = Boolean(safeState.playing);
        if (!playing) {
            stopJukeboxRuntimeById(propId);
            continue;
        }

        const descriptor = resolveJukeboxTrackDescriptor(propId, track, safeState.source || JUKEBOX_SOURCE_DEFAULT);
        const runtime = jukeboxState.activeRuntimes.get(propId);
        if (!runtime || runtime.type !== descriptor.type || runtime.sourceKey !== descriptor.sourceKey) {
            stopJukeboxRuntimeById(propId);
            const created = createJukeboxRuntime(propId, descriptor, track);
            if (created) {
                jukeboxState.activeRuntimes.set(propId, created);
            }
        }

        const activeRuntime = jukeboxState.activeRuntimes.get(propId);
        if (!activeRuntime) {
            continue;
        }

        wantedIds.add(propId);
        if (activeRuntime.type === "spotify") {
            const dx = placed.x - state.playerPosition.x;
            const dy = placed.y - state.playerPosition.y;
            const dz = placed.z - state.playerPosition.z;
            const distance = Math.hypot(dx, dy, dz);
            const shouldPlay = distance <= JUKEBOX_SPOTIFY_ACTIVE_DISTANCE;
            if (activeRuntime.controllerReady && activeRuntime.controller) {
                if (activeRuntime.spotifyUri !== descriptor.spotifyUri && activeRuntime.controller.loadUri) {
                    activeRuntime.spotifyUri = descriptor.spotifyUri;
                    try {
                        activeRuntime.controller.loadUri(descriptor.spotifyUri);
                    } catch (error) {
                    }
                }
                if (shouldPlay !== activeRuntime.spotifyPlaying) {
                    activeRuntime.spotifyPlaying = shouldPlay;
                    try {
                        if (shouldPlay && activeRuntime.controller.play) {
                            activeRuntime.controller.play();
                        } else if (!shouldPlay && activeRuntime.controller.pause) {
                            activeRuntime.controller.pause();
                        }
                    } catch (error) {
                    }
                }
            }
            continue;
        }

        if (activeRuntime.type === "youtube") {
            const gain = getJukeboxSpatialGain(placed);
            const shouldPlay = true;
            const targetVolume = Math.round(THREE.MathUtils.clamp(gain * 100, 0, 100));
            activeRuntime.pendingVolume = targetVolume;
            activeRuntime.pendingShouldPlay = shouldPlay;

            if (activeRuntime.playerReady && activeRuntime.player) {
                if (activeRuntime.youtubeId !== descriptor.youtubeId) {
                    activeRuntime.youtubeId = descriptor.youtubeId;
                    if (activeRuntime.player.loadVideoById) {
                        try {
                            activeRuntime.player.loadVideoById(descriptor.youtubeId);
                        } catch (error) {
                        }
                    }
                }

                if (activeRuntime.player.setVolume) {
                    try {
                        activeRuntime.player.setVolume(targetVolume);
                    } catch (error) {
                    }
                }

                if (shouldPlay !== activeRuntime.youtubePlaying) {
                    activeRuntime.youtubePlaying = shouldPlay;
                    try {
                        if (shouldPlay && activeRuntime.player.playVideo) {
                            activeRuntime.player.playVideo();
                        }
                    } catch (error) {
                    }
                }
            }
            continue;
        }

        if (activeRuntime.gainNode && activeRuntime.context) {
            const gain = getJukeboxSpatialGain(placed);
            const now = activeRuntime.context.currentTime;
            activeRuntime.gainNode.gain.setTargetAtTime(Math.max(0.0001, gain), now, JUKEBOX_SPATIAL_GAIN_SMOOTHING);
            if (activeRuntime.mediaElement && gain > 0.012 && activeRuntime.mediaElement.paused) {
                activeRuntime.mediaElement.play().catch(() => {
                });
            }
        }
    }

    for (const activeId of Array.from(jukeboxState.activeRuntimes.keys())) {
        if (!wantedIds.has(activeId)) {
            stopJukeboxRuntimeById(activeId);
        }
    }
}

function getTvSpatialGain(placed) {
    const screenMesh = placed?.node?.userData?.tvScreenMesh || null;
    if (screenMesh) {
        screenMesh.getWorldPosition(tvProjectionCenterScratch);
    } else {
        tvProjectionCenterScratch.set(placed.x, placed.y + 1.06, placed.z);
    }
    const dx = tvProjectionCenterScratch.x - state.playerPosition.x;
    const dy = tvProjectionCenterScratch.y - (state.playerPosition.y + 0.3);
    const dz = tvProjectionCenterScratch.z - state.playerPosition.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance <= TV_SPATIAL_NEAR_DISTANCE) {
        return 0.98;
    }
    if (distance >= TV_SPATIAL_MAX_DISTANCE) {
        return 0;
    }
    const normalized = 1 - (distance - TV_SPATIAL_NEAR_DISTANCE) / Math.max(0.001, TV_SPATIAL_MAX_DISTANCE - TV_SPATIAL_NEAR_DISTANCE);
    return normalized * normalized * 0.98;
}

function computeTvPlaybackStartSeconds(startedAtMs) {
    const safeStartedAt = sanitizeTvPlaybackStartAtMs(startedAtMs, 0);
    if (!safeStartedAt) {
        return 0;
    }
    const ageMs = Date.now() - safeStartedAt;
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > TV_SYNC_MAX_AGE_MS) {
        return 0;
    }
    return Math.max(0, ageMs / 1000);
}

function computeTvPlaybackStartAtMsFromSeconds(seconds) {
    const safeSeconds = sanitizeTvPauseAtSeconds(seconds, 0);
    return sanitizeTvPlaybackStartAtMs(Date.now() - Math.round(safeSeconds * 1000), Date.now());
}

function formatTvTimeLabel(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function readTvRuntimeCurrentSeconds(runtime, fallbackSeconds = 0) {
    const fallback = sanitizeTvPauseAtSeconds(fallbackSeconds, 0);
    if (!runtime?.playerReady || !runtime.player?.getCurrentTime) {
        return fallback;
    }
    try {
        return sanitizeTvPauseAtSeconds(runtime.player.getCurrentTime(), fallback);
    } catch (error) {
        return fallback;
    }
}

function readTvRuntimeDurationSeconds(runtime, fallbackSeconds = 0) {
    const fallback = sanitizeTvPauseAtSeconds(fallbackSeconds, 0);
    if (!runtime?.playerReady || !runtime.player?.getDuration) {
        return fallback;
    }
    try {
        return sanitizeTvPauseAtSeconds(runtime.player.getDuration(), fallback);
    } catch (error) {
        return fallback;
    }
}

function setTvOverlayVisible(runtime, visible) {
    if (!runtime?.overlayEl) {
        return;
    }
    runtime.overlayEl.style.display = visible ? "block" : "none";
}

function resolveTvScreenHalfExtents(screenMesh) {
    const fallbackHalfWidth = Math.abs(Number(TV_SCREEN_LOCAL_CORNERS_FALLBACK[1]?.[0]) || 0.5);
    const fallbackHalfHeight = Math.abs(Number(TV_SCREEN_LOCAL_CORNERS_FALLBACK[2]?.[1]) || 0.5);
    const fallbackHalfDepth = Math.abs(Number(TV_SCREEN_LOCAL_CORNERS_FALLBACK[0]?.[2]) || 0.01);

    if (!screenMesh?.geometry) {
        tvProjectionScreenHalfExtentsScratch.set(fallbackHalfWidth, fallbackHalfHeight, fallbackHalfDepth);
        return tvProjectionScreenHalfExtentsScratch;
    }

    const geometry = screenMesh.geometry;
    if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
    }
    if (!geometry.boundingBox) {
        tvProjectionScreenHalfExtentsScratch.set(fallbackHalfWidth, fallbackHalfHeight, fallbackHalfDepth);
        return tvProjectionScreenHalfExtentsScratch;
    }

    tvProjectionScreenHalfExtentsScratch
        .copy(geometry.boundingBox.max)
        .sub(geometry.boundingBox.min)
        .multiplyScalar(0.5);

    if (
        !Number.isFinite(tvProjectionScreenHalfExtentsScratch.x)
        || !Number.isFinite(tvProjectionScreenHalfExtentsScratch.y)
        || !Number.isFinite(tvProjectionScreenHalfExtentsScratch.z)
    ) {
        tvProjectionScreenHalfExtentsScratch.set(fallbackHalfWidth, fallbackHalfHeight, fallbackHalfDepth);
    }

    return tvProjectionScreenHalfExtentsScratch;
}

function buildTvOcclusionPropCandidates(currentPropId, samplePoints, sampleCount) {
    tvOcclusionPropRaycastCandidates.length = 0;
    if (placedProps.size <= 1 || sampleCount <= 0) {
        return;
    }

    let minX = camera.position.x;
    let maxX = camera.position.x;
    let minY = camera.position.y;
    let maxY = camera.position.y;
    let minZ = camera.position.z;
    let maxZ = camera.position.z;
    for (let i = 0; i < sampleCount; i += 1) {
        const sample = samplePoints[i];
        minX = Math.min(minX, sample.x);
        maxX = Math.max(maxX, sample.x);
        minY = Math.min(minY, sample.y);
        maxY = Math.max(maxY, sample.y);
        minZ = Math.min(minZ, sample.z);
        maxZ = Math.max(maxZ, sample.z);
    }

    const margin = 1.35;
    const nearbyIds = queryNearbyPropIdsReusable(
        minX - margin,
        maxX + margin,
        minY - margin,
        maxY + margin,
        minZ - margin,
        maxZ + margin
    );
    for (const propId of nearbyIds) {
        if (propId === currentPropId) {
            continue;
        }
        const placed = placedProps.get(propId);
        if (!placed?.node || placed.node.visible === false) {
            continue;
        }
        tvOcclusionPropRaycastCandidates.push(placed.node);
    }
}

function isTvOverlayOccluded(placed, samplePoints, sampleCount) {
    if (sampleCount <= 0) {
        return false;
    }
    const currentPropId = String(placed?.id || "");
    buildTvOcclusionPropCandidates(currentPropId, samplePoints, sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
        const target = samplePoints[i];
        tvProjectionOcclusionDirectionScratch.copy(target).sub(camera.position);
        const distanceToTarget = tvProjectionOcclusionDirectionScratch.length();
        if (!Number.isFinite(distanceToTarget) || distanceToTarget <= 0.05) {
            continue;
        }
        tvProjectionOcclusionDirectionScratch.multiplyScalar(1 / distanceToTarget);
        tvOcclusionRaycaster.set(camera.position, tvProjectionOcclusionDirectionScratch);
        tvOcclusionRaycaster.far = Math.max(0.05, distanceToTarget - TV_OVERLAY_OCCLUSION_RAY_BIAS);

        const blockHits = tvOcclusionRaycaster.intersectObjects(blockMeshes, false);
        const nearestBlock = getFirstVisibleRayHit(blockHits);
        if (nearestBlock && nearestBlock.distance < distanceToTarget - TV_OVERLAY_OCCLUSION_RAY_BIAS) {
            const blockId = Number(nearestBlock.object?.userData?.blockId);
            if (!isValidBlockId(blockId) || !isSeeThroughBlock(blockId)) {
                return true;
            }
        }

        if (tvOcclusionPropRaycastCandidates.length > 0) {
            const propHits = tvOcclusionRaycaster.intersectObjects(tvOcclusionPropRaycastCandidates, true);
            const nearestProp = getFirstVisibleRayHit(propHits);
            if (nearestProp && nearestProp.distance < distanceToTarget - TV_OVERLAY_OCCLUSION_RAY_BIAS) {
                return true;
            }
        }
    }
    return false;
}

function updateTvRuntimeOverlayPosition(runtime, placed) {
    const screenMesh = placed?.node?.userData?.tvScreenMesh || null;
    if (!screenMesh || !runtime?.overlayEl) {
        setTvOverlayVisible(runtime, false);
        return;
    }

    screenMesh.getWorldPosition(tvProjectionCenterScratch);
    tvProjectionCameraScratch.copy(tvProjectionCenterScratch).applyMatrix4(camera.matrixWorldInverse);
    if (tvProjectionCameraScratch.z > -0.01) {
        setTvOverlayVisible(runtime, false);
        return;
    }

    screenMesh.getWorldDirection(tvProjectionScreenNormalScratch).normalize();
    tvProjectionToCameraScratch.copy(camera.position).sub(tvProjectionCenterScratch).normalize();
    if (tvProjectionScreenNormalScratch.dot(tvProjectionToCameraScratch) <= TV_OVERLAY_FRONTFACE_DOT_MIN) {
        setTvOverlayVisible(runtime, false);
        return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let allCornersInFront = true;
    const projectedPoints = [];
    const halfExtents = resolveTvScreenHalfExtents(screenMesh);
    const halfWidth = Math.max(0.001, halfExtents.x);
    const halfHeight = Math.max(0.001, halfExtents.y);
    const frontZ = Math.max(0.001, halfExtents.z) + 0.001;

    for (let i = 0; i < 4; i += 1) {
        const cornerWorld = tvProjectionCornerWorldScratch[i];
        if (i === 0) {
            cornerWorld.set(-halfWidth, -halfHeight, frontZ);
        } else if (i === 1) {
            cornerWorld.set(halfWidth, -halfHeight, frontZ);
        } else if (i === 2) {
            cornerWorld.set(halfWidth, halfHeight, frontZ);
        } else {
            cornerWorld.set(-halfWidth, halfHeight, frontZ);
        }
        screenMesh.localToWorld(cornerWorld);

        const cornerCamera = tvProjectionCornerScreenScratch[i];
        cornerCamera.copy(cornerWorld).applyMatrix4(camera.matrixWorldInverse);
        if (cornerCamera.z >= -0.03) {
            allCornersInFront = false;
        }

        cornerCamera.copy(cornerWorld).project(camera);
        const px = (cornerCamera.x * 0.5 + 0.5) * window.innerWidth;
        const py = (-cornerCamera.y * 0.5 + 0.5) * window.innerHeight;
        if (!Number.isFinite(px) || !Number.isFinite(py)) {
            setTvOverlayVisible(runtime, false);
            return;
        }
        projectedPoints.push([px, py]);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
    }

    if (!allCornersInFront) {
        setTvOverlayVisible(runtime, false);
        return;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    if (width < TV_EMBED_MIN_SIZE_PX || height < TV_EMBED_MIN_SIZE_PX) {
        setTvOverlayVisible(runtime, false);
        return;
    }
    if (width > window.innerWidth * 2.6 || height > window.innerHeight * 2.6) {
        setTvOverlayVisible(runtime, false);
        return;
    }
    if (minX < -window.innerWidth * 1.4 || maxX > window.innerWidth * 2.4 || minY < -window.innerHeight * 1.4 || maxY > window.innerHeight * 2.4) {
        setTvOverlayVisible(runtime, false);
        return;
    }

    if (
        maxX < -TV_EMBED_OFFSCREEN_MARGIN_PX
        || minX > window.innerWidth + TV_EMBED_OFFSCREEN_MARGIN_PX
        || maxY < -TV_EMBED_OFFSCREEN_MARGIN_PX
        || minY > window.innerHeight + TV_EMBED_OFFSCREEN_MARGIN_PX
    ) {
        setTvOverlayVisible(runtime, false);
        return;
    }

    const now = performance.now();
    if (TV_OVERLAY_OCCLUSION_ENABLED) {
        if (!Number.isFinite(runtime.nextOcclusionCheckAtMs) || now >= runtime.nextOcclusionCheckAtMs) {
            const occlusionSamples = tvProjectionOcclusionSampleWorldScratch;
            occlusionSamples[0].copy(tvProjectionCenterScratch);
            for (let i = 0; i < 4; i += 1) {
                occlusionSamples[i + 1].copy(tvProjectionCornerWorldScratch[i]);
            }
            runtime.occludedByScene = isTvOverlayOccluded(placed, occlusionSamples, occlusionSamples.length);
            runtime.nextOcclusionCheckAtMs = now + TV_OVERLAY_OCCLUSION_CHECK_INTERVAL_MS;
        }
        if (runtime.occludedByScene) {
            setTvOverlayVisible(runtime, false);
            return;
        }
    } else {
        runtime.occludedByScene = false;
    }

    runtime.overlayEl.style.left = `${minX}px`;
    runtime.overlayEl.style.top = `${minY}px`;
    runtime.overlayEl.style.width = `${width}px`;
    runtime.overlayEl.style.height = `${height}px`;

    const insetXPct = Math.min(8, (TV_EMBED_CLIP_INSET_PX / Math.max(1, width)) * 100);
    const insetYPct = Math.min(8, (TV_EMBED_CLIP_INSET_PX / Math.max(1, height)) * 100);
    const centroidX = projectedPoints.reduce((sum, point) => sum + point[0], 0) / Math.max(1, projectedPoints.length);
    const centroidY = projectedPoints.reduce((sum, point) => sum + point[1], 0) / Math.max(1, projectedPoints.length);
    const orderedProjectedPoints = [...projectedPoints].sort((left, right) => {
        const leftAngle = Math.atan2(left[1] - centroidY, left[0] - centroidX);
        const rightAngle = Math.atan2(right[1] - centroidY, right[0] - centroidX);
        return leftAngle - rightAngle;
    });
    const clipPoints = orderedProjectedPoints.map(([px, py]) => {
        const nx = THREE.MathUtils.clamp(((px - minX) / Math.max(1e-3, width)) * 100, insetXPct, 100 - insetXPct);
        const ny = THREE.MathUtils.clamp(((py - minY) / Math.max(1e-3, height)) * 100, insetYPct, 100 - insetYPct);
        return `${nx.toFixed(3)}% ${ny.toFixed(3)}%`;
    });
    const clipPolygon = `polygon(${clipPoints.join(", ")})`;
    runtime.overlayEl.style.clipPath = clipPolygon;
    runtime.overlayEl.style.webkitClipPath = clipPolygon;
    setTvOverlayVisible(runtime, true);
}

function createTvYouTubeRuntime(propId, youtubeId, playbackStartedAtMs, paused = false, pauseAtSeconds = 0) {
    const overlayEl = document.createElement("div");
    overlayEl.className = "tv-screen-overlay";
    overlayEl.style.display = "none";

    const hostEl = document.createElement("div");
    hostEl.className = "tv-screen-overlay-host";
    overlayEl.appendChild(hostEl);
    document.body.appendChild(overlayEl);

    const runtime = {
        propId,
        type: "youtube",
        youtubeId: "",
        playbackStartedAtMs: 0,
        overlayEl,
        hostEl,
        player: null,
        playerReady: false,
        youtubePlaying: false,
        pendingVideoId: sanitizeYouTubeVideoId(youtubeId || ""),
        pendingStartSeconds: paused
            ? sanitizeTvPauseAtSeconds(pauseAtSeconds, 0)
            : computeTvPlaybackStartSeconds(playbackStartedAtMs),
        pendingPaused: Boolean(paused),
        pendingPauseAtSeconds: sanitizeTvPauseAtSeconds(pauseAtSeconds, 0),
        pendingVolume: 0,
        pendingShouldPlay: false,
        durationSeconds: 0,
        nextOcclusionCheckAtMs: 0,
        occludedByScene: false,
        disposed: false
    };

    ensureJukeboxYouTubeApi().then((YT) => {
        if (runtime.disposed || !YT?.Player) {
            return;
        }

        runtime.player = new YT.Player(hostEl, {
            width: "100%",
            height: "100%",
            videoId: runtime.pendingVideoId || undefined,
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                playsinline: 1,
                rel: 0,
                modestbranding: 1,
                iv_load_policy: 3,
                fs: 0
            },
            events: {
                onReady: () => {
                    if (runtime.disposed || !runtime.player) {
                        return;
                    }
                    runtime.playerReady = true;
                    const pendingId = sanitizeYouTubeVideoId(runtime.pendingVideoId || "");
                    const startSeconds = Math.max(0, Number(runtime.pendingStartSeconds) || 0);
                    if (pendingId && runtime.player.loadVideoById) {
                        try {
                            runtime.player.loadVideoById({
                                videoId: pendingId,
                                startSeconds
                            });
                            runtime.youtubeId = pendingId;
                            runtime.playbackStartedAtMs = sanitizeTvPlaybackStartAtMs(playbackStartedAtMs, 0);
                            runtime.youtubePlaying = !runtime.pendingPaused;
                        } catch (error) {
                        }
                    }
                    if (runtime.pendingPaused && runtime.player.pauseVideo) {
                        try {
                            if (runtime.player.seekTo) {
                                runtime.player.seekTo(runtime.pendingPauseAtSeconds, true);
                            }
                            runtime.player.pauseVideo();
                            runtime.youtubePlaying = false;
                        } catch (error) {
                        }
                    }
                    try {
                        runtime.player.setVolume(Math.round(runtime.pendingVolume));
                    } catch (error) {
                    }
                    if (runtime.pendingShouldPlay && !runtime.pendingPaused) {
                        try {
                            runtime.player.playVideo();
                            runtime.youtubePlaying = true;
                        } catch (error) {
                        }
                    }
                }
            }
        });
    }).catch(() => {
    });

    return runtime;
}

function disposeTvRuntime(runtime) {
    if (!runtime) {
        return;
    }
    runtime.disposed = true;

    if (runtime.player?.pauseVideo) {
        try {
            runtime.player.pauseVideo();
        } catch (error) {
        }
    }
    if (runtime.player?.stopVideo) {
        try {
            runtime.player.stopVideo();
        } catch (error) {
        }
    }
    if (runtime.player?.destroy) {
        try {
            runtime.player.destroy();
        } catch (error) {
        }
    }
    if (runtime.overlayEl?.parentElement) {
        runtime.overlayEl.parentElement.removeChild(runtime.overlayEl);
    }
}

function stopTvRuntimeById(propId) {
    const id = String(propId || "");
    if (!id) {
        return;
    }
    const runtime = tvState.activeRuntimes.get(id);
    if (!runtime) {
        return;
    }
    disposeTvRuntime(runtime);
    tvState.activeRuntimes.delete(id);
}

function stopAllTvRuntimes() {
    for (const [propId, runtime] of tvState.activeRuntimes.entries()) {
        disposeTvRuntime(runtime);
        tvState.activeRuntimes.delete(propId);
    }
}

function updateTvScreens() {
    const tvFloorIds = propTypeIndex.get(PROP_TYPE.TV_SCREEN);
    const tvWallIds = propTypeIndex.get(PROP_TYPE.TV_WALL);
    const tvIds = new Set();
    if (tvFloorIds?.size) {
        for (const id of tvFloorIds) {
            tvIds.add(id);
        }
    }
    if (tvWallIds?.size) {
        for (const id of tvWallIds) {
            tvIds.add(id);
        }
    }
    const wantedIds = new Set();
    if (!tvIds || tvIds.size === 0) {
        if (tvState.activeRuntimes.size > 0) {
            stopAllTvRuntimes();
        }
        return;
    }

    for (const propId of tvIds) {
        const placed = placedProps.get(propId);
        if (!placed) {
            continue;
        }

        const safeState = normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {};
        const powered = Boolean(safeState.powered);
        const youtubeId = sanitizeYouTubeVideoId(safeState.youtubeId || "");
        const playbackStartedAtMs = sanitizeTvPlaybackStartAtMs(safeState.playbackStartedAtMs, 0);
        const paused = Boolean(safeState.paused);
        const pauseAtSeconds = sanitizeTvPauseAtSeconds(safeState.pauseAtSeconds, 0);
        if (!powered || !youtubeId) {
            stopTvRuntimeById(propId);
            continue;
        }

        let runtime = tvState.activeRuntimes.get(propId);
        if (!runtime) {
            runtime = createTvYouTubeRuntime(propId, youtubeId, playbackStartedAtMs, paused, pauseAtSeconds);
            if (runtime) {
                tvState.activeRuntimes.set(propId, runtime);
            }
        }

        const activeRuntime = tvState.activeRuntimes.get(propId);
        if (!activeRuntime) {
            continue;
        }
        wantedIds.add(propId);

        const gain = getTvSpatialGain(placed);
        const targetVolume = Math.round(THREE.MathUtils.clamp(gain * 100, 0, 100));
        const startSeconds = paused
            ? pauseAtSeconds
            : computeTvPlaybackStartSeconds(playbackStartedAtMs);
        activeRuntime.pendingVolume = targetVolume;
        activeRuntime.pendingShouldPlay = !paused;
        activeRuntime.pendingVideoId = youtubeId;
        activeRuntime.pendingStartSeconds = startSeconds;
        activeRuntime.pendingPaused = paused;
        activeRuntime.pendingPauseAtSeconds = pauseAtSeconds;

        if (activeRuntime.playerReady && activeRuntime.player) {
            const sourceChanged = activeRuntime.youtubeId !== youtubeId;
            const previouslyPaused = Boolean(activeRuntime.lastAppliedPaused);
            const currentTimeSeconds = readTvRuntimeCurrentSeconds(activeRuntime, startSeconds);
            const seekTolerance = paused ? 0.2 : 1.5;
            const needsSeek = Math.abs(currentTimeSeconds - startSeconds) > seekTolerance;

            if (sourceChanged && activeRuntime.player.loadVideoById) {
                try {
                    activeRuntime.player.loadVideoById({
                        videoId: youtubeId,
                        startSeconds
                    });
                    activeRuntime.youtubeId = youtubeId;
                    activeRuntime.playbackStartedAtMs = playbackStartedAtMs;
                    activeRuntime.youtubePlaying = true;
                } catch (error) {
                }
            } else if (needsSeek && activeRuntime.player.seekTo) {
                try {
                    activeRuntime.player.seekTo(startSeconds, true);
                } catch (error) {
                }
            }

            activeRuntime.playbackStartedAtMs = playbackStartedAtMs;
            activeRuntime.youtubeId = youtubeId;
            if (activeRuntime.player.setVolume) {
                try {
                    activeRuntime.player.setVolume(targetVolume);
                } catch (error) {
                }
            }

            const durationSeconds = readTvRuntimeDurationSeconds(activeRuntime, activeRuntime.durationSeconds);
            activeRuntime.durationSeconds = durationSeconds;

            if (paused) {
                if (activeRuntime.player.pauseVideo) {
                    try {
                        activeRuntime.player.pauseVideo();
                    } catch (error) {
                    }
                }
                activeRuntime.youtubePlaying = false;
                activeRuntime.lastAppliedPaused = true;
            } else if ((!activeRuntime.youtubePlaying || previouslyPaused || sourceChanged) && activeRuntime.player.playVideo) {
                try {
                    activeRuntime.player.playVideo();
                    activeRuntime.youtubePlaying = true;
                } catch (error) {
                }
                activeRuntime.lastAppliedPaused = false;
            } else {
                activeRuntime.lastAppliedPaused = false;
            }
        }

        updateTvRuntimeOverlayPosition(activeRuntime, placed);
    }

    for (const activeId of Array.from(tvState.activeRuntimes.keys())) {
        if (!wantedIds.has(activeId)) {
            stopTvRuntimeById(activeId);
        }
    }
}

function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("jukebox_recording_read_failed"));
        reader.readAsDataURL(blob);
    });
}

function stopJukeboxTrackRecording(shouldSave = true) {
    const session = jukeboxState.recordingSession;
    if (!session) {
        return;
    }

    session.shouldSave = Boolean(shouldSave);
    if (session.timeoutId !== null) {
        window.clearTimeout(session.timeoutId);
        session.timeoutId = null;
    }
    if (session.recorder?.state !== "inactive") {
        try {
            session.recorder.stop();
            return;
        } catch (error) {
        }
    }

    for (const track of session.stream?.getTracks?.() || []) {
        track.stop();
    }
    jukeboxState.recordingSession = null;
    markInteractionPanelDirty();
}

async function startJukeboxTrackRecording(propId, track) {
    const id = String(propId || "");
    const safeTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT);
    if (!id) {
        return;
    }
    if (jukeboxState.recordingSession) {
        showToast("Ya hay una grabacion en curso", "warning", 900);
        return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
        showToast("Tu navegador no permite grabar audio aqui", "warning", 1300);
        return;
    }

    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
        showToast("No pude acceder al microfono", "warning", 1300);
        return;
    }

    let recorder = null;
    const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    let selectedType = "";
    for (const candidate of preferredTypes) {
        if (typeof window.MediaRecorder.isTypeSupported === "function" && window.MediaRecorder.isTypeSupported(candidate)) {
            selectedType = candidate;
            break;
        }
    }
    try {
        recorder = selectedType
            ? new window.MediaRecorder(stream, { mimeType: selectedType })
            : new window.MediaRecorder(stream);
    } catch (error) {
        for (const trackItem of stream.getTracks()) {
            trackItem.stop();
        }
        showToast("No pude iniciar la grabacion", "warning", 1300);
        return;
    }

    const chunks = [];
    const session = {
        propId: id,
        track: safeTrack,
        recorder,
        stream,
        chunks,
        shouldSave: true,
        timeoutId: null
    };
    jukeboxState.recordingSession = session;

    recorder.addEventListener("dataavailable", (event) => {
        if (event?.data && event.data.size > 0) {
            chunks.push(event.data);
        }
    });

    recorder.addEventListener("stop", async () => {
        const saveResult = Boolean(session.shouldSave);
        for (const streamTrack of session.stream?.getTracks?.() || []) {
            streamTrack.stop();
        }

        if (!saveResult || chunks.length === 0) {
            if (saveResult) {
                showToast("No se capturo audio util", "warning", 1200);
            }
            jukeboxState.recordingSession = null;
            markInteractionPanelDirty();
            return;
        }

        try {
            const blob = new Blob(chunks, { type: selectedType || "audio/webm" });
            const dataUrl = await readBlobAsDataUrl(blob);
            if (!dataUrl.startsWith("data:audio/") || dataUrl.length > JUKEBOX_RECORDING_MAX_DATA_URL_CHARS) {
                showToast("La grabacion es muy pesada, intenta una mas corta", "warning", 1500);
                jukeboxState.recordingSession = null;
                markInteractionPanelDirty();
                return;
            }
            setJukeboxTrackSlot(id, safeTrack, {
                type: "recording",
                value: dataUrl,
                label: `Grabacion ${safeTrack}`
            });
            const placed = placedProps.get(id);
            const safeState = placed
                ? (normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {})
                : {};
            const currentTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(safeState.track) || 1, 1, JUKEBOX_TRACK_COUNT);
            if (currentTrack === safeTrack) {
                updatePropSharedState(id, { source: `${JUKEBOX_SOURCE_PREFIX_RECORDING}${safeTrack}` }, `Grabacion asignada a pista ${safeTrack}`);
            } else {
                showToast(`Grabacion guardada en pista ${safeTrack}`, "success", 1300);
            }
        } catch (error) {
            showToast("No pude guardar la grabacion", "warning", 1300);
        }

        jukeboxState.recordingSession = null;
        markInteractionPanelDirty();
    });

    try {
        recorder.start(260);
    } catch (error) {
        for (const streamTrack of stream.getTracks()) {
            streamTrack.stop();
        }
        jukeboxState.recordingSession = null;
        showToast("No pude iniciar la captura de audio", "warning", 1300);
        return;
    }

    session.timeoutId = window.setTimeout(() => {
        stopJukeboxTrackRecording(true);
    }, JUKEBOX_RECORDING_MAX_SECONDS * 1000);
    showToast(`Grabando pista ${safeTrack} (${JUKEBOX_RECORDING_MAX_SECONDS}s max)`, "info", 1500);
    markInteractionPanelDirty();
}

function resolveJukeboxExternalSource(rawLinkValue) {
    const spotifyUri = sanitizeSpotifyUri(rawLinkValue);
    if (spotifyUri) {
        return {
            type: "spotify",
            value: spotifyUri,
            source: `${JUKEBOX_SOURCE_PREFIX_SPOTIFY}${spotifyUri}`,
            labelPrefix: "Spotify"
        };
    }

    const youtubeId = sanitizeYouTubeVideoId(rawLinkValue);
    if (youtubeId) {
        return {
            type: "youtube",
            value: youtubeId,
            source: `${JUKEBOX_SOURCE_PREFIX_YOUTUBE}${youtubeId}`,
            labelPrefix: "YouTube"
        };
    }

    return null;
}

function extractFirstHttpUrlFromText(rawText) {
    const text = String(rawText || "");
    if (!text) {
        return "";
    }
    const matches = text.match(/https?:\/\/[^\s|]+/gi);
    return matches?.[0] ? String(matches[0]).trim() : "";
}

function extractYouTubeUrlsFromText(rawText) {
    const text = String(rawText || "");
    if (!text) {
        return [];
    }
    const matches = text.match(/https?:\/\/[^\s"'<>|]+/gi) || [];
    const urls = [];
    for (const rawUrl of matches) {
        const safeUrl = String(rawUrl || "").replace(/[),.;!?]+$/, "").trim();
        const youtubeId = sanitizeYouTubeVideoId(safeUrl);
        if (!youtubeId) {
            continue;
        }
        urls.push({
            url: `https://www.youtube.com/watch?v=${youtubeId}`,
            id: youtubeId
        });
    }
    return urls;
}

function parseMuseumFeedEntriesFromText(rawText, museumConfig = {}) {
    const lines = String(rawText || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
    const parsed = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const segments = line.split("|").map((segment) => segment.trim()).filter(Boolean);
        const urlIndex = segments.findIndex((segment) => /^https?:\/\//i.test(segment));
        const fallbackTitle = `Episodio ${String(index + 1).padStart(3, "0")}`;
        const fallbackUrl = urlIndex !== -1
            ? segments[urlIndex]
            : String(extractFirstHttpUrlFromText(line) || "");
        const youtubeId = sanitizeYouTubeVideoId(fallbackUrl);
        if (!youtubeId) {
            continue;
        }

        const title = urlIndex > 0
            ? segments.slice(0, urlIndex).join(" | ")
            : (segments[0] && !/^https?:\/\//i.test(segments[0]) ? segments[0] : "");
        parsed.push({
            url: `https://www.youtube.com/watch?v=${youtubeId}`,
            title: String(title || museumConfig.seriesLabel || fallbackTitle).trim()
        });
    }

    return parsed;
}

function pickLatestMuseumSourceEntry(rawText, museumConfig = {}) {
    const entries = parseMuseumFeedEntriesFromText(rawText, museumConfig);
    if (!entries.length) {
        return null;
    }
    const wantsNewestFirst = museumConfig.reverseOrder !== false;
    const orderedEntries = wantsNewestFirst ? [...entries].reverse() : entries;
    return orderedEntries[0] || null;
}

function pickLatestMuseumFeedEntry(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return null;
    }
    const normalized = [];
    for (const raw of entries) {
        const url = String(raw?.url || "").trim();
        const youtubeId = sanitizeYouTubeVideoId(url);
        if (!youtubeId) {
            continue;
        }
        const publishedAtMs = Date.parse(String(raw?.publishedAt || ""));
        normalized.push({
            url: `https://www.youtube.com/watch?v=${youtubeId}`,
            title: String(raw?.title || "Episodio reciente"),
            publishedAtMs: Number.isFinite(publishedAtMs) ? publishedAtMs : 0
        });
    }
    if (normalized.length === 0) {
        return null;
    }
    normalized.sort((a, b) => {
        if (a.publishedAtMs !== b.publishedAtMs) {
            return b.publishedAtMs - a.publishedAtMs;
        }
        return 0;
    });
    return normalized[0];
}

async function fetchLatestMuseumEpisodeLink() {
    const museumConfig = window.appConfig?.story?.museum || {};
    const autoFeedConfig = museumConfig.autoFeed || {};
    const channelId = String(autoFeedConfig.channelId || "").trim();

    if (channelId) {
        try {
            const requestedLimit = Number.parseInt(String(autoFeedConfig.limit || "24"), 10);
            const feedLimit = Number.isFinite(requestedLimit)
                ? THREE.MathUtils.clamp(requestedLimit, 6, 80)
                : 24;
            const params = new URLSearchParams({
                channelId,
                limit: String(feedLimit),
                series: String(museumConfig.seriesLabel || "Fucknews Fridays"),
                note: String(museumConfig.defaultNote || "Otro viernes guardado.")
            });
            const response = await fetch(`/.netlify/functions/youtube-feed?${params.toString()}`, { cache: "no-store" });
            if (response.ok) {
                const payload = await response.json();
                const latestEntry = pickLatestMuseumFeedEntry(payload?.entries || []);
                if (latestEntry?.url) {
                    return {
                        url: latestEntry.url,
                        title: String(latestEntry.title || "Episodio reciente")
                    };
                }
            }
        } catch (error) {
        }
    }

    const sourcePath = String(museumConfig.source || "").trim();
    if (sourcePath) {
        const response = await fetch(sourcePath, { cache: "no-store" });
        if (response.ok) {
            const sourceText = await response.text();
            const latestSourceEntry = pickLatestMuseumSourceEntry(sourceText, museumConfig);
            if (latestSourceEntry?.url) {
                return {
                    url: latestSourceEntry.url,
                    title: String(latestSourceEntry.title || "Episodio reciente")
                };
            }
            const youtubeUrls = extractYouTubeUrlsFromText(sourceText);
            if (youtubeUrls.length > 0) {
                const wantsNewestFirst = museumConfig.reverseOrder !== false;
                const fallbackEntry = wantsNewestFirst
                    ? youtubeUrls[youtubeUrls.length - 1]
                    : youtubeUrls[0];
                return {
                    url: fallbackEntry.url,
                    title: "Episodio reciente (archivo)"
                };
            }
            const sourceUrl = extractFirstHttpUrlFromText(sourceText);
            if (sourceUrl) {
                return {
                    url: sourceUrl,
                    title: "Episodio cargado del archivo"
                };
            }
        }
    }

    throw new Error("museum_feed_unavailable");
}

function applyExternalLinkToJukeboxTrack(propId, track, rawLinkValue) {
    const id = String(propId || "");
    const safeTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(track) || 1, 1, JUKEBOX_TRACK_COUNT);
    const sourceDescriptor = resolveJukeboxExternalSource(rawLinkValue);
    if (!id || !sourceDescriptor) {
        showToast("Link invalido (usa Spotify o YouTube)", "warning", 1300);
        return false;
    }

    const slotSaved = setJukeboxTrackSlot(id, safeTrack, {
        type: sourceDescriptor.type,
        value: sourceDescriptor.value,
        label: `${sourceDescriptor.labelPrefix} ${safeTrack}`
    });
    if (!slotSaved) {
        return false;
    }

    const placed = placedProps.get(id);
    const safeState = placed
        ? (normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {})
        : {};
    const currentTrack = THREE.MathUtils.clamp(sanitizeJukeboxTrack(safeState.track) || 1, 1, JUKEBOX_TRACK_COUNT);
    if (currentTrack === safeTrack) {
        updatePropSharedState(id, { source: sourceDescriptor.source }, `${sourceDescriptor.labelPrefix} asignado`);
    } else {
        showToast(`${sourceDescriptor.labelPrefix} asignado a pista ${safeTrack}`, "success", 1200);
    }

    if (sourceDescriptor.type === "spotify" && !jukeboxState.spotifyNoticeShown) {
        jukeboxState.spotifyNoticeShown = true;
        showToast("Spotify se atenúa por cercania con pausa/reanudar por limitaciones del navegador", "info", 2200);
    }
    return true;
}

function renderContainerInteractionPanel(placed) {
    const slotCount = Array.isArray(getPropDefinition(placed.propType)?.stateDefaults?.items)
        ? getPropDefinition(placed.propType).stateDefaults.items.length
        : 6;
    const currentItems = sanitizeContainerItems(placed.state?.items, slotCount);
    appendInteractionInfoLine("Arrastra desde inventario/barra al cofre. Click izq en slot ocupado: retirar.");

    const getLiveItems = () => {
        const livePlaced = placedProps.get(placed.id);
        return sanitizeContainerItems(livePlaced?.state?.items, slotCount);
    };
    const commitItems = (nextItems, feedbackText) => {
        const normalizedItems = sanitizeContainerItems(nextItems, slotCount);
        if (updatePropSharedState(placed.id, { items: normalizedItems }, feedbackText)) {
            markInteractionPanelDirty();
            return true;
        }
        return false;
    };

    const slotsWrap = document.createElement("div");
    slotsWrap.className = "interaction-slots";
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
        const slotButton = document.createElement("button");
        slotButton.type = "button";
        slotButton.className = "interaction-slot";
        const slotItemId = String(currentItems[slotIndex] || "");
        const slotItemLabel = slotItemId
            ? (INVENTORY_ITEM_BY_ID.get(slotItemId)?.label || slotItemId)
            : "Vacio";
        slotButton.textContent = `${slotIndex + 1}. ${slotItemLabel}`;
        if (slotItemId) {
            slotButton.classList.add("occupied");
        }

        slotButton.addEventListener("click", () => {
            const liveItems = getLiveItems();
            const currentSlotItemId = String(liveItems[slotIndex] || "");
            if (currentSlotItemId) {
                const nextItems = [...liveItems];
                nextItems[slotIndex] = "";
                commitItems(nextItems, `Slot ${slotIndex + 1} retirado`);
                return;
            }

            const selected = getSelectedHotbarItem();
            const selectedId = String(selected?.id || "");
            if (!selectedId || !INVENTORY_ITEM_BY_ID.has(selectedId)) {
                showToast("Selecciona o arrastra un item para guardarlo", "info", 900);
                return;
            }

            const nextItems = [...liveItems];
            nextItems[slotIndex] = selectedId;
            commitItems(nextItems, `Guardado en slot ${slotIndex + 1}`);
        });

        slotButton.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            const liveItems = getLiveItems();
            const nextItems = [...liveItems];
            nextItems[slotIndex] = "";
            commitItems(nextItems, `Slot ${slotIndex + 1} vaciado`);
        });

        slotButton.addEventListener("dragover", (event) => {
            event.preventDefault();
            slotButton.classList.add("drag-target");
        });
        slotButton.addEventListener("dragleave", () => {
            slotButton.classList.remove("drag-target");
        });
        slotButton.addEventListener("drop", (event) => {
            event.preventDefault();
            slotButton.classList.remove("drag-target");
            const droppedId = resolveDraggedInventoryItemId(event);
            draggedInventoryItemId = "";
            if (!droppedId) {
                return;
            }
            const liveItems = getLiveItems();
            const nextItems = [...liveItems];
            nextItems[slotIndex] = droppedId;
            commitItems(nextItems, `Guardado en slot ${slotIndex + 1}`);
        });
        slotsWrap.appendChild(slotButton);
    }
    interactionPanelBodyEl?.appendChild(slotsWrap);
}

function renderFurnaceInteractionPanel(placed) {
    const safeState = normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {};
    const inputId = String(safeState.input || "");
    const fuel = THREE.MathUtils.clamp(Math.floor(Number(safeState.fuel) || 0), 0, 100);
    const lit = Boolean(safeState.lit);
    const inputLabel = inputId ? (INVENTORY_ITEM_BY_ID.get(inputId)?.label || inputId) : "Sin entrada";
    appendInteractionInfoLine(`Entrada: ${inputLabel}`);
    appendInteractionInfoLine(`Combustible: ${fuel}%`);
    appendInteractionInfoLine(`Estado: ${lit ? "Encendido" : "Apagado"}`);

    appendInteractionAction("Cargar item seleccionado", () => {
        const selected = getSelectedHotbarItem();
        const selectedId = String(selected?.id || "");
        if (!selectedId || !INVENTORY_ITEM_BY_ID.has(selectedId)) {
            return;
        }
        if (updatePropSharedState(placed.id, { input: selectedId }, "Horno: entrada actualizada")) {
            markInteractionPanelDirty();
        }
    });
    appendInteractionAction("Vaciar entrada", () => {
        if (updatePropSharedState(placed.id, { input: "" }, "Horno: entrada vaciada")) {
            markInteractionPanelDirty();
        }
    });
    appendInteractionAction("Agregar combustible (+10)", () => {
        const nextFuel = THREE.MathUtils.clamp(fuel + 10, 0, 100);
        if (updatePropSharedState(placed.id, { fuel: nextFuel }, "Horno: combustible agregado")) {
            markInteractionPanelDirty();
        }
    });
    appendInteractionAction(lit ? "Apagar horno" : "Encender horno", () => {
        if (!lit && fuel <= 0) {
            showToast("Agrega combustible para encender", "warning", 1000);
            return;
        }
        const nextLit = !lit;
        const nextFuel = nextLit ? Math.max(0, fuel - 10) : fuel;
        if (updatePropSharedState(placed.id, { lit: nextLit, fuel: nextFuel }, `Horno ${nextLit ? "encendido" : "apagado"}`)) {
            markInteractionPanelDirty();
        }
    });
}

function renderJukeboxInteractionPanel(placed) {
    const safeState = normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {};
    const playing = Boolean(safeState.playing);
    const track = sanitizeJukeboxTrack(safeState.track) || 1;
    const descriptor = resolveJukeboxTrackDescriptor(placed.id, track, safeState.source || JUKEBOX_SOURCE_DEFAULT);
    const isRecordingThis = Boolean(
        jukeboxState.recordingSession
        && jukeboxState.recordingSession.propId === placed.id
        && sanitizeJukeboxTrack(jukeboxState.recordingSession.track) === track
    );

    appendInteractionInfoLine(`Estado: ${playing ? "Reproduciendo" : "Detenida"}`);
    appendInteractionInfoLine(`Pista activa: ${track} (${descriptor.label || "Local"})`);
    appendInteractionInfoLine(`Fuente: ${descriptor.type === "spotify" ? "Spotify" : descriptor.type === "youtube" ? "YouTube" : descriptor.type === "recording" ? "Grabacion local" : "Local sintetica"}`);
    appendInteractionInfoLine("El audio sigue sonando al cerrar el panel y se atenúa por distancia.");

    const row = document.createElement("div");
    row.className = "interaction-row";
    for (let i = 1; i <= JUKEBOX_TRACK_COUNT; i += 1) {
        const slot = getJukeboxTrackSlot(placed.id, i);
        const trackButton = document.createElement("button");
        trackButton.type = "button";
        trackButton.className = "interaction-action";
        const label = getJukeboxTrackDisplayLabel(slot, i);
        trackButton.textContent = `${i}. ${label}`;
        if (i === track) {
            trackButton.classList.add("active");
        }
        trackButton.addEventListener("click", () => {
            const selectedSlot = getJukeboxTrackSlot(placed.id, i);
            const nextSource = encodeJukeboxSourceFromTrackSlot(selectedSlot, i);
            if (updatePropSharedState(placed.id, { track: i, playing: true, source: nextSource }, `Jukebox: pista ${i}`)) {
                const context = ensureInteractionAudioContext();
                if (context?.state === "suspended") {
                    context.resume().catch(() => {
                    });
                }
                if (selectedSlot.type === "local") {
                    playJukeboxTrackPreview(i);
                }
                markInteractionPanelDirty();
            }
        });
        row.appendChild(trackButton);
    }
    interactionPanelBodyEl?.appendChild(row);

    appendInteractionAction(playing ? "Detener" : "Reproducir", () => {
        const nextPlaying = !playing;
        const activeSlot = getJukeboxTrackSlot(placed.id, track);
        const nextSource = encodeJukeboxSourceFromTrackSlot(activeSlot, track);
        if (updatePropSharedState(placed.id, { playing: nextPlaying, track, source: nextSource }, nextPlaying ? "Jukebox iniciada" : "Jukebox detenida")) {
            if (nextPlaying) {
                const context = ensureInteractionAudioContext();
                if (context?.state === "suspended") {
                    context.resume().catch(() => {
                    });
                }
            }
            if (nextPlaying && activeSlot.type === "local") {
                playJukeboxTrackPreview(track);
            }
            markInteractionPanelDirty();
        }
    });

    const customRow = document.createElement("div");
    customRow.className = "interaction-row";

    const recordButton = document.createElement("button");
    recordButton.type = "button";
    recordButton.className = "interaction-action";
    recordButton.textContent = isRecordingThis ? `Detener grabacion pista ${track}` : `Grabar pista ${track}`;
    recordButton.addEventListener("click", () => {
        if (isRecordingThis) {
            stopJukeboxTrackRecording(true);
            return;
        }
        startJukeboxTrackRecording(placed.id, track);
    });
    customRow.appendChild(recordButton);

    const clearCustomButton = document.createElement("button");
    clearCustomButton.type = "button";
    clearCustomButton.className = "interaction-action";
    clearCustomButton.textContent = `Restaurar pista ${track}`;
    clearCustomButton.addEventListener("click", () => {
        if (isRecordingThis) {
            stopJukeboxTrackRecording(false);
        }
        if (!clearJukeboxTrackSlot(placed.id, track)) {
            return;
        }
        const fallbackSource = JUKEBOX_SOURCE_DEFAULT;
        updatePropSharedState(placed.id, { source: fallbackSource }, `Pista ${track} restaurada`);
        markInteractionPanelDirty();
    });
    customRow.appendChild(clearCustomButton);
    interactionPanelBodyEl?.appendChild(customRow);

    const linkWrap = document.createElement("div");
    linkWrap.className = "interaction-source";
    const linkInput = document.createElement("input");
    linkInput.type = "text";
    linkInput.className = "interaction-input";
    linkInput.placeholder = "Pega link de Spotify o YouTube";
    linkInput.value = interactionState.jukeboxLinkDraftByProp.get(placed.id) || "";
    linkInput.addEventListener("input", () => {
        interactionState.jukeboxLinkDraftByProp.set(placed.id, linkInput.value);
    });

    const linkButton = document.createElement("button");
    linkButton.type = "button";
    linkButton.className = "interaction-action";
    linkButton.textContent = `Guardar link en pista ${track}`;
    linkButton.addEventListener("click", () => {
        const draft = linkInput.value;
        if (applyExternalLinkToJukeboxTrack(placed.id, track, draft)) {
            interactionState.jukeboxLinkDraftByProp.set(placed.id, "");
            linkInput.value = "";
            markInteractionPanelDirty();
        }
    });

    linkWrap.appendChild(linkInput);
    linkWrap.appendChild(linkButton);
    interactionPanelBodyEl?.appendChild(linkWrap);

    const quickFeedButton = document.createElement("button");
    quickFeedButton.type = "button";
    quickFeedButton.className = "interaction-action";
    quickFeedButton.textContent = "Usar ultimo capitulo (API)";
    quickFeedButton.addEventListener("click", async () => {
        quickFeedButton.disabled = true;
        quickFeedButton.textContent = "Cargando...";
        try {
            const latest = await fetchLatestMuseumEpisodeLink();
            linkInput.value = latest.url;
            interactionState.jukeboxLinkDraftByProp.set(placed.id, latest.url);
            showToast(`Cargado: ${latest.title}`, "success", 1300);
        } catch (error) {
            showToast("No pude cargar capitulos desde la API/archivo", "warning", 1300);
        } finally {
            quickFeedButton.disabled = false;
            quickFeedButton.textContent = "Usar ultimo capitulo (API)";
        }
    });
    interactionPanelBodyEl?.appendChild(quickFeedButton);

    if (isRecordingThis) {
        appendInteractionInfoLine(`Grabando pista ${track}... vuelve a pulsar para detener.`);
    }
}

function renderTvInteractionPanel(placed) {
    const safeState = normalizePropSharedState(placed.propType, placed.state, placed.state) || getPropDefaultSharedState(placed.propType) || {};
    const powered = Boolean(safeState.powered);
    const youtubeId = sanitizeYouTubeVideoId(safeState.youtubeId || "");
    const playbackStartedAtMs = sanitizeTvPlaybackStartAtMs(safeState.playbackStartedAtMs, 0);
    const paused = Boolean(safeState.paused);
    const pauseAtSeconds = sanitizeTvPauseAtSeconds(safeState.pauseAtSeconds, 0);
    const title = String(safeState.title || "").trim();
    const sizeInches = sanitizeTvSizeInches(safeState.sizeInches, 200);
    const runtime = tvState.activeRuntimes.get(String(placed.id || ""));
    const fallbackCurrentSeconds = paused ? pauseAtSeconds : computeTvPlaybackStartSeconds(playbackStartedAtMs);
    const currentSeconds = readTvRuntimeCurrentSeconds(runtime, fallbackCurrentSeconds);
    const durationSeconds = readTvRuntimeDurationSeconds(runtime, runtime?.durationSeconds || 0);
    if (runtime) {
        runtime.durationSeconds = durationSeconds;
    }
    const timelineMaxSeconds = Math.max(
        30,
        Math.ceil(durationSeconds > 0 ? durationSeconds : Math.max(currentSeconds + 15, 180))
    );

    appendInteractionInfoLine(`Estado: ${powered ? (paused ? "Encendida (pausada)" : "Encendida (reproduciendo)") : "Apagada"}`);
    appendInteractionInfoLine(`Canal: ${youtubeId ? (title || "Video sincronizado") : "Sin senal"}`);
    appendInteractionInfoLine(`Tamano: ${sizeInches}"`);
    appendInteractionInfoLine("Audio espacial: si te alejas, baja el volumen.");
    if (youtubeId) {
        const totalLabelSeconds = durationSeconds > 0 ? durationSeconds : timelineMaxSeconds;
        appendInteractionInfoLine(`Tiempo: ${formatTvTimeLabel(currentSeconds)} / ${formatTvTimeLabel(totalLabelSeconds)}`);
    }

    appendInteractionAction(powered ? "Apagar TV" : "Encender TV", () => {
        const nextPowered = !powered;
        if (updatePropSharedState(placed.id, { powered: nextPowered }, `TV ${nextPowered ? "encendida" : "apagada"}`)) {
            markInteractionPanelDirty();
        }
    });

    if (youtubeId) {
        const transportRow = document.createElement("div");
        transportRow.className = "interaction-row";

        const pauseButton = document.createElement("button");
        pauseButton.type = "button";
        pauseButton.className = "interaction-action";
        pauseButton.textContent = paused ? "Reanudar" : "Pausar";
        pauseButton.addEventListener("click", () => {
            const runtimeNow = tvState.activeRuntimes.get(String(placed.id || ""));
            const fallbackNow = paused ? pauseAtSeconds : computeTvPlaybackStartSeconds(playbackStartedAtMs);
            const currentNow = readTvRuntimeCurrentSeconds(runtimeNow, fallbackNow);
            if (paused) {
                const resumedAt = computeTvPlaybackStartAtMsFromSeconds(currentNow);
                if (updatePropSharedState(placed.id, {
                    powered: true,
                    paused: false,
                    pauseAtSeconds: currentNow,
                    playbackStartedAtMs: resumedAt
                }, "TV reanudada")) {
                    markInteractionPanelDirty();
                }
            } else if (updatePropSharedState(placed.id, {
                paused: true,
                pauseAtSeconds: currentNow,
                playbackStartedAtMs: computeTvPlaybackStartAtMsFromSeconds(currentNow)
            }, "TV en pausa")) {
                markInteractionPanelDirty();
            }
        });
        transportRow.appendChild(pauseButton);

        appendInteractionAction("Reiniciar video", () => {
            if (updatePropSharedState(placed.id, {
                powered: true,
                paused: false,
                pauseAtSeconds: 0,
                playbackStartedAtMs: Date.now()
            }, "TV reiniciada")) {
                markInteractionPanelDirty();
            }
        });
        interactionPanelBodyEl?.appendChild(transportRow);

        const progressRow = document.createElement("div");
        progressRow.className = "interaction-source";
        const progressInput = document.createElement("input");
        progressInput.type = "range";
        progressInput.className = "interaction-range";
        progressInput.min = "0";
        progressInput.max = String(timelineMaxSeconds);
        progressInput.step = "0.1";
        progressInput.value = String(THREE.MathUtils.clamp(currentSeconds, 0, timelineMaxSeconds));

        const progressLabel = document.createElement("span");
        progressLabel.className = "interaction-time-label";
        const updateProgressLabel = (seconds) => {
            const total = durationSeconds > 0 ? durationSeconds : timelineMaxSeconds;
            progressLabel.textContent = `${formatTvTimeLabel(seconds)} / ${formatTvTimeLabel(total)}`;
        };
        updateProgressLabel(currentSeconds);

        progressInput.addEventListener("input", () => {
            updateProgressLabel(Number(progressInput.value) || 0);
        });
        progressInput.addEventListener("change", () => {
            const targetSeconds = THREE.MathUtils.clamp(Number(progressInput.value) || 0, 0, timelineMaxSeconds);
            if (paused) {
                if (updatePropSharedState(placed.id, {
                    paused: true,
                    pauseAtSeconds: targetSeconds,
                    playbackStartedAtMs: computeTvPlaybackStartAtMsFromSeconds(targetSeconds)
                }, "TV: posicion actualizada")) {
                    markInteractionPanelDirty();
                }
                return;
            }
            const restartedAt = computeTvPlaybackStartAtMsFromSeconds(targetSeconds);
            if (updatePropSharedState(placed.id, {
                powered: true,
                paused: false,
                pauseAtSeconds: targetSeconds,
                playbackStartedAtMs: restartedAt
            }, "TV: avance actualizado")) {
                markInteractionPanelDirty();
            }
        });
        progressRow.appendChild(progressInput);
        progressRow.appendChild(progressLabel);
        interactionPanelBodyEl?.appendChild(progressRow);

        appendInteractionAction("Apagar y limpiar senal", () => {
            if (updatePropSharedState(placed.id, {
                powered: false,
                youtubeId: "",
                playbackStartedAtMs: 0,
                paused: false,
                pauseAtSeconds: 0,
                title: ""
            }, "TV apagada")) {
                markInteractionPanelDirty();
            }
        });
    }

    const latestButton = document.createElement("button");
    latestButton.type = "button";
    latestButton.className = "interaction-action";
    latestButton.textContent = "Reproducir ultimo capitulo (Fucknews)";
    latestButton.addEventListener("click", async () => {
        latestButton.disabled = true;
        latestButton.textContent = "Buscando capitulo...";
        try {
            const latest = await fetchLatestMuseumEpisodeLink();
            const youtubeIdFromFeed = sanitizeYouTubeVideoId(latest?.url || "");
            if (!youtubeIdFromFeed) {
                throw new Error("latest_episode_not_youtube");
            }
            const normalizedTitle = String(latest?.title || "Ultimo episodio").slice(0, 120);
            if (updatePropSharedState(placed.id, {
                powered: true,
                youtubeId: youtubeIdFromFeed,
                playbackStartedAtMs: Date.now(),
                paused: false,
                pauseAtSeconds: 0,
                title: normalizedTitle
            }, `TV: ${normalizedTitle}`)) {
                markInteractionPanelDirty();
            }
        } catch (error) {
            showToast("No pude obtener el ultimo capitulo desde la API/feed", "warning", 1500);
        } finally {
            latestButton.disabled = false;
            latestButton.textContent = "Reproducir ultimo capitulo (Fucknews)";
        }
    });
    interactionPanelBodyEl?.appendChild(latestButton);

    const sizeRow = document.createElement("div");
    sizeRow.className = "interaction-row";
    for (const option of TV_SIZE_OPTIONS) {
        const sizeButton = document.createElement("button");
        sizeButton.type = "button";
        sizeButton.className = "interaction-action";
        sizeButton.textContent = `${option}"`;
        if (option === sizeInches) {
            sizeButton.classList.add("active");
        }
        sizeButton.addEventListener("click", () => {
            if (updatePropSharedState(placed.id, { sizeInches: option }, `TV ${option}"`)) {
                markInteractionPanelDirty();
            }
        });
        sizeRow.appendChild(sizeButton);
    }
    interactionPanelBodyEl?.appendChild(sizeRow);
}

function renderInteractionPanelNow() {
    if (!state.interactionPanelOpen || !interactionPanelBodyEl) {
        return;
    }

    const propId = String(interactionState.panelPropId || "");
    const placed = propId ? placedProps.get(propId) : null;
    if (!placed) {
        closeInteractionPanel(false, true);
        return;
    }

    const config = getPropInteractionConfig(placed.propType);
    const panelMode = String(interactionState.panelMode || config?.kind || "");
    interactionPanelBodyEl.innerHTML = "";
    if (interactionPanelTitleEl) {
        interactionPanelTitleEl.textContent = getPropLabel(placed.propType);
    }
    if (interactionPanelHintEl) {
        const poseHint = interactionState.pose ? " | Shift levantarte" : "";
        interactionPanelHintEl.textContent = `E interactuar | Esc cerrar${poseHint}`;
    }

    if (panelMode === INTERACTION_KIND.CONTAINER_OPEN) {
        renderContainerInteractionPanel(placed);
    } else if (panelMode === INTERACTION_KIND.FURNACE_OPEN) {
        renderFurnaceInteractionPanel(placed);
    } else if (panelMode === INTERACTION_KIND.JUKEBOX_CONTROL) {
        renderJukeboxInteractionPanel(placed);
    } else if (panelMode === INTERACTION_KIND.TV_CONTROL) {
        renderTvInteractionPanel(placed);
    } else {
        appendInteractionInfoLine("Este objeto no tiene panel detallado todavia.");
    }
}

function isInteractionPanelEditingInputActive() {
    const active = document.activeElement;
    if (!active || !interactionPanelEl) {
        return false;
    }
    if (!interactionPanelEl.contains(active)) {
        return false;
    }
    return isTypingIntoEditableTarget(active);
}

function updateInteractionPanel(deltaSeconds = 0) {
    if (!state.interactionPanelOpen) {
        return;
    }

    const propId = String(interactionState.panelPropId || "");
    if (!propId || !placedProps.has(propId)) {
        closeInteractionPanel(false, true);
        return;
    }

    interactionState.panelRefreshTick -= Math.max(0, deltaSeconds);
    const editingInput = isInteractionPanelEditingInputActive();
    if (editingInput) {
        if (interactionState.panelRefreshTick <= 0) {
            interactionState.panelRefreshTick = 0.2;
        }
        return;
    }

    if (interactionState.panelNeedsRender || interactionState.panelRefreshTick <= 0) {
        interactionState.panelNeedsRender = false;
        interactionState.panelRefreshTick = 0.2;
        renderInteractionPanelNow();
    }
}

function assignHotbarSlot(slotIndex, itemId, showFeedback = false) {
    const index = THREE.MathUtils.clamp(Math.floor(Number(slotIndex) || 0), 0, HOTBAR_SIZE - 1);
    const normalizedId = String(itemId || "");
    if (normalizedId && !INVENTORY_ITEM_BY_ID.has(normalizedId)) {
        return;
    }

    state.hotbarItemIds[index] = normalizedId;
    saveHotbarConfiguration();
    refreshHotbarUi();

    if (showFeedback) {
        if (!normalizedId) {
            showToast(`Slot ${index + 1} vaciado`, "info", 900);
        } else {
            const item = INVENTORY_ITEM_BY_ID.get(normalizedId);
            showToast(`Slot ${index + 1}: ${item?.label || "Item"}`, "success", 900);
        }
    }
}

function refreshHotbarUi() {
    if (!hotbarEl) {
        return;
    }

    hotbarEl.innerHTML = "";
    for (let index = 0; index < HOTBAR_SIZE; index += 1) {
        const item = getHotbarItemByIndex(index);
        const itemLabel = item?.label || "Vacio";
        const slot = document.createElement("div");
        slot.className = `slot${index === state.selectedHotbarIndex ? " selected" : ""}${item ? "" : " empty"}`;
        slot.setAttribute("aria-label", `${index + 1} ${itemLabel}`);
        slot.style.backgroundColor = item ? getInventoryItemTint(item) : "rgba(255, 255, 255, 0.02)";
        slot.textContent = `${index + 1}\n${itemLabel}`;
        slot.draggable = true;

        slot.addEventListener("click", () => {
            setSelectedHotbar(index);
        });

        slot.addEventListener("dragstart", (event) => {
            const itemId = String(item?.id || "");
            if (!itemId || !INVENTORY_ITEM_BY_ID.has(itemId)) {
                event.preventDefault();
                return;
            }
            draggedInventoryItemId = itemId;
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("text/plain", itemId);
            }
            slot.classList.add("dragging-item");
        });

        slot.addEventListener("dragend", () => {
            draggedInventoryItemId = "";
            slot.classList.remove("dragging-item");
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

        slot.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            assignHotbarSlot(index, "", true);
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

function isWallMountedPropType(propType) {
    return propType === PROP_TYPE.CURTAINS
        || propType === PROP_TYPE.WALL_LANTERN
        || propType === PROP_TYPE.WALL_TORCH
        || propType === PROP_TYPE.TV_WALL;
}

function resolveContextualPropTypeForPlacement(basePropType, worldNormal) {
    const baseType = String(basePropType || "");
    if (
        baseType !== PROP_TYPE.TORCH
        && baseType !== PROP_TYPE.WALL_TORCH
        && baseType !== PROP_TYPE.TV_SCREEN
        && baseType !== PROP_TYPE.TV_WALL
    ) {
        return baseType;
    }

    if (!worldNormal) {
        if (baseType === PROP_TYPE.TV_WALL || baseType === PROP_TYPE.TV_SCREEN) {
            return PROP_TYPE.TV_SCREEN;
        }
        return PROP_TYPE.TORCH;
    }

    const horizontalStrength = Math.hypot(Number(worldNormal.x) || 0, Number(worldNormal.z) || 0);
    const isWallFace = horizontalStrength >= 0.1 && Math.abs(Number(worldNormal.y) || 0) <= 0.85;
    if (baseType === PROP_TYPE.TV_WALL || baseType === PROP_TYPE.TV_SCREEN) {
        return isWallFace ? PROP_TYPE.TV_WALL : PROP_TYPE.TV_SCREEN;
    }
    return isWallFace ? PROP_TYPE.WALL_TORCH : PROP_TYPE.TORCH;
}

function getWallPlacementWarning(propType) {
    if (propType === PROP_TYPE.CURTAINS) {
        return "Las cortinas se colocan sobre paredes";
    }
    if (propType === PROP_TYPE.WALL_TORCH) {
        return "La antorcha de pared requiere una pared";
    }
    if (propType === PROP_TYPE.WALL_LANTERN) {
        return "El farol de pared requiere una pared";
    }
    if (propType === PROP_TYPE.TV_WALL) {
        return "El TV de pared requiere una pared";
    }
    return "Este objeto se coloca sobre paredes";
}

function getWallMountCenterOffset(propType) {
    if (propType === PROP_TYPE.TV_WALL) {
        return 0.12;
    }
    return 0.44;
}

function getWallMountBaseYOffset(propType) {
    if (propType === PROP_TYPE.TV_WALL) {
        return 0;
    }
    return 0;
}

function findColumnSurfaceYAtOrBelow(x, z, startY = WORLD_MAX_Y - 1) {
    let sampleY = Math.floor(Number(startY));
    if (!Number.isFinite(sampleY)) {
        sampleY = WORLD_MAX_Y - 1;
    }
    sampleY = THREE.MathUtils.clamp(sampleY, 0, WORLD_MAX_Y - 1);
    const sampleX = Math.floor(Number(x) || 0);
    const sampleZ = Math.floor(Number(z) || 0);
    for (let y = sampleY; y >= 0; y -= 1) {
        if (isSolidBlock(getBlock(sampleX, y, sampleZ))) {
            return y;
        }
    }
    return null;
}

function resolveWallTvPlacementY(anchorY, wallFaceCellX, wallFaceCellZ, tvState = null) {
    const profile = getPropProfileForState(PROP_TYPE.TV_WALL, tvState);
    const terrainSurfaceY = Math.floor(Number(terrainHeight(wallFaceCellX, wallFaceCellZ)) || 0);
    const scannedSurfaceY = findColumnSurfaceYAtOrBelow(wallFaceCellX, wallFaceCellZ, anchorY);
    const supportSurfaceY = Number.isFinite(scannedSurfaceY) ? scannedSurfaceY : terrainSurfaceY;
    const desiredBottomY = supportSurfaceY + 1;
    return desiredBottomY - (Number(profile.minY) || 0);
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

function findTargetedPropHit(blockingDistance = null, reachDistance = MAX_REACH) {
    if (placedProps.size === 0 || propsRoot.children.length === 0) {
        return null;
    }

    const safeReachDistance = Math.max(0.5, Number(reachDistance) || MAX_REACH);
    const searchRadius = safeReachDistance + 1.2;
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
    raycaster.far = safeReachDistance;
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

function findInteractablePropHit() {
    const blockHit = findTargetedBlockHit();
    const blockDistance = blockHit?.hit?.distance ?? Number.POSITIVE_INFINITY;
    const propHit = findTargetedPropHit(blockDistance, Math.max(MAX_REACH, getPropInteractionMaxDistance(PROP_TYPE.TV_SCREEN)));
    if (!propHit) {
        return null;
    }
    if (!isInteractionDistanceValid(propHit.distance, propHit.placed.propType)) {
        return null;
    }

    const config = getPropInteractionConfig(propHit.placed.propType);
    if (!config || !config.kind || config.kind === INTERACTION_KIND.NONE) {
        return null;
    }

    return {
        ...propHit,
        config
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

    const selectedType = selectedPropType();
    if (selectedType) {
        let propTypeToPlace = selectedType;
        let selectedTvSizeInches = null;
        let propX = 0;
        let propY = 0;
        let propZ = 0;
        let hasAnchor = false;
        let forcedPropYaw = null;
        let wantsWallPlacement = isWallMountedPropType(propTypeToPlace);
        const ensureTvSizeSelected = () => {
            if (propTypeToPlace !== PROP_TYPE.TV_SCREEN && propTypeToPlace !== PROP_TYPE.TV_WALL) {
                return true;
            }
            if (selectedTvSizeInches !== null) {
                return true;
            }
            selectedTvSizeInches = promptTvSizeSelection();
            if (selectedTvSizeInches === null) {
                showToast("Colocacion TV cancelada", "info", 800);
                return false;
            }
            return true;
        };
        const getPendingTvState = () => {
            if (propTypeToPlace !== PROP_TYPE.TV_SCREEN && propTypeToPlace !== PROP_TYPE.TV_WALL) {
                return null;
            }
            const sizeInches = sanitizeTvSizeInches(selectedTvSizeInches, 200);
            return { sizeInches };
        };

        if (targetedProp && targetedProp.distance <= blockDistance + 0.001) {
            const worldNormal = getWorldNormalFromRayHit(targetedProp.hit);
            if (!worldNormal || worldNormal.y < 0.45) {
                showToast("Ese objeto no tiene una cara superior para apoyar", "warning", 1000);
                return;
            }

            propTypeToPlace = resolveContextualPropTypeForPlacement(propTypeToPlace, worldNormal);
            wantsWallPlacement = isWallMountedPropType(propTypeToPlace);
            if (!ensureTvSizeSelected()) {
                return;
            }
            if (wantsWallPlacement) {
                showToast(getWallPlacementWarning(propTypeToPlace), "warning", 1000);
                return;
            }

            propX = Math.floor(targetedProp.hit.point.x) + 0.5;
            propY = getPlacedPropSupportY(targetedProp.placed);
            propZ = Math.floor(targetedProp.hit.point.z) + 0.5;
            hasAnchor = true;
        } else if (targetedBlock) {
            const { hit, lookup } = targetedBlock;
            const normal = getWorldNormalFromRayHit(hit) || hit.face?.normal?.clone();
            if (!normal) {
                return;
            }

            propTypeToPlace = resolveContextualPropTypeForPlacement(propTypeToPlace, normal);
            wantsWallPlacement = isWallMountedPropType(propTypeToPlace);
            if (!ensureTvSizeSelected()) {
                return;
            }

            let placeX = 0;
            let placeY = 0;
            let placeZ = 0;
            if (wantsWallPlacement) {
                const horizontalStrength = Math.hypot(normal.x, normal.z);
                if (horizontalStrength < 0.1 || Math.abs(normal.y) > 0.85) {
                    showToast(getWallPlacementWarning(propTypeToPlace), "warning", 1000);
                    return;
                }
                const wallX = Math.sign(normal.x);
                const wallZ = Math.sign(normal.z);
                placeX = lookup.x + wallX;
                placeY = lookup.y - getWallMountBaseYOffset(propTypeToPlace);
                placeZ = lookup.z + wallZ;
                forcedPropYaw = snapYawToStep(Math.atan2(wallX, wallZ));
            } else {
                if (normal.y < 0.4) {
                    showToast("Los objetos se colocan sobre una superficie", "warning", 900);
                    return;
                }
                placeX = lookup.x + Math.round(normal.x);
                placeY = lookup.y + Math.round(normal.y);
                placeZ = lookup.z + Math.round(normal.z);
            }

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

            if (wantsWallPlacement) {
                const wallX = Math.sign(normal.x);
                const wallZ = Math.sign(normal.z);
                const wallOffset = getWallMountCenterOffset(propTypeToPlace);
                const pendingTvState = getPendingTvState();
                propX = placeX + 0.5 - wallX * wallOffset;
                propY = propTypeToPlace === PROP_TYPE.TV_WALL
                    ? resolveWallTvPlacementY(placeY, placeX, placeZ, pendingTvState)
                    : placeY;
                propZ = placeZ + 0.5 - wallZ * wallOffset;
            } else {
                propX = placeX + 0.5;
                propY = placeY;
                propZ = placeZ + 0.5;
            }
            hasAnchor = true;
        }

        if (!hasAnchor || !inWorldBounds(Math.floor(propX), Math.floor(propY), Math.floor(propZ))) {
            return;
        }

        if (hasPropNearPosition(propX, propY, propZ, 0.34)) {
            showToast("Ya hay un objeto en ese espacio", "warning", 900);
            return;
        }

        const propYaw = Number.isFinite(forcedPropYaw)
            ? snapYawToStep(forcedPropYaw)
            : resolvePropPlacementYaw(propTypeToPlace, propX, propZ);
        const playerBounds = {
            minX: state.playerPosition.x - PLAYER_RADIUS,
            maxX: state.playerPosition.x + PLAYER_RADIUS,
            minY: state.playerPosition.y,
            maxY: state.playerPosition.y + PLAYER_HEIGHT - 0.001,
            minZ: state.playerPosition.z - PLAYER_RADIUS,
            maxZ: state.playerPosition.z + PLAYER_RADIUS
        };
        const pendingState = getPendingTvState();
        const nextPropBounds = getPlacedPropBoundsAt(propTypeToPlace, propX, propY, propZ, propYaw, 0.001, pendingState);
        if (intersectsAabb(playerBounds, nextPropBounds)) {
            return;
        }

        const propId = addPlacedPropEntry({
            propType: propTypeToPlace,
            x: propX,
            y: propY,
            z: propZ,
            lampLevel: isLightPropType(propTypeToPlace) ? 0 : undefined,
            yaw: propYaw,
            state: pendingState || undefined
        }, "local");

        if (propId) {
            showToast(`${getPropLabel(propTypeToPlace)} colocada`, "success", 900);
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
    const label = getSelectedHotbarItem()?.label || "Slot vacio";
    showToast(`Seleccionado: ${label}`, "success", 900);
}

function tryRemoveDecorativeFloraAtCrosshair() {
    const now = performance.now();
    if (now - floraState.lastDecorRemovalAt < 120) {
        return false;
    }
    if (decorativeFloraMeshes.length === 0) {
        return false;
    }

    raycaster.setFromCamera(blockRayCenterNdc, camera);
    raycaster.far = MAX_REACH;
    const floraHits = raycaster.intersectObjects(decorativeFloraMeshes, false);
    const nearestFlora = getFirstVisibleRayHit(floraHits);
    if (!nearestFlora) {
        return false;
    }

    const blockHit = findTargetedBlockHit();
    const blockDistance = blockHit?.hit?.distance ?? Number.POSITIVE_INFINITY;
    const propHit = findTargetedPropHit(blockDistance);
    const propDistance = propHit?.distance ?? Number.POSITIVE_INFINITY;
    const blockingDistance = Math.min(blockDistance, propDistance);
    if (nearestFlora.distance > blockingDistance + 0.001) {
        return false;
    }

    const x = Math.floor(Number(nearestFlora.point?.x));
    const z = Math.floor(Number(nearestFlora.point?.z));
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return false;
    }
    const columnKey = blockColumnKey(x, z);
    if (!columnKey || removedDecorativeFloraColumns.has(columnKey) || editedColumnYIndex.has(columnKey)) {
        return false;
    }

    removedDecorativeFloraColumns.add(columnKey);
    floraState.lastDecorRemovalAt = now;
    markChunksDirtyAroundBlock(x, z);
    scheduleWorldSave();
    return true;
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

function updatePropSharedState(propId, patchState, showFeedbackText = "") {
    const id = String(propId || "");
    if (!id || !patchState || typeof patchState !== "object") {
        return false;
    }

    const placed = placedProps.get(id);
    if (!placed) {
        return false;
    }

    const mergedState = {
        ...(placed.state || {}),
        ...patchState
    };
    const normalizedState = normalizePropSharedState(placed.propType, mergedState, mergedState);
    if (!normalizedState) {
        return false;
    }

    if (arePropStatesEqual(placed.state, normalizedState)) {
        return true;
    }

    placed.state = normalizedState;
    applyPropSharedVisualState(placed);
    if (state.interactionPanelOpen && interactionState.panelPropId === id) {
        markInteractionPanelDirty();
    }
    scheduleWorldSave();
    publishPropUpsert(id);

    if (showFeedbackText) {
        showToast(showFeedbackText, "info", 1000);
    }

    return true;
}

function tryEditSignProp(propHit) {
    const placed = propHit?.placed;
    if (!placed || placed.propType !== PROP_TYPE.EDITABLE_SIGN) {
        return false;
    }

    setLocalUsingActivity(placed.id, INTERACTION_USAGE_KIND.SIGN, true);

    const previousText = sanitizeEditableSignText(placed.state?.text || "Nuestro lugar");
    const shouldReLock = controls.isLocked;
    if (shouldReLock) {
        try {
            controls.unlock();
        } catch (error) {
        }
    }

    let inputValue = null;
    try {
        inputValue = window.prompt("Texto del cartel:", previousText);
    } catch (error) {
        inputValue = previousText;
    }

    if (shouldReLock && state.worldStarted && !state.paused && !state.inventoryOpen && !state.tutorialVisible) {
        try {
            controls.lock();
        } catch (error) {
        }
    }

    if (inputValue === null) {
        clearLocalUsingActivity(true);
        return true;
    }

    const nextText = sanitizeEditableSignText(inputValue, previousText);
    const applied = updatePropSharedState(propHit.propId, { text: nextText }, "Cartel actualizado");
    clearLocalUsingActivity(true);
    return applied;
}

function tryCycleVariantProp(propHit) {
    const placed = propHit?.placed;
    if (!placed) {
        return false;
    }

    const currentVariant = sanitizeVariantIndex(placed.propType, placed.state?.variant);
    const maxVariant = Number(VARIANT_MAX_BY_PROP[placed.propType]);
    if (!Number.isFinite(maxVariant) || maxVariant <= 0) {
        return false;
    }
    const nextVariant = (currentVariant + 1) % (maxVariant + 1);
    return updatePropSharedState(propHit.propId, { variant: nextVariant }, `${getPropLabel(placed.propType)} variante ${nextVariant + 1}`);
}

function enterLocalPose(propHit, mode) {
    const placed = propHit?.placed;
    const poseMode = normalizePoseMode(mode);
    if (!placed || !poseMode) {
        return false;
    }

    if (interactionState.pose?.propId === placed.id && interactionState.pose.mode === poseMode) {
        return exitLocalPose(true);
    }

    closeInteractionPanel(false, true);
    clearLocalUsingActivity(true);
    setLocalPoseActivity(placed.id, poseMode, true);
    controls.getObject().rotation.y = Number(placed.yaw) || controls.getObject().rotation.y || 0;
    if (poseMode === "lie") {
        camera.rotation.x = -0.08;
    }
    persistPlayerStateSnapshot(true);
    showToast(poseMode === "sit" ? "Te sentaste. Shift para levantarte." : "Te acostaste. Shift para levantarte.", "info", 1300);
    return true;
}

function exitLocalPose(showFeedback = false) {
    const currentPose = interactionState.pose;
    if (!currentPose) {
        return false;
    }

    const poseMode = normalizePoseMode(currentPose.mode);
    const placed = placedProps.get(String(currentPose.propId || ""));
    const safeExit = findSafeExitPositionFromPose(placed, poseMode);
    if (safeExit) {
        state.playerPosition.x = safeExit.x;
        state.playerPosition.y = safeExit.y;
        state.playerPosition.z = safeExit.z;
    } else {
        const spawn = findSpawnPoint();
        state.playerPosition.copy(spawn);
    }

    clearLocalPoseActivity(true);
    state.keyDown.clear();
    state.velocityY = 0;
    updateOnGroundFlag();
    controls.getObject().position.set(
        state.playerPosition.x,
        state.playerPosition.y + EYE_HEIGHT,
        state.playerPosition.z
    );

    if (showFeedback) {
        showToast("Te levantaste", "info", 900);
    }
    persistPlayerStateSnapshot(true);
    return true;
}

function tryInteractAtCrosshair() {
    const propHit = findInteractablePropHit();
    if (!propHit) {
        return false;
    }

    const config = propHit.config || getPropInteractionConfig(propHit.placed.propType);
    if (!config) {
        return false;
    }

    if (config.kind === INTERACTION_KIND.SIT) {
        return enterLocalPose(propHit, "sit");
    }
    if (config.kind === INTERACTION_KIND.LIE) {
        return enterLocalPose(propHit, "lie");
    }
    if (config.kind === INTERACTION_KIND.LIGHT_CYCLE && isLightPropType(propHit.placed.propType)) {
        return cycleLampIntensity(propHit.propId, true);
    }
    if (config.kind === INTERACTION_KIND.EDIT_TEXT) {
        return tryEditSignProp(propHit);
    }
    if (config.kind === INTERACTION_KIND.CYCLE_VARIANT) {
        return tryCycleVariantProp(propHit);
    }
    if (config.kind === INTERACTION_KIND.CONTAINER_OPEN) {
        return openInteractionPanel(propHit, INTERACTION_KIND.CONTAINER_OPEN, config.usageKind || INTERACTION_USAGE_KIND.CONTAINER);
    }
    if (config.kind === INTERACTION_KIND.FURNACE_OPEN) {
        return openInteractionPanel(propHit, INTERACTION_KIND.FURNACE_OPEN, config.usageKind || INTERACTION_USAGE_KIND.FURNACE);
    }
    if (config.kind === INTERACTION_KIND.JUKEBOX_CONTROL) {
        return openInteractionPanel(propHit, INTERACTION_KIND.JUKEBOX_CONTROL, config.usageKind || INTERACTION_USAGE_KIND.JUKEBOX);
    }
    if (config.kind === INTERACTION_KIND.TV_CONTROL) {
        return openInteractionPanel(propHit, INTERACTION_KIND.TV_CONTROL, config.usageKind || INTERACTION_USAGE_KIND.TV);
    }
    if (config.kind === INTERACTION_KIND.TOGGLE_STATE && propHit.placed.propType === PROP_TYPE.FURNACE) {
        const nextLit = !Boolean(propHit.placed.state?.lit);
        return updatePropSharedState(propHit.propId, { lit: nextLit }, `Horno ${nextLit ? "encendido" : "apagado"}`);
    }

    return false;
}

function tryRemovePlacedPropAtCrosshair() {
    const propHit = findTargetedPropHit();
    if (!propHit) {
        return false;
    }

    return removePlacedPropEntry(propHit.propId, "local", true);
}

function onMouseWheel(event) {
    if (state.mapOpen && mapState.mode === MAP_MODE.GLOBAL) {
        event.preventDefault();
        const currentCenter = getGlobalMapCenter();
        const currentRange = getMapEffectiveRange(MAP_MODE.GLOBAL);
        const factor = event.deltaY > 0 ? 0.88 : 1.12;
        const nextZoom = THREE.MathUtils.clamp(
            mapState.globalZoom * factor,
            GLOBAL_MAP_MIN_ZOOM,
            GLOBAL_MAP_MAX_ZOOM
        );
        if (Math.abs(nextZoom - mapState.globalZoom) > 1e-4) {
            let anchorNormX = 0.5;
            let anchorNormY = 0.5;
            const rect = worldMapCanvasEl?.getBoundingClientRect?.();
            if (rect && rect.width > 0 && rect.height > 0) {
                const localX = event.clientX - rect.left;
                const localY = event.clientY - rect.top;
                if (localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height) {
                    anchorNormX = THREE.MathUtils.clamp(localX / rect.width, 0, 1);
                    anchorNormY = THREE.MathUtils.clamp(localY / rect.height, 0, 1);
                }
            }
            const anchorWorldX = currentCenter.x + (anchorNormX * 2 - 1) * currentRange;
            const anchorWorldZ = currentCenter.z + (anchorNormY * 2 - 1) * currentRange;
            mapState.globalZoom = nextZoom;
            const nextRange = getMapEffectiveRange(MAP_MODE.GLOBAL);
            const nextCenterX = anchorWorldX - (anchorNormX * 2 - 1) * nextRange;
            const nextCenterZ = anchorWorldZ - (anchorNormY * 2 - 1) * nextRange;
            setGlobalMapCenter(nextCenterX, nextCenterZ, nextRange);
            mapState.refreshTick = 0;
            renderMapPanelNow();
        }
        return;
    }

    if (
        !state.worldStarted
        || !state.worldReady
        || state.paused
        || state.tutorialVisible
        || state.inventoryOpen
        || state.interactionPanelOpen
        || !controls.isLocked
    ) {
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
    const typingIntoEditable = isTypingIntoEditableTarget(event.target);

    if (!typingIntoEditable && (
        event.code === "ArrowUp"
        || event.code === "ArrowDown"
        || event.code === "ArrowLeft"
        || event.code === "ArrowRight"
    )) {
        event.preventDefault();
    }

    if (!typingIntoEditable && (event.code === "F3" || event.code === "Backquote")) {
        event.preventDefault();
        setDebugVisible(!state.debugVisible, true);
        return;
    }

    if (typingIntoEditable && event.code !== "Escape") {
        return;
    }

    if (event.code === "KeyV" && isPlainHotkeyEvent(event)) {
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

        if (state.interactionPanelOpen) {
            closeInteractionPanel(false, true);
        }

        setAvatarPreviewOpen(!state.avatarPreviewOpen, true);
        return;
    }

    if (event.code === "KeyI" && isPlainHotkeyEvent(event)) {
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

    if (event.code === "KeyM" && isPlainHotkeyEvent(event)) {
        event.preventDefault();
        if (state.paused) {
            setPauseSettingsOpen(!state.pauseSettingsOpen);
            return;
        }
        if (!state.worldStarted || !state.worldReady) {
            return;
        }
        if (state.tutorialVisible) {
            closeTutorial(true);
        }
        if (state.avatarPreviewOpen) {
            setAvatarPreviewOpen(false);
        }
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        if (state.interactionPanelOpen) {
            closeInteractionPanel(false, true);
        }
        setMapOpen(!state.mapOpen, true);
        return;
    }

    if (event.code === "KeyF" && isPlainHotkeyEvent(event)) {
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
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        if (state.interactionPanelOpen) {
            closeInteractionPanel(false, true);
        }
        if (state.mapOpen && isMapBlockingGameplay()) {
            setMapOpen(false, false);
        }
        setFlightMode(!state.flightEnabled, true, true);
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

        if (state.interactionPanelOpen) {
            closeInteractionPanel(true, true);
            return;
        }

        if (state.mapOpen) {
            setMapOpen(false, true);
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

    if (event.code === INTERACTION_EXIT_KEY && interactionState.pose) {
        event.preventDefault();
        exitLocalPose(true);
        return;
    }

    if (state.paused || state.tutorialVisible || state.inventoryOpen || state.interactionPanelOpen || isMapBlockingGameplay()) {
        return;
    }

    if (state.avatarPreviewOpen) {
        if (
            event.code === "KeyW"
            || event.code === "KeyA"
            || event.code === "KeyS"
            || event.code === "KeyD"
            || event.code === INTERACTION_EXIT_KEY
        ) {
            state.keyDown.add(event.code);
        }
        return;
    }

    if (event.code === INTERACTION_KEY) {
        event.preventDefault();
        if (event.repeat || !controls.isLocked) {
            return;
        }
        if (interactionState.pose) {
            return;
        }
        if (tryInteractAtCrosshair()) {
            return;
        }
        tryHarvestSunflowerAtCrosshair();
        return;
    }

    if (interactionState.pose) {
        return;
    }

    if (/^Digit[1-9]$/.test(event.code)) {
        const idx = Number(event.code.slice(-1)) - 1;
        setSelectedHotbar(idx);
        return;
    }
    if (event.code === "Digit0") {
        setSelectedHotbar(9);
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

    if (state.paused || state.tutorialVisible || state.avatarPreviewOpen || state.inventoryOpen || state.interactionPanelOpen || isMapBlockingGameplay()) {
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
        if (tryRemoveDecorativeFloraAtCrosshair()) {
            return;
        }
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
        if (state.inventoryOpen) {
            setInventoryOpen(false);
        }
        if (state.mapOpen && isMapBlockingGameplay()) {
            setMapOpen(false);
        }
        if (state.interactionPanelOpen) {
            closeInteractionPanel(false, true);
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

    if (inventoryCategoryQuickFillButtonEl) {
        inventoryCategoryQuickFillButtonEl.addEventListener("click", () => {
            const selectedCategory = inventoryCategoryQuickFillSelectEl?.value || INVENTORY_CATEGORY.CONSTRUCTION;
            applyHotbarCategoryQuickFill(selectedCategory, true);
        });
    }

    if (mapToggleButtonEl) {
        mapToggleButtonEl.addEventListener("click", () => {
            if (!state.worldStarted || !state.worldReady) {
                return;
            }
            if (state.tutorialVisible) {
                closeTutorial(true);
            }
            setMapOpen(!state.mapOpen, true);
        });
    }

    if (mapCloseButtonEl) {
        mapCloseButtonEl.addEventListener("click", () => {
            setMapOpen(false, true);
        });
    }

    if (worldMapCanvasEl) {
        worldMapCanvasEl.addEventListener("click", onMapCanvasClick);
    }

    if (mapModeLocalButtonEl) {
        mapModeLocalButtonEl.addEventListener("click", () => {
            setMapMode(MAP_MODE.LOCAL, true);
        });
    }

    if (mapModeGlobalButtonEl) {
        mapModeGlobalButtonEl.addEventListener("click", () => {
            setMapMode(MAP_MODE.GLOBAL, true);
        });
    }

    if (mapSetPinButtonEl) {
        mapSetPinButtonEl.addEventListener("click", () => {
            setMapPinAtCurrentPosition(true);
        });
    }

    if (mapSetHomePinButtonEl) {
        mapSetHomePinButtonEl.addEventListener("click", () => {
            setMapHomePinAtCurrentPosition(true);
        });
    }

    if (mapGoPinButtonEl) {
        mapGoPinButtonEl.addEventListener("click", () => {
            goToMapPin(true);
        });
    }

    if (mapGoHomePinButtonEl) {
        mapGoHomePinButtonEl.addEventListener("click", () => {
            goToMapHomePin(true);
        });
    }

    if (mapClearPinButtonEl) {
        mapClearPinButtonEl.addEventListener("click", () => {
            clearMapPin(true);
        });
    }

    if (interactionCloseButtonEl) {
        interactionCloseButtonEl.addEventListener("click", () => {
            closeInteractionPanel(true, true);
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

    if (pauseHardResetButton) {
        pauseHardResetButton.addEventListener("click", async () => {
            pauseHardResetButton.disabled = true;
            try {
                await runHardWorldResetFlow();
            } finally {
                pauseHardResetButton.disabled = false;
            }
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

    if (graphicsModeSelectEl) {
        graphicsModeSelectEl.addEventListener("change", (event) => {
            const value = event.target?.value || GRAPHICS_MODE.AUTO;
            setGraphicsMode(value, true, true);
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

    if (flightModeToggleEl) {
        flightModeToggleEl.addEventListener("change", (event) => {
            const enabled = Boolean(event.target?.checked);
            setFlightMode(enabled, true, true);
        });
    }

    if (tutorialCloseButton) {
        tutorialCloseButton.addEventListener("click", () => {
            closeTutorial(true);
        });
    }

    window.addEventListener("beforeunload", () => {
        persistPlayerStateSnapshot(true);
        clearAllTemporaryInteractionState(false);
        clearInteractionPanelState();
        flushWorldSave(true);
        flushCloudEditWrites();
        flushCloudPropWrites();
        publishWildlifeSnapshot(true);
        clearChunkEditSubscriptions();
        clearPropSnapshotSubscription();
        clearWildlifeSnapshotSubscription();
        clearWildlife();
        clearFish();
        clearSunflowers();
        clearPlacedProps();
        clearAvatarRoot(localAvatarPreviewRoot);
    });
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 1 / 30);
    state.playerStateSaveTick += delta;
    if (!state.paused) {
        state.chunkTick += delta;
        state.autoSaveTick += delta;
    }
    updateAdaptiveQuality(delta);

    if (state.worldStarted && !state.paused && !state.avatarPreviewOpen && !state.inventoryOpen && !isMapBlockingGameplay() && !state.interactionPanelOpen) {
        updatePlayer(delta);
    }

    updateSky(delta);
    if (!state.paused) {
        updateWildlife(delta);
        updateFish(delta);
        updateSunflowers(delta);
        if (multiplayer.ready && multiplayer.isWildlifeAuthority) {
            publishWildlifeSnapshot(false);
        }
    }
    if (state.worldStarted && state.worldReady) {
        updateActiveLampShadowCasters(delta);
        updateJukeboxSpatialAudio();
        updateTvScreens();
    }

    updateChunkStreaming(false);
    const budget = getDynamicChunkBuildBudget();
    if (budget > 0) {
        const frameBudgetMs = getDynamicChunkBuildFrameBudgetMs();
        processChunkRebuildQueue(budget, frameBudgetMs);
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
    if (state.playerStateSaveTick >= PLAYER_STATE_SAVE_INTERVAL_SECONDS) {
        persistPlayerStateSnapshot(false);
    }

    updateAvatarPreviewCamera(delta);
    updateInteractionPanel(delta);
    updateMapPanel(delta);
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
    const column = getColumnInfo(sx, sz);
    const spawnY = clampInt(column.height + 1, 2, WORLD_MAX_Y - 2);

    for (let y = spawnY; y >= 1; y -= 1) {
        const id = getBlock(sx, y, sz);
        if (isSolidBlock(id)) {
            return new THREE.Vector3(sx + 0.5, y + 1.01, sz + 0.5);
        }
    }

    return new THREE.Vector3(0.5, SEA_LEVEL + 6, 0.5);
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
    loadJukeboxCustomTracksFromStorage();
    loadMapPinFromStorage();
    populateInventoryCategoryQuickFillOptions();
    updateMapModeButtons();
    updateMapPanelLayout();
    if (pauseButton) {
        pauseButton.classList.add("hidden");
    }

    const loadedEdits = loadWorldFromStorage();
    if (loadedEdits > 0) {
        setBootStatus(`Cargados ${loadedEdits} cambios guardados.`);
    } else {
        setBootStatus("Generando mundo por chunks...");
    }

    const savedPlayerState = loadPlayerStateSnapshot();
    const restoredPlayerState = savedPlayerState ? restoreLocalPlayerStateFromSnapshot(savedPlayerState) : false;
    if (!restoredPlayerState) {
        const spawn = findSpawnPoint();
        state.playerPosition.copy(spawn);
        controls.getObject().position.set(spawn.x, spawn.y + EYE_HEIGHT, spawn.z);
    }
    camera.position.set(0, 0, 0);

    refreshHotbarUi();
    renderInventoryUi();
    updateSunflowerCurrencyHud();
    setupEvents();

    updateChunkStreaming(true);
    processChunkRebuildQueue(INITIAL_CHUNK_BUILD_BUDGET);
    initWildlife();
    initFish();
    initSunflowers();

    setupRealtimeMultiplayer();

    if (helpMiniEl) {
        helpMiniEl.textContent = "WASD mover - Mouse mirar - Click izq minar - Click der colocar - E interactuar/cosechar - Shift salir de pose - Espacio saltar - F vuelo - Rueda o 1-9/0 material - I inventario - M mapa (global: click pin y rueda zoom donde apuntes) - F3 debug - V ver avatar - ESC pausa";
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
