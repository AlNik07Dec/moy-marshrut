# Мой маршрут — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать iOS 17+ SwiftUI-приложение «Мой маршрут» для GPS-трекинга прогулок с тремя режимами, историей по дням и MVVM-архитектурой.

**Architecture:** MVVM на `@Observable` (iOS 17), SwiftData для хранения сессий, MapKit SwiftUI API (`Map` + `MapPolyline`) для отображения маршрута в реальном времени, XcodeGen для управления проектом без ручного редактирования `.pbxproj`.

**Tech Stack:** SwiftUI, MapKit, CoreLocation, SwiftData, Swift Charts, XcodeGen, XCTest

---

## File Map

```
MoyMarshrut/                          ← корень репозитория
├── project.yml                       ← XcodeGen spec
├── MoyMarshrut/
│   ├── App/
│   │   └── MoyMarshrutApp.swift      ← @main, modelContainer setup
│   ├── Models/
│   │   ├── Coordinate.swift          ← Codable wrapper для CLLocationCoordinate2D
│   │   ├── WalkMode.swift            ← enum: fast | slow | parkGame
│   │   └── WalkSession.swift         ← @Model SwiftData (дата, режим, км, маршрут)
│   ├── Services/
│   │   └── LocationService.swift     ← @Observable CLLocationManager wrapper
│   ├── ViewModels/
│   │   ├── HomeViewModel.swift       ← выбранный режим, флаг isWalkActive
│   │   ├── WalkViewModel.swift       ← таймер, расстояние, маршрут, save
│   │   └── HistoryViewModel.swift    ← загрузка сессий, фильтр неделя/месяц
│   └── Views/
│       ├── Components/
│       │   ├── ModeButton.swift      ← кнопка выбора режима
│       │   └── StatCard.swift        ← плашка (значение + единица)
│       ├── HomeView.swift            ← Старт + карта + режимы
│       ├── ActiveWalkView.swift      ← плашки + MapPolyline + Завершить
│       └── HistoryView.swift         ← Charts + List по дням
└── MoyMarshrutTests/
    ├── WalkViewModelTests.swift
    └── HistoryViewModelTests.swift
```

---

## Task 1: Project scaffold with XcodeGen

**Files:**
- Create: `project.yml`
- Create: `MoyMarshrut/` (directory tree)
- Create: `MoyMarshrutTests/` (directory)

- [ ] **Step 1: Install XcodeGen (Mac)**

```bash
brew install xcodegen
```

Expected: `xcodegen version 2.x.x`

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p MoyMarshrut/App
mkdir -p MoyMarshrut/Models
mkdir -p MoyMarshrut/Services
mkdir -p MoyMarshrut/ViewModels
mkdir -p "MoyMarshrut/Views/Components"
mkdir -p MoyMarshrutTests
```

- [ ] **Step 3: Create `project.yml`**

```yaml
name: MoyMarshrut
options:
  bundleIdPrefix: com.myroute
  deploymentTarget:
    iOS: "17.0"
  xcodeVersion: "15.0"
targets:
  MoyMarshrut:
    type: application
    platform: iOS
    deploymentTarget: "17.0"
    sources:
      - path: MoyMarshrut
    info:
      path: MoyMarshrut/Info.plist
      properties:
        CFBundleDisplayName: "Мой маршрут"
        NSLocationWhenInUseUsageDescription: "Нужно для отслеживания маршрута прогулки"
        UILaunchScreen:
          UIColorName: ""
          UIImageName: ""
    settings:
      SWIFT_VERSION: "5.9"
      PRODUCT_BUNDLE_IDENTIFIER: com.myroute.MoyMarshrut
  MoyMarshrutTests:
    type: bundle.unit-test
    platform: iOS
    deploymentTarget: "17.0"
    sources:
      - path: MoyMarshrutTests
    dependencies:
      - target: MoyMarshrut
    settings:
      SWIFT_VERSION: "5.9"
