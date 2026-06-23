import { normalize } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPreloadPath } from './preloadPath';

describe('getPreloadPath', () => {
  it('points to the Electron Vite preload output file', () => {
    const preloadPath = normalize(getPreloadPath('C:/NewProject/out/main'));

    expect(preloadPath.endsWith(normalize('out/preload/preload.mjs'))).toBe(true);
  });
});
