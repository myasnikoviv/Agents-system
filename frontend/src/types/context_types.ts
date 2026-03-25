/**
 * Context Type Registry
 * 
 * Defines the types of data artifacts that blocks exchange.
 * These are used to validate wiring and guide the UI.
 */

export interface ContextField {
    type: string;
    display_name: string;
    description: string;
}

export interface ContextType {
    id: string;
    display_name: string;
    description: string;
    color: string;
    schema?: Record<string, ContextField>; // Rich schema with display metadata
}

import { contractService } from '../services/ContractService';

export function getContextType(id: string): ContextType | undefined {
    return contractService.getContextType(id);
}

export function getAllContextTypes(): Record<string, ContextType> {
    return contractService.getAllContextTypes();
}
