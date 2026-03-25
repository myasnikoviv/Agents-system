const SYMBOL_KEY = 'agent_system_selected_symbol';
const DEFAULT_SYMBOL = 'HYPEUSDT.P';

export const getPersistentSymbol = (): string => {
    return localStorage.getItem(SYMBOL_KEY) || DEFAULT_SYMBOL;
};

export const setPersistentSymbol = (symbol: string): void => {
    localStorage.setItem(SYMBOL_KEY, symbol);
};
