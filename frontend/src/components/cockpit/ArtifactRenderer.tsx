import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileCode, Ticket, Terminal } from 'lucide-react';

interface ArtifactRendererProps {
    content: string;
    className?: string;
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ content, className }) => {
    // Transform text into custom markdown links for artifacts
    // Be very careful not to break existing links or markdown structure.
    // We will do some basic replacements.
    
    let processedContent = content || '';

    // Tickets like PM-XXX
    // We avoid replacing inside already existing links by a rudimentary check,
    // but a better approach is a remark plugin. For simplicity, we assume
    // standard text logs mostly. Let's do a simple regex:
    processedContent = processedContent.replace(/\b(PM-\d{1,4}\b(?:[a-zA-Z0-9-]*))\b/g, (match) => `[${match}](ticket:${match})`);

    // File paths starting with src/ or /Users/ or ./
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
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 cursor-pointer font-medium border border-blue-500/20 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert(`Navigate to Ticket: ${ticketId}`);
                                    }}
                                >
                                    <Ticket size={12} />
                                    {children}
                                </span>
                            );
                        }

                        if (url.startsWith('file:')) {
                            const filePath = url.replace('file:', '');
                            return (
                                <span 
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer font-mono text-[0.9em] border border-emerald-500/20 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert(`Open File: ${filePath}`);
                                    }}
                                >
                                    <FileCode size={12} />
                                    {children}
                                </span>
                            );
                        }

                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2" {...props}>{children}</a>;
                    },
                    code: ({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                        // Make inline code containing typical commands clickable
                        if (inline && typeof children === 'string' && (children.startsWith('npm ') || children.startsWith('npx ') || children.startsWith('yarn ') || children.startsWith('git '))) {
                            return (
                                <span 
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer font-mono text-[0.9em] border border-slate-700 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert(`Execute Command: ${children}`);
                                    }}
                                    title="Click to run command"
                                >
                                    <Terminal size={12} className="text-slate-400" />
                                    {children}
                                </span>
                            );
                        }
                        
                        return (
                            <code className={`${className || ''} bg-slate-800/50 px-1.5 py-0.5 rounded font-mono text-[0.9em] text-slate-300`} {...props}>
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
