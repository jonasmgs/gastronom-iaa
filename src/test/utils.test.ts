import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn } from '@/lib/utils';
import {
  getTheme,
  getFontSize,
  getFontFamily,
  setTheme,
  setFontSize,
  setFontFamily,
  type ThemeMode,
  type FontSize,
  type FontFamily,
} from '@/lib/theme';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

vi.stubGlobal('window', {
  matchMedia: vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
  }),
  document: {
    documentElement: {
      classList: {
        toggle: vi.fn(),
      },
      style: {},
    },
    body: {
      style: {},
    },
  },
});

describe('cn() - Tailwind merge utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class', !isActive && 'inactive-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
    expect(result).not.toContain('inactive-class');
  });

  it('should handle undefined and null', () => {
    const result = cn('class1', undefined, null, 'class2');
    expect(result).toBe('class1 class2');
  });
});

describe('Theme - getTheme()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return theme from localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');
    expect(getTheme()).toBe('dark');
  });

  it('should return system as default', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(getTheme()).toBe('system');
  });

  it('should handle light theme', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('light');
    expect(getTheme()).toBe('light');
  });
});

describe('Theme - getFontSize()', () => {
  it('should return font size from localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('large');
    expect(getFontSize()).toBe('large');
  });

  it('should return medium as default', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(getFontSize()).toBe('medium');
  });

  it('should return small when set', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('small');
    expect(getFontSize()).toBe('small');
  });
});

describe('Theme - getFontFamily()', () => {
  it('should return font family from localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('serif');
    expect(getFontFamily()).toBe('serif');
  });

  it('should return inter as default', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(getFontFamily()).toBe('inter');
  });

  it('should return rounded when set', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('rounded');
    expect(getFontFamily()).toBe('rounded');
  });
});

describe('Theme - setTheme()', () => {
  it('should save theme to localStorage', () => {
    setTheme('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should save light theme', () => {
    setTheme('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('should save system theme', () => {
    setTheme('system');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
  });
});

describe('Theme - setFontSize()', () => {
  it('should save font size to localStorage', () => {
    setFontSize('large');
    expect(localStorage.setItem).toHaveBeenCalledWith('fontSize', 'large');
  });

  it('should save small font size', () => {
    setFontSize('small');
    expect(localStorage.setItem).toHaveBeenCalledWith('fontSize', 'small');
  });
});

describe('Theme - setFontFamily()', () => {
  it('should save font family to localStorage', () => {
    setFontFamily('mono');
    expect(localStorage.setItem).toHaveBeenCalledWith('fontFamily', 'mono');
  });

  it('should save rounded font family', () => {
    setFontFamily('rounded');
    expect(localStorage.setItem).toHaveBeenCalledWith('fontFamily', 'rounded');
  });
});

describe('Theme types', () => {
  it('should have valid ThemeMode values', () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    expect(modes).toContain('light');
    expect(modes).toContain('dark');
    expect(modes).toContain('system');
  });

  it('should have valid FontSize values', () => {
    const sizes: FontSize[] = ['small', 'medium', 'large'];
    expect(sizes).toContain('small');
    expect(sizes).toContain('medium');
    expect(sizes).toContain('large');
  });

  it('should have valid FontFamily values', () => {
    const families: FontFamily[] = ['inter', 'serif', 'mono', 'rounded'];
    expect(families).toContain('inter');
    expect(families).toContain('serif');
    expect(families).toContain('mono');
    expect(families).toContain('rounded');
  });
});
