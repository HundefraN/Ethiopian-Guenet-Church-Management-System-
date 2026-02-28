import { EthDateTime } from 'ethiopian-calendar-date-converter';

export type CalendarType = 'gregorian' | 'ethiopian';
export type LanguageCode = 'en' | 'am';

const AM_MONTHS_ETH = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

const EN_MONTHS_ETH = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehasse', 'Pagume'
];

const AM_MONTHS_GREG = [
    'ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'
];

export const formatDisplayDate = (
    date: Date | string | number | null | undefined,
    type: CalendarType = 'gregorian',
    lang: LanguageCode = 'en'
): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    if (type === 'ethiopian') {
        try {
            const ethDate = EthDateTime.fromEuropeanDate(d);
            const monthIdx = ethDate.month - 1;

            if (lang === 'am') {
                return `${AM_MONTHS_ETH[monthIdx]} ${ethDate.date} ቀን ${ethDate.year} ዓ.ም`;
            } else {
                return `${EN_MONTHS_ETH[monthIdx]} ${ethDate.date}, ${ethDate.year}`;
            }
        } catch (error) {
            console.error('Error converting to Ethiopian date:', error);
            return d.toLocaleDateString();
        }
    }

    if (lang === 'am') {
        const month = AM_MONTHS_GREG[d.getMonth()];
        const day = d.getDate();
        const year = d.getFullYear();
        return `${month} ${day} ቀን ${year}`;
    }

    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const formatDisplayDateTime = (
    date: Date | string | number | null | undefined,
    type: CalendarType = 'gregorian',
    lang: LanguageCode = 'en'
): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    let timeString = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    if (lang === 'am') {
        timeString = timeString.replace('AM', 'ጠዋት').replace('PM', 'ከሰዓት');
    }

    const displayDate = formatDisplayDate(d, type, lang);
    return `${displayDate} | ${timeString}`;
};

export const toEthDateObj = (date: Date = new Date()) => {
    return EthDateTime.fromEuropeanDate(date);
};
