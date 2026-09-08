import cv2
import numpy as np

# Load test_flood_verified.png
vis = cv2.imread("test_flood_verified.png")
# Check the dog body inside:
# It is preserved!
dog_original = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")
no_lines = cv2.medianBlur(dog_original, 7)
gray_no_lines = cv2.cvtColor(no_lines, cv2.COLOR_BGR2GRAY)

h, w = dog_original.shape[:2]
temp = (gray_no_lines > 240).astype(np.uint8) * 255
mask_for_flood = np.zeros((h+2, w+2), dtype=np.uint8)
cv2.floodFill(temp, mask_for_flood, (0, 0), 100)
outer_white = (temp == 100)
character_mask = ~outer_white

# Crop character
coords = cv2.findNonZero(character_mask.astype(np.uint8))
x, y, bw, bh = cv2.boundingRect(coords)

cropped_dog = no_lines[y:y+bh, x:x+bw]
cropped_mask = character_mask[y:y+bh, x:x+bw]

# Now resize to 20 columns x 23 rows (the actual bead resolution of the dog!)
cols = 20
rows = 23
down_dog = cv2.resize(cropped_dog, (cols, rows), interpolation=cv2.INTER_AREA)
down_mask = cv2.resize(cropped_mask.astype(np.uint8), (cols, rows), interpolation=cv2.INTER_NEAREST)

# Set background to transparent
res = np.zeros((rows, cols, 4), dtype=np.uint8)
res[:, :, :3] = down_dog
res[:, :, 3] = np.where(down_mask > 0, 255, 0)
cv2.imwrite("test_perfect_dog_result.png", res)
print("SUCCESS! test_perfect_dog_result.png created.")
