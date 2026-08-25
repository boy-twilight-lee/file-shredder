import type { Component, ComputedRef, Ref } from 'vue';
import type { ShredProgress, ShredSummary } from '@/type';

export type PetState = 'idle' | 'working' | 'success' | 'failure';
export type PetBubbleMode =
  'hidden' | 'actions' | 'confirm' | 'progress' | 'result' | 'error' | 'drop';
export type PetBubblePlacement = 'left' | 'right';

export interface PetProgressTone {
  maximum: number;
  tone: string;
}

export interface PetResultMetric {
  key: string;
  label: string;
  value: string | number;
  icon: Component;
  tone: string;
}

export interface PetViewContext {
  petState: Ref<PetState>;
  petAppearanceStyle: ComputedRef<Record<string, string>>;
  petImageSource: Ref<string>;
  bubbleElement: Ref<HTMLElement | null>;
  bubbleMode: Ref<PetBubbleMode>;
  bubblePlacement: Ref<PetBubblePlacement>;
  selectedPaths: Ref<string[]>;
  progress: Ref<ShredProgress | null>;
  progressPercent: Ref<number>;
  displayedFileIndex: Ref<number>;
  progressTone: ComputedRef<PetProgressTone>;
  summary: Ref<ShredSummary | null>;
  resultMetrics: ComputedRef<PetResultMetric[]>;
  errorMessage: Ref<string>;
  isSubmitting: Ref<boolean>;
  isCancelling: Ref<boolean>;
  chooseTargets: (kind: 'file' | 'directory') => Promise<void>;
  removeTarget: (path: string) => void;
  getTargetName: (path: string) => string;
  closeBubble: () => void;
  confirmShred: () => Promise<void>;
  cancelShred: () => Promise<void>;
  showBubble: (mode: PetBubbleMode) => void;
  openActions: () => void;
  handleCharacterMouseDown: (event: MouseEvent) => void;
  handleCharacterMouseUp: (event: MouseEvent) => void;
  handleDrop: (event: DragEvent) => Promise<void>;
  handleDragEnter: () => void;
  handleDragLeave: () => void;
  handlePetImageLoad: (event: Event) => void;
}
