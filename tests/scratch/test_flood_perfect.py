import cv2
import numpy as np

# How to perfectly process templates with grid lines (like the dog)
# The secret: Morphological filtering with a directional line detector or median filter
dog = cv2.imread(r"C:\Users\Brnmd-Win\.gemini\antigravity\brain\b811188a-ea69-4fea-ab34-7780758775ba\.user_uploaded\media_1788822550870.jpg")

# The thin black grid lines are 1-2 pixels wide.
# A morphological DILATION with a 3x3 square on the darker pixels replaces 1px black lines with neighbor cell colors!
# Even simpler: A median filter of size 7 wipes out 1-2px lines completely!
no_lines = cv2.medianBlur(dog, 7)

# Let us verify if no_lines has grid lines:
gray_no_lines = cv2.cvtColor(no_lines, cv2.COLOR_BGR2GRAY)
print("Min gray in no_lines:", np.min(gray_no_lines))
# In no_lines, the outline has gray ~120-140, background is ~255!
# Let us threshold to find the character (outline + body):
# Background cells are > 248.
# Dog body is [235-255], outline is [120-140], bandana is [190], eyes are [40]

# So how to separate background white from body white?
# Floodfill from the outer corners on (gray_no_lines > 240)!
# Any white connected to the 4 borders is BACKGROUND!
# The white inside the dog body is TRAPPED inside the grey outline!
h, w = dog.shape[:2]
mask_for_flood = np.zeros((h+2, w+2), dtype=np.uint8)
temp = (gray_no_lines > 240).astype(np.uint8) * 255

# Floodfill from (0,0)
cv2.floodFill(temp, mask_for_flood, (0, 0), 100)

# Where temp is 100, it is OUTER BACKGROUND!
outer_white = (temp == 100)
# Inside the dog, white was NOT reached because the grey outline blocked the flood!
# So the entire character is ~outer_white!
character_mask = ~outer_white

print("Outer white background percentage:", np.mean(outer_white))
print("Character mask percentage:", np.mean(character_mask))

# Get tight bounding box of the character
coords = cv2.findNonZero(character_mask.astype(np.uint8))
x, y, bw, bh = cv2.boundingRect(coords)
print(f"Character Bounding Box: x={x}, y={y}, w={bw}, h={bh} (Original: {w}x{h})")

# Save verification image
vis = no_lines.copy()
vis[outer_white] = [255, 0, 0] # Blue for background
cv2.imwrite("test_flood_verified.png", vis)
print("Saved test_flood_verified.png!")
