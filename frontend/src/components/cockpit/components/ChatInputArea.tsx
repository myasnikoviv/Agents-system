import React, { useState, useRef } from 'react';
import { Mic, Send, Paperclip, X, Hash, AtSign } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useCockpit } from '../context/CockpitContext';
import { apiUrl } from '../../../lib/http';

export const ChatInputArea: React.FC = () => {
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-md sticky bottom-0">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
                {/* Tokens & Attachments Row */}
                {(promptTokens.length > 0 || uploadedAttachments.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                        {promptTokens.map((t, i) => (
                            <Badge key={`token-${i}`} variant="secondary" className="gap-1.5 py-1 pl-2 pr-1 h-7">
                                {t.kind === 'agent' ? <AtSign className="size-3 opacity-50" /> : <Hash className="size-3 opacity-50" />}
                                <span>{t.value}</span>
                                <Button variant="ghost" size="icon" className="size-4 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeToken(i)}>
                                    <X className="size-2.5" />
                                </Button>
                            </Badge>
                        ))}
                        {uploadedAttachments.map((a, i) => (
                            <Badge key={`file-${i}`} variant="outline" className="gap-1.5 py-1 pl-2 pr-1 h-7 border-primary/20 bg-primary/5">
                                <Paperclip className="size-3 opacity-50 text-primary" />
                                <span className="text-primary">{a.originalName}</span>
                                <Button variant="ghost" size="icon" className="size-4 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeAttachment(i)}>
                                    <X className="size-2.5" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Input Field */}
                <div className="relative group">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or use voice..."
                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-5 pr-32 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none min-h-[56px] max-h-48 scrollbar-hide"
                        rows={1}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleRecording}
                            className={`size-9 rounded-xl transition-all ${isRecording ? 'bg-destructive/10 text-destructive animate-pulse' : 'text-muted-foreground hover:bg-muted/80'}`}
                        >
                            <Mic className="size-4" />
                        </Button>
                        <Button 
                            variant="default" 
                            size="icon" 
                            onClick={handleSendMessage}
                            disabled={(!input.trim() && promptTokens.length === 0) || isProcessing || isAwaitingAgentReply}
                            className="size-9 rounded-xl shadow-lg shadow-primary/20"
                        >
                            <Send className="size-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-2">
                    <div className="flex gap-4">
                        <button className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1.5">
                            <AtSign className="size-3" /> Agent
                        </button>
                        <button className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1.5">
                            <Hash className="size-3" /> Scope
                        </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 font-mono">
                        Shift + Enter for new line
                    </span>
                </div>
            </div>
        </div>
    );
};
