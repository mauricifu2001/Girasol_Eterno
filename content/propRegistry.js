export const PROP_TYPE = Object.freeze({
    CHAIR: "chair",
    TABLE: "table",
    LAMP: "lamp",
    PLANTER: "planter",
    CHEST: "chest",
    BED: "bed",
    FENCE: "fence",
    LANTERN: "lantern"
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
        visual: { tint: "rgba(177, 140, 92, 0.42)" },
        profile: {
            halfExtents: { x: 0.28, z: 0.28 },
            minY: 0,
            maxY: 0.99,
            supportY: 0.49
        }
    },
    {
        id: PROP_TYPE.TABLE,
        label: "Mesa",
        category: "furniture",
        tags: ["furniture", "surface"],
        visual: { tint: "rgba(194, 152, 104, 0.42)" },
        profile: {
            halfExtents: { x: 0.49, z: 0.47 },
            minY: 0,
            maxY: 0.78,
            supportY: 0.76
        }
    },
    {
        id: PROP_TYPE.LAMP,
        label: "Lampara",
        category: "utility",
        tags: ["light", "interior"],
        emitsLight: true,
        lightCycle: true,
        visual: { tint: "rgba(221, 192, 122, 0.42)" },
        profile: {
            halfExtents: { x: 0.16, z: 0.16 },
            minY: 0,
            maxY: 1.02,
            supportY: 1
        }
    },
    {
        id: PROP_TYPE.PLANTER,
        label: "Maceta",
        category: "furniture",
        tags: ["nature", "decor"],
        visual: { tint: "rgba(150, 196, 132, 0.42)" },
        profile: {
            halfExtents: { x: 0.27, z: 0.27 },
            minY: 0,
            maxY: 0.62,
            supportY: 0.42
        }
    },
    {
        id: PROP_TYPE.CHEST,
        label: "Cofre",
        category: "utility",
        tags: ["storage", "wood"],
        visual: { tint: "rgba(173, 132, 82, 0.44)" },
        profile: {
            halfExtents: { x: 0.38, z: 0.28 },
            minY: 0,
            maxY: 0.56,
            supportY: 0.54
        }
    },
    {
        id: PROP_TYPE.BED,
        label: "Cama",
        category: "furniture",
        tags: ["rest", "interior"],
        visual: { tint: "rgba(196, 138, 146, 0.42)" },
        profile: {
            halfExtents: { x: 0.46, z: 0.92 },
            minY: 0,
            maxY: 0.54,
            supportY: 0.52
        }
    },
    {
        id: PROP_TYPE.FENCE,
        label: "Cerca",
        category: "construction",
        tags: ["construction", "boundary"],
        visual: { tint: "rgba(156, 120, 84, 0.43)" },
        profile: {
            halfExtents: { x: 0.16, z: 0.16 },
            minY: 0,
            maxY: 1.02,
            supportY: 1
        }
    },
    {
        id: PROP_TYPE.LANTERN,
        label: "Farol",
        category: "utility",
        tags: ["light", "outdoor"],
        emitsLight: true,
        lightCycle: true,
        visual: { tint: "rgba(223, 184, 106, 0.44)" },
        profile: {
            halfExtents: { x: 0.2, z: 0.2 },
            minY: 0,
            maxY: 1.04,
            supportY: 1
        }
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
    }

    return issues;
}
