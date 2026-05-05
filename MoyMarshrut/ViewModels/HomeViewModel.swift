import Observation

@Observable
final class HomeViewModel {
    var selectedMode: WalkMode = .slow
    var isWalkActive: Bool = false
}
