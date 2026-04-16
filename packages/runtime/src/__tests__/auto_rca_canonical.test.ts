import { canonicalAutoRcaIssueName, canonicalAutoRcaSource, isChatThreadTicket } from '../AutoRcaCanonical';

describe('AutoRcaCanonical', () => {
  it('detects chat thread ticket ids', () => {
    expect(isChatThreadTicket('chat-1774142794079')).toBe(true);
    expect(isChatThreadTicket('TRADE-207')).toBe(false);
  });

  it('maps chat ticket ids to single canonical unresolved source', () => {
    expect(canonicalAutoRcaSource('chat-1774142794079')).toBe('chat-unresolved');
    expect(canonicalAutoRcaIssueName('chat-1774142794079')).toBe('Auto-RCA follow-up: chat-unresolved');
  });

  it('keeps non-chat ticket ids unique', () => {
    expect(canonicalAutoRcaSource('TRADE-207')).toBe('TRADE-207');
    expect(canonicalAutoRcaIssueName('TRADE-207')).toBe('Auto-RCA follow-up: TRADE-207');
  });
});

