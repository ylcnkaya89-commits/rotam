; =====================================================================
; Rotam Windows Inno Setup 6 Script
; Bu dosya Inno Setup (ücretsiz) ile tek tıkla "Rotam_Setup.exe" üretir.
; İndirme adresi: https://jrsoftware.org/isdl.php
; =====================================================================

#define MyAppName "Rotam"
#define MyAppVersion "1.0"
#define MyAppPublisher "Rotam Moto Adventures"
#define MyAppURL "https://github.com/rotam"

[Setup]
AppId={{D41A28F0-388F-4D2A-94B6-953FAEF46B92}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=Rotam_Setup
SetupIconFile=rotam.ico
UninstallDisplayIcon={app}\rotam.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "app.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "styles.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "places_data.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "rotam_logo.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "rotam.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "rotam_launcher.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "Rotam.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "database.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "server.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "rotam.db"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\rotam_launcher.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\rotam.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\rotam_launcher.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\rotam.ico"; Tasks: desktopicon

[Run]
Filename: "wscript.exe"; Parameters: """{app}\rotam_launcher.vbs"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
