import { ShredProgress, ShredSummary, ShredTarget } from '@/type';
export type PetState = 'idle' | 'working' | 'success' | 'failure';
export type PetBubbleMode =
  | 'hidden'
  | 'actions'
  | 'settings'
  | 'records'
  | 'confirm'
  | 'progress'
  | 'result';
export interface PetViewContext {
  petState: Ref<PetState>;
  petAppearanceStyle: ComputedRef<Record<string, string>>;
  petImageSource: Ref<string>;
  bubbleElement: Ref<HTMLElement | null>;
  bubbleMode: Ref<PetBubbleMode>;
  selectedTargets: Ref<ShredTarget[]>;
  progress: Ref<ShredProgress | null>;
  progressPercent: Ref<number>;
  displayedFileIndex: Ref<number>;
  summary: Ref<ShredSummary | null>;
  errorMessage: Ref<string>;
  isSubmitting: Ref<boolean>;
  isCancelling: Ref<boolean>;
  chooseTargets: (kind: 'file' | 'directory') => Promise<void>;
  removeTarget: (path: string) => void;
  closeBubble: () => void;
  confirmShred: () => Promise<void>;
  cancelShred: () => Promise<void>;
  showBubble: (mode: PetBubbleMode) => void;
  openActions: () => void;
  handleDrop: (event: DragEvent) => Promise<void>;
  handlePetImageLoad: (event: Event) => void;
}
