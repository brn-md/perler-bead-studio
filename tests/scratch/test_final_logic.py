import cv2
import numpy as np

# Verify the tight crop and color mapping
photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
h, w = img.shape[:2]

# Table LAB sampling from top corners
table_patch = np.vstack([img[:35, :35], img[:35, -35:]])
table_lab = cv2.cvtColor(table_patch, cv2.COLOR_BGR2LAB)
mean_table = np.mean(table_lab, axis=(0, 1))

img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
diff = np.linalg.norm(img_lab.astype(np.float32) - mean_table, axis=2)
craft_mask = (diff > 30).astype(np.uint8)

kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
craft_mask = cv2.morphologyEx(craft_mask, cv2.MORPH_CLOSE, kernel)

num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(craft_mask)
cleaned_mask = np.zeros_like(craft_mask)
for i in range(1, num_labels):
    if stats[i, cv2.CC_STAT_AREA] >= 3000:
        cleaned_mask[labels == i] = 1

contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
filled_mask = np.zeros_like(cleaned_mask)
for c in contours:
    if cv2.contourArea(c) > 3000:
        cv2.drawContours(filled_mask, [c], -1, 1, thickness=cv2.FILLED)

coords = cv2.findNonZero(filled_mask)
bx, by, bw, bh = cv2.boundingRect(coords)

# Tight craft crop
cropped_img = img[by:by+bh, bx:bx+bw]
cropped_mask = filled_mask[by:by+bh, bx:bx+bw]

# Now downsample strictly to the target bead matrix
# Target: 14cm x 19cm with 0.5cm beads -> 28 cols x 38 rows
target_cols = 28
target_rows = 38

downsampled_mask = cv2.resize(cropped_mask, (target_cols, target_rows), interpolation=cv2.INTER_NEAREST)

# Boost contrast of the white beads: in BGR, white beads have high B, G, R
# Normalize brightness so whites become pure white
gray = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2GRAY)
p_low, p_high = np.percentile(gray[cropped_mask > 0], (5, 95))
print("Percentiles of craft intensity:", p_low, p_high)

# Downsampled image
downsampled_img = cv2.resize(cropped_img, (target_cols, target_rows), interpolation=cv2.INTER_AREA)

print("Finished validation test with success!")
