import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Cpu, Activity, LayoutDashboard, Terminal, Settings, PanelLeftClose, PanelLeftOpen, Globe2, ChevronDown, Plus, PencilLine, Folder, FolderPlus, Laptop, ShieldCheck, GitBranch, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiUrl, fetchJsonSafe } from '../../lib/http';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { IconButton } from '../ui/IconButton';
import { Dropdown } from '../ui/Dropdown';
import './CockpitPage.css';
const RUNTIME_MODE_KEY = 'cockpit.runtime.mode.v1';

interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

interface RuntimeEvent {
    event_id: string;
    event_type: string;
    timestamp: string;
    agent_role: string;
    source_stage: string;
    target_stage?: string;
    status: string;
    plane_issue_id: string;
}

interface ObservabilityState {
    pipeline: string;
    stage: string;
    nextStage: string;
    blockingGates: string;
    approvalRequired: boolean;
    approvalReason: string;
}

interface ExecutionFeedEntry {
    raw: string;
    stage?: string;
    role?: string;
    status?: string;
    source?: string;
    fallback?: string;
    message?: string;
}

interface GitContext {
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
}
interface RuntimeFooterState {
    executionTarget: 'local' | 'remote';
    accessPolicy: 'full-access' | 'sandbox';
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
}

interface CatalogState {
    agents: string[];
    pipelines: string[];
    skills: string[];
}

interface RailProject {
    id: string;
    label: string;
}
interface RailThread {
    id: string;
    label: string;
    updatedAt: string;
}

