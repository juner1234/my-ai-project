import http.server, socketserver, webbrowser, os
from pathlib import Path
PORT=8000
ROOT=Path(__file__).resolve().parent
os.chdir(ROOT)
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args): pass
with socketserver.TCPServer(("127.0.0.1",PORT),Handler) as httpd:
    url=f"http://127.0.0.1:{PORT}/"
    print("花花小镇已启动：",url)
    webbrowser.open(url)
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass
