!define MUI_BGCOLOR "FFFFFF"
!define MUI_TEXTCOLOR "172437"

!macro customInstallMode
  ${If} ${isUpdated}
    ${If} $hasPerMachineInstallation == "1"
      StrCpy $isForceMachineInstall "1"
    ${Else}
      StrCpy $isForceCurrentInstall "1"
    ${EndIf}
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW mksInstallProgress
  Function mksInstallProgress
    ${If} ${isUpdated}
      !insertmacro MUI_HEADER_TEXT "MKS Dashboard bijwerken" "De nieuwe versie wordt geinstalleerd. De app opent daarna automatisch."
      GetDlgItem $0 $HWNDPARENT 1037
      SetCtlColors $0 "D52D36" "FFFFFF"
      FindWindow $0 "#32770" "" $HWNDPARENT
      GetDlgItem $0 $0 1004
      System::Call 'uxtheme::SetWindowTheme(p r0, w "", w "")'
      SendMessage $0 0x0409 0 0x00362DD5
      SetAutoClose true
      GetDlgItem $0 $HWNDPARENT 1
      EnableWindow $0 0
      GetDlgItem $0 $HWNDPARENT 2
      EnableWindow $0 0
      GetDlgItem $0 $HWNDPARENT 3
      EnableWindow $0 0
    ${EndIf}
  FunctionEnd
!macroend

!macro customFinishPage
  Function StartApp
    ${If} ${isUpdated}
      StrCpy $1 "--updated"
    ${Else}
      StrCpy $1 ""
    ${EndIf}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  Function mksFinishPre
    ${If} ${isUpdated}
      ${If} ${isForceRun}
        Call StartApp
      ${EndIf}
      Abort
    ${EndIf}
  FunctionEnd

  !define MUI_PAGE_CUSTOMFUNCTION_PRE mksFinishPre
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !insertmacro MUI_PAGE_FINISH
!macroend
