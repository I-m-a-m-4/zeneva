import React from 'react';
import { Lock, Shield, Server, Globe } from 'lucide-react';

export function SecurityBadges() {
    return (
        <section className="py-16 px-6 bg-[#F9F8F6] border-t border-slate-200">
            <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-8">
                <h4 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
                    Enterprise-Grade Security. Choose Zeneva.
                </h4>
                
                {/* 
                  These are generic, legally safe badges that represent the compliance 
                  of Zeneva's underlying Google Cloud infrastructure without violating 
                  AICPA or ISO trademark laws.
                */}
                <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                    
                    {/* ISO 27001 Infrastructure */}
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-5 py-2.5 shadow-sm">
                        <Server className="w-5 h-5 text-slate-700" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Infrastructure</span>
                            <span className="text-sm font-bold text-slate-800 leading-none mt-1">ISO 27001 Compliant</span>
                        </div>
                    </div>

                    {/* SOC 2 Infrastructure */}
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-5 py-2.5 shadow-sm">
                        <Shield className="w-5 h-5 text-slate-700" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Data Centers</span>
                            <span className="text-sm font-bold text-slate-800 leading-none mt-1">SOC 2 Type II</span>
                        </div>
                    </div>

                    {/* GDPR Ready */}
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-5 py-2.5 shadow-sm">
                        <Globe className="w-5 h-5 text-slate-700" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Privacy</span>
                            <span className="text-sm font-bold text-slate-800 leading-none mt-1">GDPR Ready</span>
                        </div>
                    </div>

                    {/* 256-Bit Encryption */}
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-5 py-2.5 shadow-sm">
                        <Lock className="w-5 h-5 text-slate-700" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Security</span>
                            <span className="text-sm font-bold text-slate-800 leading-none mt-1">256-Bit AES</span>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
