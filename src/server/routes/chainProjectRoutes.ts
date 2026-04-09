import type express from 'express';

type ThreadItem = { id: string; label: string; updatedAt: string };
type ProjectItem = { id: string; label: string; worktreePath?: string; agentContextPath?: string };

interface ChainProjectRouteDeps {
  requireRole: (req: express.Request, res: express.Response, role?: 'member' | 'admin') => any;
  canUsePlane: () => boolean;
  fetchPlaneProjects: () => Promise<any[]>;
  projectStore: Map<string, ProjectItem>;
  threadStore: Map<string, ThreadItem[]>;
  threadMessageStore: Map<string, any[]>;
  planeBindingStore: Map<string, any>;
  syncPlaneBindingForProject: (
    project: ProjectItem,
    options?: { preferredPlaneProjectId?: string; createIfMissing?: boolean },
  ) => Promise<void>;
  validateProjectWorktree: (path?: string) => { value?: string } | { error: string; message: string };
  validateAgentContextPath: (path?: string) => { value?: string } | { error: string; message: string };
  ensureProject: (projectId: string, label: string, worktreePath?: string, agentContextPath?: string) => void;
  persistRuntimeStore: () => void;
  normalizeWorktreePath: (path: string) => string | undefined;
  resolveGitBranch: (worktreePath: string) => string;
  getRuntimeFooter: () => Record<string, any>;
  setRuntimeFooter: (next: Record<string, any>) => void;
  saveRuntimeState: (key: string, value: unknown) => void;
  refreshCatalog: (rootPath: string, options?: { activate?: boolean }) => Promise<any>;
}

