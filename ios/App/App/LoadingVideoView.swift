import SwiftUI
import AVFoundation

/// Full-screen intro that plays the bundled `intro.mp4` over the web view while
/// it loads, then hands off via `onReady`. Falls back to a still frame of the
/// same video when Reduce Motion is on or the video can't be loaded, so the
/// launch never lands on an empty screen.
struct LoadingVideoView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var player: AVPlayer?
    @State private var handedOff = false

    /// Called once when the intro is finished and the app should be revealed.
    var onReady: () -> Void

    /// How long the still-frame fallback is shown, since it has no natural end.
    private let posterDuration: TimeInterval = 1.5

    var body: some View {
        ZStack {
            // The intro's own background colour, so no seam flashes a
            // mismatched shade before the first frame renders.
            Color(red: 252/255, green: 253/255, blue: 252/255).ignoresSafeArea()

            if let player, !reduceMotion {
                PlayerLayerView(player: player)
                    .ignoresSafeArea()
            } else {
                PosterImageView(resourceName: "intro", captureSecond: 0.0)
            }
        }
        .task {
            // Reduce Motion: hold the still frame briefly, then hand off.
            guard !reduceMotion else {
                try? await Task.sleep(nanoseconds: UInt64(posterDuration * 1_000_000_000))
                handOff()
                return
            }

            guard let url = Bundle.main.url(forResource: "intro", withExtension: "mp4") else {
                // No video in the bundle — don't strand the user on the poster
                // fallback, which would be blank for the same reason.
                handOff()
                return
            }

            let p = AVPlayer(url: url)
            p.isMuted = true
            // A splash must never fight the user's music.
            p.actionAtItemEnd = .pause
            player = p

            // Hand off when the intro finishes rather than looping it — this is
            // a launch screen, not a background video.
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: p.currentItem,
                queue: .main
            ) { _ in handOff() }

            p.play()
        }
    }

    /// Guarded because the end-of-item notification and the fallback paths can
    /// both fire; the app should only be revealed once.
    private func handOff() {
        guard !handedOff else { return }
        handedOff = true
        onReady()
    }
}

/// AVPlayerLayer wrapper. Deliberately not AVKit's `VideoPlayer`, which draws
/// playback controls — a splash screen the user can scrub is not a splash screen.
private struct PlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerUIView {
        let view = PlayerUIView()
        view.backgroundColor = UIColor(red: 252/255, green: 253/255, blue: 252/255, alpha: 1)
        view.playerLayer.player = player
        // Fill the screen and crop, rather than letterboxing a 9:16 video on a
        // taller or shorter device.
        view.playerLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PlayerUIView, context: Context) {
        uiView.playerLayer.player = player
    }
}

private final class PlayerUIView: UIView {
    override static var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
