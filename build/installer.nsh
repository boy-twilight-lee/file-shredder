!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "MUI2.nsh"
!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER
Var InstallDirectoryField
Var BrowseDirectoryButton
Var DesktopShortcutCheckbox
Var StartupCheckbox
Var DesktopShortcutRequested
Var StartupRequested
Var PreviousInstallDirectory
Var CanCleanupPreviousInstall

!macro customInit
  ${GetParameters} $R0
  StrCpy $DesktopShortcutRequested ""
  StrCpy $StartupRequested ""
  StrCpy $PreviousInstallDirectory ""
  StrCpy $CanCleanupPreviousInstall "0"
  ${GetOptions} $R0 "/desktop-shortcut=" $DesktopShortcutRequested
  ${GetOptions} $R0 "/startup=" $StartupRequested

  ReadRegStr $PreviousInstallDirectory HKCU "Software\${APP_GUID}" InstallLocation
  ${If} $PreviousInstallDirectory != ""
    ${GetRoot} "$PreviousInstallDirectory" $0
    ${If} $PreviousInstallDirectory != $0
      ${If} ${FileExists} "$PreviousInstallDirectory\.file-shredder-install"
        StrCpy $CanCleanupPreviousInstall "1"
      ${Else}
        ${GetFileName} "$PreviousInstallDirectory" $1
        ${If} $1 == "${APP_FILENAME}"
        ${OrIf} $1 == "${PRODUCT_FILENAME}"
          ${If} ${FileExists} "$PreviousInstallDirectory\${PRODUCT_FILENAME}.exe"
          ${AndIf} ${FileExists} "$PreviousInstallDirectory\Uninstall ${PRODUCT_FILENAME}.exe"
            StrCpy $CanCleanupPreviousInstall "1"
          ${EndIf}
        ${EndIf}
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customPageAfterChangeDir
  Page custom InstallPageCreate InstallPageLeave
!macroend

!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "安装完成"
  !define MUI_FINISHPAGE_TITLE_3LINES
  !define MUI_FINISHPAGE_TEXT "文件粉碎精灵已经安装完成。现在可以开始使用桌宠进行文件清理。"
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "立即运行文件粉碎精灵"
  !define MUI_FINISHPAGE_RUN_FUNCTION "LaunchInstalledApp"
  !define MUI_FINISHPAGE_BUTTON "完成"
  !insertmacro MUI_PAGE_FINISH
!macroend

Function SelectInstallDirectory
  nsDialogs::SelectFolderDialog "选择安装位置" "$INSTDIR"
  Pop $0
  ${If} $0 != error
    StrCpy $INSTDIR "$0"
    SendMessage $InstallDirectoryField ${WM_SETTEXT} 0 "STR:$INSTDIR"
  ${EndIf}
FunctionEnd

Function InstallPageCreate
  !insertmacro MUI_HEADER_TEXT "欢迎使用文件粉碎精灵" "安全清理文件，让桌面保持轻盈整洁"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 12u "安装位置"
  Pop $0
  CreateFont $1 "Microsoft YaHei UI" 10 700
  SendMessage $0 ${WM_SETFONT} $1 0
  SetCtlColors $0 "183B64" transparent

  ${NSD_CreateDirRequest} 0 16u 78% 15u "$INSTDIR"
  Pop $InstallDirectoryField
  ${NSD_CreateButton} 81% 15u 19% 17u "浏览..."
  Pop $BrowseDirectoryButton
  ${NSD_OnClick} $BrowseDirectoryButton SelectInstallDirectory

  ${NSD_CreateLabel} 0 39u 100% 12u "快捷选项"
  Pop $0
  SendMessage $0 ${WM_SETFONT} $1 0
  SetCtlColors $0 "183B64" transparent

  ${NSD_CreateCheckbox} 0 55u 100% 12u "创建桌面快捷方式"
  Pop $DesktopShortcutCheckbox
  ${NSD_Check} $DesktopShortcutCheckbox

  ${NSD_CreateCheckbox} 0 71u 100% 12u "开机时自动启动文件粉碎精灵"
  Pop $StartupCheckbox

  GetDlgItem $0 $HWNDPARENT 1028
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1256
  ShowWindow $0 ${SW_HIDE}

  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:立即安装"
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}

  nsDialogs::Show
FunctionEnd

Function InstallPageLeave
  ${NSD_GetText} $InstallDirectoryField $INSTDIR
  ${If} $INSTDIR == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "请选择安装位置。"
    Abort
  ${EndIf}

  ${GetRoot} "$INSTDIR" $0
  ${If} $0 == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "安装位置无效，请重新选择。"
    Abort
  ${EndIf}

  ${If} $PreviousInstallDirectory != ""
  ${AndIf} $PreviousInstallDirectory != $INSTDIR
    StrCpy $2 "$PreviousInstallDirectory\"
    StrLen $0 $2
    StrCpy $1 "$INSTDIR\" $0
    ${If} $1 == $2
      MessageBox MB_OK|MB_ICONEXCLAMATION "新的安装位置不能位于旧安装目录内部，请重新选择。"
      Abort
    ${EndIf}
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

Function LaunchInstalledApp
  ExecShell "open" "$INSTDIR\${PRODUCT_FILENAME}.exe"
FunctionEnd

!macro customInstall
  ${If} $CanCleanupPreviousInstall == "1"
  ${AndIf} $PreviousInstallDirectory != ""
  ${AndIf} $PreviousInstallDirectory != $INSTDIR
    RMDir /r "$PreviousInstallDirectory"
    ${If} ${FileExists} "$PreviousInstallDirectory\*.*"
      DetailPrint "旧安装目录清理失败：$PreviousInstallDirectory"
    ${Else}
      DetailPrint "旧安装目录已清理：$PreviousInstallDirectory"
    ${EndIf}
  ${EndIf}

  ClearErrors
  FileOpen $0 "$INSTDIR\.file-shredder-install" w
  ${IfNot} ${Errors}
    FileWrite $0 "${APP_ID}"
    FileClose $0
  ${EndIf}

  ${If} $DesktopShortcutRequested == "0"
    Delete "$newDesktopLink"
  ${EndIf}

  ${If} $StartupRequested != ""
    ExecWait '"$appExe" --configure-startup=$StartupRequested' $0
    ${If} $0 != 0
      DetailPrint "开机启动设置同步失败，错误码：$0"
    ${EndIf}
  ${EndIf}
!macroend
!endif
