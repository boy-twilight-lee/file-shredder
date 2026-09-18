!ifndef BUILD_UNINSTALLER
  !include "FileFunc.nsh"
  !include "LogicLib.nsh"
  !include "MUI2.nsh"
  !include "nsDialogs.nsh"

  Var DesktopShortcutCheckbox
  Var StartupCheckbox
  Var DesktopShortcutRequested
  Var StartupRequested

  !macro customInit
    StrCpy $DesktopShortcutRequested "1"
    StrCpy $StartupRequested ""
    ${GetParameters} $R0
    ${GetOptions} $R0 "/startup=" $StartupRequested
  !macroend

  !macro customPageAfterChangeDir
    Page custom InstallOptionsPageCreate InstallOptionsPageLeave
  !macroend

  Function InstallOptionsPageCreate
    !insertmacro MUI_HEADER_TEXT "安装选项" "选择要创建的快捷方式"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateCheckbox} 0 10u 100% 12u "创建桌面快捷方式"
    Pop $DesktopShortcutCheckbox
    ${NSD_Check} $DesktopShortcutCheckbox

    ${NSD_CreateCheckbox} 0 30u 100% 12u "开机时自动启动应用"
    Pop $StartupCheckbox

    nsDialogs::Show
  FunctionEnd

  Function InstallOptionsPageLeave
    ${NSD_GetState} $DesktopShortcutCheckbox $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $DesktopShortcutRequested "1"
    ${Else}
      StrCpy $DesktopShortcutRequested "0"
    ${EndIf}

    ${NSD_GetState} $StartupCheckbox $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $StartupRequested "true"
    ${Else}
      StrCpy $StartupRequested "false"
    ${EndIf}
  FunctionEnd

  !macro customInstall
    ${If} $DesktopShortcutRequested == "0"
      Delete "$newDesktopLink"
    ${EndIf}

    ${If} $StartupRequested != ""
      ExecWait '"$appExe" --configure-startup=$StartupRequested' $0
      ${If} $0 != 0
        DetailPrint "无法同步开机自启设置，退出码：$0"
      ${EndIf}
    ${EndIf}
  !macroend
!endif
