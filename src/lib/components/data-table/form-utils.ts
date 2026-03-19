/**
 * Generate a unique ID for list items
 * @param prefix - Optional prefix for the ID
 * @returns Unique string ID
 */
export function generateId(prefix: string = ''): string {
    return `${prefix}${prefix ? '-' : ''}${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format currency value to Korean Won
 * @param value - Number or string value
 * @returns Formatted string with "원" suffix
 */
export function formatCurrency(value: number | string | undefined | null): string {
    if (value === undefined || value === null || value === '') return '-';

    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (isNaN(num)) return '-';

    return new Intl.NumberFormat('ko-KR').format(num) + '원';
}

/**
 * Parse currency string to number
 * @param value - Currency string (may contain commas, 원, etc.)
 * @returns Parsed number or 0
 */
export function parseCurrency(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/[^0-9-]/g, '');
    return parseInt(cleaned, 10) || 0;
}

/**
 * Create customer name from name parts
 * @param name1 - Name part 1
 * @param name2 - Name part 2
 * @param name3 - Name part 3
 * @param name4 - Name part 4
 * @param name5 - Name part 5
 * @returns Combined customer name or fallback
 */
export function createCustomerName(
    name1?: string | null,
    name2?: string | null,
    name3?: string | null,
    name4?: string | null,
    name5?: string | null,
    fallback: string = '-'
): string {
    const parts = [name1, name2, name3, name4, name5].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : fallback;
}

/**
 * Calculate balance from total, down payment, and interim payment
 * @param total - Total amount
 * @param downPayment - Down payment
 * @param interimPayment - Interim payment
 * @returns Balance amount (0 if negative)
 */
export function calculateBalance(
    total: string | number,
    downPayment: string | number,
    interimPayment: string | number
): number {
    const t = typeof total === 'string' ? parseInt(total, 10) || 0 : total;
    const d = typeof downPayment === 'string' ? parseInt(downPayment, 10) || 0 : downPayment;
    const i = typeof interimPayment === 'string' ? parseInt(interimPayment, 10) || 0 : interimPayment;

    const balance = t - (d + i);
    return balance >= 0 ? balance : 0;
}

/**
 * Deep clone an object (simple implementation)
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function execution
 * @param func - Function to debounce
 * @param wait - Wait time in ms
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Check if value is empty (null, undefined, empty string, or whitespace only)
 * @param value - Value to check
 * @returns true if empty
 */
export function isEmpty(value: string | null | undefined): boolean {
    return value === null || value === undefined || value.trim() === '';
}

/**
 * Safe string conversion
 * @param value - Any value
 * @param fallback - Fallback string
 * @returns String value or fallback
 */
export function safeString(value: any, fallback: string = ''): string {
    if (value === null || value === undefined) return fallback;
    return String(value);
}

/**
 * Safe number conversion
 * @param value - Any value
 * @param fallback - Fallback number
 * @returns Number value or fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
    if (value === null || value === undefined || value === '') return fallback;
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    return isNaN(num) ? fallback : num;
}
