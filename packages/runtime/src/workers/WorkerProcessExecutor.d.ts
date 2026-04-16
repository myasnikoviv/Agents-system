export declare function executeRunContextInSubprocess(input: {
    runContext: any;
    timeoutMs: number;
}): Promise<{
    content: string;
}>;
