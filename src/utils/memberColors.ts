export interface MemberPalette {
    bg: string;
    accent: string;
    light: string;
    border: string;
    gradient: string[];
}

export const palettes: MemberPalette[] = [
    { gradient: ['#06b6d4', '#0891b2'], accent: '#06b6d4', light: 'rgba(6,182,212,0.08)', bg: 'linear-gradient(135deg, #ecfeff, #cffafe)', border: 'rgba(6,182,212,0.12)' },
    { gradient: ['#8b5cf6', '#7c3aed'], accent: '#8b5cf6', light: 'rgba(139,92,246,0.08)', bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: 'rgba(139,92,246,0.12)' },
    { gradient: ['#ec4899', '#db2777'], accent: '#ec4899', light: 'rgba(236,72,153,0.08)', bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', border: 'rgba(236,72,153,0.12)' },
    { gradient: ['#f59e0b', '#d97706'], accent: '#f59e0b', light: 'rgba(245,158,11,0.08)', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: 'rgba(245,158,11,0.12)' },
    { gradient: ['#10b981', '#059669'], accent: '#10b981', light: 'rgba(16,185,129,0.08)', bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: 'rgba(16,185,129,0.12)' },
    { gradient: ['#3b82f6', '#2563eb'], accent: '#3b82f6', light: 'rgba(59,130,246,0.08)', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: 'rgba(59,130,246,0.12)' },
    { gradient: ['#ef4444', '#dc2626'], accent: '#ef4444', light: 'rgba(239,68,68,0.08)', bg: 'linear-gradient(135deg, #fef2f2, #fecaca)', border: 'rgba(239,68,68,0.12)' },
    { gradient: ['#14b8a6', '#0d9488'], accent: '#14b8a6', light: 'rgba(20,184,166,0.08)', bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', border: 'rgba(20,184,166,0.12)' },
];

export const getMemberColors = (name: string): MemberPalette => {
    if (!name) return palettes[0];
    const idx = (name.charCodeAt(0) || 0) % palettes.length;
    return palettes[idx];
};
