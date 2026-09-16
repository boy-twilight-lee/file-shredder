import {
  BubbleAlign,
  BubbleDirection,
  PetMotion,
  ShredProgress,
  ShredSummary,
  ShredTarget,
} from '@/type';
export type PetState = 'idle' | 'working' | 'success' | 'failure';
export type PetBubbleMode =
  | 'hidden'
  | 'actions'
  | 'settings'
  | 'records'
  | 'confirm'
  | 'progress'
  | 'result';
// 定义人物在窗口中按形象高宽比换算后的展示尺寸。
export interface PetDisplaySize {
  width: number;
  height: number;
}
export interface PetViewContext {
  petState: Ref<PetState>;
  petDisplaySize: ComputedRef<PetDisplaySize>;
  petImageSource: Ref<string>;
  isDefaultPet: Ref<boolean>;
  petAspectRatio: Ref<number>;
  petMotion: Ref<PetMotion | null>;
  bubbleDirection: Ref<BubbleDirection>;
  bubbleAlign: Ref<BubbleAlign>;
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
