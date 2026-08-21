import { execFile } from 'node:child_process';

interface CommandResult {
  success: boolean;
  returnCode: number;
  output: string;
  errors: string;
}

const EXPLORER_SELECTION_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ForegroundWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
}
"@
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$foreground = [ForegroundWindow]::GetForegroundWindow().ToInt64()
$shell = New-Object -ComObject Shell.Application
$paths = @()
foreach ($window in $shell.Windows()) {
  try {
    if ([int64]$window.HWND -eq $foreground) {
      foreach ($item in $window.Document.SelectedItems()) { $paths += $item.Path }
      break
    }
  } catch {}
}
if ($paths.Count -eq 0) {
  try {
    [uint32]$processId = 0
    [void][ForegroundWindow]::GetWindowThreadProcessId([IntPtr]$foreground, [ref]$processId)
    if ((Get-Process -Id $processId).ProcessName -eq 'explorer') {
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('^c')
      Start-Sleep -Milliseconds 160
      $paths = @(Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName })
    }
  } catch {}
}
$paths | ConvertTo-Json -Compress
`;

function runPowerShell(encodedCommand: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encodedCommand],
      { encoding: 'utf8', timeout: 2500, windowsHide: true },
      (error, stdout, stderr) => resolve({
        success: !error,
        returnCode: typeof error?.code === 'number' ? error.code : error ? 1 : 0,
        output: stdout.trim(),
        errors: stderr.trim(),
      }),
    );
  });
}

export async function getExplorerSelection(): Promise<string[]> {
  if (process.platform !== 'win32') return [];
  const encodedCommand = Buffer.from(EXPLORER_SELECTION_SCRIPT, 'utf16le').toString('base64');
  const result = await runPowerShell(encodedCommand);
  if (!result.success || !result.output) return [];
  try {
    const parsed = JSON.parse(result.output) as string | string[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}
