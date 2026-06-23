import { dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { WakeScanRecord } from '../shared/types';
import { createJsonReport, createMarkdownReport } from './reporting/reportExporter';
import { runWakeScan } from './scan/runScan';
import { HistoryStore } from './storage/historyStore';

const allowedTools: Record<string, { command: string; args: string[] }> = {
  'devmgmt.msc': { command: 'devmgmt.msc', args: [] },
  'taskschd.msc': { command: 'taskschd.msc', args: [] },
  'control.exe powercfg.cpl': { command: 'control.exe', args: ['powercfg.cpl'] }
};

export const registerIpcHandlers = (userDataPath: string): void => {
  const history = new HistoryStore(join(userDataPath, 'history.json'));

  ipcMain.handle('wakelens:scan', async () => {
    const record = await runWakeScan();
    await history.add(record);
    return record;
  });

  ipcMain.handle('wakelens:history', async () => history.list());

  ipcMain.handle('wakelens:export', async (_event, record: WakeScanRecord, format: 'markdown' | 'json') => {
    const report = format === 'markdown' ? createMarkdownReport(record) : createJsonReport(record);
    const result = await dialog.showSaveDialog({
      defaultPath: report.filename,
      filters: [{ name: format === 'markdown' ? 'Markdown' : 'JSON', extensions: [format === 'markdown' ? 'md' : 'json'] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    await writeFile(result.filePath, report.content, 'utf8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('wakelens:open-tool', async (_event, command: string) => {
    const tool = allowedTools[command];
    if (!tool) {
      throw new Error('Unsupported tool command');
    }

    const child = spawn(tool.command, tool.args, { detached: true, shell: true, windowsHide: false });
    child.unref();
  });
};
