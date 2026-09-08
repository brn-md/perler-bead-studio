# Perler Studio 🎨✨
> Enterprise-grade Bead Pattern & Pegboard Generator for Perler, Artkal, Hama, Nabbi, and MARD Beads.

A modern, 100% offline local monorepo workstation designed for fuse bead crafters. Converts photos, illustrations, and digital bead templates into physical pegboard matrices, preserving proportions, simulating hot-iron melting, and exporting 1:1 scale actual size printable PDFs.

## Monorepo Architecture

```
pixelweaver/
├── apps/
│   ├── web/               # Next.js 14 (App Router), React 18, TypeScript, Tailwind, Canvas
│   └── api/               # Python 3.11+, FastAPI, OpenCV, Scikit-Learn, rembg, ReportLab
├── tests/
│   ├── fixtures/          # Benchmark test images & templates
│   └── scratch/           # Algorithm validation scripts
├── scripts/
│   ├── dev.bat            # Launches backend + frontend concurrently
│   └── run-local.bat      # 1-click launcher that opens browser automatically
├── package.json           # Root workspace orchestrator
└── .env.example           # Centralized environment variables
```

## Key Features
- **Universal Image Processor**: Subpixel grid template detector + local AI background isolation (`rembg` / ONNX).
- **Physical Proportional Scaling**: Locked aspect ratio scaling to target physical dimensions (cm). Standard Midi (5.0 mm) and Mini (2.6 mm).
- **Official Brand Catalogs**: Perler (USA), Artkal (China), Hama (Denmark), Nabbi (Sweden), and MARD (Global).
- **Interactive Workspace**:
  - **Bead View (3D)**: Realistic open beads with highlight bevel and peg holes.
  - **Melted View**: Neighbor-aware thermo-fusion simulation (Standard pinhole vs Full Melt).
  - **Flat View**: High-contrast pixel blocks.
  - **Overlays**: 123 coordinate rulers, symbol glyphs (#), and modular pegboard lines (29×29).
  - **Toolbox**: Select (V), Pencil (B), Eraser (E), Eyedropper (I), Undo/Redo, and Mass Color Swap (R).
- **Export & Assembly**:
  - **Printable 1:1 Scale PDF**: Exact 5.0mm/2.6mm pitch for direct under-board placement + factory shopping checklist.
  - **PNG Export**: High-resolution digital pattern.

## Running Locally

### Option 1: Quick 1-Click Launch (Windows)
Double-click `scripts/dev.bat` or run:
```powershell
.\scripts\dev.bat
```

### Option 2: Manual Terminal Launch
1. **API Engine (Port 8000)**:
```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --app-dir apps/api --host 127.0.0.1 --port 8000 --reload
```
2. **Web Application (Port 3000)**:
```powershell
npm run dev:web
```
Navigate to `http://localhost:3000`.
