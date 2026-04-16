"use strict";
/**
 * Block Metadata Registry
 *
 * Provides human-readable titles, descriptions, and visual metadata for all block types.
 * This replaces placeholder text like "title" or "block.start.desc" with meaningful content.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryColors = void 0;
exports.getBlockMetadata = getBlockMetadata;
exports.getBlocksByCategory = getBlocksByCategory;
exports.getAllCategories = getAllCategories;
const ContractService_1 = require("../services/ContractService");
/**
 * Get metadata for a specific block type
 */
function getBlockMetadata(type) {
    return ContractService_1.contractService.getBlockMetadata(type);
}
/**
 * Get all blocks in a specific category
 */
function getBlocksByCategory(category) {
    return Object.values(ContractService_1.contractService.getAllBlockMetadata()).filter(block => block.category === category);
}
/**
 * Get all unique categories
 */
function getAllCategories() {
    const categories = new Set(Object.values(ContractService_1.contractService.getAllBlockMetadata()).map(b => b.category));
    return Array.from(categories);
}
/**
 * Category colors for visual differentiation
 */
exports.categoryColors = {
    'Control Flow': '#4CAF50',
    'Setup & Filters': '#2196F3',
    'HTF Logic': '#FF9800',
    'LTF Gating': '#9C27B0',
    'Trade Building': '#F44336',
};
