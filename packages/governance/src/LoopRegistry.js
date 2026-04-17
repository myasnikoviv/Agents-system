"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceLoopRegistryError = void 0;
exports.loadGovernanceLoopsFromDisk = loadGovernanceLoopsFromDisk;
exports.loadGovernanceLoops = loadGovernanceLoops;
exports.getGovernanceLoopById = getGovernanceLoopById;
exports.createGovernanceLoop = createGovernanceLoop;
exports.updateGovernanceLoop = updateGovernanceLoop;
exports.disableGovernanceLoop = disableGovernanceLoop;
exports.isGovernanceLoopRunnable = isGovernanceLoopRunnable;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@system/shared");
class GovernanceLoopRegistryError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GovernanceLoopRegistryError';
    }
}
exports.GovernanceLoopRegistryError = GovernanceLoopRegistryError;
function catalogFile(workspacePath) {
    const root = workspacePath || process.cwd();
    return (0, shared_1.resolveRuntimePath)(root, 'governanceLoopCatalogFile');
}
function normalizeLoops(input) {
    const seen = new Set();
    const now = new Date().toISOString();
    const normalized = [];
    for (const row of input) {
        if (!row?.id || seen.has(row.id))
            continue;
        seen.add(row.id);
        normalized.push({
            ...row,
            disabled: row.disabled === true,
            enabledByDefault: row.enabledByDefault !== false,
            scope: row.scope || { level: 'global' },
            metadata: {
                name: row.metadata?.name || row.id,
                description: row.metadata?.description || '',
                version: row.metadata?.version || '1.0.0',
                owner: row.metadata?.owner || 'system',
                tags: Array.isArray(row.metadata?.tags) ? row.metadata?.tags : [],
                createdAt: row.metadata?.createdAt || now,
                updatedAt: row.metadata?.updatedAt || now,
            },
        });
    }
    return normalized;
}
function loadGovernanceLoopsFromDisk(workspacePath) {
    const filePath = catalogFile(workspacePath);
    if (!fs_1.default.existsSync(filePath))
        return [];
    try {
        const raw = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        return normalizeLoops(Array.isArray(raw?.loops) ? raw.loops : []);
    }
    catch {
        return [];
    }
}
function writeCatalog(loops, workspacePath) {
    const filePath = catalogFile(workspacePath);
    fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
    fs_1.default.writeFileSync(filePath, JSON.stringify({ loops: normalizeLoops(loops) }, null, 2), 'utf-8');
}
function loadGovernanceLoops(workspacePath) {
    // AGSYS-35R: Source of Truth Enforcement (Synchronous Cache)
    const { assetRegistryV2 } = require('../registries/AssetRegistryV2');
    const fromRegistry = assetRegistryV2.listByTypeSync('loop');
    if (fromRegistry.length > 0) {
        return fromRegistry.map((asset) => asset.attributes);
    }
    // If registry is empty, we return empty list or throw if strictly required
    return [];
}
function getGovernanceLoopById(loopId, workspacePath) {
    return loadGovernanceLoops(workspacePath).find((row) => row.id === loopId);
}
function createGovernanceLoop(input, workspacePath) {
    const current = loadGovernanceLoops(workspacePath);
    if (current.some((row) => row.id === input.id)) {
        throw new GovernanceLoopRegistryError(`governance_loop_exists:${input.id}`);
    }
    const now = new Date().toISOString();
    const created = {
        ...input,
        enabledByDefault: input.enabledByDefault !== false,
        scope: input.scope || { level: 'global' },
        metadata: {
            name: input.metadata?.name || input.id,
            description: input.metadata?.description || '',
            version: input.metadata?.version || '1.0.0',
            owner: input.metadata?.owner || 'user',
            tags: Array.isArray(input.metadata?.tags) ? input.metadata?.tags : [],
            createdAt: input.metadata?.createdAt || now,
            updatedAt: now,
        },
    };
    writeCatalog([...current, created], workspacePath);
    return created;
}
function updateGovernanceLoop(loopId, patch, workspacePath) {
    const current = loadGovernanceLoops(workspacePath);
    const hit = current.find((row) => row.id === loopId);
    if (!hit)
        throw new GovernanceLoopRegistryError(`governance_loop_not_found:${loopId}`);
    const updated = {
        ...hit,
        ...patch,
        id: loopId,
        metadata: {
            ...(hit.metadata || {}),
            ...(patch.metadata || {}),
            updatedAt: new Date().toISOString(),
        },
    };
    writeCatalog(current.map((row) => (row.id === loopId ? updated : row)), workspacePath);
    return updated;
}
function disableGovernanceLoop(loopId, params, workspacePath) {
    const disabled = params?.disabled !== false;
    return updateGovernanceLoop(loopId, { disabled }, workspacePath);
}
function isGovernanceLoopRunnable(loop, input) {
    if (loop.disabled)
        return false;
    if (loop.scope?.level === 'project') {
        return !loop.scope.projectId || loop.scope.projectId === input.projectId;
    }
    if (loop.scope?.level === 'session') {
        const sameProject = !loop.scope.projectId || loop.scope.projectId === input.projectId;
        const sameSession = !loop.scope.sessionId || loop.scope.sessionId === input.chainId;
        return sameProject && sameSession;
    }
    return true;
}
