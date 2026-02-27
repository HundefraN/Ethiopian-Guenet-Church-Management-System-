/**
 * Dark mode style helpers.
 * Provides conditional inline styles that respond to the isDark flag.
 */

export const ds = (isDark: boolean) => ({
    // ─── Card Containers ───
    card: {
        background: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: isDark ? '1.5px solid rgba(75, 155, 220, 0.12)' : '1.5px solid rgba(255, 255, 255, 0.8)',
        boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)'
            : '0 8px 30px rgba(75, 155, 220, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
    },

    // ─── Active/selected card ───
    cardActive: {
        background: isDark ? 'rgba(75, 155, 220, 0.1)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(24px)',
        border: isDark ? '1.5px solid rgba(75, 155, 220, 0.3)' : '1.5px solid rgba(75, 155, 220, 0.3)',
        boxShadow: isDark
            ? '0 12px 40px rgba(75, 155, 220, 0.15)'
            : '0 12px 40px rgba(75, 155, 220, 0.12)',
    },

    // ─── Search bar ───
    searchBar: (focused: boolean) => ({
        background: isDark
            ? (focused ? 'rgba(15,23,42,0.8)' : 'rgba(15,23,42,0.6)')
            : (focused ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.85)'),
        backdropFilter: 'blur(20px)',
        border: focused
            ? (isDark ? '1.5px solid rgba(75,155,220,0.45)' : '1.5px solid rgba(75, 155, 220, 0.4)')
            : (isDark ? '1.5px solid rgba(75,155,220,0.15)' : '1.5px solid rgba(75, 155, 220, 0.15)'),
        boxShadow: focused
            ? (isDark
                ? '0 8px 32px rgba(0,0,0,0.3), 0 0 0 4px rgba(75,155,220,0.1)'
                : '0 8px 32px rgba(75, 155, 220, 0.1), 0 0 0 4px rgba(75, 155, 220, 0.05)')
            : (isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(75, 155, 220, 0.03)'),
    }),

    // ─── Empty state container ───
    emptyState: {
        background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        border: isDark ? '1px solid rgba(75,155,220,0.1)' : '1.5px solid rgba(255, 255, 255, 0.8)',
    },

    // ─── Empty state icon box ───
    emptyIcon: {
        background: isDark ? 'rgba(75,155,220,0.1)' : 'linear-gradient(135deg, #f0f7ff, #e0effa)',
    },

    // ─── Modal overlay ───
    modalOverlay: {
        background: isDark ? 'rgba(2, 6, 23, 0.6)' : 'rgba(75, 155, 220, 0.08)',
        backdropFilter: 'blur(16px) saturate(140%)',
    },

    // ─── Modal content ───
    modalContent: {
        background: isDark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(40px)',
        boxShadow: isDark
            ? '0 25px 80px rgba(0,0,0,0.6), 0 0 1px rgba(75,155,220,0.2)'
            : '0 25px 80px rgba(75, 155, 220, 0.15)',
        border: isDark ? '1px solid rgba(75,155,220,0.15)' : '1px solid rgba(255,255,255,1)',
    },

    // ─── Modal form input ───
    formInput: {
        background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
        border: isDark ? '1.5px solid rgba(75, 155, 220, 0.15)' : '1.5px solid rgba(75, 155, 220, 0.1)',
        color: isDark ? '#f8fafc' : '#1e293b',
    },

    // ─── Modal footer border ───
    modalFooterBorder: {
        borderTop: isDark ? '1px solid rgba(75,155,220,0.12)' : '1px solid rgba(75, 155, 220, 0.08)',
    },

    // ─── Close/action button (subtle) ───
    subtleButton: {
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(75, 155, 220, 0.05)',
        border: isDark ? '1px solid rgba(75,155,220,0.1)' : '1px solid rgba(75, 155, 220, 0.1)',
        color: isDark ? 'rgba(255,255,255,0.6)' : '#3178B5',
    },

    // ─── Info card within a card (branch/church info) ───
    infoBox: {
        background: isDark
            ? 'rgba(15,23,42,0.5)'
            : 'linear-gradient(135deg, #ffffff, #f8fbff)',
        border: isDark ? '1px solid rgba(75,155,220,0.1)' : '1px solid rgba(75, 155, 220, 0.1)',
    },

    // ─── Inner divider border ───
    innerBorder: {
        borderTop: isDark ? '1px solid rgba(75,155,220,0.08)' : '1px solid rgba(75, 155, 220, 0.08)',
    },

    // ─── Card bottom border ───
    cardBottomBorder: {
        borderColor: isDark ? 'rgba(75,155,220,0.1)' : 'rgba(75, 155, 220, 0.08)',
    },

    // ─── Action icon container (edit/delete) ───
    editButton: {
        background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(75, 155, 220, 0.08)',
        border: isDark ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(75, 155, 220, 0.15)',
        color: isDark ? '#60a5fa' : '#3178B5',
    },
    deleteButton: {
        background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
        border: isDark ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.15)',
        color: isDark ? '#f87171' : '#dc2626',
    },

    // ─── Action pill bar (hover-revealed on cards) ───
    actionPill: {
        background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(75,155,220,0.15)' : '1px solid rgba(75, 155, 220, 0.2)',
    },

    // ─── Avatar placeholder ───
    avatarPlaceholder: {
        background: isDark ? 'rgba(75,155,220,0.15)' : 'linear-gradient(135deg, #f2f8fd, #e0effa)',
        color: isDark ? '#7EC8F2' : '#3178B5',
    },
    avatarPlaceholderBlocked: {
        background: isDark ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #fff5f5, #fed7d7)',
        color: isDark ? '#f87171' : '#dc2626',
    },

    // ─── Detail panel (churches) ───
    detailPanel: {
        background: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: isDark ? '1px solid rgba(75,155,220,0.15)' : '1px solid rgba(255,255,255,1)',
        boxShadow: isDark
            ? '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
            : '0 20px 60px rgba(75, 155, 220, 0.12), 0 1px 3px rgba(0,0,0,0.04)',
    },

    // ─── Location badge ───
    locationBadge: {
        background: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(75, 155, 220, 0.05)',
        border: isDark ? '1px solid rgba(75,155,220,0.15)' : '1px solid rgba(75, 155, 220, 0.15)',
        color: isDark ? '#94a3b8' : '#3178B5',
    },

    // ─── Stats cards ───
    statBlue: {
        background: isDark ? 'rgba(59,130,246,0.12)' : 'linear-gradient(135deg, #f0f7ff, #e0effa)',
        border: isDark ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(75, 155, 220, 0.2)',
    },
    statPurple: {
        background: isDark ? 'rgba(139,92,246,0.12)' : 'linear-gradient(135deg, #f8f7ff, #f0effa)',
        border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
    },
    statIndigo: {
        background: isDark ? 'rgba(99,102,241,0.12)' : 'linear-gradient(135deg, #f5f7ff, #eefefa)',
        border: isDark ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99, 102, 241, 0.2)',
    },

    // ─── Blueprint / Ministry list item ───
    listItem: {
        background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.95)',
        border: isDark ? '1px solid rgba(75,155,220,0.1)' : '1px solid rgba(75, 155, 220, 0.1)',
        shadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.02)',
    },

    // ─── "No departments" empty inside detail ───
    emptyInner: {
        background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(75, 155, 220, 0.03)',
        border: isDark ? '1px dashed rgba(75,155,220,0.2)' : '1px dashed rgba(75, 155, 220, 0.25)',
    },

    // ─── Maps button ───
    mapsButton: {
        background: isDark ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        color: isDark ? '#34d399' : '#166534',
        border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(16, 185, 129, 0.25)',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(16,185,129,0.1)',
    },

    // ─── Icon box (members mail/phone) ───
    iconBox: {
        background: isDark ? 'rgba(75,155,220,0.1)' : 'rgba(75, 155, 220, 0.08)',
        color: isDark ? '#7EC8F2' : '#3178B5',
    },

    // ─── Checkbox area ───
    checkboxArea: {
        background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
        border: isDark ? '1.5px solid rgba(75,155,220,0.15)' : '1.5px solid rgba(75, 155, 220, 0.15)',
    },

    // ─── Department card icon bg (dynamic) ───
    deptCardIcon: (bg: string) => ({
        background: isDark ? bg.replace(/0\.\d+\)/, '0.15)') : bg,
    }),

    // ─── Member count text ───
    countText: isDark ? '#f1f5f9' : '#0f172a',
    statCountText: isDark ? '#f1f5f9' : '#1e293b',
});
