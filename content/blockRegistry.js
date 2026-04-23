export const BLOCK = Object.freeze({
    AIR: 0,
    BEDROCK: 1,
    STONE: 2,
    DIRT: 3,
    GRASS: 4,
    WOOD: 5,
    LEAVES: 6,
    SAND: 7,
    WATER: 8,
    GLASS: 9,
    COBBLESTONE: 10,
    STONE_BRICKS: 11,
    MARBLE: 12,
    BASALT: 13,
    GRAVEL: 14,
    MUD: 15,
    SNOW: 16,
    ICE: 17,
    DARK_PLANKS: 18,
    BAMBOO: 19,
    TINTED_GLASS: 20,
    GLOW_BLOCK: 21,
    MOSSY_COBBLESTONE: 22,
    DARK_BRICK: 23,
    BLACK_MARBLE: 24,
    SLATE: 25,
    VOLCANIC_STONE: 26,
    COPPER: 27,
    OXIDIZED_COPPER: 28,
    TERRACOTTA: 29,
    ROOF_TILES: 30,
    WHITE_PLASTER: 31,
    PINK_PLASTER: 32,
    LIGHT_WOOD: 33,
    REDDISH_WOOD: 34,
    PINK_LEAVES: 35,
    AMBER_GLASS: 36,
    BLUE_GLASS: 37,
    LAVA: 38,
    ASH: 39,
    OBSIDIAN: 40
});

const BLOCK_KIND = "block";

function makeBlockDefinition(raw) {
    const visual = raw.visual || {};
    return {
        id: raw.id,
        key: String(raw.key || ""),
        label: String(raw.label || ""),
        kind: BLOCK_KIND,
        category: String(raw.category || ""),
        tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag)) : [],
        visual: {
            color: Number(visual.color ?? 0x9fb2c5),
            textureStyle: String(visual.textureStyle || "default"),
            roughness: Number.isFinite(visual.roughness) ? Number(visual.roughness) : 0.9,
            metalness: Number.isFinite(visual.metalness) ? Number(visual.metalness) : 0,
            opacity: Number.isFinite(visual.opacity) ? Number(visual.opacity) : 1,
            emissive: Number(visual.emissive ?? 0x000000),
            emissiveIntensity: Number.isFinite(visual.emissiveIntensity) ? Number(visual.emissiveIntensity) : 0,
            useTexture: visual.useTexture !== false,
            inventoryTint: String(visual.inventoryTint || ""),
            renderOrder: Number.isFinite(visual.renderOrder) ? Number(visual.renderOrder) : 1
        },
        solid: raw.solid !== false,
        transparent: Boolean(raw.transparent),
        emitsLight: Boolean(raw.emitsLight),
        liquid: Boolean(raw.liquid),
        placeable: raw.placeable !== false,
        mineable: raw.mineable !== false,
        inventory: {
            enabled: raw.inventory?.enabled !== false,
            order: Number.isFinite(raw.inventory?.order) ? Number(raw.inventory.order) : 999
        }
    };
}

