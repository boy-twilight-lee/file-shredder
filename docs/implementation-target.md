# 文件粉碎精灵 · 客户端实现目标文档

> 本文是「清理助手重构」的**实现契约**：把 `docs/project-design.md` 的 11 屏设计稿拆成可逐项交付的特性清单，逐项标注实现状态，供开发推进、代码评审与验收核对使用。
>
> - 设计来源：Ardot 画布 `文件粉碎精灵 · 客户端 UI 设计稿`（fileId `729297165762191`，page `0:1`），逐屏节点 ID 见 `docs/project-design.md`。
> - 取值来源：`docs/design-token.md`（颜色 / 字号 / 圆角 / 间距 / 阴影的唯一权威取值）。
> - 业务约束来源：`docs/project-requirements.md`。
> - 最后更新：2026-09-28

---

## 0. 状态图例

| 标记 | 含义                                                |
| ---- | --------------------------------------------------- |
| 🔲   | 未开始                                              |
| 🟡   | 进行中                                              |
| ✅   | 已实现（代码落地，类型检查通过）                    |
| 🧪   | 已通过测试（对应 `docs/test-plan.md` 用例全部通过） |

> **交付规则**：每个特性必须「代码落地 → 回填本文状态 ✅ → 按测试文档执行 → 回填 🧪」，
> 缺任一步不得视为该特性完成。

---

## 1. 技术基线与强制约束

### 1.1 技术栈（现状，不引入新框架）

| 项       | 取值                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| 桌面容器 | Electron 39（`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`）                            |
| 渲染框架 | Vue 3.5 + TypeScript 5.7（`<script setup lang="ts">`）                                                        |
| 组件库   | Arco Design Vue 2.57（业务弹层 / 表单 / 反馈）+ Element Plus 2.14（仅作 `cx-table` 底层）                     |
| 样式     | Less（新组件样式一律 Less）                                                                                   |
| 构建     | Vite 6 + `vite-plugin-electron` + `unplugin-vue-components`（Arco/Element 自动按需）+ `vite-plugin-svg-icons` |
| 测试     | Vitest 2（当前缺 `vitest.config.ts`，见 F0）                                                                  |

### 1.2 强制约束

1. **禁止自造已有能力**。凡设计稿元素能由下列「已存在组件 / 组件库组件」表达，**必须**直接使用，不得另写组件：

   | 设计元素                                              | 必须使用                      | 说明                                                                  |
   | ----------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
   | 数据表格（02 待清除目标 / 07 清理记录 / 03 处理明细） | `cx-table`                    | 基于 el-table，已封装表头 40 / 行高 48 / 斑马纹 / 分页                |
   | 分页（07 底部）                                       | `cx-pagination`               | 基于 `a-pagination`，已复刻「50 条/页 ▾ ｜ 跳至 [1] 页 ｜ ‹ 1 2 3 ›」 |
   | 空态（07 无记录）                                     | `cx-empty`                    | `cx-table` 已内置，不重复调用                                         |
   | 图标                                                  | `svg-icon`                    | 统一切图方式，禁止内联 `<svg>` 写业务图标                             |
   | 按钮（主 / 次 / 危险 / 文字）                         | `a-button`                    | `type=primary` / `outline` / `outline status=danger` / `text`         |
   | 分段按钮组（08 默认清理级别）                         | `a-radio-group type="button"` | 规格见 `src/styles/arco.less` L97–115                                 |
   | 开关（08 设置项）                                     | `a-switch`                    | 规格见 `src/styles/arco.less` L117–142                                |
   | 勾选框（列表选择）                                    | `a-checkbox`                  | 规格见 `src/styles/arco.less` L3–53                                   |
   | 弹窗（10 清理确认）                                   | `a-modal`                     | 16 圆角、header 53、footer 居中                                       |
   | 抽屉（11 记录详情）                                   | `a-drawer`                    | 仅左上/左下圆角 16、header 53 + 底边                                  |
   | 提示条 / 状态标签                                     | `a-tag`                       | 语义类 `correct` / `error` / `auxiliary` / `gray`                     |
   | 全局消息                                              | `Message`（Arco）             | 见 `section-arco-layer.vue`                                           |
   | 输入框 / 下拉（07 筛选）                              | `a-input` / `a-select`        | `allow-search` 用于目标名称搜索                                       |
   | 环形进度（03）                                        | `a-progress type="circle"`    | `stroke-width=12`、`color=#7666FB`、`track-color=#EDF1F7`             |
   | 步骤条（01–06 / 10）                                  | `a-steps`                     | 用 Less 收敛为设计稿胶囊形态，不另写组件                              |
   | 加载遮罩                                              | `a-spin`                      | `cx-table` 已内置                                                     |

