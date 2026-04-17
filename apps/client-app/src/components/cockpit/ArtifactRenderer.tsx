import { type FC, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileCode, Ticket, Terminal } from 'lucide-react';

interface ArtifactRendererProps {
    content: string;
    className?: string;
}

export const ArtifactRenderer: FC<ArtifactRendererProps> = ({ content, className }) => {
    let processedContent = content || '';

    // Tickets like PM-XXX
    processedContent = processedContent.replace(/\b(PM-\d{1,4}\b(?:[a-zA-Z0-9-]*))\b/g, (match) => `[${match}](ticket:${match})`);

    // File paths
    processedContent = processedContent.replace(/(^|\s)(\/Users\/[\w.-/]+|src\/[\w.-/]+|\.\/[\w.-/]+)(\s|$)/g, (_match, prefix, path, suffix) => {
        return `${prefix}[${path}](file:${path})${suffix}`;
    });

    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children, ...props }) => {
                        const url = href || '';

                        if (url.startsWith('ticket:')) {
                            const ticketId = url.replace('ticket:', '');
                            return (
                                <span 
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer font-bold text-[10px] uppercase tracking-widest border border-primary/20 transition-all shadow-sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert(`Navigate to Ticket: ${ticketId}`);
                                    }}
                                >
                                    <Ticket size={12} className="opacity-70" />
                                    {children}
                                </span>
                            );
                        }

                        if (url.startsWith('file:')) {
                            const filePath = url.replace('file:', '');
                            return (
                                <span 
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary/30 text-foreground hover:bg-secondary/50 cursor-pointer font-mono text-[9px] font-bold uppercase tracking-tight border border-border/50 transition-all shadow-sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert(`Open File: ${filePath}`);
                                    }}
                                >
                                    <FileCode size={12} className="opacity-50" />
                                    {children}
                                </span>
                            );
                        }

                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30 transition-all" {...props}>{children}</a>;
                    },
                    code: ({ inline, className, children, ...props }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                        const contentStr = String(children);
                        if (inline && (contentStr.startsWith('npm ') || contentStr.startsWith('npx ') || contentStr.startsWith('yarn ') || contentStr.startsWith('git '))) {
                            return (
                                <span 
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/50 cursor-pointer font-mono text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/10 group"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert(`Execute Command: ${children}`);
                                    }}
                                    title="Click to run command"
                                >
                                    <Terminal size={12} className="text-primary group-hover:scale-110 transition-transform" />
                                    {children}
                                </span>
                            );
                        }
                        
                        return (
                            <code className={`${className || ''} bg-muted/40 px-1.5 py-0.5 rounded-md font-mono text-[0.95em] text-foreground border border-border/30`} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default ArtifactRenderer;