```

- [ ] **Step 4: Generate Xcode project**

```bash
xcodegen generate
```

Expected: `✅ Created MoyMarshrut.xcodeproj`

- [ ] **Step 5: Открыть в Xcode и убедиться что проект собирается**

```bash
open MoyMarshrut.xcodeproj
```

Simulator → Any iOS Simulator → Build (⌘B). Expected: `Build Succeeded`.

- [ ] **Step 6: Commit**

```bash
git init
git add project.yml MoyMarshrut.xcodeproj
git commit -m "chore: scaffold XcodeGen project"
```

---

## Task 2: Coordinate + WalkMode

**Files:**
- Create: `MoyMarshrut/Models/Coordinate.swift`
- Create: `MoyMarshrut/Models/WalkMode.swift`

- [ ] **Step 1: Write failing test**

`MoyMarshrutTests/WalkViewModelTests.swift`:

```swift
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: FAIL — `Coordinate`, `WalkMode` not defined.

- [ ] **Step 3: Create `MoyMarshrut/Models/Coordinate.swift`**

```swift
import CoreLocation

struct Coordinate: Codable, Hashable {
    let latitude: Double
    let longitude: Double

    var clCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    init(_ location: CLLocation) {
        latitude = location.coordinate.latitude
        longitude = location.coordinate.longitude
    }
}
```

- [ ] **Step 4: Create `MoyMarshrut/Models/WalkMode.swift`**

```swift
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: PASS — `testCoordinateToClCoordinate`, `testWalkModeDisplayNames`, `testWalkModeIcons`.

- [ ] **Step 6: Commit**

```bash
git add MoyMarshrut/Models/ MoyMarshrutTests/
git commit -m "feat: add Coordinate and WalkMode models"
```

---

## Task 3: WalkSession SwiftData model

**Files:**
- Create: `MoyMarshrut/Models/WalkSession.swift`

- [ ] **Step 1: Write failing test**

Добавить в `MoyMarshrutTests/WalkViewModelTests.swift`:

```swift
import SwiftData

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: FAIL — `WalkSession` not defined.

- [ ] **Step 3: Create `MoyMarshrut/Models/WalkSession.swift`**

