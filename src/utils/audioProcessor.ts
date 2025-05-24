import * as Tone from 'tone'

export class AudioProcessor {
  private player: Tone.Player | null = null
  private loopStart: number | null = null
  private loopEnd: number | null = null
  private timeUpdateCallback: ((time: number) => void) | null = null
  private intervalId: number | null = null

  constructor() {
    Tone.start()
  }

  async loadFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file)
    
    if (this.player) {
      this.player.dispose()
    }

    this.player = new Tone.Player({
      url,
      loop: false,
      onload: () => {
        URL.revokeObjectURL(url)
      }
    }).toDestination()

    await this.player.load()
    this.startTimeUpdate()
  }

  setLoopPoints(startTime: number | null, endTime: number | null): void {
    this.loopStart = startTime
    this.loopEnd = endTime

    if (this.player && this.loopStart !== null && this.loopEnd !== null) {
      this.player.loop = true
      this.player.loopStart = this.loopStart
      this.player.loopEnd = this.loopEnd
    } else if (this.player) {
      this.player.loop = false
    }
  }

  async play(): Promise<void> {
    if (!this.player) return
    await Tone.start()
    this.player.start()
  }

  pause(): void {
    if (!this.player) return
    this.player.stop()
  }

  setPlaybackRate(rate: number): void {
    if (!this.player) return
    this.player.playbackRate = rate
  }

  getCurrentTime(): number {
    return this.player ? this.player.now() : 0
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallback = callback
  }

  private startTimeUpdate(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId)
    }

    this.intervalId = window.setInterval(() => {
      if (this.timeUpdateCallback) {
        this.timeUpdateCallback(this.getCurrentTime())
      }
    }, 16.67) // ~60fps
  }

  dispose(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId)
    }
    if (this.player) {
      this.player.dispose()
      this.player = null
    }
  }
}
