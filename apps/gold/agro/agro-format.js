const EN_US_FORMATTER_2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EN_US_FORMATTER_0 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function resolveDecimals(currency, userDecimals) {
    if (typeof userDecimals === 'number') return userDecimals;
    switch (currency) {
        case 'COP': return 0;
        case 'VES': return 2;
        default: return 2;
    }
}

export function toCents(value) {
    return Math.round((Number(value) || 0) * 100);
}

export function centsToFloat(cents) {
    return (Number(cents) || 0) / 100;
}

export function formatMoney(cents, currency = 'USD', options = {}) {
    const { showCurrencyCode = true, useThousandsSeparator = true, minimumFractionDigits } = options;
    if (!Number.isFinite(cents)) cents = 0;

    const abs = Math.abs(cents);
    const sign = cents < 0 ? '-' : '';
    const value = abs / 100;

    const decimals = resolveDecimals(currency, minimumFractionDigits);

    let prefix;
    let code;

    switch (currency) {
        case 'COP':
            prefix = '';
            code = 'COP';
            break;
        case 'VES':
            prefix = 'Bs ';
            code = 'VES';
            break;
        default:
            prefix = '$';
            code = 'USD';
    }

    let formatted;
    if (useThousandsSeparator) {
        const fmt = decimals === 0 ? EN_US_FORMATTER_0 : EN_US_FORMATTER_2;
        formatted = fmt.format(value);
    } else {
        formatted = value.toFixed(decimals);
    }

    let result = `${sign}${prefix}${formatted}`;
    if (showCurrencyCode) {
        result += ` ${code}`;
    }
    return result;
}

export function formatSignedMoney(cents, currency = 'USD', options = {}) {
    if (cents >= 0) {
        return `+${formatMoney(cents, currency, options)}`;
    }
    return formatMoney(cents, currency, options);
}