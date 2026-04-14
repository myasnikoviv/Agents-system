import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const LoginPage: React.FC = () => {
    const [isEmailLogin, setIsEmailLogin] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { login } = useAuth();
    const { notify } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || '/cockpit';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await login({
                [isEmailLogin ? 'email' : 'username']: identifier,
                password
            });
            notify('Welcome back, Commander.', 'success');
            navigate(from, { replace: true });
        } catch (err: any) {
            notify(err.message || 'Access Denied. Terminal is locked.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-700">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[32px] backdrop-blur-2xl shadow-2xl shadow-black/50 relative overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-500/20 mb-6 shadow-[0_0_25px_rgba(37,99,235,0.15)]">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Agent System</h1>
                        <p className="text-slate-500 text-sm font-medium">Authentication required to access Cockpit</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            {/* Identifier Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                    {isEmailLogin ? 'Email Address' : 'User Terminal ID'}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                        {isEmailLogin ? <Mail className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <input
                                        type={isEmailLogin ? 'email' : 'text'}
                                        placeholder={isEmailLogin ? 'commander@nebula.org' : 'admin_core_a1'}
                                        required
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Passcode
                                    </label>
                                    <button 
                                        type="button" 
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Switch Type */}
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setIsEmailLogin(!isEmailLogin)}
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-all uppercase tracking-tighter"
                            >
                                Use {isEmailLogin ? 'Username' : 'Email'} instead
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Authorizing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Access System</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-10 pt-6 border-t border-slate-800/50 text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                             System Core v4.2.0 • Build Protected
                        </p>
                    </div>
                </div>

                {/* Bottom Links */}
                <div className="mt-8 flex justify-center gap-6">
                    <button className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Docs</button>
                    <button className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Support</button>
                    <button className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Legal</button>
                </div>
            </div>
        </div>
    );
};