2. **组件只写必要的新增**。允许新增的组件仅限「组件库与既有组件都无法表达」的三个：
   - `app-file-icon`：扩展名 → 文件类型图标映射（纯业务语义，无库可替代）。
   - `app-window-controls`：无边框窗口的窗口控制三按钮（需要 IPC 能力，无库可替代）。
   - `app-step-bar`：**不新增** —— 改为在 `app-shell` 内用 `a-steps` + 局部样式实现，仅当 `a-steps` 无法满足胶囊连接线形态时，才降级为 `src/components/app-step-bar/` 并在此文档登记例外。
   - 其余业务块（拖拽区、确认列表、进度面板、结果栏、筛选栏、抽屉内容）一律作为**页面私有组件**放在 `pages/<page>/component/`，不进 `src/components`。

3. **样式约束**：颜色 / 字号 / 圆角 / 间距一律取自 `docs/design-token.md`，禁止阶梯外取值（如 `6px`、`10px`、`14px` 间距）。

4. **代码规范**：`vue-code-rules` / `ts-code-rules` / `css-code-rules` 三个技能为强制项（模板与 script 顺序、声明级中文注释、BEM 单连字符命名、`:deep` 必须带选择器、变量声明注释、禁止无用空行等）。

### 1.3 设计 Token 落地方式

`src/styles/tokens.less` 新增（唯一新增的全局样式文件），把设计 Token 收敛为 Less 变量供组件引用：

```less
// 品牌 / 语义 / 灰度 / 辅助
@color-brand-100: #f5f9ff;  …  @color-brand-600: #0065ff;  @color-brand-700: #0047b2;
@color-progress: #7666fb;
@color-success-600: #26a555; @color-warning-600: #ff7d00; @color-error-600: #ff4c26;
@color-gray-100: #ffffff; … @color-gray-1000: #0d1014;
@color-aux-600: #557ca7;
// 字号 / 圆角 / 间距 / 阴影
@font-size-12…32; @radius-0…9999; @spacing-0…24; @shadow-card / @shadow-button-primary / …
```

`src/styles/index.less` 增加 `@import './tokens.less';`。

---

## 2. 目标架构

```
src/
├── App.vue                              重写：cx-config-provider + app-shell
├── constants/
│   ├── index.ts                         barrel
│   ├── navigation.ts                    页面标识 / 导航项 / 页面标题（侧栏与顶栏共用）
│   └── shred.ts                         清理级别、处理阶段、结果语义、文件类型映射表
├── layout/
│   ├── index.ts                         barrel
│   └── app-shell/
│       ├── index.ts / index.vue / index.less
│       ├── hooks/
│       │   ├── useAppShellContext.ts    外壳上下文：activePage + 任务实例 provide/inject
│       │   ├── useAppSettings.ts        应用设置读写（设置页与任务页共用）
│       │   └── useShredTask.ts          任务状态机（订阅 task:state/progress/complete/confirm）
│       └── component/
│           ├── app-sidebar.vue / app-sidebar.less      72px 图标导航 + 品牌区
│           ├── app-titlebar.vue / app-titlebar.less    50px 模块标题组 + 窗口控制
│           └── app-window-controls.vue / .less         最小化 / 最大化 / 关闭
├── components/                          ★ 仅放跨页面可复用的展示组件
│   ├── app-file-icon/                   扩展名 → 文件类型图标
│   ├── cx-table/ cx-pagination/ cx-empty/ cx-config-provider/ svg-icon/   （既有，不改）
│   └── index.ts
├── hooks/
│   ├── index.ts
│   └── useControlValue.ts               （既有）
├── pages/
│   ├── shred/                           01–06 步骤流程 + 10 确认弹窗
│   │   ├── index.vue / index.less       按 step 装配四个步骤组件 + 确认弹窗
│   │   └── component/                   ★ 每个页面私有组件一律为目录形态
│   │       ├── shred-step-bar/          步骤条（a-steps + 胶囊样式）
│   │       ├── step-drop-zone/          01 拖拽文件
│   │       ├── step-confirm-list/       02 清除列表确认
│   │       ├── step-progress/           03 清除进度
│   │       ├── step-result/             04 / 05 / 06 结果三态
│   │       └── shred-confirm-modal/     10 清理确认弹窗
│   ├── records/                         07 清理记录 + 11 详情抽屉
│   │   ├── index.vue / index.less
│   │   └── component/
│   │       ├── record-filter-bar/       行内筛选
│   │       └── record-detail-drawer/    11 详情抽屉
│   ├── settings/                        08 设置
│   │   ├── index.vue / index.less
│   │   └── component/
│   │       └── setting-row/             设置行（标题 + 说明 + 右侧控件）
│   └── about/index.vue / index.less     09 关于
├── assets/icons/                        ★ 新增 SVG 图标（雪碧图，`svg-icon` 取用）
├── utils/
│   ├── index.ts / async.ts / dom.ts     （既有）
│   ├── file.ts                          文件类型识别 / 名称提取 / 大小格式化
│   ├── format.ts                        时长 / 时间格式化
│   ├── target.ts                        草稿目标、列表行与结果状态归并
│   ├── shred.ts                         级别 / 阶段 / 进度 / 三态判定
│   └── log.ts                           记录筛选与分页
└── type/
    ├── index.ts                         IPC 类型（新增窗口控制与外部链接）
    └── env.d.ts                         构建期注入的应用版本与构建日期声明
```

