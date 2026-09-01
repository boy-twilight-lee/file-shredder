import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
// 将子进程文件执行 API 转换为 Promise 形式。
const execFileAsync = promisify(execFile);
export interface CommandResult {
  success: boolean;
  returnCode: number;
  output: string;
  errors: string;
}
// 执行外部程序并返回结构化标准输出、错误与退出码。
export async function executeCommand(
  executable: string,
  args: readonly string[],
): Promise<CommandResult> {
  try {
    // 保存外部程序成功执行后的输出结果。
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
    // 将 Node 子进程错误收窄为可序列化的命令错误结构。
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
