export function formatSubmitTime(time: string): string {
    const m = time.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/);
    return m ? `${m[1]}-${m[2]} ${m[3]}` : time;
}

export function formatStart(start: string): string {
    return start.length >= 16 ? start.slice(5, 16) : start;
}
