"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPersistentSymbol = exports.getPersistentSymbol = void 0;
const SYMBOL_KEY = 'agent_system_selected_symbol';
const DEFAULT_SYMBOL = 'HYPEUSDT.P';
const getPersistentSymbol = () => {
    return localStorage.getItem(SYMBOL_KEY) || DEFAULT_SYMBOL;
};
exports.getPersistentSymbol = getPersistentSymbol;
const setPersistentSymbol = (symbol) => {
    localStorage.setItem(SYMBOL_KEY, symbol);
};
exports.setPersistentSymbol = setPersistentSymbol;
