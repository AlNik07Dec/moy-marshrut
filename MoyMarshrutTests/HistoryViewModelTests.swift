import XCTest
@testable import MoyMarshrut

final class HistoryViewModelTests: XCTestCase {
    private func makeSession(daysAgo: Double, distance: Double, mode: WalkMode = .slow) -> WalkSession {
        WalkSession(
            date: Date().addingTimeInterval(-daysAgo * 86400),
            mode: mode,
            distanceMeters: distance,
            durationSeconds: 600,
            routeCoordinates: []
        )
    }

    func testWeekFilterKeepsRecentSessions() {
        let vm = HistoryViewModel()
        vm.sessions = [
            makeSession(daysAgo: 2, distance: 2000),
            makeSession(daysAgo: 10, distance: 5000)
        ]
        vm.filter = .week
        XCTAssertEqual(vm.filteredSessions.count, 1)
        XCTAssertEqual(vm.filteredSessions.first?.distanceMeters, 2000)
    }

    func testMonthFilterKeepsMonthSessions() {
        let vm = HistoryViewModel()
        vm.sessions = [
            makeSession(daysAgo: 15, distance: 3000),
            makeSession(daysAgo: 35, distance: 1000)
        ]
        vm.filter = .month
        XCTAssertEqual(vm.filteredSessions.count, 1)
        XCTAssertEqual(vm.filteredSessions.first?.distanceMeters, 3000)
    }

    func testSessionsByDayGroupsCorrectly() {
        let vm = HistoryViewModel()
        let date = Calendar.current.startOfDay(for: Date())
        let s1 = WalkSession(date: date.addingTimeInterval(3600),
                             mode: .fast, distanceMeters: 1000, durationSeconds: 600, routeCoordinates: [])
        let s2 = WalkSession(date: date.addingTimeInterval(7200),
                             mode: .slow, distanceMeters: 1500, durationSeconds: 900, routeCoordinates: [])
        vm.sessions = [s1, s2]
        vm.filter = .week

        let grouped = vm.sessionsByDay
        XCTAssertEqual(grouped.count, 1)
        XCTAssertEqual(grouped.first?.sessions.count, 2)
        XCTAssertEqual(grouped.first?.totalDistance, 2500, accuracy: 0.001)
    }
}
