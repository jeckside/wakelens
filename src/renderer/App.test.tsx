import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders WakeLens dashboard copy', () => {
    const html = renderToString(<App />);

    expect(html).toContain('WakeLens');
    expect(html).toContain('Find out why this PC woke up');
    expect(html).toContain('Scan now');
  });
});
