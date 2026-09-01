// Short two-tone chime for new-message notifications, synthesized via the
// Web Audio API so we don't need to ship/host an audio file for one sound.
let ctx: AudioContext | null = null

export function playNotificationSound() {
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    ;[[880, 0], [1175, 0.09]].forEach(([freq, delay]) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx!.destination)

      const start = now + delay
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)

      osc.start(start)
      osc.stop(start + 0.2)
    })
  } catch {
    // Audio unsupported/blocked — notifications still work visually, sound is a bonus.
  }
}
