import { type FC } from 'react';
import { PanelLeftClose, PanelLeftOpen, PencilLine, FolderPlus, Folder, Trash2, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '../../ui/separator';
import { useCockpit } from '../context/CockpitContext';
import './ProjectSidebar.css';

export const ProjectSidebar: FC = () => {
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
        handleDeleteThread,
        handleDeleteProject,
        syncProjectRuntimeContext
    } = useCockpit();

    const openProjectModal = () => setIsProjectModalOpen(true);

    return (
        <aside className={`flex flex-col border-r border-border/50 bg-sidebar/5 transition-all duration-300 ${railCollapsed ? 'w-12' : 'w-72'}`}>
            <div className="flex items-center justify-between h-12 px-3 border-b border-border/50">
                {!railCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Workspace</span>}
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
                            className="justify-start gap-2 h-9 px-3 shadow-sm border border-border/50 font-bold text-xs"
                            onClick={() => {
                                if (!selectedProject) {
                                    openProjectModal();
                                    return;
                                }
                                setIsChainModalOpen(true);
                            }}
                        >
                            <PencilLine className="size-4 text-primary" />
                            <span>New Thread</span>
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           className="justify-start gap-2 h-9 px-3 text-muted-foreground hover:text-foreground font-medium text-xs"
                           onClick={openProjectModal}
                        >
                            <FolderPlus className="size-4" />
                            <span>Add Project</span>
                        </Button>
                    </div>
                    <Separator className="bg-border/30" />
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70 flex-1">Projects</span>
                    </div>
                    <ScrollArea className="flex-1 -mx-1 px-1">
                        <div className="flex flex-col gap-1 pb-4">
                            {railProjects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3 opacity-40">
                                    <Folder className="size-10 text-muted-foreground/20" />
                                    <div className="text-[10px] font-bold uppercase tracking-wider">No active project slots</div>
                                    <Button variant="outline" size="sm" className="h-8 gap-2 mt-2 font-bold text-[10px] uppercase" onClick={openProjectModal}>
                                        <Plus className="size-3" />
                                        Initialize
                                    </Button>
                                </div>
                            ) : railProjects.map((project) => (
                                <div key={project.id} className="flex flex-col gap-0.5">
                                    <div className="group flex items-center gap-1">
                                        <Button
                                            variant={selectedProject === project.id ? "secondary" : "ghost"}
                                            size="sm"
                                            className={`flex-1 justify-start gap-2 h-9 px-2 text-xs font-bold transition-all relative overflow-hidden ${selectedProject === project.id ? 'bg-primary/5 border-l-2 border-primary rounded-none' : 'text-muted-foreground hover:text-foreground'}`}
                                            onClick={() => {
                                                setSelectedProject(project.id);
                                                setSelectedThread((railThreadsByProject[project.id] || [])[0]?.id || '');
                                                void syncProjectRuntimeContext(project.id);
                                            }}
                                        >
                                            <Folder className={`size-3.5 ${selectedProject === project.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
                                            <span className="truncate">{project.label}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void handleDeleteProject(project.id);
                                            }}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                    {selectedProject === project.id && (
                                        <div className="flex flex-col gap-0.5 ml-4 pl-3 border-l border-border/50 my-1 py-1">
                                            {(railThreadsByProject[project.id] || []).length === 0 ? (
                                                <span className="text-[9px] text-muted-foreground/50 italic px-2">No threads in pool</span>
                                            ) : (railThreadsByProject[project.id] || []).map((thread) => (
                                                <div key={thread.id} className="group flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`flex-1 justify-start gap-2 h-8 px-2 text-[10px] font-bold uppercase tracking-tight transition-all ${selectedThread === thread.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground/70 hover:text-foreground'}`}
                                                        onClick={() => setSelectedThread(thread.id)}
                                                    >
                                                        <span className="truncate flex-1 text-left">{thread.label}</span>
                                                        <span className="text-[8px] opacity-30 shrink-0 font-mono">{new Date(thread.updatedAt).toLocaleDateString()}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void handleDeleteThread(project.id, thread.id);
                                                        }}
                                                    >
                                                        <Trash2 className="size-3" />
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

export default ProjectSidebar;
