#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Rotam Rota Planlayıcı Başlatılıyor..."

# 1. Start SQLite REST API & Server
python3 server.py
