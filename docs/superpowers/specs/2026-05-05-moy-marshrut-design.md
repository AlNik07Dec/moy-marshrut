# Мой маршрут — Design Spec
Date: 2026-05-05

## Overview

iOS-приложение «Мой маршрут» для отслеживания прогулок с собакой и спокойных прогулок. Пользователь выбирает режим, запускает GPS-трекинг, видит маршрут на карте в реальном времени и просматривает историю активности по дням.

**Target:** iOS 17+  
**Stack:** SwiftUI + MVVM (`@Observable`) + SwiftData + MapKit

---

## Screens

### 1. HomeView — главный экран

Компоновка (вариант B):
- **Кнопка «Старт прогулки»** — большая, зелёная, вверху экрана
- **Карта (MapKit)** — в центре, занимает основное пространство, показывает текущее положение
- **Три кнопки режимов** — горизонтальный ряд под картой
  - 🐕 Быстрая (бег с собакой)
  - 🚶 Медленная (спокойная прогулка)
  - 🎮 Игра в парке (заглушка, геймификация — будет реализована позже)
- **Иконка часов** в навбаре → переход в HistoryView

### 2. ActiveWalkView — активная прогулка

Открывается как `fullScreenCover` поверх HomeView. Компоновка (вариант A):
- **Три плашки со статистикой** вверху: расстояние (км), время (мм:сс), скорость (км/ч)
- **Карта с маршрутом** — центр экрана, `MapPolyline` рисуется по мере движения, камера следует за пользователем
- **Кнопка «Завершить прогулку»** — красная, внизу

### 3. HistoryView — история прогулок

Компоновка (вариант A):
- **Переключатель фильтра** — «Неделя» / «Месяц»
- **Столбчатый график** — расстояние по дням (SwiftUI Charts)
- **Список прогулок** — каждая запись: дата, режим, длительность, расстояние

---

## Architecture (MVVM)

### Models — SwiftData

```swift
@Model
class WalkSession {
    var date: Date
    var mode: WalkMode
    var distanceMeters: Double
    var durationSeconds: Int
    var routeCoordinatesData: Data  // [CLLocationCoordinate2D] сериализованы в Data
}

enum WalkMode: String, Codable {
    case fast      // бег с собакой
    case slow      // спокойная прогулка
    case parkGame  // игра в парке (заглушка)
}
```

### Services

```swift
@Observable
class LocationService {
    // Обёртка над CLLocationManager
    // Публикует: currentLocation, authorizationStatus
    // Метод: startTracking() / stopTracking()
}
```

### ViewModels

```swift
@Observable
class HomeViewModel {
    var selectedMode: WalkMode = .slow
    var isWalkActive: Bool = false
}

@Observable
class WalkViewModel {
    var elapsedSeconds: Int = 0
    var distanceMeters: Double = 0
    var routeCoordinates: [CLLocationCoordinate2D] = []
    var speedKmh: Double = 0
    // Методы: start(), finish() → сохраняет WalkSession в SwiftData
}

@Observable
class HistoryViewModel {
    var sessions: [WalkSession] = []
    var filter: HistoryFilter = .week  // .week | .month
    // Загружает из SwiftData, группирует по дням
}
```

### Views → ViewModels

| View | ViewModel |
|------|-----------|
| HomeView | HomeViewModel |
| ActiveWalkView | WalkViewModel + LocationService |
| HistoryView | HistoryViewModel |

---

## Data Flow

**Старт прогулки:**
`HomeView` → `HomeViewModel.isWalkActive = true` → показывает `ActiveWalkView` как `fullScreenCover` с выбранным `WalkMode`.

**Трекинг:**
`LocationService` накапливает `CLLocation` → `WalkViewModel` добавляет координаты в `routeCoordinates`, считает расстояние через `CLLocation.distance(from:)`, обновляет скорость → `MapPolyline` и плашки обновляются реактивно через `@Observable`.

**Завершение:**
`WalkViewModel.finish()` → создаёт `WalkSession` → сохраняет в SwiftData → `HomeViewModel.isWalkActive = false` → `ActiveWalkView` закрывается.

---

## Error Handling

- **Геолокация отказана:** `Alert` с кнопкой «Открыть настройки» (`UIApplication.shared.open(settingsURL)`).
- **Режим «Игра в парке»:** показывает `Text("Скоро")` — заглушка без крэша.
- **SwiftData ошибки:** логируются в консоль, UI не крашится.

---

## Permissions

`Info.plist`:
- `NSLocationWhenInUseUsageDescription` — «Нужно для отслеживания маршрута прогулки»

Фоновый трекинг не требуется — прогулка ведётся при открытом приложении.

---

## Project Structure

```
МойМаршрут/
├── App/
│   └── МойМаршрутApp.swift
├── Models/
│   ├── WalkSession.swift
│   └── WalkMode.swift
├── Services/
│   └── LocationService.swift
├── ViewModels/
│   ├── HomeViewModel.swift
│   ├── WalkViewModel.swift
│   └── HistoryViewModel.swift
├── Views/
│   ├── HomeView.swift
│   ├── ActiveWalkView.swift
│   └── HistoryView.swift
└── Resources/
    └── Info.plist
```

---

## Out of Scope (v1)

- Фоновый трекинг
- Геймификация «Игра в парке»
- Шеринг маршрутов
- Apple Watch поддержка
