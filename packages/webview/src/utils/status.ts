export function statusColor(status: string): string {
    switch (status) {
        case "AC":
            return "text-green-500 bg-green-500/10";
        case "WA":
            return "text-red-500 bg-red-500/10";
        case "TLE":
            return "text-cyan-500 bg-cyan-500/10";
        case "MLE":
            return "text-yellow-500 bg-yellow-500/10";
        case "RE":
            return "text-purple-500 bg-purple-500/10";
        case "CE":
            return "text-gray-400 bg-gray-400/10";
        case "WJ":
        case "WR":
            return "text-yellow-500 bg-yellow-500/10";
        default:
            return "text-gray-400 bg-gray-400/10";
    }
}