const RAW_BLOCK_DEFINITIONS = [
    {
        id: BLOCK.AIR,
        key: "air",
        label: "Aire",
        category: "internal",
        tags: ["internal", "non-placeable"],
        solid: false,
        transparent: true,
        emitsLight: false,
        liquid: false,
        placeable: false,
        mineable: false,
        inventory: { enabled: false },
        visual: { color: 0x000000, textureStyle: "default", opacity: 0, useTexture: false, renderOrder: 0 }
    },
    {
        id: BLOCK.BEDROCK,
        key: "bedrock",
        label: "Roca base",
        category: "internal",
        tags: ["rock", "internal", "non-placeable"],
        solid: true,
        transparent: false,
        emitsLight: false,
        liquid: false,
        placeable: false,
        mineable: false,
        inventory: { enabled: false },
        visual: { color: 0x3b3b41, textureStyle: "bedrock", roughness: 0.96, metalness: 0.02 }
    },
    {
        id: BLOCK.STONE,
        key: "stone",
        label: "Piedra",
        category: "terrain",
        tags: ["rock", "base"],
        visual: { color: 0x77777f, textureStyle: "stone" }
    },
    {
        id: BLOCK.DIRT,
        key: "dirt",
        label: "Tierra",
        category: "terrain",
        tags: ["ground", "earth"],
        visual: { color: 0x6c4d31, textureStyle: "dirt", roughness: 0.95 }
    },
    {
        id: BLOCK.GRASS,
        key: "grass",
        label: "Cesped",
        category: "nature",
        tags: ["ground", "nature"],
        visual: { color: 0x4d8a3f, textureStyle: "grass", roughness: 0.86 }
    },
    {
        id: BLOCK.WOOD,
        key: "wood",
        label: "Madera",
        category: "nature",
        tags: ["wood", "tree"],
        visual: { color: 0x8b633d, textureStyle: "wood", roughness: 0.95 }
    },
    {
        id: BLOCK.LEAVES,
        key: "leaves",
        label: "Hojas",
        category: "nature",
        tags: ["nature", "foliage"],
        visual: { color: 0x3c7b3f, textureStyle: "leaves", roughness: 0.86 }
    },
    {
        id: BLOCK.SAND,
        key: "sand",
        label: "Arena",
        category: "terrain",
        tags: ["ground", "sand"],
        visual: { color: 0xd4bf8d, textureStyle: "sand", roughness: 0.95 }
    },
    {
        id: BLOCK.WATER,
        key: "water",
        label: "Agua",
        category: "liquids",
        tags: ["liquid", "water"],
        solid: false,
        transparent: true,
        emitsLight: false,
        liquid: true,
        placeable: true,
        mineable: true,
        visual: {
            color: 0x4f8dff,
            textureStyle: "water",
            roughness: 0.18,
            metalness: 0.03,
            opacity: 0.76,
            emissive: 0x123a74,
            emissiveIntensity: 0.14,
            useTexture: false,
            renderOrder: 4
        }
    },
    {
        id: BLOCK.GLASS,
        key: "glass",
        label: "Vidrio",
        category: "liquids",
        tags: ["transparent", "glass"],
        solid: true,
        transparent: true,
        emitsLight: false,
        liquid: false,
        visual: {
            color: 0xc8e8ff,
            textureStyle: "glass",
            roughness: 0.18,
            metalness: 0.01,
            opacity: 0.34,
            renderOrder: 3
        }
    },
    {
        id: BLOCK.COBBLESTONE,
        key: "cobblestone",
        label: "Adoquin",
        category: "construction",
        tags: ["rock", "construction"],
        visual: { color: 0x7a7c86, textureStyle: "cobblestone", roughness: 0.93 }
    },
    {
        id: BLOCK.STONE_BRICKS,
        key: "stone_bricks",
        label: "Ladrillo de piedra",
        category: "construction",
        tags: ["rock", "brick", "construction"],
        visual: { color: 0x8a8d95, textureStyle: "stone_bricks", roughness: 0.92 }
    },
    {
        id: BLOCK.MARBLE,
        key: "marble",
        label: "Marmol",
        category: "construction",
        tags: ["stone", "luxury"],
        visual: { color: 0xe2e5ea, textureStyle: "marble", roughness: 0.58, metalness: 0.03 }
    },
    {
        id: BLOCK.BASALT,
        key: "basalt",
        label: "Basalto",
        category: "construction",
        tags: ["rock", "dark"],
        visual: { color: 0x3c4046, textureStyle: "basalt", roughness: 0.94 }
    },
    {
        id: BLOCK.GRAVEL,
        key: "gravel",
        label: "Grava",
        category: "terrain",
        tags: ["ground", "rock"],
        visual: { color: 0x8a8a90, textureStyle: "gravel", roughness: 0.95 }
    },
    {
        id: BLOCK.MUD,
        key: "mud",
        label: "Barro",
        category: "terrain",
        tags: ["ground", "earth", "wet"],
        visual: { color: 0x5b4334, textureStyle: "mud", roughness: 0.97 }
    },
    {
        id: BLOCK.SNOW,
        key: "snow",
        label: "Nieve",
        category: "nature",
        tags: ["cold", "nature"],
        visual: { color: 0xf4f8ff, textureStyle: "snow", roughness: 0.78, metalness: 0.01 }
    },
    {
        id: BLOCK.ICE,
        key: "ice",
        label: "Hielo",
        category: "liquids",
        tags: ["cold", "transparent"],
        solid: true,
        transparent: true,
        emitsLight: false,
        liquid: false,
        visual: {
            color: 0xb9dcff,
            textureStyle: "ice",
            roughness: 0.12,
            metalness: 0.04,
            opacity: 0.42,
            renderOrder: 3
        }
    },
    {
        id: BLOCK.DARK_PLANKS,
        key: "dark_planks",
        label: "Tablon oscuro",
        category: "construction",
        tags: ["wood", "construction", "dark"],
        visual: { color: 0x4b3525, textureStyle: "dark_planks", roughness: 0.93 }
    },
    {
        id: BLOCK.BAMBOO,
        key: "bamboo",
        label: "Bambu",
        category: "nature",
        tags: ["nature", "wood", "bamboo"],
        visual: { color: 0xa4c16a, textureStyle: "bamboo", roughness: 0.88 }
    },
    {
        id: BLOCK.TINTED_GLASS,
        key: "tinted_glass",
        label: "Vidrio tintado",
        category: "liquids",
        tags: ["transparent", "glass", "tinted"],
        solid: true,
        transparent: true,
        emitsLight: false,
        liquid: false,
        visual: {
            color: 0x6d7ca3,
            textureStyle: "tinted_glass",
            roughness: 0.22,
            metalness: 0.02,
            opacity: 0.32,
            renderOrder: 3
        }
    },
    {
        id: BLOCK.GLOW_BLOCK,
        key: "glow_block",
        label: "Bloque luminoso",
        category: "construction",
        tags: ["light", "special"],
        solid: true,
        transparent: false,
        emitsLight: true,
        liquid: false,
        visual: {
            color: 0xffd688,
            textureStyle: "glow_block",
            roughness: 0.46,
            metalness: 0.05,
            emissive: 0xffc465,
            emissiveIntensity: 0.65
        }
    },
    {
        id: BLOCK.MOSSY_COBBLESTONE,
        key: "mossy_cobblestone",
        label: "Adoquin musgoso",
        category: "construction",
        tags: ["rock", "construction", "moss"],
        visual: { color: 0x6f7a67, textureStyle: "mossy_cobblestone", roughness: 0.94 }
    },
    {
        id: BLOCK.DARK_BRICK,
        key: "dark_brick",
        label: "Ladrillo oscuro",
        category: "construction",
        tags: ["brick", "dark"],
        visual: { color: 0x533b3f, textureStyle: "dark_brick", roughness: 0.92 }
    },
    {
        id: BLOCK.BLACK_MARBLE,
        key: "black_marble",
        label: "Marmol negro",
        category: "construction",
        tags: ["stone", "luxury", "dark"],
        visual: { color: 0x2c2f36, textureStyle: "black_marble", roughness: 0.42, metalness: 0.06 }
    },
    {
        id: BLOCK.SLATE,
        key: "slate",
        label: "Pizarra",
        category: "construction",
        tags: ["stone", "slate"],
        visual: { color: 0x4d5663, textureStyle: "slate", roughness: 0.9 }
    },
    {
        id: BLOCK.VOLCANIC_STONE,
        key: "volcanic_stone",
        label: "Piedra volcanica",
        category: "construction",
        tags: ["stone", "volcanic"],
        visual: { color: 0x2a2426, textureStyle: "volcanic_stone", roughness: 0.96 }
    },
    {
        id: BLOCK.COPPER,
        key: "copper",
        label: "Cobre",
        category: "construction",
        tags: ["metal", "copper"],
        visual: { color: 0xbb6f46, textureStyle: "copper", roughness: 0.52, metalness: 0.42 }
    },
    {
        id: BLOCK.OXIDIZED_COPPER,
        key: "oxidized_copper",
        label: "Cobre oxidado",
        category: "construction",
        tags: ["metal", "copper", "oxidized"],
        visual: { color: 0x5f9f8d, textureStyle: "oxidized_copper", roughness: 0.68, metalness: 0.18 }
    },
    {
        id: BLOCK.TERRACOTTA,
        key: "terracotta",
        label: "Terracota",
        category: "construction",
        tags: ["clay", "warm"],
        visual: { color: 0xb66a4f, textureStyle: "terracotta", roughness: 0.91 }
    },
    {
        id: BLOCK.ROOF_TILES,
        key: "roof_tiles",
        label: "Tejas",
        category: "construction",
        tags: ["roof", "clay"],
        visual: { color: 0x7f3c2f, textureStyle: "roof_tiles", roughness: 0.9 }
    },
    {
        id: BLOCK.WHITE_PLASTER,
        key: "white_plaster",
        label: "Yeso blanco",
        category: "construction",
        tags: ["plaster", "wall"],
        visual: { color: 0xf4efe8, textureStyle: "white_plaster", roughness: 0.84 }
    },
    {
        id: BLOCK.PINK_PLASTER,
        key: "pink_plaster",
        label: "Yeso rosado",
        category: "construction",
        tags: ["plaster", "wall"],
        visual: { color: 0xe6c2ce, textureStyle: "pink_plaster", roughness: 0.84 }
    },
    {
        id: BLOCK.LIGHT_WOOD,
        key: "light_wood",
        label: "Madera clara",
        category: "construction",
        tags: ["wood", "light"],
        visual: { color: 0xcfa97c, textureStyle: "light_wood", roughness: 0.9 }
    },
    {
        id: BLOCK.REDDISH_WOOD,
        key: "reddish_wood",
        label: "Madera rojiza",
        category: "construction",
        tags: ["wood", "reddish"],
        visual: { color: 0x9a503f, textureStyle: "reddish_wood", roughness: 0.9 }
    },
    {
        id: BLOCK.PINK_LEAVES,
        key: "pink_leaves",
        label: "Hojas rosadas",
        category: "nature",
        tags: ["foliage", "nature", "pink"],
        visual: { color: 0xc97da4, textureStyle: "pink_leaves", roughness: 0.84 }
    },
    {
        id: BLOCK.AMBER_GLASS,
        key: "amber_glass",
        label: "Cristal ambar",
        category: "liquids",
        tags: ["glass", "transparent", "amber"],
        transparent: true,
        visual: {
            color: 0xe3a63f,
            textureStyle: "amber_glass",
            roughness: 0.22,
            metalness: 0.03,
            opacity: 0.34,
            renderOrder: 3
        }
    },
    {
        id: BLOCK.BLUE_GLASS,
        key: "blue_glass",
        label: "Cristal azul",
        category: "liquids",
        tags: ["glass", "transparent", "blue"],
        transparent: true,
        visual: {
            color: 0x61a6e5,
            textureStyle: "blue_glass",
            roughness: 0.22,
            metalness: 0.03,
            opacity: 0.34,
            renderOrder: 3
        }
    },
    {
        id: BLOCK.LAVA,
        key: "lava",
        label: "Lava",
        category: "liquids",
        tags: ["liquid", "lava", "volcanic", "hot"],
        solid: false,
        transparent: true,
        emitsLight: true,
        liquid: true,
        placeable: true,
        mineable: true,
        visual: {
            color: 0xff7f2a,
            textureStyle: "lava",
            roughness: 0.22,
            metalness: 0.01,
            opacity: 0.88,
            emissive: 0xff6117,
            emissiveIntensity: 0.72,
            renderOrder: 5
        }
    },
    {
        id: BLOCK.ASH,
        key: "ash",
        label: "Ceniza volcanica",
        category: "terrain",
        tags: ["volcanic", "ash", "terrain"],
        visual: { color: 0x6e6766, textureStyle: "ash", roughness: 0.95 }
    },
    {
        id: BLOCK.OBSIDIAN,
        key: "obsidian",
        label: "Obsidiana",
        category: "construction",
        tags: ["volcanic", "rock", "obsidian"],
        visual: {
            color: 0x1f1826,
            textureStyle: "obsidian",
            roughness: 0.42,
            metalness: 0.08
        }
    }
];

