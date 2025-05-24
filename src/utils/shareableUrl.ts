import { LoopBookmark } from '../stores/playerStore';

/**
 * Generate a shareable URL that includes loop settings and optionally a specific bookmark
 */
export function generateShareableUrl(params: {
  loopStart?: number | null;
  loopEnd?: number | null;
  youtubeId?: string;
  bookmark?: LoopBookmark | null;
  playbackRate?: number;
}): string {
  const { loopStart, loopEnd, youtubeId, bookmark, playbackRate } = params;
  const urlParams = new URLSearchParams();
  
  // Add YouTube ID if present
  if (youtubeId) {
    urlParams.set('yt', youtubeId);
  }
  
  // Add loop points if present
  if (loopStart !== undefined && loopStart !== null) {
    urlParams.set('start', loopStart.toString());
  }
  
  if (loopEnd !== undefined && loopEnd !== null) {
    urlParams.set('end', loopEnd.toString());
  }
  
  // Add playback rate if present
  if (playbackRate && playbackRate !== 1) {
    urlParams.set('rate', playbackRate.toString());
  }
  
  // Add bookmark data if present
  if (bookmark) {
    // Encode bookmark as JSON and then base64 to make it URL-friendly
    const bookmarkData = {
      name: bookmark.name,
      start: bookmark.start,
      end: bookmark.end,
      playbackRate: bookmark.playbackRate,
      annotation: bookmark.annotation,
    };
    
    const encodedBookmark = btoa(JSON.stringify(bookmarkData));
    urlParams.set('bm', encodedBookmark);
  }
  
  return `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
}

/**
 * Parse a shareable URL to extract loop settings and bookmark data
 */
export function parseShareableUrl(url: string): {
  loopStart?: number;
  loopEnd?: number;
  youtubeId?: string;
  bookmark?: Partial<LoopBookmark>;
  playbackRate?: number;
} {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);
  const result: {
    loopStart?: number;
    loopEnd?: number;
    youtubeId?: string;
    bookmark?: Partial<LoopBookmark>;
    playbackRate?: number;
  } = {};
  
  // Extract YouTube ID
  const youtubeId = params.get('yt');
  if (youtubeId) {
    result.youtubeId = youtubeId;
  }
  
  // Extract loop points
  const startParam = params.get('start');
  if (startParam) {
    const start = parseFloat(startParam);
    if (!isNaN(start)) {
      result.loopStart = start;
    }
  }
  
  const endParam = params.get('end');
  if (endParam) {
    const end = parseFloat(endParam);
    if (!isNaN(end)) {
      result.loopEnd = end;
    }
  }
  
  // Extract playback rate
  const rateParam = params.get('rate');
  if (rateParam) {
    const rate = parseFloat(rateParam);
    if (!isNaN(rate)) {
      result.playbackRate = rate;
    }
  }
  
  // Extract bookmark data
  const bookmarkParam = params.get('bm');
  if (bookmarkParam) {
    try {
      const decodedBookmark = JSON.parse(atob(bookmarkParam));
      result.bookmark = decodedBookmark;
    } catch (error) {
      console.error('Error parsing bookmark data:', error);
    }
  }
  
  return result;
}
