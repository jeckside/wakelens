import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { WakeScanRecord } from '../../shared/types';

export class HistoryStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<WakeScanRecord[]> {
    try {
      const content = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as WakeScanRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }

      const backup = `${this.filePath}.corrupt-${Date.now()}.bak`;
      await copyFile(this.filePath, backup).catch(() => undefined);
      await rename(this.filePath, backup).catch(() => undefined);
      return [];
    }
  }

  async add(record: WakeScanRecord): Promise<WakeScanRecord[]> {
    const records = [record, ...(await this.list())].slice(0, 100);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8');
    return records;
  }
}