export function registerChainProjectRoutes(app: express.Express, deps: ChainProjectRouteDeps): void {
  const buildChainsPayload = () => {
    const projects = Array.from(deps.projectStore.values());
    const threadsByProject = Array.from(deps.threadStore.entries()).reduce<Record<string, ThreadItem[]>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
    const planeBindings = Array.from(deps.planeBindingStore.entries()).reduce<Record<string, any>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
    return { success: true, projects, threadsByProject, planeBindings };
  };

  app.get('/api/cockpit/chains', (_req, res) => {
    const projects = Array.from(deps.projectStore.values());
    for (const project of projects) {
      if (!deps.planeBindingStore.has(project.id)) {
        void deps.syncPlaneBindingForProject(project);
      }
    }
    res.json(buildChainsPayload());
  });

  app.post('/api/cockpit/chains', (req, res) => {
    if (!deps.requireRole(req, res, 'member')) return;
    const projectId = String(req.body?.projectId || '').trim();
    const projectLabel = String(req.body?.projectLabel || '').trim();
    const worktreePath = String(req.body?.worktreePath || '').trim();
    const agentContextPath = String(req.body?.agentContextPath || '').trim();
    const selectedPlaneProjectId = String(req.body?.planeProjectId || '').trim();
    const createPlaneProject = Boolean(req.body?.createPlaneProject);
    const label = String(req.body?.label || '').trim() || `New chat ${new Date().toLocaleTimeString()}`;
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required' });
      return;
    }

    const creatingProject = !deps.projectStore.has(projectId);
    if (creatingProject) {
      if (projectId !== '__unbound__') {
        const validation = deps.validateProjectWorktree(worktreePath || undefined);
        if ('error' in validation) {
          res.status(400).json({ success: false, error: validation.error, message: validation.message });
          return;
        }
        const agentPathValidation = deps.validateAgentContextPath(agentContextPath || undefined);
        if ('error' in agentPathValidation) {
          res.status(400).json({ success: false, error: agentPathValidation.error, message: agentPathValidation.message });
          return;
        }

        if (!selectedPlaneProjectId && !createPlaneProject) {
          res.status(400).json({
            success: false,
            error: 'plane_project_required',
            message: 'Select an existing Plane project or explicitly enable new project creation.',
          });
          return;
        }
      }
      const derivedLabel = projectId === '__unbound__' ? 'Unbound' : (projectLabel || projectId);
      deps.ensureProject(projectId, derivedLabel, worktreePath || undefined, agentContextPath || undefined);
    } else if (projectLabel || worktreePath || agentContextPath) {
      if (worktreePath) {
        const validation = deps.validateProjectWorktree(worktreePath);
        if ('error' in validation) {
          res.status(400).json({ success: false, error: validation.error, message: validation.message });
          return;
        }
      }
      if (agentContextPath) {
        const agentPathValidation = deps.validateAgentContextPath(agentContextPath);
        if ('error' in agentPathValidation) {
          res.status(400).json({ success: false, error: agentPathValidation.error, message: agentPathValidation.message });
          return;
        }
      }
      const existing = deps.projectStore.get(projectId)!;
      deps.ensureProject(
        projectId,
        projectLabel || existing.label,
        worktreePath || existing.worktreePath,
        agentContextPath || existing.agentContextPath,
      );
    }

    const project = deps.projectStore.get(projectId);
    if (project) {
      if (creatingProject) {
        void deps.syncPlaneBindingForProject(project, {
          preferredPlaneProjectId: selectedPlaneProjectId || undefined,
          createIfMissing: createPlaneProject,
        });
      } else {
        void deps.syncPlaneBindingForProject(project);
      }
    }

    const nextThread = {
      id: `thread_${Date.now()}`,
      label,
      updatedAt: new Date().toISOString(),
    };
    const current = deps.threadStore.get(projectId) || [];
    deps.threadStore.set(projectId, [nextThread, ...current]);
    if (!deps.threadMessageStore.has(nextThread.id)) {
      deps.threadMessageStore.set(nextThread.id, []);
    }
    deps.persistRuntimeStore();

    res.json({ ...buildChainsPayload(), thread: nextThread });
  });

  app.get('/api/cockpit/plane/projects', async (_req, res) => {
    if (!deps.canUsePlane()) {
      res.json({
        success: true,
        configured: false,
        projects: [],
        message: 'Plane is not configured (PLANE_API_TOKEN / PLANE_BASE_URL / PLANE_WORKSPACE).',
      });
      return;
    }
    const projects = await deps.fetchPlaneProjects();
    res.json({ success: true, configured: true, projects });
  });

  app.delete('/api/cockpit/chains/:threadId', (req, res) => {
    if (!deps.requireRole(req, res, 'member')) return;
    const threadId = String(req.params.threadId || '').trim();
    if (!threadId) {
      res.status(400).json({ success: false, error: 'thread_id_required' });
      return;
    }

    let removed = false;
    for (const [projectId, threads] of deps.threadStore.entries()) {
      const nextThreads = threads.filter((t) => t.id !== threadId);
      if (nextThreads.length !== threads.length) {
        removed = true;
        deps.threadStore.set(projectId, nextThreads);
      }
    }
    if (removed) {
      deps.threadMessageStore.delete(threadId);
      deps.persistRuntimeStore();
    }

    res.json({ ...buildChainsPayload(), removedThreadId: threadId, removed });
  });

  app.delete('/api/cockpit/projects/:projectId', (req, res) => {
    if (!deps.requireRole(req, res, 'admin')) return;
    const projectId = String(req.params.projectId || '').trim();
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required' });
      return;
    }
    if (!deps.projectStore.has(projectId)) {
      res.status(404).json({ success: false, error: 'project_not_found' });
      return;
    }
    const threads = deps.threadStore.get(projectId) || [];
    for (const thread of threads) {
      deps.threadMessageStore.delete(thread.id);
    }
    deps.threadStore.delete(projectId);
    deps.projectStore.delete(projectId);
    deps.planeBindingStore.delete(projectId);

    deps.persistRuntimeStore();
    res.json({ ...buildChainsPayload(), removedProjectId: projectId, removed: true });
  });

  app.get('/api/cockpit/chains/:threadId/messages', (req, res) => {
    const threadId = String(req.params.threadId || '').trim();
    if (!threadId) {
      res.status(400).json({ success: false, error: 'thread_id_required' });
      return;
    }
    res.json({ success: true, threadId, messages: deps.threadMessageStore.get(threadId) || [] });
  });

  app.post('/api/cockpit/projects/select', async (req, res) => {
    if (!deps.requireRole(req, res, 'member')) return;
    const projectId = String(req.body?.projectId || '').trim();
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required' });
      return;
    }
    const project = deps.projectStore.get(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'project_not_found' });
      return;
    }

    let runtimeFooter = deps.getRuntimeFooter();
    if (project.worktreePath && project.worktreePath.trim()) {
      const normalizedWorktree = deps.normalizeWorktreePath(project.worktreePath) || project.worktreePath.trim();
      const nextBranch = deps.resolveGitBranch(normalizedWorktree);
      runtimeFooter = {
        ...runtimeFooter,
        worktreePath: normalizedWorktree,
        activeBranch: nextBranch,
      };
      project.worktreePath = normalizedWorktree;
      deps.projectStore.set(project.id, project);
      deps.persistRuntimeStore();
      deps.setRuntimeFooter(runtimeFooter);
      deps.saveRuntimeState('runtime_footer', runtimeFooter);
    }

    const discoveryRoot = project.agentContextPath || project.worktreePath || process.cwd();
    await deps.refreshCatalog(discoveryRoot, { activate: true });
    const { applyProjectSwitchRuntimePolicy } = await import('../runtime/policy/ProjectSwitchRuntimePolicy');
    const switchPolicy = await applyProjectSwitchRuntimePolicy({
      activeProjectId: projectId,
      knownProjectIds: Array.from(deps.projectStore.keys()),
    });

    res.json({ success: true, project, runtimeFooter, switchPolicy });
  });

  app.post('/api/cockpit/plane/sync', async (req, res) => {
    if (!deps.requireRole(req, res, 'admin')) return;
    const projectId = String(req.body?.projectId || '').trim();
    if (!projectId || !deps.projectStore.has(projectId)) {
      res.status(400).json({ success: false, error: 'project_not_found' });
      return;
    }
    await deps.syncPlaneBindingForProject(deps.projectStore.get(projectId)!);
    res.json({ success: true, binding: deps.planeBindingStore.get(projectId) || null });
  });

  app.get('/api/cockpit/plane/bindings', (_req, res) => {
    const bindings = Array.from(deps.planeBindingStore.values());
    res.json({ success: true, bindings });
  });
}
