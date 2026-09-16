export type PetPose =
  | 'idle'
  | 'actions'
  | 'working'
  | 'waiting'
  | 'success'
  | 'failure'
  | 'right'
  | 'left'
  | 'restRight'
  | 'restLeft';

// 定义人物展示所需的交互开关与外部缩放系数。
export interface PetCharacterProps {
  dragButtonVisible: boolean;
  scale?: number;
}
