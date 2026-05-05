import XCTest
import CoreLocation
@testable import MoyMarshrut

final class WalkViewModelTests: XCTestCase {
    func testCoordinateToClCoordinate() {
        let coord = Coordinate(latitude: 55.7558, longitude: 37.6176)
        XCTAssertEqual(coord.clCoordinate.latitude, 55.7558, accuracy: 0.0001)
        XCTAssertEqual(coord.clCoordinate.longitude, 37.6176, accuracy: 0.0001)
    }

    func testWalkModeDisplayNames() {
        XCTAssertEqual(WalkMode.fast.displayName, "Быстрая")
        XCTAssertEqual(WalkMode.slow.displayName, "Медленная")
        XCTAssertEqual(WalkMode.parkGame.displayName, "Игра в парке")
    }

    func testWalkModeIcons() {
        XCTAssertEqual(WalkMode.fast.icon, "🐕")
        XCTAssertEqual(WalkMode.slow.icon, "🚶")
        XCTAssertEqual(WalkMode.parkGame.icon, "🎮")
    }

    func testWalkSessionInit() {
        let session = WalkSession(
            date: Date(),
            mode: .fast,
            distanceMeters: 1500,
            durationSeconds: 900,
            routeCoordinates: [Coordinate(latitude: 55.7, longitude: 37.6)]
        )
        XCTAssertEqual(session.distanceMeters, 1500)
        XCTAssertEqual(session.mode, .fast)
        XCTAssertEqual(session.routeCoordinates.count, 1)
    }

    func testWalkSessionFormattedDistance_meters() {
        let session = WalkSession(date: Date(), mode: .slow,
                                  distanceMeters: 450, durationSeconds: 300,
                                  routeCoordinates: [])
        XCTAssertEqual(session.formattedDistance, "450 м")
    }

    func testWalkSessionFormattedDistance_km() {
        let session = WalkSession(date: Date(), mode: .slow,
                                  distanceMeters: 2350, durationSeconds: 1200,
                                  routeCoordinates: [])
        XCTAssertEqual(session.formattedDistance, "2.35 км")
    }

    func testWalkSessionFormattedDuration() {
        let session = WalkSession(date: Date(), mode: .fast,
                                  distanceMeters: 1000, durationSeconds: 745,
                                  routeCoordinates: [])
        XCTAssertEqual(session.formattedDuration, "12 мин")
    }

    func testLocationServiceInitialStatus() {
        let service = LocationService()
        XCTAssertNotNil(service)
    }

    func testHomeViewModelDefaultMode() {
        let vm = HomeViewModel()
        XCTAssertEqual(vm.selectedMode, .slow)
        XCTAssertFalse(vm.isWalkActive)
    }

    func testHomeViewModelSelectMode() {
        let vm = HomeViewModel()
        vm.selectedMode = .fast
        XCTAssertEqual(vm.selectedMode, .fast)
    }

    func testFormattedTimeZero() {
        let vm = WalkViewModel()
        XCTAssertEqual(vm.formattedTime, "00:00")
    }

    func testFormattedTimeMinutes() {
        let vm = WalkViewModel()
        vm.elapsedSeconds = 125
        XCTAssertEqual(vm.formattedTime, "02:05")
    }

    func testFormattedTimeHours() {
        let vm = WalkViewModel()
        vm.elapsedSeconds = 3665
        XCTAssertEqual(vm.formattedTime, "1:01:05")
    }

    func testDistanceCalculation() {
        let loc1 = CLLocation(latitude: 55.7558, longitude: 37.6176)
        let loc2 = CLLocation(latitude: 55.7608, longitude: 37.6176)
        let distance = WalkViewModel.calculateDistance(from: loc1, to: loc2)
        XCTAssertGreaterThan(distance, 500)
        XCTAssertLessThan(distance, 620)
    }

    func testSpeedKmhCalculation() {
        let speed = WalkViewModel.calculateSpeed(deltaMeters: 10, deltaSeconds: 1)
        XCTAssertEqual(speed, 36.0, accuracy: 0.1)
    }
}
