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
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.message}
                        <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>×</button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmState && (
                <div className="modal-overlay" onClick={() => handleConfirm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ minWidth: 350 }}>
                        <h3 style={{ marginTop: 0 }}>Confirmation</h3>
                        <p style={{ margin: '20px 0', color: '#CCC' }}>{confirmState.message}</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => handleConfirm(false)}>Cancel</button>
                            <button className="btn-primary" onClick={() => handleConfirm(true)}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Modal */}
            {promptState && (
                <div className="modal-overlay" onClick={() => handlePrompt(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ minWidth: 350 }}>
                        <h3 style={{ marginTop: 0 }}>Input Required</h3>
                        <p style={{ margin: '10px 0', color: '#AAA', fontSize: '0.9em' }}>{promptState.message}</p>
                        <input
                            autoFocus
                            value={promptValue}
                            onChange={e => setPromptValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handlePrompt(promptValue);
                                if (e.key === 'Escape') handlePrompt(null);
                            }}
                            style={{
                                width: '100%',
                                padding: 10,
                                background: '#252525',
                                color: 'white',
                                border: '1px solid #444',
                                borderRadius: 4,
                                marginBottom: 20
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => handlePrompt(null)}>Cancel</button>
                            <button className="btn-primary" onClick={() => handlePrompt(promptValue)}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};
