#!/bin/bash
# Rotam macOS Desktop Application Launcher
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 1. Start SQLite REST API & Web Server if not already active
if ! python3 -c "import socket; s = socket.socket(); s.settimeout(0.3); s.connect(('127.0.0.1', 8080)); s.close()" 2>/dev/null; then
    /usr/bin/python3 "$DIR/server.py" > /tmp/rotam_server.log 2>&1 &
    sleep 0.8
fi

# 2. Launch in Standalone Frameless Desktop Window
if [ -d "/Applications/Google Chrome.app" ]; then
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --app="http://localhost:8080" \
        --user-data-dir="/tmp/rotam_desktop_profile" \
        --window-size=1360,880 \
        --disable-infobars &
elif [ -d "/Applications/Brave Browser.app" ]; then
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
        --app="http://localhost:8080" \
        --user-data-dir="/tmp/rotam_desktop_profile" \
        --window-size=1360,880 &
else
    open "http://localhost:8080"
fi