export const BLOCK_DEFINITIONS = Object.freeze(RAW_BLOCK_DEFINITIONS.map((raw) => Object.freeze(makeBlockDefinition(raw))));

const byId = new Map();
const byKey = new Map();
for (const definition of BLOCK_DEFINITIONS) {
    byId.set(definition.id, definition);
    byKey.set(definition.key, definition);
}

export const blockRegistry = Object.freeze({
    definitions: BLOCK_DEFINITIONS,
    byId,
    byKey
});

export const BLOCK_COLORS = Object.freeze(
    Object.fromEntries(
        BLOCK_DEFINITIONS
            .filter((definition) => definition.id !== BLOCK.AIR)
            .map((definition) => [definition.id, definition.visual.color])
    )
);

export const BLOCK_LABELS = Object.freeze(
    Object.fromEntries(BLOCK_DEFINITIONS.map((definition) => [definition.id, definition.label]))
);

export const BLOCK_ID_SET = new Set(BLOCK_DEFINITIONS.map((definition) => definition.id));

export function getBlockDefinitionById(blockId) {
    return blockRegistry.byId.get(Number(blockId)) || null;
}

export function getBlockDefinitionByKey(key) {
    return blockRegistry.byKey.get(String(key || "")) || null;
}

export function isValidBlockId(blockId) {
    return Number.isInteger(blockId) && BLOCK_ID_SET.has(blockId);
}

