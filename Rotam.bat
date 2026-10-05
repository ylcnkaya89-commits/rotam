@echo off
chcp 65001 >nul
title Rotam - Motosiklet & Araç Gezi Planlayıcı
cd /d "%~dp0"
start wscript.exe "%~dp0rotam_launcher.vbs"
