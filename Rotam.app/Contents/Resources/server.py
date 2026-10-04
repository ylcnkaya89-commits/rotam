#!/usr/bin/env python3
"""
Rotam - Yerel Web Sunucusu ve REST API Motoru
SQLite Veritabanı ile Rotalar, Mola Noktaları ve Garaj Yönetimi
"""
import http.server
import socketserver
import webbrowser
import os
import sys
import json
import urllib.parse
import mimetypes
from database import Database

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
db = Database()

class RotamHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # REST API Endpoints
        if path.startswith('/api/'):
            self.handle_api_get(path, query)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body) if body else {}
            except Exception:
                data = {}

            self.handle_api_post(path, data)
            return

        self.send_error(404, "Endpoint Not Found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            self.handle_api_delete(path)
            return

        self.send_error(404, "Endpoint Not Found")

    # API GET HANDLERS
    def handle_api_get(self, path, query):
        if path == '/api/routes':
            routes = db.get_all_routes()
            # Parse JSON strings inside routes for clean API output
            for r in routes:
                try:
                    r['waypoints'] = json.loads(r['waypoints_json'])
                except Exception:
                    r['waypoints'] = []
            self.send_json_response(routes)
        elif path == '/api/places':
            category = query.get('category', [None])[0]
            places = db.get_all_places(category)
            self.send_json_response(places)
        elif path == '/api/vehicles':
            vehicles = db.get_all_vehicles()
            self.send_json_response(vehicles)
        elif path == '/api/trips':
            trips = db.get_all_trips()
            self.send_json_response(trips)
        else:
            self.send_error(404, "API route not found")

    # API POST HANDLERS
    def handle_api_post(self, path, data):
        if path == '/api/routes':
            route_id = db.save_route(data)
            self.send_json_response({'success': True, 'id': route_id, 'message': 'Rota kaydedildi.'})
        elif path == '/api/places':
            place_id = db.add_place(
                name=data.get('name'),
                category=data.get('category', 'viewpoint'),
                lat=data.get('lat'),
                lon=data.get('lon'),
                description=data.get('description', ''),
                rating=data.get('rating', 5)
            )
            self.send_json_response({'success': True, 'id': place_id, 'message': 'Mola noktası eklendi.'})
        elif path.startswith('/api/routes/') and path.endswith('/toggle-favorite'):
            route_id = int(path.split('/')[3])
            db.toggle_favorite_route(route_id)
            self.send_json_response({'success': True})
        elif path == '/api/vehicles':
            v_id = db.add_vehicle(
                name=data.get('name'),
                vehicle_type=data.get('type', 'motorcycle'),
                fuel_consumption=data.get('fuel_consumption', 5.0),
                tank_capacity=data.get('tank_capacity', 15.0)
            )
            self.send_json_response({'success': True, 'id': v_id})
        else:
            self.send_error(404, "API endpoint not found")

    # API DELETE HANDLERS
    def handle_api_delete(self, path):
        parts = path.strip('/').split('/')
        if len(parts) == 3:
            resource = parts[1]
            res_id = int(parts[2])

            if resource == 'routes':
                success = db.delete_route(res_id)
                self.send_json_response({'success': success})
                return
            elif resource == 'places':
                success = db.delete_place(res_id)
                self.send_json_response({'success': success})
                return

        self.send_error(400, "Invalid DELETE request")

    def send_json_response(self, data, status=200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def main():
    global PORT
    socketserver.TCPServer.allow_reuse_address = True
    for attempt in range(10):
        try:
            with socketserver.TCPServer(("127.0.0.1", PORT), RotamHandler) as httpd:
                url = f"http://localhost:{PORT}"
                print("\n" + "=" * 60)
                print(" 🏍️  Rotam - Sunucu & SQLite API Aktif!")
                print(f" 🌐  Arayüz: {url}")
                print(f" 💾  Veritabanı: {os.path.join(DIRECTORY, 'rotam.db')}")
                print(" 🛑  Durdurmak için: Ctrl+C")
                print("=" * 60 + "\n")
                
                try:
                    import subprocess
                    subprocess.Popen(['open', url], stderr=subprocess.DEVNULL)
                except Exception:
                    pass

                httpd.serve_forever()
        except OSError:
            PORT += 1

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSunucu kapatıldı. İyi yolculuklar! 🏍️💨")
