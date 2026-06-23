import { dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { WakeScanRecord } from '../shared/types';
import { normalizeLocale, type LocaleCode } from '../shared/i18n';
import { createJsonReport, createMarkdownReport } from './reporting/reportExporter';
import { runWakeScan } from './scan/runScan';
import { HistoryStore } from './storage/historyStore';
import { getToolLaunch } from './toolLauncher';

export const registerIpcHandlers = (userDataPath: string): void => {
  const history = new HistoryStore(join(userDataPath, 'history.json'));

  ipcMain.handle('wakelens:scan', async (_event, locale?: LocaleCode) => {
    const record = await runWakeScan(normalizeLocale(locale));
    await history.add(record);
    return record;
  });

  ipcMain.handle('wakelens:history', async () => history.list());

  ipcMain.handle('wakelens:export', async (_event, record: WakeScanRecord, format: 'markdown' | 'json', locale?: LocaleCode) => {
    const report = format === 'markdown' ? createMarkdownReport(record, normalizeLocale(locale)) : createJsonReport(record);
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
    const tool = getToolLaunch(command, process.execPath);

    const child = spawn(tool.command, tool.args, { detached: true, shell: tool.shell, windowsHide: false });
    child.unref();
  });
};
