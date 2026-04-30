export const PROP_TYPE = Object.freeze({
    CHAIR: "chair",
    TABLE: "table",
    LAMP: "lamp",
    PLANTER: "planter",
    CHEST: "chest",
    BED: "bed",
    FENCE: "fence",
    LANTERN: "lantern",
    TORCH: "torch",
    BOOKSHELF: "bookshelf",
    BARREL: "barrel",
    WOOD_CRATE: "wood_crate",
    RUG: "rug",
    PAINTING: "painting",
    CURTAINS: "curtains",
    WALL_LANTERN: "wall_lantern",
    WALL_TORCH: "wall_torch",
    LIGHT_POST: "light_post",
    BENCH: "bench",
    PICNIC_TABLE: "picnic_table",
    FOUNTAIN: "fountain",
    CAMPFIRE: "campfire",
    CAMPFIRE_MEDIUM: "campfire_medium",
    CAMPFIRE_LARGE: "campfire_large",
    LARGE_CHEST: "large_chest",
    FURNACE: "furnace",
    EDITABLE_SIGN: "editable_sign",
    JUKEBOX: "jukebox",
    TV_SCREEN: "tv_screen",
    TV_WALL: "tv_wall",
    GIANT_SUNFLOWER: "giant_sunflower",
    RABBIT_HOUSE: "rabbit_house",
    KART: "kart",
    RACE_BARRIER: "race_barrier",
    RACE_CURB: "race_curb",
    RACE_FINISH_LINE: "race_finish_line",
    RACE_CHECKPOINT: "race_checkpoint",
    RACE_BOOST_PAD: "race_boost_pad",
    RACE_RAMP_LOW: "race_ramp_low",
    RACE_RAMP_MEDIUM: "race_ramp_medium",
    RACE_RAMP_HIGH: "race_ramp_high"
});

const PROP_KIND = "prop";

function makePropDefinition(raw) {
    return {
        id: String(raw.id || ""),
        key: String(raw.key || raw.id || ""),
        label: String(raw.label || ""),
        kind: PROP_KIND,
        category: String(raw.category || ""),
        tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag)) : [],
        visual: {
            tint: String(raw.visual?.tint || "rgba(150, 196, 132, 0.42)")
        },
        solid: raw.solid !== false,
        transparent: Boolean(raw.transparent),
        emitsLight: Boolean(raw.emitsLight),
        liquid: Boolean(raw.liquid),
        placeable: raw.placeable !== false,
        mineable: raw.mineable !== false,
        lightCycle: Boolean(raw.lightCycle),
        interaction: String(raw.interaction || ""),
        stateDefaults: raw.stateDefaults && typeof raw.stateDefaults === "object"
            ? { ...raw.stateDefaults }
            : {},
        profile: {
            halfExtents: {
                x: Number(raw.profile?.halfExtents?.x ?? 0.25),
                z: Number(raw.profile?.halfExtents?.z ?? 0.25)
            },
            minY: Number(raw.profile?.minY ?? 0),
            maxY: Number(raw.profile?.maxY ?? 1),
            supportY: Number(raw.profile?.supportY ?? 0.5)
        },
        inventory: {
            enabled: raw.inventory?.enabled !== false,
            order: Number.isFinite(raw.inventory?.order) ? Number(raw.inventory.order) : 999
        },
        builderKey: String(raw.builderKey || raw.id || "")
    };
}

