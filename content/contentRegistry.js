import {
    BLOCK,
    blockRegistry,
    validateBlockRegistry
} from "./blockRegistry.js";
import {
    propRegistry,
    validatePropRegistry
} from "./propRegistry.js";

export const ITEM_KIND = Object.freeze({
    BLOCK: "block",
    PROP: "prop"
});

export const HOTBAR_SIZE = 8;

export const INVENTORY_CATEGORY = Object.freeze({
    TERRAIN: "terrain",
    NATURE: "nature",
    LIQUIDS: "liquids",
    CONSTRUCTION: "construction",
    FURNITURE: "furniture",
    UTILITY: "utility"
});

export const INVENTORY_CATEGORY_ORDER = Object.freeze([
    INVENTORY_CATEGORY.TERRAIN,
    INVENTORY_CATEGORY.NATURE,
    INVENTORY_CATEGORY.CONSTRUCTION,
    INVENTORY_CATEGORY.LIQUIDS,
    INVENTORY_CATEGORY.FURNITURE,
    INVENTORY_CATEGORY.UTILITY
]);

export const INVENTORY_CATEGORY_LABELS = Object.freeze({
    [INVENTORY_CATEGORY.TERRAIN]: "Terreno",
    [INVENTORY_CATEGORY.NATURE]: "Naturaleza",
    [INVENTORY_CATEGORY.CONSTRUCTION]: "Construccion",
    [INVENTORY_CATEGORY.LIQUIDS]: "Liquidos y transparentes",
    [INVENTORY_CATEGORY.FURNITURE]: "Muebles y decoracion",
    [INVENTORY_CATEGORY.UTILITY]: "Utilidad"
});

function normalizeInventoryCategory(value) {
    const category = String(value || "").toLowerCase();
    if (Object.values(INVENTORY_CATEGORY).includes(category)) {
        return category;
    }

    return INVENTORY_CATEGORY.CONSTRUCTION;
}

const blockInventoryItems = blockRegistry.definitions
    .filter((definition) => definition.id !== BLOCK.AIR && definition.inventory?.enabled)
    .map((definition) => ({
        id: definition.key,
        label: definition.label,
        kind: ITEM_KIND.BLOCK,
        blockId: definition.id,
        category: normalizeInventoryCategory(definition.category),
        tags: definition.tags,
        meta: "Bloque",
        tint: definition.visual?.inventoryTint || ""
    }));

const propInventoryItems = propRegistry.definitions
    .filter((definition) => definition.inventory?.enabled)
    .map((definition) => ({
        id: definition.key,
        label: definition.label,
        kind: ITEM_KIND.PROP,
        propType: definition.id,
        category: normalizeInventoryCategory(definition.category),
        tags: definition.tags,
        meta: "Objeto decorativo",
        tint: definition.visual?.tint || "rgba(150, 196, 132, 0.42)"
    }));

export const INVENTORY_ITEMS = Object.freeze([
    ...blockInventoryItems,
    ...propInventoryItems
]);

export const INVENTORY_ITEM_BY_ID = new Map(INVENTORY_ITEMS.map((item) => [item.id, item]));

export const DEFAULT_HOTBAR_ITEM_IDS = Object.freeze([
    "stone",
    "dirt",
    "grass",
    "wood",
    "glass",
    "water",
    "chair",
    "lamp"
]);

export function getInventoryItemTintByDefinition(item, blockColorLookup = null) {
    if (!item) {
        return "rgba(255, 255, 255, 0.08)";
    }

    if (item.tint) {
        return item.tint;
    }

    if (item.kind === ITEM_KIND.BLOCK) {
        const color = Number(blockColorLookup?.[item.blockId] ?? 0x8fa3bf);
        return `#${color.toString(16).padStart(6, "0")}44`;
    }

    return "rgba(150, 196, 132, 0.42)";
}

export function validateContentRegistry() {
    const issues = [];
    const seenItemIds = new Set();
    const knownCategories = new Set(Object.values(INVENTORY_CATEGORY));

    for (const item of INVENTORY_ITEMS) {
        if (!item.id) {
            issues.push("Item de inventario sin id");
        }
        if (seenItemIds.has(item.id)) {
            issues.push(`Item de inventario duplicado: ${item.id}`);
        }
        seenItemIds.add(item.id);

        if (!item.label) {
            issues.push(`Item sin label: ${item.id}`);
        }
        if (!knownCategories.has(item.category)) {
            issues.push(`Item con categoria invalida (${item.category}): ${item.id}`);
        }
        if (item.kind === ITEM_KIND.BLOCK && !Number.isInteger(item.blockId)) {
            issues.push(`Item block sin blockId valido: ${item.id}`);
        }
        if (item.kind === ITEM_KIND.PROP && !item.propType) {
            issues.push(`Item prop sin propType: ${item.id}`);
        }
    }

    for (const hotbarId of DEFAULT_HOTBAR_ITEM_IDS) {
        if (!INVENTORY_ITEM_BY_ID.has(hotbarId)) {
            issues.push(`Hotbar por defecto referencia item inexistente: ${hotbarId}`);
        }
    }

    issues.push(...validateBlockRegistry());
    issues.push(...validatePropRegistry());
    return issues;
}
