import cv2
import numpy as np

dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
from app.core.grid_detector import detect_and_sample_grid_template

sampled_rgb, mask = detect_and_sample_grid_template(dog)
h, w = sampled_rgb.shape[:2]

# Let's inspect the flower: top-right corner of the head (rows 5 to 10, cols 14 to 20)
flower_patch = sampled_rgb[4:11, 13:20]
print("Flower patch colors (RGB):")
for r in range(flower_patch.shape[0]):
    row_strs = [f"#{p[0]:02X}{p[1]:02X}{p[2]:02X}" for p in flower_patch[r]]
    print(row_strs)
