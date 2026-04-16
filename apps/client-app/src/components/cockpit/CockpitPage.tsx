
import { CockpitProvider } from './context/CockpitContext';
import { ProjectSidebar } from './components/ProjectSidebar';
import { CommandInterface } from './components/CommandInterface';
import { HiveMonitor } from './components/HiveMonitor';
import { CockpitModals } from './components/CockpitModals';
import './CockpitPage.css';

/**
 * CockpitPage
 * 
 * Modular orchestrator for the Agent System Cockpit.
 * Replaces the previous monolithic implementation with a clean component tree.
 * State management is handled by CockpitProvider.
 */
export default function CockpitPage() {
    return (
        <CockpitProvider>
            <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
                {/* Left: Project & Workspace Sidebar */}
                <ProjectSidebar />

                {/* Main: Command Interface (Chat & Scope) */}
                <main className="flex-1 flex flex-col min-w-0 bg-background relative border-r border-border/50 shadow-2xl">
                    <CommandInterface />
                </main>

                {/* Right: Hive Monitor (Metrics, Queues, Workers) */}
                <HiveMonitor />

                {/* Transient Layers: Modals & Overlays */}
                <CockpitModals />
            </div>
        </CockpitProvider>
    );
}
