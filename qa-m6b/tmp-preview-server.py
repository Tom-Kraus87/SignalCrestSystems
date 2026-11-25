#!/usr/bin/env python3
"""Detached static preview server: bind 127.0.0.1:0, write port, serve forever."""
from __future__ import annotations

import http.server
import os
import socketserver
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
PORT_FILE = Path(__file__).resolve().parent / "preview-port.txt"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def log_message(self, format, *args):  # noqa: A003
        pass


os.chdir(DIST)

with socketserver.TCPServer(("127.0.0.1", 0), Handler) as httpd:
    httpd.allow_reuse_address = True
    port = httpd.server_address[1]
    PORT_FILE.write_text(str(port), encoding="utf-8")
    httpd.serve_forever()
