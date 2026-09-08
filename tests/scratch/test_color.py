import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
print("Image shape:", img.shape)

# Convert to HSV to analyze the brown polka-dot fabric vs the bead craft
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
# Brown fabric background typically has Hue in [5, 25], Saturation > 50, Value in [100, 210]
# Hello kitty beads are White (Sat < 25, Val > 180), Pink (Hue 140-175, Sat > 40), Yellow, Black
h, s, v = cv2.split(hsv)
print(f"Mean Saturation: {np.mean(s)}, Mean Value: {np.mean(v)}")
