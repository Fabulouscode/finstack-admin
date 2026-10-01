import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats minor units exactly', () => {
    expect(formatMoney(150_050, 'NGN')).toBe('₦1,500.50');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney(-2_500, 'USD')).toBe('-$25.00');
    expect(formatMoney(500, 'JPY')).toBe('¥500');
    expect(formatMoney(123_456_789_012, 'NGN')).toBe('₦1,234,567,890.12');
  });
});
