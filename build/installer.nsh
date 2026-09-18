!ifndef BUILD_UNINSTALLER
  !include "FileFunc.nsh"
  !include "LogicLib.nsh"
  !include "MUI2.nsh"
  !include "nsDialogs.nsh"

  Var DesktopShortcutCheckbox
  Var StartupCheckbox
  Var InstallDirectoryField
  Var BrowseDirectoryButton
  Var DesktopShortcutRequested
  Var StartupRequested

  !macro customInit
    StrCpy $DesktopShortcutRequested "1"
    StrCpy $StartupRequested ""
    ${GetParameters} $R0
    ${GetOptions} $R0 "/startup=" $StartupRequested
  !macroend

  !macro customInstallMode
    StrCpy $isForceCurrentInstall "1"
  !macroend

  !macro customWelcomePage
    Page custom InstallOptionsPageCreate InstallOptionsPageLeave
  !macroend

  Function InstallOptionsPageCreate
    !insertmacro MUI_HEADER_TEXT "安装设置" "选择安装位置和快捷方式选项"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 8u 100% 12u "安装位置"
    Pop $0
    ${NSD_CreateDirRequest} 0 24u 78% 15u "$INSTDIR"
    Pop $InstallDirectoryField
    ${NSD_CreateButton} 81% 23u 19% 17u "浏览..."
    Pop $BrowseDirectoryButton
    ${NSD_OnClick} $BrowseDirectoryButton SelectInstallDirectory

    ${NSD_CreateCheckbox} 0 52u 100% 12u "创建桌面快捷方式"
    Pop $DesktopShortcutCheckbox
    ${NSD_Check} $DesktopShortcutCheckbox

    ${NSD_CreateCheckbox} 0 70u 100% 12u "开机时自动启动应用"
    Pop $StartupCheckbox

    nsDialogs::Show
  FunctionEnd

  Function SelectInstallDirectory
    nsDialogs::SelectFolderDialog "选择安装位置" "$INSTDIR"
    Pop $0
    ${If} $0 != error
      StrCpy $INSTDIR "$0"
      SendMessage $InstallDirectoryField ${WM_SETTEXT} 0 "STR:$INSTDIR"
    ${EndIf}
  FunctionEnd

  Function InstallOptionsPageLeave
    ${NSD_GetText} $InstallDirectoryField $INSTDIR
    ${If} $INSTDIR == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "请选择安装位置。"
      Abort
    ${EndIf}

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

  !macro customFinishPage
    !define MUI_FINISHPAGE_TITLE "安装完成"
    !define MUI_FINISHPAGE_TEXT "应用已成功安装。"
    !define MUI_FINISHPAGE_BUTTON "完成"
    !insertmacro MUI_PAGE_FINISH
  !macroend
!endif
