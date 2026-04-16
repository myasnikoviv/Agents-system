export function isChatThreadTicket(ticketId: string): boolean {
  return /^chat-\d+$/i.test(String(ticketId || '').trim());
}

export function canonicalAutoRcaSource(ticketId: string): string {
  return isChatThreadTicket(ticketId) ? 'chat-unresolved' : String(ticketId || '').trim();
}

export function canonicalAutoRcaIssueName(ticketId: string): string {
  return `Auto-RCA follow-up: ${canonicalAutoRcaSource(ticketId)}`;
}

