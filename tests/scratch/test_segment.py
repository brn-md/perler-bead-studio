import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
h, w = img.shape[:2]

# 1. Look at corner pixels to sample the exact background color
corners = np.vstack([
    img[:30, :30].reshape(-1, 3),
    img[:30, -30:].reshape(-1, 3),
    img[-30:, :30].reshape(-1, 3),
    img[-30:, -30:].reshape(-1, 3),
])
bg_mean = np.mean(corners, axis=0)
bg_std = np.std(corners, axis=0)
print("Background BGR Mean:", bg_mean, "Std:", bg_std)

# Distance of all pixels from the background mean
dist = np.linalg.norm(img.astype(np.float32) - bg_mean, axis=2)
# Pixels that are definitely NOT background
fg_candidates = dist > 45

# Also check white polka dots on the background (they have high value, low saturation, but are outside)
# Connected components to keep the main large object
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_candidates.astype(np.uint8))
largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
mask = (labels == largest_label).astype(np.uint8)

# Fill holes in the mask so the inner white parts of Hello Kitty are 100% preserved
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
filled_mask = np.zeros_like(mask)
if contours:
    largest_contour = max(contours, key=cv2.contourArea)
    cv2.drawContours(filled_mask, [largest_contour], -1, 1, thickness=cv2.FILLED)

print("Original foreground percentage:", np.mean(mask))
print("Filled contour foreground percentage:", np.mean(filled_mask))
