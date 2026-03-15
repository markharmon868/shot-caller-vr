# Shot Caller - Testing Guide

Complete testing guide for all app flows and asset loading.

## 🚀 Dev Server

Start the dev server:
```bash
npm run dev
```

Access at: **https://localhost:8083/** (or check console for actual port)

---

## 📋 Available Test Scenes

All scenes are properly configured with splat files, colliders, and asset catalogs:

| Scene ID | Splat File | Collider | Size |
|----------|------------|----------|------|
| `demo` | sensai-lod.spz | Built-in floor | 12 MB |
| `golden-gate` | golden-gate-3d.spz | Built-in floor | 31 MB |
| `hollywood` | hollywood.spz | hollywood-collider.glb | 31 MB + 5.2 MB |
| `scene-711be87d` | scene-711be87d.spz | scene-711be87d-collider.glb | 31 MB + 4.3 MB |

---

## 🧪 Complete App Flow Testing

### 1. **Landing Page**
**URL:** `https://localhost:8083/`
- ✅ Scout workflow landing page
- ✅ Google Maps integration
- ✅ Clean design with amber accents

### 2. **Home Page**
**URL:** `https://localhost:8083/?mode=home`
- ✅ Marketing home with feature highlights
- ✅ Stylized navigation with gradient wordmark

### 3. **Create Mode**
**URL:** `https://localhost:8083/?mode=create`
- ✅ Mission control 2-column layout
- ✅ Image upload (drag-and-drop)
- ✅ Description textarea
- ✅ Generate button
- ✅ Auto-navigation to editor after generation

### 4. **Editor Mode - All Scenes**
Test each scene:
- `https://localhost:8083/?mode=editor&scene=demo`
- `https://localhost:8083/?mode=editor&scene=hollywood`
- `https://localhost:8083/?mode=editor&scene=golden-gate`
- `https://localhost:8083/?mode=editor&scene=scene-711be87d`

Expected for all:
- ✅ Splat loads correctly
- ✅ Asset catalog populates
- ✅ Element placement works
- ✅ Save/load persists

### 5. **VR Mode - All Scenes**
Test each scene:
- `https://localhost:8083/?mode=vr&scene=demo`
- `https://localhost:8083/?mode=vr&scene=hollywood`
- `https://localhost:8083/?mode=vr&scene=golden-gate`

Expected:
- ✅ Enter VR button works
- ✅ Desktop controls (WASD + mouse)
- ✅ Placed elements visible
- ✅ Smooth performance

---

## ✅ Quick Verification Checklist

```
[ ] Landing page loads
[ ] Home page loads
[ ] Create mode: mission control layout (no scrolling)
[ ] Scout mode: Google Maps visible
[ ] Editor: demo scene loads
[ ] Editor: hollywood scene loads
[ ] Editor: asset catalog works
[ ] VR: demo scene works
[ ] VR: Enter VR button functions
[ ] Build passes: npm run build
[ ] No critical console errors
```

---

## 🎯 Asset Loading Verification

All assets should load with HTTP 200:
- `/splats/sensai-lod.spz` (12 MB)
- `/splats/golden-gate-3d.spz` (31 MB)
- `/splats/hollywood.spz` (31 MB)
- `/splats/hollywood-collider.glb` (5.2 MB)
- `/splats/scene-711be87d.spz` (31 MB)
- `/splats/scene-711be87d-collider.glb` (4.3 MB)
- `/models/arri-alexa-mini-lf.glb` (8.3 MB)
- `/asset-catalog.json`

All scene bundles should load:
- `/scenes/demo.{world,scene,assets}.json`
- `/scenes/hollywood.{world,scene,assets}.json`
- `/scenes/golden-gate.{world,scene,assets}.json`
- `/scenes/scene-711be87d.{world,scene,assets}.json`

---

## 🐛 Known Expected Warnings

```
[vite] http proxy error: /api/create/upload
ECONNREFUSED 127.0.0.1:8787
```
**Normal:** Backend server not running, uses fallback behavior

```
Some chunks are larger than 500 kB after minification
```
**Normal:** Expected for 3D libraries (Three.js, Babylon.js, Gaussian splat renderer)

---

## 📝 Success Criteria

- **Visual:** Consistent amber (#e8a020), pure black backgrounds, IBM Plex fonts
- **Functional:** All scenes load, asset catalog works, save/load persists
- **Performance:** Editor < 5s load, VR 60+ FPS, no memory leaks
- **Build:** `npm run build` passes with 0 errors
