import { useState, useRef, type FC, type KeyboardEvent } from 'react';
import { Mic, Send, Paperclip, X, Hash, AtSign } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useCockpit } from '../context/CockpitContext';
import { apiUrl } from '../../../lib/http';

export const ChatInputArea: FC = () => {
    const {
        input,
        setInput,
        promptTokens,
        setPromptTokens,
        uploadedAttachments,
        setUploadedAttachments,
        handleSendMessage,
        isProcessing,
        isAwaitingAgentReply
    } = useCockpit();

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice.webm');

                try {
                    const res = await fetch(apiUrl('/api/voice/transcribe'), {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (data.text) {
                        setInput(input + (input ? ' ' : '') + data.text);
                    }
                } catch (e) {
                    console.error("Transcription failed:", e);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic access failed:', err);
        }
    };

    const removeToken = (idx: number) => {
        setPromptTokens(prev => prev.filter((_, i) => i !== idx));
    };

    const removeAttachment = (idx: number) => {
        setUploadedAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="p-4 border-t border-border/40 bg-background/60 backdrop-blur-xl sticky bottom-0 z-50">
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                {/* Tokens & Attachments Row */}
                {(promptTokens.length > 0 || uploadedAttachments.length > 0) && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {promptTokens.map((t, i) => (
                            <Badge key={`token-${i}`} variant="secondary" className="gap-1.5 py-1.5 pl-2.5 pr-1 h-8 rounded-lg border border-border/50 shadow-sm font-bold text-[10px] uppercase tracking-wider">
                                {t.kind === 'agent' ? <AtSign className="size-3 text-primary" /> : <Hash className="size-3 text-primary" />}
                                <span>{t.value}</span>
                                <Button variant="ghost" size="icon" className="size-5 ml-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => removeToken(i)}>
                                    <X className="size-2.5" />
                                </Button>
                            </Badge>
                        ))}
                        {uploadedAttachments.map((a, i) => (
                            <Badge key={`file-${i}`} variant="outline" className="gap-1.5 py-1.5 pl-2.5 pr-1 h-8 rounded-lg border-primary/20 bg-primary/5 shadow-sm font-bold text-[10px] uppercase tracking-wider">
                                <Paperclip className="size-3 text-primary" />
                                <span className="text-primary truncate max-w-[120px]">{a.originalName}</span>
                                <Button variant="ghost" size="icon" className="size-5 ml-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-primary" onClick={() => removeAttachment(i)}>
                                    <X className="size-2.5" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Input Field Area */}
                <div className="relative group">
                    {/* Visual Glow Effect for Focus */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="relative flex flex-col bg-card/50 border border-border/50 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden group-focus-within:border-primary/30 group-focus-within:shadow-primary/5 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Initialize command sequence..."
                            className="w-full bg-transparent p-5 text-sm font-medium focus:outline-none transition-all resize-none min-h-[64px] max-h-64 scrollbar-thin text-foreground placeholder:text-muted-foreground/40 placeholder:font-black placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px]"
                            rows={1}
                        />
                        
                        <div className="flex items-center justify-between px-3 py-2 border-t border-border/30 bg-muted/20">
                            <div className="flex gap-1.5">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-all gap-2 rounded-lg"
                                >
                                    <AtSign className="size-3" /> Agent
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-all gap-2 rounded-lg"
                                >
                                    <Hash className="size-3" /> Scope
                                </Button>
                                <Separator orientation="vertical" className="h-4 my-auto bg-border/50 mx-1" />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={toggleRecording}
                                    className={`size-8 rounded-lg transition-all ${isRecording ? 'bg-destructive/10 text-destructive animate-pulse' : 'text-muted-foreground/60 hover:text-primary'}`}
                                >
                                    <Mic className="size-3.5" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-tighter">
                                    [Shift+Enter] New Line
                                </span>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={handleSendMessage}
                                    disabled={(!input.trim() && promptTokens.length === 0) || isProcessing || isAwaitingAgentReply}
                                    className="h-8 pr-4 pl-3 gap-2 rounded-lg shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest group/btn active:scale-95 transition-all"
                                >
                                    {isProcessing || isAwaitingAgentReply ? (
                                        <div className="size-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <Send className="size-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    )}
                                    Transmit
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Separator: FC<{ orientation?: 'horizontal' | 'vertical', className?: string }> = ({ orientation = 'horizontal', className = '' }) => (
    <div className={`${orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full'} bg-border ${className}`} />
);

export default ChatInputArea;
