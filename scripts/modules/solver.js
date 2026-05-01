export function createCircuitSolver(circuitState, onLegendUpdate, deps) {
const {
componentResistance,
componentIntrinsicResistance,
componentEmf,
componentBodyHeight,
computeLayout,
canvas,
isExtraCell,
getCellRInternal,
isBranchSwitch,
isComponentSwitchClosed,
closedSwitchWireResistance,
isShortCircuitCurrentValue,
solutionHasInfiniteCurrent,
wireResistanceLabelsEnabled,
PRIMARY_CELL_ID,
SWITCH_OPEN_RESISTANCE,
SHORT_WIRE_R_PER_PIXEL,
SHORT_CIRCUIT_CURRENT_THRESHOLD_A,
CONNECTOR_WIRE,
RES_H,
EMF_BODY_HEIGHT,
CELL_PADDING,
END_BUS_CONNECTOR
} = deps;
const state = circuitState;
			class CircuitSolver {
				constructor(circuitState, onLegendUpdate) {
					this.state = circuitState;
					this.onLegendUpdate = onLegendUpdate;
				}

				zeroReadings(emf = 0) {
					const byId = {};
					for (const id of this.state.leftSeries) {
						const R = componentResistance(id);
						const V = 0 * R - componentEmf(id);
						byId[id] = { I: 0, V, R, Vtop: emf, Vbottom: emf + V };
					}
					for (const stage of this.state.stages) {
						for (const branch of stage.branches) {
							for (const id of branch) {
								const R = componentResistance(id);
								const V = 0 * R - componentEmf(id);
								byId[id] = { I: 0, V, R, Vtop: emf, Vbottom: emf + V };
							}
						}
					}
					return byId;
				}

				accumulateBranchModel(branch, resistanceFn) {
					let R = 0;
					let E = 0;
					for (const id of (branch || [])) {
						R += resistanceFn(id);
						E += componentEmf(id);
					}
					return { R, E, effectiveR: Math.max(1e-6, R) };
				}

				branchModel(branch) {
					return this.accumulateBranchModel(branch, componentResistance);
				}

				branchModelIntrinsic(branch) {
					return this.accumulateBranchModel(branch, componentIntrinsicResistance);
				}

				writeBranchReadings(byId, branch, current, startV, resistanceFn = componentResistance) {
					const EPS_R = 1e-9;
					let vNow = startV;
					for (const id of (branch || [])) {
						const R = resistanceFn(id);
						const IRdrop = Number.isFinite(current) ? (current * R) : (R > EPS_R ? (current * R) : 0);
						const Vdrop = IRdrop - componentEmf(id);
						byId[id] = { I: current, V: Vdrop, R, Vtop: vNow, Vbottom: vNow + Vdrop };
						vNow += Vdrop;
					}
					return vNow;
				}

				computeVoltageBounds(seedValues, byId) {
					const finiteSeeds = (seedValues || []).filter((v) => Number.isFinite(v));
					let vMin = finiteSeeds.length ? Math.min(...finiteSeeds) : 0;
					let vMax = Math.max(1e-6, ...(finiteSeeds.length ? finiteSeeds : [0]));
					for (const reading of Object.values(byId || {})) {
						if (!reading) continue;
						if (Number.isFinite(reading.Vtop)) {
							vMin = Math.min(vMin, reading.Vtop);
							vMax = Math.max(vMax, reading.Vtop);
						}
						if (Number.isFinite(reading.Vbottom)) {
							vMin = Math.min(vMin, reading.Vbottom);
							vMax = Math.max(vMax, reading.Vbottom);
						}
					}
					return { vMin, vMax };
				}

				solveBranchCurrent(numerator, branchModel) {
					const EPS_R = 1e-9;
					const EPS_V = 1e-6;
					const R = (branchModel && Number.isFinite(branchModel.R)) ? branchModel.R : 0;
					if (R > EPS_R) return numerator / R;
					if (Math.abs(numerator) <= EPS_V) return 0;
					return numerator > 0 ? Infinity : -Infinity;
				}

				solveStageBranchCurrents(stage, stageEq, Vstage, targetStageCurrent) {
					const EPS_R = 1e-9;
					const EPS_V = 1e-6;
					const branchCurrents = new Array(stage.branches.length).fill(0);
					const unresolvedZeroRBranches = [];
					let hasInfiniteCurrent = false;
					let sumResolvedFinite = 0;

					for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
						const branchModel = stageEq.models[branchIndex];
						const numerator = Vstage + branchModel.E;
						const R = Number.isFinite(branchModel.R) ? branchModel.R : 0;

						if (R > EPS_R) {
							const I = numerator / R;
							branchCurrents[branchIndex] = I;
							sumResolvedFinite += I;
							continue;
						}

							if (row && row.name === "mainSwitch") {
								const rowR = Number.isFinite(row.R) ? Math.max(0, row.R) : 0;
								const rowI = Number.isFinite(row.I) ? row.I : 0;
								let adjR = rowR;
								let toLabel = nodeLabel("N0") || "J?";
								if (stages.length > 0 && Array.isArray(stages[0].branches) && stages[0].branches.length > 1) {
									const y0 = stageEntryTop(0);
									if (y0 !== null) {
										let minX = Infinity;
										for (const b of stages[0].branches) {
											if (Number.isFinite(b.x)) minX = Math.min(minX, b.x);
										}
										if (Number.isFinite(minX)) {
											toLabel = registry.labelAt(minX, y0) || toLabel;
											adjR = Math.max(0, rowR - Math.max(0, layout.xRight - minX) * SHORT_WIRE_R_PER_PIXEL);
										}
									}
								}
								out.push({
									...row,
									name: "mainSwitch_visiblePath",
									fromDisplayLabel: registry.labelAt(layout.xCell, layout.yTop) || "J?",
									toDisplayLabel: toLabel,
									R: adjR,
									E: 0,
									dV: Number.isFinite(row.dV) ? row.dV : (rowI * adjR),
									// Cover the entire top bus (xCell -> topBusRightX) so visibleResistanceForRow
									// picks up all top-bus wire segments including the rightmost split-bus extension.
									segmentGeometry: { x1: layout.xCell, y1: layout.yTop, x2: layout.topBusRightX, y2: layout.yTop }
								});
								continue;
							}
						if (Math.abs(numerator) > EPS_V) {
							const Iinf = numerator > 0 ? Infinity : -Infinity;
							branchCurrents[branchIndex] = Iinf;
							hasInfiniteCurrent = true;
							continue;
						}

						unresolvedZeroRBranches.push(branchIndex);
					}

					if (!hasInfiniteCurrent && unresolvedZeroRBranches.length > 0) {
						const target = Number.isFinite(targetStageCurrent) ? targetStageCurrent : 0;
						const remainder = target - sumResolvedFinite;
						const share = remainder / unresolvedZeroRBranches.length;
						for (const branchIndex of unresolvedZeroRBranches) {
							branchCurrents[branchIndex] = share;
						}
					}

					return { branchCurrents, hasInfiniteCurrent };
				}

				stageEquivalent(stage) {
					const models = stage.branches.map((branch) => this.branchModel(branch));
					const G = models.reduce((sum, m) => sum + (1 / m.effectiveR), 0);
					if (G <= 0) return { Req: 1e9, Eeq: 0, models };
					const Req = 1 / G;
					const Eeq = models.reduce((sum, m) => sum + (m.E / m.effectiveR), 0) * Req;
					return { Req, Eeq, models };
				}

				getSolveLayout() {
					if (this.state.layout) return this.state.layout;
					const rect = canvas.getBoundingClientRect();
					if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
						return null;
					}
					return computeLayout(rect.width, rect.height);
				}

				isSimpleSeriesLayout(layout) {
					if (!layout) return false;
					return (layout.stages || []).every((stage) => stage.branches.length === 1 && stage.branches[0].items.length <= 1);
				}

				primaryCellGeometry(layout) {
					const leftSeriesPathHeight = this.state.leftSeries.reduce((sum, id) => sum + componentBodyHeight(id) + CONNECTOR_WIRE * 2, 0);
					const totalLeftCellHeight = this.state.internalR
						? (RES_H + EMF_BODY_HEIGHT + CONNECTOR_WIRE * 4 + CELL_PADDING)
						: (EMF_BODY_HEIGHT + CONNECTOR_WIRE * 2);
					const totalLeftComponentHeight = totalLeftCellHeight + leftSeriesPathHeight;
					const leftExtra = Math.max(0, (layout.yBottom - layout.yTop) - (totalLeftComponentHeight + END_BUS_CONNECTOR * 2));
					const topEndLead = END_BUS_CONNECTOR + leftExtra * 0.5;
					const componentStartY = Number.isFinite(layout.leftCellStartY) ? layout.leftCellStartY : (layout.yTop + topEndLead + leftSeriesPathHeight);
					const irTop = componentStartY + CONNECTOR_WIRE;
					const irBottom = irTop + RES_H;
					const emfTop = this.state.internalR ? (irBottom + CONNECTOR_WIRE * 2) : (componentStartY + CONNECTOR_WIRE);
					const emfBottom = emfTop + EMF_BODY_HEIGHT;
					const secondBottomPlateY = emfBottom;
					return {
						componentStartY,
						topPlateY: emfTop,
						bottomPlateY: secondBottomPlateY,
						emfConnectorBottomY: emfBottom + CONNECTOR_WIRE,
						emfPaddingBottomY: emfBottom + CONNECTOR_WIRE + (this.state.internalR ? CELL_PADDING : 0)
					};
				}

				primaryCellPlateVoltages(byId, fallbackTopV, fallbackBottomV) {
					const primaryLeftCellId = (this.state.leftSeries || []).find((id) => isExtraCell(id)) || PRIMARY_CELL_ID;
					const sol = byId && byId[primaryLeftCellId];
					if (!sol) {
						return {
							cellTopPlateV: fallbackTopV,
							cellBottomPlateV: fallbackBottomV
						};
					}
					const topV = Number.isFinite(sol.Vtop) ? sol.Vtop : fallbackTopV;
					const bottomV = Number.isFinite(sol.Vbottom) ? sol.Vbottom : fallbackBottomV;
					const current = Number.isFinite(sol.I) ? sol.I : 0;
					const rInternal = this.state.internalR ? getCellRInternal(primaryLeftCellId) : 0;
					return {
						cellTopPlateV: topV + current * rInternal,
						cellBottomPlateV: bottomV
					};
				}

				applyShortSwitchResistanceReadout(solution, flaggedIds) {
					if (!solution || !solution.byId) return;
					const useAllClosedSwitches = !(flaggedIds instanceof Set);
					for (const [id, reading] of Object.entries(solution.byId)) {
						if (!reading || !isBranchSwitch(id) || !isComponentSwitchClosed(id)) continue;
						if (!useAllClosedSwitches && !flaggedIds.has(id)) continue;
						reading.R = closedSwitchWireResistance(id);
					}
				}

				rebaseSolutionPotentialsToZero(solution) {
					if (!solution || !solution.byId) return solution;
					const finite = [];
					for (const reading of Object.values(solution.byId || {})) {
						if (!reading) continue;
						if (Number.isFinite(reading.Vtop)) finite.push(reading.Vtop);
						if (Number.isFinite(reading.Vbottom)) finite.push(reading.Vbottom);
					}
					if (Array.isArray(solution.stageNodeV)) {
						for (const v of solution.stageNodeV) {
							if (Number.isFinite(v)) finite.push(v);
						}
					}
					const scalarKeys = [
						"Vext",
						"switchVLeft",
						"switchVRight",
						"leftTopV",
						"bottomRightV",
						"cellTopPlateV",
						"cellBottomPlateV"
					];
					for (const key of scalarKeys) {
						if (Number.isFinite(solution[key])) finite.push(solution[key]);
					}

					if (!finite.length) return solution;
					const minV = Math.min(...finite);
					if (!Number.isFinite(minV) || Math.abs(minV) <= 1e-12) {
						const boundsNoShift = this.computeVoltageBounds(finite, solution.byId);
						solution.vMin = boundsNoShift.vMin;
						solution.vMax = boundsNoShift.vMax;
						return solution;
					}

					for (const reading of Object.values(solution.byId || {})) {
						if (!reading) continue;
						if (Number.isFinite(reading.Vtop)) reading.Vtop -= minV;
						if (Number.isFinite(reading.Vbottom)) reading.Vbottom -= minV;
					}
					if (Array.isArray(solution.stageNodeV)) {
						solution.stageNodeV = solution.stageNodeV.map((v) => Number.isFinite(v) ? (v - minV) : v);
					}
					for (const key of scalarKeys) {
						if (Number.isFinite(solution[key])) solution[key] -= minV;
					}

					const shiftedSeeds = [];
					if (Array.isArray(solution.stageNodeV)) {
						for (const v of solution.stageNodeV) {
							if (Number.isFinite(v)) shiftedSeeds.push(v);
						}
					}
					for (const key of scalarKeys) {
						if (Number.isFinite(solution[key])) shiftedSeeds.push(solution[key]);
					}
					const bounds = this.computeVoltageBounds(shiftedSeeds, solution.byId);
					solution.vMin = bounds.vMin;
					solution.vMax = bounds.vMax;
					return solution;
				}

				finalizeSolvedSolution(solution) {
					if (!solution || !solution.byId) return solution;
					if (solution.shortAdjustedFromIdeal === true && Array.isArray(solution.idealShortSwitchSectionIds)) {
						for (const id of solution.idealShortSwitchSectionIds) {
							const reading = solution.byId[id];
							if (!reading) continue;
							const sign = Number.isFinite(reading.I) ? (reading.I < 0 ? -1 : 1) : 1;
							reading.I = sign < 0 ? -Infinity : Infinity;
							reading.shortCircuitSection = true;
						}
					}
					const shortCircuitSectionIds = [];
					const shortCircuitIdSet = new Set();
					for (const [id, reading] of Object.entries(solution.byId)) {
						if (!reading) continue;
						const shortSection = isShortCircuitCurrentValue(reading.I);
						reading.shortCircuitSection = shortSection;
						if (shortSection) {
							shortCircuitSectionIds.push(id);
							shortCircuitIdSet.add(id);
						}
					}
					solution.shortCircuitSectionIds = shortCircuitSectionIds;
					solution.shortCircuitCurrentThresholdA = SHORT_CIRCUIT_CURRENT_THRESHOLD_A;
					const mainLoopShort = isShortCircuitCurrentValue(solution.Itotal);
					solution.mainLoopShortCircuit = mainLoopShort;
					const hasShortSections = shortCircuitSectionIds.length > 0;
					const computedShortCircuit = mainLoopShort || hasShortSections;
					if (computedShortCircuit) solution.hasInfiniteCurrent = true;
					if (solution.shortAdjustedFromIdeal === true && shortCircuitSectionIds.length > 0) solution.hasInfiniteCurrent = true;
					solution.isShortCircuit = computedShortCircuit;
					if (shortCircuitSectionIds.some((id) => isBranchSwitch(id) && isComponentSwitchClosed(id))) {
						this.applyShortSwitchResistanceReadout(solution, shortCircuitIdSet);
					}
					return this.rebaseSolutionPotentialsToZero(solution);
				}

				buildSingularMatrixDiagnosticSolution() {
					const byId = this.zeroReadings(0);
					const stageNodeV = new Array(this.state.stages.length + 1).fill(0);
					const Itotal = 0;
					const { cellTopPlateV, cellBottomPlateV } = this.primaryCellPlateVoltages(byId, 0, 0);
					return {
						byId,
						Itotal,
						hasInfiniteCurrent: false,
						matrixSolveFailed: true,
						stageNodeV,
						Vext: 0,
						switchVLeft: 0,
						switchVRight: stageNodeV[0] || 0,
						cellTopPlateV,
						cellBottomPlateV,
						vMin: 0,
						vMax: 1e-6
					};
				}

				getIdealShortSwitchSectionIds() {
					const EPS_R = 1e-9;
					const EPS_V = 1e-6;
					const ids = new Set();
					for (const stage of this.state.stages || []) {
						for (const branch of (stage && stage.branches) || []) {
							const model = this.branchModelIntrinsic(branch || []);
							const isIdealShortBranch = model.R <= EPS_R && Math.abs(model.E) <= EPS_V;
							if (!isIdealShortBranch) continue;
							for (const id of branch || []) {
								if (isBranchSwitch(id) && isComponentSwitchClosed(id)) ids.add(id);
							}
						}
					}
					return ids;
				}

				estimateMainSwitchWireResistance() {
					return Math.max(1e-9, 32 * SHORT_WIRE_R_PER_PIXEL);
				}



				resolveTopBusEndX(layout) {
					if (!layout) return 0;
					return Number.isFinite(layout.topBusRightX) ? layout.topBusRightX : layout.xRight;
				}

				resolveBottomBusEndX(layout) {
					if (!layout) return 0;
					return Number.isFinite(layout.bottomBusRightX) ? layout.bottomBusRightX : layout.xRight;
				}

				rightRailLength(layout) {
					if (!layout) return 0;
					return Math.max(0, layout.yBottom - layout.yTop);
				}

				leftRailLength(layout) {
					if (!layout) return 0;
					let leftVerticalLen = this.rightRailLength(layout);
					if ((layout.leftSeriesItems || []).length > 0) {
						let runY = layout.yTop;
						leftVerticalLen = 0;
						for (const item of layout.leftSeriesItems) {
							leftVerticalLen += Math.max(0, item.top - runY);
							runY = item.bottom;
						}
						leftVerticalLen += Math.max(0, layout.yBottom - runY);
					}
					return leftVerticalLen;
				}

				estimateMainSwitchPathWireResistance() {
					const layout = this.getSolveLayout();
					if (!layout) return this.estimateMainSwitchWireResistance();
					const topLeftLen = Math.max(0, (layout.xSwitch - 16) - layout.xCell);
					const bladeLen = state.switchClosed ? 32 : Math.hypot(30, 14);
					const topBusEndX = this.resolveTopBusEndX(layout);
					const topRightLen = Math.max(0, topBusEndX - (layout.xSwitch + 16));
					return Math.max(1e-12, (topLeftLen + bladeLen + topRightLen) * SHORT_WIRE_R_PER_PIXEL);
				}

				estimateBottomBusWireResistance() {
					const layout = this.getSolveLayout();
					if (!layout) return Math.max(1e-12, 120 * SHORT_WIRE_R_PER_PIXEL);
					const bottomEndX = this.resolveBottomBusEndX(layout);
					const bottomLen = Math.max(0, Math.abs(bottomEndX - layout.xCell));
					return Math.max(1e-12, bottomLen * SHORT_WIRE_R_PER_PIXEL);
				}

				estimateRightRailCommonWireResistance(stageCount) {
					const layout = this.getSolveLayout();
					if (!layout) return Math.max(1e-12, 80 * SHORT_WIRE_R_PER_PIXEL);
					if (stageCount <= 0) {
						return Math.max(1e-12, this.rightRailLength(layout) * SHORT_WIRE_R_PER_PIXEL);
					}
					let totalLen = 0;
					let currentY = layout.yTop;
					for (const stage of (layout.stages || [])) {
						const isTopBoundaryStage = stage.index === 0;
						const isBottomBoundaryStage = stage.index === (layout.stages.length - 1);
						const stageEntryTop = isTopBoundaryStage ? layout.yTop : stage.junctionTop;
						const stageExitBottom = isBottomBoundaryStage ? layout.yBottom : stage.junctionBottom;
						if (currentY < stageEntryTop - 1e-6) totalLen += (stageEntryTop - currentY);
						currentY = stageExitBottom;
					}
					if (currentY < layout.yBottom - 1e-6) totalLen += (layout.yBottom - currentY);
					return Math.max(1e-12, totalLen * SHORT_WIRE_R_PER_PIXEL);
				}

				estimateNoStageRightAndBottomWireResistance() {
					const layout = this.getSolveLayout();
					if (!layout) return Math.max(1e-12, 180 * SHORT_WIRE_R_PER_PIXEL);
					const rightVerticalLen = this.rightRailLength(layout);
					const bottomLen = Math.max(0, Math.abs(this.resolveBottomBusEndX(layout) - layout.xCell));
					return Math.max(1e-12, (rightVerticalLen + bottomLen) * SHORT_WIRE_R_PER_PIXEL);
				}

				estimateCommonLoopWireResistance(stageCount) {
					const leftRailR = this.estimateLeftRailWireResistance();
					if (stageCount <= 0) return leftRailR;
					return leftRailR + this.estimateBottomBusWireResistance() + this.estimateRightRailCommonWireResistance(stageCount);
				}

				estimateStageBranchConnectorWireResistance(stageIndex, branchIndex) {
					const lengths = this.getStageBranchWireLengths(stageIndex, branchIndex);
					const betweenLen = lengths.between.reduce((sum, len) => sum + len, 0);
					const connectorLen = lengths.topBus + lengths.topLead + betweenLen + lengths.bottomLead + lengths.bottomBus;
					return Math.max(1e-12, connectorLen * SHORT_WIRE_R_PER_PIXEL);
				}

				estimateStageBranchWireResistance(stageIndex, branchIndex) {
					const lengths = this.getStageBranchWireLengths(stageIndex, branchIndex);
					return Math.max(1e-9, lengths.total * SHORT_WIRE_R_PER_PIXEL);
				}

				getStageBranchWireLengths(stageIndex, branchIndex) {
					const layout = this.getSolveLayout();
					if (!layout || !layout.stages || !layout.stages[stageIndex]) {
						const fallbackTopBus = 0;
						const fallbackTopLead = CONNECTOR_WIRE;
						const fallbackBottomLead = CONNECTOR_WIRE;
						const fallbackBottomBus = 0;
						const fallbackBodyById = {};
						const stage = this.state.stages[stageIndex];
						const branch = stage && stage.branches ? (stage.branches[branchIndex] || []) : [];
						for (const id of branch) fallbackBodyById[id] = RES_H;
						const total = fallbackTopBus + fallbackTopLead + fallbackBottomLead + fallbackBottomBus
							+ Object.values(fallbackBodyById).reduce((a, b) => a + b, 0);
						return {
							topBus: fallbackTopBus,
							topLead: fallbackTopLead,
							between: [],
							bodyById: fallbackBodyById,
							bottomLead: fallbackBottomLead,
							bottomBus: fallbackBottomBus,
							total
						};
					}
					const stageLayout = layout.stages[stageIndex];
					const branchLayout = stageLayout.branches && stageLayout.branches[branchIndex];
					const branchX = branchLayout && Number.isFinite(branchLayout.x) ? branchLayout.x : layout.xRight;
					const items = branchLayout && Array.isArray(branchLayout.items) ? branchLayout.items : [];
					const topBus = Math.max(0, Math.abs(branchX - layout.xRight));
					const bottomBus = Math.max(0, Math.abs(branchX - layout.xRight));
					let topLead = 0;
					let bottomLead = 0;
					const between = [];
					const bodyById = {};

					if (items.length > 0) {
						topLead = Math.max(0, items[0].top - stageLayout.junctionTop);
						bottomLead = Math.max(0, stageLayout.junctionBottom - items[items.length - 1].bottom);
						for (let i = 0; i < items.length; i++) {
							const item = items[i];
							bodyById[item.id] = Math.max(0, item.bottom - item.top);
							if (i < items.length - 1) {
								between.push(Math.max(0, items[i + 1].top - item.bottom));
							}
						}
					} else {
						topLead = Math.max(0, stageLayout.junctionBottom - stageLayout.junctionTop);
					}

					const total = topBus + topLead + bottomLead + bottomBus
						+ between.reduce((sum, len) => sum + len, 0)
						+ Object.values(bodyById).reduce((sum, len) => sum + len, 0);

					return { topBus, topLead, between, bodyById, bottomLead, bottomBus, total: Math.max(1e-9, total) };
				}

				fallbackZeroResistanceSolution(netEmf) {
					const byId = {};
					let leftRunV = 0;
					for (const id of this.state.leftSeries) {
						const R = componentResistance(id);
						const Vdrop = -componentEmf(id);
						byId[id] = { I: 0, V: Vdrop, R, Vtop: leftRunV, Vbottom: leftRunV + Vdrop };
						leftRunV += Vdrop;
					}
					const stageNodeV = [0];
					let runV = 0;
					const stageCount = Math.max(1, this.state.stages.length);
					const stageDrop = netEmf / stageCount;
					for (let stageIndex = 0; stageIndex < this.state.stages.length; stageIndex++) {
						const stage = this.state.stages[stageIndex];
						const stageTopV = runV;
						const stageBottomV = stageTopV + stageDrop;
						for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
							const branch = stage.branches[branchIndex];
							let vNow = stageTopV;
							const branchDrop = stageDrop / Math.max(1, branch.length);
							for (const id of branch) {
								const R = componentResistance(id);
								byId[id] = { I: 0, V: branchDrop, R, Vtop: vNow, Vbottom: vNow + branchDrop };
								vNow += branchDrop;
							}
						}
						runV = stageBottomV;
						stageNodeV.push(runV);
					}
					let vMin = Math.min(0, leftRunV, runV);
					let vMax = Math.max(1e-6, leftRunV, runV);
					for (const reading of Object.values(byId)) {
						if (!reading) continue;
						vMin = Math.min(vMin, reading.Vtop, reading.Vbottom);
						vMax = Math.max(vMax, reading.Vtop, reading.Vbottom);
					}
					const { cellTopPlateV, cellBottomPlateV } = this.primaryCellPlateVoltages(byId, 0, runV);
					return {
						byId,
						Itotal: 0,
						isShortCircuit: true,
						hasInfiniteCurrent: true,
						forceInfiniteAllCurrents: true,
						zeroResistanceWithEMF: true,
						stageNodeV,
						Vext: runV,
						switchVLeft: 0,
						switchVRight: stageNodeV[0] || 0,
						leftTopV: 0,
						bottomRightV: runV,
						cellTopPlateV,
						cellBottomPlateV,
						vMin,
						vMax
					};
				}

				buildOpenSwitchSolution() {
					const byId = {};
					let hasInfiniteCurrent = false;
					const leftRunV = this.writeBranchReadings(byId, this.state.leftSeries, 0, 0);

					const stageEquivalents = this.state.stages.map((stage) => this.stageEquivalent(stage));
					const openCircuitDrops = [];
					let rightOpenDrop = 0;
					for (const stageEq of stageEquivalents) {
						const Vstage = -stageEq.Eeq;
						openCircuitDrops.push(Vstage);
						rightOpenDrop += Vstage;
					}

					const switchVRight = leftRunV - rightOpenDrop;
					const stageNodeV = [switchVRight];
					let runV = switchVRight;

					for (let stageIndex = 0; stageIndex < this.state.stages.length; stageIndex++) {
						const stage = this.state.stages[stageIndex];
						const stageEq = stageEquivalents[stageIndex];
						const Vstage = openCircuitDrops[stageIndex];
						const stageTopV = runV;
						const stageBottomV = stageTopV + Vstage;
						const stageSolved = this.solveStageBranchCurrents(stage, stageEq, Vstage, 0);
						if (stageSolved.hasInfiniteCurrent) hasInfiniteCurrent = true;
						for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
							const branch = stage.branches[branchIndex];
							const Ibranch = stageSolved.branchCurrents[branchIndex];
							this.writeBranchReadings(byId, branch, Ibranch, stageTopV);
						}
						runV = stageBottomV;
						stageNodeV.push(runV);
					}

					const { vMin, vMax } = this.computeVoltageBounds([0, leftRunV, switchVRight, runV], byId);
					const { cellTopPlateV, cellBottomPlateV } = this.primaryCellPlateVoltages(byId, 0, leftRunV);

					return {
						byId,
						Itotal: 0,
						hasInfiniteCurrent,
						stageNodeV,
						Vext: leftRunV,
						switchVLeft: 0,
						switchVRight,
						bottomRightV: nodeV.B,
						cellTopPlateV,
						cellBottomPlateV,
						vMin,
						vMax
					};
				}

				buildZeroResistanceSolution(netEmf, stageEquivalents) {
					const layout = this.getSolveLayout();
					if (!this.isSimpleSeriesLayout(layout) || this.state.internalR) {
						return this.fallbackZeroResistanceSolution(netEmf);
					}

					const byId = {};
					const stageNodeV = new Array(this.state.stages.length + 1).fill(0);
					const rightItems = (layout.stages || []).map((stage) => stage.branches[0].items[0]).filter(Boolean);

					// Cell1 (PRIMARY_CELL_ID) is already in leftSeriesItems — do NOT double-count it
					const leftComponentDrops = (layout.leftSeriesItems || []).reduce((sum, item) => sum + (-componentEmf(item.id)), 0);
					const rightTraversalDrops = rightItems.reduce((sum, item) => sum + componentEmf(item.id), 0);
					const totalComponentTraversalDrop = leftComponentDrops + rightTraversalDrops;

					const topLeftLen = Math.max(0, (layout.xSwitch - 16) - layout.xCell);
					const switchLen = 32;
					const topRightLen = Math.max(0, layout.xRight - (layout.xSwitch + 16));
					const bottomLen = Math.max(0, layout.xRight - layout.xCell);

					let totalWireLength = topLeftLen + switchLen + topRightLen + bottomLen;
					let runY = layout.yTop;
					for (const item of (layout.leftSeriesItems || [])) {
						totalWireLength += Math.max(0, item.top - runY);
						runY = item.bottom;
					}
					// Wire from last left series item (or yTop) straight to bottom corner
					totalWireLength += Math.max(0, layout.yBottom - runY);

					let rightY = layout.yBottom;
					for (let index = rightItems.length - 1; index >= 0; index--) {
						const item = rightItems[index];
						totalWireLength += Math.max(0, rightY - item.bottom);
						totalWireLength += Math.max(0, item.top - layout.stages[index].junctionTop);
						rightY = layout.stages[index].junctionTop;
					}

					const wireDeltaPerPixel = totalWireLength > 1e-6 ? (-totalComponentTraversalDrop / totalWireLength) : 0;
					const pseudoCurrent = wireDeltaPerPixel / SHORT_WIRE_R_PER_PIXEL;

					const applyWireDelta = (length) => wireDeltaPerPixel * Math.max(0, length);

					let leftTopV = 0;
					let vNow = leftTopV;
					let leftY = layout.yTop;
					for (const item of (layout.leftSeriesItems || [])) {
						vNow += applyWireDelta(item.top - leftY);
						const topV = vNow;
						const Vdrop = -componentEmf(item.id);
						const bottomV = topV + Vdrop;
						byId[item.id] = { I: -pseudoCurrent, V: Vdrop, R: componentResistance(item.id), Vtop: topV, Vbottom: bottomV };
						vNow = bottomV;
						leftY = item.bottom;
					}
					// Wire from last left series item straight to bottom corner
					vNow += applyWireDelta(layout.yBottom - leftY);
					const Vext = vNow;

					const { cellTopPlateV, cellBottomPlateV } = this.primaryCellPlateVoltages(byId, leftTopV, Vext);

					vNow += applyWireDelta(bottomLen);
					const bottomRightV = vNow;
					stageNodeV[this.state.stages.length] = bottomRightV;

					let currentBottomV = bottomRightV;
					let currentBottomY = layout.yBottom;
					for (let stageIndex = this.state.stages.length - 1; stageIndex >= 0; stageIndex--) {
						const stageLayout = layout.stages[stageIndex];
						const item = stageLayout.branches[0].items[0];
						currentBottomV += applyWireDelta(currentBottomY - item.bottom);
						const itemBottomV = currentBottomV;
						const drawVdrop = -componentEmf(item.id);
						const itemTopV = itemBottomV - drawVdrop;
						byId[item.id] = { I: pseudoCurrent, V: drawVdrop, R: componentResistance(item.id), Vtop: itemTopV, Vbottom: itemBottomV };
						currentBottomV = itemTopV + applyWireDelta(item.top - stageLayout.junctionTop);
						stageNodeV[stageIndex] = currentBottomV;
						currentBottomY = stageLayout.junctionTop;
					}

					let topRightNodeV = stageNodeV[0] || currentBottomV;
					const switchVRight = topRightNodeV + applyWireDelta(topRightLen);
					const switchVLeft = switchVRight + applyWireDelta(switchLen);
					const closedLoopV = switchVLeft + applyWireDelta(topLeftLen);

					let vMin = Math.min(leftTopV, Vext, bottomRightV, topRightNodeV, switchVLeft, switchVRight, closedLoopV, cellTopPlateV);
					let vMax = Math.max(1e-6, leftTopV, Vext, bottomRightV, topRightNodeV, switchVLeft, switchVRight, closedLoopV, cellTopPlateV);
					for (const reading of Object.values(byId)) {
						if (!reading) continue;
						vMin = Math.min(vMin, reading.Vtop, reading.Vbottom);
						vMax = Math.max(vMax, reading.Vtop, reading.Vbottom);
					}

					return {
						byId,
						Itotal: pseudoCurrent,
						isShortCircuit: true,
						hasInfiniteCurrent: true,
						forceInfiniteAllCurrents: true,
						zeroResistanceWithEMF: true,
						stageNodeV,
						Vext,
						switchVLeft,
						switchVRight,
						leftTopV,
						bottomRightV,
						cellTopPlateV,
						cellBottomPlateV,
						vMin,
						vMax
					};
			}

				estimateNoStageWireResistance() {
					const layout = this.getSolveLayout();
					if (!layout) return SHORT_WIRE_R_PER_PIXEL * 200;
					const topLeftLen = Math.max(0, (layout.xSwitch - 16) - layout.xCell);
					const switchLen = 32;
					const topRightLen = Math.max(0, layout.xRight - (layout.xSwitch + 16));
					const rightVerticalLen = this.rightRailLength(layout);
					const bottomLen = Math.max(0, layout.xRight - layout.xCell);
					const leftVerticalLen = this.leftRailLength(layout);
					const totalLen = topLeftLen + switchLen + topRightLen + rightVerticalLen + bottomLen + leftVerticalLen;
					return Math.max(1e-6, totalLen * SHORT_WIRE_R_PER_PIXEL);
				}

				estimateLeftRailWireResistance() {
					const layout = this.getSolveLayout();
					if (!layout) return SHORT_WIRE_R_PER_PIXEL * 120;
					const leftVerticalLen = this.leftRailLength(layout);
					return Math.max(1e-6, leftVerticalLen * SHORT_WIRE_R_PER_PIXEL);
				}

				solveLinearSystem(matrix, rhs) {
					const n = matrix.length;
					if (!Number.isFinite(n) || n <= 0 || rhs.length !== n) return null;
					const A = matrix.map((row) => row.slice());
					const b = rhs.slice();
					const EPS = 1e-12;
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
						if (best <= EPS) return null;
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
							if (Math.abs(factor) <= EPS) continue;
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
						if (Math.abs(pivot) <= EPS) return null;
						x[row] = sum / pivot;
					}
					return x;
				}

				solveWithKirchhoffMatrix() {
					const stageCount = this.state.stages.length;
					const EPS_R = 1e-9;
					const EPS_V = 1e-6;
					const includeWireR = true;
					const elements = [];
					const hasLeftSeriesComponents = (this.state.leftSeries || []).length > 0;
					const commonLoopWireR = includeWireR ? this.estimateCommonLoopWireResistance(stageCount) : 0;
					const leftModel = hasLeftSeriesComponents
						? this.branchModel(this.state.leftSeries || [])
						: { R: 0, E: 0 };
					elements.push({
						name: "left",
						kind: hasLeftSeriesComponents ? "left" : "leftWire",
						from: "A",
						to: "B",
						R: Math.max(1e-12, leftModel.R + commonLoopWireR),
						E: leftModel.E
					});

					elements.push({
						name: "mainSwitch",
						kind: "switch",
						from: "A",
						to: "N0",
						R: this.state.switchClosed
								? (includeWireR
									? this.estimateMainSwitchPathWireResistance()
									: (this.state.useShortSwitchWireResistance ? this.estimateMainSwitchWireResistance() : 0))
								: (SWITCH_OPEN_RESISTANCE + (includeWireR ? this.estimateMainSwitchPathWireResistance() : 0)),
						E: 0
					});

					for (let stageIndex = 0; stageIndex < stageCount; stageIndex++) {
						const stage = this.state.stages[stageIndex];
						const fromNode = `N${stageIndex}`;
						const toNode = (stageIndex === stageCount - 1) ? "B" : `N${stageIndex + 1}`;
						for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
							const branch = stage.branches[branchIndex];
							const intrinsicModel = this.branchModelIntrinsic(branch);
							const isIdealShortBranch = intrinsicModel.R <= EPS_R && Math.abs(intrinsicModel.E) <= EPS_V;
							const baseModel = this.branchModel(branch);
							const branchWireR = includeWireR ? this.estimateStageBranchConnectorWireResistance(stageIndex, branchIndex) : 0;
							const model = (this.state.useShortSwitchWireResistance && isIdealShortBranch && !includeWireR)
								? { R: this.estimateStageBranchWireResistance(stageIndex, branchIndex), E: intrinsicModel.E }
								: { R: baseModel.R + branchWireR, E: baseModel.E };
							elements.push({
								name: `stage_${stageIndex}_branch_${branchIndex}`,
								kind: "stageBranch",
								stageIndex,
								branchIndex,
								from: fromNode,
								to: toNode,
								R: model.R,
								E: model.E
							});
						}
					}

					if (stageCount === 0) {
						elements.push({
							name: "noStageWire",
							kind: "wire",
							from: "N0",
							to: "B",
							R: includeWireR ? this.estimateNoStageRightAndBottomWireResistance() : this.estimateNoStageWireResistance(),
							E: 0
						});
					}

					const nodeNames = ["B"];
					const maxN = Math.max(1, stageCount);
					for (let i = 0; i < maxN; i++) nodeNames.push(`N${i}`);
					const nodeIndex = Object.fromEntries(nodeNames.map((name, idx) => [name, idx]));
					const nodeVarCount = nodeNames.length;
					const elementVarCount = elements.length;
					const unknownCount = nodeVarCount + elementVarCount;

					const matrix = Array.from({ length: unknownCount }, () => new Array(unknownCount).fill(0));
					const rhs = new Array(unknownCount).fill(0);

					for (let rowNode = 0; rowNode < nodeVarCount; rowNode++) {
						const node = nodeNames[rowNode];
						for (let elementIndex = 0; elementIndex < elementVarCount; elementIndex++) {
							const element = elements[elementIndex];
							const currentCol = nodeVarCount + elementIndex;
							if (element.from === node) matrix[rowNode][currentCol] += 1;
							if (element.to === node) matrix[rowNode][currentCol] -= 1;
						}
					}

					for (let elementIndex = 0; elementIndex < elementVarCount; elementIndex++) {
						const row = nodeVarCount + elementIndex;
						const element = elements[elementIndex];
						if (element.from !== "A") {
							const fromCol = nodeIndex[element.from];
							if (Number.isFinite(fromCol)) matrix[row][fromCol] -= 1;
						}
						if (element.to !== "A") {
							const toCol = nodeIndex[element.to];
							if (Number.isFinite(toCol)) matrix[row][toCol] += 1;
						}
						matrix[row][nodeVarCount + elementIndex] -= element.R;
						rhs[row] = -element.E;
					}

					const solutionVec = this.solveLinearSystem(matrix, rhs);
					if (!solutionVec) return null;

					const nodeV = { A: 0 };
					for (const node of nodeNames) {
						nodeV[node] = solutionVec[nodeIndex[node]];
					}

					const currentByElementName = {};
					for (let elementIndex = 0; elementIndex < elementVarCount; elementIndex++) {
						const element = elements[elementIndex];
						currentByElementName[element.name] = solutionVec[nodeVarCount + elementIndex];
					}

					const nodeLabel = (nodeName) => {
						if (nodeName === "A") return "JA";
						if (nodeName === "B") return "JB";
						if (/^N\d+$/.test(nodeName)) return "J" + nodeName;
						return String(nodeName || "?");
					};
					const junctionSectionDebug = elements.map((element) => {
						const fromV = Number.isFinite(nodeV[element.from]) ? nodeV[element.from] : 0;
						const toV = Number.isFinite(nodeV[element.to]) ? nodeV[element.to] : 0;
						const I = currentByElementName[element.name] || 0;
						return {
							name: element.name,
							kind: element.kind,
							stageIndex: Number.isFinite(element.stageIndex) ? element.stageIndex : null,
							branchIndex: Number.isFinite(element.branchIndex) ? element.branchIndex : null,
							from: element.from,
							to: element.to,
							fromLabel: nodeLabel(element.from),
							toLabel: nodeLabel(element.to),
							R: Number.isFinite(element.R) ? element.R : 0,
							I,
							dV: toV - fromV,
							E: Number.isFinite(element.E) ? element.E : 0
						};
					});

					const byId = {};
					const Ileft = currentByElementName.left || 0;
					const leftRunV = this.writeBranchReadings(byId, this.state.leftSeries, Ileft, 0);

					const stageNodeV = [];
					for (let i = 0; i < Math.max(1, stageCount); i++) {
						stageNodeV.push(nodeV[`N${i}`]);
					}
					if (stageCount > 0) {
						for (let i = 1; i <= stageCount - 1; i++) {
							if (i < stageCount) stageNodeV[i] = nodeV[`N${i}`];
						}
						stageNodeV.push(nodeV.B);
					}

					for (let stageIndex = 0; stageIndex < stageCount; stageIndex++) {
						const stage = this.state.stages[stageIndex];
						const stageTopV = nodeV[`N${stageIndex}`];
						const stageBottomV = (stageIndex === stageCount - 1) ? nodeV.B : nodeV[`N${stageIndex + 1}`];
						for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
							const branch = stage.branches[branchIndex];
							const Ibranch = currentByElementName[`stage_${stageIndex}_branch_${branchIndex}`] || 0;
							const intrinsicModel = this.branchModelIntrinsic(branch);
							const isIdealShortBranch = intrinsicModel.R <= EPS_R && Math.abs(intrinsicModel.E) <= EPS_V;
							if (this.state.useShortSwitchWireResistance && isIdealShortBranch) {
								const lens = this.getStageBranchWireLengths(stageIndex, branchIndex);
								const wireDrop = (len) => Ibranch * (len * SHORT_WIRE_R_PER_PIXEL);
								let vNow = stageTopV;
								vNow += wireDrop(lens.topBus);
								vNow += wireDrop(lens.topLead);
								for (let i = 0; i < branch.length; i++) {
									const id = branch[i];
									const bodyLen = lens.bodyById[id] || componentBodyHeight(id);
									const bodyR = bodyLen * SHORT_WIRE_R_PER_PIXEL;
									const Vdrop = Ibranch * bodyR - componentEmf(id);
									const topV = vNow;
									const bottomV = topV + Vdrop;
									byId[id] = { I: Ibranch, V: Vdrop, R: bodyR, Vtop: topV, Vbottom: bottomV };
									vNow = bottomV;
									if (i < lens.between.length) vNow += wireDrop(lens.between[i]);
								}
								vNow += wireDrop(lens.bottomLead);
								vNow += wireDrop(lens.bottomBus);
								const snapDiff = stageBottomV - vNow;
								if (Math.abs(snapDiff) > 1e-6 && branch.length > 0) {
									const lastId = branch[branch.length - 1];
									if (byId[lastId]) {
										byId[lastId].V += snapDiff;
										byId[lastId].Vbottom += snapDiff;
									}
								}
								continue;
							}

							if (includeWireR) {
								const lens = this.getStageBranchWireLengths(stageIndex, branchIndex);
								const wireDrop = (len) => Ibranch * (len * SHORT_WIRE_R_PER_PIXEL);
								let vNow = stageTopV;
								vNow += wireDrop(lens.topBus);
								vNow += wireDrop(lens.topLead);
								for (let i = 0; i < branch.length; i++) {
									const id = branch[i];
									const R = componentResistance(id);
									const Vdrop = Ibranch * R - componentEmf(id);
									const topV = vNow;
									const bottomV = topV + Vdrop;
									byId[id] = { I: Ibranch, V: Vdrop, R, Vtop: topV, Vbottom: bottomV };
									vNow = bottomV;
									if (i < lens.between.length) vNow += wireDrop(lens.between[i]);
								}
								vNow += wireDrop(lens.bottomLead);
								vNow += wireDrop(lens.bottomBus);
								const snapDiff = stageBottomV - vNow;
								if (Math.abs(snapDiff) > 1e-6 && branch.length > 0) {
									const lastId = branch[branch.length - 1];
									if (byId[lastId]) {
										byId[lastId].V += snapDiff;
										byId[lastId].Vbottom += snapDiff;
									}
								}
								continue;
							}

							let vNow = stageTopV;
							this.writeBranchReadings(byId, branch, Ibranch, stageTopV);
						}
					}

					// Post-process: zero out current for off-route branches when short-adjusted
					if (this.state.useShortSwitchWireResistance) {
						for (let stageIndex = 0; stageIndex < stageCount; stageIndex++) {
							const stage = this.state.stages[stageIndex];
							const stageTopV = nodeV[`N${stageIndex}`];
							const stageBottomV = (stageIndex === stageCount - 1) ? nodeV.B : nodeV[`N${stageIndex + 1}`];
							for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
								const branch = stage.branches[branchIndex];
								const intrinsicModel = this.branchModelIntrinsic(branch);
								const isIdealShortBranch = intrinsicModel.R <= EPS_R && Math.abs(intrinsicModel.E) <= EPS_V;
								if (isIdealShortBranch) continue; // Skip short branches, they're already processed
								
								// For off-route branches: zero current, voltage from junctions
								const junctionVoltage = stageBottomV - stageTopV;
								let vNow = stageTopV;
								const voltage_per_component = branch.length > 0 ? junctionVoltage / branch.length : 0;
								for (const id of branch) {
									const R = componentResistance(id);
									const E = componentEmf(id);
									// With zero current: Vdrop = 0*R - E, but voltage across is determined by junctions
									// Distribute junction voltage evenly across components
									const topV = vNow;
									const bottomV = topV + voltage_per_component;
									byId[id] = { I: 0, V: voltage_per_component, R, Vtop: topV, Vbottom: bottomV };
									vNow = bottomV;
								}
							}
						}
					}

					const switchVRight = nodeV.N0;
					const Vext = nodeV.B;
					const Itotal = -Ileft;
					const layout = this.state.layout;
					const hasLayout = !!layout
						&& Number.isFinite(layout.xCell)
						&& Number.isFinite(layout.xRight)
						&& Number.isFinite(layout.bottomBusRightX);
					const bottomMergeX = hasLayout
						? layout.bottomBusRightX
						: 0;
					const bottomMainLen = hasLayout ? Math.max(0, Math.abs(bottomMergeX - layout.xCell)) : 0;
					const bottomMainR = bottomMainLen * SHORT_WIRE_R_PER_PIXEL;
					const bottomRightV = Vext - Itotal * bottomMainR;
					const { cellTopPlateV, cellBottomPlateV } = this.primaryCellPlateVoltages(byId, 0, Vext);
					const { vMin, vMax } = this.computeVoltageBounds([0, leftRunV, Vext, switchVRight, bottomRightV], byId);

					return {
						byId,
						Itotal,
						hasInfiniteCurrent: false,
						stageNodeV,
						junctionSectionDebug,
						Vext,
						switchVLeft: 0,
						switchVRight,
						bottomRightV,
						cellTopPlateV,
						cellBottomPlateV,
						vMin,
						vMax
					};
				}

				trySolveMatrixWithOptions(includeWireR) {
					this.state.useShortSwitchWireResistance = false;
					const solved = this.solveWithKirchhoffMatrix(includeWireR);
					return solved ? this.finalizeSolvedSolution(solved) : null;
				}

				buildWireResistanceDiagnostic(activeSolution) {
					if (!wireResistanceLabelsEnabled()) return null;
					const withWire = activeSolution || this.trySolveMatrixWithOptions(true);
					const withoutWire = this.trySolveMatrixWithOptions(false);
					if (!withWire || !withoutWire) return null;

					const stageCount = this.state.stages.length;
					let stageConnectorTotal = 0;
					if (stageCount === 0) {
						stageConnectorTotal = this.estimateNoStageRightAndBottomWireResistance();
					} else {
						for (let stageIndex = 0; stageIndex < stageCount; stageIndex++) {
							const stage = this.state.stages[stageIndex];
							for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
								stageConnectorTotal += this.estimateStageBranchConnectorWireResistance(stageIndex, branchIndex);
							}
						}
					}

					const totalWireR = this.estimateCommonLoopWireResistance(stageCount)
						+ this.estimateMainSwitchPathWireResistance()
						+ stageConnectorTotal;
					const iWith = Number.isFinite(withWire.Itotal) ? withWire.Itotal : withWire.Itotal;
					const iWithout = Number.isFinite(withoutWire.Itotal) ? withoutWire.Itotal : withoutWire.Itotal;
					const deltaI = (Number.isFinite(iWith) && Number.isFinite(iWithout)) ? (iWith - iWithout) : NaN;

					return {
						totalWireR,
						iWith,
						iWithout,
						deltaI
					};
				}

			solve() {
					this.state.useShortSwitchWireResistance = false;
					let matrixSolved = this.solveWithKirchhoffMatrix(true);
					if (matrixSolved) {
						let solved = this.finalizeSolvedSolution(matrixSolved);
						this.state.solved = solved;
						this.state.solved.wireResistanceDiagnostic = this.buildWireResistanceDiagnostic(this.state.solved);
						this.onLegendUpdate();
						return;
					}

					let fallbackSolved = null;
					if (!this.state.switchClosed) {
						fallbackSolved = this.buildOpenSwitchSolution();
					} else {
						const stageEquivalents = this.state.stages.map((stage) => this.stageEquivalent(stage));
						const leftModel = this.branchModel(this.state.leftSeries || []);
						const netEmf = stageEquivalents.reduce((sum, stageEq) => sum + stageEq.Eeq, 0) - leftModel.E;
						fallbackSolved = this.buildZeroResistanceSolution(netEmf, stageEquivalents);
						}


						this.state.solved = this.finalizeSolvedSolution(fallbackSolved || this.buildSingularMatrixDiagnosticSolution());
					this.state.solved.wireResistanceDiagnostic = this.buildWireResistanceDiagnostic(this.state.solved);
					this.onLegendUpdate();
				}
			}

return new CircuitSolver(circuitState, onLegendUpdate);
}
