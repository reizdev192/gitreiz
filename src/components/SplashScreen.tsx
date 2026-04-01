import { useEffect, useState } from 'react';

interface SplashScreenProps {
    onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Start fading out after 1.5s
        const fadeTimer = setTimeout(() => {
            setIsFading(true);
        }, 1200);

        // Notify complete after 2s (allowing 0.8s for fade animation)
        const completeTimer = setTimeout(() => {
            onComplete();
        }, 2000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{ backgroundColor: '#0f172a' }}> {/* Dark slate background */}
            
            <div className="relative flex flex-col items-center animate-pulse-slow">
                <div className="w-32 h-32 mb-6 relative">
                    {/* Glowing effect under logo */}
                    <div className="absolute inset-0 blur-xl opacity-30 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                    <img src="/logo.png" alt="ZenGit Logo" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
                </div>
                
                <h1 className="text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
                    ZenGit
                </h1>
                
                <span className="text-xs font-mono font-medium tracking-[0.2em] uppercase text-emerald-500/70 mb-12">
                    Developer Workspace
                </span>
                
                <div className="flex gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
}
