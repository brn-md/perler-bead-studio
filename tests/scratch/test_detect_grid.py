import cv2
import numpy as np

# Test grid-sampling on dog image
dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
h, w = dog.shape[:2]

# Detect cell size:
# The grid lines are dark lines across the image
gray = cv2.cvtColor(dog, cv2.COLOR_BGR2GRAY)

# Sum along rows and cols to find line coordinates
col_lines = np.where(np.mean(gray < 100, axis=0) > 0.15)[0]
row_lines = np.where(np.mean(gray < 100, axis=1) > 0.15)[0]

def cluster_lines(indices):
    if len(indices) == 0: return []
    groups = [[indices[0]]]
    for x in indices[1:]:
        if x - groups[-1][-1] <= 3:
            groups[-1].append(x)
        else:
            groups.append([x])
    return [int(np.mean(g)) for g in groups]

xs = cluster_lines(col_lines)
ys = cluster_lines(row_lines)

print(f"Detected {len(xs)} vertical lines and {len(ys)} horizontal lines.")
if len(xs) > 5 and len(ys) > 5:
    cell_w = np.median(np.diff(xs))
    cell_h = np.median(np.diff(ys))
    print(f"Cell width: {cell_w:.1f}px, Cell height: {cell_h:.1f}px")
