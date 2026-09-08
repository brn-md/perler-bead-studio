import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
h, w = img.shape[:2]

# Take the top-left 40x40 patch (pure table fabric)
table_patch = img[10:50, 10:50]
table_lab = cv2.cvtColor(table_patch, cv2.COLOR_BGR2LAB)
mean_table = np.mean(table_lab, axis=(0, 1))
std_table = np.std(table_lab, axis=(0, 1))
print("Table LAB Mean:", mean_table, "Std:", std_table)

# Full image in LAB
img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
diff = np.linalg.norm(img_lab.astype(np.float32) - mean_table, axis=2)

# Beads differ from the table in lightness, a (pink), or hue
craft_mask = (diff > 35).astype(np.uint8)

# Morphological clean up
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
craft_mask = cv2.morphologyEx(craft_mask, cv2.MORPH_CLOSE, kernel)

# Remove tiny components from table polka dots
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(craft_mask)
min_size = 2000 # Minimum area for the real craft
cleaned_mask = np.zeros_like(craft_mask)
for i in range(1, num_labels):
    if stats[i, cv2.CC_STAT_AREA] >= min_size:
        cleaned_mask[labels == i] = 1

# Fill holes inside the craft
contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
filled_mask = np.zeros_like(cleaned_mask)
for c in contours:
    if cv2.contourArea(c) > 2000:
        cv2.drawContours(filled_mask, [c], -1, 1, thickness=cv2.FILLED)

print("Segmented craft area fraction:", np.mean(filled_mask))

# Get exact tight bounding box of the craft!
coords = cv2.findNonZero(filled_mask)
if coords is not None:
    bx, by, bw, bh = cv2.boundingRect(coords)
    print(f"EXACT CRAFT BOUNDING BOX: x={bx}, y={by}, w={bw}, h={bh} (Original: {w}x{h})")
