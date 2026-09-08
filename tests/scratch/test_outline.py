import cv2
import numpy as np

dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
h, w = dog.shape[:2]

# The dog has:
# 1. White background: R>240, G>240, B>240
# 2. Black/dark grid lines: R<70, G<70, B<70
# 3. Dog Outline: Grey (values ~100-140)
# 4. Dog Body: White/off-white (values ~220-250)
# 5. Pink bandana/cheeks/flower: R > G and R > B

# Notice that the outline forms a CLOSED LOOP around the dog!
# Let us isolate the outline:
gray = cv2.cvtColor(dog, cv2.COLOR_BGR2GRAY)
# Outline is darker than 170, but not the thin 1px grid line
# If we do morphological closing on (gray < 170), it bridges the grid lines and outline
is_dark = (gray < 170).astype(np.uint8)

# Find contours of is_dark: the dog outline is a huge contour!
contours, _ = cv2.findContours(is_dark, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
print("Total contours found:", len(contours))
areas = [cv2.contourArea(c) for c in contours]
print("Top 5 contour areas:", sorted(areas, reverse=True)[:5])
