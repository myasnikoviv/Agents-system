import { RuntimeEvent } from '@system/shared';
export declare function validateCanonicalEventInput(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): void;
