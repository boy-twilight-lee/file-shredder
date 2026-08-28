import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CommandResult {
  success: boolean;
  returnCode: number;
  output: string;
  errors: string;
}

export async function executeCommand(
  executable: string,
  args: readonly string[],
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(executable, [...args], {
      encoding: 'utf8',
      windowsHide: true,
    });
    return {
      success: true,
      returnCode: 0,
      output: result.stdout,
      errors: result.stderr,
    };
  } catch (error) {
    const commandError = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    return {
      success: false,
      returnCode:
        typeof commandError.code === 'number' ? commandError.code : -1,
      output: commandError.stdout ?? '',
      errors: commandError.stderr ?? commandError.message,
    };
  }
}
