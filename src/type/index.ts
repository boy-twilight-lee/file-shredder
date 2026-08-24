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
  succeeded: number;
  failed: number;
  durationMs: number;
  cancelled: boolean;
}

export interface PetBubbleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppSettings {
  shortcut: string;
  passes: 0 | 3 | 7 | 35;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
  contextMenuInstalled: boolean;
  contextMenuAutoInstall: boolean;
  customPetImagePath: string;
  petImageTemplateId: string;
  uploadedPetImages: UploadedPetImage[];
  petSize: number;
  petDisplayId: number | null;
  petPositionX: number | null;
  petPositionY: number | null;
}

export interface UploadedPetImage {
  id: string;
  name: string;
  fileName: string;
}

export interface PetImageTemplate {
  id: string;
  name: string;
  image: string;
  builtIn: boolean;
  active: boolean;
  deletable: boolean;
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
  shred: (paths: string[], passes: 0 | 3 | 7 | 35) => Promise<ShredResult[]>;
  cancelShred: () => Promise<boolean>;
  installContextMenu: () => Promise<boolean>;
  removeContextMenu: () => Promise<boolean>;
  getContextMenuStatus: () => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getPetImage: () => Promise<string>;
  getPetImageTemplates: () => Promise<PetImageTemplate[]>;
  choosePetImage: () => Promise<PetImageTemplate[] | null>;
  selectPetImage: (id: string) => Promise<PetImageTemplate[]>;
  deletePetImage: (id: string) => Promise<PetImageTemplate[]>;
  getLogs: () => Promise<ShredLog[]>;
  clearLogs: () => Promise<boolean>;
  deleteLogs: (ids: string[]) => Promise<ShredLog[]>;
  cleanupAndExit: () => Promise<boolean>;
  setPetExpanded: (expanded: boolean) => void;
  setPetImageSize: (width: number, height: number) => void;
  setPetBubbleBounds: (bounds: PetBubbleBounds | null) => void;
  notifySettingsReady: () => void;
  onPetState: (callback: (state: 'idle' | 'working' | 'success' | 'failure') => void) => () => void;
  onPetConfirm: (callback: (paths: string[], passes: 0 | 3 | 7 | 35) => void) => () => void;
  onPetProgress: (callback: (progress: ShredProgress) => void) => () => void;
  onPetComplete: (callback: (summary: ShredSummary) => void) => () => void;
  onPetPlacement: (callback: (placement: 'left' | 'right') => void) => () => void;
  onSettingsChanged: (callback: () => void) => () => void;
  onLogsUpdated: (callback: () => void) => () => void;
}

declare global {
  interface Window { shredderApi: ShredderApi; }
}
