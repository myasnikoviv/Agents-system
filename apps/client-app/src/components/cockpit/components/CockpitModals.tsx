import { useState, type FC } from 'react';
import { useCockpit } from '../context/CockpitContext';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Modal } from '../../ui/modal';
import { PencilLine, FolderOpen, Globe, GitBranch, Settings2, ShieldAlert } from 'lucide-react';
import { isAbsolutePath, getFolderNameFromPath, slugifyProjectId, getUniqueProjectId } from '../utils/cockpit-utils';
import './CockpitModals.css';

export const CockpitModals: FC = () => {
    const {
        isProjectModalOpen,
        setIsProjectModalOpen,
        isChainModalOpen,
        setIsChainModalOpen,
        selectedProject,
        railProjects,
        handleCreateChain,
    } = useCockpit();

    const [projectOnboardingMode, setProjectOnboardingMode] = useState<'local' | 'repository'>('repository');
    const [projectRepositoryUrl, setProjectRepositoryUrl] = useState('');
    const [projectRepositoryAuthMode] = useState<'none' | 'oauth' | 'pat'>('oauth');
    const [projectBootstrapMode] = useState<'none' | 'auto-template' | 'read-only'>('read-only');
    const [projectDirectory, setProjectDirectory] = useState('');
    const [projectAgentContextDirectory, setProjectAgentContextDirectory] = useState('');
    const [selectedPlaneProjectId] = useState('');
    const [createPlaneProject] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [newChainLabel, setNewChainLabel] = useState('');
    const [newChainScope, setNewChainScope] = useState<'current' | 'unbound'>('current');

    if (!isProjectModalOpen && !isChainModalOpen) return null;

    const resetProjectModalState = () => {
        setIsProjectModalOpen(false);
        setProjectOnboardingMode('repository');
        setProjectRepositoryUrl('');
        setProjectDirectory('');
        setProjectAgentContextDirectory('');
        setErrorMessage(null);
    };

    const handleChooseDirectory = async () => {
        const win = window as any;
        if (!win.showDirectoryPicker) {
            setErrorMessage('Native directory picker unavailable. Please enter path manually.');
            return;
        }
        try {
            const handle = await win.showDirectoryPicker();
            const explicitPath = String(handle?.path || handle?.fullPath || '').trim();
            if (explicitPath) {
                setProjectDirectory(explicitPath);
                if (!projectAgentContextDirectory) {
                    setProjectAgentContextDirectory(`${explicitPath}/.gemini/antigravity`);
                }
                return;
            }
            setErrorMessage(`Access granted to folder: ${handle.name}. Root path obscured by OS sandbox.`);
        } catch (e) {
            console.warn("Directory picker interaction failed", e);
        }
    };

    const handleAddNewProject = async () => {
        const absoluteDirectory = projectDirectory.trim();
        const absoluteAgentContextDirectory = projectAgentContextDirectory.trim();
        const repositoryUrl = projectRepositoryUrl.trim();

        if (projectOnboardingMode === 'local') {
            if (!isAbsolutePath(absoluteDirectory)) {
                setErrorMessage('Error: Absolute path required for local initialization.');
                return;
            }
        } else if (!repositoryUrl) {
            setErrorMessage('Error: Repository URL is mandatory for remote onboarding.');
            return;
        }

        const repoDerivedName = repositoryUrl
            .split('/')
            .filter(Boolean)
            .pop()
            ?.replace(/\.git$/i, '')
            || '';

        const folderName = projectOnboardingMode === 'local'
            ? getFolderNameFromPath(absoluteDirectory)
            : repoDerivedName;

        if (!folderName) {
            setErrorMessage('Error: Could not resolve project identity.');
            return;
        }

        const projectId = getUniqueProjectId(slugifyProjectId(folderName), railProjects);
        const success = await handleCreateChain(projectId, 'Initial Session', {
            projectLabel: folderName,
            worktreePath: absoluteDirectory || undefined,
            agentContextPath: absoluteAgentContextDirectory || undefined,
            planeProjectId: selectedPlaneProjectId || undefined,
            createPlaneProject,
            onboardingMode: projectOnboardingMode,
            repositoryUrl: repositoryUrl || undefined,
            onboardingAuthMode: projectRepositoryAuthMode,
            onboardingBootstrapMode: projectBootstrapMode,
            onboardingReadOnly: projectBootstrapMode === 'read-only',
        });

        if (success) {
            resetProjectModalState();
        }
    };

    const handleAddNewChain = async () => {
        const chainLabel = (newChainLabel || '').trim() || `Thread-${Date.now().toString().slice(-6)}`;
        const projectId = newChainScope === 'unbound' ? '__unbound__' : selectedProject;
        if (!projectId) return;

        const success = await handleCreateChain(projectId, chainLabel);
        if (success) {
            setIsChainModalOpen(false);
            setNewChainLabel('');
            setNewChainScope('current');
        }
    };

    const labelClass = "text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2 ml-1";

    return (
        <>
            {isProjectModalOpen && (
                <Modal 
                    title="Initialize Project" 
                    subtitle="Define project scope for the agentic swarm."
                    labelledBy="modal-init-project"
                    footer={
                        <div className="flex gap-3">
                            <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest" onClick={resetProjectModalState}>
                                Abort
                            </Button>
                            <Button size="sm" className="font-black text-[10px] uppercase tracking-widest px-6" onClick={handleAddNewProject}>
                                Initialize Project
                            </Button>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-6">
                        {errorMessage && (
                            <Badge variant="destructive" className="justify-start gap-2 h-auto py-2 px-3 text-[10px] font-bold border-destructive/20 bg-destructive/5">
                                <ShieldAlert size={14} className="shrink-0" />
                                <span className="uppercase tracking-tight leading-4">{errorMessage}</span>
                            </Badge>
                        )}

                        <div className="space-y-2">
                            <label className={labelClass}>
                                <Settings2 className="size-3" />
                                Onboarding Strategy
                            </label>
                            <div className="flex p-1 bg-secondary/20 rounded-xl border border-border/50 shadow-inner">
                                <button
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${projectOnboardingMode === 'repository' ? 'bg-background shadow-lg border border-border/50 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setProjectOnboardingMode('repository')}
                                >
                                    <Globe className="size-3.5" />
                                    Repository
                                </button>
                                <button
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${projectOnboardingMode === 'local' ? 'bg-background shadow-lg border border-border/50 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setProjectOnboardingMode('local')}
                                >
                                    <FolderOpen className="size-3.5" />
                                    Local Path
                                </button>
                            </div>
                        </div>

                        {projectOnboardingMode === 'repository' ? (
                            <div className="space-y-2">
                                <label className={labelClass}>
                                    <GitBranch className="size-3" />
                                    GIT Origin URL
                                </label>
                                <Input
                                    value={projectRepositoryUrl}
                                    onChange={(e) => setProjectRepositoryUrl(e.target.value)}
                                    placeholder="https://github.com/org/repo.git"
                                    className="h-10 text-[11px] font-mono bg-background/50 uppercase tracking-tighter"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className={labelClass}>
                                    <FolderOpen className="size-3" />
                                    Filesystem Root
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        value={projectDirectory}
                                        onChange={(e) => setProjectDirectory(e.target.value)}
                                        placeholder="/absolute/path/to/project"
                                        className="h-10 text-[11px] font-mono bg-background/50 uppercase tracking-tighter"
                                    />
                                    <Button variant="outline" size="sm" onClick={handleChooseDirectory} className="h-10 px-3 bg-background/50">
                                        <FolderOpen className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {isChainModalOpen && (
                <Modal 
                    title="Initialize New Thread" 
                    subtitle="Spawn a fresh context for agent collaboration."
                    labelledBy="modal-init-thread"
                    footer={
                        <div className="flex gap-3">
                            <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest" onClick={() => setIsChainModalOpen(false)}>
                                Dismiss
                            </Button>
                            <Button size="sm" className="font-black text-[10px] uppercase tracking-widest px-6" onClick={handleAddNewChain}>
                                Spawn Thread
                            </Button>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-6">
                        <div className="space-y-2">
                            <label className={labelClass}>
                                <PencilLine className="size-3" />
                                Thread Descriptor
                            </label>
                            <Input
                                value={newChainLabel}
                                onChange={(e) => setNewChainLabel(e.target.value)}
                                placeholder="Refactoring module X..."
                                className="h-10 text-xs font-bold uppercase tracking-widest bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Execution Scope</label>
                            <select
                                value={newChainScope}
                                onChange={(e) => setNewChainScope(e.target.value as 'current' | 'unbound')}
                                className="w-full bg-background/50 border border-border/50 rounded-xl px-3 h-10 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                            >
                                <option value="current">{selectedProject ? `Context: ${selectedProject}` : 'Bound to current'}</option>
                                <option value="unbound">Global Channel (Unbound)</option>
                            </select>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default CockpitModals;
