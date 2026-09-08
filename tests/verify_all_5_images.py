import requests, os, glob

URL = "http://127.0.0.1:8000/api/process"
FOLDER = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\587324be-ab06-44d3-a10c-694ad9d72344\.user_uploaded"
images = sorted(glob.glob(os.path.join(FOLDER, "media_1788878420*.jpg")))

print(f"Testing {len(images)} uploaded user images on {URL}...")

successes = 0
errors_500 = 0

for img_path in images:
    name = os.path.basename(img_path)
    with open(img_path, "rb") as f:
        files = {"file": (name, f, "image/jpeg")}
        # Use craft_photo for real craft photos, auto for others
        input_mode = "craft_photo" if "103" in name else "auto"
        data = {
            "width_cm": 14.5,
            "height_cm": 14.5,
            "bead_size_cm": 0.5,
            "brand": "perler",
            "background_mode": "cutout",
            "grid_mode": "auto",
            "input_mode": input_mode,
            "drop_satellites": "true",
            "prune_minority": "true"
        }
        resp = requests.post(URL, files=files, data=data)
        
        if resp.status_code == 200:
            successes += 1
            res_json = resp.json()
            grid = res_json.get("grid", {})
            colors = res_json.get("color_counts", [])
            top_colors = [f"{c['name']} ({c['count']})" for c in colors[:4]]
            print(f"[OK] {name}: Total Beads = {grid.get('total_beads')}, Unique Colors = {len(colors)}")
            print(f"     Top: {', '.join(top_colors)}")
        else:
            if resp.status_code == 500:
                errors_500 += 1
            print(f"[FAIL] {name}: Status {resp.status_code} - {resp.text[:200]}")

print("\n" + "="*50)
print(f"VERIFICATION SUMMARY: {successes}/{len(images)} succeeded. Errors 500: {errors_500}")
print("="*50)
