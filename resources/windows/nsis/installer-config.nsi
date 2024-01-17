Name "##APP_NAME##"
Outfile "##APP_ID##-installer.exe"
RequestExecutionLevel admin
Unicode True
InstallDir "$PROGRAMFILES64\##APP_NAME##"
InstallDirRegKey HKLM "Software\##APP_NAME##" "Install_Dir"
Icon "icon.ico"

Page components
Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

Section "Installation"
  SectionIn RO
  SetOutPath $INSTDIR
  File /r /x installer-config.nsi *

  WriteRegStr HKLM "SOFTWARE\##APP_NAME##" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "DisplayName" "##APP_NAME##"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "Publisher" "E-IS"
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "Comments" ""
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "DisplayIcon" ""
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "DisplayName" ""
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "DisplayVersion" ""
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "HelpLink" ""
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "UrlInfoAbout" ""
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "UrlUpdateInfo" ""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##" "NoRepair" 1
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Raccourcis dans le menu"
  CreateDirectory "$SMPROGRAMS\##APP_NAME##"
  CreateShortcut "$SMPROGRAMS\##APP_NAME##\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$SMPROGRAMS\##APP_NAME##\##APP_NAME##.lnk" "$INSTDIR\##APP_ID##.exe"
SectionEnd

; Section "Raccourcis sur le bureau"
;   CreateShortcut "$USERDESKTOP\##APP_NAME##.lnk" "$INSTDIR\##APP_ID##.exe"
; SectionEnd

Section "Uninstall"
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\##APP_NAME##"
  DeleteRegKey HKLM "SOFTWARE\##APP_NAME##"

  RMDir /r $INSTDIR
  RMDir /r "$SMPROGRAMS\##APP_NAME##\"
  Delete "$USERDESKTOP\##APP_NAME##.lnk"
SectionEnd