> `src/pages/demo/**` **保留不作为应用入口**：它是 `docs/project-design.md` 明确标注的「组件标准用法示范」参考资产，删除会失去设计走查依据。

**页面私有组件目录约定**：`pages/*/component/<name>/` 统一采用 `index.vue`（入口）+ `index.less`（样式）+ `index.ts`（`export { default } from './index.vue'`），
与 `src/components/**` 的目录形态保持一致；页面入口按目录引入（`import StepResult from './component/step-result'`）。
只有「无私有样式、无子组件」的极简私有组件才允许保留单文件 `.vue`。

---

## 3. 数据契约（IPC ↔ 界面）

渲染进程只能通过 `window.shredderApi` 访问主进程能力（`electron/preload.ts`）。

| 能力                                                                                                | 签名                             | 对应界面                                                       |
| --------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| `getPathForFile(file)`                                                                              | `File → string`                  | 01 拖拽取路径                                                  |
| `chooseTargets(kind)`                                                                               | `'file'｜'directory' → string[]` | 01 补充入口（设计稿 01 屏不出现按钮，保留 API 供右键菜单链路） |
| `prepareShred(paths)`                                                                               | `string[] → ShredTarget[]`       | 01 → 02 目标元数据                                             |
| `shred(paths, passes)`                                                                              | `→ ShredResult[]`                | 02 → 03 启动任务                                               |
| `cancelShred()`                                                                                     | `→ boolean`                      | 03 停止清理                                                    |
| `getSettings() / updateSettings(patch)`                                                             |                                  | 08 设置                                                        |
| `getContextMenuStatus()`                                                                            | `→ boolean`                      | 08 右键菜单状态校准                                            |
| `getLogs() / deleteLogs(ids)`                                                                       |                                  | 07 记录                                                        |
| `onTaskState / onTaskProgress / onTaskComplete / onTaskConfirm / onLogsUpdated / onSettingsChanged` | 订阅返回 `() => void` 解除函数   | 外壳 + 各页                                                    |

**必须新增的 IPC（F0）**

| 频道                     | 方向  | 用途                           |
| ------------------------ | ----- | ------------------------------ |
| `window:minimize`        | R → M | 无边框窗口最小化               |
| `window:maximize-toggle` | R → M | 最大化 / 还原切换              |
| `window:close`           | R → M | 关闭窗口（走设置中的关闭行为） |
| `window:maximized`       | M → R | 最大化状态变化，驱动图标切换   |
| `app:open-external`      | R → M | 用系统默认浏览器打开外部链接（仅放行 `http` / `https`），供 09 关于页使用 |

**主进程本地持久化（目录为 `app.getPath('userData')`）**

| 文件               | 内容                                             | 写入时机                                                         |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| `settings.json`    | `AppSettings` 全字段（含 `rememberWindowPosition`） | `settings:update`                                                |
| `shred-logs.json`  | `ShredLog[]`                                     | 任务结束 / 删除记录                                              |
| `window-state.json` | `{ x, y, width, height }`                        | 窗口移动、缩放防抖 400ms 后，以及窗口关闭与应用退出前立即写入    |

---

## 4. 特性清单

### F0 工程底座 ✅

> 目标：让 11 屏可被还原的**资源与基础设施**先就位。

