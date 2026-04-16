"use strict";
/**
 * Context Type Registry
 *
 * Defines the types of data artifacts that blocks exchange.
 * These are used to validate wiring and guide the UI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContextType = getContextType;
exports.getAllContextTypes = getAllContextTypes;
const ContractService_1 = require("../services/ContractService");
function getContextType(id) {
    return ContractService_1.contractService.getContextType(id);
}
function getAllContextTypes() {
    return ContractService_1.contractService.getAllContextTypes();
}