const RAW_PROP_DEFINITIONS = [
    {
        id: PROP_TYPE.CHAIR,
        label: "Silla",
        category: "furniture",
        tags: ["furniture", "seat"],
        interaction: "sit",
        visual: { tint: "rgba(177, 140, 92, 0.42)" },
        profile: { halfExtents: { x: 0.28, z: 0.28 }, minY: 0, maxY: 0.99, supportY: 0.49 }
    },
    {
        id: PROP_TYPE.TABLE,
        label: "Mesa",
        category: "furniture",
        tags: ["furniture", "surface"],
        visual: { tint: "rgba(194, 152, 104, 0.42)" },
        profile: { halfExtents: { x: 0.49, z: 0.47 }, minY: 0, maxY: 0.78, supportY: 0.76 }
    },
    {
        id: PROP_TYPE.LAMP,
        label: "Lampara",
        category: "utility",
        tags: ["light", "interior"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(221, 192, 122, 0.42)" },
        profile: { halfExtents: { x: 0.16, z: 0.16 }, minY: 0, maxY: 1.02, supportY: 1 }
    },
    {
        id: PROP_TYPE.PLANTER,
        label: "Maceta",
        category: "furniture",
        tags: ["nature", "decor"],
        visual: { tint: "rgba(150, 196, 132, 0.42)" },
        profile: { halfExtents: { x: 0.27, z: 0.27 }, minY: 0, maxY: 0.62, supportY: 0.42 }
    },
    {
        id: PROP_TYPE.CHEST,
        label: "Cofre",
        category: "utility",
        tags: ["storage", "wood"],
        interaction: "container-open",
        stateDefaults: { items: ["", "", "", "", "", ""] },
        visual: { tint: "rgba(173, 132, 82, 0.44)" },
        profile: { halfExtents: { x: 0.38, z: 0.28 }, minY: 0, maxY: 0.56, supportY: 0.54 }
    },
    {
        id: PROP_TYPE.BED,
        label: "Cama",
        category: "furniture",
        tags: ["rest", "interior"],
        interaction: "lie",
        visual: { tint: "rgba(196, 138, 146, 0.42)" },
        profile: { halfExtents: { x: 0.46, z: 0.92 }, minY: 0, maxY: 0.54, supportY: 0.52 }
    },
    {
        id: PROP_TYPE.FENCE,
        label: "Cerca",
        category: "construction",
        tags: ["construction", "boundary"],
        visual: { tint: "rgba(156, 120, 84, 0.43)" },
        profile: { halfExtents: { x: 0.16, z: 0.16 }, minY: 0, maxY: 1.02, supportY: 1 }
    },
    {
        id: PROP_TYPE.LANTERN,
        label: "Farol",
        category: "utility",
        tags: ["light", "outdoor"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(223, 184, 106, 0.44)" },
        profile: { halfExtents: { x: 0.2, z: 0.2 }, minY: 0, maxY: 1.04, supportY: 1 }
    },
    {
        id: PROP_TYPE.TORCH,
        label: "Antorcha",
        category: "utility",
        tags: ["light", "torch", "outdoor"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(233, 181, 96, 0.44)" },
        profile: { halfExtents: { x: 0.12, z: 0.12 }, minY: 0, maxY: 0.96, supportY: 0.94 }
    },
    {
        id: PROP_TYPE.BOOKSHELF,
        label: "Estanteria",
        category: "furniture",
        tags: ["storage", "books"],
        visual: { tint: "rgba(176, 134, 93, 0.42)" },
        profile: { halfExtents: { x: 0.44, z: 0.2 }, minY: 0, maxY: 1.2, supportY: 1.18 }
    },
    {
        id: PROP_TYPE.BARREL,
        label: "Barril",
        category: "utility",
        tags: ["storage", "wood"],
        visual: { tint: "rgba(149, 109, 74, 0.43)" },
        profile: { halfExtents: { x: 0.28, z: 0.28 }, minY: 0, maxY: 0.74, supportY: 0.72 }
    },
    {
        id: PROP_TYPE.WOOD_CRATE,
        label: "Caja de madera",
        category: "utility",
        tags: ["storage", "wood"],
        visual: { tint: "rgba(172, 126, 82, 0.42)" },
        profile: { halfExtents: { x: 0.34, z: 0.34 }, minY: 0, maxY: 0.5, supportY: 0.48 }
    },
    {
        id: PROP_TYPE.RUG,
        label: "Alfombra",
        category: "furniture",
        tags: ["decor", "floor"],
        solid: false,
        visual: { tint: "rgba(186, 101, 120, 0.34)" },
        profile: { halfExtents: { x: 0.48, z: 0.48 }, minY: 0, maxY: 0.04, supportY: 0.04 }
    },
    {
        id: PROP_TYPE.PAINTING,
        label: "Cuadro",
        category: "furniture",
        tags: ["decor", "art"],
        solid: false,
        interaction: "cycle-variant",
        stateDefaults: { variant: 0 },
        visual: { tint: "rgba(163, 125, 88, 0.36)" },
        profile: { halfExtents: { x: 0.44, z: 0.08 }, minY: 0, maxY: 0.86, supportY: 0.82 }
    },
    {
        id: PROP_TYPE.CURTAINS,
        label: "Cortinas",
        category: "furniture",
        tags: ["decor", "cloth"],
        solid: false,
        interaction: "cycle-variant",
        stateDefaults: { variant: 0 },
        visual: { tint: "rgba(206, 155, 176, 0.34)" },
        profile: { halfExtents: { x: 0.46, z: 0.03 }, minY: 0, maxY: 1.04, supportY: 1.02 }
    },
    {
        id: PROP_TYPE.WALL_LANTERN,
        label: "Farol de pared",
        category: "utility",
        tags: ["light", "wall"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(220, 178, 98, 0.44)" },
        profile: { halfExtents: { x: 0.2, z: 0.15 }, minY: 0, maxY: 0.92, supportY: 0.88 }
    },
    {
        id: PROP_TYPE.WALL_TORCH,
        label: "Antorcha de pared",
        category: "utility",
        tags: ["light", "wall", "torch"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(233, 175, 93, 0.44)" },
        profile: { halfExtents: { x: 0.14, z: 0.11 }, minY: 0, maxY: 0.92, supportY: 0.88 },
        inventory: { enabled: false }
    },
    {
        id: PROP_TYPE.LIGHT_POST,
        label: "Poste de luz",
        category: "utility",
        tags: ["light", "outdoor", "street"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(201, 175, 125, 0.44)" },
        profile: { halfExtents: { x: 0.2, z: 0.2 }, minY: 0, maxY: 1.72, supportY: 1.68 }
    },
    {
        id: PROP_TYPE.BENCH,
        label: "Banco",
        category: "furniture",
        tags: ["seat", "outdoor"],
        interaction: "sit",
        visual: { tint: "rgba(161, 120, 82, 0.42)" },
        profile: { halfExtents: { x: 0.52, z: 0.26 }, minY: 0, maxY: 0.88, supportY: 0.86 }
    },
    {
        id: PROP_TYPE.PICNIC_TABLE,
        label: "Mesa picnic",
        category: "furniture",
        tags: ["table", "outdoor"],
        visual: { tint: "rgba(170, 125, 78, 0.43)" },
        profile: { halfExtents: { x: 0.62, z: 0.62 }, minY: 0, maxY: 0.82, supportY: 0.8 }
    },
    {
        id: PROP_TYPE.FOUNTAIN,
        label: "Fuente",
        category: "construction",
        tags: ["water", "decor"],
        visual: { tint: "rgba(128, 154, 183, 0.42)" },
        profile: { halfExtents: { x: 0.48, z: 0.48 }, minY: 0, maxY: 1.02, supportY: 0.96 }
    },
    {
        id: PROP_TYPE.CAMPFIRE,
        label: "Fogata",
        category: "utility",
        tags: ["light", "fire", "outdoor"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(210, 126, 78, 0.44)" },
        profile: { halfExtents: { x: 0.3, z: 0.3 }, minY: 0, maxY: 0.52, supportY: 0.5 }
    },
    {
        id: PROP_TYPE.CAMPFIRE_MEDIUM,
        label: "Fogata mediana",
        category: "utility",
        tags: ["light", "fire", "outdoor", "medium"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(214, 132, 82, 0.44)" },
        profile: { halfExtents: { x: 0.41, z: 0.41 }, minY: 0, maxY: 0.7, supportY: 0.66 }
    },
    {
        id: PROP_TYPE.CAMPFIRE_LARGE,
        label: "Fogata grande",
        category: "utility",
        tags: ["light", "fire", "outdoor", "large"],
        emitsLight: true,
        lightCycle: true,
        interaction: "light-cycle",
        visual: { tint: "rgba(218, 138, 86, 0.44)" },
        profile: { halfExtents: { x: 0.54, z: 0.54 }, minY: 0, maxY: 0.92, supportY: 0.86 }
    },
    {
        id: PROP_TYPE.LARGE_CHEST,
        label: "Cofre grande",
        category: "utility",
        tags: ["storage", "wood", "large"],
        interaction: "container-open",
        stateDefaults: { items: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        visual: { tint: "rgba(181, 136, 92, 0.44)" },
        profile: { halfExtents: { x: 0.56, z: 0.34 }, minY: 0, maxY: 0.64, supportY: 0.6 }
    },
    {
        id: PROP_TYPE.FURNACE,
        label: "Horno",
        category: "utility",
        tags: ["craft", "stone", "interactive"],
        interaction: "furnace-open",
        stateDefaults: { lit: false, input: "", fuel: 0 },
        visual: { tint: "rgba(127, 128, 136, 0.44)" },
        profile: { halfExtents: { x: 0.36, z: 0.36 }, minY: 0, maxY: 0.64, supportY: 0.62 }
    },
    {
        id: PROP_TYPE.EDITABLE_SIGN,
        label: "Cartel editable",
        category: "construction",
        tags: ["interactive", "text", "sign"],
        interaction: "edit-text",
        stateDefaults: { text: "Nuestro lugar" },
        visual: { tint: "rgba(173, 129, 78, 0.43)" },
        profile: { halfExtents: { x: 0.34, z: 0.12 }, minY: 0, maxY: 1.12, supportY: 1.08 }
    },
    {
        id: PROP_TYPE.JUKEBOX,
        label: "Jukebox",
        category: "utility",
        tags: ["interactive", "music"],
        interaction: "jukebox-control",
        stateDefaults: {
            playing: false,
            track: 0,
            source: "local-playlist-v1",
            tracks: [
                { type: "local", value: "", label: "" },
                { type: "local", value: "", label: "" },
                { type: "local", value: "", label: "" },
                { type: "local", value: "", label: "" }
            ]
        },
        visual: { tint: "rgba(128, 88, 64, 0.44)" },
        profile: { halfExtents: { x: 0.34, z: 0.34 }, minY: 0, maxY: 0.62, supportY: 0.6 }
    },
    {
        id: PROP_TYPE.TV_SCREEN,
        label: "TV plasma",
        category: "utility",
        tags: ["interactive", "video", "screen"],
        interaction: "tv-control",
        stateDefaults: {
            powered: false,
            youtubeId: "",
            playbackStartedAtMs: 0,
            paused: false,
            pauseAtSeconds: 0,
            title: "",
            sizeInches: 200
        },
        visual: { tint: "rgba(106, 138, 172, 0.42)" },
        profile: { halfExtents: { x: 9.4, z: 2.2 }, minY: 0, maxY: 13.8, supportY: 0.6 }
    },
    {
        id: PROP_TYPE.TV_WALL,
        label: "TV plasma pared",
        category: "utility",
        tags: ["interactive", "video", "screen", "wall"],
        interaction: "tv-control",
        stateDefaults: {
            powered: false,
            youtubeId: "",
            playbackStartedAtMs: 0,
            paused: false,
            pauseAtSeconds: 0,
            title: "",
            sizeInches: 200
        },
        visual: { tint: "rgba(106, 138, 172, 0.42)" },
        profile: { halfExtents: { x: 9.4, z: 0.7 }, minY: 0, maxY: 10.8, supportY: 5.2 },
        inventory: { enabled: false }
    },
    {
        id: PROP_TYPE.GIANT_SUNFLOWER,
        label: "Girasol gigante",
        category: "nature",
        tags: ["nature", "flower"],
        solid: false,
        visual: { tint: "rgba(205, 178, 74, 0.42)" },
        profile: { halfExtents: { x: 0.3, z: 0.3 }, minY: 0, maxY: 1.92, supportY: 1.88 }
    },
    {
        id: PROP_TYPE.RABBIT_HOUSE,
        label: "Casa de conejos",
        category: "nature",
        tags: ["rabbit", "decor", "outdoor"],
        visual: { tint: "rgba(167, 126, 93, 0.42)" },
        profile: { halfExtents: { x: 0.54, z: 0.42 }, minY: 0, maxY: 0.72, supportY: 0.7 }
    },
    {
        id: PROP_TYPE.KART,
        label: "Kart",
        category: "racing",
        tags: ["kart", "race", "vehicle", "sports"],
        interaction: "kart-drive",
        stateDefaults: { color: "cyan" },
        visual: { tint: "rgba(66, 192, 221, 0.44)" },
        profile: { halfExtents: { x: 0.9, z: 1.04 }, minY: 0, maxY: 1.28, supportY: 0.36 }
    },
    {
        id: PROP_TYPE.RACE_BARRIER,
        label: "Barrera de pista",
        category: "racing",
        tags: ["race", "barrier", "track"],
        visual: { tint: "rgba(220, 80, 74, 0.42)" },
        profile: { halfExtents: { x: 0.78, z: 0.24 }, minY: 0, maxY: 1.18, supportY: 1.14 }
    },
    {
        id: PROP_TYPE.RACE_CURB,
        label: "Piano de pista",
        category: "racing",
        tags: ["race", "curb", "track"],
        solid: false,
        visual: { tint: "rgba(228, 226, 222, 0.42)" },
        profile: { halfExtents: { x: 0.5, z: 0.26 }, minY: 0, maxY: 0.12, supportY: 0.08 }
    },
    {
        id: PROP_TYPE.RACE_FINISH_LINE,
        label: "Meta",
        category: "racing",
        tags: ["race", "finish", "checkpoint"],
        solid: false,
        visual: { tint: "rgba(245, 228, 127, 0.36)" },
        profile: { halfExtents: { x: 1.7, z: 0.24 }, minY: 0, maxY: 2.36, supportY: 0.04 }
    },
    {
        id: PROP_TYPE.RACE_CHECKPOINT,
        label: "Checkpoint",
        category: "racing",
        tags: ["race", "checkpoint", "lap"],
        solid: false,
        visual: { tint: "rgba(90, 198, 241, 0.36)" },
        profile: { halfExtents: { x: 1.62, z: 0.24 }, minY: 0, maxY: 2.12, supportY: 0.04 }
    },
    {
        id: PROP_TYPE.RACE_BOOST_PAD,
        label: "Boost pad",
        category: "racing",
        tags: ["race", "boost", "track", "speed"],
        solid: false,
        visual: { tint: "rgba(107, 194, 255, 0.40)" },
        profile: { halfExtents: { x: 0.5, z: 0.5 }, minY: 0, maxY: 0.08, supportY: 0.05 }
    },
    {
        id: PROP_TYPE.RACE_RAMP_LOW,
        label: "Rampa baja",
        category: "racing",
        tags: ["race", "ramp", "track", "low"],
        visual: { tint: "rgba(194, 196, 202, 0.42)" },
        profile: { halfExtents: { x: 0.5, z: 0.5 }, minY: 0, maxY: 0.34, supportY: 0.12 }
    },
    {
        id: PROP_TYPE.RACE_RAMP_MEDIUM,
        label: "Rampa media",
        category: "racing",
        tags: ["race", "ramp", "track", "medium"],
        visual: { tint: "rgba(179, 183, 191, 0.42)" },
        profile: { halfExtents: { x: 0.5, z: 0.5 }, minY: 0, maxY: 0.66, supportY: 0.2 }
    },
    {
        id: PROP_TYPE.RACE_RAMP_HIGH,
        label: "Rampa alta",
        category: "racing",
        tags: ["race", "ramp", "track", "high"],
        visual: { tint: "rgba(160, 166, 178, 0.42)" },
        profile: { halfExtents: { x: 0.5, z: 0.5 }, minY: 0, maxY: 1.02, supportY: 0.24 }
    }
];

export const PROP_DEFINITIONS = Object.freeze(RAW_PROP_DEFINITIONS.map((raw) => Object.freeze(makePropDefinition(raw))));

const byId = new Map();
for (const definition of PROP_DEFINITIONS) {
    byId.set(definition.id, definition);
}

export const propRegistry = Object.freeze({
    definitions: PROP_DEFINITIONS,
    byId
});

export const VALID_PROP_TYPES = new Set(PROP_DEFINITIONS.map((definition) => definition.id));

export const PROP_PROFILES = Object.freeze(
    Object.fromEntries(PROP_DEFINITIONS.map((definition) => [definition.id, definition.profile]))
);

export const LIGHT_PROP_TYPES = new Set(
    PROP_DEFINITIONS.filter((definition) => definition.emitsLight && definition.lightCycle).map((definition) => definition.id)
);

export function getPropDefinition(propType) {
    return propRegistry.byId.get(String(propType || "")) || null;
}

export function isValidPropType(propType) {
    return VALID_PROP_TYPES.has(String(propType || ""));
}

export function isLightPropType(propType) {
    return LIGHT_PROP_TYPES.has(String(propType || ""));
}

export function validatePropRegistry() {
    const issues = [];
    const seenIds = new Set();

    for (const definition of PROP_DEFINITIONS) {
        if (!definition.id) {
            issues.push("Prop sin id");
        }
        if (seenIds.has(definition.id)) {
            issues.push(`Prop id duplicado: ${definition.id}`);
        }
        seenIds.add(definition.id);

        if (!definition.label) {
            issues.push(`Prop sin label: ${definition.id}`);
        }
        if (!definition.category) {
            issues.push(`Prop sin categoria: ${definition.id}`);
        }
        if (!definition.builderKey) {
            issues.push(`Prop sin builderKey: ${definition.id}`);
        }
        if (!definition.profile || !Number.isFinite(definition.profile.maxY)) {
            issues.push(`Prop sin profile valido: ${definition.id}`);
        }
        if (definition.liquid && definition.solid) {
            issues.push(`Flags incompatibles (liquido + solido): ${definition.id}`);
        }
        if (!definition.placeable && definition.inventory?.enabled) {
            issues.push(`Prop no placeable no deberia estar en inventario: ${definition.id}`);
        }
        if (definition.emitsLight && !definition.lightCycle) {
            issues.push(`Prop emite luz sin control de niveles: ${definition.id}`);
        }
        if (definition.stateDefaults && typeof definition.stateDefaults !== "object") {
            issues.push(`Prop con stateDefaults invalido: ${definition.id}`);
        }
    }

    return issues;
}
