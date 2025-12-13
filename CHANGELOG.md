# Changelog

All notable changes to LoopMate (formerly ModernABLoop) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2025-12-13

### Added
- **Playback Persistence**:
  - Automatically saves and restores playback position for media files and YouTube videos
  - Includes new `mediaVolume` and `previousMediaVolume` states in store
- **Advanced Audio Controls**:
  - Three-level volume architecture: Media, Recording (Shadowing), and Master
  - Independent mute controls for each level with visual feedback
  - Synchronized volume state across all player components
- **Shadowing Enhancements**:
  - **Mobile Support**: Added dedicated recording button to mobile interface
  - **Smart Overwrite**: New logic to handle overlapping shadowing recordings purely
  - **Media Track Control**: Added volume slider and mute toggle for the backing media track in shadowing view
- **Visual Updates**:
  - **Bar Waveform**: Transitioned from line to bar-based waveform visualization for clearer silence formatting
  - **YouTube UI**: Stylized "waveform not supported" notice with improved aesthetics

### Changed
- **Loop & Interaction Refinements**:
  - Implemented "Smart Looping": auto-activates loop when clicking loop button inside a bookmark
  - Restricted 'M' shortcut to strictly require A-B loop for bookmark creation
  - Separated waveform interactions: body click for seeking, marker click for selection
- **Shadowing Workflow**:
  - Improved auto-mute behavior: restores previous mute state instead of always unmuting after recording
  - Enhanced recording state management for mobile users

### Fixed
- Resolved block-scoped variable error in WaveformVisualizer
- Removed redundant total storage display in StorageUsageInfo
- Added missing `common.remove` translation key

## [0.7.0] - 2025-09-19

### Added
- **Shadowing Recorder (Major Feature)**:
  - Integrated voice recorder to practice speaking alongside media
  - **Real-time Visualization**: See your recording waveform (red) overlaid on the original audio (green) instantly
  - **Smart Overwrite**: Re-recording a section automatically trims or splits existing recordings (non-destructive punch-in)
  - **Auto-Mute**: Automatically mutes the shadowing track while recording to prevent echo/feedback
  - **Dual Volume Control**: Independent volume sliders for the original track and your recorded voice
- **Mobile Recording Controls**: Added a dedicated microphone button to the mobile player interface

### Changed
- Updated `ShadowingStore` to support file slicing (`fileOffset`) for efficient audio segment management
- Optimized waveform rendering to handle layered audio visualizations
- Refactored `useShadowingPlayer` to use Web Audio API for precise playback synchronization

## [0.6.1] - 2025-09-19

### Added
- Enhanced Media History UI with folder navigation and sorting controls
- Added i18n translations for player controls and loop components

### Changed
- Updated disabled bookmark button styling
- Changed history icon to ListVideo for better visual representation

## [0.6.0] - 2025-09-14

### Added

- Internationalization (i18n) support:
  - Complete translations for player controls and bookmarks
  - Language detection and switching capability
  - Support for English, Chinese, and Japanese languages
- Video file support:
  - Native video player integration
  - Waveform visualization for video files
  - Enhanced native media controls
- Playlist management:
  - UI for playlist creation and editing
  - Playback mode controls (shuffle, repeat)
  - Queue management system
- Media organization:
  - Folder organization for media history
  - Sorting options for media files
  - Improved media history panel
- Enhanced controls:
  - Redesigned mobile controls
  - Quick-add bookmark feature
  - Configurable seek steps
  - Improved bookmark navigation

### Fixed

- Standardized z-index layering across components
- Added ESC key and click-outside handling for all drawers
- Improved bookmark management across components

## [0.5.0] - 2025-05-29

### Added

- AI-powered text explanation feature for transcript segments:
  - Explain button on each transcript segment for language learning
  - Support for OpenAI GPT, Google Gemini, and xAI Grok AI services
  - Translation, explanation, difficulty assessment, and key vocabulary extraction
  - Configurable target language and preferred AI service
  - Secure API key storage in browser localStorage
  - Fallback between AI services for reliability

## [0.4.0] - 2025-05-26

### Added

- Comprehensive transcript management system:
  - Advanced parsing for SRT, VTT, and TXT transcript formats
  - Detailed error handling with user feedback
  - Auto-format detection based on file extension and content
- Enhanced UI customization:
  - Expanded settings drawer with interface layout controls
  - Component-level visibility toggles for player, waveform, transcript, and controls
  - Persistent layout preferences across sessions
- Improved media interaction:
  - Auto-play functionality when navigating through transcript segments
  - Media-scoped transcript system that persists across sessions
  - Bookmark creation directly from transcript segments

### Enhanced

- OpenAI Whisper integration:
  - Improved transcription workflow with progress indicators
  - Secure API key management with local storage
  - Multiple export format options (SRT, VTT, TXT)
- Navigation system:
  - Streamlined routing architecture
  - Better integration with media history
  - Simplified user flow between components

### Technical

- Refactored store architecture:
  - Media-scoped data structures for transcripts and bookmarks
  - Centralized seeking logic
  - Improved state management for UI components
- Performance optimizations:
  - Reduced re-renders in transcript components
  - Optimized media loading process
  - Enhanced error handling throughout the application

## [0.3.0] - 2025-05-25

### Added

- Transcript file upload support with SRT, VTT, and TXT formats
- Settings drawer to control UI component visibility
- Layout settings for customizable UI component visibility
- OpenAI Whisper transcription with UI controls and export options
- Enhanced navigation system with simplified routing and media history integration
- Hidden mode for media players to maintain functionality without UI
- Auto-play when jumping to transcript segments

### Changed

- Increased icon sizes for better visibility
- Refactored transcript management to support media-scoped transcripts
- Updated related components to work with the new transcript system

## [0.2.0] - 2025-05-25

### Added

- Mobile touch support and responsive design for waveform visualizer
- Mobile-optimized controls and touch-friendly UI components
- Notification badges for bookmark and history features

### Changed

- Rebranded from ModernABLoop to LoopMate across all files
- Moved bookmark and history buttons to header for better accessibility
- Adjusted header layout and icon sizes for improved mobile responsiveness

### Refactored

- Centralized seeking logic in playerStore for better code organization
- Updated useMediaQuery import path to use alias

## [0.1.0] - 2025-05-25

- Initial release with core functionality including:
  - Audio and YouTube media player components
  - A-B loop functionality for precise media loops
  - Audio visualization features
  - Media controls (play, pause, loop, etc.)
  - Layout optimizations for desktop view
  - TypeScript and React component structure

[Unreleased]: https://github.com/USERNAME/loopmate/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/USERNAME/loopmate/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/USERNAME/loopmate/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/USERNAME/loopmate/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/USERNAME/loopmate/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/USERNAME/loopmate/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/USERNAME/loopmate/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/USERNAME/loopmate/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/USERNAME/loopmate/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/USERNAME/loopmate/releases/tag/v0.1.0
