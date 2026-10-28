"""Runner script for the Python FastAPI server.

Usage:
    python run_server.py [--port 8000] [--host 0.0.0.0]
"""

import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description="Run CycloneSense AI FastAPI Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host IP to bind (0.0.0.0 allows all devices on local network)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    try:
        import uvicorn
    except ImportError:
        print("[!] Uvicorn is required to run the Python server.")
        print("    Install dependencies via: pip install -r requirements.txt")
        sys.exit(1)

    print(f"[*] Starting CycloneSense AI Python Engine on http://{args.host}:{args.port}")
    print(f"[*] Swagger Documentation: http://{args.host}:{args.port}/docs")
    print("[*] Accessible from other devices on your local Wi-Fi / LAN via your IP address.")
    uvicorn.run("app.main:app", host=args.host, port=args.port, reload=args.reload)

if __name__ == "__main__":
    main()
