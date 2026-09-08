# Perler Bead Studio

**Purpose**  
Convert digital images into physical fuse-bead patterns with brand color matching, pegboard grid alignment, and 1:1 scale printable PDF guides.

**Stack**  
Next.js 14, React, TypeScript, Tailwind CSS, Python 3.11+, FastAPI, OpenCV, Scikit-Learn, ReportLab

**Install**  
```bash
# Clone the repository
git clone https://github.com/brn-md/perler-bead-studio.git
cd perler-bead-studio

# Install backend dependencies
python -m venv venv
.\venv\Scripts\activate   # On Linux/macOS: source venv/bin/activate
pip install -r apps/api/requirements.txt

# Install frontend dependencies
cd apps/web && npm install && cd ../..

# Start both servers (Windows)
.\scripts\dev.bat
```

*(Manual start alternative)*
```bash
# Terminal 1: Backend
uvicorn main:app --app-dir apps/api --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
npm run dev:web
```

**Usage**  
1. Open `http://localhost:3000` in your browser.
2. Drag and drop an image into the workspace.
3. Choose your bead brand (Perler, Artkal, Hama, Nabbi, MARD) and pegboard size (Midi 5.0 mm or Mini 2.6 mm).
4. Inspect patterns in 3D, Flat, or Melted views and make manual bead tweaks using the canvas toolbox.
5. Click **Export PDF** to print a 1:1 scale template to place directly underneath your pegboard.

