#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🔨 Rotam macOS Masaüstü Uygulaması Derleniyor..."

# Compile the Objective-C WebKit wrapper
clang -fobjc-arc -framework Cocoa -framework WebKit -framework CoreLocation main.m -o RotamAppBinary

# Create the standard macOS app bundle structure
APP_DIR="Rotam.app"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Move binary
mv RotamAppBinary "$APP_DIR/Contents/MacOS/Rotam"

# Create Info.plist for Geolocation permissions and ATS
cat << 'PLIST' > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Rotam</string>
    <key>CFBundleIdentifier</key>
    <string>com.rotam.desktop</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleExecutable</key>
    <string>Rotam</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Rota başlangıcını belirlemek için konumunuza erişilmesi gerekiyor.</string>
    <key>NSLocationUsageDescription</key>
    <string>Rota başlangıcını belirlemek için konumunuza erişilmesi gerekiyor.</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
PLIST

# Copy Web Assets and Python Server to the bundle
cp index.html app.js styles.css places_data.js server.py database.py "$APP_DIR/Contents/Resources/"

echo "🔐 Uygulama Mac Güvenlik Sistemleri İçin İmzalanıyor..."
codesign -f -s - --deep "$APP_DIR"

echo "✅ Başarılı! Masaüstü uygulaması hazır: $DIR/Rotam.app"
echo "👉 Başlatmak için: open Rotam.app"
