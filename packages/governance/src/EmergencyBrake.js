"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGlobalGovernanceDisabled = isGlobalGovernanceDisabled;
exports.isBypassAllowed = isBypassAllowed;
function isGlobalGovernanceDisabled() {
    return String(process.env.GOVERNANCE_DISABLE_ALL || '').toLowerCase() === 'true';
}
function isBypassAllowed(ctx) {
    const expected = String(process.env.GOVERNANCE_BYPASS_TOKEN || '').trim();
    if (!expected)
        return false;
    return String(ctx.bypassToken || '').trim() === expected;
}
