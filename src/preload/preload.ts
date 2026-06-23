import { contextBridge, ipcRenderer } from 'electron';
import type { WakeScanRecord } from '../shared/types';

const api = {
  scan: (): Promise<WakeScanRecord> => ipcRenderer.invoke('wakelens:scan'),
  history: (): Promise<WakeScanRecord[]> => ipcRenderer.invoke('wakelens:history'),
  exportReport: (record: WakeScanRecord, format: 'markdown' | 'json'): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('wakelens:export', record, format),
  openTool: (command: string): Promise<void> => ipcRenderer.invoke('wakelens:open-tool', command)
};

contextBridge.exposeInMainWorld('wakeLens', api);

declare global {
  interface Window {
    wakeLens: typeof api;
  }
}
