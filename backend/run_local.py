"""
Launches all JustAteIt backend microservices and the API gateway locally.
- User Service: 8001
- Catalog Service: 8002
- Media Service: 8003
- API Gateway: 8000 (main entry point)
"""
import os
import sys
import subprocess
import time

SERVICES = [
    ("User Service", "services.user_service.main:app", 8001),
    ("Catalog Service", "services.catalog_service.main:app", 8002),
    ("Media Service", "services.media_service.main:app", 8003),
    ("API Gateway", "api_gateway.main:app", 8000),
]

def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)

    processes = []
    print("\n" + "=" * 60)
    print("🚀 Starting JustAteIt Backend Services...")
    print("=" * 60)

    try:
        for name, app_target, port in SERVICES:
            cmd = [
                sys.executable, "-m", "uvicorn",
                app_target,
                "--host", "0.0.0.0",
                "--port", str(port),
                "--log-level", "warning"
            ]
            p = subprocess.Popen(cmd, cwd=backend_dir)
            processes.append((name, p, port))
            print(f"  ✓ {name:<18} running on port {port}")
            time.sleep(0.5)

        print("=" * 60)
        print("🎉 All services live!")
        print("  • Localhost: http://localhost:8000")
        print("  • LAN / Phone: http://192.168.0.174:8000")
        print("Press Ctrl+C to stop all services.")
        print("=" * 60 + "\n")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping all services...")
    finally:
        for name, p, _ in processes:
            p.terminate()
            p.wait()
        print("All services stopped.")

if __name__ == "__main__":
    main()

