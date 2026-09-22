# 文件粉碎精灵

面向 Windows 10 / 11 的 Electron 文件粉碎工具。桌宠形象来自用户提供照片的人物抠图；桌宠窗口保持透明、无边框、无文字，只显示人物。界面使用 Vue 3、TypeScript、Arco Design Vue，并加载用户提供的 `styles.zip` 主题资源。

## 使用方式

- 右键桌宠：选择文件、选择文件夹、输入指定路径、打开设置与日志、安装或卸载资源管理器菜单、退出。
- 拖放：把文件或文件夹拖到人物形象上即可粉碎。
- 全局快捷键：默认 `Ctrl+Shift+Delete`，优先读取资源管理器当前选中项，读取不到时尝试剪贴板路径。
- Windows 资源管理器：右键文件或文件夹，选择“文件粉碎精灵”。首次运行默认自动安装，无需管理员权限。

设置与日志使用独立窗口，程序启动时默认不打开。清理强度、清理行为、粉碎确认、桌宠置顶、自启、桌宠形象、气泡位置和资源管理器菜单均可在设置窗口调整。

## Windows 11 右键菜单说明

本项目使用当前用户注册表 Shell 命令扩展：

```text
HKCU\Software\Classes\*\shell\FileShredder
HKCU\Software\Classes\Directory\shell\FileShredder
```

Windows 10 会直接显示该菜单。Windows 11 的经典 Shell 扩展通常位于“显示更多选项”中，这是系统限制。若要进入 Windows 11 新版一级右键菜单，需要另行开发和签名原生 COM `IExplorerCommand` DLL，单纯 Electron/注册表命令无法实现。

## 粉碎策略与安全边界

- 支持 3 / 7 / 35 次随机数据覆写，每轮写入后执行 `fsync`，完成后删除。
- 支持普通文件、只读文件、符号链接和递归文件夹。
- 清理文件夹时默认连同根目录一起删除，可在设置中改为只清理文件夹内容。
- 阻止粉碎磁盘根目录、Windows、Program Files、ProgramData 等系统保护路径。
- SSD 的磨损均衡与 TRIM、云盘版本历史、RAID 缓存、快照、备份及写时复制文件系统可能保留底层副本。任何普通应用都无法保证所有存储介质上绝对不可恢复；高安全场景应结合全盘加密、密钥销毁和设备 Secure Erase / Sanitize。

## 本地开发

要求 Node.js 20+。Windows 系统集成功能需要在 Windows 上验证。

```text
npm install
npm run dev
npm test
npm run typecheck
```

构建 Windows 安装包：

```text
npm run build:x64
npm run build:ia32
```

需要免安装单文件时可单独构建 portable EXE：

```text
npm run build:win:portable:x64
npm run build:win:portable:ia32
```

成品位于 `release` 目录。日常使用推荐安装包版本，portable EXE 每次运行都要先解压 Electron 运行时，冷启动会更慢。新图标用于系统通知、设置窗口和资源管理器菜单；若要同时改写 portable 外壳图标，需要为 Electron Builder 开启 Windows 符号链接权限（启用开发者模式或使用管理员终端构建）。

Windows 安装包使用品牌一致的向导流程：欢迎页 → 安装位置页 → 安装选项页 → 安装进度 → 完成页。安装位置页是 NSIS 原生目录页，可以修改安装目录并显示所需空间与可用空间；完成页可以直接启动应用。

安装选项页分为两组：**快捷方式**决定是否创建桌面快捷方式；**初始系统设置**与应用内“设置 - 系统设置”一一对应，包含桌宠始终置顶、开机自动启动、开启系统通知、资源管理器右键菜单四项。勾选状态就是安装后写入的默认值，并且只在首次安装时生效，升级安装不会覆盖用户在应用内改过的设置。

安装阶段由安装程序以 `--install-defaults=alwaysOnTop:true,launchAtLogin:false,systemNotifications:true,contextMenuInstalled:false` 调用应用一次，应用据此写入初始设置并同步系统启动项与资源管理器右键菜单，随后直接退出，不显示桌宠窗口。静默安装可用 `/install-defaults=` 传入同一份键值对覆盖界面上的勾选结果。应用只在安装器传入的字段落在上述四项之内时才会采用，其余字段一律忽略。

安装器的品牌图片位于 `build` 目录：`installer-header.bmp`（150×57，白底页眉图标）用于每一页右上角，`installer-sidebar.bmp`（164×314）用于欢迎页和完成页左侧。页面顺序、页眉文案与安装行为位于 `build/installer.nsh`，两张位图都是静态资源，替换文件即可换肤；需要用桌宠形象重新生成时运行 `python build/installer-art.py`。

## 图标资源

`src/assets/icons` 下的业务图标统一按 `icon-xxx.svg` 命名，与 `src/styles/icons` 中主题自带的表单图标相互独立。构建时 `vite-plugin-svg-icons` 依据文件名生成同名 symbol 雪碧图，组件统一通过 `<svg-icon name="icon-xxx" />` 引用；图标内部使用 `currentColor` 填充，颜色由外层文字颜色控制。

## 主题资源

用户提供的 `styles.zip` 包含 `arco.less` 与图标资源，没有完整可直接使用的 `reset.less`。项目保留原始主题文件，并在 `src/styles/reset.less` 中补齐必要的页面与元素重置。
