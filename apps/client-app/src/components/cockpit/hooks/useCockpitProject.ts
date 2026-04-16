import { useState, useEffect, useCallback, useRef } from 'react';
import type { RailProject, RailThread, ChatMessage, AgentRegistryEntry } from '../context/types';
import { apiUrl, fetchJsonSafe } from '../../../lib/http';

export const useCockpitProject = (setProviderMessage: (msg: string | null) => void) => {
    const [railProjects, setRailProjects] = useState<RailProject[]>([]);
    const [railThreadsByProject, setRailThreadsByProject] = useState<Record<string, RailThread[]>>({});
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedThread, setSelectedThread] = useState('');
    const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>({});
    const [agentRegistry, setAgentRegistry] = useState<AgentRegistryEntry[]>([]);

    const activeThreadKeyRef = useRef('');
    useEffect(() => {
        activeThreadKeyRef.current = selectedThread || '__unbound_thread__';
    }, [selectedThread]);

    // Initial Data Fetch
    useEffect(() => {
        const loadInitialData = async () => {
            const data = await fetchJsonSafe<{ success?: boolean; projects?: RailProject[]; registry?: AgentRegistryEntry[] }>(apiUrl('/api/rail/catalog'));
            if (data?.projects) {
                setRailProjects(data.projects);
                if (data.projects.length > 0 && !selectedProject) {
                    setSelectedProject(data.projects[0].id);
                }
            }
            if (data?.registry) setAgentRegistry(data.registry);
        };
        void loadInitialData();
    }, []);

    // Load Threads
    useEffect(() => {
        if (!selectedProject) return;
        const loadThreads = async () => {
            const data = await fetchJsonSafe<{ success?: boolean; threads?: RailThread[] }>(apiUrl(`/api/rail/threads?projectId=${selectedProject}`));
            if (data?.threads) {
                setRailThreadsByProject(prev => ({ ...prev, [selectedProject]: data.threads || [] }));
                if (data.threads.length > 0 && !selectedThread) {
                    setSelectedThread(data.threads[0].id);
                }
            }
        };
        void loadThreads();
    }, [selectedProject]);

    // Load Messages
    useEffect(() => {
        if (!selectedThread) return;
        const loadThreadMessages = async () => {
            const data = await fetchJsonSafe<{ success?: boolean; messages?: any[] }>(`/api/cockpit/chains/${encodeURIComponent(selectedThread)}/messages`);
            if (data?.success && Array.isArray(data.messages)) {
                setMessagesByThread(prev => ({
                    ...prev,
                    [selectedThread]: data.messages!.map(m => ({ 
                        id: m.id, 
                        role: m.role, 
                        content: m.content, 
                        timestamp: new Date(m.timestamp) 
                    }))
                }));
            }
        };
        void loadThreadMessages();
    }, [selectedThread]);

    const appendMessagesToThread = useCallback((threadId: string | undefined, next: ChatMessage[]) => {
        const key = threadId && threadId.trim().length > 0 ? threadId : activeThreadKeyRef.current;
        if (next.length === 0) return;
        setMessagesByThread((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), ...next],
        }));
    }, []);

    const appendAgentMessageIfChanged = useCallback((threadId: string | undefined, content: string, timestamp?: Date) => {
        const text = String(content || '').trim();
        if (!text) return;
        const key = threadId && threadId.trim().length > 0 ? threadId : activeThreadKeyRef.current;
        const nowTs = (timestamp || new Date()).getTime();
        setMessagesByThread((prev) => {
            const existing = prev[key] || [];
            const last = existing[existing.length - 1];
            if (last && last.role === 'agent' && String(last.content || '').trim() === text) return prev;
            const duplicateRecent = existing.slice(-8).some(msg => 
                msg.role === 'agent' && String(msg.content || '').trim() === text && Math.abs(nowTs - new Date(msg.timestamp).getTime()) <= 15000
            );
            if (duplicateRecent) return prev;
            return {
                ...prev,
                [key]: [...existing, { 
                    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, 
                    role: 'agent', 
                    content: text, 
                    timestamp: timestamp || new Date() 
                }],
            };
        });
    }, []);

    const syncProjectRuntimeContext = async (projectId: string, setRuntimeFooter: (f: any) => void) => {
        const data = await fetchJsonSafe<any>('/api/cockpit/projects/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
        });
        if (data?.success && data.runtimeFooter) {
            setRuntimeFooter(data.runtimeFooter);
        }
    };

    const handleCreateChain = async (
        setRuntimeFooter: (f: any) => void,
        projectIdArg?: string,
        labelArg?: string,
        options?: {
            projectLabel?: string;
            worktreePath?: string;
            agentContextPath?: string;
            planeProjectId?: string;
            createPlaneProject?: boolean;
            onboardingMode?: 'local' | 'repository';
            repositoryUrl?: string;
            onboardingAuthMode?: 'none' | 'oauth' | 'pat';
            onboardingBootstrapMode?: 'none' | 'auto-template' | 'read-only';
            onboardingReadOnly?: boolean;
        },
    ): Promise<boolean> => {
        const projectId = projectIdArg || (labelArg === 'unbound' ? '__unbound__' : selectedProject);
        if (!projectId) return false;
        
        try {
            const response = await fetch(apiUrl('/api/cockpit/chains'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    label: labelArg || `New chat ${new Date().toLocaleTimeString()}`,
                    projectLabel: options?.projectLabel,
                    worktreePath: options?.worktreePath,
                    agentContextPath: options?.agentContextPath,
                    planeProjectId: options?.planeProjectId,
                    createPlaneProject: options?.createPlaneProject,
                    onboardingMode: options?.onboardingMode,
                    repositoryUrl: options?.repositoryUrl,
                    onboardingAuthMode: options?.onboardingAuthMode,
                    onboardingBootstrapMode: options?.onboardingBootstrapMode,
                    onboardingReadOnly: options?.onboardingReadOnly,
                }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                const code = String(data?.error || '');
                if (code === 'plane_project_required') {
                    setProviderMessage('Select a Plane project or explicitly enable new Plane project creation.');
                } else {
                    setProviderMessage(String(data?.message || data?.error || 'Failed to create chain: backend unavailable'));
                }
                return false;
            }
            if (data.projects) setRailProjects(data.projects);
            if (data.threadsByProject) setRailThreadsByProject(data.threadsByProject);
            setSelectedProject(projectId);
            if (data.thread?.id) setSelectedThread(data.thread.id);
            void syncProjectRuntimeContext(projectId, setRuntimeFooter);
            return true;
        } catch (e) {
            console.error("Create chain error", e);
            setProviderMessage('Network error creating chain');
            return false;
        }
    };

    const handleDeleteThread = async (projectId: string, threadId: string) => {
        await fetchJsonSafe(apiUrl(`/api/cockpit/chains/${threadId}`), { method: 'DELETE' });
        setRailThreadsByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(t => t.id !== threadId) }));
    };

    const handleDeleteProject = async (id: string) => {
        const confirmed = window.confirm('Are you sure you want to delete this project and all its threads?');
        if (!confirmed) return;
        const res = await fetchJsonSafe<any>(apiUrl(`/api/rail/projects/${id}`), { method: 'DELETE' });
        if (res?.success) {
            setRailProjects(prev => prev.filter(p => p.id !== id));
            if (selectedProject === id) setSelectedProject('');
        }
    };

    return {
        railProjects,
        setRailProjects,
        railThreadsByProject,
        setRailThreadsByProject,
        selectedProject,
        setSelectedProject,
        selectedThread,
        setSelectedThread,
        messagesByThread,
        setMessagesByThread,
        agentRegistry,
        appendMessagesToThread,
        appendAgentMessageIfChanged,
        handleCreateChain,
        handleDeleteThread,
        handleDeleteProject,
        syncProjectRuntimeContext
    };
};
