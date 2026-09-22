; 安装器界面定制：品牌页眉、原生目录页、安装选项页与完成页保持统一外观。
!ifndef BUILD_UNINSTALLER
  !include "FileFunc.nsh"
  !include "LogicLib.nsh"
  !include "MUI2.nsh"
  !include "nsDialogs.nsh"

  ; 目录页沿用 MUI 原生页面，文案与分组标题按品牌安装器的写法给出。
  !define MUI_DIRECTORYPAGE_TEXT_TOP "安装程序将把 $(^NameDA) 安装到以下目录。要安装到另一个目录，请点击 [浏览(B)...] 并选择其他的文件夹。$_CLICK"
  !define MUI_DIRECTORYPAGE_TEXT_DESTINATION "安装目录"

  ; 向导中途取消时先确认，避免误触丢失已选设置。
  !define MUI_ABORTWARNING

  Var DesktopShortcutCheckbox
  Var AlwaysOnTopCheckbox
  Var StartupCheckbox
  Var NotificationCheckbox
  Var ContextMenuCheckbox
  Var DesktopShortcutRequested
  Var AlwaysOnTopRequested
  Var StartupRequested
  Var NotificationRequested
  Var ContextMenuRequested
  Var InstallerDefaultsOverride

  ; 初始值与应用中「设置 - 系统设置」的默认值保持一致；
  ; 静默安装可以用 /install-defaults=alwaysOnTop:true,... 一次性覆盖。
  !macro customInit
    StrCpy $DesktopShortcutRequested "true"
    StrCpy $AlwaysOnTopRequested "true"
    StrCpy $StartupRequested "false"
    StrCpy $NotificationRequested "true"
    StrCpy $ContextMenuRequested "false"
    StrCpy $InstallerDefaultsOverride ""
    ${GetParameters} $R0
    ${GetOptions} $R0 "/install-defaults=" $InstallerDefaultsOverride
    ; 未命中该开关时清理错误标记，避免影响后续参数解析。
    ClearErrors
  !macroend

  !macro customInstallMode
    StrCpy $isForceCurrentInstall "1"
  !macroend

  ; 页眉文案要在语言文件载入之后覆盖，才能替换 NSIS 默认的“选定安装位置”。
  ; 重复定义语言字符串只会多占少量空间，这里显式屏蔽对应的编译告警。
  !macro customHeader
    !pragma warning push
    !pragma warning disable 6030
    LangString MUI_TEXT_DIRECTORY_TITLE ${LANG_SIMPCHINESE} "选择安装位置"
    LangString MUI_TEXT_DIRECTORY_SUBTITLE ${LANG_SIMPCHINESE} "选择 $(^NameDA) 的安装文件夹。"
    !pragma warning pop
  !macroend

  ; 第一页：品牌欢迎页，左侧展示桌宠形象。
  !macro customWelcomePage
    !define MUI_WELCOMEPAGE_TITLE "欢迎使用 $(^NameDA) 安装向导"
    !define MUI_WELCOMEPAGE_TITLE_3LINES
    !define MUI_WELCOMEPAGE_TEXT "本向导将引导你完成 $(^NameDA) 的安装。$\r$\n$\r$\n安装前请先退出正在运行的 $(^NameDA)，安装程序需要更新同名程序文件。$\r$\n$\r$\n$_CLICK"
    !insertmacro MUI_PAGE_WELCOME
  !macroend

  ; 第三页：安装选项，与目录页共用同一套页眉样式。
  !macro customPageAfterChangeDir
    Page custom InstallOptionsPageCreate InstallOptionsPageLeave
  !macroend

  Function InstallOptionsPageCreate
    !insertmacro MUI_HEADER_TEXT "安装选项" "选择安装程序要一并完成的设置。"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0u 300u 10u "安装程序可以同时完成下列设置。取消勾选不会影响 $(^NameDA) 的正常安装。"
    Pop $0

    ; 快捷方式属于安装程序自身行为，与应用设置分开成组。
    ${NSD_CreateGroupBox} 0 16u 300u 24u "快捷方式"
    Pop $0
    ${NSD_CreateCheckbox} 9u 28u 286u 10u "创建桌面快捷方式"
    Pop $DesktopShortcutCheckbox
    ${If} $DesktopShortcutRequested == "true"
      ${NSD_Check} $DesktopShortcutCheckbox
    ${EndIf}

    ; 系统设置分组与应用内设置页一一对应，勾选项作为首次安装的默认值。
    ${NSD_CreateGroupBox} 0 46u 300u 66u "初始系统设置（仅首次安装时写入）"
    Pop $0

    ${NSD_CreateCheckbox} 9u 58u 286u 10u "桌宠始终置顶"
    Pop $AlwaysOnTopCheckbox
    ${If} $AlwaysOnTopRequested == "true"
      ${NSD_Check} $AlwaysOnTopCheckbox
    ${EndIf}

    ${NSD_CreateCheckbox} 9u 72u 286u 10u "开机自动启动 $(^NameDA)"
    Pop $StartupCheckbox
    ${If} $StartupRequested == "true"
      ${NSD_Check} $StartupCheckbox
    ${EndIf}

    ${NSD_CreateCheckbox} 9u 86u 286u 10u "开启系统通知"
    Pop $NotificationCheckbox
    ${If} $NotificationRequested == "true"
      ${NSD_Check} $NotificationCheckbox
    ${EndIf}

    ${NSD_CreateCheckbox} 9u 100u 286u 10u "资源管理器右键菜单"
    Pop $ContextMenuCheckbox
    ${If} $ContextMenuRequested == "true"
      ${NSD_Check} $ContextMenuCheckbox
    ${EndIf}

    ${NSD_CreateLabel} 0 116u 300u 18u "以上四项与应用内“设置 - 系统设置”一一对应；默认值仅在首次安装时写入，安装后可以随时修改。"
    Pop $0

    nsDialogs::Show
  FunctionEnd

  ; 读取勾选状态，并统一转换为应用可识别的 true/false 字面量。
  !macro ReadCheckboxState Checkbox Output
    ${NSD_GetState} ${Checkbox} $1
    ${If} $1 == ${BST_CHECKED}
      StrCpy ${Output} "true"
    ${Else}
      StrCpy ${Output} "false"
    ${EndIf}
  !macroend

  Function InstallOptionsPageLeave
    !insertmacro ReadCheckboxState $DesktopShortcutCheckbox $DesktopShortcutRequested
    !insertmacro ReadCheckboxState $AlwaysOnTopCheckbox $AlwaysOnTopRequested
    !insertmacro ReadCheckboxState $StartupCheckbox $StartupRequested
    !insertmacro ReadCheckboxState $NotificationCheckbox $NotificationRequested
    !insertmacro ReadCheckboxState $ContextMenuCheckbox $ContextMenuRequested
  FunctionEnd

  !macro customFinishPage
    !define MUI_FINISHPAGE_TITLE "安装完成"
    !define MUI_FINISHPAGE_TEXT "$(^NameDA) 已成功安装到你的电脑。$\r$\n$\r$\n点击 [完成(F)] 关闭安装向导。"
    !define MUI_FINISHPAGE_BUTTON "完成"
    ; 直接给出可执行文件路径：自定义脚本先于 electron-builder 的 $appExe 变量赋值展开，
    ; 这里只能用命令行的 PRODUCT_FILENAME 组合路径。
    !define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_FILENAME}.exe"
    !define MUI_FINISHPAGE_RUN_TEXT "立即运行 $(^NameDA)"
    !insertmacro MUI_PAGE_FINISH
  !macroend

  !macro customInstall
    ; 未勾选桌面快捷方式时移除安装程序预先创建的快捷方式。
    ${If} $DesktopShortcutRequested != "true"
      Delete "$newDesktopLink"
    ${EndIf}

    ; 把安装选项交给应用一次性写入初始设置，并同步开机启动与资源管理器右键菜单。
    ${If} $InstallerDefaultsOverride != ""
      StrCpy $0 $InstallerDefaultsOverride
    ${Else}
      StrCpy $0 "alwaysOnTop:$AlwaysOnTopRequested,launchAtLogin:$StartupRequested,systemNotifications:$NotificationRequested,contextMenuInstalled:$ContextMenuRequested"
    ${EndIf}
    ExecWait '"$appExe" "--install-defaults=$0"' $1
    ${If} $1 != 0
      DetailPrint "无法写入初始系统设置，退出码：$1"
    ${EndIf}
  !macroend
!endif
