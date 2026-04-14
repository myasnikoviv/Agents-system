import React from 'react';
import { PanelLeftClose, PanelLeftOpen, PencilLine, FolderPlus, Folder, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '../../ui/separator';
import { useCockpit } from '../context/CockpitContext';

export const ProjectSidebar: React.FC = () => {
    const {
        railCollapsed,
        setRailCollapsed,
        selectedProject,
        setSelectedProject,
        selectedThread,
        setSelectedThread,
        railProjects,
        railThreadsByProject,
        setIsProjectModalOpen,
        setIsChainModalOpen,
        handleDeleteThread
    } = useCockpit();

    const openProjectModal = () => setIsProjectModalOpen(true);

    // Placeholder for deleted functions that I'll migrate to context later
    const handleDeleteProject = async (id: string) => { console.log('Delete project', id); };
    const syncProjectRuntimeContext = async (id: string) => { console.log('Sync project', id); };

    return (
        <aside className={`flex flex-col border-r border-border/50 bg-sidebar/5 transition-all duration-300 ${railCollapsed ? 'w-12' : 'w-72'}`}>
            <div className="flex items-center justify-between h-12 px-3 border-b border-border/50">
                {!railCollapsed && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</span>}
                <Button variant="ghost" size="icon" className="size-8 ml-auto" onClick={() => setRailCollapsed(!railCollapsed)} title={railCollapsed ? 'Open sidebar' : 'Hide sidebar'}>
                    {railCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>
            </div>
            {!railCollapsed && (
                <div className="flex-1 flex flex-col overflow-hidden p-3 gap-4">
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="justify-start gap-2 h-9"
                            onClick={() => {
                                if (!selectedProject) {
                                    openProjectModal();
                                    return;
                                }
                                setIsChainModalOpen(true);
                            }}
                        >
                            <PencilLine className="size-4" />
                            <span>New Thread</span>
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           className="justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
                           onClick={openProjectModal}
                        >
                            <FolderPlus className="size-4" />
                            <span>Add Project</span>
                        </Button>
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="flex items-center gap-2 px-1 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex-1">Projects</span>
                    </div>
                    <ScrollArea className="flex-1 -mx-1 px-1">
                        <div className="flex flex-col gap-1">
                            {railProjects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2 opacity-60">
                                    <Folder className="size-8 text-muted-foreground/40" />
                                    <div className="text-xs font-medium">No projects yet</div>
                                    <Button variant="outline" size="sm" className="h-8 gap-2 mt-2" onClick={openProjectModal}>
                                        <FolderPlus className="size-3.5" />
                                        Add Project
                                    </Button>
                                </div>
                            ) : railProjects.map((project) => (
                                <div key={project.id} className="flex flex-col gap-0.5">
                                    <div className="group flex items-center gap-1">
                                        <Button
                                            variant={selectedProject === project.id ? "secondary" : "ghost"}
                                            size="sm"
                                            className="flex-1 justify-start gap-2 h-8 px-2 text-xs font-medium"
                                            onClick={() => {
                                                setSelectedProject(project.id);
                                                setSelectedThread((railThreadsByProject[project.id] || [])[0]?.id || '');
                                                void syncProjectRuntimeContext(project.id);
                                            }}
                                        >
                                            <Folder className={`size-3.5 ${selectedProject === project.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <span className="truncate">{project.label}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void handleDeleteProject(project.id);
                                            }}
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                    {selectedProject === project.id && (
                                        <div className="flex flex-col gap-0.5 ml-4 pl-2 border-l border-border/50 my-1">
                                            {(railThreadsByProject[project.id] || []).map((thread) => (
                                                <div key={thread.id} className="group flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`flex-1 justify-start gap-2 h-7 px-2 text-[11px] font-normal ${selectedThread === thread.id ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                                                        onClick={() => setSelectedThread(thread.id)}
                                                    >
                                                        <span className="truncate flex-1 text-left">{thread.label}</span>
                                                        <span className="text-[9px] opacity-40 shrink-0">{new Date(thread.updatedAt).toLocaleDateString()}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void handleDeleteThread(project.id, thread.id);
                                                        }}
                                                    >
                                                        <Trash2 className="size-2.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </aside>
    );
};
