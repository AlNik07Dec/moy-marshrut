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
