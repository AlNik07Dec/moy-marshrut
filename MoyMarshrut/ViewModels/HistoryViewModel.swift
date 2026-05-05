import Foundation
import SwiftData
import Observation

@Observable
final class HistoryViewModel {
    enum Filter { case week, month }

    var sessions: [WalkSession] = []
    var filter: Filter = .week

    var filteredSessions: [WalkSession] {
        let cutoff: Date
        let now = Date()
        switch filter {
        case .week:  cutoff = now.addingTimeInterval(-7 * 86400)
        case .month: cutoff = now.addingTimeInterval(-30 * 86400)
        }
        return sessions.filter { $0.date >= cutoff }
    }

    var sessionsByDay: [(date: Date, sessions: [WalkSession], totalDistance: Double)] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: filteredSessions) {
            calendar.startOfDay(for: $0.date)
        }
        return grouped
            .map { (date: $0.key, sessions: $0.value, totalDistance: $0.value.reduce(0) { $0 + $1.distanceMeters }) }
            .sorted { $0.date > $1.date }
    }

    func load(context: ModelContext) {
        let descriptor = FetchDescriptor<WalkSession>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        sessions = (try? context.fetch(descriptor)) ?? []
    }
}
