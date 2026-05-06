export function createKirchhoffSolver(deps) {
	const {
		state,
		buildCircuitRouteGraph,
		buildCircuitVoltageSegments,
		isBranchSwitch,
		isComponentSwitchClosed,
		componentIntrinsicResistance,
		componentResistance,
		componentEmf,
		SHORT_WIRE_R_PER_PIXEL,
		GRAPH_PATH_HALF_WIDTH
	} = deps;

	function applyKirchhoffSectionSolve(layout) {
		if (!layout || !state.solved) return null;
		const routeGraphForSections = buildCircuitRouteGraph(layout);
		let graphRouteRows = (routeGraphForSections && Array.isArray(routeGraphForSections.routes))
			? routeGraphForSections.routes.map((route, idx) => ({
				from: route.from,
				to: route.to,
				R: Math.max(0, Number.isFinite(route.R) ? route.R : 0),
				E: Number.isFinite(route.E) ? route.E : 0,
				parts: Array.isArray(route.parts) ? route.parts : [],
				routeKey: route.routeKey || `${route.from || "?"}|${route.to || "?"}`,
				routeIndex: idx,
				isGraphRoute: true
			}))
			: [];
		if (!graphRouteRows.length) {
			const loopParts = [];
			let totalR = 0;
			let totalE = 0;
			const seenComp = new Set();
			const seenSwitchBlade = new Set();

			const routeGraphEdges = routeGraphForSections && Array.isArray(routeGraphForSections.edges)
				? routeGraphForSections.edges
				: [];
			const routeGraphAdjacency = routeGraphForSections && routeGraphForSections.adjacency
				? routeGraphForSections.adjacency
				: null;
			const routeGraphNodes = routeGraphForSections && routeGraphForSections.nodeByKey
				? routeGraphForSections.nodeByKey
				: null;
			const routeGraphSegments = routeGraphForSections && Array.isArray(routeGraphForSections.segments)
				? routeGraphForSections.segments
				: [];

			const buildCycleTraversal = () => {
				if (!routeGraphEdges.length || !routeGraphAdjacency) return null;
				const attempt = (startEdgeIndex, startFromKey) => {
					const startEdge = routeGraphEdges[startEdgeIndex];
					if (!startEdge) return null;
					const startToKey = startEdge.nodeA === startFromKey ? startEdge.nodeB : startEdge.nodeA;
					if (!startToKey) return null;
					const used = new Set([startEdgeIndex]);
					const steps = [{ edgeIndex: startEdgeIndex, fromKey: startFromKey, toKey: startToKey }];
					let currentKey = startToKey;
					let prevEdgeIndex = startEdgeIndex;
					for (let guard = 0; guard < routeGraphEdges.length + 4; guard++) {
						if (currentKey === startFromKey) break;
						const incident = routeGraphAdjacency.get(currentKey) || [];
						const nextCandidates = incident.filter((ei) => ei !== prevEdgeIndex && !used.has(ei));
						if (!nextCandidates.length) return null;
						const nextEdgeIndex = nextCandidates[0];
						const nextEdge = routeGraphEdges[nextEdgeIndex];
						if (!nextEdge) return null;
						const nextKey = nextEdge.nodeA === currentKey ? nextEdge.nodeB : nextEdge.nodeA;
						if (!nextKey) return null;
						used.add(nextEdgeIndex);
						steps.push({ edgeIndex: nextEdgeIndex, fromKey: currentKey, toKey: nextKey });
						prevEdgeIndex = nextEdgeIndex;
						currentKey = nextKey;
					}
					if (currentKey !== startFromKey) return null;
					return steps;
				};

				for (let edgeIndex = 0; edgeIndex < routeGraphEdges.length; edgeIndex++) {
					const edge = routeGraphEdges[edgeIndex];
					if (!edge) continue;
					const forward = attempt(edgeIndex, edge.nodeA);
					if (forward && forward.length) return forward;
					const reverse = attempt(edgeIndex, edge.nodeB);
					if (reverse && reverse.length) return reverse;
				}
				return null;
			};

			const traversalSteps = buildCycleTraversal();
			const hasCycleTraversal = Array.isArray(traversalSteps) && traversalSteps.length > 0;
			if (hasCycleTraversal) {
				for (const step of traversalSteps) {
					const edge = routeGraphEdges[step.edgeIndex];
					if (!edge) continue;
					const fromNode = routeGraphNodes && routeGraphNodes.get(step.fromKey);
					const toNode = routeGraphNodes && routeGraphNodes.get(step.toKey);
					if (!fromNode || !toNode) continue;
					const travDx = toNode.x - fromNode.x;
					const travDy = toNode.y - fromNode.y;
					loopParts.push({
						x1: fromNode.x,
						y1: fromNode.y,
						x2: toNode.x,
						y2: toNode.y,
						travDx,
						travDy
					});
				}
			}
			for (const edge of routeGraphEdges) {
				const srcSeg = routeGraphSegments[edge.sourceSegmentIndex] || null;
				if (srcSeg && srcSeg.componentId && srcSeg.role === "component-main") {
					if (seenComp.has(srcSeg.componentId)) continue;
					seenComp.add(srcSeg.componentId);
					const componentId = srcSeg.componentId;
					const componentR = isBranchSwitch(componentId)
						? componentIntrinsicResistance(componentId)
						: componentResistance(componentId);
					totalR += Math.max(0, componentR);
					const riseEmf = Number.isFinite(componentEmf(componentId)) ? (-componentEmf(componentId)) : 0;
					if (Math.abs(riseEmf) > 1e-12) {
						const travDx = edge.x2 - edge.x1;
						const travDy = edge.y2 - edge.y1;
						const segDx = srcSeg.x2 - srcSeg.x1;
						const segDy = srcSeg.y2 - srcSeg.y1;
						const dot = travDx * segDx + travDy * segDy;
						const traversalSign = dot >= 0 ? 1 : -1;
						totalE += riseEmf * traversalSign;
					}
					continue;
				}

				if (srcSeg && srcSeg.componentId && srcSeg.role === "switch-blade") {
					if (seenSwitchBlade.has(srcSeg.componentId)) continue;
					seenSwitchBlade.add(srcSeg.componentId);
					if (isComponentSwitchClosed(srcSeg.componentId)) {
						const bladeLen = Math.hypot(srcSeg.x2 - srcSeg.x1, srcSeg.y2 - srcSeg.y1);
						totalR += Math.max(0, bladeLen * SHORT_WIRE_R_PER_PIXEL);
					} else {
						totalR += Math.max(0, componentIntrinsicResistance(srcSeg.componentId));
					}
					continue;
				}

				const baseLen = Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1);
				if (!(baseLen > 0)) continue;
				const nodeA = routeGraphForSections.nodeByKey && routeGraphForSections.nodeByKey.get(edge.nodeA);
				const nodeB = routeGraphForSections.nodeByKey && routeGraphForSections.nodeByKey.get(edge.nodeB);
				const edgeOrientationAtNode = (node, other) => {
					if (!node || !other) return null;
					const dx = other.x - node.x;
					const dy = other.y - node.y;
					return Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
				};
				const nodeIsCornerOrMultiJunction = (nodeKey, node) => {
					if (!node) return false;
					const incident = routeGraphForSections.adjacency && routeGraphForSections.adjacency.get(nodeKey)
						? routeGraphForSections.adjacency.get(nodeKey)
						: [];
					if (incident.length > 2) return true;
					if (incident.length !== 2) return false;
					const e1 = routeGraphForSections.edges[incident[0]];
					const e2 = routeGraphForSections.edges[incident[1]];
					const n1 = routeGraphForSections.nodeByKey.get(e1.nodeA === nodeKey ? e1.nodeB : e1.nodeA);
					const n2 = routeGraphForSections.nodeByKey.get(e2.nodeA === nodeKey ? e2.nodeB : e2.nodeA);
					const o1 = edgeOrientationAtNode(node, n1);
					const o2 = edgeOrientationAtNode(node, n2);
					return !!(o1 && o2 && o1 !== o2);
				};
				let trim = 0;
				if (nodeIsCornerOrMultiJunction(edge.nodeA, nodeA)) trim += GRAPH_PATH_HALF_WIDTH;
				if (nodeIsCornerOrMultiJunction(edge.nodeB, nodeB)) trim += GRAPH_PATH_HALF_WIDTH;
				totalR += Math.max(0, (baseLen - trim) * SHORT_WIRE_R_PER_PIXEL);
			}
			const loopR = Math.max(1e-12, totalR);
			graphRouteRows = [{
				from: "J1",
				to: "J1",
				R: loopR,
				E: totalE,
				parts: loopParts,
				routeKey: "J1|J1",
				routeIndex: 0,
				isGraphRoute: true,
				isSeriesFallback: true,
				noCycleTraversal: !hasCycleTraversal
			}];
		}

		const solveJunctionNetwork = (rows) => {
			if (!rows || rows.length === 0) return null;
			const allNodes = new Set();
			for (const r of rows) {
				if (r.from && r.from !== "?") allNodes.add(r.from);
				if (r.to && r.to !== "?") allNodes.add(r.to);
			}
			if (allNodes.size < 2) return null;
			const emfRow = rows.find((r) => Math.abs(Number.isFinite(r.E) ? r.E : 0) > 1e-6);
			let groundNode = emfRow ? emfRow.from : [...allNodes][0];
			if (!allNodes.has(groundNode)) groundNode = [...allNodes][0];
			const nodeList = [...allNodes].filter((n) => n !== groundNode);
			const nodeIdx = new Map();
			nodeList.forEach((n, i) => nodeIdx.set(n, i));
			const N = nodeList.length;
			const YMat = Array.from({ length: N }, () => new Array(N).fill(0));
			const bVec = new Array(N).fill(0);
			for (const r of rows) {
				const fr = r.from, to = r.to;
				if (!fr || !to || fr === "?" || to === "?") continue;
				const R = Math.max(1e-9, Number.isFinite(r.R) ? r.R : 1e-9);
				const E = Number.isFinite(r.E) ? r.E : 0;
				const G = 1 / R;
				const fi = fr === groundNode ? -1 : (nodeIdx.has(fr) ? nodeIdx.get(fr) : -2);
				const ti = to === groundNode ? -1 : (nodeIdx.has(to) ? nodeIdx.get(to) : -2);
				if (fi === -2 || ti === -2) continue;
				if (fi >= 0) YMat[fi][fi] += G;
				if (ti >= 0) YMat[ti][ti] += G;
				if (fi >= 0 && ti >= 0) { YMat[fi][ti] -= G; YMat[ti][fi] -= G; }
				// Rise-convention for section EMF: dV(from->to) = E - I*R.
				// Nodal source contribution signs follow I(from->to) = (E + Vf - Vt) / R.
				if (fi >= 0) bVec[fi] -= G * E;
				if (ti >= 0) bVec[ti] += G * E;
			}
			const aug = YMat.map((row, i) => [...row, bVec[i]]);
			for (let col = 0; col < N; col++) {
				let maxRow = col;
				for (let r = col + 1; r < N; r++) {
					if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
				}
				[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
				if (Math.abs(aug[col][col]) < 1e-15) continue;
				for (let r = 0; r < N; r++) {
					if (r === col) continue;
					const f = aug[r][col] / aug[col][col];
					for (let c = col; c <= N; c++) aug[r][c] -= f * aug[col][c];
				}
			}
			const nodeV = new Map([[groundNode, 0]]);
			for (let i = 0; i < N; i++) {
				nodeV.set(nodeList[i], Math.abs(aug[i][i]) > 1e-15 ? aug[i][N] / aug[i][i] : 0);
			}
			const branchResults = rows.map((r) => {
				const Vf = nodeV.has(r.from) ? nodeV.get(r.from) : 0;
				const Vt = nodeV.has(r.to) ? nodeV.get(r.to) : 0;
				const R = Math.max(0, Number.isFinite(r.R) ? r.R : 0);
				const E = Number.isFinite(r.E) ? r.E : 0;
				const I = R > 1e-12 ? (E + Vf - Vt) / R : 0;
				const Vr = -I * R;
				const netPd = Vr + E;
				return { I, Vr, netPd };
			});
			return { nodeV, branchResults };
		};

		const sectionRows = graphRouteRows;
		let networkSolution = null;
		if (sectionRows.length === 1 && sectionRows[0].isSeriesFallback === true) {
			const row = sectionRows[0];
			// If no complete cycle traversal exists, rely on the main matrix current so open-switch
			// behavior stays consistent with the large-resistance model used by the core solver.
			// Otherwise, keep E/R so Kirchhoff table columns remain self-consistent.
			const I = row.noCycleTraversal
				? (Number.isFinite(state.solved.Itotal) ? state.solved.Itotal : 0)
				: (row.R > 1e-12 ? (row.E / row.R) : 0);
			networkSolution = {
				nodeV: new Map([["J1", 0]]),
				branchResults: [{ I, Vr: I * row.R, netPd: 0 }]
			};
		} else {
			networkSolution = solveJunctionNetwork(sectionRows);
		}
		if (!networkSolution) {
			state.solved.kirchhoffSectionData = null;
			return null;
		}

		const visibleResistanceSegments = buildCircuitVoltageSegments(layout);
		const overlap1D = (a1, a2, b1, b2) => {
			const lo = Math.max(Math.min(a1, a2), Math.min(b1, b2));
			const hi = Math.min(Math.max(a1, a2), Math.max(b1, b2));
			return Math.max(0, hi - lo);
		};
		const partOverlapsSegment = (part, seg, eps = 1.25) => {
			if (!part || !seg) return false;
			const pdx = part.x2 - part.x1;
			const pdy = part.y2 - part.y1;
			const sdx = seg.x2 - seg.x1;
			const sdy = seg.y2 - seg.y1;
			const partH = Math.abs(pdx) >= Math.abs(pdy);
			const segH = Math.abs(sdx) >= Math.abs(sdy);
			if (partH !== segH) return false;
			if (partH) {
				if (Math.abs(((part.y1 + part.y2) * 0.5) - ((seg.y1 + seg.y2) * 0.5)) > eps) return false;
				return overlap1D(part.x1, part.x2, seg.x1, seg.x2) > eps;
			}
			if (Math.abs(((part.x1 + part.x2) * 0.5) - ((seg.x1 + seg.x2) * 0.5)) > eps) return false;
			return overlap1D(part.y1, part.y2, seg.y1, seg.y2) > eps;
		};

		const emfIdx = sectionRows.findIndex((r) => Math.abs(Number.isFinite(r.E) ? r.E : 0) > 1e-6);
		if (emfIdx >= 0) {
			const bRes = networkSolution.branchResults[emfIdx];
			if (bRes && Number.isFinite(bRes.I)) {
				state.solved.Itotal = bRes.I;
			}
		}

		if (state.solved.byId) {
			const globallyAssignedComp = new Set();
			const geometryArrowAlignFactor = (row, rowParts, seg) => {
				if (!seg || !Array.isArray(rowParts) || !rowParts.length) return null;
				const segDx = (Number.isFinite(seg.x2) ? seg.x2 : 0) - (Number.isFinite(seg.x1) ? seg.x1 : 0);
				const segDy = (Number.isFinite(seg.y2) ? seg.y2 : 0) - (Number.isFinite(seg.y1) ? seg.y1 : 0);
				if (Math.hypot(segDx, segDy) <= 0.5) return null;
				for (const part of rowParts) {
					if (!partOverlapsSegment(part, seg)) continue;
					const travDx = Number.isFinite(part.travDx) ? part.travDx
						: ((Number.isFinite(part.x2) && Number.isFinite(part.x1)) ? (part.x2 - part.x1) : NaN);
					const travDy = Number.isFinite(part.travDy) ? part.travDy
						: ((Number.isFinite(part.y2) && Number.isFinite(part.y1)) ? (part.y2 - part.y1) : NaN);
					if (!Number.isFinite(travDx) || !Number.isFinite(travDy) || Math.hypot(travDx, travDy) <= 0.5) continue;
					const dot = travDx * segDx + travDy * segDy;
					if (Math.abs(dot) <= 1e-12) continue;
					const dotSign = dot >= 0 ? 1 : -1;
					return -dotSign * (row.sectionFlipped ? -1 : 1);
				}
				return null;
			};
			for (let ri = 0; ri < sectionRows.length; ri++) {
				const row = sectionRows[ri];
				const bRes = networkSolution.branchResults[ri];
				if (!bRes || !Number.isFinite(bRes.I)) continue;
				const sectionI = bRes.I;
				const rowParts = Array.isArray(row.parts) ? row.parts : [];
				if (!rowParts.length) continue;
				const seenComp = new Set();
				for (const seg of visibleResistanceSegments) {
					if (!seg.componentId) continue;
					const isMappedComponentRole = seg.role === "component-main" || seg.role === "switch-blade";
					if (!isMappedComponentRole) continue;
					let hit = false;
					for (const part of rowParts) {
						if (partOverlapsSegment(part, seg)) { hit = true; break; }
					}
					if (!hit) continue;
					if (seenComp.has(seg.componentId)) continue;
					seenComp.add(seg.componentId);
					const cid = seg.componentId;
					if (globallyAssignedComp.has(cid)) continue;
					if (!state.solved.byId[cid]) continue;
					const existingSol = state.solved.byId[cid];
					const cR = componentResistance(cid);
					const cEmf = Number.isFinite(componentEmf(cid)) ? componentEmf(cid) : 0;
					// arrowAlignFactor: multiply sol.I by this before passing to drawCurrentArrow.
					// Convention: effectiveI > 0 ? arrow DOWN; effectiveI < 0 ? arrow UP.
					let arrowAlignFactor = 1;
					if (row.isSeriesFallback) {
						const existingI = existingSol && Number.isFinite(existingSol.I) ? existingSol.I : sectionI;
						const geometryAlign = geometryArrowAlignFactor(row, rowParts, seg);
						if (Number.isFinite(geometryAlign)) {
							arrowAlignFactor = geometryAlign;
						} else {
						const existingDv = existingSol
							&& Number.isFinite(existingSol.Vtop)
							&& Number.isFinite(existingSol.Vbottom)
							? (existingSol.Vbottom - existingSol.Vtop)
							: (existingSol && Number.isFinite(existingSol.V) ? existingSol.V : NaN);
						let desiredEffectiveI = NaN;
						if (Number.isFinite(existingDv) && Math.abs(existingDv) > 1e-12) {
							desiredEffectiveI = (Math.abs(cEmf) > 1e-6) ? existingDv : -existingDv;
						}
						if (Number.isFinite(desiredEffectiveI) && Math.abs(desiredEffectiveI) > 1e-12
							&& Number.isFinite(existingI) && Math.abs(existingI) > 1e-12) {
							arrowAlignFactor = Math.sign(desiredEffectiveI) === Math.sign(existingI) ? 1 : -1;
						} else {
							arrowAlignFactor = (Math.abs(cEmf) > 1e-6) ? -1 : 1;
						}
						}
					} else {
						// Use per-part traversal direction stored in routeParts.
						// travDy < 0: section traversal goes upward through this part.
						// Dot with seg direction (segDy > 0 = normal top-to-bottom component).
						// If sectionFlipped, canonical direction is opposite traversal – negate.
						const segDy = seg.y2 - seg.y1;
						if (Math.abs(segDy) > 0.5) {
							for (const part of rowParts) {
								if (partOverlapsSegment(part, seg)) {
									if (Number.isFinite(part.travDy) && Math.abs(part.travDy) > 0.5) {
										const dotSign = (part.travDy * segDy >= 0) ? 1 : -1;
										arrowAlignFactor = dotSign * (row.sectionFlipped ? -1 : 1);
									}
									break;
								}
							}
						}
					}
					const existingDeltaV = (existingSol
						&& Number.isFinite(existingSol.Vtop)
						&& Number.isFinite(existingSol.Vbottom))
						? (existingSol.Vbottom - existingSol.Vtop)
						: NaN;
					if (row.isSeriesFallback) {
						// Use the Kirchhoff route-graph current (sectionI) so this component's
						// arrow stays consistent with state.solved.Itotal and the bottom wire arrow.
						// The old matrix-solver existingSol.I used a different resistance model
						// (geometric wire length estimates) which diverges for short circuits.
						state.solved.byId[cid].I = sectionI;
						state.solved.byId[cid].V = sectionI * cR - cEmf;
						state.solved.byId[cid].arrowAlignFactor = arrowAlignFactor;
					} else {
						state.solved.byId[cid].I = sectionI;
						state.solved.byId[cid].V = Number.isFinite(existingDeltaV)
							? existingDeltaV
							: (sectionI * cR - cEmf);
						state.solved.byId[cid].arrowAlignFactor = arrowAlignFactor;
					}
					globallyAssignedComp.add(cid);
				}
			}
		}

		state.solved.kirchhoffSectionData = { sectionRows, networkSolution };
		return state.solved.kirchhoffSectionData;
	}

	return {
		applyKirchhoffSectionSolve
	};
}
