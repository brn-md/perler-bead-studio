import sys, os, glob, io, base64
sys.path.insert(0, os.path.abspath('apps/api'))
from app.services.image_processor import process_pixel_art
from PIL import Image

os.makedirs('tests/inspection', exist_ok=True)
folder = r'C:\Users\Brnmd-Win\.gemini\antigravity\brain\587324be-ab06-44d3-a10c-694ad9d72344\.user_uploaded'
images = sorted(glob.glob(os.path.join(folder, 'media_1788878420*.jpg')))

for i, img_path in enumerate(images):
    name = os.path.basename(img_path)
    with open(img_path, 'rb') as f:
        bytes_data = f.read()
    
    res = process_pixel_art(
        bytes_data,
        width_cm=14.5,
        height_cm=14.5,
        bead_size_cm=0.5,
        brand='perler',
        grid_mode='auto',
        bg_tolerance=18.0,
        flat_colors=False
    )
    
    b64 = res['image_base64'].split(',')[1]
    out_img = Image.open(io.BytesIO(base64.b64decode(b64)))
    out_path = f'tests/inspection/result_{i}_{name}.png'
    out_img.save(out_path)
    
    print(f"=== Image {i}: {name} ===")
    print(f"  Algorithm: {res['algorithm']}")
    print(f"  Total beads: {res['grid']['total_beads']}")
    print(f"  Colors: {len(res['color_counts'])}")
    top = [f"{c['name']} ({c['count']})" for c in res['color_counts'][:5]]
    print(f"  Top colors: {', '.join(top)}")
