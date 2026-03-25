
import { create } from 'zustand';
import type { StrategyFile } from '../services/StrategyService';
import { StrategyService } from '../services/StrategyService';

interface StrategyState {
    strategies: StrategyFile[];
    activeFilename: string | null;
    activeContent: string; // The current draft content (YAML)
    isDirty: boolean; // Has draft changed from saved?

    // Actions
    fetchStrategies: () => Promise<void>;
    selectStrategy: (filename: string) => Promise<void>;
    updateContent: (content: string) => void;
    saveStrategy: () => Promise<void>;
    duplicateStrategy: () => Promise<void>;
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
    strategies: [],
    activeFilename: null,
    activeContent: '',
    isDirty: false,

    fetchStrategies: async () => {
        const list = await StrategyService.listStrategies();
        set({ strategies: list });
    },

    selectStrategy: async (filename: string) => {
        const file = await StrategyService.getStrategy(filename);
        set({
            activeFilename: filename,
            activeContent: file.content || '',
            isDirty: false
        });
    },

    updateContent: (content: string) => {
        set({ activeContent: content, isDirty: true });
    },

    saveStrategy: async () => {
        const { activeFilename, activeContent } = get();
        if (!activeFilename) return;

        await StrategyService.saveStrategy(activeFilename, activeContent);
        set({ isDirty: false });
        // Refresh list in case meta changed (not really possible with just content update but good practice)
        await get().fetchStrategies();
    },

    duplicateStrategy: async () => {
        const { activeFilename } = get();
        if (!activeFilename) return;

        const { newFilename } = await StrategyService.duplicateStrategy(activeFilename);
        await get().fetchStrategies();
        await get().selectStrategy(newFilename);
    }
}));
