# LoopMate

A modern web-based audio/video loop player with A-B repeat & Shadowing Recorder.

LoopMate is a sleek and intuitive web app designed for language learners, musicians, and content reviewers. It allows you to loop YouTube videos and local files with precision, and now features a powerful **Shadowing Mode** to record and compare your voice with the original audio.

🎯 **Supports:** MP3, MP4, WebM, FLAC, YouTube links, and more.
📼 **Input:** Drag & drop local files or paste a YouTube URL.
🔁 **Loop:** Set custom A-B loop points to focus on specific sections.
🎙️ **Shadow:** Record your voice over the track to practice pronunciation.

![alt text](./screenshots/screenshot-1.png)

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
