export interface DeptPalette {
    bg: string;
    accent: string;
    light: string;
    border: string;
}

export const palettes: DeptPalette[] = [
    { bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', accent: '#8b5cf6', light: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.12)' },
    { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', accent: '#3b82f6', light: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.12)' },
    { bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', accent: '#10b981', light: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.12)' },
    { bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', accent: '#ec4899', light: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.12)' },
    { bg: 'linear-gradient(135deg, #f2f8fd, #e8f1fa)', accent: '#f97316', light: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.12)' },
    { bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', accent: '#14b8a6', light: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.12)' },
    { bg: 'linear-gradient(135deg, #fefce8, #fef9c3)', accent: '#eab308', light: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.12)' },
    { bg: 'linear-gradient(135deg, #fef2f2, #fecaca)', accent: '#ef4444', light: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.12)' },
];

export const getDeptColors = (name: string): DeptPalette => {
    if (!name) return palettes[0];
    const idx = name.charCodeAt(0) % palettes.length;
    return palettes[idx];
};
