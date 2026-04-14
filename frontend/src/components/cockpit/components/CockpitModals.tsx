import React, { useState } from 'react';
import { useCockpit } from '../context/CockpitContext';

export const CockpitModals: React.FC = () => {
    const {
        isProjectModalOpen,
        setIsProjectModalOpen,
        isChainModalOpen,
        setIsChainModalOpen,
        selectedProject,
        handleCreateChain,
    } = useCockpit();

    // Project Modal Local State
    const [projectOnboardingMode, setProjectOnboardingMode] = useState<'local' | 'repository'>('repository');
    const [projectRepositoryUrl, setProjectRepositoryUrl] = useState('');
    const [projectRepositoryAuthMode, setProjectRepositoryAuthMode] = useState<'none' | 'oauth' | 'pat'>('oauth');
    const [projectBootstrapMode, setProjectBootstrapMode] = useState<'none' | 'auto-template' | 'read-only'>('read-only');
    const [projectDirectory, setProjectDirectory] = useState('');
    const [projectAgentContextDirectory, setProjectAgentContextDirectory] = useState('');
    const [selectedPlaneProjectId, setSelectedPlaneProjectId] = useState('');
    const [createPlaneProject, setCreatePlaneProject] = useState(false);

    // Chain Modal Local State
    const [newChainLabel, setNewChainLabel] = useState('');
    const [newChainScope, setNewChainScope] = useState<'current' | 'unbound'>('current');

    if (!isProjectModalOpen && !isChainModalOpen) return null;

    const handleAddNewChain = async () => {
        await handleCreateChain(newChainLabel, newChainScope);
        setIsChainModalOpen(false);
        setNewChainLabel('');
        setNewChainScope('current');
    };

    return (
        <>
            {isProjectModalOpen && (
                <div className="cockpit-modal-overlay" role="dialog" aria-modal="true">
                    <div className="cockpit-modal-panel">
                        <div>
                            <h3 className="cockpit-modal-title">Add Project</h3>
                            <p className="cockpit-modal-subtitle">Choose local folder or repository-first onboarding.</p>
                        </div>
                        <div className="cockpit-modal-form mt-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Onboarding Mode</label>
                                <select
                                    value={projectOnboardingMode}
                                    onChange={(e) => setProjectOnboardingMode(e.target.value as 'local' | 'repository')}
                                    className="bg-muted border border-border/50 rounded-md p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="repository">Repository-first</option>
                                    <option value="local">Local directory</option>
                                </select>
                            </div>

                            {projectOnboardingMode === 'repository' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Repository URL</label>
                                        <input
                                            value={projectRepositoryUrl}
                                            onChange={(e) => setProjectRepositoryUrl(e.target.value)}
                                            placeholder="https://github.com/org/repo.git"
                                            className="bg-muted border border-border/50 rounded-md p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Directory Path</label>
                                        <input
                                            value={projectDirectory}
                                            onChange={(e) => setProjectDirectory(e.target.value)}
                                            placeholder="/Users/.../your-project"
                                            className="bg-muted border border-border/50 rounded-md p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button className="px-4 py-2 text-xs font-medium hover:bg-muted rounded-md transition-colors" onClick={() => setIsProjectModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md shadow-sm shadow-primary/20 hover:opacity-90 transition-all">
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isChainModalOpen && (
                <div className="cockpit-modal-overlay" role="dialog" aria-modal="true">
                    <div className="cockpit-modal-panel">
                        <div>
                            <h3 className="cockpit-modal-title">Create New Chain</h3>
                            <p className="cockpit-modal-subtitle">Start a new chat chain.</p>
                        </div>
                        <div className="cockpit-modal-form mt-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Chain Name</label>
                                <input
                                    value={newChainLabel}
                                    onChange={(e) => setNewChainLabel(e.target.value)}
                                    placeholder="e.g. Sprint planning sync"
                                    className="bg-muted border border-border/50 rounded-md p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Scope</label>
                                <select
                                    value={newChainScope}
                                    onChange={(e) => setNewChainScope(e.target.value as 'current' | 'unbound')}
                                    className="bg-muted border border-border/50 rounded-md p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="current">Current project</option>
                                    <option value="unbound">Unbound chain</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button className="px-4 py-2 text-xs font-medium hover:bg-muted rounded-md transition-colors" onClick={() => setIsChainModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md shadow-sm shadow-primary/20 hover:opacity-90 transition-all" onClick={handleAddNewChain}>
                                Create Chain
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