export function validateBlockRegistry() {
    const issues = [];
    const seenIds = new Set();
    const seenKeys = new Set();

    for (const definition of BLOCK_DEFINITIONS) {
        if (!Number.isInteger(definition.id)) {
            issues.push(`Block sin id entero: ${definition.key}`);
        }
        if (seenIds.has(definition.id)) {
            issues.push(`Block id duplicado: ${definition.id}`);
        }
        seenIds.add(definition.id);

        if (!definition.key) {
            issues.push(`Block sin key para id ${definition.id}`);
        }
        if (seenKeys.has(definition.key)) {
            issues.push(`Block key duplicado: ${definition.key}`);
        }
        seenKeys.add(definition.key);

        if (!definition.label) {
            issues.push(`Block sin label: ${definition.key || definition.id}`);
        }
        if (!definition.category) {
            issues.push(`Block sin categoria: ${definition.key || definition.id}`);
        }
        if (!Number.isFinite(definition.visual?.color)) {
            issues.push(`Block sin color valido: ${definition.key || definition.id}`);
        }
        if (definition.liquid && definition.solid) {
            issues.push(`Flags incompatibles (liquido + solido): ${definition.key || definition.id}`);
        }
        if (!definition.placeable && definition.inventory?.enabled) {
            issues.push(`Block no placeable no deberia estar en inventario: ${definition.key || definition.id}`);
        }
    }

    if (!blockRegistry.byId.has(BLOCK.AIR)) {
        issues.push("Falta definicion de AIR");
    }

    return issues;
}
