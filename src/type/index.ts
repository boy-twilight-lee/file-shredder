export interface ShredProgress {
  path: string;
  completed: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  estimatedSeconds: number;
  stage: 'overwriting' | 'removing' | 'done';
}

export interface ShredResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface ShredSummary {
  total: number;
  failed: number;
}

export interface AppSettings {
  shortcut: string;
  passes: 3 | 7 | 35;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
  contextMenuInstalled: boolean;
  contextMenuAutoInstall: boolean;
  customPetImagePath: string;
  petSize: number;
}

export type SettingBooleanKey = 'confirmBeforeShred' | 'alwaysOnTop' | 'launchAtLogin' | 'contextMenuInstalled';

export interface ShredLog {
  id: string;
  timestamp: string;
  path: string;
  success: boolean;
  category: 'success' | 'occupied' | 'permission' | 'protected' | 'unknown';
  message: string;
}

export interface ShredderApi {
  getPathForFile: (file: File) => string;
  chooseTargets: (kind: 'file' | 'directory') => Promise<string[]>;
  prepareShred: (paths: string[]) => Promise<string[]>;
  shred: (paths: string[], passes: 3 | 7 | 35) => Promise<ShredResult[]>;
  installContextMenu: () => Promise<boolean>;
  removeContextMenu: () => Promise<boolean>;
  getContextMenuStatus: () => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getPetImage: () => Promise<string>;
  choosePetImage: () => Promise<string | null>;
  resetPetImage: () => Promise<string>;
  getLogs: () => Promise<ShredLog[]>;
  clearLogs: () => Promise<boolean>;
  cleanupAndExit: () => Promise<boolean>;
  setPetExpanded: (expanded: boolean) => void;
  hideCurrentWindow: () => void;
  onPetState: (callback: (state: 'idle' | 'working' | 'success' | 'failure') => void) => () => void;
  onPetConfirm: (callback: (paths: string[], passes: 3 | 7 | 35) => void) => () => void;
  onPetProgress: (callback: (progress: ShredProgress) => void) => () => void;
  onPetComplete: (callback: (summary: ShredSummary) => void) => () => void;
  onPetPlacement: (callback: (placement: 'above' | 'left' | 'right' | 'below') => void) => () => void;
  onSettingsChanged: (callback: () => void) => () => void;
  onLogsUpdated: (callback: () => void) => () => void;
}

declare global {
  interface Window { shredderApi: ShredderApi; }
}
