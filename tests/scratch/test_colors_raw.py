import cv2
import numpy as np

dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
h, w = dog.shape[:2]

# Let's inspect the cells:
# Row 0, Col 0:
print("Corner 0,0:", dog[10, 10])
# What is the color of the dog outline?
# Let's find unique colors in the image excluding pure white [255, 255, 255] and black lines [< 50]:
gray = cv2.cvtColor(dog, cv2.COLOR_BGR2GRAY)
mask_colored = (gray >= 50) & (gray <= 245)
colored_pixels = dog[mask_colored]
print("Colored pixels sample (first 10):", colored_pixels[:10])
