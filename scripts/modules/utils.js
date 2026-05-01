export function clamp(v, min, max) {
	return Math.max(min, Math.min(max, v));
}

export function isInfiniteCurrentValue(current) {
	return current === Infinity || current === -Infinity;
}

export function formatSignedCurrentLabel(current) {
	if (current === Infinity) return "+\u221e A";
	if (current === -Infinity) return "-\u221e A";
	if (!Number.isFinite(current)) return "n/a";
	const abs = Math.abs(current);
	const sign = current >= 0 ? "+" : "-";
	return sign + abs.toFixed(3) + " A";
}
