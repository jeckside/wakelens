import { contextBridge, ipcRenderer } from 'electron';
import type { WakeScanRecord } from '../shared/types';
import type { LocaleCode } from '../shared/i18n';

const api = {
  scan: (locale?: LocaleCode): Promise<WakeScanRecord> => ipcRenderer.invoke('wakelens:scan', locale),
  history: (): Promise<WakeScanRecord[]> => ipcRenderer.invoke('wakelens:history'),
  exportReport: (record: WakeScanRecord, format: 'markdown' | 'json', locale?: LocaleCode): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('wakelens:export', record, format, locale),
  openTool: (command: string): Promise<void> => ipcRenderer.invoke('wakelens:open-tool', command)
};

contextBridge.exposeInMainWorld('wakeLens', api);

declare global {
  interface Window {
    wakeLens: typeof api;
  }
}
