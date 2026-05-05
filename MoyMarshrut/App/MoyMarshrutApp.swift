import SwiftUI
import SwiftData

@main
struct MoyMarshrutApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
        .modelContainer(for: WalkSession.self)
    }
}
