export interface EvidenceItem {
    type: 'log' | 'screenshot' | 'artifact';
    path: string;
    label?: string;
    createdAt: string;
}
export declare function addEvidenceItem(ticketId: string, item: EvidenceItem): Promise<string>;
export declare function readEvidenceItems(ticketId: string): Promise<{
    path: string;
    items: EvidenceItem[];
}>;
