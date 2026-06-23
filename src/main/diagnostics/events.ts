import type { EvidenceStatus, PowerEvent } from '../../shared/types';
import { runCommand } from './commandRunner';

export const collectRecentPowerEvents = async (): Promise<{ status: EvidenceStatus; records: PowerEvent[]; error?: string }> => {
  const script = [
    "$events = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Power-Troubleshooter'; StartTime=(Get-Date).AddDays(-7)} -MaxEvents 20",
    "$events | Select-Object TimeCreated,ProviderName,Id,Message | ConvertTo-Json -Depth 3"
  ].join('; ');
  const result = await runCommand('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], 15000);

  if (result.status === 'failed') {
    return { status: 'failed', records: [], error: result.stderr || result.stdout };
  }

  if (!result.stdout.trim()) {
    return { status: 'empty', records: [] };
  }

  try {
    const parsed = JSON.parse(result.stdout) as Array<Record<string, unknown>> | Record<string, unknown>;
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    return {
      status: 'ok',
      records: rows.map((row) => ({
        timeCreated: String(row.TimeCreated ?? ''),
        providerName: String(row.ProviderName ?? ''),
        id: Number(row.Id ?? 0),
        message: String(row.Message ?? '')
      }))
    };
  } catch (error) {
    return { status: 'failed', records: [], error: error instanceof Error ? error.message : 'Failed to parse power events' };
  }
};
