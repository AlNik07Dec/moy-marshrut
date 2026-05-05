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
