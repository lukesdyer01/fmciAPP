import AVFoundation
import UIKit

/// Utility for generating a static poster image from a bundled video resource.
/// Use this to provide a Reduce Motion fallback or when video playback is unavailable.
enum PosterGenerator {
    /// Generates a UIImage from a specific time in a bundled video resource.
    /// - Parameters:
    ///   - resource: The base name of the resource, e.g., "intro".
    ///   - ext: The file extension, default "mp4".
    ///   - seconds: The time in seconds to capture a frame from.
    /// - Returns: A UIImage if successful, otherwise nil.
    static func generatePoster(from resource: String,
                               withExtension ext: String = "mp4",
                               at seconds: Double = 0.0) -> UIImage? {
        guard let url = Bundle.main.url(forResource: resource, withExtension: ext) else { return nil }
        let asset = AVAsset(url: url)
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        // Keep the image crisp without creating excessively large textures.
        generator.maximumSize = CGSize(width: 2000, height: 2000)

        let time = CMTime(seconds: seconds, preferredTimescale: 600)
        do {
            let cgImage = try generator.copyCGImage(at: time, actualTime: nil)
            return UIImage(cgImage: cgImage)
        } catch {
            // You can log the error here if desired.
            return nil
        }
    }
}
