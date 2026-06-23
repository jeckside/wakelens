export interface ToolLaunch {
  command: string;
  args: string[];
  shell: boolean;
}

const quotePowerShellSingle = (value: string): string => value.replace(/'/g, "''");

const buildPowerShellArgumentList = (args: string[]): string => {
  if (args.length === 0) return '';

  return ` -ArgumentList @(${args.map((arg) => `'${quotePowerShellSingle(arg)}'`).join(',')})`;
};

export const getToolLaunch = (toolCommand: string, selfPath: string, selfArgs: string[] = []): ToolLaunch => {
  const allowedTools: Record<string, ToolLaunch> = {
    'devmgmt.msc': { command: 'devmgmt.msc', args: [], shell: true },
    'taskschd.msc': { command: 'taskschd.msc', args: [], shell: true },
    'control.exe powercfg.cpl': { command: 'control.exe', args: ['powercfg.cpl'], shell: true }
  };

  if (toolCommand === 'run-as-admin') {
    const argumentList = buildPowerShellArgumentList(selfArgs);

    return {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Start-Process -FilePath '${quotePowerShellSingle(selfPath)}'${argumentList} -Verb RunAs`
      ],
      shell: false
    };
  }

  const launch = allowedTools[toolCommand];
  if (!launch) {
    throw new Error('Unsupported tool command');
  }

  return launch;
};
