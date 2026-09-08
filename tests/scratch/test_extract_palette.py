import cv2
import numpy as np

dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
h, w = dog.shape[:2]

# Let's inspect unique colors present in the dog image:
# Find all pixels that are NOT white background (> 240) and NOT black grid (< 50)
rgb = cv2.cvtColor(dog, cv2.COLOR_BGR2RGB)
mask_real = (np.min(rgb, axis=2) < 235) & (np.max(rgb, axis=2) > 60)
active_colors = rgb[mask_real]

# Cluster into dominant colors present in the original image!
from sklearn.cluster import KMeans
kmeans = KMeans(n_clusters=8, random_state=42, n_init="auto")
kmeans.fit(active_colors.astype(np.float32))

centers = np.clip(np.round(kmeans.cluster_centers_), 0, 255).astype(np.uint8)
print("Detected distinct colors directly from the image:")
for c in centers:
    hex_str = f"#{c[0]:02X}{c[1]:02X}{c[2]:02X}"
    print(hex_str, "RGB:", c)
