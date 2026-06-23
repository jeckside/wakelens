import type { DeviceCategory, ParsedLastWake, ParsedPowerRequest, ParsedWakeArmedDevice, ParsedWakeTimer } from '../../shared/types';

const valueAfter = (line: string, label: string): string | undefined => {
  const prefix = `${label}:`;
  const trimmed = line.trim();
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length).trim() : undefined;
};

const valueAfterAny = (line: string, labels: string[]): string | undefined => {
  for (const label of labels) {
    const value = valueAfter(line, label);
    if (value) return value;
  }
  return undefined;
};

export const parseLastWake = (stdout: string): ParsedLastWake => {
  const lines = stdout.split(/\r?\n/);
  const sourceCountLine = lines.find((line) => /Wake Source Count|Источник пробуждения|Отсчет журнала пробуждения/i.test(line));
  const sourceCountMatch = sourceCountLine?.match(/(?:Wake Source Count|Источник пробуждения|Отсчет журнала пробуждения)\s*-\s*(\d+)/i);
  const parsed: ParsedLastWake = { sourceCount: sourceCountMatch ? Number(sourceCountMatch[1]) : 0 };

  for (const line of lines) {
    parsed.type ??= valueAfterAny(line, ['Type', 'Тип']);
    parsed.instancePath ??= valueAfterAny(line, ['Instance Path', 'Путь к экземпляру', 'Путь экземпляра']);
    parsed.friendlyName ??= valueAfterAny(line, ['Friendly Name', 'Понятное имя', 'Дружественное имя']);
    parsed.description ??= valueAfterAny(line, ['Description', 'Описание']);
    parsed.manufacturer ??= valueAfterAny(line, ['Manufacturer', 'Изготовитель', 'Производитель']);
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

const categorizeDevice = (name: string): DeviceCategory => {
  const normalized = name.toLowerCase();
  if (normalized.includes('ethernet') || normalized.includes('wi-fi') || normalized.includes('wireless') || normalized.includes('network')) {
    return 'network';
  }
  if (normalized.includes('клавиат') || normalized.includes('keyboard')) {
    return 'keyboard';
  }
  if (normalized.includes('мыш') || normalized.includes('mouse')) {
    return 'mouse';
  }
  if (normalized.includes('bluetooth')) {
    return 'bluetooth';
  }
  if (normalized.includes('usb') || normalized.includes('hid')) {
    return 'usb';
  }
  return 'other';
};

export const parseWakeArmedDevices = (stdout: string): ParsedWakeArmedDevice[] =>
  stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^none\.?$/i.test(line) && !/^нет\.?$/i.test(line))
    .map((name) => ({
      name,
      category: categorizeDevice(name)
    }));
