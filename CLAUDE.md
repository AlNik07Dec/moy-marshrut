# Мой маршрут — Project Context

## Что это
iOS 17+ SwiftUI-приложение для GPS-трекинга прогулок с тремя режимами, историей по дням и MVVM-архитектурой.

## Tech Stack
- SwiftUI + MapKit (Map, MapPolyline, UserAnnotation)
- @Observable (iOS 17 Observation framework) — вместо ObservableObject
- SwiftData — хранение сессий прогулок
- CoreLocation — GPS-трекинг
- Swift Charts — столбчатый график в HistoryView
- XcodeGen — генерация .xcodeproj из project.yml (никогда не редактировать .pbxproj вручную)
- XCTest — юнит-тесты

## Архитектура MVVM

```
MoyMarshrut/
├── App/
│   └── MoyMarshrutApp.swift       @main, .modelContainer(for: WalkSession.self)
├── Models/
│   ├── Coordinate.swift           Codable wrapper для CLLocationCoordinate2D
│   ├── WalkMode.swift             enum: fast | slow | parkGame
│   └── WalkSession.swift          @Model SwiftData
├── Services/
│   └── LocationService.swift      @Observable CLLocationManager wrapper
├── ViewModels/
│   ├── HomeViewModel.swift        selectedMode, isWalkActive
│   ├── WalkViewModel.swift        таймер, дистанция, маршрут, save()
│   └── HistoryViewModel.swift     фильтр неделя/месяц, sessionsByDay
└── Views/
    ├── Components/
    │   ├── ModeButton.swift
    │   └── StatCard.swift
    ├── HomeView.swift             Старт + карта + режимы
    ├── ActiveWalkView.swift       плашки + MapPolyline + Завершить
    └── HistoryView.swift          Charts + List по дням
MoyMarshrutTests/
├── WalkViewModelTests.swift
└── HistoryViewModelTests.swift
```

## Статус — ВСЁ РЕАЛИЗОВАНО ✅

Все 12 задач выполнены и закоммичены. GitHub Actions (macos-15) собирает и тестирует на каждый push — статус зелёный.

## Важные правила
- Никогда не редактировать `.pbxproj` напрямую — только через `xcodegen generate`
- Использовать `@Observable` (не `ObservableObject`)
- SwiftData `@Model` класс должен быть `final class`
- Deployment target: iOS 17.0, Swift 5.9, Xcode 15+
- Bundle ID: `com.myroute.MoyMarshrut`

## Git
- Remote: https://github.com/AlNik07Dec/moy-marshrut.git
- Основная ветка разработки: `feature/moy-marshrut`
- CI: `.github/workflows/ios.yml` (macos-15, xcodegen + xcodebuild)

## Как сгенерировать проект (на Mac)
```bash
cd .worktrees/feature-moy-marshrut
xcodegen generate
open MoyMarshrut.xcodeproj
```

## Как запустить тесты (на Mac)
```bash
xcodebuild test -scheme MoyMarshrut -destination 'platform=iOS Simulator,name=iPhone 16'
```

## Что в Out of Scope (v1)
- Фоновый трекинг (Background Modes)
- Геймификация «Игра в парке» (заглушка "Скоро")
- Шеринг маршрутов
- Apple Watch
