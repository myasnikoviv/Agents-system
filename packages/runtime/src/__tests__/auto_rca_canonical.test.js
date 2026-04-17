"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AutoRcaCanonical_1 = require("../AutoRcaCanonical");
describe('AutoRcaCanonical', () => {
    it('detects chat thread ticket ids', () => {
        expect((0, AutoRcaCanonical_1.isChatThreadTicket)('chat-1774142794079')).toBe(true);
        expect((0, AutoRcaCanonical_1.isChatThreadTicket)('TRADE-207')).toBe(false);
    });
    it('maps chat ticket ids to single canonical unresolved source', () => {
        expect((0, AutoRcaCanonical_1.canonicalAutoRcaSource)('chat-1774142794079')).toBe('chat-unresolved');
        expect((0, AutoRcaCanonical_1.canonicalAutoRcaIssueName)('chat-1774142794079')).toBe('Auto-RCA follow-up: chat-unresolved');
    });
    it('keeps non-chat ticket ids unique', () => {
        expect((0, AutoRcaCanonical_1.canonicalAutoRcaSource)('TRADE-207')).toBe('TRADE-207');
        expect((0, AutoRcaCanonical_1.canonicalAutoRcaIssueName)('TRADE-207')).toBe('Auto-RCA follow-up: TRADE-207');
    });
});
