"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniqueProjectId = exports.isAbsolutePath = exports.getFolderNameFromPath = exports.slugifyProjectId = exports.sanitizeTaskText = exports.formatRawEventForChat = void 0;
const formatRawEventForChat = (event) => {
    const eventType = String(event.event_type || '').trim();
    if (!eventType)
        return null;
    const role = String(event.agent_role || event.actor?.role || event.actor?.id || 'system').trim();
    const stageRaw = String(event.payload?.stageId || event.source_stage || '').trim();
    const stageTitleRaw = String(event.payload?.stageTitle || event.payload?.toStageTitle || '').trim();
    const stageLabel = stageTitleRaw || stageRaw || 'n/a';
    const payloadPreview = String(event.payload?.message ||
        event.payload?.summary ||
        event.payload?.detail ||
        event.payload?.reason ||
        event.payload?.status ||
        event.payload?.content ||
        '').trim();
    const lines = [
        `event: \`${eventType}\``,
        `agent: \`${role}\``,
        `stage: \`${stageLabel}\``,
    ];
    if (payloadPreview) {
        lines.push(`payload: ${payloadPreview}`);
    }
    return lines.join(' | ');
};
exports.formatRawEventForChat = formatRawEventForChat;
const sanitizeTaskText = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed)
        return 'n/a';
    const compact = trimmed.replace(/\s+/g, ' ');
    if (compact.length > 120) {
        return `${compact.slice(0, 117)}...`;
    }
    return compact;
};
exports.sanitizeTaskText = sanitizeTaskText;
const slugifyProjectId = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `project-${Date.now()}`;
exports.slugifyProjectId = slugifyProjectId;
const getFolderNameFromPath = (value) => {
    const trimmed = value.trim().replace(/[\\/]+$/, '');
    if (!trimmed)
        return '';
    const segments = trimmed.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] || '';
};
exports.getFolderNameFromPath = getFolderNameFromPath;
const isAbsolutePath = (value) => {
    const v = value.trim();
    if (!v)
        return false;
    return v.startsWith('/') || /^[A-Za-z]:[\\/]/.test(v);
};
exports.isAbsolutePath = isAbsolutePath;
const getUniqueProjectId = (baseId, existingProjects) => {
    const existing = new Set(existingProjects.map((p) => p.id));
    if (!existing.has(baseId))
        return baseId;
    let idx = 2;
    while (existing.has(`${baseId}-${idx}`))
        idx += 1;
    return `${baseId}-${idx}`;
};
exports.getUniqueProjectId = getUniqueProjectId;
