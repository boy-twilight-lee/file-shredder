# 桌宠独立 WebP 动作

当前实现使用 `src/assets/pet-templates/motions/` 下的透明 WebP。资源目录只保留运行时图片，`docs/pet-assets/` 保留可重建源图，检查报告与预览统一输出到 Git 忽略的 `output/pet-assets/`。

| 状态               | 画面                                   | 播放方式                                                         |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| 默认               | 微笑、眨眼，身体保持不动               | 24fps 时间基准，5 秒循环、120 个时间采样；相同停留帧由 WebP 合并 |
| 操作菜单           | 手指向左侧 action 气泡                 | 固定图片                                                         |
| 移动               | 面向对应方向行走，左右脚交替           | 左右独立 WebP，24fps 时间基准、1 秒循环、24 张独立画面           |
| 等待确认           | 微微歪头、双手自然交叠                 | 固定图片                                                         |
| working            | 双手握住扫把，把贴地纸屑左右扫拢       | 24fps 时间基准、1 秒循环、24 张独立画面                          |
| 成功               | 睁眼微笑、笑眯眼，保持明显的大拇指手势 | 24fps 时间基准，5 秒表情循环                                     |
| 失败               | 失落、闭眼、张嘴叹气、恢复             | 24fps 时间基准，5 秒表情循环                                     |
| 取消 / 设置 / 记录 | 使用默认微笑眨眼姿势                   | 不再存在独立 review 状态或素材                                   |

## 色彩一致性

`key-atlas.webp` 的默认姿势是噜噜黄色皮肤、橙色口鼻与短裤的颜色基准。重建脚本对生成来源的前景做一次共享的暖色 HSV 分位数校准：同一动作内所有帧使用同一组映射，避免逐帧校色造成闪烁；眼睛、叶子、扫把和纸屑等非暖色区域不参与映射。

校准后会逐状态检查暖色中位值相对 idle 的最大差异，当前报告位于 `output/pet-assets/webp-validation.json`。idle 与 actions 的饱和度中位值均为 `0.8142`，actions 相对 idle 的色相差为 `0.0002`、亮度差为 `0.0039`，不再保留旧素材的明显色差。

## working 扫地动作

working 使用 `sources-v2/working-sweeping.png` 中同一次生成的 24 个完整扫地姿势。噜噜、双手、手臂、扫把和贴地纸屑都来自完整绘制姿势；重建脚本按 `WORKING_POSE_ORDER` 在读取时把姿势编排为连续的去程和回程，消除原始第 18→19 张以及循环末尾的横向瞬移，不依赖额外的中间文件。

最终 `working.webp` 为 640×640、透明背景、24 张独立画面、1 秒循环，播放时间轴严格按 24fps 对应 24 个时间采样，不重复帧、不补插帧、不做交叉淡化或光流。纸屑始终贴地并靠近扫把，没有漂浮特效、速度线、阴影或额外场景；生成图贴地处的深色小色块会在重建时清除，浅色纸屑保留。

### 为什么不接入生成式过渡姿势

`sources-v3/working-inbetween-*.png` 与 `sources-v3/walking-right-inbetween-*.png` 是同一批生成的 1/3、2/3 过渡姿势，两个动作各 48 张。实测它们没有落在两个关键姿势之间：把每张过渡姿势投影到“起始关键帧 → 结束关键帧”的运动轴上，working 的 1/3 相位中位数是 `0.57`、2/3 是 `0.54`（目标应为 `0.33` 与 `0.67`），两张过渡姿势几乎重合且先后颠倒；right 的 1/3 相位中位数是 `0.14`、2/3 是 `0.26`，两张都贴在起始关键帧附近。把这样的三张按 关键帧 → 1/3 → 2/3 交错播放时，每个关键帧间隔都会先停住再一次性跳到下一帧，正是肉眼可见的跳变。

因此重建脚本只播放逐帧绘制的关键姿势，并给过渡素材加了相位校验：`scripts/prepare_pet_interpolation_sources.py` 在拼装过渡表之后会重建一次 72 帧候选序列并逐帧测量相位，偏差超过 `PHASE_TOLERANCE = 0.18` 或顺序颠倒就直接拒绝。要恢复 72 帧 / 3 秒版本，必须先重新生成真正落在 1/3、2/3 位置的过渡姿势并通过这条校验。

## 左右步行动作

左右步行使用 `sources-v2/walking-right.png` 中同一次生成的 24 个清晰完整步态姿势，覆盖接触、下沉、经过、蹬地、离地、前摆和落地阶段，不再使用转身站姿、重复姿势或整像素起伏凑动作。24 个姿势组成 1 秒的完整循环，播放时间轴严格按 24fps 对应 24 个时间采样，不重复帧、不补插帧。整张人物逐帧绘制，没有交叉淡化、上下半身拼接、光流或变形，因此不会产生重影和插值模糊。