```swift
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: PASS — все 4 теста.

- [ ] **Step 5: Commit**

```bash
git add MoyMarshrut/Models/WalkSession.swift MoyMarshrutTests/
git commit -m "feat: add WalkSession SwiftData model"
```

---

## Task 4: LocationService

**Files:**
- Create: `MoyMarshrut/Services/LocationService.swift`

Тестирование сервиса геолокации требует физического устройства или симулятора с GPX-маршрутом, поэтому пишем smoke-тест на инициализацию.

- [ ] **Step 1: Write failing test**

`MoyMarshrutTests/WalkViewModelTests.swift`:

```swift
func testLocationServiceInitialStatus() {
    let service = LocationService()
    // Только проверяем что создаётся без крэша
    // authorizationStatus зависит от симулятора
    XCTAssertNotNil(service)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: FAIL — `LocationService` not defined.

- [ ] **Step 3: Create `MoyMarshrut/Services/LocationService.swift`**

```swift
import CoreLocation
import Observation

@Observable
final class LocationService: NSObject {
    private let manager = CLLocationManager()

    var currentLocation: CLLocation?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var onLocationUpdate: ((CLLocation) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
        authorizationStatus = manager.authorizationStatus
    }

    func requestAuthorization() {
        manager.requestWhenInUseAuthorization()
    }

    func startTracking() {
        manager.startUpdatingLocation()
    }

    func stopTracking() {
        manager.stopUpdatingLocation()
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager,
                         didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        currentLocation = location
        onLocationUpdate?(location)
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add MoyMarshrut/Services/
git commit -m "feat: add LocationService"
```

---

## Task 5: HomeViewModel

**Files:**
- Create: `MoyMarshrut/ViewModels/HomeViewModel.swift`

- [ ] **Step 1: Write failing test**

`MoyMarshrutTests/WalkViewModelTests.swift`:

```swift
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: FAIL — `HomeViewModel` not defined.

- [ ] **Step 3: Create `MoyMarshrut/ViewModels/HomeViewModel.swift`**

```swift
import Observation

@Observable
final class HomeViewModel {
    var selectedMode: WalkMode = .slow
    var isWalkActive: Bool = false
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add MoyMarshrut/ViewModels/HomeViewModel.swift
git commit -m "feat: add HomeViewModel"
```

---

## Task 6: WalkViewModel

**Files:**
- Create: `MoyMarshrut/ViewModels/WalkViewModel.swift`

- [ ] **Step 1: Write failing tests**

`MoyMarshrutTests/WalkViewModelTests.swift`:

```swift
func testFormattedTimeZero() {
    let vm = WalkViewModel()
    XCTAssertEqual(vm.formattedTime, "00:00")
}

func testFormattedTimeMinutes() {
    let vm = WalkViewModel()
    vm.elapsedSeconds = 125  // 2 мин 5 сек
    XCTAssertEqual(vm.formattedTime, "02:05")
}

func testFormattedTimeHours() {
    let vm = WalkViewModel()
    vm.elapsedSeconds = 3665  // 1 ч 1 мин 5 сек
    XCTAssertEqual(vm.formattedTime, "1:01:05")
}

func testDistanceCalculation() {
    // Москва: две точки с разницей ~556 м по широте
    let loc1 = CLLocation(latitude: 55.7558, longitude: 37.6176)
    let loc2 = CLLocation(latitude: 55.7608, longitude: 37.6176)
    let distance = WalkViewModel.calculateDistance(from: loc1, to: loc2)
    XCTAssertGreaterThan(distance, 500)
    XCTAssertLessThan(distance, 620)
}

func testSpeedKmhCalculation() {
    // 10 м/с = 36 км/ч
    let speed = WalkViewModel.calculateSpeed(deltaMeters: 10, deltaSeconds: 1)
    XCTAssertEqual(speed, 36.0, accuracy: 0.1)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: FAIL — `WalkViewModel` not defined.

- [ ] **Step 3: Create `MoyMarshrut/ViewModels/WalkViewModel.swift`**

```swift
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: PASS — все 5 тестов WalkViewModel.

- [ ] **Step 5: Commit**

```bash
git add MoyMarshrut/ViewModels/WalkViewModel.swift
git commit -m "feat: add WalkViewModel with timer and GPS tracking"
```

---

## Task 7: HistoryViewModel

**Files:**
- Create: `MoyMarshrut/ViewModels/HistoryViewModel.swift`
- Create: `MoyMarshrutTests/HistoryViewModelTests.swift`

- [ ] **Step 1: Write failing tests**

`MoyMarshrutTests/HistoryViewModelTests.swift`:

```swift
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
            makeSession(daysAgo: 2, distance: 2000),   // в пределах недели
            makeSession(daysAgo: 10, distance: 5000)   // старше недели
        ]
        vm.filter = .week
        XCTAssertEqual(vm.filteredSessions.count, 1)
        XCTAssertEqual(vm.filteredSessions.first?.distanceMeters, 2000)
    }

    func testMonthFilterKeepsMonthSessions() {
        let vm = HistoryViewModel()
        vm.sessions = [
            makeSession(daysAgo: 15, distance: 3000),   // в пределах месяца
            makeSession(daysAgo: 35, distance: 1000)    // старше месяца
        ]
        vm.filter = .month
        XCTAssertEqual(vm.filteredSessions.count, 1)
        XCTAssertEqual(vm.filteredSessions.first?.distanceMeters, 3000)
    }

    func testSessionsByDayGroupsCorrectly() {
        let vm = HistoryViewModel()
        // Две сессии в один день
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: FAIL — `HistoryViewModel` not defined.

- [ ] **Step 3: Create `MoyMarshrut/ViewModels/HistoryViewModel.swift`**

```swift
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: PASS — все 3 теста HistoryViewModel.

- [ ] **Step 5: Commit**

```bash
git add MoyMarshrut/ViewModels/HistoryViewModel.swift MoyMarshrutTests/HistoryViewModelTests.swift
git commit -m "feat: add HistoryViewModel with week/month filter"
```

---

## Task 8: UI Components (ModeButton + StatCard)

**Files:**
- Create: `MoyMarshrut/Views/Components/ModeButton.swift`
- Create: `MoyMarshrut/Views/Components/StatCard.swift`

*Тестирование: ручное в Preview.*

- [ ] **Step 1: Create `MoyMarshrut/Views/Components/ModeButton.swift`**

```swift
import SwiftUI

struct ModeButton: View {
    let mode: WalkMode
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(mode.icon)
                    .font(.title2)
                Text(mode.displayName)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Color.blue.opacity(0.15) : Color(.systemGray6))
            .foregroundStyle(isSelected ? .blue : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HStack {
        ModeButton(mode: .fast, isSelected: false) {}
        ModeButton(mode: .slow, isSelected: true) {}
        ModeButton(mode: .parkGame, isSelected: false) {}
    }
    .padding()
}
```

- [ ] **Step 2: Create `MoyMarshrut/Views/Components/StatCard.swift`**

```swift
import SwiftUI

struct StatCard: View {
    let value: String
    let unit: String
    var valueColor: Color = .primary

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(valueColor)
                .monospacedDigit()
            Text(unit)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    HStack {
        StatCard(value: "2.34", unit: "км", valueColor: .green)
        StatCard(value: "12:34", unit: "время")
        StatCard(value: "5.8", unit: "км/ч", valueColor: .blue)
    }
    .padding()
}
```

- [ ] **Step 3: Проверить Preview в Xcode**

Открыть оба файла, убедиться что Preview рендерится без ошибок.

- [ ] **Step 4: Commit**

```bash
git add "MoyMarshrut/Views/Components/"
git commit -m "feat: add ModeButton and StatCard components"
```

---

## Task 10: HomeView

**Files:**
- Create: `MoyMarshrut/Views/HomeView.swift`

- [ ] **Step 1: Create `MoyMarshrut/Views/HomeView.swift`**

```swift
import SwiftUI
import MapKit

struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                startButton
                    .padding(.horizontal)
                    .padding(.top, 12)

                Map(position: $position)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                modeButtons
                    .padding()
            }
            .navigationTitle("Мой маршрут")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: HistoryView()) {
                        Image(systemName: "clock")
                    }
                }
            }
            .fullScreenCover(isPresented: $viewModel.isWalkActive) {
                ActiveWalkView(
                    mode: viewModel.selectedMode,
                    isPresented: $viewModel.isWalkActive
                )
            }
        }
    }

    private var startButton: some View {
        Button {
            viewModel.isWalkActive = true
        } label: {
            Label("Старт прогулки", systemImage: "play.fill")
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .foregroundStyle(.white)
                .font(.headline)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private var modeButtons: some View {
        HStack(spacing: 10) {
            ForEach(WalkMode.allCases) { mode in
                ModeButton(mode: mode, isSelected: viewModel.selectedMode == mode) {
                    viewModel.selectedMode = mode
                }
            }
        }
    }
}

#Preview {
    HomeView()
}
```

- [ ] **Step 2: Проверить в симуляторе**

Build & Run. Проверить:
- Карта отображается по центру
- Кнопка «Старт прогулки» зелёная вверху
- Три кнопки режимов внизу, клик переключает выделение
- Иконка часов в навбаре → переход в HistoryView (пока пустой)

- [ ] **Step 3: Commit**

```bash
git add MoyMarshrut/Views/HomeView.swift
git commit -m "feat: add HomeView with map and mode selector"
```

---

## Task 11: ActiveWalkView

**Files:**
- Create: `MoyMarshrut/Views/ActiveWalkView.swift`

- [ ] **Step 1: Create `MoyMarshrut/Views/ActiveWalkView.swift`**

```swift
import SwiftUI
import MapKit

