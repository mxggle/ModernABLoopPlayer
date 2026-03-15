# LoopMate

A modern web-based audio/video loop player with A-B repeat & Shadowing Recorder.

LoopMate is a sleek and intuitive web app designed for language learners, musicians, and content reviewers. It allows you to loop YouTube videos and local files with precision, and now features a powerful **Shadowing Mode** to record and compare your voice with the original audio.

🎯 **Supports:** MP3, MP4, WebM, FLAC, YouTube links, and more.
📼 **Input:** Drag & drop local files or paste a YouTube URL.
🔁 **Loop:** Set custom A-B loop points to focus on specific sections.
🎙️ **Shadow:** Record your voice over the track to practice pronunciation.


<img width="2518" height="1712" alt="CleanShot 2025-12-13 at 09 47 17@2x" src="https://github.com/user-attachments/assets/5d85007c-04ad-44ee-9199-802e1fad4e5f" />
<img width="2616" height="1776" alt="CleanShot 2025-12-13 at 09 48 41@2x" src="https://github.com/user-attachments/assets/b83ac8b5-a4a8-4ad6-a320-fae9f9371548" />

## ✨ Features

### Core Functionality
- **Audio/Video Playback**: robust support for local media files and YouTube videos.
- **A-B Loop**: Precise loop points with start/end markers and fine-tuning controls.
- **Waveform Visualization**: Interactive waveform for precise navigation and loop setting.
- **Playback Speed**: Adjustable playback rate (0.25x - 2.0x) without altering pitch.
- **Bookmarks**: Save important timestamps with notes for quick access.

### 🎙️ Shadowing Mode (New!)
Designed for language learners to practice speaking:
- **Integrated Recorder**: Record your voice while the media plays.
- **Smart Overwrite**: Automatically trims or splits existing recordings if you re-record a section (non-destructive punch-in).
- **Dual Waveforms**: Visualize your recorded audio output directly on top of the original track in real-time.
- **Auto-Mute**: Automatically mutes your previous recording while you are recording a new take to prevent echo.
- **Mobile Support**: Fully functional recording controls on mobile devices.

### User Experience
- **Responsive Design**: Optimized for both desktop and mobile usage.
- **Touch Controls**: Mobile-friendly seek and loop controls.
- **Dark/Light Theme**: Automatic or manual theme switching.
- **Keyboard Shortcuts**: Comprehensive hotkeys for mouse-free operation.
- **Privacy First**: All local files and recordings are stored locally in your browser (IndexedDB). Nothing is uploaded to a server.

## 🏗 Architecture

LoopMate ships as both a **web app** (Vite SPA) and a **desktop app** (Electron) from a single TypeScript codebase. A 4-layer architecture keeps shared and platform-specific code strictly separated.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 4 · Entry Points                          │
│                                                                     │
│   pages/WebHomePage.tsx          pages/ElectronHomePage.tsx         │
│   pages/PlayerPage.tsx           electron/main.ts                   │
│   components/layout/AppLayout.tsx  ← single platform branch here    │
└───────────────┬─────────────────────────┬───────────────────────────┘
                │                         │
                ▼                         ▼
┌───────────────────────┐   ┌─────────────────────────┐
│  Layer 3 · Web UI     │   │  Layer 3 · Electron UI  │
│                       │   │                         │
│  components/web/      │   │  components/electron/   │
│  ├ WebAppLayout       │   │  ├ ElectronAppLayout    │
│  ├ FileUploader       │   │  ├ ElectronFileOpener   │
│  ├ MediaHistory       │   │  ├ FolderBrowser        │
│  └ StorageUsageInfo   │   │  └ PlayHistory          │
│                       │   │                         │
│  Web APIs only        │   │  window.electronAPI only│
└───────────┬───────────┘   └────────────┬────────────┘
            │                            │
            └──────────┬─────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Layer 2 · Shared UI & State                       │
│                                                                     │
│   components/layout/AppLayoutBase.tsx   (shared chrome)             │
│   components/ui/         Radix UI primitives                        │
│   components/controls/   Playback & A-B loop controls               │
│   components/transcript/ components/waveform/ components/bookmarks/ │
│   stores/playerStore.ts  hooks/                                     │
│                                                                     │
│   No isElectron() · No window.electronAPI · No Layer 3 imports      │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 1 · Core (Pure)                           │
│                                                                     │
│   utils/platform.ts          ← isElectron() defined here           │
│   stores/electronStorage.ts  ← only file allowed to call IPC       │
│   utils/   services/   types/   i18n/                               │
│                                                                     │
│   No DOM APIs · No platform-specific calls                          │
└─────────────────────────────────────────────────────────────────────┘
```

**How it works at runtime:**
- `AppLayout.tsx` makes a single `isElectron()` check and renders either `ElectronAppLayout` or `WebAppLayout`
- All pages use `<AppLayout>` — they never know which shell they are inside
- Shared state lives in Zustand (`playerStore`) and is persisted via `electronStorage`, which transparently routes to Electron IPC or `localStorage`

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State**: Zustand (with persistence)
- **Audio**: Web Audio API (for advanced processing and visualization)
- **Deployment**: Vercel ready

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Browser with Web Audio API support (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/modern-ab-loop.git
   cd modern-ab-loop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`

## 🎛 Usage

1. **Load Media**: Drag & drop a file or paste a YouTube link.
2. **Looping**:
   - Press **A** to set start, **B** to set end.
   - Press **L** to toggle loop.
3. **Shadowing**:
   - Click the **Mic** icon to enable Shadowing Mode.
   - Press **R** or click the Record button to start/stop recording.
   - Your recording will be visualized in **Red** over the original **Green** waveform.
   - Use the individual volume sliders to balance the original audio and your recording.

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Play/Pause |
| **A** | Set Loop Start (A) |
| **B** | Set Loop End (B) |
| **L** | Toggle Loop |
| **C** | Clear Loop Points |
| **R** | Start/Stop Recording (Shadowing) |
| **M** | Add Bookmark |
| **← / →** | Seek -5s / +5s |
| **Shift + ← / →** | Seek -1s / +1s |
| **↑ / ↓** | Volume Up / Down |

## 📝 License

MIT License. See [LICENSE](LICENSE) for details.
