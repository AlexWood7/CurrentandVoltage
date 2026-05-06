export function solveLinearSystem(matrix, rhs, eps = 1e-12) {
	const n = matrix.length;
	if (!Number.isFinite(n) || n <= 0 || rhs.length !== n) return null;

	const A = matrix.map((row) => row.slice());
	const b = rhs.slice();

	for (let col = 0; col < n; col++) {
		let pivotRow = col;
		let best = Math.abs(A[col][col]);
		for (let row = col + 1; row < n; row++) {
			const candidate = Math.abs(A[row][col]);
			if (candidate > best) {
				best = candidate;
				pivotRow = row;
			}
		}
		if (best <= eps) return null;

		if (pivotRow !== col) {
			const tmpRow = A[col];
			A[col] = A[pivotRow];
			A[pivotRow] = tmpRow;
			const tmpB = b[col];
			b[col] = b[pivotRow];
			b[pivotRow] = tmpB;
		}

		const pivot = A[col][col];
		for (let row = col + 1; row < n; row++) {
			const factor = A[row][col] / pivot;
			if (Math.abs(factor) <= eps) continue;
			for (let k = col; k < n; k++) {
				A[row][k] -= factor * A[col][k];
			}
			b[row] -= factor * b[col];
		}
	}

	const x = new Array(n).fill(0);
	for (let row = n - 1; row >= 0; row--) {
		let sum = b[row];
		for (let col = row + 1; col < n; col++) {
			sum -= A[row][col] * x[col];
		}
		const pivot = A[row][row];
		if (Math.abs(pivot) <= eps) return null;
		x[row] = sum / pivot;
	}

	return x;
}
