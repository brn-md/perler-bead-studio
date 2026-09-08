import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
h, w = img.shape[:2]

# In Lab color space:
# Hello Kitty is Pink, White, Yellow, Black.
# Pink has HIGH `a` channel (a > 135).
# White has HIGH `L` and neutral a, b.
# Table fabric is brown/beige (L is medium ~150-180, a is slightly positive ~135, b is yellow-leaning ~145).
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
L, A, B = cv2.split(lab)

print("L range:", np.min(L), np.max(L), "A range:", np.min(A), np.max(A), "B range:", np.min(B), np.max(B))

# Pink beads in outer perimeter:
pink_mask = (A > 140)
print("Pink pixels percentage:", np.mean(pink_mask))

# White beads inside:
white_mask = (L > 185) & (np.abs(A.astype(np.int16) - 128) < 15) & (np.abs(B.astype(np.int16) - 128) < 20)
print("White pixels percentage:", np.mean(white_mask))

# Combined craft markers:
craft_markers = pink_mask | white_mask
# Find convex hull or bounding box of craft markers
coords = cv2.findNonZero(craft_markers.astype(np.uint8))
if coords is not None:
    x, y, bw, bh = cv2.boundingRect(coords)
    print(f"Bounding Box from Pink/White markers: x={x}, y={y}, w={bw}, h={bh} (Original: {w}x{h})")
