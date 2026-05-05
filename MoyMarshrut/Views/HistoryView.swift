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
