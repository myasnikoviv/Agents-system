import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: NotificationType;
}

interface ConfirmState {
    message: string;
    resolve: (value: boolean) => void;
}

interface PromptState {
    message: string;
    defaultValue?: string;
    resolve: (value: string | null) => void;
}

interface NotificationContextType {
    notify: (message: string, type?: NotificationType) => void;
    confirm: (message: string) => Promise<boolean>;
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [promptState, setPromptState] = useState<PromptState | null>(null);
    const [promptValue, setPromptValue] = useState('');

    const notify = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const confirm = useCallback((message: string) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ message, resolve });
        });
    }, []);

    const prompt = useCallback((message: string, defaultValue = '') => {
        setPromptValue(defaultValue);
        return new Promise<string | null>((resolve) => {
            setPromptState({ message, defaultValue, resolve });
        });
    }, []);

    const handleConfirm = (value: boolean) => {
        confirmState?.resolve(value);
        setConfirmState(null);
    };

    const handlePrompt = (value: string | null) => {
        promptState?.resolve(value);
        setPromptState(null);
    };

    return (
        <NotificationContext.Provider value={{ notify, confirm, prompt }}>
            {children}

            {/* Toasts */}
            <div className="fixed bottom-5 right-5 z-[10000] flex max-w-[420px] flex-col gap-2.5">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex min-w-[260px] items-center justify-between gap-3 rounded-md border-l-4 bg-slate-800 px-4 py-3 text-sm text-slate-100 shadow-xl transition-all ${
                            toast.type === 'success'
                                ? 'border-emerald-500'
                                : toast.type === 'error'
                                    ? 'border-rose-500'
                                    : toast.type === 'warning'
                                        ? 'border-amber-500'
                                        : 'border-sky-500'
                        }`}
                    >
                        <span>{toast.message}</span>
                        <button
                            className="text-lg leading-none text-slate-400 hover:text-white"
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmState && (
                <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => handleConfirm(false)}>
                    <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="m-0 text-lg font-semibold text-slate-100">Confirmation</h3>
                        <p className="my-5 text-sm text-slate-300">{confirmState.message}</p>
                        <div className="flex justify-end gap-2">
                            <button className="h-9 rounded-md border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-700" onClick={() => handleConfirm(false)}>Cancel</button>
                            <button className="h-9 rounded-md border border-blue-600 bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-600" onClick={() => handleConfirm(true)}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Modal */}
            {promptState && (
                <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => handlePrompt(null)}>
                    <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="m-0 text-lg font-semibold text-slate-100">Input Required</h3>
                        <p className="my-3 text-sm text-slate-400">{promptState.message}</p>
                        <input
                            autoFocus
                            value={promptValue}
                            onChange={e => setPromptValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handlePrompt(promptValue);
                                if (e.key === 'Escape') handlePrompt(null);
                            }}
                            className="mb-5 h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-sky-500"
                        />
                        <div className="flex justify-end gap-2">
                            <button className="h-9 rounded-md border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-700" onClick={() => handlePrompt(null)}>Cancel</button>
                            <button className="h-9 rounded-md border border-blue-600 bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-600" onClick={() => handlePrompt(promptValue)}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};
