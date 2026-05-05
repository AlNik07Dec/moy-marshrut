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
