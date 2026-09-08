import cv2
import numpy as np

photo_path = r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788821283364.png"
img = cv2.imread(photo_path)
h, w = img.shape[:2]

# Look at color distribution in HSV
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
# The background fabric is warm brown with low-to-medium hue (10-25) and distinct saturation
# Let us test Otsu threshold on saturation or color distance
dist_from_corners = np.linalg.norm(img.astype(np.float32) - [123, 139, 183], axis=2)
print("Dist min:", np.min(dist_from_corners), "Dist max:", np.max(dist_from_corners), "Median:", np.median(dist_from_corners))