| #    | 项                   | 产出                                                                                                              | 验收要点                                                        | 状态 |
| ---- | -------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---- |
| F0-1 | 设计 Token Less 变量 | `src/styles/tokens.less` + `vite.config.ts` 全局注入                                                              | 颜色/字号/圆角/间距/阴影与 `design-token.md` 逐值一致           | ✅   |
| F0-2 | 文件类型图标（9）    | `src/assets/icons/file-{pdf,word,excel,ppt,image,video,archive,folder,text}.svg`                                  | 32×32、圆角 4、折叠角 + 类型字符，主色对齐设计系统看板 `2:320`  | ✅   |
| F0-3 | 通用图标（10）       | `icon-{remove,success,failure,arrow,close,info}.svg`、`icon-window-{minimize,maximize,restore,close}.svg`         | 16×16、`currentColor` 描边、圆头                                | ✅   |
| F0-4 | 导航图标（4）        | `icon-nav-{shred,records,settings,about}.svg`                                                                     | 24×24、`currentColor`，侧栏 20px 渲染                           | ✅   |
| F0-5 | 插画（4）            | `illustration-{drop,success,warning,failure}.svg`                                                                 | 拖拽 340×240；结果三态 152×152                                  | ✅   |
| F0-6 | 业务常量             | `src/constants/{navigation,shred}.ts` + `index.ts`                                                                | 清理级别 0/3/7/35 与文案「极速/日常/加强/深度」一一对应         | ✅   |
| F0-7 | 纯函数工具           | `src/utils/{file,format,shred,target,log}.ts`                                                                     | 文件类型识别、大小格式化、时长格式化，`src/utils/index.ts` 导出 | ✅   |
| F0-8 | 窗口控制 IPC         | `electron/window/main-window.ts`、`electron/ipc/register-handlers.ts`、`electron/preload.ts`、`src/type/index.ts` | 四个频道可用；窗口 `frame: false` 后仍可拖动 / 缩放             | ✅   |
| F0-9 | 测试基础设施         | `vitest.config.ts`                                                                                                | `npm test` 可运行并通过既有 `electron/utils/path.test.ts`       | ✅   |

> **附带修复（属 F0 前置阻塞项）**：`node_modules` 中 `element-plus`、`lodash-es`、`gsap`、`fast-glob` 等包存在 pnpm 安装未完成（顶层为残缺实体目录 + 遗留 `.pkg-xxxx` 占位链接），已通过 `pnpm install --frozen-lockfile` 修复；
> 同时修复了基线遗留的 6 处类型错误（`cx-table` 表头拖拽回调签名、demo 参考页 5 处），使 `npm run typecheck` 从「已知失败」变为干净通过。

### F1 应用外壳 ✅

> 设计来源：11 屏通用骨架（`project-design.md` §2.2）。

| #    | 项             | 产出                                                     | 验收要点                                                                                            | 状态 |
| ---- | -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---- |
| F1-1 | 侧边导航       | `layout/app-shell/component/app-sidebar.vue`             | 宽 72、品牌区 60 高（Logo 32）、4 个导航项仅图标、当前项高亮、分隔线 1px `#F2F5FA`                  | ✅   |
| F1-2 | 顶部栏         | `app-titlebar.vue`                                       | 高 50（内容 49 + 分隔线 1）、左侧模块标题组（标题 16px Bold + 副标题 12px `#99A1AD`）、右侧窗口控制 | ✅   |
| F1-3 | 窗口控制       | `app-window-controls.vue`                                | 三按钮 46×49、图标 16px、`#474F59` 描边、关闭悬浮红底；`-webkit-app-region: no-drag`                | ✅   |
| F1-4 | 页面切换       | `layout/app-shell/index.vue` + `constants/navigation.ts` | 四页切换不丢状态；`display` 切换保留组件实例；切换时同步顶栏标题                                    | ✅   |
| F1-5 | 任务进行中角标 | `app-sidebar.vue`                                        | 「清理任务」导航项在 `working` 时显示进行中角标（`project-requirements.md` §3）                     | ✅   |
| F1-6 | 外壳上下文     | `hooks/useAppShellContext.ts`                            | `provide()` / `inject()` 双方法；`inject` 回退对象字段与 `context` 完全一致                         | ✅   |
| F1-7 | 应用入口       | `App.vue` 重写                                           | 应用启动即进入外壳，不再渲染 demo 页                                                                | ✅   |

### F2 01 拖拽文件 ✅

> 设计来源：`2:1`（拖拽区 `2:86`、虚线内框 `2:87`、光晕 `2:88`/`2:89`、文案 `2:112`、插画 `2:120`）。

| #    | 项             | 验收要点                                                                | 状态 |
| ---- | -------------- | ----------------------------------------------------------------------- | ---- |
| F2-1 | 虚线拖拽区     | 虚线描边、圆角 16、两处渐变光晕（允许溢出父级）                         | ✅   |
| F2-2 | 文案组         | 主标题 20px「把文件或文件夹拖到这里」、副标题 14px、安全提示 12px       | ✅   |
| F2-3 | 拖拽插画       | 340×240，`illustration-drop`                                            | ✅   |
| F2-4 | 拖入校验       | 经 `getPathForFile` → `prepareShred` 得到元数据；无效路径不崩溃并有提示 | ✅   |
| F2-5 | 无按钮约束     | 01 屏**不出现**「设置/添加文件/添加文件夹」按钮                         | ✅   |
| F2-6 | 自动进入下一步 | 目标就绪后切到步骤 2；拖拽悬浮态有视觉反馈                              | ✅   |
| F2-7 | 既有目标回填   | 从右键菜单 `task:confirm` 进入时直接带目标到步骤 2 并弹出确认           | ✅   |

