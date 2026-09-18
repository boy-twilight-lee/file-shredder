export type PetPose =
  | 'idle'
  | 'actions'
  | 'working'
  | 'waiting'
  | 'success'
  | 'failure'
  | 'right'
  | 'left';

// 定义人物展示所需的交互开关、外观尺寸与外部缩放系数。
export interface PetCharacterProps {
  dragButtonVisible: boolean;
  // 定义人物未缩放时的展示宽度，主视图取用户设置，设置预览取预览尺寸。
  petWidth: number;
  // 定义人物未缩放时的展示高度，由展示宽度与形象高宽比换算。
  petHeight: number;
  // 定义外部缩放系数，设置预览按画布比例缩小。
  scale?: number;
}
