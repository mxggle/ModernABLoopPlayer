# Changelog

All notable changes to LoopMate (formerly ModernABLoop) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
