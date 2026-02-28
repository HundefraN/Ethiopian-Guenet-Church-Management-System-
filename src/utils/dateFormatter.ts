import { EthDateTime } from 'ethiopian-calendar-date-converter';

export type CalendarType = 'gregorian' | 'ethiopian';

export const formatDisplayDate = (
    date: Date | string | number | null | undefined,
    type: CalendarType = 'gregorian'
): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    if (type === 'ethiopian') {
        try {
            const ethDate = EthDateTime.fromEuropeanDate(d);
            return ethDate.toDateString();
        } catch (error) {
            console.error('Error converting to Ethiopian date:', error);
            return d.toLocaleDateString();
        }
    }

    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const formatDisplayDateTime = (
    date: Date | string | number | null | undefined,
    type: CalendarType = 'gregorian'
): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    if (type === 'ethiopian') {
        try {
            const ethDate = EthDateTime.fromEuropeanDate(d);
            return ethDate.toFullDateTimeString();
        } catch (error) {
            console.error('Error converting to Ethiopian date:', error);
            return d.toLocaleString();
        }
    }

    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const toEthDateObj = (date: Date = new Date()) => {
    return EthDateTime.fromEuropeanDate(date);
};
