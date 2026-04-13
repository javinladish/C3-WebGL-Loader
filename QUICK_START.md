# Quick Start Guide

## Running the C3 WebGL Viewer

### 1. Start a Local Web Server

The viewer requires a local web server due to CORS restrictions when loading files.

**Option A: Python (recommended)**
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option B: Node.js**
```bash
npx http-server -p 8000
```

**Option C: PHP**
```bash
php -S localhost:8000
```

**Option D: VS Code Live Server Extension**
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

### 2. Open in Browser

Navigate to: `http://localhost:8000`

The viewer will load with Body 003 (Fat) and Garment 240 (default outfit).

### 3. Use the Controls

- **Body Type**: Select from dropdown (0001-0004)
- **Garment**: Select from dropdown or click quick buttons (200-290)
- **Auto-Rotate**: Toggle checkbox to rotate the character

## What You Should See

A 3D character model in T-pose that rotates automatically. The texture should be applied correctly (Body 003 has the best UV mapping).

## Troubleshooting

### "Failed to load texture"
- Make sure you're using a web server (not opening `file://`)
- Check browser console for specific error messages

### "Failed to load C3 file"
- Verify the C3 files exist in `client-5065/c3/{bodyID}/611/130.C3`
- Check file paths are correct (case-sensitive on Linux/Mac)

### Blank Screen
- Open browser console (F12) to see error messages
- Make sure WebGL is supported (visit: https://get.webgl.org/)

### Character Appears Distorted
- This is a known issue with Body 001, 002, and 004 UV mapping
- Body 003 renders perfectly

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ⚠️ Opera (mostly works)

## Known Issues

- Body 1, 2, 4 have minor texture misalignment
- Only T-pose animation available (no movement yet)
- Weapons/helmets not shown (need skeleton support)

## Next Steps

To add more models or textures:
1. Place C3 files in `client-5065/c3/{bodyID}/611/`
2. Place DDS textures in `client-5065/c3/texture/`
3. Follow naming convention: `{bodyID:3d}{actionID:3d}{garmentID:3d}.dds`

For more details, see `README.md`.