struct ActiveWalkView: View {
    let mode: WalkMode
    @Binding var isPresented: Bool

    @State private var walkViewModel = WalkViewModel()
    @State private var locationService = LocationService()
    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)
    @State private var showLocationAlert = false
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        if mode == .parkGame {
            parkGameStub
        } else {
            walkContent
        }
    }

    // MARK: - Park Game stub

    private var parkGameStub: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "gamecontroller")
                .font(.system(size: 72))
                .foregroundStyle(.secondary)
            Text("Скоро")
                .font(.largeTitle.bold())
            Text("Режим «Игра в парке» находится в разработке")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
            Spacer()
            Button("Назад") { isPresented = false }
                .buttonStyle(.borderedProminent)
                .padding(.bottom)
        }
    }

    // MARK: - Active walk content

    private var walkContent: some View {
        VStack(spacing: 0) {
            statsRow
                .padding()

            Map(position: $position) {
                if walkViewModel.routeCoordinates.count > 1 {
                    MapPolyline(coordinates: walkViewModel.routeCoordinates.map(\.clCoordinate))
                        .stroke(.green, lineWidth: 4)
                }
                UserAnnotation()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            stopButton
                .padding(.horizontal)
                .padding(.bottom, 20)
                .padding(.top, 12)
        }
        .onAppear(perform: handleAppear)
        .onChange(of: locationService.authorizationStatus) { _, status in
            switch status {
            case .authorizedWhenInUse, .authorizedAlways:
                walkViewModel.start(mode: mode, context: modelContext, locationService: locationService)
            case .denied, .restricted:
                showLocationAlert = true
            default:
                break
            }
        }
        .alert("Нет доступа к геолокации", isPresented: $showLocationAlert) {
            Button("Открыть настройки") {
                UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)
            }
            Button("Отмена", role: .cancel) { isPresented = false }
        } message: {
            Text("Разрешите доступ в Настройках → Конфиденциальность → Геолокация")
        }
    }

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatCard(
                value: String(format: "%.2f", walkViewModel.distanceMeters / 1000),
                unit: "км",
                valueColor: .green
            )
            StatCard(value: walkViewModel.formattedTime, unit: "время")
            StatCard(
                value: String(format: "%.1f", walkViewModel.speedKmh),
                unit: "км/ч",
                valueColor: .blue
            )
        }
    }

    private var stopButton: some View {
        Button {
            walkViewModel.finish()
            isPresented = false
        } label: {
            Label("Завершить прогулку", systemImage: "stop.fill")
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red)
                .foregroundStyle(.white)
                .font(.headline)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    // MARK: - Location authorization

    private func handleAppear() {
        switch locationService.authorizationStatus {
        case .notDetermined:
            locationService.requestAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            walkViewModel.start(mode: mode, context: modelContext, locationService: locationService)
        case .denied, .restricted:
            showLocationAlert = true
        @unknown default:
            break
        }
    }
}
```

- [ ] **Step 2: Проверить в симуляторе**

Build & Run. Нажать «Старт прогулки»:
- Запрашивает разрешение на геолокацию — разрешить
- Показывает три плашки (0.00 км / 00:00 / 0.0 км/ч)
- Таймер тикает
- Карта с текущей позицией
- Режим «Игра в парке» → показывает заглушку «Скоро»
- «Завершить» → закрывает экран

Симулировать GPX-маршрут: Xcode → Debug → Simulate Location → City Run. Убедиться что маршрут рисуется.

- [ ] **Step 3: Commit**

```bash
git add MoyMarshrut/Views/ActiveWalkView.swift
git commit -m "feat: add ActiveWalkView with GPS tracking and polyline"
```

---

## Task 9: HistoryView

**Files:**
- Create: `MoyMarshrut/Views/HistoryView.swift`

- [ ] **Step 1: Create `MoyMarshrut/Views/HistoryView.swift`**

```swift
import SwiftUI
import Charts

