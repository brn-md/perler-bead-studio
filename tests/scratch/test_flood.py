import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
h, w = img.shape[:2]

# The fabric is polka dot:
# - Dot color: cream/light beige [160, 180, 215]
# - Background color: brown [110, 130, 175]
# Let us use floodFill from the four corners with color tolerance to find the connected background!
# Create mask for floodFill: shape must be (h+2, w+2)
flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
temp = img.copy()

# Tolerance for brown fabric
lo_diff = (45, 45, 45)
up_diff = (45, 45, 45)

# Seed from corners and edges
seeds = [(5, 5), (w - 6, 5), (5, h - 6), (w - 6, h - 6), (5, h // 2), (w - 6, h // 2)]
for sx, sy in seeds:
    cv2.floodFill(temp, flood_mask, (sx, sy), (0, 255, 0), lo_diff, up_diff, 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)

bg_mask = (flood_mask[1:-1, 1:-1] == 255).astype(np.uint8)

# Dilate background slightly to catch the fabric polka dots near edges
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
bg_mask = cv2.dilate(bg_mask, kernel, iterations=2)

fg_mask = 1 - bg_mask
print("Background percentage found:", np.mean(bg_mask))
print("Foreground percentage found:", np.mean(fg_mask))

# Find the bounding box of the foreground
coords = cv2.findNonZero(fg_mask)
if coords is not None:
    x, y, bw, bh = cv2.boundingRect(coords)
    print(f"Craft Bounding box: x={x}, y={y}, w={bw}, h={bh}")
