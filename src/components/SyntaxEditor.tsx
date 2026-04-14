import React, { useRef, useState, useEffect } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import yaml from 'highlight.js/lib/languages/yaml';
// Import a single dark theme to keep the editor cleanly visible in both light and dark mode OS
import 'highlight.js/styles/atom-one-dark.css';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('yaml', yaml);

interface SyntaxEditorProps {
    value: string;
    onChange: (val: string) => void;
    editorRef?: React.RefObject<HTMLTextAreaElement | null>;
    language?: 'javascript' | 'bash' | 'powershell' | 'yaml';
    placeholder?: string;
    className?: string;
}

export function SyntaxEditor({ value, onChange, editorRef, language = 'javascript', placeholder, className = '' }: SyntaxEditorProps) {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const ref = editorRef || internalRef;
    const preRef = useRef<HTMLPreElement>(null);

    const [highlightedCode, setHighlightedCode] = useState('');

    useEffect(() => {
        try {
            const highlighted = hljs.highlight(value || '', { language }).value;
            // Pad the trailing empty newline to ensure the textarea height matches the pre height exactly
            setHighlightedCode(highlighted + (value.endsWith('\n') ? ' ' : ''));
        } catch (e) {
            setHighlightedCode(value);
        }
    }, [value, language]);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop;
            preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    return (
        <div className={`relative w-full h-full font-mono text-[13px] leading-relaxed rounded-md overflow-hidden bg-[#282c34] border border-[var(--border-default)] shadow-sm ${className}`}>
            <pre 
                ref={preRef}
                className="absolute inset-0 m-0 p-3 pointer-events-none whitespace-pre-wrap break-words overflow-auto"
                aria-hidden="true"
            >
                <code 
                    className={`hljs language-${language} w-full h-full block bg-transparent !p-0`}
                    dangerouslySetInnerHTML={{ __html: highlightedCode || Math.max(0, placeholder?.length || 0) ? highlightedCode : '' }}
                    style={{ opacity: value ? 1 : 0.4 }}
                />
            </pre>
            <textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                className="absolute inset-0 w-full h-full p-3 m-0 text-transparent caret-white resize-none outline-none border-none overflow-auto whitespace-pre-wrap break-words"
                spellCheck={false}
                style={{ 
                    backgroundColor: 'transparent',
                    color: 'transparent'
                }}
            />
        </div>
    );
}
