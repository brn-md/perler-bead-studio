# Perler Studio 🎨✨
> Universal Bead Pattern & Pegboard Generator for Perler, Artkal, Hama, Nabbi, and MARD Beads.

A modern, 100% local web application designed for bead craft crafters. Converts photos, images, and digital bead templates into physical pegboard matrices, preserving proportions and providing shopping inventories by brand.

## Key Features
- **Universal Image Processor**:
  - Subpixel grid template detector (digitizes existing templates with black grid lines).
  - Local AI background isolation (`rembg` / ONNX) for camera photos taken on tables and fabrics.
- **Physical Proportional Scaling**:
  - Locked aspect ratio scaling to target physical dimensions (cm).
  - Standard Midi (5.0 mm) and Mini (2.6 mm) bead hardware presets.
  - Automatic pegboard modular calculation (e.g., 29×29 boards).
- **Official Brand Catalogs**:
  - **Perler Beads** (USA): `P01` to `P96`
  - **Artkal Beads** (Midi / Mini): `S01` to `S38+`
  - **Hama Beads** (Denmark): `H01` to `H71`
  - **Nabbi / PhotoPearls** (Sweden): `N01` to `N23`
  - **MARD Beads** (Global): `M01` to `M18`
- **Interactive Workspace**:
  - **Bead View (3D)**: Realistic beads with highlight bevel and center peg hole.
  - **Flat View**: High-contrast block mode for assembly.
  - **123 Ruler**: Coordinate numbers on top and left.
  - **Symbols (#)**: Unique symbols on each bead cell matching the inventory.
  - **Pegboard Grid**: Crimson division lines for 29×29 modular boards.
  - **Color Focus Mode**: Click any color in inventory to isolate and highlight it with step-by-step navigation (◀ / ▶).
  - **Manual Canvas Editor**: Pencil (`B`), Eraser (`E`), Eyedropper (`I`), Undo (`Ctrl+Z`), and Redo (`Ctrl+Y`).
  - **Live Inventory Bar**: Exact bead counts and official manufacturer codes (e.g. `P01 White`, `P05 Pink`).
  - **PNG Export**: Crisp, high-definition template ready for printing.

## Tech Stack
- **Backend**: Python 3.10+, FastAPI, OpenCV, Scikit-Learn, SciPy, rembg, onnxruntime, Uvicorn.
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, HTML5 Canvas.

## Running Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000` in your web browser.