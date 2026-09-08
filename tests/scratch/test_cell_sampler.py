import cv2
import numpy as np

dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
h, w = dog.shape[:2]

# Cell size is exactly 24.5 pixels!
step = 24.5
cols = int(round(w / step))
rows = int(round(h / step))
print(f"Dog Grid Dimensions: {cols} cols x {rows} rows")

# Sample center of each cell (offset + 12px)
cell_matrix = []
for r in range(rows):
    row_colors = []
    cy = int((r + 0.5) * step)
    if cy >= h: cy = h - 1
    for c in range(cols):
        cx = int((c + 0.5) * step)
        if cx >= w: cx = w - 1
        # Sample 3x3 patch around center to be robust
        patch = dog[max(0, cy-1):min(h, cy+2), max(0, cx-1):min(w, cx+2)]
        b, g, r_val = np.median(patch.reshape(-1, 3), axis=0)
        row_colors.append((int(r_val), int(g), int(b)))
    cell_matrix.append(row_colors)

# Detect outside white background using floodfill on the sampled cells!
matrix_rgb = np.array(cell_matrix, dtype=np.uint8)
matrix_gray = cv2.cvtColor(matrix_rgb, cv2.COLOR_RGB2GRAY)

# Cells with gray > 240 and no color saturation are white
# Floodfill from (0,0) on the cell matrix
is_white = (matrix_gray > 240).astype(np.uint8)
flood_mask = np.zeros((rows + 2, cols + 2), dtype=np.uint8)
barrier = (1 - is_white) * 255 # Non-white cells are barriers (outline, bandana, eyes)
cv2.floodFill(barrier.copy(), flood_mask, (0, 0), 128)

outer_bg = (flood_mask[1:-1, 1:-1] == 128)

print("Outer background cells:", np.sum(outer_bg))
print("Character drawing cells (including white body):", np.sum(~outer_bg))

# Save sampled pixel art visualization
out_img = matrix_rgb.copy()
out_img[outer_bg] = [255, 0, 0] # Blue for background in test
cv2.imwrite("test_sampled_dog.png", cv2.cvtColor(out_img, cv2.COLOR_RGB2BGR))
print("Saved test_sampled_dog.png successfully!")