向左动作由确认对称的向右完整帧逐帧镜像，保持原帧顺序，不反转步态节奏。移动开始前会预解码 `left`、`right`、`rest-left`、`rest-right`，降低首次方向切换等待。停止阶段参数由原来的 `120ms / 320ms / 180ms` 调整为：

- 释放缓冲：80ms。
- 原生事件静默：220ms。
- 收脚停留：120ms。

## 帧间连续性与角色尺寸

每个动作只使用一张来源表。重建脚本按该表全部姿势的角色高度中位数统一到 `TARGET_HEIGHT = 570`，再统一锚定头部中心与 591px 脚底基线，只保留宽度安全边界带来的整体缩放，避免逐帧尺寸跳动。`output/pet-assets/webp-validation.json` 会逐状态记录 `character_height`（中位数、范围、波动 `spread`、相对 idle 的偏差），并检查：

- 同一动作内的角色高度波动不得超过 `CHARACTER_HEIGHT_SPREAD_TOLERANCE`。
- 动作角色高度中位数相对 idle 的偏差不得超过 `CHARACTER_HEIGHT_TOLERANCE`。
- 头部中心相对 idle 的偏差不超过 3px、脚底基线偏差不超过 2px。

同一份报告还记录 `cycle`：相邻两帧轮廓差异的中位数、最小值与最大值。帧序列只有在每一步位移相近时才看起来连续；重复帧会让角色停住、再由下一帧一次性补上，肉眼就是一次跳变。因此：

- 单帧位移不得超过中位数的 `MOTION_STEP_SPIKE_TOLERANCE = 2.5` 倍。
- 单帧位移不得低于中位数的 `MOTION_STEP_FREEZE_TOLERANCE = 0.15` 倍。

当前结果中 right 为 `1.77 / 0.42`、working 为 `2.10 / 0.23`，均通过；旧的 72 帧交错版本单帧位移达到中位数的 `3.10` 倍，会被这条规则直接拦下。

生成图在使用前会做一次小组件清理：面积小于 64px 且颜色偏暗的连通块会被移除，浅色近中性的小块作为纸屑保留。贴地杂色不会再撑大姿势包围盒、把某一帧放大十几像素。

## idle 与状态映射

idle 保留动态微笑眨眼，不再使用 hover 跳动。5 秒循环按 24fps 对应 120 个时间采样，其中闭眼保持 3 个采样（125ms）；编码器会合并相同的长停留帧，但播放时间轴仍严格等价于 24fps。idle、actions、waiting 和 working 都使用 591px 脚底基线，生成姿势额外按头部中心锚定，伸出的手臂和扫把不会再带动噜噜主体横向偏移。当前校验结果中 actions 相对 idle 的头部中心偏差为 1px、脚底基线偏差为 0px。

`review` 已从 `PetPose`、资源映射和业务分支中移除，`review.webp` 同步删除。取消任务以及设置、记录等非工作面板统一回落到 idle；确认、工作、成功和失败仍分别使用自己的业务动作。

## 素材与重建

- 原始角色关键姿势：`key-atlas.webp`。
- 指向姿势：`sources-v2/actions-point.png`。
- 等待姿势：`sources-v2/waiting-refined.png`。
- 扫地关键姿势：`sources-v2/working-sweeping.png`；重建脚本按 `WORKING_POSE_ORDER` 在读取时重排为播放顺序。
- 扫地过渡姿势（相位不合格，未接入运行时）：`sources-v3/working-inbetween-one-third.png`、`sources-v3/working-inbetween-two-thirds.png`。
- 向右步态关键姿势：`sources-v2/walking-right.png`；向左由该序列逐帧镜像。
- 向右步态过渡姿势（相位不合格，未接入运行时）：`sources-v3/walking-right-inbetween-one-third.png`、`sources-v3/walking-right-inbetween-two-thirds.png`。
- 过渡姿势对照图与生成批次：`python scripts/prepare_pet_interpolation_sources.py`，输出到 `output/pet-assets/interpolation-guides/` 与 `output/pet-assets/interpolation-generated/`。
- 图像生成方式：内置 image generation；生成图使用洋红底，再由重建脚本统一去底、缩放、锚定和校色。
- 重建命令：`python scripts/prepare_pet_webp.py`，依赖 Pillow、NumPy。
- 输出检查：`output/pet-assets/webp-validation.json`、`output/pet-assets/webp-poses-preview.jpg` 和 `output/pet-assets/previews/*.gif`。
- 应用回归：执行 `npm run build:app` 和 `npm test`。

重建脚本会检查 640×640 几何、帧数、透明背景、安全边界、24fps 时间轴、角色高度一致性、循环连续性和暖色色差，并在成功后删除运行时目录中的废弃 `review.webp`。自定义桌宠图片继续使用原独立分支，不参与默认噜噜的状态动画、预解码或颜色处理。