### F3 02 清除列表确认 ✅

> 设计来源：`2:147`（确认区 `2:281`、待清除目标卡片 `2:301`、表格区域 `10:3`、表格 `10:4`、底栏 `10:93`）。

| #    | 项             | 验收要点                                                                                                 | 状态 |
| ---- | -------------- | -------------------------------------------------------------------------------------------------------- | ---- |
| F3-1 | 待清除目标卡片 | 圆角 16 白底；卡头 56 高标题「待清除目标」（左对齐）；表格区域 padding `16 16 0 0`；高度撑满             | ✅   |
| F3-2 | 目标表格       | `cx-table`：勾选列 60 / 目标名称 fill / 所在位置 280 / 大小 110 / 操作 130；表头 40、行 48、斑马纹       | ✅   |
| F3-3 | 类型图标列     | 目标名称列前置 `app-file-icon` 20×20                                                                     | ✅   |
| F3-4 | 勾选联动       | 全选 / 半选 / 单选；`cx-table` 的 `v-model:selectKeys` 与草稿选中集合双向                                | ✅   |
| F3-5 | 行内移除       | 操作列「移除」文字按钮（带 `icon-remove`），移除后即时更新计数                                           | ✅   |
| F3-6 | 底部操作栏     | 高 64、`space-between`：左「共 N 项，已选 M 项」，右「删除选中」(danger outline) + 「确认清除」(primary) | ✅   |
| F3-7 | 按钮启用状态   | 已选 0 项时两个按钮均禁用                                                                                | ✅   |
| F3-8 | 确认链路       | `confirmBeforeShred` 开 → 弹 10 屏弹窗；关 → 直接进入步骤 3                                              | ✅   |
| F3-9 | 空态           | 目标全部移除后回到步骤 1                                                                                 | ✅   |

### F4 03 清除进度 ✅

> 设计来源：`2:429`（进度区 `2:587`、环形卡 `2:588`、右列 `2:635`）。

| #     | 项             | 验收要点                                                                                                                                                                                   | 状态 |
| ----- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| F4-1  | 环形进度卡     | 宽 320、padding 20、圆角 16；标题行「清理进度」16px Bold                                                                                                                                   | ✅   |
| F4-2  | 环形进度       | `a-progress type="circle"`，直径 176、`stroke-width 12`、`#7666FB` / 轨道 `#EDF1F7`；中心百分比 32px Roboto（设计稿 40px 属阶梯外取值，按 Token 阶梯取 32px）+ 「已完成 3 / 5 个文件」12px | ✅   |
| F4-3  | 数据口径       | 环形取 `fileIndex / fileCount`（文件级），非字节级 `completed / total`                                                                                                                     | ✅   |
| F4-4  | 阶段 chip      | 两段：覆写数据（`overwriting`）/ 销毁文件项（`removing`）；`done` 时两段均视为完成；**不画第三段**                                                                                         | ✅   |
| F4-5  | 当前文件卡     | 底 `@color-brand-100`、圆角 8、padding 12：状态行 + 文件名行（含类型图标）+ 路径（单行省略）                                                                                               | ✅   |
| F4-6  | 字节轨道       | 标题行含百分比，轨道 + 渐变填充 `#0065FF → #7666FB`                                                                                                                                        | ✅   |
| F4-7  | 指标组         | 已处理 / 预计剩余 / 已用时（数值 Roboto）                                                                                                                                                  | ✅   |
| F4-8  | 停止清理       | 白底 + `#FF4C26` 描边（`a-button outline status=danger`），点击调 `cancelShred()`；取消后进入结果页且标记「已取消」                                                                        | ✅   |
| F4-9  | 安全备注       | 「清理过程中请勿关闭窗口，避免数据损坏」12px `#99A1AD`                                                                                                                                     | ✅   |
| F4-10 | 文件处理队列卡 | N 段 12 高细胶囊（圆角 9999）：已完成 `#26A555` / 处理中 `#0065FF` / 待处理 `#E1E5EB` + 图例                                                                                               | ✅   |
| F4-11 | 卡片头文案     | 右副标题用**用户视角**文案「按处理顺序依次覆写」，不暴露 IPC 实现细节                                                                                                                      | ✅   |
| F4-12 | 处理明细表     | 时间 88 / 文件 fill / 阶段 80 / 状态 64；阶段与状态用 `a-tag`，表格复用 `cx-table`                                                                                                         | ✅   |
| F4-13 | 处理阶段说明卡 | 覆写数据 / 销毁文件项 / 目标完成 三条规则说明 + 当前清理级别                                                                                                                               | ✅   |
| F4-14 | 进度节流渲染   | 主进程 80ms 推送，渲染层不抖帧；进度回退不出现（`fileIndex` 单调）                                                                                                                         | ✅   |

