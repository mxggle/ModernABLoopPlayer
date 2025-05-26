# Changelog

All notable changes to LoopMate (formerly ModernABLoop) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/USERNAME/loopmate/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/USERNAME/loopmate/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/USERNAME/loopmate/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/USERNAME/loopmate/releases/tag/v0.1.0
