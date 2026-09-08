import cv2
import numpy as np

dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
h, w = dog.shape[:2]

# Remove 1px grid lines with a median blur of size 5
denoised = cv2.medianBlur(dog, 5)

# In the dog template:
# Outside of the dog is pure white [255, 255, 255]
# The outline of the dog is dark grey [100, 100, 110]
# The body inside is light grey/white [230-255]
# Pink bandana is [190, 170, 240]

# Detect the outline:
gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
outline = (gray < 160).astype(np.uint8)

# Close the outline so it forms a solid closed boundary
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
closed_outline = cv2.morphologyEx(outline, cv2.MORPH_CLOSE, kernel)

# Floodfill from (0,0) to find the outer white area
flood_mask = np.zeros((h+2, w+2), dtype=np.uint8)
# Floodfill on closed_outline: outer white region will be 0
# We invert closed_outline so outline is barrier (255)
barrier = (closed_outline * 255).astype(np.uint8)
cv2.floodFill(barrier, flood_mask, (0, 0), 128)

# The outer background is where barrier became 128
outer_bg = (barrier == 128)
# The entire dog (body + outline) is everything else!
dog_mask = ~outer_bg

print("Dog mask fraction of image:", np.mean(dog_mask))

# Get tight bounding box of dog
coords = cv2.findNonZero(dog_mask.astype(np.uint8))
x, y, bw, bh = cv2.boundingRect(coords)
print(f"Dog Bounding Box: x={x}, y={y}, w={bw}, h={bh} (Original: {w}x{h})")

# Crop dog tightly
dog_cropped = denoised[y:y+bh, x:x+bw]
dog_mask_cropped = dog_mask[y:y+bh, x:x+bw]

# Now downsample to 20 columns x 23 rows (the actual bead resolution of the dog!)
dog_cells_x = 20
dog_cells_y = 23
down_dog = cv2.resize(dog_cropped, (dog_cells_x, dog_cells_y), interpolation=cv2.INTER_AREA)
down_mask = cv2.resize(dog_mask_cropped.astype(np.uint8), (dog_cells_x, dog_cells_y), interpolation=cv2.INTER_NEAREST)

print("Downsampled dog shape:", down_dog.shape)
cv2.imwrite("test_dog_perfect.png", down_dog)
