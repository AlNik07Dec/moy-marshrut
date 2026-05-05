import Foundation
import CoreLocation
import SwiftData
import Observation

@Observable
final class WalkViewModel {
    var elapsedSeconds: Int = 0
    var distanceMeters: Double = 0
    var routeCoordinates: [Coordinate] = []
    var speedKmh: Double = 0

    private var timer: Timer?
    private var lastLocation: CLLocation?
    private var currentMode: WalkMode = .slow
    private var modelContext: ModelContext?
    private weak var locationService: LocationService?
    private var isStarted = false

    func start(mode: WalkMode, context: ModelContext, locationService: LocationService) {
        guard !isStarted else { return }
        isStarted = true
        currentMode = mode
        modelContext = context
        self.locationService = locationService

        locationService.onLocationUpdate = { [weak self] location in
            self?.handleNewLocation(location)
        }
        locationService.startTracking()

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.elapsedSeconds += 1
        }
    }

    func finish() {
        timer?.invalidate()
        timer = nil
        locationService?.stopTracking()
        isStarted = false

        guard let context = modelContext else { return }
        let session = WalkSession(
            date: Date(),
            mode: currentMode,
            distanceMeters: distanceMeters,
            durationSeconds: elapsedSeconds,
            routeCoordinates: routeCoordinates
        )
        context.insert(session)
        try? context.save()
    }

    var formattedTime: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    // MARK: - Static helpers (testable)

    static func calculateDistance(from: CLLocation, to: CLLocation) -> Double {
        to.distance(from: from)
    }

    static func calculateSpeed(deltaMeters: Double, deltaSeconds: Double) -> Double {
        guard deltaSeconds > 0 else { return 0 }
        return (deltaMeters / deltaSeconds) * 3.6
    }

    // MARK: - Private

    private func handleNewLocation(_ location: CLLocation) {
        if let last = lastLocation {
            let delta = Self.calculateDistance(from: last, to: location)
            distanceMeters += delta
            let dt = location.timestamp.timeIntervalSince(last.timestamp)
            speedKmh = Self.calculateSpeed(deltaMeters: delta, deltaSeconds: dt)
        }
        lastLocation = location
        routeCoordinates.append(Coordinate(location))
    }
}
