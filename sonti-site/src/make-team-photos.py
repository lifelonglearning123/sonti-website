"""Crop and encode the two office photos for the "Two offices" section.

Source photos live outside the repo; run this only when they are re-supplied.
Slots render at 16/10, so each photo is cropped to that ratio around its subject
rather than letting object-fit take a blind centre crop.
"""
import os
from PIL import Image

SRC = r"C:\python\website image scrape"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
ASPECT = 16 / 10

# (source file, output name, top of the crop in source px, max output width)
JOBS = [
    # faces sit ~y620-720; start at 300 to keep the screen wall in and the group high
    ("UK Team.jpg", "uk-team.webp", 300, 1400),
    # start at 270 to keep the "THINK BIG / BUILD FAST" wall and the code monitors
    ("India office.jpg", "india-office.webp", 270, 1400),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, out_name, top, max_w in JOBS:
        im = Image.open(os.path.join(SRC, name)).convert("RGB")
        w, h = im.size
        crop_h = int(round(w / ASPECT))
        top = max(0, min(top, h - crop_h))
        im = im.crop((0, top, w, top + crop_h))
        if im.width > max_w:
            im = im.resize((max_w, int(round(max_w / ASPECT))), Image.LANCZOS)
        dest = os.path.join(OUT, out_name)
        im.save(dest, "WEBP", quality=82, method=6)
        print("%-18s %s  %d KB" % (out_name, im.size, os.path.getsize(dest) / 1024))


if __name__ == "__main__":
    main()
