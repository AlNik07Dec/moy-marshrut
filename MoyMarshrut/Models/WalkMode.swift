import Foundation

enum WalkMode: String, Codable, CaseIterable, Identifiable {
    case fast
    case slow
    case parkGame

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .fast:     return "Быстрая"
        case .slow:     return "Медленная"
        case .parkGame: return "Игра в парке"
        }
    }

    var icon: String {
        switch self {
        case .fast:     return "🐕"
        case .slow:     return "🚶"
        case .parkGame: return "🎮"
        }
    }
}
