import SwiftUI

/// A SwiftUI view that generates and displays a poster image from a bundled video.
/// Useful as a Reduce Motion fallback or when video playback isn't available.
struct PosterImageView: View {
    /// The base resource name of the bundled video (without extension), e.g., "intro".
    let resourceName: String
    /// The timestamp (in seconds) from which to capture the frame.
    let captureSecond: Double

    @State private var poster: UIImage?

    var body: some View {
        Group {
            if let poster {
                Image(uiImage: poster)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .accessibilityLabel("Loading")
            } else {
                // Fallback color while generating the poster.
                Color.black.ignoresSafeArea()
            }
        }
        .task {
            if poster == nil {
                poster = PosterGenerator.generatePoster(from: resourceName, at: captureSecond)
            }
        }
    }
}
