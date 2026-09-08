import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img_bgr = cv2.imread(photo_path)
h, w = img_bgr.shape[:2]

# Sample corners to find background color
corners = np.vstack([
    img_bgr[:35, :35].reshape(-1, 3),
    img_bgr[:35, -35:].reshape(-1, 3),
    img_bgr[-35:, :35].reshape(-1, 3),
    img_bgr[-35:, -35:].reshape(-1, 3),
])
bg_mean = np.mean(corners, axis=0)

# Distance to background
dist = np.linalg.norm(img_bgr.astype(np.float32) - bg_mean, axis=2)
fg_raw = (dist > 40).astype(np.uint8)

# Close small gaps (like dark bead holes or lines)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
fg_closed = cv2.morphologyEx(fg_raw, cv2.MORPH_CLOSE, kernel)

# Largest connected component
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_closed)
if num_labels > 1:
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    main_blob = (labels == largest_label).astype(np.uint8)
else:
    main_blob = np.ones((h, w), dtype=np.uint8)

# Convex/Solid contour fill to guarantee hollows inside the wand are filled
contours, _ = cv2.findContours(main_blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
craft_mask = np.zeros((h, w), dtype=np.uint8)
if contours:
    largest_c = max(contours, key=cv2.contourArea)
    cv2.drawContours(craft_mask, [largest_c], -1, 1, thickness=cv2.FILLED)

# Crop image tightly to the bounding box of the craft!
x, y, bw, bh = cv2.boundingRect(craft_mask)
print(f"Bounding box: x={x}, y={y}, w={bw}, h={bh} (Original: {w}x{h})")

# Extract tight craft
craft_bgr = img_bgr[y:y+bh, x:x+bw]
craft_mask_tight = craft_mask[y:y+bh, x:x+bw]

# Now resize strictly to the target grid: 28 cols x 38 rows (for 14cm x 19cm at 0.5cm)
target_cols = 28
target_rows = 38

# Apply color balance / white level enhancement:
# The white beads inside have RGB values around [200-240]. Boost them so they map to pure #FFFFFF!
lab = cv2.cvtColor(craft_bgr, cv2.COLOR_BGR2LAB)
l, a, b = cv2.split(lab)
# CLAHE on L-channel to boost local contrast
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
l_boosted = clahe.apply(l)
craft_enhanced = cv2.cvtColor(cv2.merge([l_boosted, a, b]), cv2.COLOR_LAB2BGR)

# Apply mask: background becomes pure white or transparent
craft_enhanced[craft_mask_tight == 0] = [255, 255, 255]

downsampled = cv2.resize(craft_enhanced, (target_cols, target_rows), interpolation=cv2.INTER_AREA)
mask_downsampled = cv2.resize(craft_mask_tight, (target_cols, target_rows), interpolation=cv2.INTER_NEAREST)

cv2.imwrite("test_downsampled.png", downsampled)
print("Saved test_downsampled.png successfully!")
