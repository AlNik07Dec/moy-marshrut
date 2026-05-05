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
