import UIKit
import SwiftUI
import Capacitor

// The app's topbar is navy, so the status bar text must be light to stay
// readable over it. CAPBridgeViewController's default is dark text.
class FMCIBridgeViewController: CAPBridgeViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var splash: UIHostingController<LoadingVideoView>?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        let bridge = FMCIBridgeViewController()
        window?.rootViewController = bridge
        window?.makeKeyAndVisible()

        // The intro is layered *over* the bridge rather than swapped in as the
        // root, so the web view starts loading at launch and runs behind it —
        // making the intro cover real startup work instead of adding to it.
        presentIntro(over: bridge)

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    private func presentIntro(over bridge: UIViewController) {
        let host = UIHostingController(rootView: LoadingVideoView(onReady: { [weak self] in
            self?.dismissIntro()
        }))
        splash = host

        host.view.backgroundColor = UIColor(red: 252/255, green: 253/255, blue: 252/255, alpha: 1)

        bridge.addChild(host)
        bridge.view.addSubview(host.view)
        host.didMove(toParent: bridge)

        // Constraints rather than a frame copied from bridge.view.bounds: at this
        // point in scene setup the bridge hasn't laid out, so its bounds can still
        // be zero — which sizes the intro to nothing and shows the web view's
        // empty background instead.
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: bridge.view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: bridge.view.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: bridge.view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: bridge.view.trailingAnchor),
        ])
    }

    private func dismissIntro() {
        guard let host = splash else { return }
        splash = nil
        // Cross-fade rather than cut, so the seam between the intro and the
        // app's own sign-in screen doesn't read as a flicker.
        UIView.animate(withDuration: 0.35, animations: {
            host.view.alpha = 0
        }, completion: { _ in
            host.willMove(toParent: nil)
            host.view.removeFromSuperview()
            host.removeFromParent()
        })
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
