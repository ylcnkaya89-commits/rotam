#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🔨 Rotam macOS Masaüstü Uygulaması Derleniyor..."

# Compile native binary
clang -O2 -fobjc-arc -framework Cocoa -framework WebKit main.m -o RotamAppBinary

# Prepare .app bundle
mkdir -p Rotam.app/Contents/MacOS Rotam.app/Contents/Resources
cp RotamAppBinary Rotam.app/Contents/MacOS/Rotam
cp index.html app.js styles.css Rotam.app/Contents/Resources/
chmod +x Rotam.app/Contents/MacOS/Rotam

echo "✅ Başarılı! Masaüstü uygulaması hazır: $DIR/Rotam.app"
echo "👉 Başlatmak için: open Rotam.app veya ./Rotam.app/Contents/MacOS/Rotam"