type PromptTokenKind = 'pipeline' | 'agent' | 'skill';
interface PromptToken {
    kind: PromptTokenKind;
    value: string;
}
interface ScopeEntity {
    id: string;
    key: string;
    name: string;
    stateId: string;
    completedAt?: string;
}
interface UploadedAttachment {
    id: string;
    originalName: string;
    relativePath: string;
    mimeType: string;
    size: number;
    createdAt: string;
}
interface WorkScopeState {
    cycles: Array<{ id: string; name: string }>;
    stories: ScopeEntity[];
    tasks: ScopeEntity[];
    items: ScopeEntity[];
    selected: { cycleId: string; storyId: string };
    statusSummary: { total: number; done: number; inProgress: number; todo: number };
}
interface MetaAutocompleteState {
    open: boolean;
    kind: PromptTokenKind | null;
    query: string;
    rangeStart: number;
    rangeEnd: number;
    selectedIndex: number;
    suggestions: string[];
}

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        length: number;
        [key: number]: {
            isFinal: boolean;
            [key: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start: () => void;
    stop: () => void;
}

interface DirectoryPickerWindow extends Window {
    showDirectoryPicker?: () => Promise<{ name?: string }>;
}

type RuntimeProvider = 'claude-cli' | 'codex-cli' | 'openhands-sdk';

export function CockpitPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'mock' | 'linear' | 'multiple_agents'>(() => {
        const stored = localStorage.getItem(RUNTIME_MODE_KEY);
        if (stored === 'mock' || stored === 'linear' || stored === 'multiple_agents') return stored;
        return 'multiple_agents';
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [events, setEvents] = useState<RuntimeEvent[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ghostText, setGhostText] = useState('');
    const [voiceLang, setVoiceLang] = useState<'auto' | 'uk' | 'en'>('auto');
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [observability, setObservability] = useState<ObservabilityState | null>(null);
    const [executionFeed, setExecutionFeed] = useState<ExecutionFeedEntry[]>([]);
    const [gitContext, setGitContext] = useState<GitContext | null>(null);
    const [catalog, setCatalog] = useState<CatalogState>({ agents: [], pipelines: [], skills: [] });

    const [selectedProvider, setSelectedProvider] = useState<RuntimeProvider>('claude-cli');
    const [selectedModel, setSelectedModel] = useState('auto');
    const [providerModelPresets, setProviderModelPresets] = useState<Record<RuntimeProvider, string[]>>({
        'claude-cli': ['auto'],
        'codex-cli': ['auto'],
        'openhands-sdk': ['auto'],
    });
    const [providerMessage, setProviderMessage] = useState<string | null>(null);

    const [runtimePickerOpen, setRuntimePickerOpen] = useState<'provider' | 'model' | 'voice' | 'target' | 'access' | 'branch' | null>(null);
    const [showCatalogPicker, setShowCatalogPicker] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [promptTokens, setPromptTokens] = useState<PromptToken[]>([]);
    const [metaAutocomplete, setMetaAutocomplete] = useState<MetaAutocompleteState>({
        open: false,
        kind: null,
        query: '',
        rangeStart: 0,
        rangeEnd: 0,
        selectedIndex: 0,
        suggestions: [],
    });
    const [selectedScopeItemIds, setSelectedScopeItemIds] = useState<string[]>([]);
    const [scopeCardPinned, setScopeCardPinned] = useState(true);
    const [railCollapsed, setRailCollapsed] = useState(false);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedThread, setSelectedThread] = useState('');
    const [railProjects, setRailProjects] = useState<RailProject[]>([]);
    const [railThreadsByProject, setRailThreadsByProject] = useState<Record<string, RailThread[]>>({});
    const [runtimeFooter, setRuntimeFooter] = useState<RuntimeFooterState>({
        executionTarget: 'local',
        accessPolicy: 'full-access',
        activeBranch: 'main',
        worktreePath: '',
        preflightToken: null,
    });
    const [workScope, setWorkScope] = useState<WorkScopeState>({
        cycles: [],
        stories: [],
        tasks: [],
        items: [],
        selected: { cycleId: '', storyId: '' },
        statusSummary: { total: 0, done: 0, inProgress: 0, todo: 0 },
    });
    const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectDirectory, setProjectDirectory] = useState('');
    const [isChainModalOpen, setIsChainModalOpen] = useState(false);
    const [newChainLabel, setNewChainLabel] = useState('');
    const [newChainScope, setNewChainScope] = useState<'current' | 'unbound'>('current');

    // Auto-scroll refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const feedEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Audio recording ref
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, status]); // Added status to trigger scroll when approval card appears

    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    useEffect(() => {
        const win = window as unknown as { 
            SpeechRecognition?: new () => SpeechRecognitionInstance; 
            webkitSpeechRecognition?: new () => SpeechRecognitionInstance 
        };
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            
            // Set language based on selected choice
            const langMap: Record<string, string> = {
                'auto': 'uk-UA', // default to UA for browser if auto (it doesn't have true auto)
                'uk': 'uk-UA',
                'en': 'en-US'
            };
            recognition.lang = langMap[voiceLang];

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const final = event.results[i][0].transcript;
                        setInput(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + final);
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setGhostText(interimTranscript);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
            };

            recognitionRef.current = recognition;
        }
    }, [voiceLang]);

    const sseInitialized = useRef(false);

    useEffect(() => {
        if (sseInitialized.current) return;
        sseInitialized.current = true;

        const url = apiUrl('/api/events/stream');
        const source = new EventSource(url);

        source.onopen = () => {
            console.log('[SSE] Connected to', url);
        };

        source.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'connected') return;
                setEvents(prev => [...prev.slice(-49), data as RuntimeEvent]); // keep last 50
                
                // If event completes research/arch, add a summary to chat
                if (data.status === 'success' && data.event_type.endsWith('.completed')) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'agent',
                        content: `[${data.agent_role}] Completed stage: ${data.source_stage} → ${data.target_stage}`,
                        timestamp: new Date(data.timestamp || Date.now())
                    }]);
                }
            } catch (err) {
                console.error('SSE Error parsing data:', err);
            }
        };

        source.onerror = (err) => {
            console.error('SSE connection error:', err);
            source.close();
            sseInitialized.current = false;
        };

        return () => {
            console.log('[SSE] Closing connection');
            source.close();
            sseInitialized.current = false;
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = () => {
            setRuntimePickerOpen(null);
            setShowPlusMenu(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleFileAttach = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const formData = new FormData();
        for (const file of files) formData.append('files', file);
        formData.append('projectId', selectedProject);
        formData.append('threadId', selectedThread);
        try {
            const res = await fetch(apiUrl('/api/cockpit/attachments/upload'), {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.attachments)) {
                const next = data.attachments as UploadedAttachment[];
                setUploadedAttachments((prev) => [...prev, ...next]);
                const fileTokens = next.map((file) => `[file:${file.originalName}]`).join(' ');
                setInput((prev) => `${prev}${prev.trim().length > 0 ? ' ' : ''}${fileTokens}`.trimStart());
            }
        } catch (e) {
            console.error('Attachment upload failed:', e);
        }
        event.target.value = '';
    };

    useEffect(() => {
        const loadCatalog = async () => {
            const data = await fetchJsonSafe<{ success?: boolean; agents?: string[]; pipelines?: string[]; skills?: string[] }>('/api/cockpit/catalog');
            if (data?.success) {
                setCatalog({
                    agents: data.agents || [],
                    pipelines: data.pipelines || [],
                    skills: data.skills || [],
                });
            }
        };
        void loadCatalog();
    }, []);

    useEffect(() => {
        const loadProviders = async () => {
            const data = await fetchJsonSafe<{
                success?: boolean;
                runtimeSelection?: { provider?: RuntimeProvider; model?: string };
                capabilities?: { providerModels?: Partial<Record<RuntimeProvider, string[]>> };
            }>('/api/cockpit/providers');
            if (!data?.success) return;
            const providerModels = data.capabilities?.providerModels;
            if (providerModels) {
                setProviderModelPresets((prev) => ({
                    'claude-cli': providerModels['claude-cli']?.length ? providerModels['claude-cli'] : prev['claude-cli'],
                    'codex-cli': providerModels['codex-cli']?.length ? providerModels['codex-cli'] : prev['codex-cli'],
                    'openhands-sdk': providerModels['openhands-sdk']?.length ? providerModels['openhands-sdk'] : prev['openhands-sdk'],
                }));
            }
            if (data.runtimeSelection?.provider) setSelectedProvider(data.runtimeSelection.provider);
            if (data.runtimeSelection?.model) setSelectedModel(data.runtimeSelection.model);
        };
        void loadProviders();
        void loadRuntimeFooter();
    }, []);

    useEffect(() => {
        const loadChains = async () => {
            const data = await fetchJsonSafe<{
                success?: boolean;
                projects?: RailProject[];
                threadsByProject?: Record<string, RailThread[]>;
            }>('/api/cockpit/chains');
            if (!data?.success) return;
            const projects = data.projects || [];
            const threads = data.threadsByProject || {};
            setRailProjects(projects);
            setRailThreadsByProject(threads);

            if (!projects.some((p) => p.id === selectedProject)) {
                const nextProject = projects[0]?.id || '';
                setSelectedProject(nextProject);
                setSelectedThread((threads[nextProject] || [])[0]?.id || '');
                return;
            }

            if (!(threads[selectedProject] || []).some((t) => t.id === selectedThread)) {
                setSelectedThread((threads[selectedProject] || [])[0]?.id || '');
            }
        };
        void loadChains();
    }, [selectedProject, selectedThread]); // Added dependencies per lint rule

    useEffect(() => {
        const loadWorkScope = async () => {
            const params = new URLSearchParams({
                mode: 'all',
                cycleId: workScope.selected.cycleId || '',
                storyId: workScope.selected.storyId || '',
            });
            const data = await fetchJsonSafe<any>(`/api/cockpit/work-scope?${params.toString()}`);
            if (!data?.success) return;
            setWorkScope({
                cycles: data.cycles || [],
                stories: data.stories || [],
                tasks: data.tasks || [],
                items: data.items || [],
                selected: data.selected || { cycleId: '', storyId: '' },
                statusSummary: data.statusSummary || { total: 0, done: 0, inProgress: 0, todo: 0 },
            });
            setSelectedScopeItemIds((prev) => prev.filter((id) => (data.items || []).some((it: ScopeEntity) => it.id === id)));
        };
        void loadWorkScope();
    }, [workScope.selected.cycleId, workScope.selected.storyId]);

    useEffect(() => {
        localStorage.setItem(RUNTIME_MODE_KEY, mode);
    }, [mode]);

    useEffect(() => {
        const syncMode = () => {
            const stored = localStorage.getItem(RUNTIME_MODE_KEY);
            if (stored === 'mock' || stored === 'linear' || stored === 'multiple_agents') setMode(stored);
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === RUNTIME_MODE_KEY) syncMode();
        };
        window.addEventListener('focus', syncMode);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('focus', syncMode);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    useEffect(() => {
        const closePicker = () => setRuntimePickerOpen(null);
        window.addEventListener('click', closePicker);
        return () => window.removeEventListener('click', closePicker);
    }, []);

    const handleSend = async () => {
        const hasText = input.trim().length > 0;
        const hasTokens = promptTokens.length > 0;
        if ((!hasText && !hasTokens) || isProcessing) return;
        
        const tokenPayload = promptTokens.map((t) => `${t.kind}:${t.value}`).join('\n');
        const selectedScopeKeys = workScope.items
            .filter((it) => selectedScopeItemIds.includes(it.id))
            .map((it) => `scope:item:${it.key}`);
        const scopePayload = selectedScopeKeys.join('\n');
        const attachmentPayload = uploadedAttachments
            .map((a) => `attachment:${a.originalName}`)
            .join('\n');
        const userMsg = [tokenPayload, scopePayload, attachmentPayload, input.trim()].filter(Boolean).join('\n');
        setInput('');
        setPromptTokens([]);
        setUploadedAttachments([]);
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: userMsg,
            timestamp: new Date()
        }]);

        setIsProcessing(true);

        try {
            const res = await fetch(apiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    executionMode: mode,
                    projectId: selectedProject,
                    threadId: selectedThread,
                    attachments: uploadedAttachments,
                }),
            });
            const data = await res.json();
            
            if (data.success) { // Changed from data.logs to data.success as threadId/status might be present without logs
                setCurrentThreadId(data.threadId);
                setCurrentTicketId(data.ticketId || null);
                setStatus(data.status);
                if (data.observability) setObservability(data.observability);
                if (data.executionFeed) setExecutionFeed(data.executionFeed);
                if (data.gitContext) setGitContext(data.gitContext);

                // 1. If we have a direct message (conversational response), show it first
                if (data.message) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'agent',
                        content: data.message,
                        timestamp: new Date()
                    }]);
                } 
                // 2. For legacy direct/linear modes, display logs
                else if ((data.observability?.pipeline === 'openhands-direct' || mode !== 'multiple_agents') && Array.isArray(data.logs)) {
                    setMessages(prev => [...prev, ...data.logs.map((log: string, i: number) => ({
                        id: `${Date.now()}-${i}`,
                        role: 'agent',
                        content: log,
                        timestamp: new Date()
                    }))]);
                } 
                // 3. Otherwise, indicate swarm dispatch
                else {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'agent',
                        content: `Task dispatched to Swarm (Run ID: ${data.runId.substring(0,8)}). See event feed for updates.`,
                        timestamp: new Date()
                    }]);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        if (!currentThreadId || isProcessing) return;
        setIsProcessing(true);

        try {
            const res = await fetch(apiUrl('/api/chat/approve'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: currentThreadId, ticketId: currentTicketId })
            });
            const data = await res.json();
            
            if (data.success) {
                setStatus(data.status);
                if (data.observability) setObservability(data.observability);
                if (data.executionFeed) setExecutionFeed(data.executionFeed);
                if (data.gitContext) setGitContext(data.gitContext);
                if (data.logs) {
                    setMessages(prev => [...prev, ...data.logs.map((log: string, i: number) => ({
                        id: `${Date.now()}-${i}`,
                        role: 'agent',
                        content: log,
                        timestamp: new Date()
                    }))]);
                }
            }
        } catch (error) {
            console.error('Approve error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            recognitionRef.current?.stop();
            setIsRecording(false);
            setGhostText('');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                // Final refined transcription fallback (Whisper)
                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice.webm');
                
                // Add language if not auto
                if (voiceLang !== 'auto') {
                    formData.set('language', voiceLang);
                }

                setIsProcessing(true);
                try {
                    const res = await fetch(apiUrl('/api/voice/transcribe'), {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await res.json();
                    if (data.text && data.text.length > 5) { // Only overwrite if Whisper is distinct
                        // setInput(prev => prev + ' ' + data.text); 
                        console.log('[Whisper] Feedback:', data.text);
                    }
                } catch (e) {
                    console.error("Transcribe fallback failed:", e);
                } finally {
                    setIsProcessing(false);
                }
            };

            mediaRecorder.start();
            recognitionRef.current?.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone');
        }
    };

    const appendCommand = (kind: PromptTokenKind, value: string) => {
        setPromptTokens((prev) => {
            const exists = prev.some((t) => t.kind === kind && t.value === value);
            if (exists) return prev;
            return [...prev, { kind, value }];
        });
    };

    const closeAutocomplete = () => {
        setMetaAutocomplete((prev) => ({ ...prev, open: false, suggestions: [] }));
    };

    const updateAutocomplete = (value: string, cursor: number) => {
        const before = value.slice(0, cursor);
        const match = before.match(/(^|\s)([@/#])([a-zA-Z0-9._-]*)$/);
        if (!match) {
            closeAutocomplete();
            return;
        }
        const symbol = match[2];
        const rawQuery = (match[3] || '').toLowerCase();
        const tokenLen = symbol.length + (match[3] || '').length;
        const rangeStart = cursor - tokenLen;
        const source = symbol === '@'
            ? catalog.agents
            : symbol === '/'
                ? catalog.pipelines
                : catalog.skills;
        const suggestions = source
            .filter((item) => item.toLowerCase().includes(rawQuery))
            .slice(0, 8);
        if (suggestions.length === 0) {
            closeAutocomplete();
            return;
        }
        setMetaAutocomplete({
            open: true,
            kind: symbol === '@' ? 'agent' : symbol === '/' ? 'pipeline' : 'skill',
            query: rawQuery,
            rangeStart,
            rangeEnd: cursor,
            selectedIndex: 0,
            suggestions,
        });
    };

    const applyAutocompleteChoice = (forcedIndex?: number) => {
        if (!metaAutocomplete.open || !metaAutocomplete.kind || metaAutocomplete.suggestions.length === 0) return;
        const idx = typeof forcedIndex === 'number'
            ? forcedIndex
            : metaAutocomplete.selectedIndex;
        const chosen = metaAutocomplete.suggestions[idx];
        if (!chosen) return;
        appendCommand(metaAutocomplete.kind, chosen);
        setInput((prev) => `${prev.slice(0, metaAutocomplete.rangeStart)}${prev.slice(metaAutocomplete.rangeEnd)}`.replace(/\s{2,}/g, ' '));
        closeAutocomplete();
    };

    const handleTokenDrop = (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData('text/plain') || '';
        const [kind, ...rest] = raw.split(':');
        const value = rest.join(':').trim();
        if (!value) return;
        if (kind === 'agent' || kind === 'pipeline' || kind === 'skill') {
            appendCommand(kind, value);
        }
    };

    const removeToken = (kind: PromptTokenKind, value: string) => {
        setPromptTokens((prev) => prev.filter((t) => !(t.kind === kind && t.value === value)));
    };

    const rehydrateTokenIntoInput = (token: PromptToken) => {
        const prefix = token.kind === 'agent' ? '@' : token.kind === 'pipeline' ? '/' : '#';
        setInput((prev) => `${prev}${prev ? ' ' : ''}${prefix}${token.value} `);
    };

    const slugifyProjectId = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || `project-${Date.now()}`;

    const getFolderNameFromPath = (value: string): string => {
        const trimmed = value.trim().replace(/[\\/]+$/, '');
        if (!trimmed) return '';
        const segments = trimmed.split(/[\\/]/).filter(Boolean);
        return segments[segments.length - 1] || '';
    };

    const getUniqueProjectId = (baseId: string): string => {
        const existing = new Set(railProjects.map((p) => p.id));
        if (!existing.has(baseId)) return baseId;
        let idx = 2;
        while (existing.has(`${baseId}-${idx}`)) idx += 1;
        return `${baseId}-${idx}`;
    };

    const handleCreateChain = async (projectIdArg?: string, labelArg?: string) => {
        const projectId = projectIdArg || selectedProject;
        if (!projectId) return;
        const data = await fetchJsonSafe<any>('/api/cockpit/chains', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                label: labelArg || `New chat ${new Date().toLocaleTimeString()}`,
            }),
        });
        if (!data?.success) {
            setProviderMessage('Failed to create chain: backend unavailable');
            return;
        }
        setRailProjects(data.projects || []);
        setRailThreadsByProject(data.threadsByProject || {});
        setSelectedProject(projectId);
        if (data.thread?.id) setSelectedThread(data.thread.id);
    };

    const handleChooseDirectory = async () => {
        const win = window as DirectoryPickerWindow;
        if (!win.showDirectoryPicker) {
            setProviderMessage('Directory picker is unavailable in this browser. Paste folder path manually.');
            return;
        }
        try {
            const handle = await win.showDirectoryPicker();
            const folderName = String(handle?.name || '').trim();
            if (folderName) setProjectDirectory(folderName);
        } catch {
            // User canceled picker.
        }
    };

    const handleAddNewProject = async () => {
        const folderName = getFolderNameFromPath(projectDirectory);
        if (!folderName) return;
        const projectId = getUniqueProjectId(slugifyProjectId(folderName));
        await handleCreateChain(projectId, 'New chat');
        setSelectedProject(projectId);
        setProjectDirectory('');
        setIsProjectModalOpen(false);
    };

    const handleAddNewChain = async () => {
        const chainLabel = (newChainLabel || '').trim() || `New chat ${new Date().toLocaleTimeString()}`;
        const projectId = newChainScope === 'unbound' ? '__unbound__' : selectedProject;
        if (!projectId) return;
        await handleCreateChain(projectId, chainLabel);
        setIsChainModalOpen(false);
        setNewChainLabel('');
        setNewChainScope('current');
    };

    const planeTicketUrl = (ticketId: string): string | null => {
        if (!ticketId || ticketId.startsWith('chat-')) return null;
        const env = (import.meta as { env?: Record<string, string | undefined> }).env;
        const base = env?.VITE_PLANE_BASE_URL || 'https://app.plane.so';
        const projectCode = env?.VITE_PLANE_PROJECT_CODE || 'AGENTS';
        return `${base.replace(/\/$/, '')}/workspace/projects/${projectCode}/issues/${ticketId}`;
    };

    const statusBadgeClass = (status?: string): string => {
        const s = (status || '').toLowerCase();
        if (s.includes('success') || s.includes('done') || s.includes('completed')) return 'status-badge ok';
        if (s.includes('fail') || s.includes('error') || s.includes('blocked')) return 'status-badge fail';
        if (s.includes('progress') || s.includes('running') || s.includes('started')) return 'status-badge progress';
        return 'status-badge neutral';
    };

    const prettyStage = (value?: string) => {
        if (!value) return 'n/a';
        return value
            .replace(/[_-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (m) => m.toUpperCase());
    };

    const prettyEventType = (value?: string) => {
        if (!value) return 'event';
        return value
            .split('.')
            .map((part) => prettyStage(part))
            .join(' / ');
    };
    const runtimeModeLabel = mode === 'mock' ? 'Mock' : mode === 'linear' ? 'Quasi-linear' : 'Multiple agents';

    const applyRuntimeSelection = async (provider?: RuntimeProvider, model?: string) => {
        const nextProvider = provider || selectedProvider;
        const nextModel = model || selectedModel;
        const data = await fetchJsonSafe<any>('/api/cockpit/providers/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: nextProvider, model: nextModel }),
        });
        setProviderMessage(data?.success
            ? `runtime set: ${nextProvider}/${nextModel}`
            : 'runtime select failed: backend unavailable');
    };

    const loadRuntimeFooter = async () => {
        const data = await fetchJsonSafe<any>('/api/cockpit/runtime-footer');
        if (data?.success && data.runtimeFooter) {
            setRuntimeFooter(data.runtimeFooter);
            setGitContext({
                activeBranch: data.runtimeFooter.activeBranch,
                worktreePath: data.runtimeFooter.worktreePath,
                preflightToken: data.runtimeFooter.preflightToken,
            });
        }
    };

    const updateRuntimeFooter = async (patch: Partial<Pick<RuntimeFooterState, 'executionTarget' | 'accessPolicy'>>) => {
        const data = await fetchJsonSafe<any>('/api/cockpit/runtime-footer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (data?.success && data.runtimeFooter) {
            setRuntimeFooter((prev) => ({ ...prev, ...data.runtimeFooter }));
        } else {
            setProviderMessage('runtime footer update failed: backend unavailable');
        }
    };

    return (
        <div className="cockpit-container">
            {/* Header */}
            <header className="cockpit-header">
                <div className="header-title">
                    <LayoutDashboard size={24} />
                    Agent Cockpit
                    {providerMessage && <span className="provider-feedback">{providerMessage}</span>}
                </div>
                <div className="header-actions">
                    <IconButton className="header-icon-btn" onClick={() => navigate('/cockpit/settings/general')} title="Settings" aria-label="Settings">
                        <Settings size={15} />
                    </IconButton>
                </div>
            </header>

            <main className="cockpit-main">
                <aside className={`rail-panel ${railCollapsed ? 'collapsed' : ''}`}>
                    <div className="rail-head">
                        <span>{railCollapsed ? 'AC' : 'Agent Cockpit'}</span>
                        <button type="button" className="rail-toggle" onClick={() => setRailCollapsed((p) => !p)} title={railCollapsed ? 'Open sidebar' : 'Hide sidebar'} aria-label={railCollapsed ? 'Open sidebar' : 'Hide sidebar'}>
                            {railCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
                        </button>
                    </div>
                    {!railCollapsed && (
                        <>
                            <div className="rail-top-actions">
                                <button
                                    type="button"
                                    className="rail-top-btn"
                                    onClick={() => {
                                        if (!selectedProject) {
                                            setIsProjectModalOpen(true);
                                            return;
                                        }
                                        setIsChainModalOpen(true);
                                    }}
                                >
                                    <PencilLine size={13} />
                                    <span>Новий ланцюжок</span>
                                </button>
                                <button type="button" className="rail-top-btn" onClick={() => setIsProjectModalOpen(true)}>
                                    <FolderPlus size={13} />
                                    <span>Add new project</span>
                                </button>
                            </div>
                            <div className="rail-section-head">
                                <span>Projects</span>
                            </div>
                            <div className="rail-project-list">
                                {railProjects.map((project) => (
                                    <div key={project.id} className="rail-project-node">
                                        <button
                                            type="button"
                                            className={`rail-project-btn ${selectedProject === project.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedProject(project.id);
                                                setSelectedThread((railThreadsByProject[project.id] || [])[0]?.id || '');
                                            }}
                                        >
                                            <Folder size={13} />
                                            <span>{project.label}</span>
                                        </button>
                                        {selectedProject === project.id && (
                                            <div className="rail-thread-list nested">
                                                {(railThreadsByProject[project.id] || []).map((thread) => (
                                                    <button
                                                        key={thread.id}
                                                        type="button"
                                                        className={`rail-thread-btn ${selectedThread === thread.id ? 'active' : ''}`}
                                                        onClick={() => setSelectedThread(thread.id)}
                                                    >
                                                        <span className="rail-thread-label">{thread.label}</span>
                                                        <span className="rail-thread-age">{new Date(thread.updatedAt).toLocaleDateString()}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </aside>
                {/* Left Panel: Chat Input */}
                <section className="left-panel">
                    <div className="panel-title">
                        <Terminal size={20} />
                        Command Interface
                    </div>

                    <div className="chat-container">
                        {observability && (
                            <div className="observability-card">
                                <div className="observability-title">Pipeline Observability</div>
                                <div className="observability-grid">
                                    <span>Pipeline</span><strong>{observability.pipeline}</strong>
                                    <span>Stage</span><strong>{observability.stage}</strong>
                                    <span>Next</span><strong>{observability.nextStage}</strong>
                                    <span>Gates</span><strong>{observability.blockingGates}</strong>
                                    <span>Approval</span><strong>{observability.approvalReason}</strong>
                                </div>
                            </div>
                        )}
                        {(currentTicketId || gitContext) && (
                            <div className="artifact-strip">
                                {currentTicketId && (
                                    <div>
                                        <strong>Ticket:</strong>{' '}
                                        {planeTicketUrl(currentTicketId) ? (
                                            <a href={planeTicketUrl(currentTicketId)!} target="_blank" rel="noreferrer">{currentTicketId}</a>
                                        ) : (
                                            currentTicketId
                                        )}
                                    </div>
                                )}
                                {gitContext?.activeBranch && <div><strong>Branch:</strong> {gitContext.activeBranch}</div>}
                                {gitContext?.worktreePath && <div><strong>Worktree:</strong> {gitContext.worktreePath}</div>}
                                {gitContext?.preflightToken && <div><strong>Preflight:</strong> {gitContext.preflightToken}</div>}
                            </div>
                        )}
                        {scopeCardPinned && workScope.items.length > 0 && (
                            <div className="chat-scope-card">
                                <div className="chat-scope-head">
                                    <div>
                                        <strong>Execution Scope</strong>
                                        <div className="chat-scope-sub">PM checklist: Sprint / Story / Task</div>
                                    </div>
                                    <button type="button" className="context-pill" onClick={() => setScopeCardPinned(false)}>Unpin</button>
                                </div>
                                <div className="health-grid">
                                    <span>Total</span><strong>{workScope.statusSummary.total}</strong>
                                    <span>Done</span><strong className="health-ok">{workScope.statusSummary.done}</strong>
                                    <span>In Progress</span><strong>{workScope.statusSummary.inProgress}</strong>
                                    <span>Todo</span><strong>{workScope.statusSummary.todo}</strong>
                                </div>
                                <div className="scope-multiselect">
                                    {workScope.items.slice(0, 10).map((it) => {
                                        const checked = selectedScopeItemIds.includes(it.id);
                                        return (
                                            <label key={`chat-scope-${it.id}`} className="scope-check-item">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        setSelectedScopeItemIds((prev) =>
                                                            checked ? prev.filter((id) => id !== it.id) : [...prev, it.id]
                                                        )
                                                    }
                                                />
                                                <span><strong>{it.key}</strong> {it.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {!scopeCardPinned && workScope.items.length > 0 && (
                            <button type="button" className="scope-pin-restore" onClick={() => setScopeCardPinned(true)}>
                                Pin Scope Checklist
                            </button>
                        )}

                        {messages.length === 0 && status === 'idle' ? (
                            <div style={{opacity: 0.5, fontStyle: 'italic', margin: 'auto'}}>
                                No tasks yet. How can the Swarm assist you today?
                            </div>
                        ) : null}
                        
                        {messages.map((m) => (
                            <div key={m.id} className={`chat-bubble ${m.role}`}>
                                <div className="chat-meta">
                                    <span>{m.role === 'user' ? 'Me' : 'Agent'}</span>
                                    <span>{m.timestamp.toLocaleTimeString()}</span>
                                </div>
                                <div style={{whiteSpace: 'pre-wrap'}}>{m.content}</div>
                            </div>
                        ))}
                        
                        {status === 'awaiting_approval' && (
                            <div className="approval-card">
                                <p>Agent is waiting for your approval to proceed to the next stage.</p>
                                <button 
                                    className="approve-btn" 
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Approve & Continue'}
                                </button>
                            </div>
                        )}
                        
                        <div ref={scrollRef} />
                    </div>

                    <div className="task-input-wrapper">
                        {showCatalogPicker && (
                            <div className="composer-catalog-popover">
                                <div className="catalog-section">
                                    <strong>Agents</strong>
                                    <div className="catalog-chip-list">
                                        {catalog.agents.length === 0 && <span className="catalog-list">No data</span>}
                                        {catalog.agents.map((item) => (
                                            <button
                                                key={`agent-pop-${item}`}
                                                className="catalog-chip"
                                                onClick={() => appendCommand('agent', item)}
                                            >
                                                @{item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="catalog-section">
                                    <strong>Pipelines</strong>
                                    <div className="catalog-chip-list">
                                        {catalog.pipelines.length === 0 && <span className="catalog-list">No data</span>}
                                        {catalog.pipelines.map((item) => (
                                            <button
                                                key={`pipeline-pop-${item}`}
                                                className="catalog-chip"
                                                onClick={() => appendCommand('pipeline', item)}
                                            >
                                                /{item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="catalog-section">
                                    <strong>Skills</strong>
                                    <div className="catalog-chip-list">
                                        {catalog.skills.length === 0 && <span className="catalog-list">No data</span>}
                                        {catalog.skills.map((item) => (
                                            <button
                                                key={`skill-pop-${item}`}
                                                className="catalog-chip"
                                                onClick={() => appendCommand('skill', item)}
                                            >
                                                #{item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {promptTokens.length > 0 && (
                            <div className="composer-chip-strip">
                                {promptTokens.map((token) => (
                                    <button
                                        key={`${token.kind}:${token.value}`}
                                        className="composer-chip"
                                        onClick={() => removeToken(token.kind, token.value)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            rehydrateTokenIntoInput(token);
                                            removeToken(token.kind, token.value);
                                        }}
                                        title="Remove token"
                                    >
                                        {token.kind}: {token.value} ×
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea 
                            ref={textareaRef}
                            className="task-textarea"
                            placeholder="Describe the feature, issue, or strategy idea..."
                            value={input}
                            onChange={e => {
                                const value = e.target.value;
                                const cursor = e.target.selectionStart ?? value.length;
                                setInput(value);
                                updateAutocomplete(value, cursor);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleTokenDrop}
                            onKeyDown={e => {
                                if (metaAutocomplete.open) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setMetaAutocomplete((prev) => ({
                                            ...prev,
                                            selectedIndex: (prev.selectedIndex + 1) % prev.suggestions.length,
                                        }));
                                        return;
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setMetaAutocomplete((prev) => ({
                                            ...prev,
                                            selectedIndex: prev.selectedIndex === 0 ? prev.suggestions.length - 1 : prev.selectedIndex - 1,
                                        }));
                                        return;
                                    }
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        applyAutocompleteChoice();
                                        return;
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        closeAutocomplete();
                                        return;
                                    }
                                }
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                                    e.preventDefault();
                                    setShowCatalogPicker((prev) => !prev);
                                    return;
                                }
                                if (e.key === 'Backspace' && !input.trim() && promptTokens.length > 0) {
                                    e.preventDefault();
                                    const last = promptTokens[promptTokens.length - 1];
                                    removeToken(last.kind, last.value);
                                    return;
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={2}
                        />
                        {metaAutocomplete.open && (
                            <div className="meta-autocomplete">
                                {metaAutocomplete.suggestions.map((item, idx) => (
                                    <button
                                        key={`${metaAutocomplete.kind}-${item}`}
                                        className={`meta-option ${idx === metaAutocomplete.selectedIndex ? 'active' : ''}`}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => applyAutocompleteChoice(idx)}
                                    >
                                        <span className="meta-prefix">{metaAutocomplete.kind === 'agent' ? '@' : metaAutocomplete.kind === 'pipeline' ? '/' : '#'}</span>
                                        <span>{item}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {ghostText && (
                            <div className="ghost-text-overlay">
                                <span className="ghost-label">Listening:</span> {ghostText}...
                            </div>
                        )}
                        <div className="composer-controls-row">
                            <div className="input-context-selectors">
                                <Dropdown
                                    label={voiceLang === 'auto' ? 'Auto' : voiceLang.toUpperCase()}
                                    icon={<Globe2 size={12} />}
                                    title="Voice language"
                                    open={runtimePickerOpen === 'voice'}
                                    onToggle={() => setRuntimePickerOpen((prev) => (prev === 'voice' ? null : 'voice'))}
                                    options={([
                                        { id: 'auto', label: 'Auto' },
                                        { id: 'uk', label: 'UA' },
                                        { id: 'en', label: 'EN' },
                                    ] as const).map((item) => ({
                                        key: `voice-${item.id}`,
                                        label: item.label,
                                        active: voiceLang === item.id,
                                        onClick: () => {
                                            setVoiceLang(item.id);
                                            setRuntimePickerOpen(null);
                                        },
                                    }))}
                                />
                                <Dropdown
                                    label={selectedProvider}
                                    title="Provider"
                                    open={runtimePickerOpen === 'provider'}
                                    onToggle={() => setRuntimePickerOpen((prev) => (prev === 'provider' ? null : 'provider'))}
                                    options={(['claude-cli', 'codex-cli', 'openhands-sdk'] as const).map((provider) => ({
                                        key: `provider-${provider}`,
                                        label: provider,
                                        active: selectedProvider === provider,
                                        onClick: () => {
                                            const fallbackModel = providerModelPresets[provider]?.[0] || 'auto';
                                            setSelectedProvider(provider);
                                            setSelectedModel(fallbackModel);
                                            setRuntimePickerOpen(null);
                                            void applyRuntimeSelection(provider, fallbackModel);
                                        },
                                    }))}
                                />
                                <Dropdown
                                    label={selectedModel}
                                    title="Model"
                                    open={runtimePickerOpen === 'model'}
                                    onToggle={() => setRuntimePickerOpen((prev) => (prev === 'model' ? null : 'model'))}
                                    options={(providerModelPresets[selectedProvider] || ['auto']).map((model) => ({
                                        key: `model-${model}`,
                                        label: model,
                                        active: selectedModel === model,
                                        onClick: () => {
                                            setSelectedModel(model);
                                            setRuntimePickerOpen(null);
                                            void applyRuntimeSelection(selectedProvider, model);
                                        },
                                    }))}
                                />
                                <div className="runtime-picker">
                                    <button
                                        type="button"
                                        className={`runtime-picker-btn runtime-inline-btn icon-only ${showPlusMenu ? 'active' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setShowPlusMenu((prev) => !prev);
                                        }}
                                        title="Add action"
                                        aria-label="Add action"
                                    >
                                        <Plus size={13} />
                                    </button>
                                    {showPlusMenu && (
                                        <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                            <button
                                                type="button"
                                                className={`runtime-picker-option ${showCatalogPicker ? 'active' : ''}`}
                                                onClick={() => {
                                                    setShowCatalogPicker((prev) => !prev);
                                                    setShowPlusMenu(false);
                                                }}
                                            >
                                                Toggle catalog
                                            </button>
                                            <button
                                                type="button"
                                                className="runtime-picker-option"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setShowPlusMenu(false);
                                                }}
                                            >
                                                Attach file token
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="input-actions">
                                <IconButton
                                    active={isRecording}
                                    className={`icon-btn icon-btn-codex-mic ${isRecording ? 'recording' : ''}`}
                                    onClick={toggleRecording}
                                    disabled={isProcessing}
                                    title="Use Voice Input"
                                >
                                    <Mic size={15} />
                                </IconButton>
                                <IconButton
                                    className="icon-btn icon-btn-codex-send"
                                    onClick={handleSend}
                                    disabled={(!input.trim() && promptTokens.length === 0) || isProcessing || isRecording}
                                    aria-label="Send task"
                                    title="Send task"
                                >
                                    <Send size={15} />
                                </IconButton>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileAttach}
                        />
                        <div className="composer-shortcuts compact">
                            <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd> catalog
                        </div>
                        <div className="runtime-footer-strip">
                            <Dropdown
                                label={runtimeFooter.executionTarget === 'local' ? 'Локально' : 'Віддалено'}
                                icon={<Laptop size={12} />}
                                title="Execution target"
                                open={runtimePickerOpen === 'target'}
                                onToggle={() => setRuntimePickerOpen((prev) => (prev === 'target' ? null : 'target'))}
                                options={[
                                    {
                                        key: 'target-local',
                                        label: 'Локально',
                                        active: runtimeFooter.executionTarget === 'local',
                                        onClick: () => {
                                            void updateRuntimeFooter({ executionTarget: 'local' });
                                            setRuntimePickerOpen(null);
                                        },
                                    },
                                    {
                                        key: 'target-remote',
                                        label: 'Віддалено',
                                        active: runtimeFooter.executionTarget === 'remote',
                                        onClick: () => {
                                            void updateRuntimeFooter({ executionTarget: 'remote' });
                                            setRuntimePickerOpen(null);
                                        },
                                    },
                                ]}
                            />
                            <Dropdown
                                label={runtimeFooter.accessPolicy === 'full-access' ? 'Повний доступ' : 'Sandbox'}
                                icon={<ShieldCheck size={12} />}
                                title="Access policy"
                                open={runtimePickerOpen === 'access'}
                                onToggle={() => setRuntimePickerOpen((prev) => (prev === 'access' ? null : 'access'))}
                                options={[
                                    {
                                        key: 'access-full',
                                        label: 'Повний доступ',
                                        active: runtimeFooter.accessPolicy === 'full-access',
                                        onClick: () => {
                                            void updateRuntimeFooter({ accessPolicy: 'full-access' });
                                            setRuntimePickerOpen(null);
                                        },
                                    },
                                    {
                                        key: 'access-sandbox',
                                        label: 'Sandbox',
                                        active: runtimeFooter.accessPolicy === 'sandbox',
                                        onClick: () => {
                                            void updateRuntimeFooter({ accessPolicy: 'sandbox' });
                                            setRuntimePickerOpen(null);
                                        },
                                    },
                                ]}
                            />
                            <div className="runtime-picker">
                                <button
                                    type="button"
                                    className="runtime-footer-item runtime-footer-item-branch"
                                    title="Git branch"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setRuntimePickerOpen((prev) => (prev === 'branch' ? null : 'branch'));
                                    }}
                                >
                                    <GitBranch size={12} />
                                    <span>{runtimeFooter.activeBranch || gitContext?.activeBranch || 'main'}</span>
                                    <ChevronDown size={11} />
                                </button>
                                {runtimePickerOpen === 'branch' && (
                                    <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" className="runtime-picker-option">
                                            Branch: {runtimeFooter.activeBranch || gitContext?.activeBranch || 'main'}
                                        </button>
                                        <button
                                            type="button"
                                            className="runtime-picker-option"
                                            onClick={() => {
                                                const value = runtimeFooter.worktreePath || gitContext?.worktreePath || '';
                                                if (value) void navigator.clipboard?.writeText(value);
                                                setRuntimePickerOpen(null);
                                            }}
                                        >
                                            {runtimeFooter.worktreePath || gitContext?.worktreePath ? 'Copy worktree path' : 'Worktree path unavailable'}
                                        </button>
                                        <button
                                            type="button"
                                            className="runtime-picker-option"
                                            onClick={() => {
                                                const value = runtimeFooter.preflightToken || gitContext?.preflightToken || '';
                                                if (value) void navigator.clipboard?.writeText(value);
                                                setRuntimePickerOpen(null);
                                            }}
                                        >
                                            {runtimeFooter.preflightToken || gitContext?.preflightToken ? 'Copy preflight token path' : 'Preflight token unavailable'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button type="button" className="runtime-footer-item runtime-footer-item-mode" title="Runtime mode">
                                <span>{runtimeModeLabel}</span>
                            </button>
                            <IconButton className="runtime-footer-item icon-only" title="Refresh runtime state" onClick={() => void loadRuntimeFooter()}>
                                <RefreshCw size={12} />
                            </IconButton>
                        </div>
                    </div>

                </section>

                {/* Right Panel: Event Feed & Active Agent */}
                <section className="right-panel">
                    <div className="panel-title">
                        <Activity size={20} />
                        Live Hive State
                    </div>
                    
                    <div className="agent-status-card">
                        <div className="agent-avatar">
                            <Cpu size={24} color={'white'} />
                        </div>
                        <div className="agent-info">
                            <div className="agent-name">Swarm Controller</div>
                            <div className="agent-activity">
                                {events.length > 0 
                                    ? `Last Active: ${events[events.length-1].agent_role || 'System'} (${mode})`
                                    : `Listening on Events Hub...`}
                            </div>
                        </div>
                    </div>

                    <div className="feed-container">
                            <>
                                {executionFeed.length > 0 && (
                                    <div className="catalog-card">
                                        <div className="catalog-title">Execution Feed</div>
                                        {executionFeed.map((item, idx) => (
                                            <div key={`exec-${idx}`} className="execution-item">
                                                <div className="execution-head">
                                                    <span>{item.role || 'Unknown role'}</span>
                                                    <span>{item.stage || 'n/a'}</span>
                                                </div>
                                                <div className="execution-body">
                                                    <span className={statusBadgeClass(item.status)}>{item.status || 'unknown'}</span>
                                                    {item.fallback && <span className="execution-fallback">fallback: {item.fallback}</span>}
                                                </div>
                                                <div className="execution-msg">{item.message || item.raw}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {events.length === 0 ? (
                                    <div style={{opacity: 0.5, fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem'}}>
                                        No events yet...
                                    </div>
                                ) : null}
                                
                                {events.slice().reverse().map((ev, idx) => (
                                    <div key={ev.event_id || idx} className="feed-item observability-event-card">
                                        <div className="feed-header">
                                            <span>{ev.agent_role || 'System'}</span>
                                            <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="observability-event-type">{prettyEventType(ev.event_type)}</div>
                                        <div className="execution-body">
                                            <span className={statusBadgeClass(ev.status)}>{ev.status || 'unknown'}</span>
                                            <span>from: {prettyStage(ev.source_stage)}</span>
                                            <span>to: {prettyStage(ev.target_stage)}</span>
                                        </div>
                                        <div className="observability-event-grid">
                                            <span>Role</span>
                                            <strong>{ev.agent_role || 'system'}</strong>
                                            <span>Issue</span>
                                            <strong>
                                                {ev.plane_issue_id ? (
                                                    planeTicketUrl(ev.plane_issue_id) ? (
                                                        <a href={planeTicketUrl(ev.plane_issue_id)!} target="_blank" rel="noreferrer">{ev.plane_issue_id}</a>
                                                    ) : (
                                                        ev.plane_issue_id
                                                    )
                                                ) : (
                                                    'n/a'
                                                )}
                                            </strong>
                                            <span>Branch</span>
                                            <strong>{gitContext?.activeBranch || 'n/a'}</strong>
                                            <span>Worktree</span>
                                            <strong>{gitContext?.worktreePath || 'n/a'}</strong>
                                        </div>
                                    </div>
                                ))}
                            </>
                        <div ref={feedEndRef} />
                    </div>
                </section>
            </main>

            {isProjectModalOpen && (
                <Modal
                    labelledBy="project-modal-title"
                    title="Add Project Directory"
                    subtitle="Select a working folder. Project name is generated from the folder name."
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsProjectModalOpen(false);
                                    setProjectDirectory('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                disabled={!getFolderNameFromPath(projectDirectory)}
                                onClick={() => { void handleAddNewProject(); }}
                            >
                                Create Project
                            </Button>
                        </>
                    }
                >
                    <label htmlFor="project-directory-input" className="text-xs font-semibold text-slate-300">Directory Path</label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Input
                            id="project-directory-input"
                            value={projectDirectory}
                            onChange={(e) => setProjectDirectory(e.target.value)}
                            placeholder="/Users/.../your-project"
                        />
                        <Button variant="secondary" onClick={handleChooseDirectory}>
                            Choose Folder
                        </Button>
                    </div>
                    <div className="text-xs text-slate-400">
                        Project name: <strong>{getFolderNameFromPath(projectDirectory) || '—'}</strong>
                    </div>
                </Modal>
            )}

            {isChainModalOpen && (
                <Modal
                    labelledBy="chain-modal-title"
                    title="Create New Chain"
                    subtitle="Start a new chat chain in the current project or as unbound context."
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsChainModalOpen(false);
                                    setNewChainLabel('');
                                    setNewChainScope('current');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                disabled={!selectedProject && newChainScope === 'current'}
                                onClick={() => { void handleAddNewChain(); }}
                            >
                                Create Chain
                            </Button>
                        </>
                    }
                >
                    <label htmlFor="chain-label-input" className="text-xs font-semibold text-slate-300">Chain Name</label>
                    <Input
                        id="chain-label-input"
                        value={newChainLabel}
                        onChange={(e) => setNewChainLabel(e.target.value)}
                        placeholder="For example: Sprint planning sync"
                    />
                    <label htmlFor="chain-scope-select" className="text-xs font-semibold text-slate-300">Scope</label>
                    <select
                        id="chain-scope-select"
                        value={newChainScope}
                        onChange={(e) => setNewChainScope(e.target.value as 'current' | 'unbound')}
                        disabled={!selectedProject}
                        className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-60"
                    >
                        <option value="current">{selectedProject ? `Current project (${selectedProject})` : 'Current project unavailable'}</option>
                        <option value="unbound">Unbound chain (no project)</option>
                    </select>
                </Modal>
            )}
        </div>
    );
}
