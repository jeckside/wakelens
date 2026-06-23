import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders localized WakeLens dashboard copy', () => {
    const html = renderToString(<App />);

    expect(html).toContain('WakeLens');
    expect(html).toContain('Русский');
    expect(html).toMatch(/Find out why this PC woke up|Узнайте, почему этот ПК проснулся/);
    expect(html).toMatch(/Scan now|Сканировать/);
  });
});