struct HistoryView: View {
    @State private var viewModel = HistoryViewModel()
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        VStack(spacing: 0) {
            filterPicker
                .padding()

            if viewModel.filteredSessions.isEmpty {
                emptyState
            } else {
                barChart
                    .padding(.horizontal)
                sessionList
            }
        }
        .navigationTitle("История")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.load(context: modelContext) }
    }

    // MARK: - Filter

    private var filterPicker: some View {
        Picker("Период", selection: $viewModel.filter) {
            Text("Неделя").tag(HistoryViewModel.Filter.week)
            Text("Месяц").tag(HistoryViewModel.Filter.month)
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Chart

    private var barChart: some View {
        Chart(viewModel.sessionsByDay, id: \.date) { dayData in
            BarMark(
                x: .value("День", dayData.date, unit: .day),
                y: .value("км", dayData.totalDistance / 1000)
            )
            .foregroundStyle(Color.green.gradient)
            .cornerRadius(4)
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .day)) { _ in
                AxisGridLine()
                AxisTick()
                AxisValueLabel(format: .dateTime.day())
            }
        }
        .chartYAxisLabel("км")
        .frame(height: 160)
        .padding(.bottom, 8)
    }

    // MARK: - Session list

    private var sessionList: some View {
        List {
            ForEach(viewModel.sessionsByDay, id: \.date) { dayData in
                Section(header: Text(dayData.date.formatted(.dateTime.weekday(.wide).day().month()))) {
                    ForEach(dayData.sessions) { session in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(session.mode.icon) \(session.mode.displayName)")
                                    .font(.subheadline).fontWeight(.semibold)
                                Text(session.formattedDuration)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(session.formattedDistance)
                                .font(.headline)
                                .foregroundStyle(.green)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "figure.walk")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
            Text("Нет прогулок")
                .font(.title3.bold())
            Text("Нажмите «Старт прогулки» чтобы начать")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding()
    }
}
```

- [ ] **Step 2: Проверить в симуляторе**

Совершить тестовую прогулку (Task 10), вернуться, открыть историю. Убедиться:
- Сессия появляется в списке
- Переключатель Неделя/Месяц работает
- Столбчатый график показывает день и расстояние

- [ ] **Step 3: Commit**

```bash
git add MoyMarshrut/Views/HistoryView.swift
git commit -m "feat: add HistoryView with chart and session list"
```

---

## Task 12: App entry point + финальная сборка

**Files:**
- Create: `MoyMarshrut/App/MoyMarshrutApp.swift`

- [ ] **Step 1: Create `MoyMarshrut/App/MoyMarshrutApp.swift`**

```swift
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
```

- [ ] **Step 2: Убедиться что нет дублирующего @main**

Проверить что в проекте нет другого файла с `@main`. Если XcodeGen создал шаблонный `ContentView.swift` — удалить его.

```bash
grep -r "@main" MoyMarshrut/
```

Expected: только `MoyMarshrutApp.swift`.

- [ ] **Step 3: Финальный прогон всех тестов**

```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: все тесты PASS.

- [ ] **Step 4: Финальный Build & Run в симуляторе**

Проверить полный сценарий:
1. Открыть приложение — HomeView с картой
2. Выбрать режим «Быстрая»
3. Нажать «Старт прогулки» — разрешить геолокацию
4. Симулировать маршрут (Debug → Simulate Location → City Run)
5. Наблюдать маршрут на карте, тикающий таймер, расстояние
6. Нажать «Завершить» — вернуться на HomeView
7. Открыть «История» (часики) — увидеть сохранённую прогулку и график

- [ ] **Step 5: Финальный commit**

```bash
git add MoyMarshrut/App/MoyMarshrutApp.swift
git commit -m "feat: complete Мой маршрут v1"
```

---

## Out of Scope (v1)

- Фоновый трекинг (Background Modes capability)
- Геймификация «Игра в парке»
- Шеринг маршрутов
- Apple Watch
