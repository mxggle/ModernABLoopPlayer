# Transcript Upload Feature

## Overview

The transcript upload feature allows users to import existing transcript files into the modern AB loop player. This feature supports multiple transcript formats and provides seamless integration with the existing transcript functionality.

## Supported Formats

### 1. SRT (SubRip Subtitle) Format

- File extension: `.srt`
- Standard subtitle format with numbered segments
- Time format: `HH:MM:SS,mmm --> HH:MM:SS,mmm`
- Example:

```
1
00:00:00,000 --> 00:00:05,000
Welcome to the modern AB loop player.

2
00:00:05,000 --> 00:00:10,000
This is a sample transcript segment.
```

### 2. VTT (WebVTT) Format

- File extension: `.vtt`
- Web Video Text Tracks format
- Time format: `HH:MM:SS.mmm --> HH:MM:SS.mmm`
- Example:

```
WEBVTT

1
00:00:00.000 --> 00:00:05.000
Welcome to the modern AB loop player.

2
00:00:05.000 --> 00:00:10.000
This is a sample transcript segment.
```

### 3. TXT (Plain Text) Format

- File extension: `.txt`
- Simple text format with optional timestamps
- Time format: `[MM:SS - MM:SS]` or `[HH:MM:SS - HH:MM:SS]`
- Example:

```
[0:00 - 0:05] Welcome to the modern AB loop player.
[0:05 - 0:10] This is a sample transcript segment.
```

## How to Use

### 1. Upload from Transcript Panel

1. Load a media file (audio or video)
2. Open the transcript panel
3. If no transcript exists, you'll see an "Upload Transcript" button
4. Click the button and select your transcript file
5. The transcript will be imported and displayed

### 2. Upload from Transcript Controls

1. Open the transcript panel
2. Look for the "Upload" button in the controls at the bottom
3. Click and select your transcript file
4. The transcript will replace any existing transcript

## Features

- **Auto-format detection**: The system automatically detects the format based on file extension and content
- **Media-scoped transcripts**: Each media file has its own transcript that persists across sessions
- **Bookmark creation**: Create bookmarks directly from transcript segments
- **Time synchronization**: Jump to specific times by clicking on transcript segments
- **Export functionality**: Export transcripts in multiple formats

## Technical Implementation

### Store Integration

- Added `importTranscript` action to the player store
- Supports parsing of SRT, VTT, and TXT formats
- Integrates with existing media-scoped transcript system

### Components

- `TranscriptUploader`: Reusable upload component with compact and prominent variants
- Enhanced `TranscriptPanel`: Shows upload option in empty state
- Updated `TranscriptControls`: Includes upload button in controls

### Error Handling

- File type validation
- Parse error handling with user feedback
- Toast notifications for success/error states

## File Structure

```
src/
├── components/
│   └── transcript/
│       ├── TranscriptUploader.tsx    # New upload component
│       ├── TranscriptPanel.tsx       # Enhanced with upload option
│       ├── TranscriptControls.tsx    # Updated with upload button
│       └── index.ts                  # Updated exports
└── stores/
    └── playerStore.ts                # Added importTranscript action
```

## Testing

Sample transcript files are provided for testing:

- `test-transcript.srt` - SRT format example
- `test-transcript.vtt` - VTT format example
- `test-transcript.txt` - TXT format example

## Future Enhancements

- Support for additional formats (JSON, CSV)
- Batch upload of multiple transcript files
- Transcript editing capabilities
- Auto-sync with video timestamps
- Integration with speech-to-text services
