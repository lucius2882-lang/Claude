#!/usr/bin/env python3
import http.server
import cgi
import os
import shutil

UPLOAD_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_PAGE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Logos</title>
  <style>
    body { font-family: sans-serif; max-width: 500px; margin: 3rem auto; padding: 1rem; background: #111; color: #fff; }
    h2 { margin-bottom: 2rem; }
    label { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; color: #aaa; }
    select, input[type=file] { width: 100%; padding: 0.6rem; margin-bottom: 1.2rem; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; font-size: 1rem; }
    button { background: #4a90d9; color: #fff; border: none; padding: 0.8rem 2rem; font-size: 1rem; border-radius: 4px; cursor: pointer; width: 100%; }
    .msg { margin-top: 1rem; padding: 0.8rem; border-radius: 4px; }
    .ok { background: #1a4a1a; color: #6f6; }
    .err { background: #4a1a1a; color: #f66; }
  </style>
</head>
<body>
  <h2>Upload Logo</h2>
  <form method="POST" enctype="multipart/form-data">
    <label>Which logo is this?</label>
    <select name="name">
      <option value="logo-happier">Happier (Maître D')</option>
      <option value="logo-lockstock">Lock Stock Bar & Grill (Manager)</option>
      <option value="logo-kepler">Kepler (Marketing Analyst)</option>
      <option value="logo-nbi">New Blue Interactive (Digital Strategy)</option>
    </select>
    <label>Select image file</label>
    <input type="file" name="file" accept="image/*" required>
    <button type="submit">Upload</button>
  </form>
  {msg}
</body>
</html>"""

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/upload':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(UPLOAD_PAGE.replace('{msg}', '').encode())
        else:
            # Serve static files
            path = os.path.join(UPLOAD_DIR, self.path.lstrip('/'))
            if os.path.isfile(path):
                self.send_response(200)
                if path.endswith('.html'): ct = 'text/html'
                elif path.endswith('.css'): ct = 'text/css'
                elif path.endswith('.js'): ct = 'application/javascript'
                elif path.endswith('.png'): ct = 'image/png'
                elif path.endswith('.jpg') or path.endswith('.jpeg'): ct = 'image/jpeg'
                elif path.endswith('.webp'): ct = 'image/webp'
                else: ct = 'application/octet-stream'
                self.send_header('Content-Type', ct)
                self.end_headers()
                with open(path, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
            else:
                self.send_response(404)
                self.end_headers()

    def do_POST(self):
        form = cgi.FieldStorage(fp=self.rfile, headers=self.headers,
                                environ={'REQUEST_METHOD': 'POST',
                                         'CONTENT_TYPE': self.headers['Content-Type']})
        name_field = form.getvalue('name')
        file_field = form['file']
        msg = ''
        if file_field.filename:
            ext = os.path.splitext(file_field.filename)[1].lower() or '.png'
            save_path = os.path.join(UPLOAD_DIR, name_field + ext)
            with open(save_path, 'wb') as f:
                f.write(file_field.file.read())
            msg = f'<div class="msg ok">Saved as {name_field + ext}</div>'
        else:
            msg = '<div class="msg err">No file received.</div>'

        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(UPLOAD_PAGE.replace('{msg}', msg).encode())

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', 8080), Handler)
    print('Server running on http://0.0.0.0:8080')
    server.serve_forever()
