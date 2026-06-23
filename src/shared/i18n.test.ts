import { describe, expect, it } from 'vitest';
import { defaultLocale, isRtlLocale, localeNames, normalizeLocale, supportedLocales, t, translations } from './i18n';

describe('i18n dictionaries', () => {
  it('contains the requested six locales', () => {
    expect(supportedLocales).toEqual(['en', 'zh-Hans', 'hi', 'es', 'ar', 'ru']);
  });

  it('keeps every locale dictionary aligned with English keys', () => {
    const englishKeys = Object.keys(translations.en).sort();

    for (const locale of supportedLocales) {
      expect(Object.keys(translations[locale]).sort()).toEqual(englishKeys);
      expect(localeNames[locale]).toBeTruthy();
    }
  });

  it('normalizes common browser locales and supports Arabic RTL', () => {
    expect(defaultLocale).toBe('en');
    expect(normalizeLocale('zh-CN')).toBe('zh-Hans');
    expect(normalizeLocale('es-MX')).toBe('es');
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('ru')).toBe(false);
  });

  it('interpolates translated strings', () => {
    expect(t('es', 'ui.message.reportSaved', { path: 'C:/report.md' })).toContain('C:/report.md');
    expect(t('ru', 'diagnosis.wakeArmed.summary.count', { count: 3 })).toContain('3');
  });
});
