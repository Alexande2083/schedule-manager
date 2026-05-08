import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS, FONT_SIZES, POMODORO_DURATION } from '@/constants';

describe('constants', () => {
  it('has all required storage keys', () => {
    expect(STORAGE_KEYS.tasks).toBe('sunsama-tasks');
    expect(STORAGE_KEYS.tags).toBe('sunsama-tags');
    expect(STORAGE_KEYS.theme).toBe('sunsama-theme-v2');
  });

  it('has valid font sizes', () => {
    expect(FONT_SIZES.small).toBe('13px');
    expect(FONT_SIZES.medium).toBe('14px');
    expect(FONT_SIZES.large).toBe('16px');
  });

  it('has valid pomodoro duration', () => {
    expect(POMODORO_DURATION).toBe(25);
    expect(POMODORO_DURATION).toBeGreaterThan(0);
  });
});