### F5 04 / 05 / 06 清除结果三态 ✅

> 设计来源：`2:732` / `2:1008` / `2:1133`。

| #    | 项          | 验收要点                                                                                                      | 状态 |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------- | ---- |
| F5-1 | 结果区布局  | 水平 gap 20：左栏 360（状态主卡）+ 右栏 fill                                                                  | ✅   |
| F5-2 | 状态主卡    | 垂直渐变底 + 插画圆底 184 + 插画 152 + 状态胶囊 + 标题 24px Bold + 描述 + 分隔线 + 元信息行 + 居中操作区      | ✅   |
| F5-3 | 三态语义色  | 04 绿 `#26A555`/`#E9F6EE`/`#1B743C`；05 橙 `#FF7D00`/`#FFF4E5`/`#9E5200`；06 红 `#FF4C26`/`#FFF1EE`/`#B3351B` | ✅   |
| F5-4 | 态判定规则  | 全部成功→04；部分成功→05；全部失败→06；`cancelled` 走 05 语义并标注「已取消」                                 | ✅   |
| F5-5 | 统计区 4 卡 | 文件总数 / 已清除 / 未清除 / 本次耗时，数值 24px Roboto（设计稿 28px 属阶梯外取值）                           | ✅   |
| F5-6 | 清理详情卡  | 清理级别 / 目标数量 / 数据覆写 / 完成时间                                                                     | ✅   |
| F5-7 | 本次目标卡  | 卡头 + 目标行，行首 20×20 文件类型图标，末位状态标签                                                          | ✅   |
| F5-8 | 操作按钮    | 「清理记录」primary（切到 07 页）+「完成清理」outline（回步骤 1 并清空草稿）                                  | ✅   |
| F5-9 | 记录刷新    | 任务结束（`logs:updated`）后进入 07 页能看到本次记录                                                          | ✅   |

### F6 10 清理确认弹窗 ✅

> 设计来源：`2:1910`（遮罩 `10:1`、弹窗 `2:2216` 宽 520、内容区 `10:105`）。

| #    | 项             | 验收要点                                                                                  | 状态 |
| ---- | -------------- | ----------------------------------------------------------------------------------------- | ---- |
| F6-1 | `a-modal` 规格 | 宽 520、圆角 16、header 53、body `24 24 0 24`、footer 居中 gap 10；遮罩 `rgba(0,0,0,0.6)` | ✅   |
| F6-2 | 内容           | 目标数量 / 清理级别（`a-tag correct`）/ 不可逆风险提示（`a-tag error`）                   | ✅   |
| F6-3 | 交互           | 确认 → 进入步骤 3；取消 → 留在步骤 2 且不丢选中                                           | ✅   |
| F6-4 | 外部触发       | 右键菜单进入时自动弹出（`task:confirm` 订阅）                                             | ✅   |

> **F6-2 实现取舍**：设计稿 `10:105` 是把 02 屏确认区（卡片 + 5 列表格 + 底栏）整体复制进 520 宽弹窗，但 520px 无法容纳
> 「勾选 60 + 名称 + 位置 280 + 大小 110 + 操作 130」的表格；因此弹窗内容按**摘要形态**实现（目标数量 + 清理级别 + 不可逆风险提示），
> 与 `project-requirements.md` 中「执行前确认」的意图一致，完整清单仍在 02 屏核对。

### F7 07 清理记录 ✅

> 设计来源：`2:1286`（筛选卡 `2:1692` 无卡片容器、记录表卡 `2:1715` 无卡头、列表区 `10:460`、分页 `10:539`）。

| #    | 项           | 验收要点                                                                                     | 状态 |
| ---- | ------------ | -------------------------------------------------------------------------------------------- | ---- |
| F7-1 | 行内筛选栏   | 无卡片容器；标签 + 控件 + 「查询」主按钮；控件宽 200/120/120/120；右侧「重置」+「导出记录」  | ✅   |
| F7-2 | 筛选维度     | 目标名称（模糊）/ 清理结果（成功·失败）/ 清理级别 / 时间范围                                 | ✅   |
| F7-3 | 记录表       | `cx-table` 无卡头：清理时间 160 / 目标名称 fill / 结果 56（定宽 chip）/ 说明 fill / 操作 120 | ✅   |
| F7-4 | 行高与表头   | 表头 36 高、行 40 高、斑马纹、`#F2F5FA` 分隔线                                               | ✅   |
| F7-5 | 分页         | 复用 `cx-pagination`，默认 50 条/页，可选 50/100/150/200；左侧「共 N 条记录」                | ✅   |
| F7-6 | 跨页批量选择 | 勾选列 + 跨页保留选中；批量删除前 `a-modal` 确认；删除后即时刷新                             | ✅   |
| F7-7 | 空态         | 无记录 / 搜索无结果显示 `cx-empty`                                                           | ✅   |
| F7-8 | 操作列       | 「详情」52 蓝 + 「删除」52 红（文字按钮）                                                    | ✅   |
| F7-9 | 新增提示     | 任务完成后进入本页可见新记录（`onLogsUpdated` 重新拉取）                                     | ✅   |

