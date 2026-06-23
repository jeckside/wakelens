export interface ToolLaunch {
  command: string;
  args: string[];
  shell: boolean;
}

const quotePowerShellSingle = (value: string): string => value.replace(/'/g, "''");

export const getToolLaunch = (toolCommand: string, selfPath: string): ToolLaunch => {
  const allowedTools: Record<string, ToolLaunch> = {
    'devmgmt.msc': { command: 'devmgmt.msc', args: [], shell: true },
    'taskschd.msc': { command: 'taskschd.msc', args: [], shell: true },
    'control.exe powercfg.cpl': { command: 'control.exe', args: ['powercfg.cpl'], shell: true }
  };

  if (toolCommand === 'run-as-admin') {
    return {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Start-Process -FilePath '${quotePowerShellSingle(selfPath)}' -Verb RunAs`
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
