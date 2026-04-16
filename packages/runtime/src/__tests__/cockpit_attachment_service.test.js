"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const CockpitAttachmentService_1 = require("../CockpitAttachmentService");
(0, globals_1.describe)('CockpitAttachmentService', () => {
    (0, globals_1.it)('stores uploaded attachment and returns it in registry list', async () => {
        const tmpDir = path_1.default.resolve(process.cwd(), 'uploads');
        await promises_1.default.mkdir(tmpDir, { recursive: true });
        const tempPath = path_1.default.resolve(tmpDir, `test-attachment-${Date.now()}.txt`);
        await promises_1.default.writeFile(tempPath, 'hello-attachment', 'utf-8');
        const saved = await (0, CockpitAttachmentService_1.saveCockpitAttachment)({
            tempPath,
            originalName: 'sample.txt',
            mimeType: 'text/plain',
            size: 16,
            projectId: 'agent_system',
            threadId: `thread-${Date.now()}`,
        });
        (0, globals_1.expect)(saved.id).toBeTruthy();
        (0, globals_1.expect)(saved.relativePath).toContain('docs/process/artifacts/attachments');
        (0, globals_1.expect)(saved.originalName).toBe('sample.txt');
        const listed = await (0, CockpitAttachmentService_1.listCockpitAttachments)({
            projectId: saved.projectId,
            threadId: saved.threadId,
        });
        (0, globals_1.expect)(listed.items.length).toBe(1);
        (0, globals_1.expect)(listed.items[0]?.id).toBe(saved.id);
    });
});
