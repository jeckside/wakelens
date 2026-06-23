import type { ParsedLastWake, ParsedPowerRequest, ParsedWakeTimer } from '../../shared/types';

const valueAfter = (line: string, label: string): string | undefined => {
  const prefix = `${label}:`;
  const trimmed = line.trim();
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length).trim() : undefined;
};

export const parseLastWake = (stdout: string): ParsedLastWake => {
  const lines = stdout.split(/\r?\n/);
  const sourceCountLine = lines.find((line) => line.includes('Wake Source Count'));
  const sourceCountMatch = sourceCountLine?.match(/Wake Source Count\s*-\s*(\d+)/i);
  const parsed: ParsedLastWake = { sourceCount: sourceCountMatch ? Number(sourceCountMatch[1]) : 0 };

  for (const line of lines) {
    parsed.type ??= valueAfter(line, 'Type');
    parsed.instancePath ??= valueAfter(line, 'Instance Path');
    parsed.friendlyName ??= valueAfter(line, 'Friendly Name');
    parsed.description ??= valueAfter(line, 'Description');
    parsed.manufacturer ??= valueAfter(line, 'Manufacturer');
  }

  return parsed;
};

export const parseWakeTimers = (stdout: string): ParsedWakeTimer[] => {
  const trimmed = stdout.trim();
  if (!trimmed || /^There are no active wake timers/i.test(trimmed)) {
    return [];
  }

  return trimmed
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const processMatch = block.match(/Timer set by \[[^\]]+\]\s+(.+?)\s+\([^)]+\)\s+expires at\s+(.+?)\./i);
      const reasonMatch = block.match(/Reason:\s+(.+)$/im);
      const taskMatch = reasonMatch?.[1].match(/NT TASK\\(.+?)'/i);

      return {
        process: processMatch?.[1],
        task: taskMatch?.[1],
        expiresAt: processMatch?.[2],
        reason: reasonMatch?.[1],
        raw: block
      };
    });
};

export const parsePowerRequests = (stdout: string): ParsedPowerRequest[] => {
  const lines = stdout.split(/\r?\n/);
  const requests: ParsedPowerRequest[] = [];
  let category = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const categoryMatch = line.match(/^([A-Z]+):$/);
    if (categoryMatch) {
      category = categoryMatch[1];
      continue;
    }

    if (line.startsWith('[PROCESS]')) {
      requests.push({
        category,
        requester: line.replace('[PROCESS]', '').trim(),
        reason: lines[index + 1]?.trim() || undefined
      });
    }
  }

  return requests;
};
