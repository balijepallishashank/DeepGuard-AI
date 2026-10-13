import os
import sys
import time
import urllib.request
import urllib.error
from safetensors.torch import load_file

TARGET_DIR = os.path.expanduser(r"~/.cache/huggingface/hub/models--king1oo1--deepfake-model/snapshots/d0bb73205003d6b4c5a312d071e12304ef819111")
DEST_FILE = os.path.join(TARGET_DIR, "model.safetensors")
MODEL_URL = "https://huggingface.co/king1oo1/deepfake-model/resolve/main/model.safetensors"
EXPECTED_SIZE = 371567992


def download_with_resume():
    os.makedirs(TARGET_DIR, exist_ok=True)

    if os.path.exists(DEST_FILE):
        cur_sz = os.path.getsize(DEST_FILE)
        if cur_sz == EXPECTED_SIZE:
            try:
                t = load_file(DEST_FILE)
                print(f"Verified existing weights ({len(t)} keys, {cur_sz} bytes).")
                return True
            except Exception:
                print(f"Existing file of {cur_sz} bytes is corrupt. Removing and redownloading...")
                os.remove(DEST_FILE)
        else:
            print(f"Existing file has incomplete size ({cur_sz} bytes != {EXPECTED_SIZE}). Removing...")
            os.remove(DEST_FILE)

    print(f"Starting robust download of {DEST_FILE} (Target: {EXPECTED_SIZE / (1024*1024):.2f} MB)...")

    # Resolve initial redirect
    req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        final_url = resp.geturl()
    print(f"Resolved CDN endpoint: {final_url[:80]}...")

    downloaded = 0
    if os.path.exists(DEST_FILE):
        downloaded = os.path.getsize(DEST_FILE)

    max_retries = 30
    retry_count = 0

    while downloaded < EXPECTED_SIZE and retry_count < max_retries:
        req_headers = {"User-Agent": "Mozilla/5.0"}
        if downloaded > 0:
            req_headers["Range"] = f"bytes={downloaded}-{EXPECTED_SIZE - 1}"
            print(f"Resuming from byte {downloaded} ({downloaded / (1024*1024):.2f} MB)...", flush=True)

        req = urllib.request.Request(final_url, headers=req_headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(DEST_FILE, "ab" if downloaded > 0 else "wb") as f:
                    while downloaded < EXPECTED_SIZE:
                        chunk = resp.read(131072)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if downloaded % (5 * 1024 * 1024) < 131072:
                            pct = (downloaded / EXPECTED_SIZE) * 100
                            print(f"Progress: {downloaded / (1024*1024):.1f} MB / {EXPECTED_SIZE / (1024*1024):.1f} MB ({pct:.1f}%)", flush=True)

        except (urllib.error.URLError, TimeoutError, Exception) as e:
            retry_count += 1
            print(f"Connection event ({e}). Retrying in 2 seconds ({retry_count}/{max_retries})...", flush=True)
            time.sleep(2)
            if os.path.exists(DEST_FILE):
                downloaded = os.path.getsize(DEST_FILE)

    final_size = os.path.getsize(DEST_FILE) if os.path.exists(DEST_FILE) else 0
    print(f"\nDownload finished. Final size: {final_size} bytes.")

    if final_size != EXPECTED_SIZE:
        print(f"ERROR: Size mismatch ({final_size} != {EXPECTED_SIZE}).")
        return False

    print("Verifying safetensors header and tensor integrity...")
    try:
        t = load_file(DEST_FILE)
        print(f"SUCCESS: Loaded {len(t)} tensor keys cleanly without errors!")
        return True
    except Exception as e:
        print(f"ERROR: safetensors verification failed: {e}")
        return False


if __name__ == "__main__":
    ok = download_with_resume()
    sys.exit(0 if ok else 1)
