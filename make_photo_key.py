import requests, io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

photos = [
    ("0",  "https://i.imgur.com/fRxXTtB.jpg"),
    ("1",  "https://i.imgur.com/rtx4E5N.jpg"),
    ("2",  "https://i.imgur.com/xPOir63.jpg"),
    ("3",  "https://i.imgur.com/vPflhUi.jpg"),
    ("4",  "https://i.imgur.com/9cLsFNU.jpg"),
    ("5",  "https://i.imgur.com/bezajV9.jpg"),
    ("6",  "https://i.imgur.com/drbnvTj.jpg"),
    ("7",  "https://i.imgur.com/7hvZo2W.jpg"),
    ("8",  "https://i.imgur.com/SNyA81z.jpg"),
    ("9",  "https://i.imgur.com/6jrsk0b.jpg"),
    ("10", "https://i.imgur.com/oKJbIxw.jpg"),
    ("11", "https://i.imgur.com/kQ5Bjxd.jpg"),
    ("12", "https://i.imgur.com/U5dfqKY.jpg"),
    ("13", "https://i.imgur.com/dOT4Jvg.jpg"),
    ("14", "https://i.imgur.com/qDKqWHc.jpg"),
    ("15", "https://i.imgur.com/uzi7OBV.jpg"),
    ("16", "https://i.imgur.com/Dorutbl.jpg"),
    ("17", "https://i.imgur.com/GJEipTx.jpg"),
    ("18", "https://i.imgur.com/oFLdSNd.jpg"),
    ("19", "https://i.imgur.com/eBGbR0X.jpg"),
    ("20", "https://i.imgur.com/ATBthDZ.jpg"),
    ("21", "https://i.imgur.com/HWDYPZ3.jpg"),
    ("22", "https://i.imgur.com/rQ6K1XS.jpg"),
    ("23", "https://i.imgur.com/trGWzh4.jpg"),
    ("24", "https://i.imgur.com/Tm1uIwi.jpg"),
    ("25", "https://i.imgur.com/LQ1AlwZ.jpg"),
    ("26", "https://i.imgur.com/NZADuPW.jpg"),
]

W, H = A4
COLS = 3
MARGIN = 1.5 * cm
LABEL_H = 0.6 * cm
GAP = 0.4 * cm

cell_w = (W - 2 * MARGIN - (COLS - 1) * GAP) / COLS
cell_h = cell_w * 0.75  # 4:3

rows_per_page = int((H - 2 * MARGIN) / (cell_h + LABEL_H + GAP))

out = "/home/user/Claude/photo-key.pdf"
c = canvas.Canvas(out, pagesize=A4)
c.setTitle("Lock Stock Photo Key")

def draw_page_bg(c):
    c.setFillColorRGB(0.07, 0.05, 0.03)
    c.rect(0, 0, W, H, fill=1, stroke=0)

draw_page_bg(c)

col = 0
row = 0

headers = {"User-Agent": "Mozilla/5.0"}

for num, url in photos:
    print(f"Fetching photo {num}...")
    try:
        r = requests.get(url, headers=headers, timeout=15)
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        img_reader = ImageReader(img)
    except Exception as e:
        print(f"  Failed: {e}")
        img_reader = None

    x = MARGIN + col * (cell_w + GAP)
    y = H - MARGIN - (row + 1) * (cell_h + LABEL_H + GAP) + GAP

    # Draw image box
    c.setFillColorRGB(0.1, 0.07, 0.04)
    c.rect(x, y, cell_w, cell_h, fill=1, stroke=0)
    if img_reader:
        c.drawImage(img_reader, x, y, width=cell_w, height=cell_h, preserveAspectRatio=True, anchor='c')

    # Label
    c.setFillColorRGB(0.91, 0.66, 0.13)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(x + cell_w / 2, y - LABEL_H + 0.1 * cm, f"Photo {num}")

    col += 1
    if col >= COLS:
        col = 0
        row += 1
        if row >= rows_per_page:
            c.showPage()
            draw_page_bg(c)
            row = 0

c.save()
print(f"Saved: {out}")
