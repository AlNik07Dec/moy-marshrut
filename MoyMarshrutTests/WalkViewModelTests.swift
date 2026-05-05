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
}
