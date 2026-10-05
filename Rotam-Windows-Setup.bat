@echo off
chcp 65001 >nul
cls
echo ===================================================================
echo     🏍️  ROTAM - Motosiklet & Araç Gezi Planlayıcı
echo     Windows Otomatik Kurulum Sihirbazı (Setup)
echo ===================================================================
echo.
echo  Rotam bilgisayarınıza kuruluyor, lütfen bekleyin...
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\Rotam"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "STARTMENU_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Rotam"

echo  [1/4] Kurulum klasörü hazırlanıyor: "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%STARTMENU_DIR%" mkdir "%STARTMENU_DIR%"

echo  [2/4] Uygulama dosyaları kopyalanıyor...
copy /Y "%~dp0index.html" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0app.js" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0styles.css" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0places_data.js" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0rotam_logo.png" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0rotam.ico" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0rotam_launcher.vbs" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Rotam.bat" "%INSTALL_DIR%\" >nul
if exist "%~dp0database.py" copy /Y "%~dp0database.py" "%INSTALL_DIR%\" >nul
if exist "%~dp0server.py" copy /Y "%~dp0server.py" "%INSTALL_DIR%\" >nul
if exist "%~dp0rotam.db" copy /Y "%~dp0rotam.db" "%INSTALL_DIR%\" >nul

echo  [3/4] Masaüstü ve Başlat Menüsü kısayolları oluşturuluyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$sDesktop = $ws.CreateShortcut('%DESKTOP_DIR%\Rotam.lnk'); " ^
  "$sDesktop.TargetPath = 'wscript.exe'; " ^
  "$sDesktop.Arguments = '\"%INSTALL_DIR%\rotam_launcher.vbs\"'; " ^
  "$sDesktop.WorkingDirectory = '%INSTALL_DIR%'; " ^
  "$sDesktop.IconLocation = '%INSTALL_DIR%\rotam.ico,0'; " ^
  "$sDesktop.Description = 'Rotam - Motosiklet & Araç Rota Planlayıcı'; " ^
  "$sDesktop.Save(); " ^
  "$sStart = $ws.CreateShortcut('%STARTMENU_DIR%\Rotam.lnk'); " ^
  "$sStart.TargetPath = 'wscript.exe'; " ^
  "$sStart.Arguments = '\"%INSTALL_DIR%\rotam_launcher.vbs\"'; " ^
  "$sStart.WorkingDirectory = '%INSTALL_DIR%'; " ^
  "$sStart.IconLocation = '%INSTALL_DIR%\rotam.ico,0'; " ^
  "$sStart.Description = 'Rotam - Motosiklet & Araç Rota Planlayıcı'; " ^
  "$sStart.Save(); "

echo  [4/4] Kaldırıcı (Uninstaller) hazırlanıyor...
(
echo @echo off
echo chcp 65001 ^>nul
echo echo Rotam bilgisayarınızdan kaldırılıyor...
echo del /f /q "%DESKTOP_DIR%\Rotam.lnk" 2^>nul
echo rmdir /s /q "%STARTMENU_DIR%" 2^>nul
echo timeout /t 1 ^>nul
echo rmdir /s /q "%INSTALL_DIR%"
echo echo Rotam başarıyla kaldırıldı.
echo pause
) > "%INSTALL_DIR%\Uninstall.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$sUn = $ws.CreateShortcut('%STARTMENU_DIR%\Rotam Kaldır.lnk'); " ^
  "$sUn.TargetPath = '%INSTALL_DIR%\Uninstall.bat'; " ^
  "$sUn.WorkingDirectory = '%INSTALL_DIR%'; " ^
  "$sUn.Save(); "

echo.
echo ===================================================================
echo     ✅ TEBRİKLER! ROTAM BAŞARIYLA KURULDU!
echo ===================================================================
echo.
echo  Masaüstünüze özel logolu "Rotam" kısayolu eklendi.
echo.
set /p START_NOW="Rotam şimdi başlatılsın mı? (E/H) [Varsayılan: E]: "
if /i "%START_NOW%"=="H" goto end
if /i "%START_NOW%"=="h" goto end

start wscript.exe "%INSTALL_DIR%\rotam_launcher.vbs"

:end
echo.
echo İyi sürüşler ve keyifli virajlar!
timeout /t 3 >nul
