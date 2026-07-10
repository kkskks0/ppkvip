import os
import requests
import base64
import json
import sys

# 从环境变量读取 API Key，不再硬编码
API_KEY = os.environ.get("MIMO_API_KEY", "")
BASE_URL = os.environ.get("MIMO_API_BASE_URL", "https://api.xiaomimimo.com/v1")
MODEL = os.environ.get("MIMO_MODEL", "MiMo-V2.5")

if not API_KEY:
    print("Error: MIMO_API_KEY environment variable is not set.")
    print("Usage: MIMO_API_KEY=sk-xxx python test-mimo-vision.py <image_path>")
    sys.exit(1)

def test_vision(image_path: str):
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "请分析这张图片中的内容，描述你看到的颜色、形状和任何明显的特征。"},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_data}"}},
                ],
            }
        ],
        "max_tokens": 1024,
    }

    print(f"Sending request to {BASE_URL}/chat/completions ...")
    resp = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload, timeout=60)
    print(f"Status: {resp.status_code}")
    print(f"Response:\n{json.dumps(resp.json(), ensure_ascii=False, indent=2)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: MIMO_API_KEY=sk-xxx python test-mimo-vision.py <image_path>")
        sys.exit(1)
    test_vision(sys.argv[1])
