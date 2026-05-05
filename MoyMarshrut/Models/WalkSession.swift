import Foundation
import SwiftData

@Model
final class WalkSession {
    var date: Date
    var mode: WalkMode
    var distanceMeters: Double
    var durationSeconds: Int
    var routeCoordinates: [Coordinate]

    init(date: Date, mode: WalkMode, distanceMeters: Double,
         durationSeconds: Int, routeCoordinates: [Coordinate]) {
        self.date = date
        self.mode = mode
        self.distanceMeters = distanceMeters
        self.durationSeconds = durationSeconds
        self.routeCoordinates = routeCoordinates
    }

    var formattedDistance: String {
        if distanceMeters < 1000 {
            return String(format: "%.0f м", distanceMeters)
        }
        return String(format: "%.2f км", distanceMeters / 1000)
    }

    var formattedDuration: String {
        "\(durationSeconds / 60) мин"
    }
}