### F8 11 清理记录详情抽屉 ✅

> 设计来源：`2:2059`（抽屉 `2:2267` 400×800、头部 `2:2268` 53 高、内容区 `2:2275`、底部栏 `2:2344`）。

| #    | 项              | 验收要点                                                                                 | 状态 |
| ---- | --------------- | ---------------------------------------------------------------------------------------- | ---- |
| F8-1 | `a-drawer` 规格 | 宽 400、贴右、仅左上/左下圆角 16；header 53 + `1px #F2F5FA` 底边；footer 64 + 顶边、居中 | ✅   |
| F8-2 | 内容字段        | 记录编号 / 清理时间 / 清理级别 / 执行结果 / 目标路径 / 消耗时间 / 文件明细               | ✅   |
| F8-3 | 失败原因        | 存在失败时展示失败原因提示条（`a-tag error` / `a-tag auxiliary`）                        | ✅   |
| F8-4 | 处理日志        | 该记录的逐条消息列表                                                                     | ✅   |
| F8-5 | 底部操作        | 「关闭」+「导出记录」                                                                    | ✅   |

### F9 08 设置 ✅

> 设计来源：`2:1411`（清理设置卡 `2:1796`、界面与窗口卡 `2:1803`、系统集成卡 `2:1809`）。

| #    | 项               | 验收要点                                                                                       | 状态 |
| ---- | ---------------- | ---------------------------------------------------------------------------------------------- | ---- |
| F9-1 | 设置行规格       | 高 56、padding `0 16`、`space-between` 垂直居中；左「标题 14px + 说明 12px `#99A1AD`」，右控件 | ✅   |
| F9-2 | 默认清理级别     | `a-radio-group type="button"`：极速 0 遍 / 日常 3 遍 / 加强 7 遍 / 深度 35 遍                  | ✅   |
| F9-3 | 清理设置卡       | 默认清理级别 ＜分隔线＞ 删除根目录 ＜＞ 执行前确认                                             | ✅   |
| F9-4 | 界面与窗口卡     | 窗口置顶 ＜分隔线＞ 记忆窗口位置                                                               | ✅   |
| F9-5 | 系统集成卡       | 开机自启 ＜＞ 完成通知 ＜＞ 右键菜单                                                           | ✅   |
| F9-6 | 无外观主题项     | 不得出现「外观主题」设置行（`AppSettings` 无该字段）                                           | ✅   |
| F9-7 | 持久化与生效     | 改动即调 `updateSettings`，成功后即时生效；失败有 `Message.error` 反馈并回滚 UI                | ✅   |
| F9-8 | 右键菜单状态校准 | 进入设置页调 `getContextMenuStatus()` 校准实际状态                                             | ✅   |

### F10 09 关于 ✅

> 设计来源：`2:1536`（关于卡 `2:1882`、主视觉 `2:1883`、信息列表 `2:1888`、操作区 `2:1904`、版权 `2:1907`）。

| #     | 项       | 验收要点                                                | 状态 |
| ----- | -------- | ------------------------------------------------------- | ---- |
| F10-1 | 主视觉   | Logo + 「FileShredder · 文件粉碎精灵」+ 版本号 + 简介   | ✅   |
| F10-2 | 信息列表 | 许可 / 运行环境 / 数据存储 / 开源仓库 四行              | ✅   |
| F10-3 | 操作区   | 居中，仅「开源仓库」outline 按钮（**无「检查更新」**）  | ✅   |
| F10-4 | 版权     | 「Copyright 2024 FileShredder · 基于 MIT 许可开源」12px | ✅   |

### F11 质量门 ✅

| #     | 项           | 命令                            | 状态 |
| ----- | ------------ | ------------------------------- | ---- |
| F11-1 | 类型检查     | `npm run typecheck`             | ✅   |
| F11-2 | 单元测试     | `npm test`                      | ✅   |
| F11-3 | 构建检查     | `npm run build:app`             | ✅   |
| F11-4 | 格式检查     | `npm run format:check`          | ✅   |
| F11-5 | 测试文档回填 | 按 `docs/test-plan.md` 记录结果 | ✅   |

---

## 5. 跨屏数据一致性约定

