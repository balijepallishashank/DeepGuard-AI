import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from safetensors.torch import load_file

TARGET_DIR = os.path.expanduser(r"~/.cache/huggingface/hub/models--MelodyMachine--Deepfake-audio-detection-V2/snapshots/de3cde5a29c449bb5268814e421b46bf6ebdcd72")
DEST_FILE = os.path.join(TARGET_DIR, "model.safetensors")
MODEL_URL = "https://huggingface.co/MelodyMachine/Deepfake-audio-detection-V2/resolve/main/model.safetensors"
EXPECTED_SIZE = 378302360
NUM_WORKERS = 8


def get_final_url_and_size(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        final_url = resp.geturl()
        content_length = int(resp.headers.get("Content-Length", 0))
        return final_url, content_length


def download_chunk(worker_id: int, url: str, start: int, end: int, part_path: str):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Range": f"bytes={start}-{end}"
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp, open(part_path, "wb") as f:
        bytes_copied = 0
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            f.write(chunk)
            bytes_copied += len(chunk)
    print(f"Worker {worker_id} completed: {bytes_copied / (1024*1024):.2f} MB")
    return part_path


def main():
    os.makedirs(TARGET_DIR, exist_ok=True)

    if os.path.exists(DEST_FILE) and os.path.getsize(DEST_FILE) == EXPECTED_SIZE:
        try:
            t = load_file(DEST_FILE)
            print(f"model.safetensors already verified ({len(t)} tensor keys, {os.path.getsize(DEST_FILE)} bytes).")
            return True
        except Exception as e:
            print(f"File exists but verification failed: {e}. Redownloading...")
            os.remove(DEST_FILE)

    print("Resolving final CDN URL and total size...")
    final_url, total_size = get_final_url_and_size(MODEL_URL)
    print(f"Total size: {total_size} bytes ({total_size / (1024*1024):.2f} MB)")
    print(f"Target file: {DEST_FILE}")

    chunk_size = total_size // NUM_WORKERS
    tasks = []
    part_files = []

    start_time = time.perf_counter()

    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        for i in range(NUM_WORKERS):
            start = i * chunk_size
            end = total_size - 1 if i == NUM_WORKERS - 1 else (start + chunk_size - 1)
            part_path = DEST_FILE + f".part{i}"
            part_files.append(part_path)
            tasks.append(executor.submit(download_chunk, i, final_url, start, end, part_path))

        for task in tasks:
            task.result()

    print("\nMerging chunks into model.safetensors...")
    with open(DEST_FILE, "wb") as out_f:
        for p in part_files:
            with open(p, "rb") as in_f:
                while True:
                    buf = in_f.read(1048576)
                    if not buf:
                        break
                    out_f.write(buf)
            if os.path.exists(p):
                os.remove(p)

    final_size = os.path.getsize(DEST_FILE)
    elapsed = time.perf_counter() - start_time
    print(f"SUCCESS: Assembled {DEST_FILE}")
    print(f"Final size: {final_size} bytes in {elapsed:.1f}s ({final_size / (1024*1024) / elapsed:.2f} MB/s)")

    # Verify tensor integrity
    t = load_file(DEST_FILE)
    print(f"Verified safetensors integrity: {len(t)} keys loaded successfully.")
    return True


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
