import { join } from 'node:path';

export const getPreloadPath = (mainDir: string): string =>
  join(mainDir, '../preload/preload.mjs');