| 约定           | 内容                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| 文件类型图标   | 由 `app-file-icon` 统一按扩展名映射，02 / 03 / 04-06 / 11 屏共用同一映射表                   |
| 状态语义色     | 成功 / 部分成功 / 失败三态色只在 `src/constants/shred.ts` 定义一次，三屏与 07 记录 chip 共用 |
| 清理级别文案   | 「极速（0 遍）/ 日常（3 遍）/ 加强（7 遍）/ 深度（35 遍）」唯一来源 `src/constants/shred.ts` |
| 时间与时长格式 | 统一 `src/utils/format.ts`：时间 `YYYY-MM-DD HH:mm`，时长 `mm:ss`                            |
| 文件大小格式   | 统一 `src/utils/file.ts`：B / KB / MB / GB，保留 1 位小数                                    |
| 记录与目标同源 | 07 屏记录由 `ShredLog` 渲染，11 屏抽屉来自同一 `ShredLog` 对象，不重复构造                   |

---

## 6. 待办 / 例外登记

| 项                         | 说明                                                                                                                                                                                    | 状态                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 主题切换                   | `project-requirements.md` §6.2 要求浅色/深色/跟随系统，`AppSettings` 暂无字段；实现层保留样式变量位置，不新增设置项                                                                     | 已按设计稿不含该设置项处理  |
| `src/pages/demo/**`        | 设计走查参考资产，不参与应用运行                                                                                                                                                        | 保留                        |
| 步骤条使用 `a-steps`       | 已用 `a-steps` + Less 收敛为胶囊 + 连接线形态，未新增 `app-step-bar` 组件                                                                                                               | 已落地，例外不成立          |
| **阶梯外字号收敛**         | 设计稿使用 40px（环形中心）/ 28px（统计数值）/ 13px（描述与明细标签）等**阶梯外字号**；`design-token.md` 的阶梯为 `12/14/16/20/24/32`，按 §1.2 约束统一收敛为 32 / 24 / 12              | 已按 Token 收敛             |
| **阶梯外间距收敛**         | 设计稿队列条分段 gap 为 `6px`；`design-token.md` 间距阶梯为 `0/2/4/8/12/16/20/24`，实现取 `@spacing-8`                                                                                  | 已按 Token 收敛             |
| **`#F5F7FF` 非 Token 色**  | 设计稿「当前文件卡」底色 `#F5F7FF` 不在 26 色 Token 表内，实现取语义最接近的 `@color-brand-100`（主题色浅色背景 `#F5F9FF`）                                                             | 已按 Token 收敛             |
| **F6 弹窗内容形态**        | 设计稿 `10:105` 把 02 屏整块确认区（含 5 列表格）复制进 520 宽弹窗，几何上不可容纳；实现改为摘要形态（目标数量 / 清理级别 / 不可逆风险提示），完整清单保留在 02 屏                      | 已按可容纳性收敛            |
| **阶段 chip 未用 `a-tag`** | 03 屏阶段行需要「当前阶段 = 品牌蓝」的语义，`arco.less` 的 `a-tag` 只提供 `correct`/`error`/`auxiliary`/`gray` 四个语义类，无品牌蓝档；故 stage chip 用页面私有类实现（非新增通用组件） | 页面私有，符合 §1.2 第 3 条 |
| **关于页信息列表用 `a-descriptions`** | 09 屏 `2:1888` 的「许可 / 运行环境 / 数据存储 / 开源仓库」为标签-值列表，直接使用 Arco 的 `a-descriptions`（`layout="horizontal"`、`:column="1"`、`align="right"`），未自造行组件；仅用 `:deep(.arco-descriptions-item-*)` 收敛字色字号 | 复用组件库，无新增组件 |
| **`rememberWindowPosition` 为新增设置字段** | 设计稿 08 屏 `2:1856` 与 `project-requirements.md` §6.2 均要求「记忆窗口位置」，原 `AppSettings` 无该字段；已补齐字段 + `window-state.json` 持久化 + 多显示器/失效坐标回退（`electron/utils/bounds.ts`，含单测） | 已落地 |
| **`app:open-external` 为新增 IPC** | 09 屏「开源仓库」需要打开系统浏览器，既有 API 无该能力；新增频道仅放行 `http` / `https`，其余协议抛错 | 已落地 |
| **关于页仓库地址为占位常量** | `package.json` 未声明 `repository`，设计稿只给出「开源仓库」一行；实现以页面私有常量 `https://github.com/file-shredder/file-shredder` 占位，待仓库真实地址确定后替换 | 待替换真实地址 |
| **`.prettierignore` 增补** | 追加 `.workbuddy/`（工具态目录）与 `src/type/auto-imports.d.ts`、`src/type/components.d.ts`（unplugin 生成物，每次构建重写，纳入校验会反复失败） | 已落地 |
| **全仓 Prettier 归一化** | 基线代码存在大量 CRLF 与未格式化文件，`npm run format:check` 原本不通过；已按 `.prettierrc.json`（`endOfLine: lf`、`semi: true`、`singleQuote`）统一格式化，使 F11-4 可通过 | 已落地 |
