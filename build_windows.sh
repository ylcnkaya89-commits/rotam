#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "📦 Rotam Windows Kurulum Paketi Hazırlanıyor..."

DIST_DIR="Rotam-Windows-Kurulum"
ZIP_NAME="Rotam-Windows-Kurulum.zip"

rm -rf "$DIST_DIR" "$ZIP_NAME"
mkdir -p "$DIST_DIR"

# Copy essential files
cp index.html "$DIST_DIR/"
cp app.js "$DIST_DIR/"
cp styles.css "$DIST_DIR/"
cp places_data.js "$DIST_DIR/"
cp rotam_logo.png "$DIST_DIR/"
cp rotam.ico "$DIST_DIR/"
cp manifest.json "$DIST_DIR/"
cp sw.js "$DIST_DIR/"
cp rotam_launcher.vbs "$DIST_DIR/"
cp Rotam.bat "$DIST_DIR/"
cp Rotam-Windows-Setup.bat "$DIST_DIR/"
cp Rotam_Setup.iss "$DIST_DIR/"
cp database.py "$DIST_DIR/"
cp server.py "$DIST_DIR/"
cp rotam.db "$DIST_DIR/"

# Create User Guide / Readme
cat << 'README' > "$DIST_DIR/KURULUM_KILAVUZU.txt"
======================================================================
  🏍️  ROTAM - Motosiklet & Araç Rota Planlayıcı
  Windows Kurulum ve Kullanım Kılavuzu
======================================================================

YÖNTEM 1: OTOMATİK KURULUM (ÖNERİLEN)
--------------------------------------
1. Bu klasörün içindeki "Rotam-Windows-Setup.bat" dosyasına çift tıklayın.
2. Kurulum sihirbazı otomatik olarak:
   - Rotam'ı bilgisayarınıza yerleştirecektir.
   - Masaüstünüze özel logolu "Rotam" kısayolu oluşturacaktır.
   - Başlat Menünüze "Rotam" ve "Rotam Kaldır" kısayollarını ekleyecektir.
3. Kurulum tamamlandığında Masaüstündeki Rotam simgesine çift tıklayarak
   uygulamayı tam ekran masaüstü penceresi olarak başlatabilirsiniz!

YÖNTEM 2: KURULUMSUZ (PORTABLE) ÇALIŞTIRMA
-------------------------------------------
Herhangi bir kurulum yapmadan doğrudan çalıştırmak için klasör içindeki
"Rotam.bat" dosyasına çift tıklamanız yeterlidir.

YÖNTEM 3: TEK TIKLA .EXE SETUP DERLEME (GELİŞTİRİCİLER İÇİN)
------------------------------------------------------------
Klasör içindeki "Rotam_Setup.iss" dosyasını ücretsiz Inno Setup programı
ile açıp "Compile" (F9) butonuna basarak tek bir "Rotam_Setup.exe" 
dosyası üretebilirsiniz.

Gereksinimler:
- Windows 10 veya Windows 11 (64-bit / 32-bit)
- Herhangi bir ek program yüklemenize gerek yoktur.

İyi sürüşler ve keyifli virajlar!
======================================================================
README

# Package into ZIP
zip -r "$ZIP_NAME" "$DIST_DIR" > /dev/null

echo "✅ Başarılı! Windows kurulum paketi hazırlandı:"
echo "📁 Klasör: $DIR/$DIST_DIR"
echo "📦 ZIP Arşivi: $DIR/$ZIP_NAME"
ls -lh "$ZIP_NAME"
