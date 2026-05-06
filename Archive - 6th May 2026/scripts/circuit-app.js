
import { resistorDefs, EXTRA_CELL_IDS, EXTRA_SWITCH_IDS, graphOrientationDefaults, GRAPH_VOLTS_TO_HEIGHT, GRAPH_XY_SCALE_BASE, GRAPH_VERTICAL_MARGIN, GRAPH_AUTO_FIT_SCALE, GRAPH_MIN_AUTO_ZOOM, GRAPH_CIRCUIT_MARGIN, GRAPH_SIDE_MARGIN, GRAPH_PATH_HALF_WIDTH, CONNECTOR_WIRE, BUS_CONNECTOR, END_BUS_CONNECTOR, MAX_PARALLEL_BRANCHES, EMF_BODY_HEIGHT, CELL_PADDING, RES_W, RES_H, RE_LEAD_TOP, RES_LEAD_BOTTOM, RES_PITCH, SERIES_LEAD_BOTTOM, SERIES_PITCH, PARALLEL_GAP, INSERT_RAIL_DIST, STAGE_GAP, PARALLEL_MULTI_STAGE_LEAD_TOP_BOOST, PARALLEL_MULTI_STAGE_LEAD_BOTTOM_BOOST, PARALLEL_PAIR_STAGE_GAP_BOOST, INTERNAL_R_HEIGHT_EXTRA, SINGLE_RESISTOR_INTERNAL_MIN_HEIGHT, NO_INTERNAL_TOP_LAYOUT_GAP_BOOST, COMPONENT_RAMP_OVERSHOOT, INTERNAL_COMBO_CENTER_OFFSET, RESISTOR_VALUE_MIN, RESISTOR_VALUE_MAX, SHORT_WIRE_R_PER_PIXEL, SHORT_CIRCUIT_CURRENT_THRESHOLD_A, HIGH_CURRENT_WARNING_THRESHOLD_A, GRAPH_COMPONENT_MIN_WIDTH_FACTOR, SWITCH_OPEN_RESISTANCE, PRIMARY_CELL_ID, CELL2_ID } from "./modules/constants.js";
import { createInitialState } from "./modules/state.js";
import { CircuitLayoutEngine } from "./modules/layout.js";
import { createCircuitSolver } from "./modules/solver.js";
import { createKirchhoffSolver } from "./modules/kirchhoff-solver.js";

export class CircuitApp {
			constructor() {
			const app = document.getElementById("app");
			const topbar = document.getElementById("topbar");
			const highCurrentWarning = document.getElementById("highCurrentWarning");
			const canvasWrap = document.getElementById("canvasWrap");
			const canvas = document.getElementById("scene");
			const ctx = canvas.getContext("2d");
			const legend = document.getElementById("legend");
			const sideMenuToggle = document.getElementById("sideMenuToggle");
			const sideMenu = document.getElementById("sideMenu");
			const sideMenuClose = document.getElementById("sideMenuClose");
			const componentMenuToggle = document.getElementById("componentMenuToggle");
			const componentMenu = document.getElementById("componentMenu");
			const componentMenuClose = document.getElementById("componentMenuClose");

			const resistorDefs = [
				{ id: "R1", value: 2.5 },
				{ id: "R2", value: 5.0 },
				{ id: "R3", value: 7.5 },
				{ id: "R4", value: 10.0 }
			];

			const ui = Object.fromEntries(resistorDefs.map((r) => [r.id, document.getElementById(r.id)]));
			const intRCheck   = document.getElementById("intR");
			const EXTRA_CELL_IDS = ["Cell1", "Cell2", "Cell3", "Cell4"];
			const EXTRA_SWITCH_IDS = ["S1", "S2", "S3", "S4"];
			const cellChecks = Object.fromEntries(EXTRA_CELL_IDS.map((id) => [id, document.getElementById(id.toLowerCase())]));
			const switchChecks = Object.fromEntries(EXTRA_SWITCH_IDS.map((id) => [id, document.getElementById(id.toLowerCase())]));
			const voltageColorCheck = document.getElementById("voltageColor");
			const potentialGraphCheck = document.getElementById("potentialGraph");
			const invertVoltageAxisCheck = document.getElementById("invertVoltageAxis");
			const debugModeCheck = document.getElementById("debugMode");
			const debugControlsGroup = document.getElementById("debugControlsGroup");
			const debugLabelsCheck = document.getElementById("debugLabels");
			const debugJunctionIdsCheck = document.getElementById("debugJunctionIds");
			const debugNodePotentialsCheck = document.getElementById("debugNodePotentials");
			const wireResLabelsCheck = document.getElementById("wireResLabels");
			const nodesIRLabelsCheck = document.getElementById("nodesIRLabels");
			const potentialGraphChip = document.getElementById("potentialGraphChip");
			const rValueInputs = Object.fromEntries(resistorDefs.map((r) => [r.id, document.getElementById(r.id + "box")]));
			const sliderHitAreas = [];
			const actionHitAreas = [];
			const wireResistanceLabelQueue = [];
			const sliderDragState = { active: false, paramKey: null };
			const graphDragState = {
				active: false,
				lastX: 0,
				lastY: 0,
				mode: "pan",
				rotateLastAngle: NaN,
				rotateLastRadius: 0
			};
			const viewDragState = { active: false, lastRawX: 0, lastRawY: 0 };
			const mainSwitchTapState = { active: false, moved: false, tapStartX: 0, tapStartY: 0, tapThreshold: 4 };
			const touchState = { active: false, isOverGraph: false, lastDistance: 0, firstTouchId: null };
			let wireLabelCounter2D = 0;

			const graphOrientationDefaults = {
				azimuth: 0.900,
				elevation: 1.220,
				roll: -0.110
			};
			const GRAPH_VOLTS_TO_HEIGHT = 14;
			const GRAPH_XY_SCALE_BASE = 1;
			const GRAPH_VERTICAL_MARGIN = 36;
			const GRAPH_AUTO_FIT_SCALE = 0.92;
			const GRAPH_MIN_AUTO_ZOOM = 0.35;
			const GRAPH_CIRCUIT_MARGIN = 40;
			const GRAPH_SIDE_MARGIN = 12;
			const GRAPH_PATH_HALF_WIDTH = 18;
			const GRAPH_INTERACTION_MARGIN = 18;
			const CONNECTOR_WIRE = 18.5;
			const BUS_CONNECTOR = 18.5;
			const END_BUS_CONNECTOR = 18.5;
			const MAX_PARALLEL_BRANCHES = 4;
			const EMF_BODY_HEIGHT = 60;
			const CELL_PADDING = 14;


			const state = {
				stages: [],
				leftSeries: [],
				sortKeys: {},
				layout: null,
				graphTrackGeometry: null,
				drag: null,
				internalR: false,
				voltageColorMode: false,
				potentialGraphMode: false,
				invertVoltageAxis: true,
				debugMode: false,
				debugLabels: false,
				debugJunctionIds: false,
				debugNodePotentials: false,
				wireResistanceLabels: false,
				nodesIRLabels: false,
				sectionColorByPairKey: {},
				sectionHighCurrentPairGeometries: [],
				wireLabelNodePairRows: [],
				graphAzimuth: graphOrientationDefaults.azimuth,
				graphElevation: graphOrientationDefaults.elevation,
				graphRoll: graphOrientationDefaults.roll,
				graphZoom: 1,
				graphPanX: 0,
				graphPanY: 0,
				viewZoom: 1,
				viewPanX: 0,
				viewPanY: 0,
				graphColorScale: { displayMin: 0, displayMax: 1, maxAbs: 1 },
				cellEmfById: { Cell1: 6, Cell2: 6, Cell3: 6, Cell4: 6 },
				cellPolarityById: { Cell1: 1, Cell2: 1, Cell3: 1, Cell4: 1 },
				cellRInternalById: { Cell1: 1, Cell2: 1, Cell3: 1, Cell4: 1 },
				switchClosedById: { MAIN_SWITCH: true, S1: true, S2: true, S3: true, S4: true },
				useShortSwitchWireResistance: false,
				resistorValues: { R1: 2.5, R2: 5.0, R3: 7.5, R4: 10.0 },
				solved: { byId: {}, Itotal: 0, stageNodeV: [0], Vext: 0, switchVLeft: 0, switchVRight: 0, cellTopPlateV: 0, vMin: 0, vMax: 1 }
			};

			const RES_W = 50;
			const RES_H = 90;
			const RE_LEAD_TOP = 37;
			const RES_LEAD_BOTTOM = 37;
			const RES_PITCH = RES_H + RE_LEAD_TOP + RES_LEAD_BOTTOM;
			const SERIES_LEAD_BOTTOM = 37;
			const SERIES_PITCH = RES_H + RE_LEAD_TOP + SERIES_LEAD_BOTTOM;
			const PARALLEL_GAP = 104;
			const INSERT_RAIL_DIST = 90;
			const STAGE_GAP = 37;
			const PARALLEL_MULTI_STAGE_LEAD_TOP_BOOST = 23;
			const PARALLEL_MULTI_STAGE_LEAD_BOTTOM_BOOST = 23;
			const PARALLEL_PAIR_STAGE_GAP_BOOST = 14;
			const INTERNAL_R_HEIGHT_EXTRA = 111;
			const SINGLE_RESISTOR_INTERNAL_MIN_HEIGHT = 200;
			const NO_INTERNAL_TOP_LAYOUT_GAP_BOOST = 14;
			const COMPONENT_RAMP_OVERSHOOT = 8;
			const INTERNAL_COMBO_CENTER_OFFSET = 68.5;
			const RESISTOR_VALUE_MIN = 0.1;
			const RESISTOR_VALUE_MAX = 10;
			const SHORT_WIRE_R_PER_PIXEL = 0.000000001;
			const SHORT_CIRCUIT_CURRENT_THRESHOLD_A = 5;
			const GRAPH_COMPONENT_MIN_WIDTH_FACTOR = 0.10;
			const SWITCH_OPEN_RESISTANCE = 1e9;
			const PRIMARY_CELL_ID = "Cell1";
			const CELL2_ID = "Cell2";
			const CELL_BATTERY_POLARITY_KEYS = Object.fromEntries(EXTRA_CELL_IDS.map((id) => [id, id.toUpperCase() + "_BATTERY_POLARITY"]));
			const CELL_R_INTERNAL_KEYS = Object.fromEntries(EXTRA_CELL_IDS.map((id) => [id, id + "_rInternal"]));
			const CELL_EMF_SLIDER_KEYS = Object.fromEntries(EXTRA_CELL_IDS.map((id) => [id, id.toUpperCase() + "_EMF"]));
			const COMPONENT_SWITCH_TOGGLE_KEYS = Object.fromEntries(EXTRA_SWITCH_IDS.map((id) => [id, id + "_TOGGLE"]));
			const MAIN_SWITCH_ID = "MAIN_SWITCH";

			function clamp(v, min, max) {
				return Math.max(min, Math.min(max, v));
			}

			function isInfiniteCurrentValue(current) {
				return current === Infinity || current === -Infinity;
			}

			function getGraphBaseCenter(layout) {
				if (!layout) return { x: 0, y: 0 };
				if (state.potentialGraphMode) {
					const circuitRightScreenX = layout.circuitRight * state.viewZoom + state.viewPanX;
					const targetScreenX = (circuitRightScreenX + layout.w) * 0.5;
					const targetScreenY = layout.midY;
					const logicalX = (targetScreenX - state.viewPanX) / Math.max(1e-6, state.viewZoom);
					const logicalY = (targetScreenY - state.viewPanY) / Math.max(1e-6, state.viewZoom);
					return { x: logicalX, y: logicalY };
				}
				return {
					x: (layout.circuitRight + layout.w) * 0.5,
					y: layout.midY
				};
			}

			function getGraphCenter(layout) {
				const base = getGraphBaseCenter(layout);
				return {
					x: base.x + state.graphPanX,
					y: base.y + state.graphPanY
				};
			}

			function isShortCircuitCurrentValue(current) {
				return false;
			}

			function getGraphInteractionBounds(layout) {
				if (!layout) return null;
				const projected = computeProjectedGraphBoundsImpl(layout, state.graphZoom);
				if (!projected) return null;
				const graphCenter = getGraphCenter(layout);
				return {
					left: graphCenter.x + projected.minX,
					right: graphCenter.x + projected.maxX,
					top: graphCenter.y + projected.minY,
					bottom: graphCenter.y + projected.maxY
				};
			}

			function isHighCurrentWarning(solution) {
				if (!solution) return false;
				if (Math.abs(solution.Itotal) > HIGH_CURRENT_WARNING_THRESHOLD_A) return true;
				const byId = solution.byId || {};
				for (const reading of Object.values(byId)) {
					if (reading && Number.isFinite(reading.I) && Math.abs(reading.I) > HIGH_CURRENT_WARNING_THRESHOLD_A) return true;
				}
				return false;
			}

			function formatCurrentLabel(current, forceInfinite) {
				if (forceInfinite || isShortCircuitCurrentValue(current)) return "\u221e A";
				const magnitude = Math.abs(Number.isFinite(current) ? current : 0);
				return magnitude.toFixed(2) + " A";
			}

			function formatSignedCurrentLabel(current) {
				if (current === Infinity) return "+\u221e A";
				if (current === -Infinity) return "-\u221e A";
				if (!Number.isFinite(current)) return "n/a";
				const abs = Math.abs(current);
				const sign = current >= 0 ? "+" : "-";
				return sign + abs.toFixed(3) + " A";
			}

			function solutionHasInfiniteCurrent(solution) {
				if (!solution) return false;
				if (solution.hasInfiniteCurrent === true) return true;
				if (isShortCircuitCurrentValue(solution.Itotal)) return true;
				const byId = solution.byId || {};
				for (const reading of Object.values(byId)) {
					if (reading && isShortCircuitCurrentValue(reading.I)) return true;
				}
				return false;
			}

			function enabledIds() {
				const ids = resistorDefs.filter((r) => ui[r.id].checked).map((r) => r.id);
				for (const id of EXTRA_CELL_IDS) {
					if (cellChecks[id] && cellChecks[id].checked) ids.push(id);
				}
				for (const id of EXTRA_SWITCH_IDS) {
					if (switchChecks[id] && switchChecks[id].checked) ids.push(id);
				}
				return ids;
			}

			function resistorValue(id) {
				return Number.isFinite(state.resistorValues[id]) ? state.resistorValues[id] : 2.5;
			}

			function isExtraCell(id) {
				return EXTRA_CELL_IDS.includes(id);
			}

			function isBranchSwitch(id) {
				return EXTRA_SWITCH_IDS.includes(id);
			}

			function isCircuitSwitch(id) {
				return id === MAIN_SWITCH_ID || isBranchSwitch(id);
			}

			function getCellEmf(id) {
				const v = state.cellEmfById[id];
				return Number.isFinite(v) ? v : 6;
			}

			function setDebugControlsVisible(enabled) {
				state.debugMode = !!enabled;
				if (debugControlsGroup) {
					debugControlsGroup.hidden = !enabled;
				}
				if (enabled) return;
				if (debugLabelsCheck) debugLabelsCheck.checked = false;
				if (debugJunctionIdsCheck) debugJunctionIdsCheck.checked = false;
				if (debugNodePotentialsCheck) debugNodePotentialsCheck.checked = false;
				if (wireResLabelsCheck) wireResLabelsCheck.checked = false;
				if (nodesIRLabelsCheck) nodesIRLabelsCheck.checked = false;
				state.debugLabels = false;
				state.debugJunctionIds = false;
				state.debugNodePotentials = false;
				state.wireResistanceLabels = false;
				state.nodesIRLabels = false;
			}

			function getCellPolarity(id) {
				const p = state.cellPolarityById[id];
				return (p === -1) ? -1 : 1;
			}

			function getCellRInternal(id) {
				const r = state.cellRInternalById[id];
				return Number.isFinite(r) ? r : 1;
			}

			function cellEmfSliderKey(id) {
				return CELL_EMF_SLIDER_KEYS[id] || "";
			}

			function cellRInternalSliderKey(id) {
				return CELL_R_INTERNAL_KEYS[id] || "";
			}

			function cellPolarityActionKey(id) {
				return CELL_BATTERY_POLARITY_KEYS[id] || "";
			}

			function componentSwitchToggleActionKey(id) {
				return COMPONENT_SWITCH_TOGGLE_KEYS[id] || "";
			}

			function switchIdFromActionKey(actionKey) {
				for (const id of EXTRA_SWITCH_IDS) {
					if (COMPONENT_SWITCH_TOGGLE_KEYS[id] === actionKey) return id;
				}
				return null;
			}

			function isComponentSwitchClosed(id) {
				if (!isCircuitSwitch(id)) return true;
				const v = state.switchClosedById[id];
				return v !== false;
			}

			function setComponentSwitchClosed(id, closed) {
				if (!isCircuitSwitch(id)) return;
				state.switchClosedById[id] = closed !== false;
			}

			function isOpenBranchSwitch(id) {
				return isBranchSwitch(id) && !isComponentSwitchClosed(id);
			}

			function isNodeToOpenSwitchVoltageSegment(seg) {
				return !!(seg
					&& seg.role === "switch-open-node-wire"
					&& (
						isOpenBranchSwitch(seg.componentId)
						|| (seg.componentId === MAIN_SWITCH_ID && !isComponentSwitchClosed(MAIN_SWITCH_ID))
					));
			}

			function isOpenSwitchGapVoltageSegment(seg) {
				return !!(seg
					&& seg.role === "switch-blade"
					&& seg.isFlatVoltage !== true
					&& (
						(seg.componentId === MAIN_SWITCH_ID && !isComponentSwitchClosed(MAIN_SWITCH_ID))
						|| (seg.componentId && isOpenBranchSwitch(seg.componentId))
					));
			}

			function shouldParticipateInSecondarySolveSegment(seg) {
				if (!seg) return false;
				if (isNodeToOpenSwitchVoltageSegment(seg)) return false;
				if (seg.isFlatVoltage) return false;
				return true;
			}

			function sampleVoltageAlongSegment(seg, t) {
				const v1 = Number.isFinite(seg && seg.v1) ? seg.v1 : 0;
				const v2 = Number.isFinite(seg && seg.v2) ? seg.v2 : v1;
				if (isNodeToOpenSwitchVoltageSegment(seg) || (seg && seg.isFlatVoltage)) return v1;
				const tt = clamp(Number.isFinite(t) ? t : 0, 0, 1);
				return v1 + (v2 - v1) * tt;
			}

			function internalResistanceLabel(cellId) {
				const match = String(cellId || "").match(/\d+/);
				if (!match) return "r";
				return "r" + String(Number(match[0]));
			}

			function cellIdFromSliderKey(paramKey, keyMap) {
				for (const id of EXTRA_CELL_IDS) {
					if (keyMap[id] === paramKey) return id;
				}
				return null;
			}

			function defaultSortKey(id) {
				if (isExtraCell(id)) return 996 + EXTRA_CELL_IDS.indexOf(id);
				if (isBranchSwitch(id)) return 1096 + EXTRA_SWITCH_IDS.indexOf(id);
				const n = Number(String(id).slice(1));
				return Number.isFinite(n) ? n : 500;
			}

			function componentSortKey(id) {
				return Number.isFinite(state.sortKeys[id]) ? state.sortKeys[id] : defaultSortKey(id);
			}

			function closedSwitchWireResistance(id) {
				const fullSwitchLength = Math.max(0, componentBodyHeight(id));
				return SHORT_WIRE_R_PER_PIXEL * fullSwitchLength;
			}

			function componentResistance(id) {
				if (isExtraCell(id)) return state.internalR ? getCellRInternal(id) : 0;
				if (isCircuitSwitch(id)) {
					if (!isComponentSwitchClosed(id)) return SWITCH_OPEN_RESISTANCE;
					return state.useShortSwitchWireResistance
						? closedSwitchWireResistance(id)
						: 0;
				}
				return resistorValue(id);
			}

			function componentIntrinsicResistance(id) {
				if (isExtraCell(id)) return state.internalR ? getCellRInternal(id) : 0;
				if (isCircuitSwitch(id)) return isComponentSwitchClosed(id) ? 0 : SWITCH_OPEN_RESISTANCE;
				return resistorValue(id);
			}

			function componentEmf(id) {
				// Sign is defined for top->bottom traversal; extra cell symbols are '-' on top and '+' on bottom,
				// so each EMF contributes as a rise (negative drop) in the solver's drop convention.
				return isExtraCell(id) ? (-getCellEmf(id) * getCellPolarity(id)) : 0;
			}

			function componentBodyHeight(id) {
				if (isExtraCell(id) && state.internalR) return RES_H + INTERNAL_R_HEIGHT_EXTRA;
				return RES_H;
			}

			function resistorRampWidthFactorById(id) {
				const r = clamp(componentResistance(id), RESISTOR_VALUE_MIN, RESISTOR_VALUE_MAX);
				const span = Math.max(1e-6, RESISTOR_VALUE_MAX - RESISTOR_VALUE_MIN);
				const t = clamp((RESISTOR_VALUE_MAX - r) / span, 0, 1);
				return GRAPH_COMPONENT_MIN_WIDTH_FACTOR + (1 - GRAPH_COMPONENT_MIN_WIDTH_FACTOR) * t;
			}

			function resistorRampHalfWidthById(id) {
				return GRAPH_PATH_HALF_WIDTH * resistorRampWidthFactorById(id);
			}

			function componentGraphHalfWidthById(id) {
				if (isExtraCell(id) || isBranchSwitch(id)) return GRAPH_PATH_HALF_WIDTH;
				return resistorRampHalfWidthById(id);
			}

			function segmentPathHalfWidth(seg) {
				const startWidth = (seg && Number.isFinite(seg.pathHalfWidthStart))
					? clamp(seg.pathHalfWidthStart, GRAPH_PATH_HALF_WIDTH * GRAPH_COMPONENT_MIN_WIDTH_FACTOR, GRAPH_PATH_HALF_WIDTH)
					: NaN;
				const endWidth = (seg && Number.isFinite(seg.pathHalfWidthEnd))
					? clamp(seg.pathHalfWidthEnd, GRAPH_PATH_HALF_WIDTH * GRAPH_COMPONENT_MIN_WIDTH_FACTOR, GRAPH_PATH_HALF_WIDTH)
					: NaN;
				if (Number.isFinite(startWidth) || Number.isFinite(endWidth)) {
					const a = Number.isFinite(startWidth) ? startWidth : (Number.isFinite(endWidth) ? endWidth : GRAPH_PATH_HALF_WIDTH);
					const b = Number.isFinite(endWidth) ? endWidth : (Number.isFinite(startWidth) ? startWidth : GRAPH_PATH_HALF_WIDTH);
					return Math.max(a, b);
				}
				if (seg && Number.isFinite(seg.pathHalfWidth)) {
					return clamp(seg.pathHalfWidth, GRAPH_PATH_HALF_WIDTH * GRAPH_COMPONENT_MIN_WIDTH_FACTOR, GRAPH_PATH_HALF_WIDTH);
				}
				return GRAPH_PATH_HALF_WIDTH;
			}

			function segmentPathHalfWidthAt(seg, atStart) {
				if (seg) {
					const edgeWidth = atStart ? seg.pathHalfWidthStart : seg.pathHalfWidthEnd;
					if (Number.isFinite(edgeWidth)) {
						return clamp(edgeWidth, GRAPH_PATH_HALF_WIDTH * GRAPH_COMPONENT_MIN_WIDTH_FACTOR, GRAPH_PATH_HALF_WIDTH);
					}
					if (Number.isFinite(seg.pathHalfWidth)) {
						return clamp(seg.pathHalfWidth, GRAPH_PATH_HALF_WIDTH * GRAPH_COMPONENT_MIN_WIDTH_FACTOR, GRAPH_PATH_HALF_WIDTH);
					}
				}
				return GRAPH_PATH_HALF_WIDTH;
			}

			function syncResistorValueInput(id) {
				const input = rValueInputs[id];
				if (!input) return;
				input.value = (state.resistorValues[id] || 2.5).toFixed(1);
			}

			function updateLegendText() {
				const topo = state.stages.length
					? state.stages.map((stage) => stage.branches.map((branch) => branch.join("+")).join(" || ")).join(" -> ")
					: "No components";
				const s = state.solved;
				legend.textContent = "";
			}

			function resetStagesFromEnabled() {
				state.sortKeys = {};
				state.leftSeries = enabledIds().filter((id) => isExtraCell(id));
				state.stages = enabledIds().filter((id) => !isExtraCell(id)).map((id) => ({ branches: [[id]] }));
			}

			function normalizeStages() {
				const normalized = [];
				for (const stage of state.stages) {
					if (!stage || !stage.branches || stage.branches.length === 0) {
						continue;
					}
					const nonEmptyBranches = stage.branches.filter((branch) => branch && branch.length > 0);
					if (nonEmptyBranches.length === 0) {
						continue;
					}
					if (nonEmptyBranches.length === 1) {
						for (const id of nonEmptyBranches[0]) {
							normalized.push({ branches: [[id]] });
						}
					} else {
						// Preserve the branch order that was set by user drag — do not re-sort
						normalized.push({
							branches: nonEmptyBranches.map((branch) => branch.slice())
						});
					}
				}
				state.stages = normalized;
			}

			function removeResistorFromStages(id) {
				state.stages = state.stages
					.map((stage) => ({
						branches: stage.branches.map((branch) => branch.filter((item) => item !== id)).filter((branch) => branch.length > 0)
					}))
					.filter((stage) => stage.branches.length > 0);
			}

			function removeFromLeftSeries(id) {
				state.leftSeries = state.leftSeries.filter((item) => item !== id);
			}

			function componentIsPlaced(id) {
				return !!findResistorLocation(id) || state.leftSeries.includes(id);
			}

			function normalizeStage(stage) {
				return stage.slice().sort((a, b) => componentSortKey(a) - componentSortKey(b));
			}

			function findResistorLocation(id) {
				for (let s = 0; s < state.stages.length; s++) {
					for (let b = 0; b < state.stages[s].branches.length; b++) {
						const idx = state.stages[s].branches[b].indexOf(id);
						if (idx >= 0) {
							return { stageIndex: s, branchIndex: b, seriesIndex: idx };
						}
					}
				}
				return null;
			}

			function canAddParallelBranch(id, targetId) {
				const targetLoc = findResistorLocation(targetId);
				if (!targetLoc) return true;
				const stage = state.stages[targetLoc.stageIndex];
				if (!stage || !stage.branches) return true;
				let branchCountAfterRemoval = stage.branches.length;
				const sourceLoc = findResistorLocation(id);
				if (sourceLoc && sourceLoc.stageIndex === targetLoc.stageIndex) {
					const sourceBranch = stage.branches[sourceLoc.branchIndex];
					if (sourceBranch && sourceBranch.length === 1) {
						branchCountAfterRemoval -= 1;
					}
				}
				return (branchCountAfterRemoval + 1) <= MAX_PARALLEL_BRANCHES;
			}

			function addResistorInParallel(id, targetId) {
				if (!canAddParallelBranch(id, targetId)) return false;
				removeResistorFromStages(id);
				removeFromLeftSeries(id);
				const loc = findResistorLocation(targetId);
				if (loc) {
					const branches = state.stages[loc.stageIndex].branches;
					// Find target branch and insert new branch immediately after it (to the right)
					const targetBranchIdx = branches.findIndex((b) => b.includes(targetId));
					const insertAt = targetBranchIdx >= 0 ? targetBranchIdx + 1 : branches.length;
					branches.splice(insertAt, 0, [id]);
				} else {
					state.stages.push({ branches: [[id]] });
				}
				normalizeStages();
				return true;
			}

			function insertAsSeriesAt(id, index) {
				removeResistorFromStages(id);
				removeFromLeftSeries(id);
				const at = clamp(index, 0, state.stages.length);
				state.stages.splice(at, 0, { branches: [[id]] });
				normalizeStages();
			}

			function insertIntoLeftSeriesAt(id, index) {
				removeResistorFromStages(id);
				removeFromLeftSeries(id);
				const at = clamp(index, 0, state.leftSeries.length);
				state.leftSeries.splice(at, 0, id);
			}

			function insertIntoBranchByTarget(id, targetId, mode) {
				removeResistorFromStages(id);
				removeFromLeftSeries(id);
				const loc = findResistorLocation(targetId);
				if (!loc) return;
				const branch = state.stages[loc.stageIndex].branches[loc.branchIndex];
				let idx = branch.indexOf(targetId);
				if (idx < 0) return;
				if (mode === "after") idx += 1;
				branch.splice(clamp(idx, 0, branch.length), 0, id);
				normalizeStages();
			}

			function computeLayoutImpl(w, h) {
				const midY = h * 0.5;
				let xCell;
				let xRight;
				if (state.potentialGraphMode) {
					const leftHalfWidth = w * 0.5;
					const desiredCenter = leftHalfWidth * 0.5;
					const circuitSpan = 270;
					const minXCell = 110;
					const maxXRight = Math.max(minXCell + circuitSpan, leftHalfWidth - 15);
					xCell = clamp(desiredCenter - circuitSpan * 0.5, minXCell, maxXRight - circuitSpan);
					xRight = xCell + circuitSpan;
				} else {
					const graphShift = 0;
					xCell = Math.max(110, w * 0.24 - graphShift);
					xRight = Math.min(w - 110, xCell + 270);
				}
				const switchAnchorX = Math.min(xRight - 34, (xCell + xRight) * 0.5 + 26);
				const xSwitch = (((xCell + 34) + (switchAnchorX - 28)) * 0.5) - 20;
				const activeStages = state.stages.slice();
				// Fresh spacing model:
				// 1) Resistors use CONNECTOR_WIRE above and below.
				// 2) Top and bottom buses use END_BUS_CONNECTOR (minimum, can stretch).
				// 3) Interior split/merge buses use BUS_CONNECTOR above and below.
				//    Top/bottom boundary buses use END_BUS_CONNECTOR to adjacent resistors.
				// 4) Internal resistor and EMF are treated as components in the same vertical chain.
				function branchHeight(branch, isParallel, hasMergeBusAbove, hasSplitBusBelow, isTopBoundaryStage, isBottomBoundaryStage) {
					const topBusPadding = (isParallel && !isTopBoundaryStage)
						? BUS_CONNECTOR
						: ((!isParallel && hasMergeBusAbove) ? BUS_CONNECTOR : 0);
					const bottomBusPadding = (isParallel && !isBottomBoundaryStage)
						? BUS_CONNECTOR
						: ((!isParallel && hasSplitBusBelow) ? BUS_CONNECTOR : 0);
					const busPadding = topBusPadding + bottomBusPadding;
					if (!branch.length) return RES_H + CONNECTOR_WIRE * 2 + busPadding;
					const branchBodyHeight = branch.reduce((sum, id) => sum + componentBodyHeight(id), 0);
					return branchBodyHeight + branch.length * (CONNECTOR_WIRE + CONNECTOR_WIRE) + busPadding;
				}

				const stageHeights = activeStages.map((stage, stageIndex) => {
					const isParallel = stage.branches.length > 1;
					const hasMergeBusAbove = stageIndex > 0 && activeStages[stageIndex - 1].branches.length > 1;
					const hasSplitBusBelow = stageIndex < activeStages.length - 1 && activeStages[stageIndex + 1].branches.length > 1;
					const isTopBoundaryStage = stageIndex === 0;
					const isBottomBoundaryStage = stageIndex === activeStages.length - 1;
					const branchHeights = stage.branches.map((branch) =>
						branchHeight(branch, isParallel, hasMergeBusAbove, hasSplitBusBelow, isTopBoundaryStage, isBottomBoundaryStage)
					);
					return Math.max(...branchHeights, RES_H + CONNECTOR_WIRE * 2);
				});

				const networkPathHeight = stageHeights.reduce((sum, v) => sum + v, 0);
				const leftSeriesPathHeight = state.leftSeries.reduce((sum, id) => sum + componentBodyHeight(id) + CONNECTOR_WIRE * 2, 0);
				const leftComponentHeight = leftSeriesPathHeight;

				const longestComponentHeight = Math.max(leftComponentHeight, networkPathHeight);
				const targetSpan = Math.max(180, longestComponentHeight + END_BUS_CONNECTOR * 2);
				const yTop = midY - targetSpan / 2;
				const yBottom = midY + targetSpan / 2;

				const rightExtra = Math.max(0, longestComponentHeight - networkPathHeight);
				const rightTopLead = END_BUS_CONNECTOR + rightExtra * 0.5;

				let runY = yTop + rightTopLead;
				const stages = [];
				const rects = [];
				const leftSeriesItems = [];
				const wireZones = [];
				const stageInsertZones = [];
				const leftSeriesInsertZones = [];

				for (let index = 0; index < activeStages.length; index++) {
					const stageData = activeStages[index];
					const stageHeight = stageHeights[index];
					const junctionTop = runY;
					const junctionBottom = runY + stageHeight;
					const centerY = (junctionTop + junctionBottom) * 0.5;
					const branchCount = stageData.branches.length;
					const startX = xRight - ((branchCount - 1) * PARALLEL_GAP) / 2;
					const branches = [];

					const isParallel = branchCount > 1;
					const hasMergeBusAbove = index > 0 && activeStages[index - 1].branches.length > 1;
					const hasSplitBusBelow = index < activeStages.length - 1 && activeStages[index + 1].branches.length > 1;
					const isTopBoundaryStage = index === 0;
					const isBottomBoundaryStage = index === activeStages.length - 1;
					const topBusPadding = (isParallel && !isTopBoundaryStage)
						? BUS_CONNECTOR
						: ((!isParallel && hasMergeBusAbove) ? BUS_CONNECTOR : 0);
					for (let branchIndex = 0; branchIndex < branchCount; branchIndex++) {
						const branch = stageData.branches[branchIndex];
						const x = branchCount === 1 ? xRight : startX + branchIndex * PARALLEL_GAP;
						const branchSpan = branchHeight(branch, isParallel, hasMergeBusAbove, hasSplitBusBelow, isTopBoundaryStage, isBottomBoundaryStage);
						const offset = (stageHeight - branchSpan) / 2;
						const items = [];
						// Stages attached to a bus above start with a BUS_CONNECTOR before CONNECTOR_WIRE.
						let cursorY = junctionTop + offset + topBusPadding;
						for (let seriesIndex = 0; seriesIndex < branch.length; seriesIndex++) {
							const id = branch[seriesIndex];
							const bodyHeight = componentBodyHeight(id);
							cursorY += CONNECTOR_WIRE;
							const top = cursorY;
							const bottom = top + bodyHeight;
							cursorY = bottom + CONNECTOR_WIRE;
							const item = {
								id,
								x,
								y: (top + bottom) * 0.5,
								left: x - RES_W / 2,
								right: x + RES_W / 2,
								top,
								bottom,
								width: RES_W,
								height: bodyHeight,
								stageIndex: index,
								branchIndex,
								seriesIndex
							};
							items.push(item);
							rects.push(item);
						}

						for (let insertIndex = 0; insertIndex <= items.length; insertIndex++) {
							const zoneTop = insertIndex === 0 ? junctionTop : items[insertIndex - 1].bottom;
							const zoneBottom = insertIndex === items.length ? junctionBottom : items[insertIndex].top;
							if (zoneBottom - zoneTop > 6) {
								const targetId = insertIndex === items.length ? items[items.length - 1].id : items[insertIndex].id;
								const mode = insertIndex === items.length ? "after" : "before";
								wireZones.push({
									stageIndex: index,
									branchIndex,
									insertIndex,
									targetId,
									mode,
									left: x - 18,
									right: x + 18,
									top: zoneTop,
									bottom: zoneBottom
								});
							}
						}

						branches.push({ x, items });
					}

					stages.push({ index, centerY, junctionTop, junctionBottom, branches });
					runY += stageHeight;
				}

				if (activeStages.length === 0) {
					stageInsertZones.push({ left: xRight - INSERT_RAIL_DIST, right: xRight + INSERT_RAIL_DIST, top: yTop, bottom: yBottom, insertIndex: 0 });
				} else {
					stageInsertZones.unshift({
						left: xRight - INSERT_RAIL_DIST,
						right: xRight + INSERT_RAIL_DIST,
						top: yTop,
						bottom: stages[0].junctionTop,
						insertIndex: 0
					});
					stageInsertZones.push({
						left: xRight - INSERT_RAIL_DIST,
						right: xRight + INSERT_RAIL_DIST,
						top: stages[stages.length - 1].junctionBottom,
						bottom: yBottom,
						insertIndex: stages.length
					});
				}

				const leftExtra = Math.max(0, (yBottom - yTop) - (leftComponentHeight + END_BUS_CONNECTOR * 2));
				const leftTopLead = END_BUS_CONNECTOR + leftExtra * 0.5;
				let leftCursorY = yTop + leftTopLead;
				for (let leftIndex = 0; leftIndex < state.leftSeries.length; leftIndex++) {
					const id = state.leftSeries[leftIndex];
					const bodyHeight = componentBodyHeight(id);
					leftCursorY += CONNECTOR_WIRE;
					const top = leftCursorY;
					const bottom = top + bodyHeight;
					leftCursorY = bottom + CONNECTOR_WIRE;
					const item = {
						id,
						x: xCell,
						y: (top + bottom) * 0.5,
						left: xCell - RES_W / 2,
						right: xCell + RES_W / 2,
						top,
						bottom,
						width: RES_W,
						height: bodyHeight,
						isLeftSeries: true,
						leftSeriesIndex: leftIndex
					};
					leftSeriesItems.push(item);
					rects.push(item);
				}
				const leftCellStartY = leftCursorY;
				for (let insertIndex = 0; insertIndex <= leftSeriesItems.length; insertIndex++) {
					const zoneTop = insertIndex === 0 ? yTop : leftSeriesItems[insertIndex - 1].bottom;
					const zoneBottom = insertIndex === leftSeriesItems.length ? yBottom : leftSeriesItems[insertIndex].top;
					if (zoneBottom - zoneTop > 6) {
						leftSeriesInsertZones.push({
							left: xCell - INSERT_RAIL_DIST,
							right: xCell + INSERT_RAIL_DIST,
							top: zoneTop,
							bottom: zoneBottom,
							insertIndex
						});
					}
				}

				const networkRight = rects.length
					? rects.reduce((maxRight, rect) => Math.max(maxRight, rect.right), xRight)
					: xRight;
				const firstParallelStage = stages.find((s) => s && Array.isArray(s.branches) && s.branches.length > 1) || null;
				const topBusRightX = firstParallelStage
					? Math.min(...firstParallelStage.branches.map((b) => b.x))
					: xRight;
				// Anchor the bottom return bus to the bottom-most parallel boundary stage so the
				// lower tee junction is explicit (e.g. J11) and matches the top-side split style.
				const lastParallelStage = [...stages].reverse()
					.find((stage) => stage && Array.isArray(stage.branches) && stage.branches.length > 1) || null;
				const bottomBusRightX = lastParallelStage
					? Math.min(...lastParallelStage.branches.map((b) => b.x))
					: xRight;
				const circuitRight = Math.max(xRight, xSwitch + 16, networkRight, topBusRightX, bottomBusRightX);

				return {
					w,
					h,
					midY,
					xCell,
					xRight,
					topBusRightX,
					bottomBusRightX,
					circuitRight,
					xSwitch,
					yTop,
					yBottom,
					leftCellStartY,
					stages,
					rects,
					leftSeriesItems,
					wireZones,
					stageInsertZones,
					leftSeriesInsertZones,
					switchHit: { left: xSwitch - 22, right: xSwitch + 22, top: yTop - 24, bottom: yTop + 12 }
				};
			}

			class CircuitLayoutEngine {
				computeLayout(w, h) {
					return computeLayoutImpl(w, h);
				}
			}

			const layoutEngine = new CircuitLayoutEngine();

			function computeLayout(w, h) {
				return layoutEngine.computeLayout(w, h);
			}

			const circuitSolver = createCircuitSolver(state, updateLegendText, {
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
			});

			function solveCircuit() {
				circuitSolver.solve();
				if (state.layout) {
					applyKirchhoffSectionSolve(state.layout);
				}
			}

			function rebuildLayout() {
				normalizeStages();
				const rect = canvas.getBoundingClientRect();
				state.layout = computeLayout(rect.width, rect.height);
				solveCircuit();
				updateLegendText();
			}

			function placedCellIds() {
				const ids = new Set();
				for (const id of state.leftSeries || []) {
					if (isExtraCell(id)) ids.add(id);
				}
				for (const stage of state.stages || []) {
					for (const branch of (stage && stage.branches) || []) {
						for (const id of branch || []) {
							if (isExtraCell(id)) ids.add(id);
						}
					}
				}
				return EXTRA_CELL_IDS.filter((id) => ids.has(id));
			}

			function cellTerminalVoltages(id) {
				const sol = state.solved && state.solved.byId ? state.solved.byId[id] : null;
				if (!sol) return null;
				const topV = Number.isFinite(sol.Vtop) ? sol.Vtop : 0;
				const bottomV = Number.isFinite(sol.Vbottom) ? sol.Vbottom : topV;
				const current = Number.isFinite(sol.I) ? sol.I : 0;
				const rInternal = state.internalR ? getCellRInternal(id) : 0;
				const leftPrimaryCellId = (state.leftSeries || []).find((cellId) => isExtraCell(cellId)) || PRIMARY_CELL_ID;
				const emfTopV = (id === leftPrimaryCellId
					&& Number.isFinite(state.solved?.cellTopPlateV)
					&& Number.isFinite(state.solved?.cellBottomPlateV))
					? state.solved.cellTopPlateV
					: (topV + current * rInternal);
				const emfBottomV = (id === leftPrimaryCellId
					&& Number.isFinite(state.solved?.cellTopPlateV)
					&& Number.isFinite(state.solved?.cellBottomPlateV))
					? state.solved.cellBottomPlateV
					: bottomV;
				const polarity = getCellPolarity(id);
				return {
					topV: emfTopV,
					bottomV: emfBottomV,
					positiveV: polarity > 0 ? emfBottomV : emfTopV,
					negativeV: polarity > 0 ? emfTopV : emfBottomV
				};
			}

			function graphDisplayVoltage(v) {
				// Solver potentials are already rebased so min = 0 V.
				// invertVoltageAxis flips the vertical axis so the highest potential sits at the floor.
				if (state.invertVoltageAxis) {
					const vMax = (state.solved && Number.isFinite(state.solved.vMax)) ? state.solved.vMax : 0;
					return vMax - v;
				}
				return v;
			}

			function actualVoltageFromGraphDisplay(gv) {
				if (state.invertVoltageAxis) {
					const vMax = (state.solved && Number.isFinite(state.solved.vMax)) ? state.solved.vMax : 0;
					return vMax - gv;
				}
				return gv;
			}

			function collectGraphFitPointsImpl(layout) {
				const segs = buildCircuitVoltageSegments(layout);
				if (!segs.length) return [];
				let rawVMax = -Infinity;
				for (const s of segs) {
					if (Number.isFinite(s.v1) && s.v1 > rawVMax) rawVMax = s.v1;
					if (Number.isFinite(s.v2) && s.v2 > rawVMax) rawVMax = s.v2;
				}
				if (!Number.isFinite(rawVMax)) rawVMax = 0;
				const graphV = state.invertVoltageAxis
					? (v) => rawVMax - v
					: (v) => v;
				const points = [
					{ x: layout.xCell, y: layout.yTop, v: 0 },
					{ x: layout.xRight, y: layout.yTop, v: 0 },
					{ x: layout.xCell, y: layout.yBottom, v: 0 },
					{ x: layout.xRight, y: layout.yBottom, v: 0 }
				];

				for (const s of segs) {
					points.push({ x: s.x1, y: s.y1, v: 0 });
					points.push({ x: s.x2, y: s.y2, v: 0 });
					points.push({ x: s.x1, y: s.y1, v: graphV(s.v1) });
					points.push({ x: s.x2, y: s.y2, v: graphV(s.v2) });
				}

				return points;
			}

			function computeProjectedGraphBoundsImpl(layout, zoom) {
				const points = collectGraphFitPointsImpl(layout);
				if (!points.length) return null;
				const az = state.graphAzimuth;
				const el = state.graphElevation;
				const xyScale = GRAPH_XY_SCALE_BASE * zoom;
				const zScale = GRAPH_VOLTS_TO_HEIGHT * zoom;
				const cAz = Math.cos(az);
				const sAz = Math.sin(az);
				const cEl = Math.cos(el);
				const sEl = Math.sin(el);
				const cRoll = Math.cos(state.graphRoll);
				const sRoll = Math.sin(state.graphRoll);
				const xRef = (layout.xCell + layout.xRight) * 0.5;
				const yRef = (layout.yTop + layout.yBottom) * 0.5;

				let minX = Infinity;
				let maxX = -Infinity;
				let minY = Infinity;
				let maxY = -Infinity;

				for (const point of points) {
					const ux = (point.x - xRef) * xyScale;
					const uy = (point.y - yRef) * xyScale;
					const uz = point.v * zScale;
					// Apply roll (true 3D y-axis rotation) to 3D coordinates
					const ux_r = ux * cRoll + uz * sRoll;
					const uz_r = -ux * sRoll + uz * cRoll;
					const uy_r = uy;
					// Apply azimuth (z-axis rotation)
					const xr = ux_r * cAz - uy_r * sAz;
					const yr = ux_r * sAz + uy_r * cAz;
					// Apply elevation projection
					const sx = xr + uz_r * 0.34 * cEl;
					const sy = yr * 0.66 - uz_r * sEl;
					if (sx < minX) minX = sx;
					if (sx > maxX) maxX = sx;
					if (sy < minY) minY = sy;
					if (sy > maxY) maxY = sy;
				}

				return { minX, maxX, minY, maxY };
			}

			function computeAutoFitGraphViewImpl() {
				if (!state.layout) {
					return { zoom: state.graphZoom, panX: state.graphPanX, panY: state.graphPanY };
				}
				const layout = state.layout;
				const bounds = computeProjectedGraphBoundsImpl(layout, 1);
				if (!bounds) {
					return { zoom: state.graphZoom, panX: state.graphPanX, panY: state.graphPanY };
				}
				const GRAPH_NON_OVERLAP_PADDING = 18;
				const GRAPH_MAX_VERTICAL_FRACTION = 0.5;
				const graphBaseCenter = getGraphBaseCenter(layout);
				const graphCenterX = graphBaseCenter.x;
				const graphCenterY = graphBaseCenter.y;
				const noOverlapLeftLimit = layout.circuitRight + GRAPH_NON_OVERLAP_PADDING;
				const leftLimit = state.potentialGraphMode
					? Math.max(layout.w * 0.5 + GRAPH_SIDE_MARGIN, noOverlapLeftLimit)
					: (layout.circuitRight + GRAPH_CIRCUIT_MARGIN);
				const rightLimit = layout.w - GRAPH_SIDE_MARGIN;
				const leftRoom = Math.max(GRAPH_SIDE_MARGIN, graphCenterX - leftLimit);
				const rightRoom = Math.max(GRAPH_SIDE_MARGIN, layout.w - graphCenterX - GRAPH_SIDE_MARGIN);
				const topRoom = Math.max(GRAPH_VERTICAL_MARGIN, graphCenterY - GRAPH_VERTICAL_MARGIN);
				const bottomRoom = Math.max(GRAPH_VERTICAL_MARGIN, layout.h - graphCenterY - GRAPH_VERTICAL_MARGIN);
				const leftExtent = Math.max(1e-6, -bounds.minX);
				const rightExtent = Math.max(1e-6, bounds.maxX);
				const centerY = (bounds.minY + bounds.maxY) * 0.5;
				const topExtent = Math.max(1e-6, centerY - bounds.minY);
				const bottomExtent = Math.max(1e-6, bounds.maxY - centerY);
				const fitX = Math.min(leftRoom / leftExtent, rightRoom / rightExtent);
				const fitY = Math.min(topRoom / topExtent, bottomRoom / bottomExtent);
				const fitAtOne = Math.min(fitX, fitY);
				const boundsHeightAtOne = Math.max(1e-6, bounds.maxY - bounds.minY);
				const availableVertical = Math.max(1e-6, topRoom + bottomRoom);
				const maxZoomByVerticalFraction = (availableVertical * GRAPH_MAX_VERTICAL_FRACTION) / boundsHeightAtOne;
				const maxZoomByBounds = fitAtOne * GRAPH_AUTO_FIT_SCALE;
				const zoomUpperBound = Math.min(maxZoomByBounds, maxZoomByVerticalFraction);
				const zoom = clamp(zoomUpperBound, GRAPH_MIN_AUTO_ZOOM, 4.0);
				const minPanX = leftLimit - (graphCenterX + bounds.minX * zoom);
				const maxPanX = rightLimit - (graphCenterX + bounds.maxX * zoom);
				const panX = minPanX <= maxPanX ? clamp(0, minPanX, maxPanX) : minPanX;
				return {
					zoom,
					panX,
					panY: -centerY * zoom
				};
			}

			function resetGraphZoomToFitImpl() {
				rebuildLayout();
				const fit = computeAutoFitGraphViewImpl();
				state.graphZoom = fit.zoom;
				state.graphPanX = fit.panX;
				state.graphPanY = fit.panY;
			}

			class GraphViewportController {
				collectGraphFitPoints(layout) {
					return collectGraphFitPointsImpl(layout);
				}

				computeProjectedGraphBounds(layout, zoom) {
					return computeProjectedGraphBoundsImpl(layout, zoom);
				}

				computeAutoFitGraphView() {
					return computeAutoFitGraphViewImpl();
				}

				resetGraphZoomToFit() {
					return resetGraphZoomToFitImpl();
				}
			}

			const graphViewportController = new GraphViewportController();

			function collectGraphFitPoints(layout) {
				return graphViewportController.collectGraphFitPoints(layout);
			}

			function computeProjectedGraphBounds(layout, zoom) {
				return graphViewportController.computeProjectedGraphBounds(layout, zoom);
			}

			function computeAutoFitGraphView() {
				return graphViewportController.computeAutoFitGraphView();
			}

			function resetGraphZoomToFit() {
				return graphViewportController.resetGraphZoomToFit();
			}

			function computeCircuitViewBounds(layout) {
				if (!layout) return null;
				let minX = Number.isFinite(layout.xCell) ? layout.xCell : 0;
				let maxX = Number.isFinite(layout.circuitRight) ? layout.circuitRight : (Number.isFinite(layout.w) ? layout.w : minX + 1);
				let minY = Number.isFinite(layout.yTop) ? layout.yTop : 0;
				let maxY = Number.isFinite(layout.yBottom) ? layout.yBottom : (Number.isFinite(layout.h) ? layout.h : minY + 1);

				if (layout.switchHit) {
					if (Number.isFinite(layout.switchHit.left)) minX = Math.min(minX, layout.switchHit.left);
					if (Number.isFinite(layout.switchHit.right)) maxX = Math.max(maxX, layout.switchHit.right);
					if (Number.isFinite(layout.switchHit.top)) minY = Math.min(minY, layout.switchHit.top);
					if (Number.isFinite(layout.switchHit.bottom)) maxY = Math.max(maxY, layout.switchHit.bottom);
				}

				for (const rect of (layout.rects || [])) {
					if (!rect) continue;
					if (Number.isFinite(rect.left)) minX = Math.min(minX, rect.left);
					if (Number.isFinite(rect.right)) maxX = Math.max(maxX, rect.right);
					if (Number.isFinite(rect.top)) minY = Math.min(minY, rect.top);
					if (Number.isFinite(rect.bottom)) maxY = Math.max(maxY, rect.bottom);
				}

				for (const item of (layout.leftSeriesItems || [])) {
					if (!item) continue;
					if (Number.isFinite(item.left)) minX = Math.min(minX, item.left);
					if (Number.isFinite(item.right)) maxX = Math.max(maxX, item.right);
					if (Number.isFinite(item.top)) minY = Math.min(minY, item.top);
					if (Number.isFinite(item.bottom)) maxY = Math.max(maxY, item.bottom);
				}

				if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
					return null;
				}

				return { minX, maxX, minY, maxY };
			}

			function autoFitCircuitViewToCanvas() {
				rebuildLayout();
				if (!state.layout) return;
				const bounds = computeCircuitViewBounds(state.layout);
				if (!bounds) return;
				const rect = canvasWrap.getBoundingClientRect();
				if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width < 8 || rect.height < 8) return;

				const paddingX = 24;
				const paddingTop = 98;
				const paddingBottom = 88;
				const spanX = Math.max(1e-6, bounds.maxX - bounds.minX);
				const spanY = Math.max(1e-6, bounds.maxY - bounds.minY);
				const fitX = Math.max(1e-6, (rect.width - paddingX * 2) / spanX);
				const fitY = Math.max(1e-6, (rect.height - paddingTop - paddingBottom) / spanY);
				const fitZoom = clamp(Math.min(fitX, fitY) * 0.98, 0.25, 4.0);
				const defaultViewZoom = 1;

				// Auto behavior rules:
				// 1) Zoom out when circuit does not fit current zoom.
				// 2) If currently zoomed out below default and space allows, zoom back to default only.
				let targetZoom = state.viewZoom;
				if (fitZoom < state.viewZoom) {
					targetZoom = fitZoom;
				} else if (state.viewZoom < defaultViewZoom && fitZoom >= defaultViewZoom) {
					targetZoom = defaultViewZoom;
				}

				const zoomChanged = Math.abs(targetZoom - state.viewZoom) >= 1e-6;

				const usedW = spanX * targetZoom;
				const usedH = spanY * targetZoom;
				if (zoomChanged) {
					state.viewZoom = targetZoom;
				}
				// Preserve default horizontal placement (zoom=1, panX=0) by fixing the
				// left circuit bound at its default screen x-position.
				if (state.potentialGraphMode) {
					const targetCenterX = rect.width * 0.25;
					const boundsCenterX = (bounds.minX + bounds.maxX) * 0.5;
					state.viewPanX = targetCenterX - boundsCenterX * targetZoom;
				} else {
					state.viewPanX = bounds.minX * (1 - targetZoom);
				}
				const verticalSpace = Math.max(0, rect.height - paddingTop - paddingBottom - usedH);
				const topOffset = paddingTop + verticalSpace * 0.5;
				state.viewPanY = topOffset - bounds.minY * targetZoom;
			}

			function drawGrid(w, h) {
				ctx.save();
				ctx.strokeStyle = "rgba(120, 120, 120, 0.13)";
				ctx.lineWidth = 1;
				for (let x = 0.5; x < w; x += 28) {
					ctx.beginPath();
					ctx.moveTo(x, 0);
					ctx.lineTo(x, h);
					ctx.stroke();
				}
				for (let y = 0.5; y < h; y += 28) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(w, y);
					ctx.stroke();
				}
				ctx.restore();
			}

			function voltageToColor(v) {
				const displayV = graphDisplayVoltage(v);
				const scale = state.graphColorScale || { displayMin: 0, displayMax: 1, maxAbs: 1 };
				const maxAbs = Math.max(1e-6,
					Number.isFinite(scale.maxAbs) ? scale.maxAbs : 1,
					Math.abs(Number.isFinite(scale.displayMin) ? scale.displayMin : 0),
					Math.abs(Number.isFinite(scale.displayMax) ? scale.displayMax : 1));
				const signed = clamp(displayV / maxAbs, -1, 1);
				const hue = 60 + 60 * signed;
				return `hsl(${hue}, 85%, 42%)`;
			}

			function formatWireResistance(R) {
				if (R >= 1) return R.toFixed(3) + " \u03A9";
				if (R >= 1e-3) return (R * 1e3).toFixed(2) + " m\u03A9";
				if (R >= 1e-6) return (R * 1e6).toFixed(2) + " \u00B5\u03A9";
				return (R * 1e9).toFixed(2) + " n\u03A9";
			}

			function formatCompactWireResistance(R) {
				if (R >= 1) return R.toFixed(2) + " \u03A9";
				if (R >= 1e-3) return (R * 1e3).toFixed(1) + " m\u03A9";
				if (R >= 1e-6) return (R * 1e6).toFixed(1) + " \u00B5\u03A9";
				return (R * 1e9).toFixed(1) + " n\u03A9";
			}

			function formatWireVoltagePD(v) {
				if (!Number.isFinite(v)) return "---";
				const absV = Math.abs(v);
				const sign = v < 0 ? "-" : "";
				if (absV >= 1) return sign + absV.toFixed(3) + " V";
				if (absV >= 1e-3) return sign + (absV * 1e3).toFixed(2) + " mV";
				if (absV >= 1e-6) return sign + (absV * 1e6).toFixed(2) + " \u00B5V";
				return sign + (absV * 1e9).toFixed(2) + " nV";
			}

			function wireResistanceLabelsEnabled() {
				return !!(state.wireResistanceLabels || (wireResLabelsCheck && wireResLabelsCheck.checked));
			}

			function nodesIRLabelsEnabled() {
				return !!(state.nodesIRLabels || (nodesIRLabelsCheck && nodesIRLabelsCheck.checked));
			}

			function branchGroupingLabelsEnabled() {
				return !!state.debugLabels;
			}

			function buildComponentBranchGroupMap(layout) {
				const map = new Map();
				for (const item of (layout.leftSeriesItems || [])) {
					if (item && item.id) map.set(item.id, "LEFT");
				}
				for (const stage of (layout.stages || [])) {
					if (!stage || !Array.isArray(stage.branches)) continue;
					for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
						const branch = stage.branches[branchIndex];
						if (!branch || !Array.isArray(branch.items)) continue;
						for (const item of branch.items) {
							if (item && item.id) map.set(item.id, `S${stage.index}B${branchIndex}`);
						}
					}
				}
				return map;
			}

			function classifySegmentGroup(seg, layout, compGroupMap) {
				const EPS = 0.8;
				const x1 = Number.isFinite(seg.x1) ? seg.x1 : 0;
				const y1 = Number.isFinite(seg.y1) ? seg.y1 : 0;
				const x2 = Number.isFinite(seg.x2) ? seg.x2 : x1;
				const y2 = Number.isFinite(seg.y2) ? seg.y2 : y1;
				const mx = (x1 + x2) * 0.5;
				const my = (y1 + y2) * 0.5;
				const vertical = Math.abs(x2 - x1) <= EPS && Math.abs(y2 - y1) > EPS;
				const horizontal = Math.abs(y2 - y1) <= EPS && Math.abs(x2 - x1) > EPS;

				if (seg.componentId) {
					const branch = compGroupMap.get(seg.componentId) || "UNPLACED";
					return `${branch}:${seg.componentId}`;
				}

				if (vertical && Math.abs(x1 - layout.xCell) <= EPS && my >= layout.yTop - EPS && my <= layout.yBottom + EPS) {
					return "LEFT_PATH";
				}
				if (vertical && Math.abs(x1 - layout.xRight) <= EPS && my >= layout.yTop - EPS && my <= layout.yBottom + EPS) {
					return "RIGHT_RAIL";
				}
				if (horizontal && Math.abs(y1 - layout.yTop) <= EPS) return "TOP_BUS";
				if (horizontal && Math.abs(y1 - layout.yBottom) <= EPS) return "BOTTOM_BUS";

				for (const stage of (layout.stages || [])) {
					if (!stage || !Array.isArray(stage.branches) || stage.branches.length <= 1) continue;
					const isFirst = stage.index === 0;
					const isLast = stage.index === (layout.stages.length - 1);
					const entryY = isFirst ? layout.yTop : stage.junctionTop;
					const exitY = isLast ? layout.yBottom : stage.junctionBottom;
					const branchXs = stage.branches
						.map((b) => (b && Number.isFinite(b.x)) ? b.x : null)
						.filter((x) => x !== null);
					if (!branchXs.length) continue;
					const minX = Math.min(layout.xRight, ...branchXs);
					const maxX = Math.max(layout.xRight, ...branchXs);

					for (let branchIndex = 0; branchIndex < stage.branches.length; branchIndex++) {
						const branch = stage.branches[branchIndex];
						const bx = (branch && Number.isFinite(branch.x)) ? branch.x : layout.xRight;
						if (vertical && Math.abs(x1 - bx) <= EPS && my >= entryY - EPS && my <= exitY + EPS) {
							return `S${stage.index}B${branchIndex}`;
						}
					}

					if (horizontal && Math.abs(y1 - entryY) <= EPS && mx >= minX - EPS && mx <= maxX + EPS) {
						return `S${stage.index}_TOP_SPLIT`;
					}
					if (horizontal && Math.abs(y1 - exitY) <= EPS && mx >= minX - EPS && mx <= maxX + EPS) {
						return `S${stage.index}_BOT_MERGE`;
					}
				}

				return "UNGROUPED";
			}

			function drawBranchGroupingLabels(layout) {
				if (!branchGroupingLabelsEnabled()) return;
				if (!layout) return;
				const segments = buildCircuitVoltageSegments(layout).filter((seg) => seg.role !== "switch-blade");
				if (!segments.length) return;
				const compGroupMap = buildComponentBranchGroupMap(layout);
				const dpr = window.devicePixelRatio || 1;
				ctx.save();
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.font = "600 9px Consolas, 'Courier New', monospace";
				const drawn = new Set();
				for (const seg of segments) {
					const dx = seg.x2 - seg.x1;
					const dy = seg.y2 - seg.y1;
					const len = Math.hypot(dx, dy);
					if (!(len > 14)) continue;
					const group = classifySegmentGroup(seg, layout, compGroupMap);
					const mx = (seg.x1 + seg.x2) * 0.5;
					const my = (seg.y1 + seg.y2) * 0.5;
					const key = `${group}|${Math.round(mx / 20)}|${Math.round(my / 20)}`;
					if (drawn.has(key)) continue;
					drawn.add(key);
					const tx = mx * state.viewZoom + state.viewPanX;
					const ty = my * state.viewZoom + state.viewPanY;
					if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
					const text = group;
					const tw = ctx.measureText(text).width;
					ctx.fillStyle = "rgba(255,255,255,0.88)";
					ctx.fillRect(tx - tw / 2 - 3, ty - 7, tw + 6, 12);
					ctx.strokeStyle = "rgba(88, 70, 155, 0.35)";
					ctx.lineWidth = 1;
					ctx.strokeRect(tx - tw / 2 - 3, ty - 7, tw + 6, 12);
					ctx.fillStyle = "rgba(70, 55, 130, 0.96)";
					ctx.fillText(text, tx, ty - 0.25);
				}
				ctx.restore();
			}

			function enqueueWireResistanceSegment(x1, y1, x2, y2, role) {
				const len = Math.hypot(x2 - x1, y2 - y1);
				if (!(len > 6)) return;
				wireResistanceLabelQueue.push({ x1, y1, x2, y2, role: role || "wire" });
			}

			function buildCircuitRouteGraph(layout) {
				if (!layout) return null;
				const registry = (typeof sceneRenderer !== "undefined" && sceneRenderer && typeof sceneRenderer.buildJunctionLabelRegistry === "function")
					? sceneRenderer.buildJunctionLabelRegistry(layout)
					: null;
				if (!registry) return null;
				const segments = buildCircuitVoltageSegments(layout);
				if (segments.length === 0) {
					return { segments: [], registry, routeKeyBySegmentIndex: [], routes: [] };
				}
				const POINT_EPS = 1e-3;
				const SPLIT_EPS = 1e-4;
				const keyFor = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
				const junctionById = new Map((registry.junctions || []).map((j) => [j.id, j]));
				const nodeByKey = new Map();
				const addNode = (x, y, junctionId) => {
					if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
					const key = keyFor(x, y);
					if (!nodeByKey.has(key)) {
						nodeByKey.set(key, { key, x, y, junctionId: junctionId || null });
					} else if (junctionId) {
						nodeByKey.get(key).junctionId = junctionId;
					}
					return key;
				};
				const pointOnSegment = (seg, x, y, eps = POINT_EPS) => {
					const dx = seg.x2 - seg.x1;
					const dy = seg.y2 - seg.y1;
					const len2 = dx * dx + dy * dy;
					if (!(len2 > eps * eps)) return false;
					const t = ((x - seg.x1) * dx + (y - seg.y1) * dy) / len2;
					if (t < -eps || t > 1 + eps) return false;
					const px = seg.x1 + dx * t;
					const py = seg.y1 + dy * t;
					return Math.hypot(px - x, py - y) <= eps;
				};
				const pointTAlongSegment = (seg, x, y) => {
					const dx = seg.x2 - seg.x1;
					const dy = seg.y2 - seg.y1;
					const len2 = dx * dx + dy * dy;
					if (!(len2 > 1e-12)) return 0;
					return ((x - seg.x1) * dx + (y - seg.y1) * dy) / len2;
				};
				const orientPairKey = (a, b) => {
					if (!a || !b) return null;
					const pa = junctionById.get(a) || null;
					const pb = junctionById.get(b) || null;
					let from = a;
					let to = b;
					if (pa && pb) {
						const dx = pb.x - pa.x;
						const dy = pb.y - pa.y;
						if (Math.abs(dy) >= Math.abs(dx)) {
							if (pa.y > pb.y) {
								from = b;
								to = a;
							}
						} else if (pa.x > pb.x) {
							from = b;
							to = a;
						}
					}
					return `${from}|${to}`;
				};

				for (const j of (registry.junctions || [])) {
					addNode(j.x, j.y, j.id);
				}

				const edges = [];
				const adjacency = new Map();
				const addAdjacency = (nodeKey, edgeIndex) => {
					if (!adjacency.has(nodeKey)) adjacency.set(nodeKey, []);
					adjacency.get(nodeKey).push(edgeIndex);
				};
				const sourceEdges = segments.map(() => []);

				for (let si = 0; si < segments.length; si++) {
					const seg = segments[si];
					if (!shouldParticipateInSecondarySolveSegment(seg)) continue;
					const splitPoints = [
						{ x: seg.x1, y: seg.y1, t: 0 },
						{ x: seg.x2, y: seg.y2, t: 1 }
					];
					for (const j of (registry.junctions || [])) {
						if (!pointOnSegment(seg, j.x, j.y)) continue;
						splitPoints.push({ x: j.x, y: j.y, t: pointTAlongSegment(seg, j.x, j.y) });
					}
					splitPoints.sort((a, b) => a.t - b.t);
					const uniquePoints = [];
					for (const p of splitPoints) {
						if (!uniquePoints.length || Math.abs(p.t - uniquePoints[uniquePoints.length - 1].t) > SPLIT_EPS) {
							uniquePoints.push(p);
						}
					}
					for (let pi = 0; pi < uniquePoints.length - 1; pi++) {
						const a = uniquePoints[pi];
						const b = uniquePoints[pi + 1];
						if (Math.hypot(b.x - a.x, b.y - a.y) <= POINT_EPS) continue;
						const nodeA = addNode(a.x, a.y);
						const nodeB = addNode(b.x, b.y);
						if (!nodeA || !nodeB) continue;
						const edgeIndex = edges.length;
						edges.push({
							id: edgeIndex,
							sourceSegmentIndex: si,
							nodeA,
							nodeB,
							x1: a.x,
							y1: a.y,
							x2: b.x,
							y2: b.y,
							routeKey: null,
							routeIndex: null
						});
						sourceEdges[si].push(edgeIndex);
						addAdjacency(nodeA, edgeIndex);
						addAdjacency(nodeB, edgeIndex);
					}
				}

				const otherNodeKey = (edge, nodeKey) => edge.nodeA === nodeKey ? edge.nodeB : edge.nodeA;
				const getNodeDegree = (nodeKey) => (adjacency.get(nodeKey) || []).length;
				const edgeOrientationAtNode = (edge, nodeKey) => {
					const otherKey = otherNodeKey(edge, nodeKey);
					const node = nodeByKey.get(nodeKey);
					const other = nodeByKey.get(otherKey);
					if (!node || !other) return null;
					const dx = other.x - node.x;
					const dy = other.y - node.y;
					if (Math.abs(dx) >= Math.abs(dy)) return "h";
					return "v";
				};
				const nodeIsCornerOrMultiJunction = (nodeKey) => {
					const node = nodeByKey.get(nodeKey);
					if (!node) return false;
					const incident = adjacency.get(nodeKey) || [];
					if (incident.length > 2) return true;
					if (incident.length !== 2) return false;
					const o1 = edgeOrientationAtNode(edges[incident[0]], nodeKey);
					const o2 = edgeOrientationAtNode(edges[incident[1]], nodeKey);
					return !!(o1 && o2 && o1 !== o2);
				};
				const effectiveWireEdgeLength = (edge) => {
					if (!edge) return 0;
					const baseLen = Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1);
					if (!(baseLen > 0)) return 0;
					let trim = 0;
					if (nodeIsCornerOrMultiJunction(edge.nodeA)) trim += GRAPH_PATH_HALF_WIDTH;
					if (nodeIsCornerOrMultiJunction(edge.nodeB)) trim += GRAPH_PATH_HALF_WIDTH;
					return Math.max(0, baseLen - trim);
				};
				const edgeEffectiveLengthByIndex = edges.map((edge) => effectiveWireEdgeLength(edge));
				const segmentEffectiveLengthByIndex = segments.map((seg, si) => {
					const srcSeg = segments[si];
					if (srcSeg && srcSeg.role === "component-main" && srcSeg.componentId) {
						return Math.max(0, Math.hypot(srcSeg.x2 - srcSeg.x1, srcSeg.y2 - srcSeg.y1));
					}
					let total = 0;
					for (const edgeIndex of (sourceEdges[si] || [])) {
						total += edgeEffectiveLengthByIndex[edgeIndex] || 0;
					}
					return total;
				});
				const isPassThroughJunction = (nodeKey) => {
					const n = nodeByKey.get(nodeKey);
					return !!(n && n.junctionId && getNodeDegree(nodeKey) === 2);
				};
				const isTerminalJunction = (nodeKey) => {
					const node = nodeByKey.get(nodeKey);
					if (!node || !node.junctionId) return false;
					return getNodeDegree(nodeKey) !== 2;
				};
				const allJunctionNodes = Array.from(nodeByKey.values()).filter((n) => !!n.junctionId);
				const terminalJunctionNodes = allJunctionNodes.filter((n) => isTerminalJunction(n.key));
				const traversalStartNodes = terminalJunctionNodes.length ? terminalJunctionNodes : allJunctionNodes;
				const visitedEdgeIds = new Set();
				const routes = [];

				const edgeTraversalSign = (edge, fromNodeKey, toNodeKey) => {
					const fromNode = nodeByKey.get(fromNodeKey);
					const toNode = nodeByKey.get(toNodeKey);
					if (!fromNode || !toNode) return 1;
					const tx = toNode.x - fromNode.x;
					const ty = toNode.y - fromNode.y;
					const ex = edge.x2 - edge.x1;
					const ey = edge.y2 - edge.y1;
					const dot = tx * ex + ty * ey;
					return dot >= 0 ? 1 : -1;
				};

				const traceRouteFromSeed = (startNodeKey, seedEdgeIndex) => {
					if (visitedEdgeIds.has(seedEdgeIndex)) return null;
					const startNode = nodeByKey.get(startNodeKey);
					if (!startNode || !startNode.junctionId) return null;
					const steps = [];
					let currentNodeKey = startNodeKey;
					let currentEdgeIndex = seedEdgeIndex;
					let endNodeKey = null;

					while (Number.isFinite(currentEdgeIndex) && !visitedEdgeIds.has(currentEdgeIndex)) {
						const edge = edges[currentEdgeIndex];
						if (!edge) break;
						visitedEdgeIds.add(currentEdgeIndex);
						const nextNodeKey = otherNodeKey(edge, currentNodeKey);
						if (!nextNodeKey) break;
						steps.push({ edgeIndex: currentEdgeIndex, fromNodeKey: currentNodeKey, toNodeKey: nextNodeKey });
						const nextNode = nodeByKey.get(nextNodeKey);
						if (!nextNode) break;

						if (nextNode.junctionId && nextNode.junctionId !== startNode.junctionId && isTerminalJunction(nextNodeKey)) {
							endNodeKey = nextNodeKey;
							break;
						}

						const nextEdgeCandidates = (adjacency.get(nextNodeKey) || [])
							.filter((idx) => idx !== currentEdgeIndex && !visitedEdgeIds.has(idx));
						if (nextEdgeCandidates.length !== 1) break;
						currentNodeKey = nextNodeKey;
						currentEdgeIndex = nextEdgeCandidates[0];
					}

					if (!endNodeKey || steps.length === 0) return null;
					const endNode = nodeByKey.get(endNodeKey);
					if (!endNode || !endNode.junctionId || endNode.junctionId === startNode.junctionId) return null;

					const canonicalRouteKey = orientPairKey(startNode.junctionId, endNode.junctionId);
					if (!canonicalRouteKey) return null;
					const keyBits = canonicalRouteKey.split("|");
					const outFrom = keyBits[0] || startNode.junctionId;
					const outTo = keyBits[1] || endNode.junctionId;

					let routeR = 0;
					let routeE = 0;
					const routeParts = [];
					const seenComponents = new Set();
					for (const step of steps) {
						const edge = edges[step.edgeIndex];
						if (!edge) continue;
						const fromNode = nodeByKey.get(step.fromNodeKey);
						const toNode = nodeByKey.get(step.toNodeKey);
						const travDy = (fromNode && toNode) ? (toNode.y - fromNode.y) : 0;
						routeParts.push({ x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, travDy });
						const srcSeg = segments[edge.sourceSegmentIndex];
						if (srcSeg && srcSeg.componentId && (srcSeg.role === "component-main" || srcSeg.role === "switch-blade")) {
							if (!seenComponents.has(srcSeg.componentId)) {
								seenComponents.add(srcSeg.componentId);
								const componentId = srcSeg.componentId;
								const componentR = srcSeg.role === "switch-blade"
									? componentIntrinsicResistance(componentId)
									: (isBranchSwitch(componentId)
										? componentIntrinsicResistance(componentId)
										: componentResistance(componentId));
								routeR += Math.max(0, componentR);
								// componentEmf uses solver drop-convention; section table E uses rise-convention.
								const emf = Number.isFinite(componentEmf(srcSeg.componentId)) ? (-componentEmf(srcSeg.componentId)) : 0;
								if (Math.abs(emf) > 1e-12) {
									routeE += emf * edgeTraversalSign(edge, step.fromNodeKey, step.toNodeKey);
								}
							}
						} else {
							routeR += Math.max(0, effectiveWireEdgeLength(edge) * SHORT_WIRE_R_PER_PIXEL);
						}
					}

					const traversalFrom = startNode.junctionId;
					const traversalTo = endNode.junctionId;
					if (!(outFrom === traversalFrom && outTo === traversalTo)) {
						routeE = -routeE;
					}

					return {
						from: outFrom,
						to: outTo,
						R: routeR,
						E: routeE,
						parts: routeParts,
						routeKey: canonicalRouteKey,
						sectionFlipped: !(outFrom === traversalFrom && outTo === traversalTo),
						edgeIndices: steps.map((s) => s.edgeIndex),
						edgeSteps: steps.map((s) => ({
							edgeIndex: s.edgeIndex,
							fromNodeKey: s.fromNodeKey,
							toNodeKey: s.toNodeKey
						}))
					};
				};

				for (const startNode of traversalStartNodes) {
					for (const edgeIndex of (adjacency.get(startNode.key) || [])) {
						const route = traceRouteFromSeed(startNode.key, edgeIndex);
						if (!route) continue;
						route.routeIndex = routes.length;
						routes.push(route);
						for (const ei of (route.edgeIndices || [])) {
							const edge = edges[ei];
							if (!edge) continue;
							edge.routeKey = route.routeKey;
							edge.routeIndex = route.routeIndex;
						}
					}
				}

				for (let ei = 0; ei < edges.length; ei++) {
					const edge = edges[ei];
					if (edge && !edge.routeKey) {
						const na = nodeByKey.get(edge.nodeA);
						const nb = nodeByKey.get(edge.nodeB);
						if (na && nb && na.junctionId && nb.junctionId && na.junctionId !== nb.junctionId) {
							edge.routeKey = orientPairKey(na.junctionId, nb.junctionId);
						}
					}
				}

				const routeKeyBySegmentIndex = new Array(segments.length).fill(null);
				const routeIndexBySegmentIndex = new Array(segments.length).fill(null);
				for (let si = 0; si < segments.length; si++) {
					const seg = segments[si];
					const candidateEdges = (sourceEdges[si] || [])
						.map((edgeIndex) => edges[edgeIndex])
						.filter((edge) => edge && edge.routeKey);
					if (!candidateEdges.length) continue;
					const mx = (seg.x1 + seg.x2) * 0.5;
					const my = (seg.y1 + seg.y2) * 0.5;
					const midpointMatch = candidateEdges.find((edge) => pointOnSegment(edge, mx, my, 2));
					if (midpointMatch) {
						routeKeyBySegmentIndex[si] = midpointMatch.routeKey;
						routeIndexBySegmentIndex[si] = Number.isFinite(midpointMatch.routeIndex) ? midpointMatch.routeIndex : null;
						continue;
					}
					const firstKey = candidateEdges[0].routeKey;
					if (candidateEdges.every((edge) => edge.routeKey === firstKey)) {
						routeKeyBySegmentIndex[si] = firstKey;
						const idxSet = new Set(candidateEdges.map((edge) => edge.routeIndex).filter((idx) => Number.isFinite(idx)));
						if (idxSet.size === 1) {
							routeIndexBySegmentIndex[si] = Array.from(idxSet)[0];
						}
					}
				}

				return { segments, registry, routeKeyBySegmentIndex, routeIndexBySegmentIndex, routes, edges, nodeByKey, adjacency, sourceEdges, edgeEffectiveLengthByIndex, segmentEffectiveLengthByIndex };
			}

			function applyKirchhoffSectionSolve(layout) {
			if (!kirchhoffSolverInstance) return null;
			return kirchhoffSolverInstance.applyKirchhoffSectionSolve(layout);
		}

			function drawQueuedWireResistanceLabels(layout) {
				if (!layout) return;
				const wireLabelValueBySegmentIndex = {};
				const routeGraph = buildCircuitRouteGraph(layout);
				const segments = routeGraph && Array.isArray(routeGraph.segments)
					? routeGraph.segments
					: buildCircuitVoltageSegments(layout);
				if (segments.length === 0) return;
				const sectionColorByPairKey = (state && state.sectionColorByPairKey) ? state.sectionColorByPairKey : {};
				const sectionColorByRouteIndex = (state && state.sectionColorByRouteIndex) ? state.sectionColorByRouteIndex : {};
				const sectionCurrentByRouteIndex = (state && state.sectionCurrentByRouteIndex) ? state.sectionCurrentByRouteIndex : {};
				const sectionCurrentByPairKey = (state && state.sectionCurrentByPairKey) ? state.sectionCurrentByPairKey : {};
				const registry = routeGraph && routeGraph.registry
					? routeGraph.registry
					: ((typeof sceneRenderer !== "undefined" && sceneRenderer && typeof sceneRenderer.buildJunctionLabelRegistry === "function")
						? sceneRenderer.buildJunctionLabelRegistry(layout)
						: null);
				const pointByLabel = registry
					? Object.fromEntries((registry.junctions || []).map((j) => [j.id, j]))
					: {};
				const routeKeyBySegmentIndex = routeGraph && Array.isArray(routeGraph.routeKeyBySegmentIndex)
					? routeGraph.routeKeyBySegmentIndex
					: [];
				const routeIndexBySegmentIndex = routeGraph && Array.isArray(routeGraph.routeIndexBySegmentIndex)
					? routeGraph.routeIndexBySegmentIndex
					: [];
				const segmentEffectiveLengthByIndex = routeGraph && Array.isArray(routeGraph.segmentEffectiveLengthByIndex)
					? routeGraph.segmentEffectiveLengthByIndex
					: [];
				// EPS_GEOM: perpendicular tolerance in layout-space pixels.
				// 6px catches end-bus connectors right at the boundary of a section span.
				const EPS_GEOM = 6;
				const pairGeom = Array.isArray(state.sectionPairGeometries) ? [...state.sectionPairGeometries] : [];
				if (pairGeom.length === 0) {
					const seenPair = new Set();
					for (const [pairKey, color] of Object.entries(sectionColorByPairKey)) {
						const bits = String(pairKey || "").split("|");
						if (bits.length !== 2) continue;
						const a = bits[0], b = bits[1];
						const pa = pointByLabel[a], pb = pointByLabel[b];
						if (!pa || !pb) continue;
						const canonical = [a, b].sort().join("|");
						if (seenPair.has(canonical)) continue;
						seenPair.add(canonical);
						pairGeom.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, color });
					}
				}
				const segMatchesPairGeom = (seg, pg) => {
					const smx = (seg.x1 + seg.x2) * 0.5;
					const smy = (seg.y1 + seg.y2) * 0.5;
					const sdx = seg.x2 - seg.x1, sdy = seg.y2 - seg.y1;
					const pdx = pg.x2 - pg.x1, pdy = pg.y2 - pg.y1;
					const segH = Math.abs(sdx) >= Math.abs(sdy);
					const pgH = Math.abs(pdx) >= Math.abs(pdy);
					if (segH && pgH) {
						const pgy = (pg.y1 + pg.y2) * 0.5;
						return Math.abs(smy - pgy) <= EPS_GEOM
							&& smx >= Math.min(pg.x1, pg.x2) - EPS_GEOM
							&& smx <= Math.max(pg.x1, pg.x2) + EPS_GEOM;
					}
					if (!segH && !pgH) {
						const pgx = (pg.x1 + pg.x2) * 0.5;
						return Math.abs(smx - pgx) <= EPS_GEOM
							&& smy >= Math.min(pg.y1, pg.y2) - EPS_GEOM
							&& smy <= Math.max(pg.y1, pg.y2) + EPS_GEOM;
					}
					return false;
				};
				const orientedPairKeyForSegment = (seg) => {
					if (!registry || typeof registry.labelAt !== "function") return null;
					const a = registry.labelAt(seg.x1, seg.y1);
					const b = registry.labelAt(seg.x2, seg.y2);
					if (!a || !b) return null;
					const pa = pointByLabel[a];
					const pb = pointByLabel[b];
					let from = a;
					let to = b;
					if (pa && pb) {
						const dx = pb.x - pa.x;
						const dy = pb.y - pa.y;
						if (Math.abs(dy) >= Math.abs(dx)) {
							if (pa.y > pb.y) {
								from = b;
								to = a;
							}
						} else if (pa.x > pb.x) {
							from = b;
							to = a;
						}
					}
					return `${from}|${to}`;
				};
				const currentArrowForSegment = (seg, currentValue) => {
					const dx = (Number.isFinite(seg.x2) ? seg.x2 : 0) - (Number.isFinite(seg.x1) ? seg.x1 : 0);
					const dy = (Number.isFinite(seg.y2) ? seg.y2 : 0) - (Number.isFinite(seg.y1) ? seg.y1 : 0);
					const horizontal = Math.abs(dx) >= Math.abs(dy);
					if (!Number.isFinite(currentValue) || Math.abs(currentValue) <= 1e-12) {
						return horizontal ? "\u2194" : "\u2195";
					}
					if (horizontal) {
						const forward = dx >= 0 ? "\u2192" : "\u2190";
						const reverse = dx >= 0 ? "\u2190" : "\u2192";
						return currentValue >= 0 ? forward : reverse;
					}
					const forward = dy >= 0 ? "\u2193" : "\u2191";
					const reverse = dy >= 0 ? "\u2191" : "\u2193";
					return currentValue >= 0 ? forward : reverse;
				};
				const kirchhoffDataForLabels = state && state.solved ? state.solved.kirchhoffSectionData : null;
				const isSeriesFallbackForLabels = !!(kirchhoffDataForLabels
					&& Array.isArray(kirchhoffDataForLabels.sectionRows)
					&& kirchhoffDataForLabels.sectionRows.length === 1
					&& kirchhoffDataForLabels.sectionRows[0]
					&& kirchhoffDataForLabels.sectionRows[0].isSeriesFallback);
				const routedSegmentCurrentByIndex = {};
				if (routeGraph && Array.isArray(routeGraph.routes) && Array.isArray(routeGraph.edges) && routeGraph.routes.length) {
					const votesBySegmentIndex = new Map();
					const addSegmentVote = (segIndex, currentValue) => {
						if (!Number.isFinite(segIndex) || !Number.isFinite(currentValue)) return;
						if (!votesBySegmentIndex.has(segIndex)) votesBySegmentIndex.set(segIndex, []);
						votesBySegmentIndex.get(segIndex).push(currentValue);
					};
					for (const route of routeGraph.routes) {
						if (!route) continue;
						let routeCurrent = Number.isFinite(sectionCurrentByRouteIndex[route.routeIndex])
							? sectionCurrentByRouteIndex[route.routeIndex]
							: NaN;
						if (!Number.isFinite(routeCurrent) && route.routeKey && Number.isFinite(sectionCurrentByPairKey[route.routeKey])) {
							routeCurrent = sectionCurrentByPairKey[route.routeKey];
						}
						if (!Number.isFinite(routeCurrent)) continue;
						const canonicalToTraversal = route.sectionFlipped ? -1 : 1;
						for (const step of (route.edgeSteps || [])) {
							if (!step || !Number.isFinite(step.edgeIndex)) continue;
							const edge = routeGraph.edges[step.edgeIndex];
							if (!edge || !Number.isFinite(edge.sourceSegmentIndex) || !segments[edge.sourceSegmentIndex]) continue;
							const seg = segments[edge.sourceSegmentIndex];
							const traversalVsEdge = (step.fromNodeKey === edge.nodeA && step.toNodeKey === edge.nodeB) ? 1 : -1;
							const forwardCost = Math.hypot(edge.x1 - seg.x1, edge.y1 - seg.y1)
								+ Math.hypot(edge.x2 - seg.x2, edge.y2 - seg.y2);
							const reverseCost = Math.hypot(edge.x1 - seg.x2, edge.y1 - seg.y2)
								+ Math.hypot(edge.x2 - seg.x1, edge.y2 - seg.y1);
							const edgeVsSegment = forwardCost <= reverseCost ? 1 : -1;
							addSegmentVote(edge.sourceSegmentIndex, routeCurrent * canonicalToTraversal * traversalVsEdge * edgeVsSegment);
						}
					}
					for (const [segIndex, votes] of votesBySegmentIndex.entries()) {
						if (!votes.length) continue;
						const avgCurrent = votes.reduce((sum, v) => sum + v, 0) / votes.length;
						routedSegmentCurrentByIndex[segIndex] = avgCurrent;
					}
					let routedOrientationMetric = 0;
					for (const [k, cur] of Object.entries(routedSegmentCurrentByIndex)) {
						const seg = segments[Number(k)];
						if (!seg || !Number.isFinite(cur)) continue;
						if (seg.role === "component-main" || seg.role === "switch-blade") continue;
						if (!Number.isFinite(seg.v1) || !Number.isFinite(seg.v2)) continue;
						const dv = seg.v2 - seg.v1;
						if (Math.abs(dv) <= 1e-12) continue;
						routedOrientationMetric += cur * (-dv);
					}
					if (routedOrientationMetric < 0) {
						for (const k of Object.keys(routedSegmentCurrentByIndex)) {
							routedSegmentCurrentByIndex[k] = -routedSegmentCurrentByIndex[k];
						}
					}
				}
				const shortLoopSegmentCurrentByIndex = {};
				const seriesLoopCurrentSignBySegmentIndex = {};
				if (isSeriesFallbackForLabels && routeGraph && Array.isArray(routeGraph.edges) && routeGraph.edges.length) {
					const edges = routeGraph.edges;
					const adjacency = routeGraph.adjacency instanceof Map ? routeGraph.adjacency : new Map();
					const signVotesBySegment = new Map();
					const addVote = (segIndex, vote) => {
						if (!Number.isFinite(segIndex) || !Number.isFinite(vote) || vote === 0) return;
						if (!signVotesBySegment.has(segIndex)) signVotesBySegment.set(segIndex, []);
						signVotesBySegment.get(segIndex).push(vote);
					};
					let currentEdgeIndex = 0;
					let fromNode = edges[0].nodeA;
					let toNode = edges[0].nodeB;
					const visitedEdge = new Set();
					while (Number.isFinite(currentEdgeIndex) && !visitedEdge.has(currentEdgeIndex)) {
						visitedEdge.add(currentEdgeIndex);
						const edge = edges[currentEdgeIndex];
						if (!edge) break;
						const segIndex = Number.isFinite(edge.sourceSegmentIndex) ? edge.sourceSegmentIndex : null;
						if (Number.isFinite(segIndex) && segments[segIndex]) {
							const seg = segments[segIndex];
							const forwardCost = Math.hypot((edge.x1 || 0) - (seg.x1 || 0), (edge.y1 || 0) - (seg.y1 || 0))
								+ Math.hypot((edge.x2 || 0) - (seg.x2 || 0), (edge.y2 || 0) - (seg.y2 || 0));
							const reverseCost = Math.hypot((edge.x1 || 0) - (seg.x2 || 0), (edge.y1 || 0) - (seg.y2 || 0))
								+ Math.hypot((edge.x2 || 0) - (seg.x1 || 0), (edge.y2 || 0) - (seg.y1 || 0));
							const edgeDirVsSeg = forwardCost <= reverseCost ? 1 : -1;
							const traversalDirVsEdge = (fromNode === edge.nodeA && toNode === edge.nodeB) ? 1 : -1;
							addVote(segIndex, traversalDirVsEdge * edgeDirVsSeg);
						}
						const nextCandidates = (adjacency.get(toNode) || []).filter((idx) => idx !== currentEdgeIndex);
						if (!nextCandidates.length) break;
						let nextEdgeIndex = nextCandidates[0];
						const unvisited = nextCandidates.find((idx) => !visitedEdge.has(idx));
						if (Number.isFinite(unvisited)) nextEdgeIndex = unvisited;
						const nextEdge = edges[nextEdgeIndex];
						if (!nextEdge) break;
						const nextNode = nextEdge.nodeA === toNode ? nextEdge.nodeB : nextEdge.nodeA;
						if (!nextNode) break;
						fromNode = toNode;
						toNode = nextNode;
						currentEdgeIndex = nextEdgeIndex;
					}
					for (const [segIndex, votes] of signVotesBySegment.entries()) {
						const net = votes.reduce((sum, v) => sum + v, 0);
						seriesLoopCurrentSignBySegmentIndex[segIndex] = net >= 0 ? 1 : -1;
					}
					let orientationMetric = 0;
					for (const [k, sgn] of Object.entries(seriesLoopCurrentSignBySegmentIndex)) {
						const seg = segments[Number(k)];
						if (!seg || seg.role === "component-main" || seg.role === "switch-blade") continue;
						if (!seg || !Number.isFinite(seg.v1) || !Number.isFinite(seg.v2)) continue;
						const dv = seg.v2 - seg.v1;
						if (Math.abs(dv) <= 1e-12) continue;
						orientationMetric += sgn * (-dv);
					}
					const globalFactor = orientationMetric < 0 ? -1 : 1;
					for (const k of Object.keys(seriesLoopCurrentSignBySegmentIndex)) {
						seriesLoopCurrentSignBySegmentIndex[k] *= globalFactor;
					}
				}
				const labelAnchorSegmentByComponent = new Map();
				const componentLabelAnchorKey = (seg) => {
					if (!seg || !seg.componentId) return null;
					const section = seg.componentSection || "main";
					return `${seg.componentId}:${section}`;
				};
				for (let si = 0; si < segments.length; si++) {
					const seg = segments[si];
					if (!seg || seg.role !== "component-main" || !seg.componentId) continue;
					if (!Number.isFinite(seg.x1) || !Number.isFinite(seg.y1) || !Number.isFinite(seg.x2) || !Number.isFinite(seg.y2)) continue;
					const rawLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
					const effLen = Number.isFinite(segmentEffectiveLengthByIndex[si])
						? segmentEffectiveLengthByIndex[si]
						: rawLen;
					const anchorKey = componentLabelAnchorKey(seg);
					if (!anchorKey) continue;
					const existing = labelAnchorSegmentByComponent.get(anchorKey);
					if (!existing || effLen > existing.len) {
						labelAnchorSegmentByComponent.set(anchorKey, { si, len: effLen });
					}
				}
				const pointKey = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
				const baseResistanceByIndex = new Array(segments.length).fill(0);
				const labelEligibleByIndex = new Array(segments.length).fill(false);
				const tinyResistanceCarryByIndex = new Array(segments.length).fill(0);
				const segmentEndpointKeys = new Array(segments.length).fill(null);
				const segmentsByPointKey = new Map();
				for (let si = 0; si < segments.length; si++) {
					const seg = segments[si];
					if (!seg) continue;
					if (seg && seg.role === "component-main" && seg.componentId) {
						const anchor = labelAnchorSegmentByComponent.get(componentLabelAnchorKey(seg));
						if (!anchor || anchor.si !== si) continue;
					}
					if (!Number.isFinite(seg.x1) || !Number.isFinite(seg.y1) || !Number.isFinite(seg.x2) || !Number.isFinite(seg.y2)) continue;
					const dx = seg.x2 - seg.x1;
					const dy = seg.y2 - seg.y1;
					const rawLen = Math.hypot(dx, dy);
					const len = Number.isFinite(segmentEffectiveLengthByIndex[si])
						? segmentEffectiveLengthByIndex[si]
						: rawLen;
					if (!(len > 0)) continue;
					const isComponentSegment = seg && seg.role === "component-main" && !!seg.componentId;
					let segmentR = len * SHORT_WIRE_R_PER_PIXEL;
					if (isComponentSegment) {
						const cid = seg.componentId;
						if (isExtraCell(cid)) {
							segmentR = seg.componentSection === "internal-resistor"
								? componentIntrinsicResistance(cid)
								: 0;
						} else if (isBranchSwitch(cid)) {
							segmentR = componentIntrinsicResistance(cid);
						} else {
							segmentR = resistorValue(cid);
						}
					}
					segmentR = Math.max(0, Number.isFinite(segmentR) ? segmentR : 0);
					baseResistanceByIndex[si] = segmentR;
					labelEligibleByIndex[si] = len > 6;
					const k1 = pointKey(seg.x1, seg.y1);
					const k2 = pointKey(seg.x2, seg.y2);
					segmentEndpointKeys[si] = { k1, k2 };
					if (!segmentsByPointKey.has(k1)) segmentsByPointKey.set(k1, []);
					if (!segmentsByPointKey.has(k2)) segmentsByPointKey.set(k2, []);
					segmentsByPointKey.get(k1).push(si);
					segmentsByPointKey.get(k2).push(si);
				}
				for (let si = 0; si < segments.length; si++) {
					if (labelEligibleByIndex[si]) continue;
					const tinyR = baseResistanceByIndex[si];
					if (!(tinyR > 0)) continue;
					const endpoints = segmentEndpointKeys[si];
					if (!endpoints) continue;
					const candidateSet = new Set([
						...(segmentsByPointKey.get(endpoints.k1) || []),
						...(segmentsByPointKey.get(endpoints.k2) || [])
					]);
					candidateSet.delete(si);
					const candidates = Array.from(candidateSet).filter((idx) => labelEligibleByIndex[idx]);
					if (!candidates.length) continue;
					let targetIndex = candidates[0];
					let bestR = baseResistanceByIndex[targetIndex] || 0;
					for (const idx of candidates) {
						const r = baseResistanceByIndex[idx] || 0;
						if (r > bestR) {
							bestR = r;
							targetIndex = idx;
						}
					}
					tinyResistanceCarryByIndex[targetIndex] += tinyR;
				}
				const showWireLabels = wireResistanceLabelsEnabled();
				if (showWireLabels) {
					ctx.save();
					const dpr = window.devicePixelRatio || 1;
					ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
				}
				for (let si = 0; si < segments.length; si++) {
					const seg = segments[si];
					if (seg && seg.role === "component-main" && seg.componentId) {
						const anchor = labelAnchorSegmentByComponent.get(componentLabelAnchorKey(seg));
						if (!anchor || anchor.si !== si) continue;
					}
					if (!Number.isFinite(seg.x1) || !Number.isFinite(seg.y1) || !Number.isFinite(seg.x2) || !Number.isFinite(seg.y2)) continue;
					const dx = seg.x2 - seg.x1;
					const dy = seg.y2 - seg.y1;
					const rawLen = Math.hypot(dx, dy);
					if (!(rawLen > 1e-9)) continue;
					const len = Number.isFinite(segmentEffectiveLengthByIndex[si])
						? segmentEffectiveLengthByIndex[si]
						: rawLen;
					const isComponentSegment = seg && seg.role === "component-main" && !!seg.componentId;
					let segmentR = Math.max(0, Number.isFinite(baseResistanceByIndex[si]) ? baseResistanceByIndex[si] : 0);
					segmentR += Math.max(0, Number.isFinite(tinyResistanceCarryByIndex[si]) ? tinyResistanceCarryByIndex[si] : 0);
					const label = rawLen < 32
						? formatCompactWireResistance(segmentR)
						: formatWireResistance(segmentR);
					const mx = (seg.x1 + seg.x2) * 0.5;
					const my = (seg.y1 + seg.y2) * 0.5;
					const nx = -dy / rawLen;
					const ny = dx / rawLen;
					const labelOffset = seg.role === "switch-blade" ? 18 : (rawLen < 24 ? 11 : 16);
					const fontSize = rawLen < 24 ? 10 : 12;
					const sx = (mx - nx * labelOffset) * state.viewZoom + state.viewPanX;
					const sy = (my - ny * labelOffset) * state.viewZoom + state.viewPanY;
					let rowColor = "rgba(15, 100, 45, 1)";
					let matched = false;
					const routeKey = routeKeyBySegmentIndex[si] || null;
					const routeIndex = routeIndexBySegmentIndex[si];
					if (Number.isFinite(routeIndex) && sectionColorByRouteIndex[routeIndex]) {
						rowColor = sectionColorByRouteIndex[routeIndex];
						matched = true;
					}
					for (const pg of pairGeom) {
						if (matched) break;
						if (segMatchesPairGeom(seg, pg)) {
							rowColor = pg.color;
							matched = true;
							break;
						}
					}
					if (!matched && routeKey && sectionColorByPairKey[routeKey]) {
						rowColor = sectionColorByPairKey[routeKey];
						matched = true;
					}
					if (!matched) {
						const pairKey = orientedPairKeyForSegment(seg);
						if (pairKey && sectionColorByPairKey[pairKey]) rowColor = sectionColorByPairKey[pairKey];
					}
					const isSeriesFallbackSolve = isSeriesFallbackForLabels;
					const byId = state.solved && state.solved.byId ? state.solved.byId : null;
					const compSol = (isComponentSegment && byId && seg.componentId) ? byId[seg.componentId] : null;
					const componentEffectiveI = (compSol && Number.isFinite(compSol.I))
						? (compSol.I * (compSol.arrowAlignFactor ?? 1))
						: NaN;
					let wireI = null;
					const isFlatNodeOpenSwitchWire = isNodeToOpenSwitchVoltageSegment(seg);
					if (isFlatNodeOpenSwitchWire) {
						wireI = 0;
					}
					// For components, prefer routedSegmentCurrentByIndex which has the
					// routedOrientationMetric correction applied, over componentEffectiveI which does not.
					if (!isFlatNodeOpenSwitchWire && isComponentSegment && Number.isFinite(routedSegmentCurrentByIndex[si])) {
						wireI = routedSegmentCurrentByIndex[si];
					} else if (!isFlatNodeOpenSwitchWire && isComponentSegment && Number.isFinite(componentEffectiveI)) {
						wireI = componentEffectiveI;
					}
					if (!isFlatNodeOpenSwitchWire && !isComponentSegment && Number.isFinite(shortLoopSegmentCurrentByIndex[si])) {
						wireI = shortLoopSegmentCurrentByIndex[si];
					} else if (!isFlatNodeOpenSwitchWire && !Number.isFinite(wireI) && Number.isFinite(routedSegmentCurrentByIndex[si])) {
						wireI = routedSegmentCurrentByIndex[si];
					}
					if (!Number.isFinite(wireI) && !isSeriesFallbackSolve) {
						const pairKey2 = orientedPairKeyForSegment(seg);
						if (pairKey2 && Number.isFinite(sectionCurrentByPairKey[pairKey2])) {
							wireI = sectionCurrentByPairKey[pairKey2];
						} else if (routeKey && Number.isFinite(sectionCurrentByPairKey[routeKey])) {
							wireI = sectionCurrentByPairKey[routeKey];
						} else if (Number.isFinite(routeIndex) && Number.isFinite(sectionCurrentByRouteIndex[routeIndex])) {
							wireI = sectionCurrentByRouteIndex[routeIndex];
						}
					}
					if (!Number.isFinite(wireI) && isComponentSegment && compSol && Number.isFinite(compSol.I)) {
						wireI = compSol.I;
					}
					if (!Number.isFinite(wireI) && Number.isFinite(seg.v1) && Number.isFinite(seg.v2) && segmentR > 1e-12) {
						wireI = -(seg.v2 - seg.v1) / segmentR;
					}
					if (!Number.isFinite(wireI) && state.solved && Number.isFinite(state.solved.Itotal)) {
						wireI = state.solved.Itotal;
					}
					if (isSeriesFallbackSolve && state.solved && Number.isFinite(state.solved.Itotal)) {
						const loopAbsI = Math.abs(state.solved.Itotal);
						const dv = (Number.isFinite(seg.v1) && Number.isFinite(seg.v2)) ? (seg.v2 - seg.v1) : NaN;
						const loopSign = Number.isFinite(seriesLoopCurrentSignBySegmentIndex[si])
							? seriesLoopCurrentSignBySegmentIndex[si]
							: NaN;
						if (isComponentSegment) {
							// Use the same orientation-corrected loop sign as wire segments.
							if (Number.isFinite(loopSign) && Math.abs(loopSign) > 0) {
								wireI = loopSign * loopAbsI;
							} else if (!Number.isFinite(wireI) || Math.abs(wireI) <= 1e-12) {
								if (Number.isFinite(dv) && Math.abs(dv) > 1e-12) {
									wireI = -Math.sign(dv) * loopAbsI;
								} else {
									wireI = loopAbsI;
								}
							}
						} else {
							if (Number.isFinite(loopSign) && Math.abs(loopSign) > 0) {
								wireI = loopSign * loopAbsI;
							} else if (Number.isFinite(dv) && Math.abs(dv) > 1e-12) {
								wireI = -Math.sign(dv) * loopAbsI;
							} else if (Number.isFinite(wireI) && Math.abs(wireI) > 1e-12) {
								wireI = Math.sign(wireI) * loopAbsI;
							} else {
								wireI = loopAbsI;
							}
						}
					}
					let arrowCurrent = Number.isFinite(wireI) ? wireI : NaN;
					let arrowSource = Number.isFinite(wireI) ? "wire" : "none";
					if (isComponentSegment && (!Number.isFinite(arrowCurrent) || Math.abs(arrowCurrent) <= 1e-12) && Number.isFinite(componentEffectiveI)) {
						arrowCurrent = componentEffectiveI;
						arrowSource = "component";
					}
					if ((!Number.isFinite(arrowCurrent) || Math.abs(arrowCurrent) <= 1e-12)
						&& Number.isFinite(seg.v1)
						&& Number.isFinite(seg.v2)
						&& Math.abs(seg.v2 - seg.v1) > 1e-15) {
						arrowCurrent = -(seg.v2 - seg.v1);
						arrowSource = "dv";
					}
					const hasPD = Number.isFinite(wireI);
					let pdValue = null;
					let pdSignedValue = null;
					let nodeVoltageLabel = null;
					const segmentPd = (Number.isFinite(seg.v1) && Number.isFinite(seg.v2)) ? (seg.v2 - seg.v1) : NaN;
					if (isComponentSegment) {
						if (isExtraCell(seg.componentId) && seg.componentSection === "internal-resistor" && Number.isFinite(segmentPd)) {
							pdSignedValue = segmentPd;
							pdValue = Math.abs(segmentPd);
						} else if (isExtraCell(seg.componentId) && seg.componentSection === "cell-emf" && Number.isFinite(segmentPd)) {
							pdSignedValue = segmentPd;
							pdValue = Math.abs(segmentPd);
						} else if (Number.isFinite(segmentPd)) {
							pdSignedValue = segmentPd;
							pdValue = Math.abs(segmentPd);
						} else if (hasPD) {
							pdSignedValue = wireI * segmentR;
							pdValue = Math.abs(wireI) * segmentR;
						}
					} else if (Number.isFinite(segmentPd)) {
						pdSignedValue = segmentPd;
						pdValue = Math.abs(segmentPd);
					} else if (hasPD) {
						pdSignedValue = wireI * segmentR;
						pdValue = Math.abs(wireI) * segmentR;
					}
					if (isFlatNodeOpenSwitchWire) {
						pdValue = null;
						pdSignedValue = Number.isFinite(seg.v1) ? seg.v1 : pdSignedValue;
						nodeVoltageLabel = Number.isFinite(seg.v1) ? `${seg.v1.toFixed(2)} V` : null;
					}
					if (!Number.isFinite(pdSignedValue) && Number.isFinite(seg.v1) && Number.isFinite(seg.v2)) {
						pdSignedValue = seg.v2 - seg.v1;
					}
					const currentDirectionSign = (Number.isFinite(arrowCurrent) || isInfiniteCurrentValue(arrowCurrent))
						? (arrowCurrent < 0 ? -1 : 1)
						: NaN;
					const isOpenSwitchGap = isOpenSwitchGapVoltageSegment(seg);
					const isCellEmfSegment = !!(isComponentSegment
						&& isExtraCell(seg.componentId)
						&& seg.componentSection === "cell-emf");
					const resistiveDirected = Number.isFinite(wireI)
						? (-Math.abs(wireI) * segmentR)
						: NaN;
					const cellEmfMagnitude = (isCellEmfSegment && Number.isFinite(componentEmf(seg.componentId)))
						? Math.abs(componentEmf(seg.componentId))
						: NaN;
					const pdPlusEmfDirected = isOpenSwitchGap
						? (Number.isFinite(pdSignedValue) ? pdSignedValue : NaN)
						: (isCellEmfSegment
						? (Number.isFinite(cellEmfMagnitude)
							? cellEmfMagnitude
							: (Number.isFinite(pdSignedValue) ? Math.abs(pdSignedValue) : NaN))
						: (Number.isFinite(resistiveDirected)
							? resistiveDirected
						: (Number.isFinite(pdSignedValue)
							? (Number.isFinite(currentDirectionSign) ? (pdSignedValue * currentDirectionSign) : pdSignedValue)
							: NaN)));
					const formatSignedWireVoltage = (v) => {
						if (!Number.isFinite(v)) return null;
						const txt = formatWireVoltagePD(v);
						return v >= 0 ? `+${txt}` : txt;
					};
					const pdLabel = isFlatNodeOpenSwitchWire
						? nodeVoltageLabel
						: (Number.isFinite(pdPlusEmfDirected)
							? formatSignedWireVoltage(pdPlusEmfDirected)
							: null);
					const currentMagnitudeSource = Number.isFinite(wireI)
						? wireI
						: (Number.isFinite(arrowCurrent) || isInfiniteCurrentValue(arrowCurrent) ? arrowCurrent : NaN);
					const currentMagnitudeLabel = (Number.isFinite(currentMagnitudeSource) || isInfiniteCurrentValue(currentMagnitudeSource))
						? formatCurrentLabel(currentMagnitudeSource, state.solved && state.solved.forceInfiniteAllCurrents === true)
						: null;
					wireLabelValueBySegmentIndex[si] = {
						R: segmentR,
						pdValue: Number.isFinite(pdValue) ? pdValue : null,
						signedPdValue: Number.isFinite(pdSignedValue) ? pdSignedValue : null,
						directedPdDisplay: Number.isFinite(pdPlusEmfDirected) ? pdPlusEmfDirected : null,
						displayCurrent: (Number.isFinite(currentMagnitudeSource) || isInfiniteCurrentValue(currentMagnitudeSource))
							? currentMagnitudeSource
							: null,
						isComponentSegment,
						componentId: seg.componentId || null
					};
					if (!showWireLabels || !labelEligibleByIndex[si]) continue;
					if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
					const currentArrow = currentArrowForSegment(seg, arrowCurrent);
					const labelWithArrow = `${currentArrow} ${label}`;
					const labelLines = [labelWithArrow];
					if (pdLabel) labelLines.push(pdLabel);
					if (currentMagnitudeLabel) labelLines.push(`I ${currentMagnitudeLabel}`);
					if (isComponentSegment && state.debugLabels) {
						const compArrowI = componentEffectiveI;
						const fmtDbgA = (v) => Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(3)}` : "na";
						labelLines.push(`Iw:${fmtDbgA(wireI)} Ic:${fmtDbgA(compArrowI)} Ia:${fmtDbgA(arrowCurrent)} src:${arrowSource}`);
					}
					ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
					const lineH = fontSize + 4;
					const tw = Math.max(...labelLines.map((l) => ctx.measureText(l).width));
					const totalH = labelLines.length * lineH + 2;
					const boxTop = sy - (labelLines.length - 1) * lineH / 2 - fontSize * 0.65;
					ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
					ctx.fillRect(sx - tw / 2 - 3, boxTop, tw + 6, totalH);
					ctx.strokeStyle = "rgba(45, 55, 90, 0.28)";
					ctx.lineWidth = 1;
					ctx.strokeRect(sx - tw / 2 - 3, boxTop, tw + 6, totalH);
					ctx.fillStyle = rowColor;
					for (let li = 0; li < labelLines.length; li++) {
						const lineY = sy - (labelLines.length - 1) * lineH / 2 + li * lineH;
						ctx.fillText(labelLines[li], sx, lineY);
					}
				}
				state.wireLabelValueBySegmentIndex = wireLabelValueBySegmentIndex;
				if (showWireLabels) ctx.restore();
			}

			function buildWireLabelNodeRegistry(layout) {
				const tableRows = Array.isArray(state.wireLabelNodePairRows) ? state.wireLabelNodePairRows : [];
				if (tableRows.length) {
					const nodeKeySet = new Set();
					for (const row of tableRows) {
						if (row && row.fromKey) nodeKeySet.add(String(row.fromKey));
						if (row && row.toKey) nodeKeySet.add(String(row.toKey));
					}
					const nodes = Array.from(nodeKeySet)
						.map((key) => {
							const bits = key.split("|");
							if (bits.length !== 2) return null;
							const x = Number(bits[0]);
							const y = Number(bits[1]);
							if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
							return { x, y };
						})
						.filter(Boolean)
						.sort((a, b) => (a.y - b.y) || (a.x - b.x))
						.map((n, i) => ({ ...n, id: "N" + (i + 1) }));
					return { nodes };
				}

				if (!layout) return { nodes: [] };
				const routeGraph = buildCircuitRouteGraph(layout);
				const segments = routeGraph && Array.isArray(routeGraph.segments)
					? routeGraph.segments
					: buildCircuitVoltageSegments(layout);
				const segmentEffectiveLengthByIndex = routeGraph && Array.isArray(routeGraph.segmentEffectiveLengthByIndex)
					? routeGraph.segmentEffectiveLengthByIndex
					: [];
				const keyFor = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
				const nodeByKey = new Map();

				for (let si = 0; si < segments.length; si++) {
					const seg = segments[si];
					if (!seg) continue;
					if (!Number.isFinite(seg.x1) || !Number.isFinite(seg.y1) || !Number.isFinite(seg.x2) || !Number.isFinite(seg.y2)) continue;
					const rawLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
					const len = Number.isFinite(segmentEffectiveLengthByIndex[si])
						? segmentEffectiveLengthByIndex[si]
						: rawLen;
					if (!(len > 6)) continue;

					const k1 = keyFor(seg.x1, seg.y1);
					const k2 = keyFor(seg.x2, seg.y2);
					if (!nodeByKey.has(k1)) nodeByKey.set(k1, { x: seg.x1, y: seg.y1 });
					if (!nodeByKey.has(k2)) nodeByKey.set(k2, { x: seg.x2, y: seg.y2 });
				}

				const nodes = Array.from(nodeByKey.values())
					.sort((a, b) => (a.y - b.y) || (a.x - b.x))
					.map((n, i) => ({ ...n, id: "N" + (i + 1) }));
				return { nodes };
			}

			function drawWireLabelNodeMarkers(layout) {
				if (!wireResistanceLabelsEnabled()) return;
				if (!layout) return;
				const registry = buildWireLabelNodeRegistry(layout);
				if (!registry || !Array.isArray(registry.nodes) || registry.nodes.length === 0) return;
				ctx.save();
				const dpr = window.devicePixelRatio || 1;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.font = "700 10px system-ui, sans-serif";
				for (const node of registry.nodes) {
					const sx = node.x * state.viewZoom + state.viewPanX;
					const sy = node.y * state.viewZoom + state.viewPanY;
					if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
					const text = node.id;
					const tw = ctx.measureText(text).width;
					const tx = sx + 6;
					const ty = sy - 8;
					ctx.fillStyle = "rgba(255,255,255,0.92)";
					ctx.strokeStyle = "rgba(40,70,120,0.35)";
					ctx.lineWidth = 1;
					ctx.fillRect(tx - 2, ty - 6, tw + 4, 12);
					ctx.strokeRect(tx - 2, ty - 6, tw + 4, 12);
					ctx.fillStyle = "rgba(20,53,79,0.98)";
					ctx.fillText(text, tx, ty);
				}
				ctx.restore();
			}

			function drawNodesIRLabelsOverlay(layout) {
				if (!nodesIRLabelsEnabled()) return;
				if (!layout) return;
				const rows = Array.isArray(state.wireLabelNodePairRows) ? state.wireLabelNodePairRows : [];
				const potentialByKey = (state && state.wireLabelNodePotentialByKey && typeof state.wireLabelNodePotentialByKey === "object")
					? state.wireLabelNodePotentialByKey
					: null;
				if (!rows.length || !potentialByKey) return;

				const nodeKeySet = new Set();
				for (const row of rows) {
					if (row && row.fromKey) nodeKeySet.add(String(row.fromKey));
					if (row && row.toKey) nodeKeySet.add(String(row.toKey));
				}
				if (!nodeKeySet.size) return;

				const parseKeyToPoint = (key) => {
					const bits = String(key || "").split("|");
					if (bits.length !== 2) return null;
					const x = Number(bits[0]);
					const y = Number(bits[1]);
					if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
					return { x, y };
				};

				const nodesOrdered = Array.from(nodeKeySet)
					.map((key) => ({ key, p: parseKeyToPoint(key) }))
					.filter((entry) => !!entry.p)
					.sort((a, b) => (a.p.y - b.p.y) || (a.p.x - b.p.x));
				if (!nodesOrdered.length) return;

				const nodeIdByKey = new Map();
				for (let i = 0; i < nodesOrdered.length; i++) {
					nodeIdByKey.set(nodesOrdered[i].key, "N" + (i + 1));
				}

				const arrowForRow = (row, p1, p2) => {
					const dx = p2.x - p1.x;
					const dy = p2.y - p1.y;
					const horizontal = Math.abs(dx) >= Math.abs(dy);
					if (!Number.isFinite(row.current) || Math.abs(row.current) <= 1e-12) {
						return horizontal ? "\u2194" : "\u2195";
					}
					if (horizontal) return dx >= 0 ? "\u2192" : "\u2190";
					return dy >= 0 ? "\u2193" : "\u2191";
				};

				const formatSignedWireVoltage = (v) => {
					if (!Number.isFinite(v)) return null;
					const txt = formatWireVoltagePD(v);
					return v >= 0 ? `+${txt}` : txt;
				};

				ctx.save();
				const dpr = window.devicePixelRatio || 1;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";

				for (const row of rows) {
					if (!row || !row.fromKey || !row.toKey) continue;
					const p1 = parseKeyToPoint(row.fromKey);
					const p2 = parseKeyToPoint(row.toKey);
					if (!p1 || !p2) continue;
					const rawLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
					if (!(rawLen > 6)) continue;

					const dx = p2.x - p1.x;
					const dy = p2.y - p1.y;
					const mx = (p1.x + p2.x) * 0.5;
					const my = (p1.y + p2.y) * 0.5;
					const nx = -dy / rawLen;
					const ny = dx / rawLen;
					const fontSize = rawLen < 24 ? 10 : 12;
					const lineH = fontSize + 4;
					const labelOffset = rawLen < 24 ? 11 : 16;
					const sx = (mx - nx * labelOffset) * state.viewZoom + state.viewPanX;
					const sy = (my - ny * labelOffset) * state.viewZoom + state.viewPanY;
					if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;

					const arrow = arrowForRow(row, p1, p2);
					const rText = `${arrow} ${formatCompactWireResistance(Math.max(0, Number.isFinite(row.R) ? row.R : 0))}`;
					const dvText = formatSignedWireVoltage(row.pdPlusEmf);
					const iText = Number.isFinite(row.current)
						? `I ${formatCurrentLabel(row.current, state.solved && state.solved.forceInfiniteAllCurrents === true)}`
						: null;
					const labelLines = [rText];
					if (dvText) labelLines.push(dvText);
					if (iText) labelLines.push(iText);

					ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
					const tw = Math.max(...labelLines.map((line) => ctx.measureText(line).width));
					const totalH = labelLines.length * lineH + 2;
					const boxTop = sy - (labelLines.length - 1) * lineH / 2 - fontSize * 0.65;

					ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
					ctx.fillRect(sx - tw / 2 - 3, boxTop, tw + 6, totalH);
					ctx.strokeStyle = "rgba(45, 55, 90, 0.28)";
					ctx.lineWidth = 1;
					ctx.strokeRect(sx - tw / 2 - 3, boxTop, tw + 6, totalH);

					ctx.fillStyle = row.rowColor || "rgba(20,53,79,0.98)";
					for (let li = 0; li < labelLines.length; li++) {
						const lineY = sy - (labelLines.length - 1) * lineH / 2 + li * lineH;
						ctx.fillText(labelLines[li], sx, lineY);
					}
				}

				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.font = "700 10px system-ui, sans-serif";
				for (const entry of nodesOrdered) {
					const node = entry.p;
					const nodeId = nodeIdByKey.get(entry.key) || "?";
					const potential = potentialByKey[entry.key];
					const nodeText = Number.isFinite(potential)
						? `${nodeId} ${formatWireVoltagePD(potential)}`
						: nodeId;
					const sx = node.x * state.viewZoom + state.viewPanX;
					const sy = node.y * state.viewZoom + state.viewPanY;
					if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
					const tw = ctx.measureText(nodeText).width;
					const tx = sx + 6;
					const ty = sy - 8;
					ctx.fillStyle = "rgba(255,255,255,0.92)";
					ctx.strokeStyle = "rgba(40,70,120,0.35)";
					ctx.lineWidth = 1;
					ctx.fillRect(tx - 2, ty - 6, tw + 4, 12);
					ctx.strokeRect(tx - 2, ty - 6, tw + 4, 12);
					ctx.fillStyle = "rgba(20,53,79,0.98)";
					ctx.fillText(nodeText, tx, ty);
				}
				ctx.restore();
			}
			function drawWireResistanceSolveDiagnostic(layout) {
				if (!wireResistanceLabelsEnabled()) return;
				if (!layout || !state.solved || !state.solved.wireResistanceDiagnostic) return;
				const diag = state.solved.wireResistanceDiagnostic;
				const lines = [
					"Kirchhoff wire-R diagnostic",
					"Total wire R: " + formatCompactWireResistance(Math.max(0, diag.totalWireR || 0)),
					"I with wire R: " + formatSignedCurrentLabel(diag.iWith),
					"\u0394I (with - without): " + formatSignedCurrentLabel(diag.deltaI)
				];
				ctx.save();
				const dpr = window.devicePixelRatio || 1;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.font = "600 12px system-ui, sans-serif";
				ctx.textBaseline = "middle";
				let maxW = 0;
				for (const line of lines) {
					maxW = Math.max(maxW, ctx.measureText(line).width);
				}
				const padX = 10;
				const padY = 8;
				const lineH = 17;
				const boxW = maxW + padX * 2;
				const boxH = padY * 2 + lineH * lines.length;
				const x = layout.w - boxW - 16;
				const y = 34;
				ctx.fillStyle = "rgba(245, 250, 255, 0.95)";
				ctx.strokeStyle = "rgba(43, 80, 130, 0.9)";
				ctx.lineWidth = 1.25;
				ctx.beginPath();
				ctx.roundRect(x, y, boxW, boxH, 7);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = "#15345c";
				for (let i = 0; i < lines.length; i++) {
					ctx.fillText(lines[i], x + padX, y + padY + lineH * i + lineH * 0.5);
				}
				ctx.restore();
			}

			function drawWireSegment(x1, y1, x2, y2, v1, v2, varLabel) {
				wireLabelCounter2D += 1;
				ctx.save();
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				if (state.voltageColorMode && Number.isFinite(v1) && Number.isFinite(v2)) {
					const grad = ctx.createLinearGradient(x1, y1, x2, y2);
					grad.addColorStop(0, voltageToColor(v1));
					grad.addColorStop(1, voltageToColor(v2));
					ctx.strokeStyle = grad;
				} else {
					ctx.strokeStyle = "#111";
				}
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
				enqueueWireResistanceSegment(x1, y1, x2, y2, "wire");
				ctx.restore();
			}

			function drawSwitch(layout) {
				const y = layout.yTop;
				const x = layout.xSwitch;
				const switchClosed = isComponentSwitchClosed(MAIN_SWITCH_ID);
				const hasTopBoundaryParallelStage = layout.stages.length > 0
					&& Array.isArray(layout.stages[0].branches)
					&& layout.stages[0].branches.length > 1;
				const leftV = (state.solved && Number.isFinite(state.solved.switchVLeft)) ? state.solved.switchVLeft : 0;
				const rightV = (state.solved && Number.isFinite(state.solved.switchVRight)) ? state.solved.switchVRight : leftV;
				const networkTopV = (state.solved && state.solved.stageNodeV && Number.isFinite(state.solved.stageNodeV[0]))
					? state.solved.stageNodeV[0]
					: rightV;
				drawWireSegment(layout.xCell, y, x - 16, y, leftV, leftV, "topBus_L");
				if (x + 16 < layout.xRight - 1e-6) {
					drawWireSegment(x + 16, y, layout.xRight, y, rightV, networkTopV, "topBus_R");
				}
				if (!hasTopBoundaryParallelStage && layout.xRight < layout.topBusRightX - 1e-6) {
					drawWireSegment(layout.xRight, y, layout.topBusRightX, y, networkTopV, networkTopV, "TOP_SPLIT_BUS");
				}
				ctx.save();
				ctx.lineWidth = 5;
				ctx.lineCap = "round";
				const bladeStartX = x - 16;
				const bladeStartY = y;
				const bladeEndX = switchClosed ? (x + 16) : (x + 8);
				const bladeEndY = switchClosed ? y : (y - 16);
				const bladeEndV = switchClosed ? rightV : leftV;
				if (state.voltageColorMode) {
					const bladeGrad = ctx.createLinearGradient(bladeStartX, bladeStartY, bladeEndX, bladeEndY);
					bladeGrad.addColorStop(0, voltageToColor(leftV));
					bladeGrad.addColorStop(1, voltageToColor(bladeEndV));
					ctx.strokeStyle = bladeGrad;
				} else {
					ctx.strokeStyle = "#111";
				}
				ctx.beginPath();
				ctx.moveTo(bladeStartX, bladeStartY);
				ctx.lineTo(bladeEndX, bladeEndY);
				ctx.stroke();
				enqueueWireResistanceSegment(bladeStartX, bladeStartY, bladeEndX, bladeEndY, "switch-blade");
				ctx.fillStyle = state.voltageColorMode ? voltageToColor(leftV) : "#111";
				ctx.beginPath();
				ctx.arc(x - 16, y, 3.6, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = state.voltageColorMode ? voltageToColor(rightV) : "#111";
				ctx.beginPath();
				ctx.arc(x + 16, y, 3.6, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			function drawCell(layout) {
				const x = layout.xCell;
				const topNodeV = (state.solved && Number.isFinite(state.solved.switchVLeft)) ? state.solved.switchVLeft : 0;
				const topPlateV = (state.solved && Number.isFinite(state.solved.cellTopPlateV)) ? state.solved.cellTopPlateV : topNodeV;
				const bottomNodeV = (state.solved && Number.isFinite(state.solved.Vext)) ? state.solved.Vext : 0;
				const totalLeftCellHeight = state.internalR
					? (RES_H + EMF_BODY_HEIGHT + CONNECTOR_WIRE * 4 + CELL_PADDING)
					: (EMF_BODY_HEIGHT + CONNECTOR_WIRE * 2);
				const leftSeriesPathHeight = state.leftSeries.reduce((sum, id) => sum + componentBodyHeight(id) + CONNECTOR_WIRE * 2, 0);
				const totalLeftComponentHeight = totalLeftCellHeight + leftSeriesPathHeight;
				const leftExtra = Math.max(0, (layout.yBottom - layout.yTop) - (totalLeftComponentHeight + END_BUS_CONNECTOR * 2));
				const topEndLead = END_BUS_CONNECTOR + leftExtra * 0.5;
				const componentStartY = Number.isFinite(layout.leftCellStartY) ? layout.leftCellStartY : (layout.yTop + topEndLead + leftSeriesPathHeight);
				const irTop = componentStartY + CONNECTOR_WIRE;
				const irBottom = irTop + RES_H;
				const emfTop = state.internalR ? (irBottom + CONNECTOR_WIRE * 2) : (componentStartY + CONNECTOR_WIRE);
				const emfBottom = emfTop + EMF_BODY_HEIGHT;
				const emfConnectorBottomY = emfBottom + CONNECTOR_WIRE;
				const emfPaddingBottomY = emfConnectorBottomY + (state.internalR ? CELL_PADDING : 0);
				const cellMid = (emfTop + emfBottom) * 0.5;
				const emfSliderX = x - 44;
				const topPlateY = emfTop;
				const bottomPlateY = cellMid - 10;
				const secondTopPlateY = cellMid + 10;
				const secondBottomPlateY = emfBottom;
				const primaryCellPolarity = getCellPolarity(PRIMARY_CELL_ID);
				const primaryTopPlateHalf = primaryCellPolarity > 0 ? 18 : 30;
				const primaryBottomPlateHalf = primaryCellPolarity > 0 ? 30 : 18;
				const primarySecondTopPlateHalf = primaryCellPolarity > 0 ? 18 : 30;
				const primarySecondBottomPlateHalf = primaryCellPolarity > 0 ? 30 : 18;
				const irCenterY = state.internalR ? (irTop + RES_H * 0.5) : componentStartY;
				const irH = RES_H;
				let leftBranchY = layout.yTop;
				let leftBranchV = topNodeV;
				for (const item of (layout.leftSeriesItems || [])) {
					drawWireSegment(x, leftBranchY, x, item.top, leftBranchV, leftBranchV, item.top - leftBranchY > CONNECTOR_WIRE + 1 ? "END_BUS_CONNECTOR" : "CONNECTOR_WIRE");
					drawResistorBody(item, state.drag && state.drag.id === item.id ? state.drag : null, state.solved && state.solved.byId[item.id]);
					const leftSol = state.solved && state.solved.byId[item.id];
					if (leftSol && Number.isFinite(leftSol.Vbottom)) {
						leftBranchV = leftSol.Vbottom;
					}
					leftBranchY = item.bottom;
				}
				if (leftBranchY < componentStartY - 1e-6) {
					drawWireSegment(x, leftBranchY, x, componentStartY, leftBranchV, leftBranchV, "CONNECTOR_WIRE");
				}
				if (state.internalR) {
					drawWireSegment(x, componentStartY, x, irTop, leftBranchV, leftBranchV, "CONNECTOR_WIRE");
					drawWireSegment(x, irBottom, x, irBottom + CONNECTOR_WIRE, topPlateV, topPlateV, "CONNECTOR_WIRE");
					drawWireSegment(x, irBottom + CONNECTOR_WIRE, x, topPlateY, topPlateV, topPlateV, "CONNECTOR_WIRE");
				} else {
					drawWireSegment(x, componentStartY, x, topPlateY, leftBranchV, leftBranchV, "CONNECTOR_WIRE");
				}
				drawWireSegment(x, secondBottomPlateY, x, emfConnectorBottomY, bottomNodeV, bottomNodeV, "CONNECTOR_WIRE");
				if (state.internalR) {
					drawWireSegment(x, emfConnectorBottomY, x, emfPaddingBottomY, bottomNodeV, bottomNodeV, "CELL_PADDING");
				}
				drawWireSegment(x, emfPaddingBottomY, x, layout.yBottom, bottomNodeV, bottomNodeV, "END_BUS_CONNECTOR");
				const cellVoltageAt = (y) => {
					const span = Math.max(1e-6, secondBottomPlateY - topPlateY);
					const t = clamp((y - topPlateY) / span, 0, 1);
					return topPlateV + (bottomNodeV - topPlateV) * t;
				};
				const strokePrimaryCellPlate = (halfWidth, y) => {
					ctx.strokeStyle = state.voltageColorMode ? voltageToColor(cellVoltageAt(y)) : "#111";
					ctx.beginPath();
					ctx.moveTo(x - halfWidth, y);
					ctx.lineTo(x + halfWidth, y);
					ctx.stroke();
				};
				ctx.save();
				ctx.lineWidth = 4;
				strokePrimaryCellPlate(primaryTopPlateHalf, topPlateY);
				strokePrimaryCellPlate(primaryBottomPlateHalf, bottomPlateY);
				strokePrimaryCellPlate(primarySecondTopPlateHalf, secondTopPlateY);
				strokePrimaryCellPlate(primarySecondBottomPlateHalf, secondBottomPlateY);
				if (state.voltageColorMode) {
					ctx.lineCap = "round";
					ctx.lineWidth = 3;
					const battGrad = ctx.createLinearGradient(x, topPlateY, x, secondBottomPlateY);
					battGrad.addColorStop(0, voltageToColor(topPlateV));
					battGrad.addColorStop(1, voltageToColor(bottomNodeV));
					ctx.strokeStyle = battGrad;
					ctx.beginPath();
					ctx.moveTo(x, topPlateY);
					ctx.lineTo(x, secondBottomPlateY);
					ctx.stroke();
				}
				ctx.fillStyle = "#111";
				ctx.font = "700 13px system-ui, sans-serif";
				ctx.textBaseline = "middle";
				ctx.textAlign = "left";
						ctx.fillText(Math.abs(state.solved.Itotal * getCellRInternal(PRIMARY_CELL_ID)).toFixed(2) + " V", 0, +10);
				ctx.fillText("+", x + 36, primaryCellPolarity > 0 ? secondBottomPlateY : topPlateY);
				ctx.font = "600 11px system-ui, sans-serif";
				ctx.fillStyle = "#2d5a8e";
				ctx.textAlign = "right";
				if (state.internalR) {
								ctx.fillText(Math.abs(topPlateVCell2 - topV).toFixed(2) + " V", 0, +10);
					const boxLeft = x - boxHalfWidth;
					const boxRight = x + boxHalfWidth;
					const boxTop = irCenterY - irH / 2 - 12;
					const boxBottom = secondBottomPlateY + 30;
					ctx.strokeStyle = "#202833";
					ctx.lineWidth = 2;
					ctx.setLineDash([7, 5]);
					ctx.strokeRect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop);
					ctx.setLineDash([]);

					ctx.save();
					ctx.translate(x, irCenterY);
					ctx.fillStyle = "#ffffff";
					ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
					ctx.strokeStyle = "#111";
					ctx.lineWidth = 2.8;
					ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
					if (state.voltageColorMode) {
						ctx.lineCap = "round";
						ctx.lineWidth = 3;
						const grad = ctx.createLinearGradient(0, -RES_H / 2, 0, RES_H / 2);
						grad.addColorStop(0, voltageToColor(topNodeV));
						grad.addColorStop(1, voltageToColor(topPlateV));
						ctx.strokeStyle = grad;
						ctx.beginPath();
						ctx.moveTo(0, -RES_H / 2);
						ctx.lineTo(0, RES_H / 2);
						ctx.stroke();
					}
					ctx.fillStyle = "#27374f";
					ctx.font = "700 12px system-ui, sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
							ctx.fillText(Math.abs(state.solved.Itotal * getCellRInternal(PRIMARY_CELL_ID)).toFixed(2) + " V", 0, +10);
					ctx.font = "600 10.5px system-ui, sans-serif";
					ctx.fillStyle = "#334";
					if (state.solved) {
						ctx.fillText(Math.abs(state.solved.Itotal * getCellRInternal(PRIMARY_CELL_ID)).toFixed(2) + " V", 0, +10);
					}
								ctx.fillText(Math.abs(topPlateVCell2 - topV).toFixed(2) + " V", 0, +10);
				}
				ctx.restore();
				drawCanvasSlider(cellEmfSliderKey(PRIMARY_CELL_ID), getCellEmf(PRIMARY_CELL_ID), {
					trackX: emfSliderX,
					trackTop: cellMid - RES_H / 2 + 12,
					trackBottom: cellMid + RES_H / 2 - 6,
					min: 1,
					max: 20,
					step: 0.5,
					label: PRIMARY_CELL_ID + " EMF",
					showValueTop: true,
					valueSuffix: "V"
				});
				drawPolarityHandle(cellPolarityActionKey(PRIMARY_CELL_ID), x + 44, cellMid);
				if (state.internalR) {
					drawCanvasSlider(cellRInternalSliderKey(PRIMARY_CELL_ID), getCellRInternal(PRIMARY_CELL_ID), {
						trackX: x - 36,
						trackTop: irCenterY - RES_H / 2 + 12,
						trackBottom: irCenterY + RES_H / 2 - 6,
						min: 0.2,
						max: 5,
						step: 0.1,
						label: internalResistanceLabel(PRIMARY_CELL_ID),
						showValueTop: true
					});
				}
			}

			function drawResistorBody(item, activeDrag, sol) {
				const x = activeDrag ? activeDrag.x : item.x;
				const y = activeDrag ? activeDrag.y : item.y;
				const extraCell = isExtraCell(item.id);
				const cellPolarity = getCellPolarity(item.id);
				const cellTopPlateHalf = cellPolarity > 0 ? 18 : 30;
				const cellBottomPlateHalf = cellPolarity > 0 ? 30 : 18;
				const cellSecondTopPlateHalf = cellPolarity > 0 ? 18 : 30;
				const cellSecondBottomPlateHalf = cellPolarity > 0 ? 30 : 18;
				const topV = sol && Number.isFinite(sol.Vtop) ? sol.Vtop : 0;
				const bottomV = sol && Number.isFinite(sol.Vbottom) ? sol.Vbottom : topV;
				ctx.save();
				ctx.translate(x, y);
				if (extraCell) {
					if (activeDrag) {
						ctx.fillStyle = "rgba(253,247,232,0.88)";
						ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
						ctx.strokeStyle = "#4a90e2";
						ctx.lineWidth = 3.2;
						ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillStyle = "#27374f";
						ctx.font = "700 13px system-ui, sans-serif";
						ctx.fillText(item.id, 0, 0);
					} else {
						const hasInternal = !!state.internalR;
						const localTop = item.top - item.y;
						const localBottom = item.bottom - item.y;
						const irTop = localTop;
						const irBottom = irTop + RES_H;
						const irCenterY = (irTop + irBottom) * 0.5;
						const emfTop = hasInternal ? (irBottom + CONNECTOR_WIRE * 2) : -30;
						const emfBottom = hasInternal ? (emfTop + EMF_BODY_HEIGHT) : 30;
						const emfMid = (emfTop + emfBottom) * 0.5;
						const bottomConnectorY = hasInternal ? (localBottom - CELL_PADDING) : 38;
						const emfPaddingY = hasInternal ? localBottom : (RES_H / 2);
						const topPlateVCell2 = topV + (((sol && Number.isFinite(sol.I)) ? sol.I : 0) * getCellRInternal(item.id));

						ctx.strokeStyle = "#111";
						ctx.lineWidth = 5;
						ctx.beginPath();
						if (hasInternal) {
							ctx.moveTo(0, localTop); ctx.lineTo(0, irTop);
							ctx.moveTo(0, irBottom); ctx.lineTo(0, emfTop);
							ctx.moveTo(0, emfBottom); ctx.lineTo(0, bottomConnectorY);
							ctx.moveTo(0, bottomConnectorY); ctx.lineTo(0, emfPaddingY);
						} else {
							ctx.moveTo(0, -RES_H / 2); ctx.lineTo(0, -30);
							ctx.moveTo(0, 30);          ctx.lineTo(0, RES_H / 2);
						}
						ctx.stroke();

						if (hasInternal) {
							ctx.save();
							ctx.translate(0, irCenterY);
							ctx.fillStyle = "#ffffff";
							ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
							ctx.strokeStyle = "#111";
							ctx.lineWidth = 2.8;
							ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
							if (state.voltageColorMode) {
								ctx.lineCap = "round";
								ctx.lineWidth = 3;
								const rGrad = ctx.createLinearGradient(0, -RES_H / 2, 0, RES_H / 2);
								rGrad.addColorStop(0, voltageToColor(topV));
								rGrad.addColorStop(1, voltageToColor(topPlateVCell2));
								ctx.strokeStyle = rGrad;
								ctx.beginPath();
								ctx.moveTo(0, -RES_H / 2);
								ctx.lineTo(0, RES_H / 2);
								ctx.stroke();
							}
							ctx.fillStyle = "#27374f";
							ctx.font = "700 12px system-ui, sans-serif";
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillText(internalResistanceLabel(item.id), 0, -22);
							ctx.font = "600 10.5px system-ui, sans-serif";
							ctx.fillStyle = "#334";
							if (sol) {
								ctx.fillText(Math.abs(topPlateVCell2 - topV).toFixed(2) + " V", 0, +10);
							}
							ctx.restore();

							ctx.strokeStyle = "#202833";
							ctx.lineWidth = 2;
							ctx.setLineDash([7, 5]);
							ctx.strokeRect(-72, irTop - 12, 144, localBottom - (irTop - 12));
							ctx.setLineDash([]);
						}

						const plateTop = emfTop;
						const plateSecondTop = emfMid - 10;
						const plateSecondBottom = emfMid + 10;
						const plateBottom = emfBottom;
						const cellVoltageAt = (y) => {
							const span = Math.max(1e-6, plateBottom - plateTop);
							const t = clamp((y - plateTop) / span, 0, 1);
							return topPlateVCell2 + (bottomV - topPlateVCell2) * t;
						};
						const strokeLocalPlate = (halfWidth, y) => {
							ctx.strokeStyle = state.voltageColorMode ? voltageToColor(cellVoltageAt(y)) : "#111";
							ctx.beginPath();
							ctx.moveTo(-halfWidth, y);
							ctx.lineTo(halfWidth, y);
							ctx.stroke();
						};
						ctx.lineWidth = 4;
						strokeLocalPlate(cellTopPlateHalf, plateTop);
						strokeLocalPlate(cellBottomPlateHalf, plateSecondTop);
						strokeLocalPlate(cellSecondTopPlateHalf, plateSecondBottom);
						strokeLocalPlate(cellSecondBottomPlateHalf, plateBottom);
						if (state.voltageColorMode) {
							ctx.lineCap = "round";
							ctx.lineWidth = 5;
							const grad = ctx.createLinearGradient(0, plateTop, 0, plateBottom);
							grad.addColorStop(0, voltageToColor(topPlateVCell2));
							grad.addColorStop(1, voltageToColor(bottomV));
							ctx.strokeStyle = grad;
							ctx.beginPath();
							ctx.moveTo(0, plateTop);
							ctx.lineTo(0, plateBottom);
							ctx.stroke();
						}
						ctx.fillStyle = "#111";
						ctx.font = "700 13px system-ui, sans-serif";
						ctx.textBaseline = "middle";
						ctx.textAlign = "left";
						ctx.fillText("-", 36, cellPolarity > 0 ? plateTop : plateBottom);
						ctx.fillText("+", 36, cellPolarity > 0 ? plateBottom : plateTop);
					}
				} else if (isBranchSwitch(item.id)) {
					const switchClosed = isComponentSwitchClosed(item.id);
					const contactTopY = -16;
					const contactBottomY = 16;
					const bladeEndX = switchClosed ? 0 : 16;
					const bladeEndY = switchClosed ? contactBottomY : (contactBottomY - 8);
					const strokeLocalVertical = (y1, y2, v1, v2) => {
						if (Math.abs(y2 - y1) < 1e-6) return;
						ctx.beginPath();
						ctx.moveTo(0, y1);
						ctx.lineTo(0, y2);
						if (state.voltageColorMode && Number.isFinite(v1) && Number.isFinite(v2)) {
							const grad = ctx.createLinearGradient(0, y1, 0, y2);
							grad.addColorStop(0, voltageToColor(v1));
							grad.addColorStop(1, voltageToColor(v2));
							ctx.strokeStyle = grad;
						} else {
							ctx.strokeStyle = "#111";
						}
						ctx.stroke();
					};
					ctx.lineCap = "round";
					ctx.lineWidth = 5;
					strokeLocalVertical(-RES_H / 2, contactTopY, topV, topV);
					strokeLocalVertical(contactBottomY, RES_H / 2, bottomV, bottomV);
					ctx.beginPath();
					ctx.arc(0, contactTopY, 3.6, 0, Math.PI * 2);
					ctx.arc(0, contactBottomY, 3.6, 0, Math.PI * 2);
					if (state.voltageColorMode) {
						const nodeGrad = ctx.createLinearGradient(0, contactTopY, 0, contactBottomY);
						nodeGrad.addColorStop(0, voltageToColor(topV));
						nodeGrad.addColorStop(1, voltageToColor(bottomV));
						ctx.fillStyle = nodeGrad;
					} else {
						ctx.fillStyle = "#111";
					}
					ctx.fill();
					ctx.beginPath();
					ctx.moveTo(0, contactTopY);
					ctx.lineTo(bladeEndX, bladeEndY);
					if (state.voltageColorMode) {
						const bladeGrad = ctx.createLinearGradient(0, contactTopY, bladeEndX, bladeEndY);
						bladeGrad.addColorStop(0, voltageToColor(topV));
						bladeGrad.addColorStop(1, voltageToColor(switchClosed ? bottomV : topV));
						ctx.strokeStyle = bladeGrad;
					} else {
						ctx.strokeStyle = "#111";
					}
					ctx.stroke();
					enqueueWireResistanceSegment(x, y + contactTopY, x + bladeEndX, y + bladeEndY, "switch-blade");
					ctx.textAlign = "right";
					ctx.textBaseline = "middle";
					ctx.fillStyle = "#27374f";
					ctx.font = activeDrag ? "700 13px system-ui, sans-serif" : "700 12px system-ui, sans-serif";
					ctx.fillText(item.id, -14, -8);
					if (!activeDrag && sol) {
						ctx.font = "600 10.5px system-ui, sans-serif";
						ctx.fillStyle = "#334";
						ctx.fillText(sol.V.toFixed(2) + " V", -14, 8);
					}
				} else {
					ctx.fillStyle = activeDrag ? "rgba(255, 255, 255, 0.88)" : "#ffffff";
					ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
					ctx.strokeStyle = activeDrag ? "#4a90e2" : "#111";
					ctx.lineWidth = activeDrag ? 3.2 : 2.8;
					ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
					if (state.voltageColorMode) {
						ctx.lineCap = "round";
						ctx.lineWidth = 3;
						const grad = ctx.createLinearGradient(0, -RES_H / 2, 0, RES_H / 2);
						grad.addColorStop(0, voltageToColor(topV));
						grad.addColorStop(1, voltageToColor(bottomV));
						ctx.strokeStyle = grad;
						ctx.beginPath();
						ctx.moveTo(0, -RES_H / 2);
						ctx.lineTo(0, RES_H / 2);
						ctx.stroke();
					}
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					if (activeDrag) {
						ctx.fillStyle = "#27374f";
						ctx.font = "700 13px system-ui, sans-serif";
						ctx.fillText(item.id, 0, 0);
					} else {
						ctx.fillStyle = "#27374f";
						ctx.font = "700 12px system-ui, sans-serif";
						ctx.fillText(item.id, 0, -22);
						ctx.font = "600 10.5px system-ui, sans-serif";
						ctx.fillStyle = "#334";
						if (sol) {
							ctx.fillText(Math.abs(bottomV - topV).toFixed(2) + " V", 0, +10);
						}
					}
				}
				ctx.restore();
				if (!activeDrag && !extraCell && !isBranchSwitch(item.id)) {
					drawCanvasSlider(item.id, state.resistorValues[item.id] || 2.5, {
						trackX: x - 36,
						trackTop: y - RES_H / 2 + 12,
						trackBottom: y + RES_H / 2 - 6,
						min: 0.1,
						max: 10,
						step: 0.1,
						label: item.id,
						showValueTop: true
					});
				} else if (!activeDrag && extraCell) {
					const emfCenterWorldY = state.internalR
						? item.top + RES_H + CONNECTOR_WIRE * 2 + EMF_BODY_HEIGHT / 2
						: y;
					drawCanvasSlider(cellEmfSliderKey(item.id), getCellEmf(item.id), {
						trackX: x - 44,
						trackTop: emfCenterWorldY - RES_H / 2 + 12,
						trackBottom: emfCenterWorldY + RES_H / 2 - 6,
						min: 1,
						max: 20,
						step: 0.5,
						label: item.id + " EMF",
						showValueTop: true,
						valueSuffix: "V"
					});
					if (state.internalR) {
						drawCanvasSlider(cellRInternalSliderKey(item.id), getCellRInternal(item.id), {
							trackX: x - 36,
							trackTop: item.top + 12,
							trackBottom: item.top + RES_H - 6,
							min: 0.2,
							max: 5,
							step: 0.1,
							label: internalResistanceLabel(item.id),
							showValueTop: true
						});
					}
					drawPolarityHandle(cellPolarityActionKey(item.id), x + 44, emfCenterWorldY);
				}
			}

			function drawCanvasSlider(paramKey, value, opts) {
				const trackX = opts.trackX;
				const trackTop = opts.trackTop;
				const trackBottom = opts.trackBottom;
				const min = opts.min;
				const max = opts.max;
				const step = opts.step;
				const showValueTop = !!opts.showValueTop;
				const valueSuffix = opts.valueSuffix || "\u03a9";
				const span = Math.max(0.001, max - min);
				const sphereY = trackTop + ((max - value) / span) * (trackBottom - trackTop);

				const hit = sliderHitAreas.find((s) => s.paramKey === paramKey);
				const rec = { paramKey, trackX, trackTop, trackBottom, sphereY, min, max, step };
				if (hit) {
					Object.assign(hit, rec);
				} else {
					sliderHitAreas.push(rec);
				}

				const isDragging = sliderDragState.active && sliderDragState.paramKey === paramKey;
				ctx.save();
				ctx.lineCap = "round";
				ctx.strokeStyle = "rgba(80,100,130,0.35)";
				ctx.lineWidth = 4;
				ctx.beginPath();
				ctx.moveTo(trackX, trackTop);
				ctx.lineTo(trackX, trackBottom);
				ctx.stroke();

				const sr = 6;
				const grad = ctx.createRadialGradient(trackX - 2, sphereY - 2, 1, trackX, sphereY, sr);
				grad.addColorStop(0, isDragging ? "#d0eaff" : "#c8d8ea");
				grad.addColorStop(1, isDragging ? "#1a50a0" : "#3a5a7a");
				ctx.beginPath();
				ctx.arc(trackX, sphereY, sr, 0, Math.PI * 2);
				ctx.fillStyle = grad;
				ctx.fill();
				ctx.strokeStyle = isDragging ? "#0a3080" : "#253d55";
				ctx.lineWidth = 1.5;
				ctx.stroke();
				if (showValueTop) {
					ctx.fillStyle = "#2d5a8e";
					ctx.font = "600 10.5px system-ui, sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "top";
					ctx.fillText(value.toFixed(1) + " " + valueSuffix, trackX, trackBottom + 10);
				}
				ctx.restore();
			}

			function drawPolarityHandle(actionKey, cx, cy) {
				const radius = 9;
				const hit = actionHitAreas.find((a) => a.actionKey === actionKey);
				const rec = { actionKey, x: cx, y: cy, radius };
				if (hit) {
					Object.assign(hit, rec);
				} else {
					actionHitAreas.push(rec);
				}
				ctx.save();
				ctx.fillStyle = "rgba(244, 249, 255, 0.92)";
				ctx.strokeStyle = "rgba(48, 78, 116, 0.88)";
				ctx.lineWidth = 1.6;
				ctx.beginPath();
				ctx.arc(cx, cy, radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.strokeStyle = "rgba(28, 56, 92, 0.95)";
				ctx.lineWidth = 1.8;
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.moveTo(cx, cy - 4.5);
				ctx.lineTo(cx, cy + 4.5);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(cx - 2.8, cy - 2.2);
				ctx.lineTo(cx, cy - 4.8);
				ctx.lineTo(cx + 2.8, cy - 2.2);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(cx - 2.8, cy + 2.2);
				ctx.lineTo(cx, cy + 4.8);
				ctx.lineTo(cx + 2.8, cy + 2.2);
				ctx.stroke();
				ctx.restore();
			}

			function drawComponentSwitchHandle(actionKey, cx, cy, isClosed) {
				const radius = 9;
				const hit = actionHitAreas.find((a) => a.actionKey === actionKey);
				const rec = { actionKey, x: cx, y: cy, radius };
				if (hit) {
					Object.assign(hit, rec);
				} else {
					actionHitAreas.push(rec);
				}
				ctx.save();
				ctx.fillStyle = "rgba(244, 249, 255, 0.92)";
				ctx.strokeStyle = "rgba(48, 78, 116, 0.88)";
				ctx.lineWidth = 1.6;
				ctx.beginPath();
				ctx.arc(cx, cy, radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.strokeStyle = "rgba(28, 56, 92, 0.95)";
				ctx.lineWidth = 2;
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.moveTo(cx - 3, cy - 3);
				ctx.lineTo(cx - 3, cy + 3);
				ctx.moveTo(cx + 3, cy - 3);
				ctx.lineTo(cx + 3, cy + 3);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(cx - 3, cy - 1);
				if (isClosed) {
					ctx.lineTo(cx + 3, cy + 1);
				} else {
					ctx.lineTo(cx + 3, cy - 5);
				}
				ctx.stroke();
				ctx.restore();
			}

			function drawCurrentArrow(x, wireTop, wireBottom, I) {
				const midY = wireBottom - 18;
				const SH = 5.33;
				const arrowX = x + 12;
				// Convention: effectiveI > 0 ? arrow DOWN; effectiveI < 0 ? arrow UP.
				// Caller pre-multiplies sol.I by sol.arrowAlignFactor before calling here.
				const arrowDir = I < 0 ? -1 : 1;
				const tipY = midY + arrowDir * SH;
				ctx.save();
				ctx.strokeStyle = "#c0392b";
				ctx.fillStyle   = "#c0392b";
				ctx.lineWidth   = 2;
				ctx.beginPath();
				ctx.moveTo(arrowX, midY - arrowDir * SH);
				ctx.lineTo(arrowX, tipY);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(arrowX, tipY + arrowDir * 2.67);
				ctx.lineTo(arrowX - 2.67, tipY - arrowDir * 1.33);
				ctx.lineTo(arrowX + 2.67, tipY - arrowDir * 1.33);
				ctx.closePath();
				ctx.fill();
				ctx.font = "600 10.5px system-ui, sans-serif";
				ctx.textAlign    = "left";
				ctx.textBaseline = "middle";
				const currentLabel1 = formatCurrentLabel(I, state.solved && state.solved.forceInfiniteAllCurrents === true);
				ctx.fillText(currentLabel1, arrowX + 8, midY);
				ctx.restore();
			}

			function parallelArrowDisplayFactor(layout) {
				if (!layout || !Array.isArray(layout.stages)) return 1;
				for (const stage of layout.stages) {
					if (stage && Array.isArray(stage.branches) && stage.branches.length > 1) return -1;
				}
				return 1;
			}

			function drawBottomWireCurrentArrow(layout) {
				const y = layout.yBottom;
				const xMin = layout.xCell + 28;
				const xMax = layout.xRight - 28;
				const midX = clamp(layout.xSwitch, xMin, xMax);
				const arrowY = y + 12;
				const halfLen = 5.33;
				const current = Number.isFinite(state.solved?.Itotal) ? state.solved.Itotal : 0;
				const shortAdjustedInfinite = !!(state.solved && state.solved.shortAdjustedFromIdeal === true
					&& Array.isArray(state.solved.idealShortSwitchSectionIds)
					&& state.solved.idealShortSwitchSectionIds.length > 0);
				const displayCurrent = shortAdjustedInfinite
					? (current < 0 ? -Infinity : Infinity)
					: ((state.solved && isInfiniteCurrentValue(state.solved.Itotal)) ? state.solved.Itotal : current);
				const magnitude = Math.abs(Number.isFinite(displayCurrent) ? displayCurrent : 0);
				const dir = displayCurrent < 0 ? -1 : 1;
				const shaftStartX = midX - dir * halfLen;
				const shaftTipX = midX + dir * halfLen;
				const headLen = 2.67;
				ctx.save();
				ctx.strokeStyle = "#c0392b";
				ctx.fillStyle = "#c0392b";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(shaftStartX, arrowY);
				ctx.lineTo(shaftTipX, arrowY);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(shaftTipX + dir * headLen, arrowY);
				ctx.lineTo(shaftTipX - dir * 1.33, arrowY - 2.67);
				ctx.lineTo(shaftTipX - dir * 1.33, arrowY + 2.67);
				ctx.closePath();
				ctx.fill();
				ctx.font = "600 10.5px system-ui, sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "top";
				const currentLabel2 = formatCurrentLabel(displayCurrent, state.solved && state.solved.forceInfiniteAllCurrents === true);
				ctx.fillText(currentLabel2, midX, arrowY + 10);
				ctx.restore();
			}

			function drawDebugWireMeasurement(x, y1, y2, label) {
				if (!state.debugLabels) return;
				const dist = Math.abs(y2 - y1);
				const midY = (y1 + y2) * 0.5;
				ctx.save();
				ctx.fillStyle = "rgba(100, 120, 150, 0.85)";
				ctx.font = "500 8px monospace";
				ctx.textAlign = "right";
				ctx.textBaseline = "middle";
				ctx.fillText(dist.toFixed(1) + (label ? " " + label : ""), x - 8, midY);
				ctx.restore();
			}

			function drawNetwork(layout) {
				const nodeV = (state.solved && state.solved.stageNodeV) || [0];
				if (layout.stages.length === 0) {
					const topV = nodeV[0] || 0;
					const bottomV = Number.isFinite(state.solved.Vext) ? state.solved.Vext : topV;
					drawWireSegment(layout.xRight, layout.yTop, layout.xRight, layout.yBottom, topV, bottomV, "rightRail");
					return;
				}

				let currentY = layout.yTop;
				for (const stage of layout.stages) {
					const stageTopV = Number.isFinite(nodeV[stage.index]) ? nodeV[stage.index] : 0;
					const stageBottomV = Number.isFinite(nodeV[stage.index + 1]) ? nodeV[stage.index + 1] : stageTopV;
					const isParallel = stage.branches.length > 1;
					const isTopBoundaryStage = stage.index === 0;
					const isBottomBoundaryStage = stage.index === layout.stages.length - 1;
					const hasMergeBusAbove = stage.index > 0 && layout.stages[stage.index - 1].branches.length > 1;
					const hasSplitBusBelow = stage.index < layout.stages.length - 1 && layout.stages[stage.index + 1].branches.length > 1;
					const stageEntryTop = isTopBoundaryStage ? layout.yTop : stage.junctionTop;
					const stageExitBottom = isBottomBoundaryStage ? layout.yBottom : stage.junctionBottom;
					if (currentY < stageEntryTop - 1e-6) {
						const label = isTopBoundaryStage ? "END_BUS_CONNECTOR" : "CONNECTOR_WIRE";
						drawWireSegment(layout.xRight, currentY, layout.xRight, stageEntryTop, stageTopV, stageTopV, label);
						drawDebugWireMeasurement(layout.xRight, currentY, stageEntryTop, label);
					}
					if (isParallel) {
						const topBusLabel = isTopBoundaryStage ? "TOP_SPLIT_BUS" : "SPLIT_BUS";
						const topBusPoints = [{ x: layout.xRight, v: stageTopV }];
						for (const b of stage.branches) {
							topBusPoints.push({ x: b.x, v: stageTopV });
						}
						topBusPoints.sort((a, b) => a.x - b.x);
						for (let i = 0; i < topBusPoints.length - 1; i++) {
							drawWireSegment(topBusPoints[i].x, stageEntryTop, topBusPoints[i + 1].x, stageEntryTop, topBusPoints[i].v, topBusPoints[i + 1].v, topBusLabel);
						}

						const bottomBusLabel = isBottomBoundaryStage ? "BOTTOM_SPLIT_BUS" : "MERGE_BUS";
						const bottomBusPoints = [{ x: layout.xRight, v: stageBottomV }];
						for (const b of stage.branches) {
							bottomBusPoints.push({ x: b.x, v: stageBottomV });
						}
						bottomBusPoints.sort((a, b) => a.x - b.x);
						for (let i = 0; i < bottomBusPoints.length - 1; i++) {
							drawWireSegment(bottomBusPoints[i].x, stageExitBottom, bottomBusPoints[i + 1].x, stageExitBottom, bottomBusPoints[i].v, bottomBusPoints[i + 1].v, bottomBusLabel);
						}
					}
					for (const branch of stage.branches) {
						const branchX = branch.x;
						let branchY = stageEntryTop;
						let branchV = stageTopV;
						for (const item of branch.items) {
							const sol = state.solved && state.solved.byId ? state.solved.byId[item.id] : null;
							const itemTopV = (sol && Number.isFinite(sol.Vtop)) ? sol.Vtop : branchV;
							if ((isParallel || hasMergeBusAbove) && !isTopBoundaryStage) {
								const splitY = branchY + BUS_CONNECTOR;
								const totalLen = Math.max(1e-6, item.top - branchY);
								const splitFrac = Math.max(0, Math.min(1, (splitY - branchY) / totalLen));
								const splitV = branchV + (itemTopV - branchV) * splitFrac;
								drawWireSegment(branchX, branchY, branchX, splitY, branchV, splitV, "BUS_CONNECTOR");
								drawWireSegment(branchX, splitY, branchX, item.top, splitV, itemTopV, "CONNECTOR_WIRE");
								drawDebugWireMeasurement(branchX, branchY, branchY + BUS_CONNECTOR, "BUS_CONNECTOR");
								drawDebugWireMeasurement(branchX, branchY + BUS_CONNECTOR, item.top, "CONNECTOR_WIRE");
							} else if (isTopBoundaryStage) {
								const connectorStartY = Math.max(branchY, item.top - CONNECTOR_WIRE);
								const totalLen = Math.max(1e-6, item.top - branchY);
								const splitFrac = Math.max(0, Math.min(1, (connectorStartY - branchY) / totalLen));
								const splitV = branchV + (itemTopV - branchV) * splitFrac;
								drawWireSegment(branchX, branchY, branchX, connectorStartY, branchV, splitV, "END_BUS_CONNECTOR");
								drawWireSegment(branchX, connectorStartY, branchX, item.top, splitV, itemTopV, "CONNECTOR_WIRE");
								drawDebugWireMeasurement(branchX, branchY, connectorStartY, "END_BUS_CONNECTOR");
								drawDebugWireMeasurement(branchX, connectorStartY, item.top, "CONNECTOR_WIRE");
							} else {
								drawWireSegment(branchX, branchY, branchX, item.top, branchV, itemTopV, "CONNECTOR_WIRE");
								drawDebugWireMeasurement(branchX, branchY, item.top, "CONNECTOR_WIRE");
							}
							
										if (sol && (item.top - branchY) > 8) {
											drawCurrentArrow(branchX, branchY, item.top, sol.I * (sol.arrowAlignFactor ?? 1));
							}
							drawResistorBody(item, state.drag && state.drag.id === item.id ? state.drag : null, sol);
							if (sol && Number.isFinite(sol.Vbottom)) {
								branchV = sol.Vbottom;
							}
							branchY = item.bottom;
						}
						if (isParallel && !isBottomBoundaryStage) {
							drawWireSegment(branchX, branchY, branchX, stageExitBottom - BUS_CONNECTOR, branchV, stageBottomV, "CONNECTOR_WIRE");
							drawWireSegment(branchX, stageExitBottom - BUS_CONNECTOR, branchX, stageExitBottom, stageBottomV, stageBottomV, "BUS_CONNECTOR");
							drawDebugWireMeasurement(branchX, branchY, stageExitBottom - BUS_CONNECTOR, "CONNECTOR_WIRE");
							drawDebugWireMeasurement(branchX, stageExitBottom - BUS_CONNECTOR, stageExitBottom, "BUS_CONNECTOR");
						} else if (isBottomBoundaryStage) {
							const connectorEndY = Math.min(stageExitBottom, branchY + CONNECTOR_WIRE);
							drawWireSegment(branchX, branchY, branchX, connectorEndY, branchV, stageBottomV, "CONNECTOR_WIRE");
							drawWireSegment(branchX, connectorEndY, branchX, stageExitBottom, stageBottomV, stageBottomV, "END_BUS_CONNECTOR");
							drawDebugWireMeasurement(branchX, branchY, connectorEndY, "CONNECTOR_WIRE");
							drawDebugWireMeasurement(branchX, connectorEndY, stageExitBottom, "END_BUS_CONNECTOR");
						} else if (hasSplitBusBelow) {
							drawWireSegment(branchX, branchY, branchX, stageExitBottom - BUS_CONNECTOR, branchV, stageBottomV, "CONNECTOR_WIRE");
							drawWireSegment(branchX, stageExitBottom - BUS_CONNECTOR, branchX, stageExitBottom, stageBottomV, stageBottomV, "BUS_CONNECTOR");
							drawDebugWireMeasurement(branchX, branchY, stageExitBottom - BUS_CONNECTOR, "CONNECTOR_WIRE");
							drawDebugWireMeasurement(branchX, stageExitBottom - BUS_CONNECTOR, stageExitBottom, "BUS_CONNECTOR");
						} else {
							drawWireSegment(branchX, branchY, branchX, stageExitBottom, branchV, stageBottomV, "CONNECTOR_WIRE");
							drawDebugWireMeasurement(branchX, branchY, stageExitBottom, "CONNECTOR_WIRE");
						}
					}
					currentY = stageExitBottom;
				}
				const finalV = Number.isFinite(nodeV[nodeV.length - 1]) ? nodeV[nodeV.length - 1] : 0;
				if (currentY < layout.yBottom - 1e-6) {
					drawWireSegment(layout.xRight, currentY, layout.xRight, layout.yBottom, finalV, finalV, "END_BUS_CONNECTOR");
					drawDebugWireMeasurement(layout.xRight, currentY, layout.yBottom, "END_BUS_CONNECTOR");
				}
			}

			function drawBottomWire(layout) {
				const leftBottomV = (state.solved && Number.isFinite(state.solved.Vext)) ? state.solved.Vext : 0;
				const rightBottomV = (state.solved && Number.isFinite(state.solved.bottomRightV)) ? state.solved.bottomRightV : leftBottomV;
				const gradientStopX = Math.min(layout.bottomBusRightX, layout.xRight);
				if (layout.xCell < gradientStopX - 1e-6) {
					drawWireSegment(layout.xCell, layout.yBottom, gradientStopX, layout.yBottom, leftBottomV, rightBottomV, "bottomBus");
				}
				if (gradientStopX < layout.xRight - 1e-6) {
					drawWireSegment(gradientStopX, layout.yBottom, layout.xRight, layout.yBottom, rightBottomV, rightBottomV, "BOTTOM_SPLIT_BUS");
				}
				if (layout.xRight < layout.bottomBusRightX - 1e-6) {
					drawWireSegment(layout.xRight, layout.yBottom, layout.bottomBusRightX, layout.yBottom, rightBottomV, rightBottomV, "BOTTOM_MERGE_BUS");
				}
			}

			function appendPolygonToPath(path, polygon) {
				if (!path || !polygon || polygon.length < 3) return;
				path.moveTo(polygon[0].x, polygon[0].y);
				for (let i = 1; i < polygon.length; i++) {
					path.lineTo(polygon[i].x, polygon[i].y);
				}
				path.closePath();
			}

			function appendExtraCellVoltageSegments(segments, item, options = {}) {
				const entryY = Number.isFinite(options.entryY) ? options.entryY : item.top;
				const exitY = Number.isFinite(options.exitY) ? options.exitY : item.bottom;
				const sol = options.sol || (state.solved && state.solved.byId && state.solved.byId[item.id]);
				const itemTopV = sol && Number.isFinite(sol.Vtop) ? sol.Vtop : (Number.isFinite(options.entryV) ? options.entryV : 0);
				const itemBottomV = sol && Number.isFinite(sol.Vbottom) ? sol.Vbottom : itemTopV;
				const entryV = Number.isFinite(options.entryV) ? options.entryV : itemTopV;
				const exitV = Number.isFinite(options.exitV) ? options.exitV : itemBottomV;
				const componentId = item.id;
				const bodyHalfWidth = GRAPH_PATH_HALF_WIDTH;
				const current = sol && Number.isFinite(sol.I) ? sol.I : 0;

				if (!state.internalR && entryY < item.top - 1e-6) {
					segments.push({ x1: item.x, y1: entryY, x2: item.x, y2: item.top, v1: entryV, v2: itemTopV });
				}

				if (state.internalR) {
					const irR = clamp(getCellRInternal(componentId), RESISTOR_VALUE_MIN, RESISTOR_VALUE_MAX);
					const irT = (RESISTOR_VALUE_MAX - irR) / Math.max(1e-6, RESISTOR_VALUE_MAX - RESISTOR_VALUE_MIN);
					const irHalfWidth = GRAPH_PATH_HALF_WIDTH * (GRAPH_COMPONENT_MIN_WIDTH_FACTOR + (1 - GRAPH_COMPONENT_MIN_WIDTH_FACTOR) * irT);
					const irTop = item.top;
					const irBottom = item.top + RES_H;
					const topPlateV = itemTopV + current * getCellRInternal(componentId);
					const emfTop = irBottom + CONNECTOR_WIRE * 2;
					const emfBottom = Math.max(emfTop, item.bottom - CELL_PADDING);
					const topLimit = entryY;
					const bottomLimit = emfTop;
					const topExtra = Math.max(0, irTop - topLimit);
					const bottomExtra = Math.max(0, bottomLimit - irBottom);
					const rampExtra = Math.min(COMPONENT_RAMP_OVERSHOOT, topExtra, bottomExtra);
					const topBound = irTop - rampExtra;
					const bottomBound = irBottom + rampExtra;

					if (entryY < topBound - 1e-6) {
						segments.push({ x1: item.x, y1: entryY, x2: item.x, y2: topBound, v1: entryV, v2: itemTopV });
					}
					if (topBound < irTop - 1e-6) {
						segments.push({
							x1: item.x,
							y1: topBound,
							x2: item.x,
							y2: irTop,
							v1: itemTopV,
							v2: itemTopV,
							role: "shoulder-wire",
							componentId,
							pathHalfWidthStart: GRAPH_PATH_HALF_WIDTH,
							pathHalfWidthEnd: irHalfWidth
						});
					}
					segments.push({
						x1: item.x,
						y1: irTop,
						x2: item.x,
						y2: irBottom,
						v1: itemTopV,
						v2: topPlateV,
						role: "component-main",
						componentSection: "internal-resistor",
						componentId,
						forceStartVertical: true,
						forceEndVertical: true,
						pathHalfWidth: irHalfWidth
					});
					if (irBottom < bottomBound - 1e-6) {
						segments.push({
							x1: item.x,
							y1: irBottom,
							x2: item.x,
							y2: bottomBound,
							v1: topPlateV,
							v2: topPlateV,
							role: "shoulder-wire",
							componentId,
							pathHalfWidthStart: irHalfWidth,
							pathHalfWidthEnd: GRAPH_PATH_HALF_WIDTH
						});
					}
					if (bottomBound < emfTop - 1e-6) {
						segments.push({ x1: item.x, y1: bottomBound, x2: item.x, y2: emfTop, v1: topPlateV, v2: topPlateV });
					}
					segments.push({
						x1: item.x,
						y1: emfTop,
						x2: item.x,
						y2: emfBottom,
						v1: topPlateV,
						v2: itemBottomV,
						role: "component-main",
						componentSection: "cell-emf",
						componentId,
						forceStartVertical: true,
						forceEndVertical: true,
						pathHalfWidth: bodyHalfWidth
					});
					if (emfBottom < item.bottom - 1e-6) {
						segments.push({ x1: item.x, y1: emfBottom, x2: item.x, y2: item.bottom, v1: itemBottomV, v2: itemBottomV });
					}
				} else {
					const emfInset = Math.max(0, (item.bottom - item.top - EMF_BODY_HEIGHT) * 0.5);
					const emfTop = item.top + emfInset;
					const emfBottom = item.bottom - emfInset;
					if (item.top < emfTop - 1e-6) {
						segments.push({
							x1: item.x,
							y1: item.top,
							x2: item.x,
							y2: emfTop,
							v1: itemTopV,
							v2: itemTopV,
							role: "shoulder-wire",
							componentId
						});
					}
					segments.push({
						x1: item.x,
						y1: emfTop,
						x2: item.x,
						y2: emfBottom,
						v1: itemTopV,
						v2: itemBottomV,
						role: "component-main",
						componentSection: "cell-emf",
						componentId,
						forceStartVertical: true,
						forceEndVertical: true,
						pathHalfWidth: bodyHalfWidth
					});
					if (emfBottom < item.bottom - 1e-6) {
						segments.push({
							x1: item.x,
							y1: emfBottom,
							x2: item.x,
							y2: item.bottom,
							v1: itemBottomV,
							v2: itemBottomV,
							role: "shoulder-wire",
							componentId
						});
					}
				}

				if (item.bottom < exitY - 1e-6) {
					segments.push({ x1: item.x, y1: item.bottom, x2: item.x, y2: exitY, v1: itemBottomV, v2: exitV });
				}
			}

			function appendBranchSwitchVoltageSegments(segments, item, options = {}) {
				const entryY = Number.isFinite(options.entryY) ? options.entryY : item.top;
				const exitY = Number.isFinite(options.exitY) ? options.exitY : item.bottom;
				const sol = options.sol || (state.solved && state.solved.byId && state.solved.byId[item.id]);
				const entryV = Number.isFinite(options.entryV) ? options.entryV
					: (sol && Number.isFinite(sol.Vtop) ? sol.Vtop : 0);
				const exitV = Number.isFinite(options.exitV) ? options.exitV
					: (sol && Number.isFinite(sol.Vbottom) ? sol.Vbottom : entryV);
				const itemTopV = (sol && Number.isFinite(sol.Vtop)) ? sol.Vtop : entryV;
				const itemBottomV = (sol && Number.isFinite(sol.Vbottom)) ? sol.Vbottom : exitV;
				const switchClosed = isComponentSwitchClosed(item.id);
				const contactTopY = item.y - 16;
				const contactBottomY = item.y + 16;
				const bladeEndX = switchClosed ? item.x : (item.x + 16);
				const bladeEndY = switchClosed ? contactBottomY : (contactBottomY - 8);

				if (!switchClosed) {
					if (entryY < contactTopY - 1e-6) {
						segments.push({
							x1: item.x,
							y1: entryY,
							x2: item.x,
							y2: contactTopY,
							v1: entryV,
							v2: itemTopV
						});
					}

					segments.push({
						x1: item.x,
						y1: contactTopY,
						x2: bladeEndX,
						y2: bladeEndY,
						v1: itemTopV,
						v2: itemTopV,
						role: "switch-blade",
						componentId: item.id,
						isFlatVoltage: true
					});

					// Model the open switch gap as the high-resistance element between contacts.
					segments.push({
						x1: bladeEndX,
						y1: bladeEndY,
						x2: item.x,
						y2: contactBottomY,
						v1: itemTopV,
						v2: itemBottomV,
						role: "switch-blade",
						componentId: item.id
					});

					if (contactBottomY < exitY - 1e-6) {
						segments.push({
							x1: item.x,
							y1: contactBottomY,
							x2: item.x,
							y2: exitY,
							v1: itemBottomV,
							v2: exitV
						});
					}
					return;
				}

				// Interpolate the entire connector+switch+connector span as one smooth slope.
				const ySpan = exitY - entryY;
				const vAtY = (y) => ySpan > 1e-6 ? entryV + (exitV - entryV) * (y - entryY) / ySpan : entryV;

				if (entryY < contactTopY - 1e-6) {
					segments.push({ x1: item.x, y1: entryY, x2: item.x, y2: contactTopY, v1: entryV, v2: vAtY(contactTopY) });
				}

				const bladeTopV = vAtY(contactTopY);
				const bladeBottomV = switchClosed ? vAtY(contactBottomY) : bladeTopV;
				segments.push({
					x1: item.x,
					y1: contactTopY,
					x2: bladeEndX,
					y2: bladeEndY,
					v1: bladeTopV,
					v2: switchClosed ? bladeBottomV : bladeTopV,
					role: "switch-blade",
					componentId: item.id
				});

				if (contactBottomY < exitY - 1e-6) {
					segments.push({ x1: item.x, y1: contactBottomY, x2: item.x, y2: exitY, v1: bladeBottomV, v2: exitV });
				}
			}

			function leftRailConductiveRuns(layout, fromY, toY) {
				const yStart = Math.min(fromY, toY);
				const yEnd = Math.max(fromY, toY);
				const blocked = [];
				for (const item of (layout.leftSeriesItems || [])) {
					if (!isExtraCell(item.id)) continue;
					const b1 = Math.max(yStart, item.top);
					const b2 = Math.min(yEnd, item.bottom);
					if (b2 > b1 + 1e-6) blocked.push({ y1: b1, y2: b2 });
				}
				blocked.sort((a, b) => a.y1 - b.y1);
				const merged = [];
				for (const seg of blocked) {
					if (!merged.length || seg.y1 > merged[merged.length - 1].y2 + 1e-6) {
						merged.push({ y1: seg.y1, y2: seg.y2 });
					} else {
						merged[merged.length - 1].y2 = Math.max(merged[merged.length - 1].y2, seg.y2);
					}
				}
				const runs = [];
				let cursor = yStart;
				for (const gap of merged) {
					if (gap.y1 > cursor + 1e-6) runs.push({ y1: cursor, y2: gap.y1 });
					cursor = Math.max(cursor, gap.y2);
				}
				if (cursor < yEnd - 1e-6) runs.push({ y1: cursor, y2: yEnd });

				if (toY < fromY) {
					return runs.reverse().map((r) => ({ y1: r.y2, y2: r.y1 }));
				}
				return runs;
			}

			// Shared helper: builds the list of display points (named junctions + unnamed corners)
			// from the registry and route graph. Used by both drawJunctionIds and drawNodePotentials.
			function buildJunctionDisplayPoints(registry, routeGraph) {
				const pointKey = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
				const edgeOrientationAtNode = (edge, nodeKey) => {
					if (!routeGraph || !routeGraph.nodeByKey || !routeGraph.edges) return null;
					const node = routeGraph.nodeByKey.get(nodeKey);
					const otherKey = edge.nodeA === nodeKey ? edge.nodeB : edge.nodeA;
					const other = routeGraph.nodeByKey.get(otherKey);
					if (!node || !other) return null;
					const dx = other.x - node.x;
					const dy = other.y - node.y;
					return Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
				};
				const nodeIsCornerOrMultiJunction = (nodeKey) => {
					if (!routeGraph || !routeGraph.adjacency || !routeGraph.edges) return false;
					const incident = routeGraph.adjacency.get(nodeKey) || [];
					if (incident.length > 2) return true;
					if (incident.length !== 2) return false;
					const o1 = edgeOrientationAtNode(routeGraph.edges[incident[0]], nodeKey);
					const o2 = edgeOrientationAtNode(routeGraph.edges[incident[1]], nodeKey);
					return !!(o1 && o2 && o1 !== o2);
				};
				const displayPoints = [];
				const seen = new Set();
				const push = (point) => {
					if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
					const k = pointKey(point.x, point.y);
					if (seen.has(k)) return;
					seen.add(k);
					displayPoints.push(point);
				};
				for (const j of (registry.junctions || [])) {
					push({ x: j.x, y: j.y, id: j.id, kind: "junction" });
				}
				if (routeGraph && routeGraph.nodeByKey) {
					for (const node of routeGraph.nodeByKey.values()) {
						if (!nodeIsCornerOrMultiJunction(node.key)) continue;
						push({ x: node.x, y: node.y, id: node.junctionId || null,
							kind: node.junctionId ? "junction" : "corner" });
					}
				}
				return displayPoints;
			}

			function buildJunctionPotentialTablePoints(registry, routeGraph, sectionRows) {
				const pointKey = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
				const displayPoints = [];
				const seen = new Set();
				const push = (point) => {
					if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
					const k = pointKey(point.x, point.y);
					if (seen.has(k)) return;
					seen.add(k);
					displayPoints.push(point);
				};

				const isSeriesFallback = !!(Array.isArray(sectionRows)
					&& sectionRows.length === 1
					&& sectionRows[0]
					&& sectionRows[0].isSeriesFallback);
				if (isSeriesFallback) {
					const anchor = (registry && Array.isArray(registry.junctions) && registry.junctions.length)
						? registry.junctions[0]
						: null;
					if (anchor) push({ x: anchor.x, y: anchor.y, id: anchor.id, kind: "junction" });
					return displayPoints;
				}

				if (!routeGraph || !routeGraph.nodeByKey || !routeGraph.adjacency) return displayPoints;
				for (const node of routeGraph.nodeByKey.values()) {
					if (!node || !node.junctionId) continue;
					const degree = (routeGraph.adjacency.get(node.key) || []).length;
					if (degree <= 2) continue;
					push({ x: node.x, y: node.y, id: node.junctionId, kind: "junction" });
				}
				return displayPoints;
			}

			function buildRoutePointPotentialSampler(layout, routeGraph) {
				const segments = buildCircuitVoltageSegments(layout);
				const keyFor = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
				const toNum = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
				const pointToSeg = (px, py, seg) => {
					const dx = seg.x2 - seg.x1;
					const dy = seg.y2 - seg.y1;
					const len2 = dx * dx + dy * dy;
					if (!(len2 > 1e-12)) {
						const d = Math.hypot(px - seg.x1, py - seg.y1);
						return { dist: d, t: 0 };
					}
					let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2;
					t = Math.max(0, Math.min(1, t));
					const qx = seg.x1 + dx * t;
					const qy = seg.y1 + dy * t;
					return { dist: Math.hypot(px - qx, py - qy), t };
				};
				const segVAt = (seg, t) => {
					if (!seg) return 0;
					return sampleVoltageAlongSegment(seg, t);
				};
				const segTypeOf = (seg) => {
					if (!seg) return "wire";
					if (seg.role === "component-main") return seg.componentId ? `component:${seg.componentId}` : "component";
					if (seg.role === "shoulder-wire") return seg.componentId ? `shoulder:${seg.componentId}` : "shoulder";
					if (seg.role === "switch-blade") return seg.componentId ? `switch:${seg.componentId}` : "switch";
					return "wire";
				};
				const nodePotentialByKey = new Map();
				const nodeSourceByKey = new Map();

				const solveLinearSystem = (matrix, rhs) => {
					const n = matrix.length;
					if (!(n > 0) || rhs.length !== n) return null;
					const A = matrix.map((row) => row.slice());
					const b = rhs.slice();
					const EPS = 1e-12;
					for (let col = 0; col < n; col++) {
						let pivot = col;
						let best = Math.abs(A[col][col]);
						for (let r = col + 1; r < n; r++) {
							const cand = Math.abs(A[r][col]);
							if (cand > best) {
								best = cand;
								pivot = r;
							}
						}
						if (best <= EPS) return null;
						if (pivot !== col) {
							const rowTmp = A[col];
							A[col] = A[pivot];
							A[pivot] = rowTmp;
							const bTmp = b[col];
							b[col] = b[pivot];
							b[pivot] = bTmp;
						}
						const diag = A[col][col];
						for (let r = col + 1; r < n; r++) {
							const f = A[r][col] / diag;
							if (Math.abs(f) <= EPS) continue;
							for (let c = col; c < n; c++) {
								A[r][c] -= f * A[col][c];
							}
							b[r] -= f * b[col];
						}
					}
					const x = new Array(n).fill(0);
					for (let r = n - 1; r >= 0; r--) {
						let sum = b[r];
						for (let c = r + 1; c < n; c++) {
							sum -= A[r][c] * x[c];
						}
						if (Math.abs(A[r][r]) <= EPS) return null;
						x[r] = sum / A[r][r];
					}
					return x;
				};

				if (routeGraph && Array.isArray(routeGraph.edges) && routeGraph.nodeByKey) {
					const nodeKeys = Array.from(routeGraph.nodeByKey.keys());
					const nodeIndexByKey = new Map(nodeKeys.map((k, i) => [k, i]));
					const N = nodeKeys.length;
					if (N > 0) {
						const A = Array.from({ length: N }, () => new Array(N).fill(0));
						const b = new Array(N).fill(0);

						for (const edge of routeGraph.edges) {
							if (!edge) continue;
							const ia = nodeIndexByKey.get(edge.nodeA);
							const ib = nodeIndexByKey.get(edge.nodeB);
							if (!Number.isFinite(ia) || !Number.isFinite(ib)) continue;
							const seg = segments[edge.sourceSegmentIndex];
							if (!seg) continue;
							const nodeA = routeGraph.nodeByKey.get(edge.nodeA);
							const nodeB = routeGraph.nodeByKey.get(edge.nodeB);
							if (!nodeA || !nodeB) continue;
							const ta = pointToSeg(nodeA.x, nodeA.y, seg).t;
							const tb = pointToSeg(nodeB.x, nodeB.y, seg).t;
							const dV = segVAt(seg, tb) - segVAt(seg, ta);
							const w = 1;

							A[ia][ia] += w;
							A[ib][ib] += w;
							A[ia][ib] -= w;
							A[ib][ia] -= w;
							b[ia] -= w * dV;
							b[ib] += w * dV;
						}

						const leftPrimaryCellId = (state.leftSeries || []).find((id) => isExtraCell(id)) || PRIMARY_CELL_ID;
						const primaryCellItem = (layout.leftSeriesItems || []).find((item) => item && item.id === leftPrimaryCellId) || null;
						const targetX = layout.xCell;
						let targetY = layout.yBottom;
						if (primaryCellItem) {
							if (state.internalR) {
								const emfTop = primaryCellItem.top + RES_H + CONNECTOR_WIRE * 2;
								targetY = emfTop + EMF_BODY_HEIGHT;
							} else {
								targetY = primaryCellItem.y + 30;
							}
						}
						let anchorKey = null;
						let bestScore = Infinity;
						for (const key of nodeKeys) {
							const node = routeGraph.nodeByKey.get(key);
							if (!node) continue;
							const score = Math.abs(node.x - targetX) * 3 + Math.abs(node.y - targetY);
							if (score < bestScore) {
								bestScore = score;
								anchorKey = key;
							}
						}
						const anchorIndex = nodeIndexByKey.get(anchorKey || "");
						if (Number.isFinite(anchorIndex)) {
							const anchorWeight = 1e6;
							A[anchorIndex][anchorIndex] += anchorWeight;
							b[anchorIndex] += 0;
						}

						const solvedNodePotentials = solveLinearSystem(A, b);
						if (Array.isArray(solvedNodePotentials)) {
							for (let i = 0; i < nodeKeys.length; i++) {
								nodePotentialByKey.set(nodeKeys[i], solvedNodePotentials[i]);
							}
						} else if (Number.isFinite(anchorIndex)) {
							const adjacency = routeGraph.adjacency || new Map();
							const queue = [anchorKey];
							nodePotentialByKey.set(anchorKey, 0);
							while (queue.length) {
								const key = queue.shift();
								const vHere = nodePotentialByKey.get(key);
								for (const ei of (adjacency.get(key) || [])) {
									const edge = routeGraph.edges[ei];
									if (!edge) continue;
									const otherKey = edge.nodeA === key ? edge.nodeB : edge.nodeA;
									if (!otherKey) continue;
									if (nodePotentialByKey.has(otherKey)) continue;
									const seg = segments[edge.sourceSegmentIndex];
									const nodeA = routeGraph.nodeByKey.get(edge.nodeA);
									const nodeB = routeGraph.nodeByKey.get(edge.nodeB);
									if (!seg || !nodeA || !nodeB) continue;
									const tA = pointToSeg(nodeA.x, nodeA.y, seg).t;
									const tB = pointToSeg(nodeB.x, nodeB.y, seg).t;
									const dVab = segVAt(seg, tB) - segVAt(seg, tA);
									const dV = (key === edge.nodeA) ? dVab : -dVab;
									nodePotentialByKey.set(otherKey, vHere + dV);
									queue.push(otherKey);
								}
							}
						}

						if (routeGraph.adjacency && Array.isArray(routeGraph.edges)) {
							for (const key of nodeKeys) {
								const incident = routeGraph.adjacency.get(key) || [];
								if (incident.length <= 0) continue;
								const edge = routeGraph.edges[incident[0]];
								const seg = edge ? segments[edge.sourceSegmentIndex] : null;
								nodeSourceByKey.set(key, {
									segmentIndex: edge ? edge.sourceSegmentIndex : null,
									type: segTypeOf(seg)
								});
							}
						}
					}
				}

				const nearestNodeKey = (x, y) => {
					if (!routeGraph || !routeGraph.nodeByKey) return null;
					const directKey = keyFor(x, y);
					if (routeGraph.nodeByKey.has(directKey)) return directKey;
					let best = null;
					for (const node of routeGraph.nodeByKey.values()) {
						const d = Math.hypot(node.x - x, node.y - y);
						if (d > 1.5) continue;
						if (!best || d < best.dist) best = { key: node.key, dist: d };
					}
					return best ? best.key : null;
				};

				const potentialAt = (x, y) => {
					if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
					const nodeKey = nearestNodeKey(x, y);
					if (nodeKey && nodePotentialByKey.has(nodeKey)) {
						return nodePotentialByKey.get(nodeKey);
					}
					let best = null;
					for (const seg of segments) {
						if (!seg) continue;
						const proj = pointToSeg(x, y, seg);
						if (proj.dist > 2.0) continue;
						if (!best || proj.dist < best.dist) {
							best = { dist: proj.dist, v: segVAt(seg, proj.t) };
						}
					}
					return best ? best.v : null;
				};
				const sourceAt = (x, y) => {
					if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
					const nodeKey = nearestNodeKey(x, y);
					if (nodeKey && nodePotentialByKey.has(nodeKey)) {
						const src = nodeSourceByKey.get(nodeKey) || null;
						return src ? { ...src, mode: "node" } : { mode: "node", segmentIndex: null, type: "node" };
					}
					let best = null;
					for (let si = 0; si < segments.length; si++) {
						const seg = segments[si];
						if (!seg) continue;
						const proj = pointToSeg(x, y, seg);
						if (proj.dist > 2.0) continue;
						if (!best || proj.dist < best.dist) {
							best = { dist: proj.dist, segmentIndex: si, type: segTypeOf(seg) };
						}
					}
					return best ? { ...best, mode: "segment" } : null;
				};

				return { potentialAt, sourceAt, nodePotentialByKey };
			}

			function buildCircuitVoltageSegments(layout) {
				const segments = [];
				const solved = state.solved || {};
				const nodeV = solved.stageNodeV || [0];
				let leftV = Number.isFinite(solved.switchVLeft) ? solved.switchVLeft : 0;
				let rightV = Number.isFinite(solved.switchVRight) ? solved.switchVRight : leftV;
				const leftTopV = Number.isFinite(solved.leftTopV) ? solved.leftTopV : leftV;
				const networkTopV = Number.isFinite(nodeV[0]) ? nodeV[0] : rightV;
				const topNodeV = leftTopV;
				const topPlateV = Number.isFinite(solved.cellTopPlateV) ? solved.cellTopPlateV : topNodeV;
				const bottomNodeV = Number.isFinite(solved.Vext) ? solved.Vext : 0;
				let bottomRightV = Number.isFinite(solved.bottomRightV) ? solved.bottomRightV : bottomNodeV;
				const hasTopBoundaryParallelStage = layout.stages.length > 0
					&& Array.isArray(layout.stages[0].branches)
					&& layout.stages[0].branches.length > 1;

				function collectBusXs(...busStages) {
					const busXs = [layout.xRight];
					for (const busStage of busStages) {
						if (!busStage || !busStage.branches || busStage.branches.length <= 1) continue;
						for (const branch of busStage.branches) {
							busXs.push(branch.x);
						}
					}
					busXs.sort((a, b) => a - b);
					const uniqueBusXs = [];
					for (const x of busXs) {
						if (!uniqueBusXs.length || Math.abs(x - uniqueBusXs[uniqueBusXs.length - 1]) > 1e-6) {
							uniqueBusXs.push(x);
						}
					}
					return uniqueBusXs;
				}

				function appendHorizontalBusSegments(busStages, y, defaultV, useBranchEntries) {
					const uniqueBusXs = collectBusXs(...busStages);
					const pointVs = new Map();
					pointVs.set(layout.xRight, defaultV);
					for (const busStage of busStages || []) {
						if (!busStage || !busStage.branches || busStage.branches.length <= 1) continue;
						for (const branch of busStage.branches) {
							pointVs.set(branch.x, defaultV);
						}
					}
					for (let i = 0; i < uniqueBusXs.length - 1; i++) {
						const x1 = uniqueBusXs[i];
						const x2 = uniqueBusXs[i + 1];
						const v1 = pointVs.has(x1) ? pointVs.get(x1) : defaultV;
						const v2 = pointVs.has(x2) ? pointVs.get(x2) : defaultV;
						segments.push({ x1, y1: y, x2, y2: y, v1, v2 });
					}
				}

				// Gradient covers xCell -> gradientEndX only.
				// If a parallel stage has branches to the left of xRight, topBusRightX < xRight and
				// the split bus (topBusRightX -> xRight) is 0-ohm, so it must be flat, not part of the slope.
				const gradientEndX = Math.min(layout.topBusRightX, layout.xRight);
				const topBusXSpan = gradientEndX - layout.xCell;
				const topBusVAtX = (x) => topBusXSpan > 1e-6
					? leftTopV + (networkTopV - leftTopV) * (x - layout.xCell) / topBusXSpan
					: leftTopV;
				const mainSwitchClosed = isComponentSwitchClosed(MAIN_SWITCH_ID);
				// Top bus left: xCell -> xSwitch-16
				if (layout.xCell < layout.xSwitch - 16 - 1e-6) {
					if (mainSwitchClosed) {
						segments.push({ x1: layout.xCell, y1: layout.yTop, x2: layout.xSwitch - 16, y2: layout.yTop, v1: leftTopV, v2: topBusVAtX(layout.xSwitch - 16) });
					} else {
						segments.push({
							x1: layout.xCell,
							y1: layout.yTop,
							x2: layout.xSwitch - 16,
							y2: layout.yTop,
							v1: leftV,
							v2: leftV,
							role: "switch-open-node-wire",
							componentId: "MAIN_SWITCH",
							isFlatVoltage: true
						});
					}
				}
				// Switch blade
				const bladeRightX = mainSwitchClosed ? (layout.xSwitch + 16) : (layout.xSwitch + 8);
				const bladeRightY = mainSwitchClosed ? layout.yTop : (layout.yTop - 16);
				const rightContactX = layout.xSwitch + 16;
				const bladeLeftV = mainSwitchClosed ? topBusVAtX(layout.xSwitch - 16) : leftV;
				const bladeRightV = mainSwitchClosed ? topBusVAtX(Math.min(layout.xSwitch + 16, gradientEndX)) : bladeLeftV;
				const rightContactV = mainSwitchClosed ? topBusVAtX(Math.min(rightContactX, gradientEndX)) : (Number.isFinite(rightV) ? rightV : networkTopV);
				segments.push({
					x1: layout.xSwitch - 16,
					y1: layout.yTop,
					x2: bladeRightX,
					y2: bladeRightY,
					v1: bladeLeftV,
					v2: bladeRightV,
					role: "switch-blade",
					componentId: "MAIN_SWITCH",
					isFlatVoltage: !mainSwitchClosed
				});
				if (!mainSwitchClosed) {
					// Explicitly include the open contact gap as the high-resistance switch path.
					segments.push({
						x1: bladeRightX,
						y1: bladeRightY,
						x2: rightContactX,
						y2: layout.yTop,
						v1: bladeRightV,
						v2: rightContactV,
						role: "switch-blade",
						componentId: "MAIN_SWITCH"
					});
				}
				// Top bus right fixed contact wire: xSwitch+16 -> gradientEndX.
				// Keep this segment even when open so the right-side node stays anchored at the contact.
				if (rightContactX < gradientEndX - 1e-6) {
					segments.push({ x1: rightContactX, y1: layout.yTop, x2: gradientEndX, y2: layout.yTop, v1: rightContactV, v2: networkTopV });
				}
				// Split bus flat: gradientEndX -> xRight (when branches extend leftward inside the circuit)
				// If the top boundary is parallel, that segment is already represented by
				// stage split-bus segments; avoid adding an overlapping duplicate segment.
				if (!hasTopBoundaryParallelStage && gradientEndX < layout.xRight - 1e-6) {
					segments.push({ x1: gradientEndX, y1: layout.yTop, x2: layout.xRight, y2: layout.yTop, v1: networkTopV, v2: networkTopV });
				}
				// Split bus extension: xRight -> topBusRightX (flat, when branches extend rightward beyond xRight)
				if (!hasTopBoundaryParallelStage && layout.xRight < layout.topBusRightX - 1e-6) {
					segments.push({ x1: layout.xRight, y1: layout.yTop, x2: layout.topBusRightX, y2: layout.yTop, v1: networkTopV, v2: networkTopV });
				}

				let leftRunY = layout.yTop;
				let leftRunV = topNodeV;
				const leftItems = layout.leftSeriesItems || [];
				for (let i = 0; i < leftItems.length; i++) {
					const item = leftItems[i];
					const sol = solved.byId && solved.byId[item.id];
					const itemTopV = sol && Number.isFinite(sol.Vtop) ? sol.Vtop : leftRunV;
					const itemBottomV = sol && Number.isFinite(sol.Vbottom) ? sol.Vbottom : itemTopV;
					if (isExtraCell(item.id)) {
						appendExtraCellVoltageSegments(segments, item, {
							entryY: leftRunY,
							entryV: leftRunV,
							exitY: item.bottom,
							exitV: itemBottomV,
							sol
						});
						leftRunY = item.bottom;
					} else if (isBranchSwitch(item.id)) {
						appendBranchSwitchVoltageSegments(segments, item, {
							entryY: leftRunY,
							entryV: leftRunV,
							exitY: item.bottom,
							exitV: itemBottomV,
							sol
						});
						leftRunY = item.bottom;
					} else {
						const topLimit = (i === 0)
							? layout.yTop
							: (leftItems[i - 1].bottom + item.top) * 0.5;
						const nominalBottomLimit = (i === leftItems.length - 1)
							? (Number.isFinite(layout.leftCellStartY) ? layout.leftCellStartY : layout.yBottom)
							: (item.bottom + leftItems[i + 1].top) * 0.5;
						const bottomLimit = Math.max(item.bottom, nominalBottomLimit);
						const topExtra = Math.max(0, item.top - topLimit);
						const bottomExtra = Math.max(0, bottomLimit - item.bottom);
						const rampExtra = Math.min(COMPONENT_RAMP_OVERSHOOT, topExtra, bottomExtra);
						const topBound = item.top - rampExtra;
						const bottomBound = item.bottom + rampExtra;
						if (leftRunY < topBound - 1e-6) {
							segments.push({ x1: layout.xCell, y1: leftRunY, x2: layout.xCell, y2: topBound, v1: leftRunV, v2: itemTopV });
						}
						const halfWidth = componentGraphHalfWidthById(item.id);
						if (topBound < item.top - 1e-6) {
							segments.push({
								x1: item.x,
								y1: topBound,
								x2: item.x,
								y2: item.top,
								v1: itemTopV,
								v2: itemTopV,
								role: "shoulder-wire",
								componentId: item.id,
								pathHalfWidthStart: GRAPH_PATH_HALF_WIDTH,
								pathHalfWidthEnd: halfWidth
							});
						}
						segments.push({
							x1: layout.xCell,
							y1: item.top,
							x2: layout.xCell,
							y2: item.bottom,
							v1: itemTopV,
							v2: itemBottomV,
							role: "component-main",
							componentId: item.id,
							forceStartVertical: true,
							forceEndVertical: true,
							pathHalfWidth: halfWidth
						});
						if (item.bottom < bottomBound - 1e-6) {
							segments.push({
								x1: item.x,
								y1: item.bottom,
								x2: item.x,
								y2: bottomBound,
								v1: itemBottomV,
								v2: itemBottomV,
								role: "shoulder-wire",
								componentId: item.id,
								pathHalfWidthStart: halfWidth,
								pathHalfWidthEnd: GRAPH_PATH_HALF_WIDTH
							});
						}
						leftRunY = bottomBound;
					}
					leftRunV = itemBottomV;
				}
				if (layout.stages.length === 0) {
					if (leftRunY < layout.yBottom - 1e-6) {
						segments.push({ x1: layout.xCell, y1: leftRunY, x2: layout.xCell, y2: layout.yBottom, v1: leftRunV, v2: bottomNodeV });
					}
					const topV = nodeV[0] || 0;
					segments.push({ x1: layout.xRight, y1: layout.yTop, x2: layout.xRight, y2: layout.yBottom, v1: topV, v2: bottomNodeV });
					// Gradient covers xCell -> gradientStartX only.
					// If a parallel stage has branches to the left of xRight, bottomBusRightX < xRight and
					// the split bus (bottomBusRightX -> xRight) is 0-ohm, so it must be flat, not part of the slope.
					const gradientStartX = Math.min(layout.bottomBusRightX, layout.xRight);
					const bottomBusXSpan = gradientStartX - layout.xCell;
					const bottomBusVAtX = (x) => bottomBusXSpan > 1e-6
						? bottomNodeV + (bottomRightV - bottomNodeV) * (x - layout.xCell) / bottomBusXSpan
						: bottomNodeV;
					// Bottom bus gradient: xCell -> gradientStartX
					if (layout.xCell < gradientStartX - 1e-6) {
						segments.push({ x1: layout.xCell, y1: layout.yBottom, x2: gradientStartX, y2: layout.yBottom, v1: bottomNodeV, v2: bottomBusVAtX(gradientStartX) });
					}
					// Split bus flat: gradientStartX -> xRight (when branches extend leftward)
					if (gradientStartX < layout.xRight - 1e-6) {
						segments.push({ x1: gradientStartX, y1: layout.yBottom, x2: layout.xRight, y2: layout.yBottom, v1: bottomBusVAtX(gradientStartX), v2: bottomRightV });
					}
					// Split bus extension: xRight -> bottomBusRightX (flat, when branches extend rightward)
					if (layout.xRight < layout.bottomBusRightX - 1e-6) {
						segments.push({ x1: layout.xRight, y1: layout.yBottom, x2: layout.bottomBusRightX, y2: layout.yBottom, v1: bottomRightV, v2: bottomRightV });
					}
				} else {
					if (leftRunY < layout.yBottom - 1e-6) {
						segments.push({ x1: layout.xCell, y1: leftRunY, x2: layout.xCell, y2: layout.yBottom, v1: leftRunV, v2: bottomNodeV });
					}
					let currentY = layout.yTop;
					for (const stage of layout.stages) {
						const stageTopV = Number.isFinite(nodeV[stage.index]) ? nodeV[stage.index] : 0;
						const stageBottomV = Number.isFinite(nodeV[stage.index + 1]) ? nodeV[stage.index + 1] : stageTopV;
						const firstParallelStage = stage.index === 0 && stage.branches.length > 1;
						const lastParallelStage = stage.index === layout.stages.length - 1 && stage.branches.length > 1;
						const prevParallelStage = stage.index > 0 && layout.stages[stage.index - 1].branches.length > 1
							? layout.stages[stage.index - 1]
							: null;
						const nextParallelStage = stage.index < layout.stages.length - 1 && layout.stages[stage.index + 1].branches.length > 1
							? layout.stages[stage.index + 1]
							: null;
						const stageEntryTop = firstParallelStage ? layout.yTop : stage.junctionTop;
						const stageExitBottom = lastParallelStage ? layout.yBottom : stage.junctionBottom;
						segments.push({ x1: layout.xRight, y1: currentY, x2: layout.xRight, y2: stageEntryTop, v1: stageTopV, v2: stageTopV });
						if (stage.branches.length > 1) {
							if (prevParallelStage) {
								// Shared bus between two adjacent parallel stages: include taps from both stages once.
								appendHorizontalBusSegments([prevParallelStage, stage], stageEntryTop, stageTopV, true);
							} else {
								appendHorizontalBusSegments([stage], stageEntryTop, stageTopV, true);
							}
						}
						if (stage.branches.length > 1 && !nextParallelStage) {
							// Mirror top split-bus segmentation: use this stage's branch taps only.
							appendHorizontalBusSegments([stage], stageExitBottom, stageBottomV, false);
						}
						for (const branch of stage.branches) {
							const branchX = branch.x;
							let branchY = stageEntryTop;
							let branchV = stageTopV;
							for (let i = 0; i < branch.items.length; i++) {
								const item = branch.items[i];
								const sol = solved.byId && solved.byId[item.id];
								const itemTopV = sol && Number.isFinite(sol.Vtop) ? sol.Vtop : branchV;
								const itemBottomV = sol && Number.isFinite(sol.Vbottom) ? sol.Vbottom : itemTopV;
								const topLimit = (i === 0)
									? stageEntryTop
									: (branch.items[i - 1].bottom + item.top) * 0.5;
								const bottomLimit = (i === branch.items.length - 1)
									? stage.junctionBottom
									: (item.bottom + branch.items[i + 1].top) * 0.5;
								const topExtra = Math.max(0, item.top - topLimit);
								const bottomExtra = Math.max(0, bottomLimit - item.bottom);
								const rampExtra = Math.min(COMPONENT_RAMP_OVERSHOOT, topExtra, bottomExtra);
								const topBound = item.top - rampExtra;
								const bottomBound = item.bottom + rampExtra;
								if (isExtraCell(item.id)) {
									appendExtraCellVoltageSegments(segments, item, {
										entryY: branchY,
										entryV: branchV,
										exitY: bottomBound,
										exitV: itemBottomV,
										sol
									});
								} else if (isBranchSwitch(item.id)) {
									appendBranchSwitchVoltageSegments(segments, item, {
										entryY: branchY,
										entryV: branchV,
										exitY: bottomBound,
										exitV: itemBottomV,
										sol
									});
								} else {
									const componentHalfWidth = componentGraphHalfWidthById(item.id);
									if (branchY < topBound - 1e-6) {
										segments.push({ x1: branchX, y1: branchY, x2: branchX, y2: topBound, v1: branchV, v2: itemTopV });
									}
									if (topBound < item.top - 1e-6) {
										segments.push({
											x1: item.x,
											y1: topBound,
											x2: item.x,
											y2: item.top,
											v1: itemTopV,
											v2: itemTopV,
											role: "shoulder-wire",
											componentId: item.id,
											pathHalfWidthStart: GRAPH_PATH_HALF_WIDTH,
											pathHalfWidthEnd: componentHalfWidth
										});
									}
									segments.push({
										x1: item.x,
										y1: item.top,
										x2: item.x,
										y2: item.bottom,
										v1: itemTopV,
										v2: itemBottomV,
										role: "component-main",
										componentId: item.id,
										forceStartVertical: true,
										forceEndVertical: true,
										pathHalfWidth: componentHalfWidth
									});
									if (item.bottom < bottomBound - 1e-6) {
										segments.push({
											x1: item.x,
											y1: item.bottom,
											x2: item.x,
											y2: bottomBound,
											v1: itemBottomV,
											v2: itemBottomV,
											role: "shoulder-wire",
											componentId: item.id,
											pathHalfWidthStart: componentHalfWidth,
											pathHalfWidthEnd: GRAPH_PATH_HALF_WIDTH
										});
									}
								}
								branchV = itemBottomV;
								branchY = bottomBound;
							}
							if (branchY < stageExitBottom - 1e-6) {
								segments.push({ x1: branchX, y1: branchY, x2: branchX, y2: stageExitBottom, v1: branchV, v2: stageBottomV });
							}
						}
						currentY = stageExitBottom;
					}
					const finalV = Number.isFinite(nodeV[nodeV.length - 1]) ? nodeV[nodeV.length - 1] : 0;
					segments.push({ x1: layout.xRight, y1: currentY, x2: layout.xRight, y2: layout.yBottom, v1: finalV, v2: finalV });
					const hasBottomBoundaryParallelStage = layout.stages.length > 0
						&& Array.isArray(layout.stages[layout.stages.length - 1].branches)
						&& layout.stages[layout.stages.length - 1].branches.length > 1;
					// Gradient covers xCell -> gradientStartX only.
					// If a parallel stage has branches to the left of xRight, bottomBusRightX < xRight and
					// the split bus (bottomBusRightX -> xRight) is 0-ohm, so it must be flat, not part of the slope.
					const gradientStartX = Math.min(layout.bottomBusRightX, layout.xRight);
					const bottomBusXSpan = gradientStartX - layout.xCell;
					const bottomBusVAtX = (x) => bottomBusXSpan > 1e-6
						? bottomNodeV + (bottomRightV - bottomNodeV) * (x - layout.xCell) / bottomBusXSpan
						: bottomNodeV;
					// Bottom bus gradient: xCell -> gradientStartX
					if (layout.xCell < gradientStartX - 1e-6) {
						segments.push({ x1: layout.xCell, y1: layout.yBottom, x2: gradientStartX, y2: layout.yBottom, v1: bottomNodeV, v2: bottomBusVAtX(gradientStartX) });
					}
					// Split bus flat: gradientStartX -> xRight (when branches extend leftward)
					// If the bottom boundary is parallel, that segment is already represented by
					// stage merge-bus segments; avoid adding an overlapping duplicate full-width segment.
					if (!hasBottomBoundaryParallelStage && gradientStartX < layout.xRight - 1e-6) {
						segments.push({ x1: gradientStartX, y1: layout.yBottom, x2: layout.xRight, y2: layout.yBottom, v1: bottomBusVAtX(gradientStartX), v2: bottomRightV });
					}
					// Split bus extension: xRight -> bottomBusRightX (flat, when branches extend rightward)
					if (layout.xRight < layout.bottomBusRightX - 1e-6) {
						segments.push({ x1: layout.xRight, y1: layout.yBottom, x2: layout.bottomBusRightX, y2: layout.yBottom, v1: bottomRightV, v2: bottomRightV });
					}
				}
				const EPS = 1e-6;
				const filtered = segments.filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > EPS);
				const deduplicated = [];
				const duplicateWireKeys = new Set();
				for (const seg of filtered) {
					const isPlainWire = !seg.role;
					const isConstantVoltage = Math.abs(seg.v1 - seg.v2) < EPS;
					const isAxisAligned = (Math.abs(seg.x2 - seg.x1) < EPS && Math.abs(seg.y2 - seg.y1) >= EPS)
						|| (Math.abs(seg.y2 - seg.y1) < EPS && Math.abs(seg.x2 - seg.x1) >= EPS);
					if (isPlainWire && isConstantVoltage && isAxisAligned) {
						const startFirst = (seg.x1 < seg.x2 - EPS)
							|| (Math.abs(seg.x1 - seg.x2) < EPS && seg.y1 <= seg.y2 + EPS);
						const ax = startFirst ? seg.x1 : seg.x2;
						const ay = startFirst ? seg.y1 : seg.y2;
						const bx = startFirst ? seg.x2 : seg.x1;
						const by = startFirst ? seg.y2 : seg.y1;
						const key = [
							ax.toFixed(3),
							ay.toFixed(3),
							bx.toFixed(3),
							by.toFixed(3),
							seg.v1.toFixed(3)
						].join("|");
						if (duplicateWireKeys.has(key)) {
							continue;
						}
						duplicateWireKeys.add(key);
					}
					deduplicated.push(seg);
				}
				const endpointDegree = new Map();
				const endpointKey = (x, y, v) => x.toFixed(3) + "|" + y.toFixed(3) + "|" + v.toFixed(3);
				for (const seg of deduplicated) {
					const k1 = endpointKey(seg.x1, seg.y1, seg.v1);
					const k2 = endpointKey(seg.x2, seg.y2, seg.v2);
					endpointDegree.set(k1, (endpointDegree.get(k1) || 0) + 1);
					endpointDegree.set(k2, (endpointDegree.get(k2) || 0) + 1);
				}
				const normalized = [];
				for (const seg of deduplicated) {
					if (!normalized.length) {
						normalized.push(seg);
						continue;
					}
					const prev = normalized[normalized.length - 1];
					const prevIsPlainWire = !prev.role;
					const segIsPlainWire = !seg.role;
					const prevConstV = Math.abs(prev.v1 - prev.v2) < EPS;
					const segConstV = Math.abs(seg.v1 - seg.v2) < EPS;
					const sameV = Math.abs(prev.v2 - seg.v1) < EPS && Math.abs(prev.v1 - seg.v1) < EPS;
					const touching = Math.abs(prev.x2 - seg.x1) < EPS && Math.abs(prev.y2 - seg.y1) < EPS;
					const prevVertical = Math.abs(prev.x2 - prev.x1) < EPS && Math.abs(prev.y2 - prev.y1) >= EPS;
					const segVertical = Math.abs(seg.x2 - seg.x1) < EPS && Math.abs(seg.y2 - seg.y1) >= EPS;
					const prevHorizontal = Math.abs(prev.y2 - prev.y1) < EPS && Math.abs(prev.x2 - prev.x1) >= EPS;
					const segHorizontal = Math.abs(seg.y2 - seg.y1) < EPS && Math.abs(seg.x2 - seg.x1) >= EPS;
					const sameLine = (prevVertical && segVertical && Math.abs(prev.x1 - seg.x1) < EPS)
						|| (prevHorizontal && segHorizontal && Math.abs(prev.y1 - seg.y1) < EPS);
					const joinKey = endpointKey(seg.x1, seg.y1, seg.v1);
					const joinDegree = endpointDegree.get(joinKey) || 0;
					const canMergeThroughJoin = joinDegree <= 2;
					if (prevIsPlainWire && segIsPlainWire && prevConstV && segConstV && sameV && touching && sameLine && canMergeThroughJoin) {
						prev.x2 = seg.x2;
						prev.y2 = seg.y2;
						prev.v2 = seg.v2;
					} else {
						normalized.push(seg);
					}
				}
				return normalized;
			}



			function buildTableDrivenGraphSegments(layout) {
				const nodePairRows = Array.isArray(state.wireLabelNodePairRows) ? state.wireLabelNodePairRows : [];
				if (nodePairRows.length === 0) return null;
				const routeGraph = buildCircuitRouteGraph(layout);
				if (!routeGraph || !routeGraph.nodeByKey) return null;

				const potentialByKey = new Map();
				const cache = (state && state.wireLabelNodePotentialByKey && typeof state.wireLabelNodePotentialByKey === "object")
					? state.wireLabelNodePotentialByKey
					: null;
				if (cache) {
					for (const [k, v] of Object.entries(cache)) {
						if (!k || !Number.isFinite(v)) continue;
						potentialByKey.set(String(k), v);
					}
				}
				if (potentialByKey.size === 0) return null;

				const roleForRow = (row) => {
					if (!row) return "wire";
					if (row.kind === "component") return "component-main";
					if (row.kind === "shoulder") return "shoulder-wire";
					if (row.kind === "switch") return "switch-blade";
					return "wire";
				};

				const out = [];
				for (const row of nodePairRows) {
					if (!row || !row.fromKey || !row.toKey) continue;
					if (row.kind === "switch"
						&& ((row.componentId === MAIN_SWITCH_ID && !isComponentSwitchClosed(MAIN_SWITCH_ID))
							|| (row.componentId && isOpenBranchSwitch(row.componentId)))) {
						continue;
					}
					const fromKey = String(row.fromKey);
					const toKey = String(row.toKey);
					const fromNode = routeGraph.nodeByKey.get(fromKey);
					const toNode = routeGraph.nodeByKey.get(toKey);
					if (!fromNode || !toNode) continue;

					let v1 = potentialByKey.get(fromKey);
					let v2 = potentialByKey.get(toKey);
					const dV = Number.isFinite(row.pdPlusEmf) ? row.pdPlusEmf : NaN;
					if (Number.isFinite(v1) && !Number.isFinite(v2) && Number.isFinite(dV)) v2 = v1 + dV;
					if (!Number.isFinite(v1) && Number.isFinite(v2) && Number.isFinite(dV)) v1 = v2 - dV;
					if (!Number.isFinite(v1) || !Number.isFinite(v2)) continue;

					out.push({
						x1: fromNode.x,
						y1: fromNode.y,
						x2: toNode.x,
						y2: toNode.y,
						v1,
						v2,
						role: roleForRow(row),
						componentId: row.componentId || null
					});
				}
				const compBodyByCompId = new Map();
				for (const seg of out) {
					if (seg.role === "component-main" && seg.componentId && !isExtraCell(seg.componentId) && !isBranchSwitch(seg.componentId)) {
						compBodyByCompId.set(seg.componentId, { minY: Math.min(seg.y1, seg.y2), maxY: Math.max(seg.y1, seg.y2) });
					}
				}
				for (const seg of out) {
					if (!seg.componentId || isExtraCell(seg.componentId) || isBranchSwitch(seg.componentId)) continue;
					const hw = componentGraphHalfWidthById(seg.componentId);
					if (seg.role === "component-main") {
						seg.pathHalfWidth = hw;
						seg.forceStartVertical = true;
						seg.forceEndVertical = true;
					} else if (seg.role === "shoulder-wire") {
						const body = compBodyByCompId.get(seg.componentId);
						if (body) {
							const s1NearBody = Math.abs(seg.y1 - body.minY) < 1 || Math.abs(seg.y1 - body.maxY) < 1;
							const s2NearBody = Math.abs(seg.y2 - body.minY) < 1 || Math.abs(seg.y2 - body.maxY) < 1;
							if (s1NearBody && !s2NearBody) { seg.pathHalfWidthStart = hw; seg.pathHalfWidthEnd = GRAPH_PATH_HALF_WIDTH; }
							else if (s2NearBody && !s1NearBody) { seg.pathHalfWidthStart = GRAPH_PATH_HALF_WIDTH; seg.pathHalfWidthEnd = hw; }
						}
					}
				}
				return out.length ? out : null;
			}

			function collectPotentialGraphSegments(layout) {
				const rawCircuitSegs = buildCircuitVoltageSegments(layout);
				const tableSegs = buildTableDrivenGraphSegments(layout);
				const segs = (tableSegs ? tableSegs.slice() : rawCircuitSegs.slice())
					.filter((seg) => !isOpenSwitchGapVoltageSegment(seg));
				if (!tableSegs) return segs;

				const hasSegment = (candidate) => segs.some((s) =>
					Math.abs(s.x1 - candidate.x1) < 1e-6
					&& Math.abs(s.y1 - candidate.y1) < 1e-6
					&& Math.abs(s.x2 - candidate.x2) < 1e-6
					&& Math.abs(s.y2 - candidate.y2) < 1e-6
					&& Math.abs(s.v1 - candidate.v1) < 1e-6
					&& Math.abs(s.v2 - candidate.v2) < 1e-6
					&& (s.role || "") === (candidate.role || "")
				);

				for (const seg of rawCircuitSegs) {
					if (!seg) continue;
					if (isOpenSwitchGapVoltageSegment(seg)) continue;
					const keepOpenSwitchVisual = isNodeToOpenSwitchVoltageSegment(seg)
						|| (seg.role === "switch-blade"
							&& seg.isFlatVoltage === true
							&& ((seg.componentId === MAIN_SWITCH_ID && !isComponentSwitchClosed(MAIN_SWITCH_ID))
								|| (seg.componentId && isOpenBranchSwitch(seg.componentId))));
					if (!keepOpenSwitchVisual) continue;
					if (!hasSegment(seg)) segs.push(seg);
				}
				return segs;
			}

			function updateGraphColorScale(layout) {
				if (!layout) {
					state.graphColorScale = { displayMin: 0, displayMax: 1, maxAbs: 1 };
					return;
				}
				const segs = collectPotentialGraphSegments(layout);
				let displayMin = Infinity;
				let displayMax = -Infinity;
				for (const s of segs) {
					if (!s) continue;
					const dv1 = graphDisplayVoltage(s.v1);
					const dv2 = graphDisplayVoltage(s.v2);
					if (Number.isFinite(dv1)) {
						displayMin = Math.min(displayMin, dv1);
						displayMax = Math.max(displayMax, dv1);
					}
					if (Number.isFinite(dv2)) {
						displayMin = Math.min(displayMin, dv2);
						displayMax = Math.max(displayMax, dv2);
					}
				}
				if (!Number.isFinite(displayMin) || !Number.isFinite(displayMax)) {
					displayMin = 0;
					displayMax = 1;
				}
				const maxAbs = Math.max(1e-6, Math.abs(displayMin), Math.abs(displayMax), 0);
				state.graphColorScale = { displayMin, displayMax, maxAbs };
			}

			function drawPotentialGraph(layout) {
				state.graphTrackGeometry = null;
				const useVoltageColours = !!state.voltageColorMode;
				const panelX = 0;
				const panelY = 0;
				const panelW = layout.w;
				const panelH = layout.h;
				const segs = collectPotentialGraphSegments(layout);
				if (!segs.length) return;
				const useStepwiseShortRouteSurface = false;

				// Pre-compute raw max so the inverted axis can use it for graphV.
				let rawVMax = -Infinity;
				for (const s of segs) {
					if (Number.isFinite(s.v1) && s.v1 > rawVMax) rawVMax = s.v1;
					if (Number.isFinite(s.v2) && s.v2 > rawVMax) rawVMax = s.v2;
				}
				if (!Number.isFinite(rawVMax)) rawVMax = 0;

				// graphV maps solver-normalised (min=0) potentials to graph heights.
				// Non-inverted: 0 is floor, higher potentials go up.
				// Inverted: highest potential is floor, 0 (min) is at the top.
				const graphV = state.invertVoltageAxis
					? (v) => rawVMax - v
					: (v) => v;

				let vMin = Infinity;
				let vMax = -Infinity;
				for (let segIndex = 0; segIndex < segs.length; segIndex++) {
					const s = segs[segIndex];
					const gv1 = graphV(s.v1);
					const gv2 = graphV(s.v2);
					if (gv1 < vMin) vMin = gv1;
					if (gv2 < vMin) vMin = gv2;
					if (gv1 > vMax) vMax = gv1;
					if (gv2 > vMax) vMax = gv2;
				}
				if (!Number.isFinite(vMin) || !Number.isFinite(vMax)) {
					vMin = 0;
					vMax = 1;
				}
				const vMid = 0;
				const vSpan = Math.max(0.5, vMax - vMin);
				const az = state.graphAzimuth;
				const el = state.graphElevation;
				const zoom = state.graphZoom;
				const xyScale = GRAPH_XY_SCALE_BASE * zoom;
				const zScale = GRAPH_VOLTS_TO_HEIGHT * zoom;
				const cAz = Math.cos(az);
				const sAz = Math.sin(az);
				const cEl = Math.cos(el);
				const sEl = Math.sin(el);
				const cRoll = Math.cos(state.graphRoll);
				const sRoll = Math.sin(state.graphRoll);
				const xRef = (layout.xCell + layout.xRight) * 0.5;
				const yRef = (layout.yTop + layout.yBottom) * 0.5;

				function project(x, y, v) {
					const ux = (x - xRef) * xyScale;
					const uy = (y - yRef) * xyScale;
					const uz = (v - vMid) * zScale;
				// Apply roll (true 3D y-axis rotation) to 3D coordinates
				const ux_r = ux * cRoll + uz * sRoll;
				const uz_r = -ux * sRoll + uz * cRoll;
				const uy_r = uy;
				// Apply azimuth (z-axis rotation)
				const xr = ux_r * cAz - uy_r * sAz;
				const yr = ux_r * sAz + uy_r * cAz;
				// Apply elevation projection
				const sx = xr + uz_r * 0.34 * cEl;
				const sy = yr * 0.66 - uz_r * sEl;
				const graphCenter = getGraphCenter(layout);
				return {
					x: graphCenter.x + sx,
					y: graphCenter.y + sy
				};
			}

			ctx.save();
			const azDeg = (state.graphAzimuth * 180 / Math.PI);
			const elDeg = (state.graphElevation * 180 / Math.PI);
			const rollDeg = (state.graphRoll * 180 / Math.PI);
			const readoutX = layout.w - 14;
			const readoutY = layout.h - 14;
			const readoutStep = 14;
			ctx.fillStyle = "rgba(51, 66, 85, 0.95)";
			ctx.font = "600 11px system-ui, sans-serif";
			ctx.textAlign = "right";
			ctx.textBaseline = "alphabetic";
			ctx.fillText("Zoom " + state.graphZoom.toFixed(2) + "x", readoutX, readoutY - readoutStep * 0);
			ctx.fillText("Roll " + state.graphRoll.toFixed(3) + " rad (" + rollDeg.toFixed(1) + " deg)", readoutX, readoutY - readoutStep * 1);
			ctx.fillText("El " + state.graphElevation.toFixed(3) + " rad (" + elDeg.toFixed(1) + " deg)", readoutX, readoutY - readoutStep * 2);
			ctx.fillText("Az " + state.graphAzimuth.toFixed(3) + " rad (" + azDeg.toFixed(1) + " deg)", readoutX, readoutY - readoutStep * 3);
			const referenceLabel = state.invertVoltageAxis ? "max node potential" : "min node potential";
			ctx.fillText("Reference: " + referenceLabel + " = 0 V", readoutX, readoutY - readoutStep * 4);
			ctx.fillText("Controls: Left-drag pan, Right-drag potential-axis rotate, Shift+Left-drag x/y rotate, Wheel zoom", readoutX, readoutY - readoutStep * 5);

				function endpointKey(x, y, v) {
					return x.toFixed(3) + "|" + y.toFixed(3) + "|" + v.toFixed(3);
				}
				const openGapJointKeys = new Set();
				for (const rawSeg of buildCircuitVoltageSegments(layout)) {
					if (!isOpenSwitchGapVoltageSegment(rawSeg)) continue;
					const gv1 = graphV(rawSeg.v1);
					const gv2 = graphV(rawSeg.v2);
					openGapJointKeys.add(endpointKey(rawSeg.x1, rawSeg.y1, gv1));
					openGapJointKeys.add(endpointKey(rawSeg.x2, rawSeg.y2, gv2));
				}

				const jointMap = new Map();
				for (const s of segs) {
					const gv1 = graphV(s.v1);
					const gv2 = graphV(s.v2);
					const dx = s.x2 - s.x1;
					const dy = s.y2 - s.y1;
					const len = Math.max(1e-6, Math.hypot(dx, dy));
					const ux = dx / len;
					const uy = dy / len;
					const startKey = endpointKey(s.x1, s.y1, gv1);
					const endKey = endpointKey(s.x2, s.y2, gv2);
					const segStartHalfWidth = segmentPathHalfWidthAt(s, true);
					const segEndHalfWidth = segmentPathHalfWidthAt(s, false);
					if (!jointMap.has(startKey)) jointMap.set(startKey, { count: 0, color: useVoltageColours ? voltageToColor(s.v1) : "#ffffff", hasComponent: false, hasSwitch: false, dirs: [], hasCorner: false, maxHalfWidth: segStartHalfWidth, skipTrim: false });
					if (!jointMap.has(endKey)) jointMap.set(endKey, { count: 0, color: useVoltageColours ? voltageToColor(s.v2) : "#ffffff", hasComponent: false, hasSwitch: false, dirs: [], hasCorner: false, maxHalfWidth: segEndHalfWidth, skipTrim: false });
					jointMap.get(startKey).count += 1;
					jointMap.get(endKey).count += 1;
					jointMap.get(startKey).dirs.push({ x: ux, y: uy });
					jointMap.get(endKey).dirs.push({ x: -ux, y: -uy });
					jointMap.get(startKey).maxHalfWidth = Math.max(jointMap.get(startKey).maxHalfWidth || 0, segStartHalfWidth);
					jointMap.get(endKey).maxHalfWidth = Math.max(jointMap.get(endKey).maxHalfWidth || 0, segEndHalfWidth);
					const shortJoinSegment = len <= Math.max(segStartHalfWidth, segEndHalfWidth) * 1.15;
					const shortSwitchJoin = shortJoinSegment
						&& (s.role === "switch-blade"
							|| isNodeToOpenSwitchVoltageSegment(s)
							|| isOpenSwitchGapVoltageSegment(s));
					if (shortSwitchJoin) {
						jointMap.get(startKey).skipTrim = true;
						jointMap.get(endKey).skipTrim = true;
					}
					if (s.role === "component-main") {
						jointMap.get(startKey).hasComponent = true;
						jointMap.get(endKey).hasComponent = true;
					}
					if (s.role === "switch-blade") {
						jointMap.get(startKey).hasSwitch = true;
						jointMap.get(endKey).hasSwitch = true;
					}
				}

				const tablePotentialCache = (state && state.wireLabelNodePotentialByKey && typeof state.wireLabelNodePotentialByKey === "object")
					? state.wireLabelNodePotentialByKey
					: null;
				const routeGraphForNodeCaps = buildCircuitRouteGraph(layout);
				if (tablePotentialCache && routeGraphForNodeCaps && routeGraphForNodeCaps.nodeByKey && routeGraphForNodeCaps.adjacency && routeGraphForNodeCaps.edges) {
					const edgeOrientationAtNode = (edge, nodeKey) => {
						const otherKey = edge.nodeA === nodeKey ? edge.nodeB : edge.nodeA;
						const center = routeGraphForNodeCaps.nodeByKey.get(nodeKey);
						const other = routeGraphForNodeCaps.nodeByKey.get(otherKey);
						if (!center || !other) return null;
						const dx = other.x - center.x;
						const dy = other.y - center.y;
						return Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
					};
					for (const node of routeGraphForNodeCaps.nodeByKey.values()) {
						const incident = routeGraphForNodeCaps.adjacency.get(node.key) || [];
						const degree = incident.length;
						const isJunction = degree > 2;
						let isCorner = false;
						if (degree === 2) {
							const o1 = edgeOrientationAtNode(routeGraphForNodeCaps.edges[incident[0]], node.key);
							const o2 = edgeOrientationAtNode(routeGraphForNodeCaps.edges[incident[1]], node.key);
							isCorner = !!(o1 && o2 && o1 !== o2);
						}
						if (!isJunction && !isCorner) continue;
						const pv = tablePotentialCache[node.key];
						if (!Number.isFinite(pv)) continue;
						const jKey = endpointKey(node.x, node.y, graphV(pv));
						if (!jointMap.has(jKey)) {
							jointMap.set(jKey, {
								count: 2,
								color: useVoltageColours ? voltageToColor(pv) : "#ffffff",
								hasComponent: false,
								hasSwitch: false,
								dirs: [{ x: 1, y: 0 }, { x: 0, y: 1 }],
								hasCorner: true,
								maxHalfWidth: GRAPH_PATH_HALF_WIDTH,
								skipTrim: false
							});
							continue;
						}
						const joint = jointMap.get(jKey);
						joint.count = Math.max(2, Number.isFinite(joint.count) ? joint.count : 0);
						joint.hasCorner = true;
						joint.maxHalfWidth = Math.max(joint.maxHalfWidth || 0, GRAPH_PATH_HALF_WIDTH);
					}
				}

				for (const joint of jointMap.values()) {
					for (let i = 0; i < joint.dirs.length; i++) {
						for (let j = i + 1; j < joint.dirs.length; j++) {
							const dot = joint.dirs[i].x * joint.dirs[j].x + joint.dirs[i].y * joint.dirs[j].y;
							if (Math.abs(dot) < 0.98) {
								joint.hasCorner = true;
								break;
							}
						}
						if (joint.hasCorner) break;
					}
				}
				for (const key of openGapJointKeys) {
					const joint = jointMap.get(key);
					if (!joint) continue;
					joint.skipTrim = true;
				}

				const firstStage = (layout.stages && layout.stages.length) ? layout.stages[0] : null;
				if (firstStage && firstStage.branches && firstStage.branches.length > 1) {
					for (const [key, joint] of jointMap.entries()) {
						const parts = key.split("|");
						const jx = Number(parts[0]);
						const jy = Number(parts[1]);
						if (!Number.isFinite(jx) || !Number.isFinite(jy)) continue;
						if (Math.abs(jx - layout.topBusRightX) < 1e-3 && Math.abs(jy - layout.yTop) < 1e-3) {
							joint.hasCorner = true;
							break;
						}
					}
				}
				const lastStage = (layout.stages && layout.stages.length) ? layout.stages[layout.stages.length - 1] : null;
				if (lastStage && lastStage.branches && lastStage.branches.length > 1) {
					for (const [key, joint] of jointMap.entries()) {
						const parts = key.split("|");
						const jx = Number(parts[0]);
						const jy = Number(parts[1]);
						if (!Number.isFinite(jx) || !Number.isFinite(jy)) continue;
						if (Math.abs(jx - layout.bottomBusRightX) < 1e-3 && Math.abs(jy - layout.yBottom) < 1e-3) {
							joint.hasCorner = true;
							break;
						}
					}
				}

				const endpointWidthStats = new Map();
				function addEndpointWidth(key, width) {
					if (!endpointWidthStats.has(key)) {
						endpointWidthStats.set(key, { min: width, max: width });
						return;
					}
					const stats = endpointWidthStats.get(key);
					stats.min = Math.min(stats.min, width);
					stats.max = Math.max(stats.max, width);
				}
				for (const s of segs) {
					const gv1 = graphV(s.v1);
					const gv2 = graphV(s.v2);
					const startKey = endpointKey(s.x1, s.y1, gv1);
					const endKey = endpointKey(s.x2, s.y2, gv2);
					addEndpointWidth(startKey, segmentPathHalfWidthAt(s, true));
					addEndpointWidth(endKey, segmentPathHalfWidthAt(s, false));
				}

				// Draw a flat projected copy of the circuit on the z=0 base plane.
					ctx.strokeStyle = "rgba(70, 84, 100, 0.45)";
					ctx.lineWidth = 1.4;
					ctx.lineCap = "round";
					for (const s of segs) {
						const a0 = project(s.x1, s.y1, 0);
						const b0 = project(s.x2, s.y2, 0);
						ctx.beginPath();
						ctx.moveTo(a0.x, a0.y);
						ctx.lineTo(b0.x, b0.y);
						ctx.stroke();
					}

					ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
					ctx.strokeStyle = "rgba(45, 62, 84, 0.55)";
					ctx.lineWidth = 1.1;
					for (const item of layout.rects) {
						if (isExtraCell(item.id)) {
							const hasInternal = !!state.internalR;
							const cellPolarity = getCellPolarity(item.id);
							const cellTopPlateHalf = cellPolarity > 0 ? 18 : 30;
							const cellBottomPlateHalf = cellPolarity > 0 ? 30 : 18;
							const cellSecondTopPlateHalf = cellPolarity > 0 ? 18 : 30;
							const cellSecondBottomPlateHalf = cellPolarity > 0 ? 30 : 18;
							const emfTop = hasInternal ? (item.top + RES_H + CONNECTOR_WIRE * 2) : (item.y - 30);
							const emfBottom = hasInternal ? (emfTop + EMF_BODY_HEIGHT) : (item.y + 30);
							const emfMid = (emfTop + emfBottom) * 0.5;
							const plateTopY = emfTop;
							const plateSecondTopY = emfMid - 10;
							const plateSecondBottomY = emfMid + 10;
							const plateBottomY = emfBottom;
							const cell2LabelY = hasInternal ? emfMid : item.y;
							ctx.strokeStyle = "rgba(24, 37, 56, 0.78)";
							ctx.lineWidth = 1.8;
							ctx.beginPath();
							let pA = project(item.x - cellTopPlateHalf, plateTopY, 0);
							let pB = project(item.x + cellTopPlateHalf, plateTopY, 0);
							ctx.moveTo(pA.x, pA.y);
							ctx.lineTo(pB.x, pB.y);
							pA = project(item.x - cellBottomPlateHalf, plateSecondTopY, 0);
							pB = project(item.x + cellBottomPlateHalf, plateSecondTopY, 0);
							ctx.moveTo(pA.x, pA.y);
							ctx.lineTo(pB.x, pB.y);
							pA = project(item.x - cellSecondTopPlateHalf, plateSecondBottomY, 0);
							pB = project(item.x + cellSecondTopPlateHalf, plateSecondBottomY, 0);
							ctx.moveTo(pA.x, pA.y);
							ctx.lineTo(pB.x, pB.y);
							pA = project(item.x - cellSecondBottomPlateHalf, plateBottomY, 0);
							pB = project(item.x + cellSecondBottomPlateHalf, plateBottomY, 0);
							ctx.moveTo(pA.x, pA.y);
							ctx.lineTo(pB.x, pB.y);
							ctx.stroke();

							if (hasInternal) {
								const irLeft = item.x - RES_W / 2;
								const irRight = item.x + RES_W / 2;
								const irTop = item.top;
								const irBottom = irTop + RES_H;
								const irCenterY = (irTop + irBottom) * 0.5;

								ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
								ctx.strokeStyle = "rgba(24, 37, 56, 0.8)";
								ctx.lineWidth = 1.4;
								const irTL = project(irLeft, irTop, 0);
								const irTR = project(irRight, irTop, 0);
								const irBR = project(irRight, irBottom, 0);
								const irBL = project(irLeft, irBottom, 0);
								ctx.beginPath();
								ctx.moveTo(irTL.x, irTL.y);
								ctx.lineTo(irTR.x, irTR.y);
								ctx.lineTo(irBR.x, irBR.y);
								ctx.lineTo(irBL.x, irBL.y);
								ctx.closePath();
								ctx.fill();
								ctx.stroke();

								const irC = project(item.x, irCenterY, 0);
								ctx.fillStyle = "rgba(24, 37, 56, 0.9)";
								ctx.font = "600 9px system-ui, sans-serif";
								ctx.textAlign = "center";
								ctx.textBaseline = "middle";
								ctx.fillText(getCellRInternal(item.id).toFixed(1) + " \u03a9", irC.x, irC.y);

								const boxLeft = item.x - 72;
								const boxRight = item.x + 72;
								const boxTop = irTop - 12;
								const boxBottom = plateBottomY + 16;
								const boxTL = project(boxLeft, boxTop, 0);
								const boxTR = project(boxRight, boxTop, 0);
								const boxBR = project(boxRight, boxBottom, 0);
								const boxBL = project(boxLeft, boxBottom, 0);
								ctx.strokeStyle = "rgba(24, 37, 56, 0.68)";
								ctx.lineWidth = 1.3;
								ctx.setLineDash([6, 4]);
								ctx.beginPath();
								ctx.moveTo(boxTL.x, boxTL.y);
								ctx.lineTo(boxTR.x, boxTR.y);
								ctx.lineTo(boxBR.x, boxBR.y);
								ctx.lineTo(boxBL.x, boxBL.y);
								ctx.closePath();
								ctx.stroke();
								ctx.setLineDash([]);
							}
						} else if (isBranchSwitch(item.id)) {
							const switchClosed = isComponentSwitchClosed(item.id);
							const contactTopY = item.y - 16;
							const contactBottomY = item.y + 16;
							const bladeEndX = switchClosed ? item.x : (item.x + 16);
							const bladeEndY = switchClosed ? contactBottomY : (contactBottomY - 8);
							ctx.strokeStyle = "rgba(24, 37, 56, 0.8)";
							ctx.lineWidth = 1.4;
							ctx.lineCap = "round";
							let pA = project(item.x, item.top, 0);
							let pB = project(item.x, contactTopY, 0);
							ctx.beginPath();
							ctx.moveTo(pA.x, pA.y);
							ctx.lineTo(pB.x, pB.y);
							ctx.stroke();
							pA = project(item.x, contactBottomY, 0);
							pB = project(item.x, item.bottom, 0);
							ctx.beginPath();
							ctx.moveTo(pA.x, pA.y);
							ctx.lineTo(pB.x, pB.y);
							ctx.stroke();
							const cTop = project(item.x, contactTopY, 0);
							const cBottom = project(item.x, contactBottomY, 0);
							ctx.fillStyle = "rgba(24, 37, 56, 0.9)";
							ctx.beginPath();
							ctx.arc(cTop.x, cTop.y, 2.8, 0, Math.PI * 2);
							ctx.arc(cBottom.x, cBottom.y, 2.8, 0, Math.PI * 2);
							ctx.fill();
							const bStart = project(item.x, contactTopY, 0);
							const bEnd = project(bladeEndX, bladeEndY, 0);
							ctx.beginPath();
							ctx.moveTo(bStart.x, bStart.y);
							ctx.lineTo(bEnd.x, bEnd.y);
							ctx.stroke();
						} else {
							const pTL = project(item.left, item.top, 0);
							const pTR = project(item.right, item.top, 0);
							const pBR = project(item.right, item.bottom, 0);
							const pBL = project(item.left, item.bottom, 0);
							ctx.beginPath();
							ctx.moveTo(pTL.x, pTL.y);
							ctx.lineTo(pTR.x, pTR.y);
							ctx.lineTo(pBR.x, pBR.y);
							ctx.lineTo(pBL.x, pBL.y);
							ctx.closePath();
							ctx.fill();
							ctx.stroke();
						}

						const pc = project(item.x, item.y, 0);
						ctx.fillStyle = "rgba(36, 53, 75, 0.9)";
						ctx.font = "600 9.5px system-ui, sans-serif";
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						if (isExtraCell(item.id)) {
							const hasInternal = !!state.internalR;
							const cell2LabelY = hasInternal
								? (item.top + RES_H + CONNECTOR_WIRE * 2 + EMF_BODY_HEIGHT * 0.5)
								: item.y;
							const cell2LabelPoint = project(item.x + 44, cell2LabelY, 0);
							ctx.fillText(getCellEmf(item.id).toFixed(1) + " V", cell2LabelPoint.x, cell2LabelPoint.y);
						} else if (isBranchSwitch(item.id)) {
							ctx.fillText(item.id, pc.x, pc.y);
						} else {
							const rVal = Number.isFinite(state.resistorValues[item.id]) ? state.resistorValues[item.id] : 0;
							ctx.fillText(rVal.toFixed(1) + " \u03a9", pc.x, pc.y);
						}
						ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
					}

				const segmentMeshes = [];
				for (let segIndex = 0; segIndex < segs.length; segIndex++) {
					const s = segs[segIndex];
					const gv1 = graphV(s.v1);
					const gv2 = graphV(s.v2);
					const dx = s.x2 - s.x1;
					const dy = s.y2 - s.y1;
					const len = Math.max(1e-6, Math.hypot(dx, dy));
					const segStartHalfWidth = segmentPathHalfWidthAt(s, true);
					const segEndHalfWidth = segmentPathHalfWidthAt(s, false);
					const segHalfWidth = Math.max(segStartHalfWidth, segEndHalfWidth);
					const startKey = endpointKey(s.x1, s.y1, gv1);
					const endKey = endpointKey(s.x2, s.y2, gv2);
					const startJoint = jointMap.get(startKey);
					const endJoint = jointMap.get(endKey);
					const startArrivals = Math.max(0, (startJoint?.count || 1) - 1);
					const endArrivals = Math.max(0, (endJoint?.count || 1) - 1);
					const startWidthStats = endpointWidthStats.get(startKey);
					const endWidthStats = endpointWidthStats.get(endKey);
					const startHasWidthTransition = !!startWidthStats && (startWidthStats.max - startWidthStats.min) > 0.1;
					const endHasWidthTransition = !!endWidthStats && (endWidthStats.max - endWidthStats.min) > 0.1;
					const drawStartVertical = (startArrivals !== 1) || startHasWidthTransition || !!s.forceStartVertical;
					const drawEndVertical = (endArrivals !== 1) || endHasWidthTransition || !!s.forceEndVertical;
					const startCornerTrim = (startJoint?.hasCorner && !startJoint?.hasSwitch && !startJoint?.skipTrim)
						? Math.max(segStartHalfWidth, startJoint?.maxHalfWidth || 0)
						: 0;
					const endCornerTrim = (endJoint?.hasCorner && !endJoint?.hasSwitch && !endJoint?.skipTrim)
						? Math.max(segEndHalfWidth, endJoint?.maxHalfWidth || 0)
						: 0;
					let startTrim = startCornerTrim;
					let endTrim = endCornerTrim;
					const minCoreLen = Math.min(1.0, len);
					const totalTrim = startTrim + endTrim;
					const maxTotalTrim = Math.max(0, len - minCoreLen);
					if (totalTrim > maxTotalTrim && totalTrim > 1e-6) {
						const scale = maxTotalTrim / totalTrim;
						startTrim *= scale;
						endTrim *= scale;
					}
					let t0 = startTrim / len;
					let t1 = 1 - endTrim / len;
					if (t1 <= t0) {
						t0 = 0;
						t1 = 1;
					}

					const xA = s.x1 + dx * t0;
					const yA = s.y1 + dy * t0;
					const xB = s.x1 + dx * t1;
					const yB = s.y1 + dy * t1;
					// Keep section endpoint voltages while shortening geometry, so slope uses the trimmed drawable length.
					const vA = gv1;
					const vB = gv2;
					const tdx = xB - xA;
					const tdy = yB - yA;
					const tlen = Math.max(1e-6, Math.hypot(tdx, tdy));
					const offAX = -tdy / tlen * segStartHalfWidth;
					const offAY = tdx / tlen * segStartHalfWidth;
					const offBX = -tdy / tlen * segEndHalfWidth;
					const offBY = tdx / tlen * segEndHalfWidth;

					const centerA = project(xA, yA, vA);
					const centerB = project(xB, yB, vB);
					const leftA = project(xA + offAX, yA + offAY, vA);
					const rightA = project(xA - offAX, yA - offAY, vA);
					const leftB = project(xB + offBX, yB + offBY, vB);
					const rightB = project(xB - offBX, yB - offBY, vB);
					const leftA0 = project(xA + offAX, yA + offAY, 0);
					const rightA0 = project(xA - offAX, yA - offAY, 0);
					const leftB0 = project(xB + offBX, yB + offBY, 0);
					const rightB0 = project(xB - offBX, yB - offBY, 0);
					const segColorV1 = actualVoltageFromGraphDisplay(vA);
					const segColorV2 = actualVoltageFromGraphDisplay(vB);
					const color1 = useVoltageColours ? voltageToColor(segColorV1) : "#ffffff";
					const color2 = useVoltageColours ? voltageToColor(segColorV2) : "#ffffff";
					const grad = ctx.createLinearGradient(centerA.x, centerA.y, centerB.x, centerB.y);
					const leftGrad = ctx.createLinearGradient(leftA.x, leftA.y, leftB.x, leftB.y);
					const rightGrad = ctx.createLinearGradient(rightA.x, rightA.y, rightB.x, rightB.y);
					grad.addColorStop(0, color1);
					grad.addColorStop(1, color2);
					leftGrad.addColorStop(0, color1);
					leftGrad.addColorStop(1, color2);
					rightGrad.addColorStop(0, color1);
					rightGrad.addColorStop(1, color2);

					segmentMeshes.push({
						segIndex,
						role: s.role || "wire",
						startArrivals,
						endArrivals,
						drawStartVertical,
						drawEndVertical,
						halfWidth: segHalfWidth,
						halfWidthStart: segStartHalfWidth,
						halfWidthEnd: segEndHalfWidth,
						grad,
						leftGrad,
						rightGrad,
						color1,
						color2,
						centerA,
						centerB,
						leftA,
						rightA,
						leftB,
						rightB,
						leftA0,
						rightA0,
						leftB0,
						rightB0
					});
				}

				// ── Unified depth-sorted wall pass ──────────────────────────────────────────
				// All wall face quads (segment sides + joint caps) are collected here,
				// sorted back-to-front by average screen-Y of their base corners.
				// Edge lines are separate depth-sorted entries at faceDepth+0.5 so they
				// sit just in front of their own face fill but behind any nearer face fill.
				const allWallFaces = [];

				if (useVoltageColours) {
					for (const mesh of segmentMeshes) {
						const faceDepth = (mesh.leftA0.y + mesh.rightA0.y + mesh.leftB0.y + mesh.rightB0.y) * 0.25;
						allWallFaces.push({ pts: [mesh.leftA,  mesh.leftB,  mesh.leftB0,  mesh.leftA0],  style: mesh.leftGrad,  depth: faceDepth, alpha: 0.14 });
						allWallFaces.push({ pts: [mesh.rightA, mesh.rightB, mesh.rightB0, mesh.rightA0], style: mesh.rightGrad, depth: faceDepth, alpha: 0.14 });
					}
				}

				const topLayer = document.createElement("canvas");
				topLayer.width = canvas.width;
				topLayer.height = canvas.height;
				const topCtx = topLayer.getContext("2d");
				let toScreen = null;
				const topScreenPath = new Path2D();
				const topSegmentScreenPath = new Path2D();
				const topScreenPolygons = [];
				const topWorldPolygons = [];
				const jointCapScreenPolygons = [];
				const jointCapWorldPolygons = [];
				const topSegmentFills = [];
				const topJointFills = [];
				if (topCtx) {
					const tf = ctx.getTransform();
					toScreen = (p) => ({
						x: tf.a * p.x + tf.c * p.y + tf.e,
						y: tf.b * p.x + tf.d * p.y + tf.f
					});

					for (const mesh of segmentMeshes) {
						const leftA = toScreen(mesh.leftA);
						const leftB = toScreen(mesh.leftB);
						const rightB = toScreen(mesh.rightB);
						const rightA = toScreen(mesh.rightA);
						const centerA = toScreen(mesh.centerA);
						const centerB = toScreen(mesh.centerB);
						const minSegX = Math.min(leftA.x, leftB.x, rightA.x, rightB.x);
						const maxSegX = Math.max(leftA.x, leftB.x, rightA.x, rightB.x);
						const minSegY = Math.min(leftA.y, leftB.y, rightA.y, rightB.y);
						const maxSegY = Math.max(leftA.y, leftB.y, rightA.y, rightB.y);
						const screenOutline = [leftA, leftB, rightB, rightA].map((pt) => ({ x: pt.x, y: pt.y }));
						const worldOutline = [
							{ x: mesh.leftA.x, y: mesh.leftA.y },
							{ x: mesh.leftB.x, y: mesh.leftB.y },
							{ x: mesh.rightB.x, y: mesh.rightB.y },
							{ x: mesh.rightA.x, y: mesh.rightA.y }
						];
						topWorldPolygons.push(worldOutline);
						topScreenPolygons.push(screenOutline);
						appendPolygonToPath(topScreenPath, screenOutline);
						appendPolygonToPath(topSegmentScreenPath, screenOutline);
						topSegmentFills.push({
							polygon: screenOutline,
							leftEdge: [leftA, leftB],
							rightEdge: [rightA, rightB],
							start: centerA,
							end: centerB,
							minX: minSegX,
							maxX: maxSegX,
							minY: minSegY,
							maxY: maxSegY,
							color1: mesh.color1,
							color2: mesh.color2
						});
					}
				}

				for (const [key, joint] of jointMap.entries()) {
					if (joint.count < 2) continue;
					if (!joint.hasCorner) continue;
					if (joint.hasSwitch) continue;
					if (openGapJointKeys.has(key)) continue;
					const parts = key.split("|");
					const jx = Number(parts[0]);
					const jy = Number(parts[1]);
					const jv = Number(parts[2]);
					if (!Number.isFinite(jx) || !Number.isFinite(jy) || !Number.isFinite(jv)) continue;
					const w = Math.max(1e-6, joint.maxHalfWidth || GRAPH_PATH_HALF_WIDTH);
					const p1 = project(jx - w, jy - w, jv);
					const p2 = project(jx + w, jy - w, jv);
					const p3 = project(jx + w, jy + w, jv);
					const p4 = project(jx - w, jy + w, jv);
					let jointScreenPolygon = null;
					if (topCtx && toScreen) {
						const t1 = toScreen(p1);
						const t2 = toScreen(p2);
						const t3 = toScreen(p3);
						const t4 = toScreen(p4);
						jointScreenPolygon = [
							{ x: t1.x, y: t1.y },
							{ x: t2.x, y: t2.y },
							{ x: t3.x, y: t3.y },
							{ x: t4.x, y: t4.y }
						];
						jointCapScreenPolygons.push(jointScreenPolygon);
						jointCapWorldPolygons.push([
							{ x: jx - w, y: jy - w },
							{ x: jx + w, y: jy - w },
							{ x: jx + w, y: jy + w },
							{ x: jx - w, y: jy + w }
						]);
						appendPolygonToPath(topScreenPath, jointScreenPolygon);
					}

					const b1 = project(jx - w, jy - w, 0);
					const b2 = project(jx + w, jy - w, 0);
					const b3 = project(jx + w, jy + w, 0);
					const b4 = project(jx - w, jy + w, 0);
					const touchesRight = joint.dirs.some((d) => d.x > 0.5);
					const touchesLeft = joint.dirs.some((d) => d.x < -0.5);
					const touchesDown = joint.dirs.some((d) => d.y > 0.5);
					const touchesUp = joint.dirs.some((d) => d.y < -0.5);
					if (jointScreenPolygon) {
						topJointFills.push({
							polygon: jointScreenPolygon,
							color: joint.color,
							touchesUp,
							touchesRight,
							touchesDown,
							touchesLeft
						});
					}

					if (useVoltageColours) {
						const jDepth = (b1.y + b2.y + b3.y + b4.y) * 0.25;
						const wallStyle = joint.color;
						if (!touchesUp) allWallFaces.push({ pts: [p1, p2, b2, b1], style: wallStyle, depth: jDepth, alpha: 0.12 });
						if (!touchesRight) allWallFaces.push({ pts: [p2, p3, b3, b2], style: wallStyle, depth: jDepth, alpha: 0.12 });
						if (!touchesDown) allWallFaces.push({ pts: [p3, p4, b4, b3], style: wallStyle, depth: jDepth, alpha: 0.12 });
						if (!touchesLeft) allWallFaces.push({ pts: [p4, p1, b1, b4], style: wallStyle, depth: jDepth, alpha: 0.12 });
					}
				}

				// ── Draw all wall faces and edges: single depth-sorted pass ───────────────
				allWallFaces.sort((a, b) => a.depth - b.depth);
				for (const face of allWallFaces) {
					ctx.globalAlpha = face.alpha;
					ctx.fillStyle = face.style;
					ctx.beginPath();
					ctx.moveTo(face.pts[0].x, face.pts[0].y);
					ctx.lineTo(face.pts[1].x, face.pts[1].y);
					ctx.lineTo(face.pts[2].x, face.pts[2].y);
					ctx.lineTo(face.pts[3].x, face.pts[3].y);
					ctx.closePath();
					ctx.fill();
				}

				ctx.globalAlpha = 1;
				if (topCtx) {
					const fillPolygons = topScreenPolygons.concat(jointCapScreenPolygons);
					let minX = Infinity;
					let minY = Infinity;
					let maxX = -Infinity;
					let maxY = -Infinity;
					if (fillPolygons.length) {
						for (const polygon of fillPolygons) {
							for (const pt of polygon) {
								if (pt.x < minX) minX = pt.x;
								if (pt.x > maxX) maxX = pt.x;
								if (pt.y < minY) minY = pt.y;
								if (pt.y > maxY) maxY = pt.y;
							}
						}
						const pad = 3;
						topCtx.save();
						topCtx.clip(topScreenPath);
						topCtx.fillStyle = useVoltageColours ? "rgba(244, 247, 250, 0.32)" : "rgba(255, 255, 255, 1)";
						topCtx.fillRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);

						topCtx.globalAlpha = useVoltageColours ? 0.88 : 1;
						if (useVoltageColours) {
							for (const fill of topSegmentFills) {
								const grad = topCtx.createLinearGradient(fill.start.x, fill.start.y, fill.end.x, fill.end.y);
								grad.addColorStop(0, fill.color1);
								grad.addColorStop(1, fill.color2);
								topCtx.fillStyle = grad;
								topCtx.beginPath();
								topCtx.moveTo(fill.polygon[0].x, fill.polygon[0].y);
								for (let i = 1; i < fill.polygon.length; i++) {
									topCtx.lineTo(fill.polygon[i].x, fill.polygon[i].y);
								}
								topCtx.closePath();
								topCtx.fill();
							}
						} else {
							for (const fill of topSegmentFills) {
								const grad = topCtx.createLinearGradient(fill.start.x, fill.start.y, fill.end.x, fill.end.y);
								grad.addColorStop(0, fill.color1);
								grad.addColorStop(1, fill.color2);
								topCtx.fillStyle = grad;
								topCtx.beginPath();
								topCtx.moveTo(fill.polygon[0].x, fill.polygon[0].y);
								for (let i = 1; i < fill.polygon.length; i++) {
									topCtx.lineTo(fill.polygon[i].x, fill.polygon[i].y);
								}
								topCtx.closePath();
								topCtx.fill();
								topCtx.strokeStyle = "rgba(64, 76, 96, 0.72)";
								topCtx.lineWidth = 1.8;
								topCtx.beginPath();
								topCtx.moveTo(fill.leftEdge[0].x, fill.leftEdge[0].y);
								for (let i = 1; i < fill.leftEdge.length; i++) {
									topCtx.lineTo(fill.leftEdge[i].x, fill.leftEdge[i].y);
								}
								topCtx.moveTo(fill.rightEdge[0].x, fill.rightEdge[0].y);
								for (let i = 1; i < fill.rightEdge.length; i++) {
									topCtx.lineTo(fill.rightEdge[i].x, fill.rightEdge[i].y);
								}
								topCtx.stroke();
							}
						}

						topCtx.globalAlpha = useVoltageColours ? 0.88 : 1;
						for (const fill of topJointFills) {
							topCtx.fillStyle = useVoltageColours ? fill.color : "#ffffff";
							topCtx.beginPath();
							topCtx.moveTo(fill.polygon[0].x, fill.polygon[0].y);
							for (let i = 1; i < fill.polygon.length; i++) {
								topCtx.lineTo(fill.polygon[i].x, fill.polygon[i].y);
							}
							topCtx.closePath();
							topCtx.fill();
							if (!useVoltageColours) {
								topCtx.strokeStyle = "rgba(64, 76, 96, 0.72)";
								topCtx.lineWidth = 1.8;
								topCtx.beginPath();
								if (!fill.touchesUp) {
									topCtx.moveTo(fill.polygon[0].x, fill.polygon[0].y);
									topCtx.lineTo(fill.polygon[1].x, fill.polygon[1].y);
								}
								if (!fill.touchesRight) {
									topCtx.moveTo(fill.polygon[1].x, fill.polygon[1].y);
									topCtx.lineTo(fill.polygon[2].x, fill.polygon[2].y);
								}
								if (!fill.touchesDown) {
									topCtx.moveTo(fill.polygon[2].x, fill.polygon[2].y);
									topCtx.lineTo(fill.polygon[3].x, fill.polygon[3].y);
								}
								if (!fill.touchesLeft) {
									topCtx.moveTo(fill.polygon[3].x, fill.polygon[3].y);
									topCtx.lineTo(fill.polygon[0].x, fill.polygon[0].y);
								}
								topCtx.stroke();
							}
						}

						if (useStepwiseShortRouteSurface) {
							topCtx.save();
							topCtx.clip(topSegmentScreenPath);
							const routeShade = topCtx.createLinearGradient(minX, minY, maxX, maxY);
							if (useVoltageColours) {
								routeShade.addColorStop(0.00, "rgba(255, 255, 255, 0.16)");
								routeShade.addColorStop(0.35, "rgba(255, 255, 255, 0.04)");
								routeShade.addColorStop(0.68, "rgba(0, 0, 0, 0.04)");
								routeShade.addColorStop(1.00, "rgba(0, 0, 0, 0.12)");
							} else {
								routeShade.addColorStop(0.00, "rgb(252, 252, 252)");
								routeShade.addColorStop(0.45, "rgb(246, 246, 246)");
								routeShade.addColorStop(0.80, "rgb(231, 231, 231)");
								routeShade.addColorStop(1.00, "rgb(218, 218, 218)");
							}
							topCtx.fillStyle = routeShade;
							topCtx.fillRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
							if (useVoltageColours) {
								const routeSheen = topCtx.createLinearGradient(minX, minY + (maxY - minY) * 0.15, maxX, minY + (maxY - minY) * 0.45);
								routeSheen.addColorStop(0.00, "rgba(255, 255, 255, 0.10)");
								routeSheen.addColorStop(0.45, "rgba(255, 255, 255, 0.03)");
								routeSheen.addColorStop(1.00, "rgba(255, 255, 255, 0.00)");
								topCtx.fillStyle = routeSheen;
								topCtx.fillRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
							}
							topCtx.restore();
						}

						if (!useStepwiseShortRouteSurface) {
							topCtx.globalAlpha = 1;
							const sharedShade = topCtx.createLinearGradient(minX, minY, maxX, maxY);
							if (useVoltageColours) {
								sharedShade.addColorStop(0.00, "rgba(255, 255, 255, 0.16)");
								sharedShade.addColorStop(0.35, "rgba(255, 255, 255, 0.04)");
								sharedShade.addColorStop(0.68, "rgba(0, 0, 0, 0.04)");
								sharedShade.addColorStop(1.00, "rgba(0, 0, 0, 0.12)");
							} else {
								sharedShade.addColorStop(0.00, "rgb(252, 252, 252)");
								sharedShade.addColorStop(0.45, "rgb(246, 246, 246)");
								sharedShade.addColorStop(0.80, "rgb(231, 231, 231)");
								sharedShade.addColorStop(1.00, "rgb(218, 218, 218)");
							}
							topCtx.fillStyle = sharedShade;
							topCtx.fillRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);

							if (useVoltageColours) {
								const sheen = topCtx.createLinearGradient(minX, minY + (maxY - minY) * 0.15, maxX, minY + (maxY - minY) * 0.45);
								sheen.addColorStop(0.00, "rgba(255, 255, 255, 0.10)");
								sheen.addColorStop(0.45, "rgba(255, 255, 255, 0.03)");
								sheen.addColorStop(1.00, "rgba(255, 255, 255, 0.00)");
								topCtx.fillStyle = sheen;
								topCtx.fillRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
							}
						}

						topCtx.globalAlpha = 1;
						topCtx.restore();
					}
					const graphBoundsDpr = (window.devicePixelRatio || 1);
					const screenBounds = Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)
						? {
							left: minX / graphBoundsDpr,
							top: minY / graphBoundsDpr,
							right: maxX / graphBoundsDpr,
							bottom: maxY / graphBoundsDpr
						}
						: null;
					// Compute logical-space bounding box from project() output for reliable hit testing.
					// These coordinates match pointerPos() logical space (view-transform-independent).
					let logMinX = Infinity, logMaxX = -Infinity;
					let logMinY = Infinity, logMaxY = -Infinity;
					for (const mesh of segmentMeshes) {
						for (const pt of [mesh.leftA, mesh.rightA, mesh.leftB, mesh.rightB]) {
							if (pt.x < logMinX) logMinX = pt.x;
							if (pt.x > logMaxX) logMaxX = pt.x;
							if (pt.y < logMinY) logMinY = pt.y;
							if (pt.y > logMaxY) logMaxY = pt.y;
						}
					}
					const GRAPH_HIT_PAD = 24;
					const logicalBounds = Number.isFinite(logMinX) ? {
						left: logMinX - GRAPH_HIT_PAD,
						right: logMaxX + GRAPH_HIT_PAD,
						top: logMinY - GRAPH_HIT_PAD,
						bottom: logMaxY + GRAPH_HIT_PAD
					} : null;
					state.graphTrackGeometry = {
						screenPath: topScreenPath,
						topScreenPolygons,
						topWorldPolygons,
						jointCapScreenPolygons,
						jointCapWorldPolygons,
						screenBounds,
						logicalBounds,
						pathHalfWidth: GRAPH_PATH_HALF_WIDTH,
						projection: {
							azimuth: state.graphAzimuth,
							elevation: state.graphElevation,
							roll: state.graphRoll,
							zoom: state.graphZoom,
							panX: state.graphPanX,
							panY: state.graphPanY
						}
					};
					ctx.save();
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.globalAlpha = useVoltageColours ? 0.68 : 1;
					ctx.drawImage(topLayer, 0, 0);
					ctx.restore();
				}


				if (state.debugLabels) {
					ctx.fillStyle = "rgba(24, 37, 56, 0.88)";
					ctx.font = "600 9px system-ui, sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					for (const mesh of segmentMeshes) {
						const cx = (mesh.leftA.x + mesh.rightA.x + mesh.leftB.x + mesh.rightB.x) * 0.25;
						const cy = (mesh.leftA.y + mesh.rightA.y + mesh.leftB.y + mesh.rightB.y) * 0.25;
						const prefix = mesh.role === "component-main" ? "C" : "W";
						ctx.fillText(prefix + (mesh.segIndex + 1), cx, cy);
					}
				}

				ctx.restore();
			}

			class CircuitSceneRenderer {
				voltageToColor(v) {
					const displayV = graphDisplayVoltage(v);
					const scale = state.graphColorScale || { displayMin: 0, displayMax: 1, maxAbs: 1 };
					const maxAbs = Math.max(1e-6,
						Number.isFinite(scale.maxAbs) ? scale.maxAbs : 1,
						Math.abs(Number.isFinite(scale.displayMin) ? scale.displayMin : 0),
						Math.abs(Number.isFinite(scale.displayMax) ? scale.displayMax : 1));
					const signed = clamp(displayV / maxAbs, -1, 1);
					const hue = 60 + 60 * signed;
					return `hsl(${hue}, 85%, 42%)`;
				}

				drawWireSegment(x1, y1, x2, y2, v1, v2, varLabel) {
					wireLabelCounter2D += 1;
					ctx.save();
					ctx.lineCap = "round";
					ctx.lineJoin = "round";
					if (state.voltageColorMode && Number.isFinite(v1) && Number.isFinite(v2)) {
						const grad = ctx.createLinearGradient(x1, y1, x2, y2);
						grad.addColorStop(0, this.voltageToColor(v1));
						grad.addColorStop(1, this.voltageToColor(v2));
						ctx.strokeStyle = grad;
					} else {
						ctx.strokeStyle = "#111";
					}
					ctx.lineWidth = 5;
					ctx.beginPath();
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.stroke();
					enqueueWireResistanceSegment(x1, y1, x2, y2, "wire");
					ctx.restore();
				}

				drawCanvasSlider(paramKey, value, opts) {
					const trackX = opts.trackX;
					const trackTop = opts.trackTop;
					const trackBottom = opts.trackBottom;
					const min = opts.min;
					const max = opts.max;
					const step = opts.step;
					const showValueTop = !!opts.showValueTop;
					const valueSuffix = opts.valueSuffix || "\u03a9";
					const span = Math.max(0.001, max - min);
					const sphereY = trackTop + ((max - value) / span) * (trackBottom - trackTop);

					const hit = sliderHitAreas.find((s) => s.paramKey === paramKey);
					const rec = { paramKey, trackX, trackTop, trackBottom, sphereY, min, max, step };
					if (hit) {
						Object.assign(hit, rec);
					} else {
						sliderHitAreas.push(rec);
					}

					const isDragging = sliderDragState.active && sliderDragState.paramKey === paramKey;
					ctx.save();
					ctx.lineCap = "round";
					ctx.strokeStyle = "rgba(80,100,130,0.35)";
					ctx.lineWidth = 4;
					ctx.beginPath();
					ctx.moveTo(trackX, trackTop);
					ctx.lineTo(trackX, trackBottom);
					ctx.stroke();

					const sr = 6;
					const grad = ctx.createRadialGradient(trackX - 2, sphereY - 2, 1, trackX, sphereY, sr);
					grad.addColorStop(0, isDragging ? "#d0eaff" : "#c8d8ea");
					grad.addColorStop(1, isDragging ? "#1a50a0" : "#3a5a7a");
					ctx.beginPath();
					ctx.arc(trackX, sphereY, sr, 0, Math.PI * 2);
					ctx.fillStyle = grad;
					ctx.fill();
					ctx.strokeStyle = isDragging ? "#0a3080" : "#253d55";
					ctx.lineWidth = 1.5;
					ctx.stroke();
					if (showValueTop) {
						ctx.fillStyle = "#2d5a8e";
						ctx.font = "600 10.5px system-ui, sans-serif";
						ctx.textAlign = "center";
						ctx.textBaseline = "top";
						ctx.fillText(value.toFixed(1) + " " + valueSuffix, trackX, trackBottom + 10);
					}
					ctx.restore();
				}

				drawCurrentArrow(x, wireTop, wireBottom, I) {
					const midY = wireBottom - 18;
					const SH = 5.33;
					const arrowX = x + 12;
					// Convention: effectiveI > 0 ? arrow DOWN; effectiveI < 0 ? arrow UP.
					// Caller pre-multiplies sol.I by sol.arrowAlignFactor before calling here.
					const arrowDir = I < 0 ? -1 : 1;
					const tipY = midY + arrowDir * SH;
					ctx.save();
					ctx.strokeStyle = "#c0392b";
					ctx.fillStyle = "#c0392b";
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(arrowX, midY - arrowDir * SH);
					ctx.lineTo(arrowX, tipY);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(arrowX, tipY + arrowDir * 2.67);
					ctx.lineTo(arrowX - 2.67, tipY - arrowDir * 1.33);
					ctx.lineTo(arrowX + 2.67, tipY - arrowDir * 1.33);
					ctx.closePath();
					ctx.fill();
					ctx.font = "600 10.5px system-ui, sans-serif";
					ctx.textAlign = "left";
					ctx.textBaseline = "middle";
					const arrowLabel = formatCurrentLabel(I, state.solved && state.solved.forceInfiniteAllCurrents === true);
					ctx.fillText(arrowLabel, arrowX + 8, midY);
					ctx.restore();
				}

				parallelArrowDisplayFactor(layout) {
					if (!layout || !Array.isArray(layout.stages)) return 1;
					for (const stage of layout.stages) {
						if (stage && Array.isArray(stage.branches) && stage.branches.length > 1) return -1;
					}
					return 1;
				}

				drawResistorBody(item, activeDrag, sol) {
					const x = activeDrag ? activeDrag.x : item.x;
					const y = activeDrag ? activeDrag.y : item.y;
					const extraCell = isExtraCell(item.id);
					const cellPolarity = getCellPolarity(item.id);
					const cellTopPlateHalf = cellPolarity > 0 ? 18 : 30;
					const cellBottomPlateHalf = cellPolarity > 0 ? 30 : 18;
					const cellSecondTopPlateHalf = cellPolarity > 0 ? 18 : 30;
					const cellSecondBottomPlateHalf = cellPolarity > 0 ? 30 : 18;
					const topV = sol && Number.isFinite(sol.Vtop) ? sol.Vtop : 0;
					const bottomV = sol && Number.isFinite(sol.Vbottom) ? sol.Vbottom : topV;
					ctx.save();
					ctx.translate(x, y);
					if (extraCell) {
						if (activeDrag) {
							ctx.fillStyle = "rgba(253,247,232,0.88)";
							ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
							ctx.strokeStyle = "#4a90e2";
							ctx.lineWidth = 3.2;
							ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillStyle = "#27374f";
							ctx.font = "700 13px system-ui, sans-serif";
							ctx.fillText(item.id, 0, 0);
						} else {
							const hasInternal = !!state.internalR;
							const localTop = item.top - item.y;
							const localBottom = item.bottom - item.y;
							const irTop = localTop;
							const irBottom = irTop + RES_H;
							const irCenterY = (irTop + irBottom) * 0.5;
							const emfTop = hasInternal ? (irBottom + CONNECTOR_WIRE * 2) : -30;
							const emfBottom = hasInternal ? (emfTop + EMF_BODY_HEIGHT) : 30;
							const emfMid = (emfTop + emfBottom) * 0.5;
							const bottomConnectorY = hasInternal ? (localBottom - CELL_PADDING) : 38;
							const emfPaddingY = hasInternal ? localBottom : (RES_H / 2);
							const topPlateVCell2 = topV + (((sol && Number.isFinite(sol.I)) ? sol.I : 0) * getCellRInternal(item.id));
							const strokeLocalVertical = (y1, y2, v1, v2) => {
								if (Math.abs(y2 - y1) < 1e-6) return;
								ctx.beginPath();
								ctx.moveTo(0, y1);
								ctx.lineTo(0, y2);
								if (state.voltageColorMode && Number.isFinite(v1) && Number.isFinite(v2)) {
									const grad = ctx.createLinearGradient(0, y1, 0, y2);
									grad.addColorStop(0, this.voltageToColor(v1));
									grad.addColorStop(1, this.voltageToColor(v2));
									ctx.strokeStyle = grad;
								} else {
									ctx.strokeStyle = "#111";
								}
								ctx.stroke();
							};

							ctx.lineWidth = 5;
							if (hasInternal) {
								strokeLocalVertical(localTop, irTop, topV, topV);
								strokeLocalVertical(irBottom, emfTop, topPlateVCell2, topPlateVCell2);
								strokeLocalVertical(emfBottom, bottomConnectorY, bottomV, bottomV);
								strokeLocalVertical(bottomConnectorY, emfPaddingY, bottomV, bottomV);
							} else {
								strokeLocalVertical(-RES_H / 2, -30, topV, topV);
								strokeLocalVertical(30, RES_H / 2, bottomV, bottomV);
							}

							if (hasInternal) {
								ctx.save();
								ctx.translate(0, irCenterY);
								ctx.fillStyle = "#ffffff";
								ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
								ctx.strokeStyle = "#111";
								ctx.lineWidth = 2.8;
								ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
								if (state.voltageColorMode) {
									ctx.lineCap = "round";
									ctx.lineWidth = 3;
									const rGrad = ctx.createLinearGradient(0, -RES_H / 2, 0, RES_H / 2);
									rGrad.addColorStop(0, this.voltageToColor(topV));
									rGrad.addColorStop(1, this.voltageToColor(topPlateVCell2));
									ctx.strokeStyle = rGrad;
									ctx.beginPath();
									ctx.moveTo(0, -RES_H / 2);
									ctx.lineTo(0, RES_H / 2);
									ctx.stroke();
								}
								ctx.fillStyle = "#27374f";
								ctx.font = "700 12px system-ui, sans-serif";
								ctx.textAlign = "center";
								ctx.textBaseline = "middle";
								ctx.fillText(internalResistanceLabel(item.id), 0, -22);
								ctx.font = "600 10.5px system-ui, sans-serif";
								ctx.fillStyle = "#334";
								if (sol) {
									ctx.fillText(Math.abs(topPlateVCell2 - topV).toFixed(2) + " V", 0, +10);
								}
								ctx.restore();

								ctx.strokeStyle = "#202833";
								ctx.lineWidth = 2;
								ctx.setLineDash([7, 5]);
								ctx.strokeRect(-72, irTop - 12, 144, localBottom - (irTop - 12));
								ctx.setLineDash([]);
							}

							const plateTop = emfTop;
							const plateSecondTop = emfMid - 10;
							const plateSecondBottom = emfMid + 10;
							const plateBottom = emfBottom;
							const cellVoltageAt = (y) => {
								const span = Math.max(1e-6, plateBottom - plateTop);
								const t = clamp((y - plateTop) / span, 0, 1);
								return topPlateVCell2 + (bottomV - topPlateVCell2) * t;
							};
							const strokeLocalPlate = (halfWidth, y) => {
								ctx.strokeStyle = state.voltageColorMode ? this.voltageToColor(cellVoltageAt(y)) : "#111";
								ctx.beginPath();
								ctx.moveTo(-halfWidth, y);
								ctx.lineTo(halfWidth, y);
								ctx.stroke();
							};
							ctx.lineWidth = 4;
							strokeLocalPlate(cellTopPlateHalf, plateTop);
							strokeLocalPlate(cellBottomPlateHalf, plateSecondTop);
							strokeLocalPlate(cellSecondTopPlateHalf, plateSecondBottom);
							strokeLocalPlate(cellSecondBottomPlateHalf, plateBottom);
							if (state.voltageColorMode) {
								ctx.lineCap = "round";
								ctx.lineWidth = 5;
								const grad = ctx.createLinearGradient(0, plateTop, 0, plateBottom);
								grad.addColorStop(0, this.voltageToColor(topPlateVCell2));
								grad.addColorStop(1, this.voltageToColor(bottomV));
								ctx.strokeStyle = grad;
								ctx.beginPath();
								ctx.moveTo(0, plateTop);
								ctx.lineTo(0, plateBottom);
								ctx.stroke();
							}
							ctx.fillStyle = "#111";
							ctx.font = "700 13px system-ui, sans-serif";
							ctx.textBaseline = "middle";
							ctx.textAlign = "left";
							ctx.fillText("-", 36, cellPolarity > 0 ? plateTop : plateBottom);
							ctx.fillText("+", 36, cellPolarity > 0 ? plateBottom : plateTop);
						}
					} else if (isBranchSwitch(item.id)) {
						const switchClosed = isComponentSwitchClosed(item.id);
						const contactTopY = -16;
						const contactBottomY = 16;
						const bladeEndX = switchClosed ? 0 : 16;
						const bladeEndY = switchClosed ? contactBottomY : (contactBottomY - 8);
						const strokeLocalVertical = (y1, y2, v1, v2) => {
							if (Math.abs(y2 - y1) < 1e-6) return;
							ctx.beginPath();
							ctx.moveTo(0, y1);
							ctx.lineTo(0, y2);
							if (state.voltageColorMode && Number.isFinite(v1) && Number.isFinite(v2)) {
								const grad = ctx.createLinearGradient(0, y1, 0, y2);
								grad.addColorStop(0, this.voltageToColor(v1));
								grad.addColorStop(1, this.voltageToColor(v2));
								ctx.strokeStyle = grad;
							} else {
								ctx.strokeStyle = "#111";
							}
							ctx.stroke();
						};
						ctx.lineCap = "round";
						ctx.lineWidth = 5;
						strokeLocalVertical(-RES_H / 2, contactTopY, topV, topV);
						strokeLocalVertical(contactBottomY, RES_H / 2, bottomV, bottomV);
						ctx.beginPath();
						ctx.arc(0, contactTopY, 3.6, 0, Math.PI * 2);
						ctx.arc(0, contactBottomY, 3.6, 0, Math.PI * 2);
						if (state.voltageColorMode) {
							const nodeGrad = ctx.createLinearGradient(0, contactTopY, 0, contactBottomY);
							nodeGrad.addColorStop(0, this.voltageToColor(topV));
							nodeGrad.addColorStop(1, this.voltageToColor(bottomV));
							ctx.fillStyle = nodeGrad;
						} else {
							ctx.fillStyle = "#111";
						}
						ctx.fill();
						ctx.beginPath();
						ctx.moveTo(0, contactTopY);
						ctx.lineTo(bladeEndX, bladeEndY);
						if (state.voltageColorMode) {
							const bladeGrad = ctx.createLinearGradient(0, contactTopY, bladeEndX, bladeEndY);
							bladeGrad.addColorStop(0, this.voltageToColor(topV));
							bladeGrad.addColorStop(1, this.voltageToColor(switchClosed ? bottomV : topV));
							ctx.strokeStyle = bladeGrad;
						} else {
							ctx.strokeStyle = "#111";
						}
						ctx.stroke();
						enqueueWireResistanceSegment(x, y + contactTopY, x + bladeEndX, y + bladeEndY, "switch-blade");
						ctx.textAlign = "right";
						ctx.textBaseline = "middle";
						ctx.fillStyle = "#27374f";
						ctx.font = activeDrag ? "700 13px system-ui, sans-serif" : "700 12px system-ui, sans-serif";
						ctx.fillText(item.id, -14, -8);
						if (!activeDrag && sol) {
							ctx.font = "600 10.5px system-ui, sans-serif";
							ctx.fillStyle = "#334";
							ctx.fillText(Math.abs(sol.V).toFixed(2) + " V", -14, 8);
						}
					} else {
						ctx.fillStyle = activeDrag ? "rgba(255, 255, 255, 0.88)" : "#ffffff";
						ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
						ctx.strokeStyle = activeDrag ? "#4a90e2" : "#111";
						ctx.lineWidth = activeDrag ? 3.2 : 2.8;
						ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
						if (state.voltageColorMode) {
							ctx.lineCap = "round";
							ctx.lineWidth = 3;
							const grad = ctx.createLinearGradient(0, -RES_H / 2, 0, RES_H / 2);
							grad.addColorStop(0, this.voltageToColor(topV));
							grad.addColorStop(1, this.voltageToColor(bottomV));
							ctx.strokeStyle = grad;
							ctx.beginPath();
							ctx.moveTo(0, -RES_H / 2);
							ctx.lineTo(0, RES_H / 2);
							ctx.stroke();
						}
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						if (activeDrag) {
							ctx.fillStyle = "#27374f";
							ctx.font = "700 13px system-ui, sans-serif";
							ctx.fillText(item.id, 0, 0);
						} else {
							ctx.fillStyle = "#27374f";
							ctx.font = "700 12px system-ui, sans-serif";
							ctx.fillText(item.id, 0, -22);
							ctx.font = "600 10.5px system-ui, sans-serif";
							ctx.fillStyle = "#334";
							if (sol) {
								ctx.fillText(Math.abs(sol.V).toFixed(2) + " V", 0, +10);
							}
						}
					}
					ctx.restore();
					if (!activeDrag && !extraCell && !isBranchSwitch(item.id)) {
						this.drawCanvasSlider(item.id, state.resistorValues[item.id] || 2.5, {
							trackX: x - 36,
							trackTop: y - RES_H / 2 + 12,
							trackBottom: y + RES_H / 2 - 6,
							min: 0.1,
							max: 10,
							step: 0.1,
							label: item.id,
							showValueTop: true
						});
					} else if (!activeDrag && extraCell) {
						const emfCenterWorldY = state.internalR
							? item.top + RES_H + CONNECTOR_WIRE * 2 + EMF_BODY_HEIGHT / 2
							: y;
						this.drawCanvasSlider(cellEmfSliderKey(item.id), getCellEmf(item.id), {
							trackX: x - 44,
							trackTop: emfCenterWorldY - RES_H / 2 + 12,
							trackBottom: emfCenterWorldY + RES_H / 2 - 6,
							min: 1,
							max: 20,
							step: 0.5,
							label: item.id + " EMF",
							showValueTop: true,
							valueSuffix: "V"
						});
						if (state.internalR) {
							this.drawCanvasSlider(cellRInternalSliderKey(item.id), getCellRInternal(item.id), {
								trackX: x - 36,
								trackTop: item.top + 12,
								trackBottom: item.top + RES_H - 6,
								min: 0.2,
								max: 5,
								step: 0.1,
								label: internalResistanceLabel(item.id),
								showValueTop: true
							});
						}
						drawPolarityHandle(cellPolarityActionKey(item.id), x + 44, emfCenterWorldY);
					}
				}

				drawGrid(w, h) {
					ctx.save();
					ctx.strokeStyle = "rgba(120, 120, 120, 0.13)";
					ctx.lineWidth = 1;
					for (let x = 0.5; x < w; x += 28) {
						ctx.beginPath();
						ctx.moveTo(x, 0);
						ctx.lineTo(x, h);
						ctx.stroke();
					}
					for (let y = 0.5; y < h; y += 28) {
						ctx.beginPath();
						ctx.moveTo(0, y);
						ctx.lineTo(w, y);
						ctx.stroke();
					}
					ctx.restore();
				}

				drawSwitch(layout) {
					const y = layout.yTop;
					const x = layout.xSwitch;
					const hasTopBoundaryParallelStage = layout.stages.length > 0
						&& Array.isArray(layout.stages[0].branches)
						&& layout.stages[0].branches.length > 1;
					const leftTopV = (state.solved && Number.isFinite(state.solved.leftTopV)) ? state.solved.leftTopV : 0;
					const leftV = (state.solved && Number.isFinite(state.solved.switchVLeft)) ? state.solved.switchVLeft : leftTopV;
					const rightV = (state.solved && Number.isFinite(state.solved.switchVRight)) ? state.solved.switchVRight : leftV;
					const networkTopV = (state.solved && state.solved.stageNodeV && Number.isFinite(state.solved.stageNodeV[0])) ? state.solved.stageNodeV[0] : rightV;
					this.drawWireSegment(layout.xCell, y, x - 16, y, leftTopV, leftV, "topBus_L");
					if (x + 16 < layout.xRight - 1e-6) {
						this.drawWireSegment(x + 16, y, layout.xRight, y, rightV, networkTopV, "topBus_R");
					}
					if (!hasTopBoundaryParallelStage && layout.xRight < layout.topBusRightX - 1e-6) {
						this.drawWireSegment(layout.xRight, y, layout.topBusRightX, y, networkTopV, networkTopV, "TOP_SPLIT_BUS");
					}
					ctx.save();
					ctx.lineWidth = 4;
					ctx.lineCap = "round";
					const mainSwitchClosed = isComponentSwitchClosed(MAIN_SWITCH_ID);
					const bladeEndY = mainSwitchClosed ? y : (y - 14);
					const bladeStartX = x - 16;
					const bladeEndX = mainSwitchClosed ? (x + 16) : (x + 14);
					const bladeEndV = mainSwitchClosed ? rightV : leftV;
					if (state.voltageColorMode) {
						const bladeGrad = ctx.createLinearGradient(bladeStartX, y, bladeEndX, bladeEndY);
						bladeGrad.addColorStop(0, this.voltageToColor(leftV));
						bladeGrad.addColorStop(1, this.voltageToColor(bladeEndV));
						ctx.strokeStyle = bladeGrad;
					} else {
						ctx.strokeStyle = "#111";
					}
					ctx.beginPath();
					ctx.moveTo(bladeStartX, y);
					ctx.lineTo(bladeEndX, bladeEndY);
					ctx.stroke();
					enqueueWireResistanceSegment(bladeStartX, y, bladeEndX, bladeEndY, "switch-blade");
					ctx.fillStyle = state.voltageColorMode ? this.voltageToColor(leftV) : "#111";
					ctx.beginPath();
					ctx.arc(x - 16, y, 4, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = state.voltageColorMode ? this.voltageToColor(rightV) : "#111";
					ctx.beginPath();
					ctx.arc(x + 16, y, 4, 0, Math.PI * 2);
					ctx.fill();
					ctx.restore();
				}

				drawBottomWire(layout) {
					const leftBottomV = (state.solved && Number.isFinite(state.solved.Vext)) ? state.solved.Vext : 0;
					const rightBottomV = (state.solved && Number.isFinite(state.solved.bottomRightV)) ? state.solved.bottomRightV : leftBottomV;
					const gradientStopX = Math.min(layout.bottomBusRightX, layout.xRight);
					if (layout.xCell < gradientStopX - 1e-6) {
						this.drawWireSegment(layout.xCell, layout.yBottom, gradientStopX, layout.yBottom, leftBottomV, rightBottomV, "bottomBus");
					}
					if (gradientStopX < layout.xRight - 1e-6) {
						this.drawWireSegment(gradientStopX, layout.yBottom, layout.xRight, layout.yBottom, rightBottomV, rightBottomV, "BOTTOM_SPLIT_BUS");
					}
					if (layout.xRight < layout.bottomBusRightX - 1e-6) {
						this.drawWireSegment(layout.xRight, layout.yBottom, layout.bottomBusRightX, layout.yBottom, rightBottomV, rightBottomV, "BOTTOM_MERGE_BUS");
					}
				}

				drawLeftRail(layout) {
					const solved = state.solved || {};
					const x = layout.xCell;
					let runY = layout.yTop;
					let runV = Number.isFinite(solved.leftTopV) ? solved.leftTopV : 0;
					const items = layout.leftSeriesItems || [];
					for (const item of items) {
						if (runY < item.top - 1e-6) {
							const connectorStartY = Math.max(runY, item.top - CONNECTOR_WIRE);
							const sol = solved.byId && solved.byId[item.id];
							const itemTopV = sol && Number.isFinite(sol.Vtop) ? sol.Vtop : runV;
							if (runY < connectorStartY - 1e-6) {
								const label = runY <= layout.yTop + 1e-6 ? "END_BUS_CONNECTOR" : "CONNECTOR_WIRE";
								const midV = connectorStartY < item.top - 1e-6 ? itemTopV : runV;
								this.drawWireSegment(x, runY, x, connectorStartY, runV, midV, label);
								this.drawDebugWireMeasurement(x, runY, connectorStartY, label);
								runV = midV;
							}
							this.drawWireSegment(x, connectorStartY, x, item.top, runV, itemTopV, "CONNECTOR_WIRE");
							this.drawDebugWireMeasurement(x, connectorStartY, item.top, "CONNECTOR_WIRE");
						}
						const sol = solved.byId && solved.byId[item.id];
						this.drawResistorBody(item, state.drag && state.drag.id === item.id ? state.drag : null, sol);
						if (sol && Number.isFinite(sol.Vbottom)) {
							runV = sol.Vbottom;
						}
						runY = item.bottom;
					}
					const bottomV = Number.isFinite(solved.Vext) ? solved.Vext : runV;
					if (runY < layout.yBottom - 1e-6) {
						const connectorEndY = Math.min(layout.yBottom, runY + CONNECTOR_WIRE);
						const totalTailLen = layout.yBottom - runY;
						const connectorFrac = (connectorEndY - runY) / totalTailLen;
						const midV = runV + (bottomV - runV) * connectorFrac;
						this.drawWireSegment(x, runY, x, connectorEndY, runV, midV, "CONNECTOR_WIRE");
						this.drawDebugWireMeasurement(x, runY, connectorEndY, "CONNECTOR_WIRE");
						if (connectorEndY < layout.yBottom - 1e-6) {
							this.drawWireSegment(x, connectorEndY, x, layout.yBottom, midV, bottomV, "END_BUS_CONNECTOR");
							this.drawDebugWireMeasurement(x, connectorEndY, layout.yBottom, "END_BUS_CONNECTOR");
						}
					}
				}

				drawBottomWireCurrentArrow(layout) {
					const y = layout.yBottom;
					const xMin = layout.xCell + 28;
					const xMax = layout.xRight - 28;
					const midX = clamp(layout.xSwitch, xMin, xMax);
					const arrowY = y + 12;
					const halfLen = 5.33;
					const current = Number.isFinite(state.solved?.Itotal) ? state.solved.Itotal : 0;
					const shortAdjustedInfinite = !!(state.solved && state.solved.shortAdjustedFromIdeal === true
						&& Array.isArray(state.solved.idealShortSwitchSectionIds)
						&& state.solved.idealShortSwitchSectionIds.length > 0);
					const displayCurrent = shortAdjustedInfinite
						? (current < 0 ? -Infinity : Infinity)
						: ((state.solved && isInfiniteCurrentValue(state.solved.Itotal)) ? state.solved.Itotal : current);
					const leftBottomV = Number.isFinite(state.solved?.Vext) ? state.solved.Vext : NaN;
					const rightBottomV = Number.isFinite(state.solved?.bottomRightV) ? state.solved.bottomRightV : NaN;
					let directionCurrent = displayCurrent;
					if (Number.isFinite(leftBottomV) && Number.isFinite(rightBottomV)) {
						const dv = rightBottomV - leftBottomV;
						if (Math.abs(dv) > 1e-12) {
							const signFromBottomSegment = -Math.sign(dv);
							const mag = (Number.isFinite(displayCurrent) || isInfiniteCurrentValue(displayCurrent))
								? Math.abs(displayCurrent)
								: 1;
							directionCurrent = signFromBottomSegment >= 0 ? mag : -mag;
						}
					}
					const dir = directionCurrent < 0 ? -1 : 1;
					const shaftStartX = midX - dir * halfLen;
					const shaftTipX = midX + dir * halfLen;
					const headLen = 2.67;
					ctx.save();
					ctx.strokeStyle = "#c0392b";
					ctx.fillStyle = "#c0392b";
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(shaftStartX, arrowY);
					ctx.lineTo(shaftTipX, arrowY);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(shaftTipX + dir * headLen, arrowY);
					ctx.lineTo(shaftTipX - dir * 1.33, arrowY - 2.67);
					ctx.lineTo(shaftTipX - dir * 1.33, arrowY + 2.67);
					ctx.closePath();
					ctx.fill();
					ctx.font = "600 10.5px system-ui, sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "top";
					const bottomArrowLabel = formatCurrentLabel(displayCurrent, state.solved && state.solved.forceInfiniteAllCurrents === true);
					ctx.fillText(bottomArrowLabel, midX, arrowY + 10);
					ctx.restore();
				}

				drawCell(layout) {
					const x = layout.xCell;
					const topNodeV = (state.solved && Number.isFinite(state.solved.leftTopV)) ? state.solved.leftTopV : 0;
					const topPlateV = (state.solved && Number.isFinite(state.solved.cellTopPlateV)) ? state.solved.cellTopPlateV : topNodeV;
					const bottomNodeV = (state.solved && Number.isFinite(state.solved.Vext)) ? state.solved.Vext : 0;
					const bottomPlateV = (state.solved && Number.isFinite(state.solved.cellBottomPlateV)) ? state.solved.cellBottomPlateV : bottomNodeV;
					const totalLeftCellHeight = state.internalR
						? (RES_H + EMF_BODY_HEIGHT + CONNECTOR_WIRE * 4 + CELL_PADDING)
						: (EMF_BODY_HEIGHT + CONNECTOR_WIRE * 2);
					const leftSeriesPathHeight = state.leftSeries.reduce((sum, id) => sum + componentBodyHeight(id) + CONNECTOR_WIRE * 2, 0);
					const totalLeftComponentHeight = totalLeftCellHeight + leftSeriesPathHeight;
					const leftExtra = Math.max(0, (layout.yBottom - layout.yTop) - (totalLeftComponentHeight + END_BUS_CONNECTOR * 2));
					const topEndLead = END_BUS_CONNECTOR + leftExtra * 0.5;
					const componentStartY = Number.isFinite(layout.leftCellStartY) ? layout.leftCellStartY : (layout.yTop + topEndLead + leftSeriesPathHeight);
					const irTop = componentStartY + CONNECTOR_WIRE;
					const irBottom = irTop + RES_H;
					const emfTop = state.internalR ? (irBottom + CONNECTOR_WIRE * 2) : (componentStartY + CONNECTOR_WIRE);
					const emfBottom = emfTop + EMF_BODY_HEIGHT;
					const emfConnectorBottomY = emfBottom + CONNECTOR_WIRE;
					const emfPaddingBottomY = emfConnectorBottomY + (state.internalR ? CELL_PADDING : 0);
					const cellMid = (emfTop + emfBottom) * 0.5;
					const emfSliderX = x - 44;
					const topPlateY = emfTop;
					const bottomPlateY = cellMid - 10;
					const secondTopPlateY = cellMid + 10;
					const secondBottomPlateY = emfBottom;
					const primaryCellPolarity = getCellPolarity(PRIMARY_CELL_ID);
					const primaryTopPlateHalf = primaryCellPolarity > 0 ? 18 : 30;
					const primaryBottomPlateHalf = primaryCellPolarity > 0 ? 30 : 18;
					const primarySecondTopPlateHalf = primaryCellPolarity > 0 ? 18 : 30;
					const primarySecondBottomPlateHalf = primaryCellPolarity > 0 ? 30 : 18;
					const irCenterY = state.internalR ? (irTop + RES_H * 0.5) : componentStartY;
					const irH = RES_H;
					let leftBranchY = layout.yTop;
					let leftBranchV = topNodeV;
					for (const item of (layout.leftSeriesItems || [])) {
						const leftSol = state.solved && state.solved.byId[item.id];
						const itemTopV = leftSol && Number.isFinite(leftSol.Vtop) ? leftSol.Vtop : leftBranchV;
						this.drawWireSegment(x, leftBranchY, x, item.top, leftBranchV, itemTopV, item.top - leftBranchY > CONNECTOR_WIRE + 1 ? "END_BUS_CONNECTOR" : "CONNECTOR_WIRE");
						this.drawResistorBody(item, state.drag && state.drag.id === item.id ? state.drag : null, leftSol);
						if (leftSol && Number.isFinite(leftSol.Vbottom)) {
							leftBranchV = leftSol.Vbottom;
						}
						leftBranchY = item.bottom;
					}
					if (leftBranchY < componentStartY - 1e-6) {
						this.drawWireSegment(x, leftBranchY, x, componentStartY, leftBranchV, leftBranchV, "CONNECTOR_WIRE");
					}
					if (state.internalR) {
						this.drawWireSegment(x, componentStartY, x, irTop, leftBranchV, leftBranchV, "CONNECTOR_WIRE");
						this.drawWireSegment(x, irBottom, x, irBottom + CONNECTOR_WIRE, topPlateV, topPlateV, "CONNECTOR_WIRE");
						this.drawWireSegment(x, irBottom + CONNECTOR_WIRE, x, topPlateY, topPlateV, topPlateV, "CONNECTOR_WIRE");
					} else {
						this.drawWireSegment(x, componentStartY, x, topPlateY, leftBranchV, topPlateV, "CONNECTOR_WIRE");
					}
					this.drawWireSegment(x, secondBottomPlateY, x, emfConnectorBottomY, bottomPlateV, bottomNodeV, "CONNECTOR_WIRE");
					if (state.internalR) {
						this.drawWireSegment(x, emfConnectorBottomY, x, emfPaddingBottomY, bottomNodeV, bottomNodeV, "CELL_PADDING");
					}
					this.drawWireSegment(x, emfPaddingBottomY, x, layout.yBottom, bottomNodeV, bottomNodeV, "END_BUS_CONNECTOR");
					const cellVoltageAt = (y) => {
						const span = Math.max(1e-6, secondBottomPlateY - topPlateY);
						const t = clamp((y - topPlateY) / span, 0, 1);
						return topPlateV + (bottomPlateV - topPlateV) * t;
					};
					const strokePrimaryCellPlate = (halfWidth, y) => {
						ctx.strokeStyle = state.voltageColorMode ? this.voltageToColor(cellVoltageAt(y)) : "#111";
						ctx.beginPath();
						ctx.moveTo(x - halfWidth, y);
						ctx.lineTo(x + halfWidth, y);
						ctx.stroke();
					};
					ctx.save();
					ctx.lineWidth = 4;
					strokePrimaryCellPlate(primaryTopPlateHalf, topPlateY);
					strokePrimaryCellPlate(primaryBottomPlateHalf, bottomPlateY);
					strokePrimaryCellPlate(primarySecondTopPlateHalf, secondTopPlateY);
					strokePrimaryCellPlate(primarySecondBottomPlateHalf, secondBottomPlateY);
					if (state.voltageColorMode) {
						ctx.lineCap = "round";
						ctx.lineWidth = 3;
						const battGrad = ctx.createLinearGradient(x, topPlateY, x, secondBottomPlateY);
						battGrad.addColorStop(0, this.voltageToColor(topPlateV));
						battGrad.addColorStop(1, this.voltageToColor(bottomPlateV));
						ctx.strokeStyle = battGrad;
						ctx.beginPath();
						ctx.moveTo(x, topPlateY);
						ctx.lineTo(x, secondBottomPlateY);
						ctx.stroke();
					}
					ctx.fillStyle = "#111";
					ctx.font = "700 13px system-ui, sans-serif";
					ctx.textBaseline = "middle";
					ctx.textAlign = "left";
					ctx.fillText("-", x + 36, primaryCellPolarity > 0 ? topPlateY : secondBottomPlateY);
					ctx.fillText("+", x + 36, primaryCellPolarity > 0 ? secondBottomPlateY : topPlateY);
					ctx.font = "600 11px system-ui, sans-serif";
					ctx.fillStyle = "#2d5a8e";
					ctx.textAlign = "right";
					if (state.internalR) {
						const boxHalfWidth = 72;
						const boxLeft = x - boxHalfWidth;
						const boxRight = x + boxHalfWidth;
						const boxTop = irCenterY - irH / 2 - 12;
						const boxBottom = secondBottomPlateY + 30;
						ctx.strokeStyle = "#202833";
						ctx.lineWidth = 2;
						ctx.setLineDash([7, 5]);
						ctx.strokeRect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop);
						ctx.setLineDash([]);

						ctx.save();
						ctx.translate(x, irCenterY);
						ctx.fillStyle = "#ffffff";
						ctx.fillRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
						ctx.strokeStyle = "#111";
						ctx.lineWidth = 2.8;
						ctx.strokeRect(-RES_W / 2, -RES_H / 2, RES_W, RES_H);
						if (state.voltageColorMode) {
							ctx.lineCap = "round";
							ctx.lineWidth = 3;
							const grad = ctx.createLinearGradient(0, -RES_H / 2, 0, RES_H / 2);
							grad.addColorStop(0, this.voltageToColor(topNodeV));
							grad.addColorStop(1, this.voltageToColor(topPlateV));
							ctx.strokeStyle = grad;
							ctx.beginPath();
							ctx.moveTo(0, -RES_H / 2);
							ctx.lineTo(0, RES_H / 2);
							ctx.stroke();
						}
						ctx.fillStyle = "#27374f";
						ctx.font = "700 12px system-ui, sans-serif";
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(internalResistanceLabel(PRIMARY_CELL_ID), 0, -22);
						ctx.font = "600 10.5px system-ui, sans-serif";
						ctx.fillStyle = "#334";
						if (state.solved) {
							ctx.fillText(Math.abs(state.solved.Itotal * getCellRInternal(PRIMARY_CELL_ID)).toFixed(2) + " V", 0, +10);
						}
						ctx.restore();
					}
					ctx.restore();
					this.drawCanvasSlider(cellEmfSliderKey(PRIMARY_CELL_ID), getCellEmf(PRIMARY_CELL_ID), {
						trackX: emfSliderX,
						trackTop: cellMid - RES_H / 2 + 12,
						trackBottom: cellMid + RES_H / 2 - 6,
						min: 1,
						max: 20,
						step: 0.5,
						label: PRIMARY_CELL_ID + " EMF",
						showValueTop: true,
						valueSuffix: "V"
					});
					drawPolarityHandle(cellPolarityActionKey(PRIMARY_CELL_ID), x + 44, cellMid);
					if (state.internalR) {
						this.drawCanvasSlider(cellRInternalSliderKey(PRIMARY_CELL_ID), getCellRInternal(PRIMARY_CELL_ID), {
							trackX: x - 36,
							trackTop: irCenterY - RES_H / 2 + 12,
							trackBottom: irCenterY + RES_H / 2 - 6,
							min: 0.2,
							max: 5,
							step: 0.1,
							label: internalResistanceLabel(PRIMARY_CELL_ID),
							showValueTop: true
						});
					}
				}

				drawDebugWireMeasurement(x, y1, y2, label) {
					if (!state.debugLabels) return;
					const dist = Math.abs(y2 - y1);
					const midY = (y1 + y2) * 0.5;
					ctx.save();
					ctx.fillStyle = "rgba(100, 120, 150, 0.85)";
					ctx.font = "500 8px monospace";
					ctx.textAlign = "right";
					ctx.textBaseline = "middle";
					ctx.fillText(dist.toFixed(1) + (label ? " " + label : ""), x - 8, midY);
					ctx.restore();
				}

				drawNetwork(layout) {
					const nodeV = (state.solved && state.solved.stageNodeV) || [0];
					if (layout.stages.length === 0) {
						const topV = nodeV[0] || 0;
						const bottomV = Number.isFinite(state.solved.Vext) ? state.solved.Vext : topV;
						this.drawWireSegment(layout.xRight, layout.yTop, layout.xRight, layout.yBottom, topV, bottomV, "rightRail");
						return;
					}

					let currentY = layout.yTop;
					for (const stage of layout.stages) {
						const stageTopV = Number.isFinite(nodeV[stage.index]) ? nodeV[stage.index] : 0;
						const stageBottomV = Number.isFinite(nodeV[stage.index + 1]) ? nodeV[stage.index + 1] : stageTopV;
						const isParallel = stage.branches.length > 1;
						const isTopBoundaryStage = stage.index === 0;
						const isBottomBoundaryStage = stage.index === layout.stages.length - 1;
						const hasMergeBusAbove = stage.index > 0 && layout.stages[stage.index - 1].branches.length > 1;
						const hasSplitBusBelow = stage.index < layout.stages.length - 1 && layout.stages[stage.index + 1].branches.length > 1;
						const stageEntryTop = isTopBoundaryStage ? layout.yTop : stage.junctionTop;
						const stageExitBottom = isBottomBoundaryStage ? layout.yBottom : stage.junctionBottom;
						if (currentY < stageEntryTop - 1e-6) {
							const label = isTopBoundaryStage ? "END_BUS_CONNECTOR" : "CONNECTOR_WIRE";
							this.drawWireSegment(layout.xRight, currentY, layout.xRight, stageEntryTop, stageTopV, stageTopV, label);
							this.drawDebugWireMeasurement(layout.xRight, currentY, stageEntryTop, label);
						}
						if (isParallel) {
							const topBusLabel = isTopBoundaryStage ? "TOP_SPLIT_BUS" : "SPLIT_BUS";
							const topBusPoints = [{ x: layout.xRight, v: stageTopV }];
							for (const b of stage.branches) {
								topBusPoints.push({ x: b.x, v: stageTopV });
							}
							topBusPoints.sort((a, b) => a.x - b.x);
							for (let i = 0; i < topBusPoints.length - 1; i++) {
								this.drawWireSegment(topBusPoints[i].x, stageEntryTop, topBusPoints[i + 1].x, stageEntryTop, topBusPoints[i].v, topBusPoints[i + 1].v, topBusLabel);
							}

							const bottomBusLabel = isBottomBoundaryStage ? "BOTTOM_SPLIT_BUS" : "MERGE_BUS";
							const bottomBusPoints = [{ x: layout.xRight, v: stageBottomV }];
							for (const b of stage.branches) {
								bottomBusPoints.push({ x: b.x, v: stageBottomV });
							}
							bottomBusPoints.sort((a, b) => a.x - b.x);
							for (let i = 0; i < bottomBusPoints.length - 1; i++) {
								this.drawWireSegment(bottomBusPoints[i].x, stageExitBottom, bottomBusPoints[i + 1].x, stageExitBottom, bottomBusPoints[i].v, bottomBusPoints[i + 1].v, bottomBusLabel);
							}
						}
						for (const branch of stage.branches) {
							const branchX = branch.x;
							let branchY = stageEntryTop;
							let branchV = stageTopV;
							for (const item of branch.items) {
								const sol = state.solved && state.solved.byId ? state.solved.byId[item.id] : null;
								const itemTopV = (sol && Number.isFinite(sol.Vtop)) ? sol.Vtop : branchV;
								if ((isParallel || hasMergeBusAbove) && !isTopBoundaryStage) {
									const splitY = branchY + BUS_CONNECTOR;
									const totalLen = Math.max(1e-6, item.top - branchY);
									const splitFrac = Math.max(0, Math.min(1, (splitY - branchY) / totalLen));
									const splitV = branchV + (itemTopV - branchV) * splitFrac;
									this.drawWireSegment(branchX, branchY, branchX, splitY, branchV, splitV, "BUS_CONNECTOR");
									this.drawWireSegment(branchX, splitY, branchX, item.top, splitV, itemTopV, "CONNECTOR_WIRE");
									this.drawDebugWireMeasurement(branchX, branchY, branchY + BUS_CONNECTOR, "BUS_CONNECTOR");
									this.drawDebugWireMeasurement(branchX, branchY + BUS_CONNECTOR, item.top, "CONNECTOR_WIRE");
								} else if (isTopBoundaryStage) {
									const connectorStartY = Math.max(branchY, item.top - CONNECTOR_WIRE);
									const totalLen = Math.max(1e-6, item.top - branchY);
									const splitFrac = Math.max(0, Math.min(1, (connectorStartY - branchY) / totalLen));
									const splitV = branchV + (itemTopV - branchV) * splitFrac;
									this.drawWireSegment(branchX, branchY, branchX, connectorStartY, branchV, splitV, "END_BUS_CONNECTOR");
									this.drawWireSegment(branchX, connectorStartY, branchX, item.top, splitV, itemTopV, "CONNECTOR_WIRE");
									this.drawDebugWireMeasurement(branchX, branchY, connectorStartY, "END_BUS_CONNECTOR");
									this.drawDebugWireMeasurement(branchX, connectorStartY, item.top, "CONNECTOR_WIRE");
								} else {
									this.drawWireSegment(branchX, branchY, branchX, item.top, branchV, itemTopV, "CONNECTOR_WIRE");
									this.drawDebugWireMeasurement(branchX, branchY, item.top, "CONNECTOR_WIRE");
								}
								
								if (sol && (item.top - branchY) > 8) {
									this.drawCurrentArrow(branchX, branchY, item.top, sol.I * (sol.arrowAlignFactor ?? 1));
								}
								this.drawResistorBody(item, state.drag && state.drag.id === item.id ? state.drag : null, sol);
								if (sol && Number.isFinite(sol.Vbottom)) {
									branchV = sol.Vbottom;
								}
								branchY = item.bottom;
							}
							if (isParallel && !isBottomBoundaryStage) {
								this.drawWireSegment(branchX, branchY, branchX, stageExitBottom - BUS_CONNECTOR, branchV, stageBottomV, "CONNECTOR_WIRE");
								this.drawWireSegment(branchX, stageExitBottom - BUS_CONNECTOR, branchX, stageExitBottom, stageBottomV, stageBottomV, "BUS_CONNECTOR");
								this.drawDebugWireMeasurement(branchX, branchY, stageExitBottom - BUS_CONNECTOR, "CONNECTOR_WIRE");
								this.drawDebugWireMeasurement(branchX, stageExitBottom - BUS_CONNECTOR, stageExitBottom, "BUS_CONNECTOR");
							} else if (isBottomBoundaryStage) {
								const connectorEndY = Math.min(stageExitBottom, branchY + CONNECTOR_WIRE);
								this.drawWireSegment(branchX, branchY, branchX, connectorEndY, branchV, stageBottomV, "CONNECTOR_WIRE");
								this.drawWireSegment(branchX, connectorEndY, branchX, stageExitBottom, stageBottomV, stageBottomV, "END_BUS_CONNECTOR");
								this.drawDebugWireMeasurement(branchX, branchY, connectorEndY, "CONNECTOR_WIRE");
								this.drawDebugWireMeasurement(branchX, connectorEndY, stageExitBottom, "END_BUS_CONNECTOR");
							} else if (hasSplitBusBelow) {
								this.drawWireSegment(branchX, branchY, branchX, stageExitBottom - BUS_CONNECTOR, branchV, stageBottomV, "CONNECTOR_WIRE");
								this.drawWireSegment(branchX, stageExitBottom - BUS_CONNECTOR, branchX, stageExitBottom, stageBottomV, stageBottomV, "BUS_CONNECTOR");
								this.drawDebugWireMeasurement(branchX, branchY, stageExitBottom - BUS_CONNECTOR, "CONNECTOR_WIRE");
								this.drawDebugWireMeasurement(branchX, stageExitBottom - BUS_CONNECTOR, stageExitBottom, "BUS_CONNECTOR");
							} else {
								this.drawWireSegment(branchX, branchY, branchX, stageExitBottom, branchV, stageBottomV, "CONNECTOR_WIRE");
								this.drawDebugWireMeasurement(branchX, branchY, stageExitBottom, "CONNECTOR_WIRE");
							}
						}
						currentY = stageExitBottom;
					}
					const finalV = Number.isFinite(nodeV[nodeV.length - 1]) ? nodeV[nodeV.length - 1] : 0;
					if (currentY < layout.yBottom - 1e-6) {
						this.drawWireSegment(layout.xRight, currentY, layout.xRight, layout.yBottom, finalV, finalV, "END_BUS_CONNECTOR");
						this.drawDebugWireMeasurement(layout.xRight, currentY, layout.yBottom, "END_BUS_CONNECTOR");
					}
				}

				buildJunctionLabelRegistry(layout) {
					const stages = layout.stages || [];
					const junctions = [];
					const seen = new Set();

					function addJunction(x, y) {
						if (!Number.isFinite(x) || !Number.isFinite(y)) return;
						const key = x.toFixed(3) + "|" + y.toFixed(3);
						if (seen.has(key)) return;
						seen.add(key);
						junctions.push({ x, y });
					}

					// Start and return reference points.
					addJunction(layout.xCell, layout.yTop);
					addJunction(layout.xCell, layout.yBottom);

					if (stages.length === 0) {
						addJunction(layout.xRight, layout.yTop);
						addJunction(layout.xRight, layout.yBottom);
					} else {
						for (const stage of stages) {
							if (!stage || !(stage.branches || []).length) continue;
							const firstParallelStage = stage.index === 0 && stage.branches.length > 1;
							const lastParallelStage = stage.index === (stages.length - 1) && stage.branches.length > 1;
							const stageEntryTop = firstParallelStage ? layout.yTop : stage.junctionTop;
							const stageExitBottom = lastParallelStage ? layout.yBottom : stage.junctionBottom;

							// Right-rail split/merge connection points.
							addJunction(layout.xRight, stageEntryTop);
							addJunction(layout.xRight, stageExitBottom);

							// Branch split/merge connection points: one label per actual connection point.
							for (const branch of (stage.branches || [])) {
								const bx = Number.isFinite(branch.x) ? branch.x : layout.xRight;
								addJunction(bx, stageEntryTop);
								addJunction(bx, stageExitBottom);
							}
						}
					}

					junctions.sort((a, b) => (a.y - b.y) || (a.x - b.x));
					const keyFor = (x, y) => x.toFixed(3) + "|" + y.toFixed(3);
					const labelByKey = {};
					for (let i = 0; i < junctions.length; i++) {
						const j = junctions[i];
						j.id = "J" + (i + 1);
						labelByKey[keyFor(j.x, j.y)] = j.id;
					}

					function labelAt(x, y) {
						if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
						return labelByKey[keyFor(x, y)] || null;
					}

					return { junctions, labelAt };
				}

				drawJunctionIds(layout) {
					if (!state.debugJunctionIds) return;
					const registry = this.buildJunctionLabelRegistry(layout);
					const routeGraph = buildCircuitRouteGraph(layout);
					const displayPoints = buildJunctionDisplayPoints(registry, routeGraph);
					ctx.save();
					ctx.font = "700 13px system-ui, sans-serif";
					ctx.textAlign = "left";
					ctx.textBaseline = "middle";
					for (const point of displayPoints) {
						if (!point.id) continue; // corners without a junction ID get no label here
						ctx.fillStyle = "rgba(245, 251, 255, 0.95)";
						ctx.strokeStyle = "rgba(15, 90, 130, 0.95)";
						ctx.lineWidth = 1.4;
						ctx.beginPath();
						ctx.rect(point.x - 4, point.y - 4, 8, 8);
						ctx.fill();
						ctx.stroke();
						ctx.fillStyle = "rgba(15, 90, 130, 0.98)";
						ctx.fillText(point.id, point.x + 8, point.y);
					}
					ctx.restore();
				}

				drawNodePotentials(layout) {
					if (!state.debugNodePotentials) return;
					const registry = this.buildJunctionLabelRegistry(layout);
					const routeGraph = buildCircuitRouteGraph(layout);
					const nodeKeyFor = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;

					const nodePotentialByKey = new Map();
					const wireLabelPotentialCache = (state && state.wireLabelNodePotentialByKey && typeof state.wireLabelNodePotentialByKey === "object")
						? state.wireLabelNodePotentialByKey
						: null;
					if (wireLabelPotentialCache) {
						for (const [k, v] of Object.entries(wireLabelPotentialCache)) {
							if (!k || !Number.isFinite(v)) continue;
							nodePotentialByKey.set(k, v);
						}
					}

					const formatPotential = (v) => {
						if (!Number.isFinite(v)) return null;
						const small = Math.abs(v) < 5e-4 ? 0 : v;
						return small.toFixed(2) + "V";
					};

					const filteredPoints = [];
					const classifyRouteNode = (nodeKey) => {
						if (!routeGraph || !routeGraph.adjacency || !routeGraph.edges || !routeGraph.nodeByKey) return null;
						const node = routeGraph.nodeByKey.get(nodeKey);
						if (!node) return null;
						const incident = routeGraph.adjacency.get(nodeKey) || [];
						const degree = incident.length;
						const isJunction = degree > 2;
						let isCorner = false;
						if (degree === 2) {
							const edgeOrientationAtNode = (edge, key) => {
								const otherKey = edge.nodeA === key ? edge.nodeB : edge.nodeA;
								const center = routeGraph.nodeByKey.get(key);
								const other = routeGraph.nodeByKey.get(otherKey);
								if (!center || !other) return null;
								const dx = other.x - center.x;
								const dy = other.y - center.y;
								return Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
							};
							const o1 = edgeOrientationAtNode(routeGraph.edges[incident[0]], nodeKey);
							const o2 = edgeOrientationAtNode(routeGraph.edges[incident[1]], nodeKey);
							isCorner = !!(o1 && o2 && o1 !== o2);
						}
						if (!isJunction && !isCorner) return null;
						return { x: node.x, y: node.y, kind: isJunction ? "junction" : "corner" };
					};
					const cachedNodeKeys = wireLabelPotentialCache ? Object.keys(wireLabelPotentialCache) : [];
					if (cachedNodeKeys.length > 0) {
						for (const key of cachedNodeKeys) {
							const point = classifyRouteNode(String(key));
							if (!point) continue;
							filteredPoints.push(point);
						}
					} else if (routeGraph && routeGraph.adjacency && routeGraph.edges && routeGraph.nodeByKey) {
						const seenNodeKeys = new Set();
						const edgeOrientationAtNode = (edge, nodeKey) => {
							const otherKey = edge.nodeA === nodeKey ? edge.nodeB : edge.nodeA;
							const node = routeGraph.nodeByKey.get(nodeKey);
							const other = routeGraph.nodeByKey.get(otherKey);
							if (!node || !other) return null;
							const dx = other.x - node.x;
							const dy = other.y - node.y;
							return Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
						};
						for (const node of routeGraph.nodeByKey.values()) {
							const incident = routeGraph.adjacency.get(node.key) || [];
							const degree = incident.length;
							const isJunction = degree > 2;
							let isCorner = false;
							if (degree === 2) {
								const o1 = edgeOrientationAtNode(routeGraph.edges[incident[0]], node.key);
								const o2 = edgeOrientationAtNode(routeGraph.edges[incident[1]], node.key);
								isCorner = !!(o1 && o2 && o1 !== o2);
							}
							if (!isJunction && !isCorner) continue;
							if (seenNodeKeys.has(node.key)) continue;
							seenNodeKeys.add(node.key);
							filteredPoints.push({
								x: node.x,
								y: node.y,
								kind: isJunction ? "junction" : "corner"
							});
						}
					}
				// Compute a label offset that avoids overlapping the wire track.
				// Pure-horizontal node ? label above. Pure-vertical ? label right.
				// Corner (h+v) or multi-junction ? label above-right diagonally.
				const labelOffset = (point) => {
					if (!routeGraph || !routeGraph.adjacency || !routeGraph.edges || !routeGraph.nodeByKey) {
						return { dx: 8, dy: 0 };
					}
					const incident = routeGraph.adjacency.get(
						`${point.x.toFixed(3)}|${point.y.toFixed(3)}`
					) || [];
					let hasH = false, hasV = false;
					for (const ei of incident) {
						const edge = routeGraph.edges[ei];
						if (!edge) continue;
						const nodeKey = `${point.x.toFixed(3)}|${point.y.toFixed(3)}`;
						const otherKey = edge.nodeA === nodeKey ? edge.nodeB : edge.nodeA;
						const other = routeGraph.nodeByKey.get(otherKey);
						if (!other) continue;
						const dx = Math.abs(other.x - point.x);
						const dy = Math.abs(other.y - point.y);
						if (dx >= dy) hasH = true; else hasV = true;
					}
					if (hasH && !hasV) return { dx: 0, dy: -14 };   // horizontal wire ? above
					if (!hasH && hasV) return { dx: 8, dy: 0 };      // vertical wire ? right
					return { dx: 6, dy: -12 };                        // corner/multi ? above-right
				};

				ctx.save();
				ctx.font = "700 13px system-ui, sans-serif";
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				for (const point of filteredPoints) {
					const nodeKey = nodeKeyFor(point.x, point.y);
					const nodePotential = nodePotentialByKey.get(nodeKey);
					const displayPotential = formatPotential(nodePotential);
					ctx.fillStyle = "rgba(245, 251, 255, 0.95)";
					ctx.strokeStyle = point.kind === "junction" ? "rgba(15, 90, 130, 0.95)" : "rgba(180, 60, 0, 0.95)";
					ctx.lineWidth = 1.4;
					ctx.beginPath();
					ctx.rect(point.x - 4, point.y - 4, 8, 8);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = ctx.strokeStyle;
					if (displayPotential) {
						const off = labelOffset(point);
						ctx.fillText(displayPotential, point.x + off.dx, point.y + off.dy);
					}
				}
				ctx.restore();
			}

			drawJunctionDebugTable(layout) {
					const sectionSolve = applyKirchhoffSectionSolve(layout);
					if (!sectionSolve) return;
					const registry = this.buildJunctionLabelRegistry(layout);
					const routeGraph = buildCircuitRouteGraph(layout);
					const dpr = window.devicePixelRatio || 1;
					ctx.save();
					ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
					const x = 10;
					const lineH = 13;
					const junctionPointByLabel = Object.fromEntries((registry.junctions || []).map((j) => [j.id, j]));
					const orientPair = (fromLabel, toLabel) => {
						const a = junctionPointByLabel[fromLabel];
						const b = junctionPointByLabel[toLabel];
						if (!a || !b) return { from: fromLabel, to: toLabel, flipped: false };
						const dx = b.x - a.x;
						const dy = b.y - a.y;
						if (Math.abs(dy) >= Math.abs(dx)) {
							// Vertical-dominant: always top to bottom.
							if (a.y <= b.y) return { from: fromLabel, to: toLabel, flipped: false };
							return { from: toLabel, to: fromLabel, flipped: true };
						}
						// Horizontal-dominant: always left to right.
						if (a.x <= b.x) return { from: fromLabel, to: toLabel, flipped: false };
						return { from: toLabel, to: fromLabel, flipped: true };
					};
					const sectionRows = sectionSolve.sectionRows;
					const networkSolution = sectionSolve.networkSolution;

					const header = "Junction sections (Kirchhoff): " + sectionRows.length;
					const junctionHeaderBase = "Junction potentials";
					const colHeader = "Pair        R(total)    SumEmf       CurrentVar    I            Vr           dV=Vr+E";
					const junctionColHeader = "Point       Potential";
					const rowColorPalette = [
						"#6d3bb5", // purple (row 1 preference)
						"#1f77b4",
						"#2ca02c",
						"#d62728",
						"#ff7f0e",
						"#17becf",
						"#8c564b",
						"#bcbd22"
					];
					const sectionRowColors = [];
					const sectionColorByPairKey = {};
					const sectionColorByRouteIndex = {};
					const sectionCurrentByRouteIndex = {};
					const sectionCurrentByPairKey = {};
					const sectionPairGeometries = [];
					const sectionHighCurrentPairGeometries = [];
					const branchNetRelations = [];
					const sectionCurrentVar = (fromLabel, toLabel) => {
						const a = String(fromLabel || "?");
						const b = String(toLabel || "?");
						const ma = /^J(\d+)$/.exec(a);
						const mb = /^J(\d+)$/.exec(b);
						if (ma && mb) return `I${ma[1]}to${mb[1]}`;
						const sa = a.replace(/[^A-Za-z0-9]/g, "");
						const sb = b.replace(/[^A-Za-z0-9]/g, "");
						return `I${sa || "A"}to${sb || "B"}`;
					};
					const sectionDisplayRows = [];
					const bodyLines = [];
					const fmtAmps = (I) => {
						if (!Number.isFinite(I)) return "---".padEnd(13, " ");
						const absI = Math.abs(I), s = I < 0 ? "-" : "+";
						if (absI >= 1)     return (s + absI.toFixed(3)         + " A" ).padEnd(13, " ");
						if (absI >= 1e-3)  return (s + (absI * 1e3).toFixed(2) + " mA").padEnd(13, " ");
						return               (s + (absI * 1e6).toFixed(1) + " uA").padEnd(13, " ");
					};
					const fmtVolts = (v) => {
						if (!Number.isFinite(v)) return "---".padEnd(13, " ");
						const absV = Math.abs(v), s = v < 0 ? "-" : "+";
						if (absV >= 1)     return (s + absV.toFixed(3)         + " V" ).padEnd(13, " ");
						if (absV >= 1e-3)  return (s + (absV * 1e3).toFixed(2) + " mV").padEnd(13, " ");
						return               (s + (absV * 1e6).toFixed(1) + " uV").padEnd(13, " ");
					};
					for (let ri = 0; ri < sectionRows.length; ri++) {
						const r = sectionRows[ri];
						const rowColor = rowColorPalette[ri % rowColorPalette.length];
						sectionRowColors.push(rowColor);
						const rowFrom = r.from || "?";
						const rowTo = r.to || "?";
						const oriented = orientPair(rowFrom, rowTo);
						const pairDirectionSign = (oriented.from === rowFrom && oriented.to === rowTo)
							? 1
							: ((oriented.from === rowTo && oriented.to === rowFrom) ? -1 : 1);
						const pairKeyF = `${oriented.from || "?"}|${oriented.to || "?"}`;
						const pairKeyR = `${oriented.to || "?"}|${oriented.from || "?"}`;
						sectionColorByPairKey[pairKeyF] = rowColor;
						sectionColorByPairKey[pairKeyR] = rowColor;
						if (r && r.isGraphRoute && Number.isFinite(r.routeIndex)) {
							sectionColorByRouteIndex[r.routeIndex] = rowColor;
						}
						let pairIsHighCurrent = false;
						if (networkSolution && networkSolution.branchResults && networkSolution.branchResults[ri]) {
							const brI = networkSolution.branchResults[ri].I;
							const pairI = Number.isFinite(brI) ? (pairDirectionSign * brI) : NaN;
							if (Number.isFinite(pairI)) {
								if (r && r.isGraphRoute && Number.isFinite(r.routeIndex)) {
									sectionCurrentByRouteIndex[r.routeIndex] = pairI;
								}
								sectionCurrentByPairKey[pairKeyF] = pairI;
								if (pairKeyR !== pairKeyF) sectionCurrentByPairKey[pairKeyR] = -pairI;
								pairIsHighCurrent = Math.abs(pairI) > HIGH_CURRENT_WARNING_THRESHOLD_A;
							}
						}
						const rowParts = Array.isArray(r.parts) ? r.parts : [];
						// Helper: push a geometry entry from a part or junction-pair span.
						const pushGeomEntry = (x1, y1, x2, y2) => {
							if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) return;
							sectionPairGeometries.push({ x1, y1, x2, y2, color: rowColor });
							if (pairIsHighCurrent) {
								sectionHighCurrentPairGeometries.push({ x1, y1, x2, y2 });
							}
						};
						if (rowParts.length > 0) {
							for (const p of rowParts) {
								if (!p) continue;
								pushGeomEntry(p.x1, p.y1, p.x2, p.y2);
							}
						} else {
							const pFrom = junctionPointByLabel[oriented.from || "?"];
							const pTo = junctionPointByLabel[oriented.to || "?"];
							if (pFrom && pTo) {
								pushGeomEntry(pFrom.x, pFrom.y, pTo.x, pTo.y);
							}
						}
						const pair  = (oriented.from + "-" + oriented.to).padEnd(11, " ");
						const rTxt  = formatCompactWireResistance(Math.max(0, r.R || 0)).padEnd(12, " ");
						const emf = (Number.isFinite(r.E) ? r.E : 0) * pairDirectionSign;
						const eTxt  = ((emf >= 0 ? "+" : "") + emf.toFixed(3) + " V").padEnd(13, " ");
						const iVar  = sectionCurrentVar(oriented.from, oriented.to).padEnd(14, " ");
						let iCol = "---".padEnd(13, " ");
						let vrCol = "---".padEnd(13, " ");
						let netCol = "---".padEnd(13, " ");
						let netForRelation = null;
						if (networkSolution && networkSolution.branchResults[ri]) {
							let { I, Vr, netPd } = networkSolution.branchResults[ri];
							I *= pairDirectionSign;
							Vr *= pairDirectionSign;
							netPd *= pairDirectionSign;
							iCol   = fmtAmps(I);
							vrCol  = fmtVolts(Vr);
							netCol = fmtVolts(netPd);
							netForRelation = netPd;
						}
						if (Number.isFinite(netForRelation) && oriented.from && oriented.to && oriented.from !== "?" && oriented.to !== "?") {
							branchNetRelations.push({ from: oriented.from, to: oriented.to, dV: netForRelation });
						}
						sectionDisplayRows.push({
							oriented,
							pair,
							rTxt,
							eTxt,
							iVar,
							iCol,
							vrCol,
							netCol
						});
					}

					const parseJunctionNumber = (label) => {
						const m = /^J(\d+)$/.exec(String(label || ""));
						return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
					};

					const firstOriented = sectionDisplayRows.length ? sectionDisplayRows[0].oriented : null;
					const referenceJunction = (firstOriented && firstOriented.from && firstOriented.from !== "?")
						? firstOriented.from
						: ((registry && registry.junctions && registry.junctions[0] && registry.junctions[0].id) ? registry.junctions[0].id : null);
					const potentialByJunction = new Map();
					if (referenceJunction) potentialByJunction.set(referenceJunction, 0);
					if (branchNetRelations.length > 0 && potentialByJunction.size > 0) {
						for (let iter = 0; iter < branchNetRelations.length * 4; iter++) {
							let changed = false;
							for (const rel of branchNetRelations) {
								const hasFrom = potentialByJunction.has(rel.from);
								const hasTo = potentialByJunction.has(rel.to);
								if (hasFrom && !hasTo) {
									potentialByJunction.set(rel.to, potentialByJunction.get(rel.from) + rel.dV);
									changed = true;
								} else if (!hasFrom && hasTo) {
									potentialByJunction.set(rel.from, potentialByJunction.get(rel.to) - rel.dV);
									changed = true;
								}
							}
							if (!changed) break;
						}
					}
					if (referenceJunction) potentialByJunction.set(referenceJunction, 0);
					const potentialSampler = buildRoutePointPotentialSampler(layout, routeGraph);

					for (const row of sectionDisplayRows) {
						bodyLines.push(row.pair + row.rTxt + row.eTxt + row.iVar + row.iCol + row.vrCol + row.netCol);
					}

					const formatPotential = (v) => {
						if (!Number.isFinite(v)) return "---";
						const vv = Math.abs(v) < 5e-7 ? 0 : v;
						const sign = vv >= 0 ? "+" : "";
						return sign + vv.toFixed(3) + " V";
					};
					const displayPoints = buildJunctionPotentialTablePoints(registry, routeGraph, sectionRows)
						.sort((a, b) => {
							const aNum = parseJunctionNumber(a.id || "");
							const bNum = parseJunctionNumber(b.id || "");
							if (aNum !== bNum) return aNum - bNum;
							if ((a.id || "") !== (b.id || "")) return String(a.id || "").localeCompare(String(b.id || ""));
							return (a.y - b.y) || (a.x - b.x);
						});
					const pointKey = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
					const derivePointLabel = (point, idx) => {
						if (point && point.id) return point.id;
						if (!point || !routeGraph || !routeGraph.nodeByKey || !routeGraph.adjacency || !routeGraph.edges) {
							return `P${idx + 1}`;
						}
						let center = routeGraph.nodeByKey.get(pointKey(point.x, point.y));
						if (!center) {
							for (const node of routeGraph.nodeByKey.values()) {
								if (Math.hypot(node.x - point.x, node.y - point.y) <= 1.5) { center = node; break; }
							}
						}
						if (!center) return `P${idx + 1}`;
						const incident = routeGraph.adjacency.get(center.key) || [];
						const bounds = [];
						for (const ei of incident) {
							const edge = routeGraph.edges[ei];
							if (!edge) continue;
							const firstKey = edge.nodeA === center.key ? edge.nodeB : edge.nodeA;
							const queue = [firstKey];
							const visited = new Set([center.key, firstKey]);
							while (queue.length) {
								const key = queue.shift();
								const node = routeGraph.nodeByKey.get(key);
								if (!node) continue;
								if (node.junctionId) {
									bounds.push(node.junctionId);
									break;
								}
								for (const nei of (routeGraph.adjacency.get(key) || [])) {
									const nedge = routeGraph.edges[nei];
									if (!nedge) continue;
									const nextKey = nedge.nodeA === key ? nedge.nodeB : nedge.nodeA;
									if (visited.has(nextKey)) continue;
									visited.add(nextKey);
									queue.push(nextKey);
								}
							}
						}
						const uniq = Array.from(new Set(bounds));
						uniq.sort((a, b) => {
							const na = parseJunctionNumber(a);
							const nb = parseJunctionNumber(b);
							if (na !== nb) return na - nb;
							return String(a).localeCompare(String(b));
						});
						if (uniq.length >= 2) return `${uniq[0]}-${uniq[1]}`;
						if (uniq.length === 1) return `${uniq[0]}-near`;
						return `P${idx + 1}`;
					};
					const displayPointRows = displayPoints.map((point, idx) => {
						const label = derivePointLabel(point, idx);
						const potential = potentialByJunction.has(point.id)
							? potentialByJunction.get(point.id)
							: potentialSampler.potentialAt(point.x, point.y);
						return { label, potential };
					});
					const junctionBodyLines = displayPointRows.length
						? displayPointRows.map((row) => {
							const jTxt = String(row.label).padEnd(11, " ");
							const pTxt = formatPotential(row.potential).padEnd(13, " ");
							return jTxt + pTxt;
						})
						: ["(none)      -"]; 
					const junctionHeader = `${junctionHeaderBase}: ${displayPointRows.length}`;
					state.sectionColorByPairKey = sectionColorByPairKey;
					state.sectionColorByRouteIndex = sectionColorByRouteIndex;
					state.sectionCurrentByRouteIndex = sectionCurrentByRouteIndex;
					state.sectionCurrentByPairKey = sectionCurrentByPairKey;
					state.sectionPairGeometries = sectionPairGeometries;
					state.sectionHighCurrentPairGeometries = sectionHighCurrentPairGeometries;

					ctx.font = "600 11px Consolas, 'Courier New', monospace";
					const pad = 8;
					const canvasW = canvas.width / dpr;
					const canvasH = canvas.height / dpr;
					const tableGap = 10;
					const junctionPad = 8;
					const junctionRowsVisible = Math.max(1, junctionBodyLines.length);
					let junctionTextW = Math.max(ctx.measureText(junctionColHeader).width, ctx.measureText(junctionHeader).width);
					for (const line of junctionBodyLines) {
						junctionTextW = Math.max(junctionTextW, ctx.measureText(line).width);
					}
					const junctionBoxW = junctionTextW + junctionPad * 2;
					const junctionBoxH = junctionPad * 2 + lineH * (2 + junctionRowsVisible);
					const canFitSideBySide = (canvasW - x - 10 - junctionBoxW - tableGap) >= 260;
					const maxBoxW = canFitSideBySide
						? Math.max(200, canvasW - x - 10 - junctionBoxW - tableGap)
						: Math.max(200, canvasW - 20);
					const topPad = 10;
					const bottomPad = 10;
					let rowsPerCol = Math.max(1, Math.floor((canvasH - topPad - bottomPad - pad * 2 - lineH * 2) / lineH));
					rowsPerCol = Math.min(rowsPerCol, bodyLines.length);
					if (rowsPerCol < 1) rowsPerCol = 1;
					const colGap = 18;

					let colCount = 1;
					let colWidths = [];
					let boxW = 0;
					const measureLayout = () => {
						colCount = Math.ceil(bodyLines.length / rowsPerCol);
						colWidths = [];
						for (let c = 0; c < colCount; c++) {
							const start = c * rowsPerCol;
							const end = Math.min(start + rowsPerCol, bodyLines.length);
							let width = ctx.measureText(colHeader).width;
							for (let i = start; i < end; i++) {
								width = Math.max(width, ctx.measureText(bodyLines[i]).width);
							}
							colWidths.push(width);
						}
						const colsWidth = colWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, colCount - 1) * colGap;
						boxW = colsWidth + pad * 2;
					};

					measureLayout();
					while (boxW > maxBoxW && rowsPerCol < bodyLines.length) {
						rowsPerCol = Math.min(bodyLines.length, rowsPerCol + 2);
						measureLayout();
					}

					const boxH = pad * 2 + lineH * 2 + rowsPerCol * lineH;
					const y = Math.max(8, canvasH - boxH - 10);
					if (state.debugMode) {
						ctx.fillStyle = "rgba(245, 251, 255, 0.92)";
						ctx.strokeStyle = "rgba(22, 76, 112, 0.82)";
						ctx.lineWidth = 1.3;
						ctx.beginPath();
						ctx.roundRect(x, y, boxW, boxH, 6);
						ctx.fill();
						ctx.stroke();

						ctx.fillStyle = "#14354f";
						ctx.textAlign = "left";
						ctx.textBaseline = "top";
						ctx.fillText(header, x + pad, y + pad);
						let colX = x + pad;
						for (let c = 0; c < colCount; c++) {
							ctx.fillText(colHeader, colX, y + pad + lineH);
							const start = c * rowsPerCol;
							const end = Math.min(start + rowsPerCol, bodyLines.length);
							for (let i = start; i < end; i++) {
								const localRow = i - start;
								ctx.fillStyle = sectionRowColors[i] || "#14354f";
								ctx.fillText(bodyLines[i], colX, y + pad + lineH * (2 + localRow));
							}
							ctx.fillStyle = "#14354f";
							colX += colWidths[c] + colGap;
						}
					}

					const junctionX = canFitSideBySide
						? (x + boxW + tableGap)
						: Math.max(10, canvasW - junctionBoxW - 10);
					const junctionY = canFitSideBySide
						? Math.max(8, canvasH - junctionBoxH - 10)
						: Math.max(8, y - junctionBoxH - 8);

					if (state.debugMode) {
						ctx.fillStyle = "rgba(245, 251, 255, 0.92)";
						ctx.strokeStyle = "rgba(22, 76, 112, 0.82)";
						ctx.lineWidth = 1.3;
						ctx.beginPath();
						ctx.roundRect(junctionX, junctionY, junctionBoxW, junctionBoxH, 6);
						ctx.fill();
						ctx.stroke();
						ctx.fillStyle = "#14354f";
						ctx.fillText(junctionHeader, junctionX + junctionPad, junctionY + junctionPad);
						ctx.fillText(junctionColHeader, junctionX + junctionPad, junctionY + junctionPad + lineH);
						for (let i = 0; i < junctionRowsVisible; i++) {
							ctx.fillStyle = "#14354f";
							ctx.fillText(junctionBodyLines[i] || "", junctionX + junctionPad, junctionY + junctionPad + lineH * (2 + i));
						}
					}

					const sectionRTotal = sectionRows.reduce((sum, row) => {
						const r = Number.isFinite(row && row.R) ? row.R : 0;
						return sum + Math.max(0, r);
					}, 0);
					const labelCacheForCheck = (state && state.wireLabelValueBySegmentIndex && typeof state.wireLabelValueBySegmentIndex === "object")
						? state.wireLabelValueBySegmentIndex
						: {};
					const displayedRTotal = Object.values(labelCacheForCheck).reduce((sum, entry) => {
						const r = Number.isFinite(entry && entry.R) ? entry.R : 0;
						return sum + Math.max(0, r);
					}, 0);
					const resistanceDelta = displayedRTotal - sectionRTotal;
					const resistanceCheckHeader = "Resistance check";
					const resistanceCheckColHeader = "Metric      Value";
					const resistanceCheckBody = [
						`R(labels)`.padEnd(12, " ") + formatWireResistance(displayedRTotal),
						`R(section)`.padEnd(12, " ") + formatWireResistance(sectionRTotal),
						`\u0394R`.padEnd(12, " ") + ((resistanceDelta >= 0 ? "+" : "-") + formatWireResistance(Math.abs(resistanceDelta)))
					];
					let resistanceTextW = Math.max(ctx.measureText(resistanceCheckColHeader).width, ctx.measureText(resistanceCheckHeader).width);
					for (const line of resistanceCheckBody) {
						resistanceTextW = Math.max(resistanceTextW, ctx.measureText(line).width);
					}
					const resistancePad = 8;
					const resistanceBoxW = resistanceTextW + resistancePad * 2;
					const resistanceRowsVisible = Math.max(1, resistanceCheckBody.length);
					const resistanceBoxH = resistancePad * 2 + lineH * (2 + resistanceRowsVisible);
					if (state.debugMode) {
						const resistanceX = junctionX;
						const resistanceY = canFitSideBySide
							? Math.max(8, junctionY - resistanceBoxH - 8)
							: Math.min(canvasH - resistanceBoxH - 8, junctionY + junctionBoxH + 8);
						ctx.fillStyle = "rgba(245, 251, 255, 0.92)";
						ctx.strokeStyle = "rgba(22, 76, 112, 0.82)";
						ctx.lineWidth = 1.3;
						ctx.beginPath();
						ctx.roundRect(resistanceX, resistanceY, resistanceBoxW, resistanceBoxH, 6);
						ctx.fill();
						ctx.stroke();
						ctx.fillStyle = "#14354f";
						ctx.fillText(resistanceCheckHeader, resistanceX + resistancePad, resistanceY + resistancePad);
						ctx.fillText(resistanceCheckColHeader, resistanceX + resistancePad, resistanceY + resistancePad + lineH);
						for (let i = 0; i < resistanceRowsVisible; i++) {
							ctx.fillText(resistanceCheckBody[i] || "", resistanceX + resistancePad, resistanceY + resistancePad + lineH * (2 + i));
						}
					}

					state.wireLabelNodePotentialByKey = null;
					state.wireLabelNodePairRows = [];
					const wireLabelCache = (state && state.wireLabelValueBySegmentIndex)
						? state.wireLabelValueBySegmentIndex
						: {};
					const hasWireLabelCache = Object.keys(wireLabelCache).length > 0;
					const shouldBuildNodePotentialCache = hasWireLabelCache || wireResistanceLabelsEnabled() || nodesIRLabelsEnabled() || state.potentialGraphMode || state.voltageColorMode;
					if (shouldBuildNodePotentialCache) {
					const wireLabelSegments = routeGraph && Array.isArray(routeGraph.segments)
						? routeGraph.segments
						: buildCircuitVoltageSegments(layout);
					const routeKeyBySegmentIndex = routeGraph && Array.isArray(routeGraph.routeKeyBySegmentIndex)
						? routeGraph.routeKeyBySegmentIndex
						: [];
					const routeIndexBySegmentIndex = routeGraph && Array.isArray(routeGraph.routeIndexBySegmentIndex)
						? routeGraph.routeIndexBySegmentIndex
						: [];
					const segmentEffectiveLengthByIndex = routeGraph && Array.isArray(routeGraph.segmentEffectiveLengthByIndex)
						? routeGraph.segmentEffectiveLengthByIndex
						: [];
					const nodePairRows = [];
					const nodeKeySet = new Set();

					const nodeKeyFor = (x, y) => `${x.toFixed(3)}|${y.toFixed(3)}`;
					const canonicalNodeOrderForPiece = (piece, aKey, bKey) => {
						const dx = piece.x2 - piece.x1;
						const dy = piece.y2 - piece.y1;
						if (Math.abs(dy) >= Math.abs(dx)) {
							if (piece.y1 <= piece.y2) return { fromKey: aKey, toKey: bKey };
							return { fromKey: bKey, toKey: aKey };
						}
						if (piece.x1 <= piece.x2) return { fromKey: aKey, toKey: bKey };
						return { fromKey: bKey, toKey: aKey };
					};
					const directedVoltageForPiece = (fromKey, toKey, aKey, bKey, signedFromAtoB) => {
						if (!Number.isFinite(signedFromAtoB)) return NaN;
						if (fromKey === aKey && toKey === bKey) return signedFromAtoB;
						if (fromKey === bKey && toKey === aKey) return -signedFromAtoB;
						return signedFromAtoB;
					};
					const fmtSignedVolts = (v) => {
						if (!Number.isFinite(v)) return "---";
						return formatWireVoltagePD(v);
					};
					const currentForSegment = (segIndex) => {
						if (!Number.isFinite(segIndex)) return Number.isFinite(state.solved?.Itotal) ? state.solved.Itotal : null;
						const rk = routeKeyBySegmentIndex[segIndex];
						if (rk && Number.isFinite(sectionCurrentByPairKey[rk])) {
							return sectionCurrentByPairKey[rk];
						}
						const ri = routeIndexBySegmentIndex[segIndex];
						if (Number.isFinite(ri) && Number.isFinite(sectionCurrentByRouteIndex[ri])) {
							return sectionCurrentByRouteIndex[ri];
						}
						return Number.isFinite(state.solved?.Itotal) ? state.solved.Itotal : null;
					};

					const labeledPieces = [];
					for (let si = 0; si < wireLabelSegments.length; si++) {
						const seg = wireLabelSegments[si];
						if (!seg) continue;
						if (!Number.isFinite(seg.x1) || !Number.isFinite(seg.y1) || !Number.isFinite(seg.x2) || !Number.isFinite(seg.y2)) continue;
						const rawLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
						const len = Number.isFinite(segmentEffectiveLengthByIndex[si]) ? segmentEffectiveLengthByIndex[si] : rawLen;
						// Use rawLen for the inclusion threshold: even short-effective-length segments
						// (where GRAPH_PATH_HALF_WIDTH corner trimming reduces len to near zero)
						// must participate in the connectivity table so no nodes are left degree-1.
						// The resistance is still computed from len (effective), giving correct near-zero R.
						if (!(rawLen > 1e-6)) continue;

						labeledPieces.push({
							kind: seg.role === "component-main"
								? "component"
								: (seg.role === "shoulder-wire"
									? "shoulder"
									: (seg.role === "switch-blade" ? "switch" : "wire")),
							segIndex: si,
							componentId: seg.componentId || null,
							componentSection: seg.componentSection || null,
							x1: seg.x1,
							y1: seg.y1,
							x2: seg.x2,
							y2: seg.y2,
							v1: Number.isFinite(seg.v1) ? seg.v1 : 0,
							v2: Number.isFinite(seg.v2) ? seg.v2 : (Number.isFinite(seg.v1) ? seg.v1 : 0),
							length: len,
							role: seg.role || "wire"
						});
					}

					for (const piece of labeledPieces) {
						const cached = wireLabelCache[piece.segIndex] || null;
						// Keep node-pair rows in lockstep with displayed wire labels.
						// If a segment has no cached wire-label values, do not recompute them here.
						if (!cached) continue;
						const isComponentPiece = piece.kind === "component" && !!piece.componentId;
						const sectionR = Number.isFinite(cached.R) ? Math.max(0, cached.R) : 0;
						const aKey = nodeKeyFor(piece.x1, piece.y1);
						const bKey = nodeKeyFor(piece.x2, piece.y2);
						const wireIraw = (Number.isFinite(cached.displayCurrent) || isInfiniteCurrentValue(cached.displayCurrent))
							? cached.displayCurrent
							: NaN;
						const wireI = (Number.isFinite(wireIraw) || isInfiniteCurrentValue(wireIraw)) ? wireIraw : NaN;
						const isCellEmfPiece = !!(isComponentPiece
							&& isExtraCell(piece.componentId)
							&& piece.componentSection === "cell-emf");
						let fromKey = null;
						let toKey = null;
						if (isCellEmfPiece) {
							// Cell EMF sign is defined by cell polarity and geometry, not by inferred loop current direction.
							const canonicalOrder = canonicalNodeOrderForPiece(piece, aKey, bKey);
							fromKey = canonicalOrder.fromKey;
							toKey = canonicalOrder.toKey;
						} else if (Number.isFinite(wireI) || isInfiniteCurrentValue(wireI)) {
							if (wireI >= 0) {
								fromKey = aKey;
								toKey = bKey;
							} else {
								fromKey = bKey;
								toKey = aKey;
							}
						} else {
							const canonicalOrder = canonicalNodeOrderForPiece(piece, aKey, bKey);
							fromKey = canonicalOrder.fromKey;
							toKey = canonicalOrder.toKey;
						}
						const switchDirectedByRow = piece.kind === "switch"
							&& Number.isFinite(cached.signedPdValue)
							? directedVoltageForPiece(fromKey, toKey, aKey, bKey, cached.signedPdValue)
							: NaN;
						const emfDirectedByRow = isCellEmfPiece
							&& Number.isFinite(cached.signedPdValue)
							? directedVoltageForPiece(fromKey, toKey, aKey, bKey, cached.signedPdValue)
							: NaN;
						const directedPdPlusEmf = Number.isFinite(emfDirectedByRow)
							? emfDirectedByRow
							: (Number.isFinite(switchDirectedByRow)
							? switchDirectedByRow
							: (Number.isFinite(cached.directedPdDisplay)
								? cached.directedPdDisplay
								: (Number.isFinite(cached.signedPdValue)
									? directedVoltageForPiece(fromKey, toKey, aKey, bKey, cached.signedPdValue)
									: NaN)));
						const rowRouteIndex = Number.isFinite(piece.segIndex) ? routeIndexBySegmentIndex[piece.segIndex] : null;
						const rowRouteKey = Number.isFinite(piece.segIndex) ? routeKeyBySegmentIndex[piece.segIndex] : null;
						let rowColor = "#14354f";
						if (Number.isFinite(rowRouteIndex) && sectionColorByRouteIndex[rowRouteIndex]) {
							rowColor = sectionColorByRouteIndex[rowRouteIndex];
						} else if (rowRouteKey && sectionColorByPairKey[rowRouteKey]) {
							rowColor = sectionColorByPairKey[rowRouteKey];
						}
						nodeKeySet.add(aKey);
						nodeKeySet.add(bKey);
						nodePairRows.push({
							fromKey,
							toKey,
							R: sectionR,
							pdPlusEmf: directedPdPlusEmf,
							signedDelta: directedPdPlusEmf,
							current: wireI,
							kind: piece.kind,
							componentId: piece.componentId || null,
							rowColor
						});
					}
					state.wireLabelNodePairRows = nodePairRows.map((row) => ({
						fromKey: row.fromKey,
						toKey: row.toKey,
						pdPlusEmf: row.pdPlusEmf,
						R: row.R,
						current: row.current,
						rowColor: row.rowColor,
						kind: row.kind,
						componentId: row.componentId || null
					}));

					const nodesOrdered = Array.from(nodeKeySet).map((key) => {
						const bits = key.split("|");
						return { key, x: Number(bits[0]), y: Number(bits[1]) };
					}).sort((a, b) => (a.y - b.y) || (a.x - b.x));
					const nodeIdByKey = new Map();
					for (let i = 0; i < nodesOrdered.length; i++) {
						nodeIdByKey.set(nodesOrdered[i].key, "N" + (i + 1));
					}

					const nodePairHeader = `Wire-label node pairs: ${nodePairRows.length}`;
					const nodePairColHeader = "Pair         Type       R(section)    p.d.+emf";
					const nodePairRowColors = [];
					const nodePairBody = nodePairRows.length
						? nodePairRows.map((row) => {
							const a = nodeIdByKey.get(row.fromKey) || "?";
							const b = nodeIdByKey.get(row.toKey) || "?";
							const pairTxt = `${a}-${b}`.padEnd(12, " ");
							const typeTxt = String(row.kind || "wire").padEnd(11, " ");
							const rTxt = formatCompactWireResistance(row.R).padEnd(14, " ");
							const pTxt = fmtSignedVolts(row.pdPlusEmf).padEnd(12, " ");
							nodePairRowColors.push(row.rowColor || "#14354f");
							return pairTxt + typeTxt + rTxt + pTxt;
						})
						: ["(none)       -            -"];

					const nodeConnectionMap = new Map();
					for (const row of nodePairRows) {
						const a = nodeIdByKey.get(row.fromKey) || "?";
						const b = nodeIdByKey.get(row.toKey) || "?";
						if (!nodeConnectionMap.has(a)) nodeConnectionMap.set(a, new Set());
						if (!nodeConnectionMap.has(b)) nodeConnectionMap.set(b, new Set());
						nodeConnectionMap.get(a).add(b);
						nodeConnectionMap.get(b).add(a);
					}

					const solveNodePotentials = () => {
						const nodeIds = Array.from(nodeConnectionMap.keys()).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
						if (nodeIds.length === 0) return new Map();
						if (nodeIds.length === 1) {
							const only = nodeIds[0];
							return new Map([[only, 0]]);
						}

						const out = new Map();
						const anchor = nodeIds.includes("N1") ? "N1" : nodeIds[0];
						out.set(anchor, 0);

						const usableRows = nodePairRows
							.map((row) => {
								const fromId = nodeIdByKey.get(row.fromKey);
								const toId = nodeIdByKey.get(row.toKey);
								const d = Number.isFinite(row.pdPlusEmf) ? row.pdPlusEmf : NaN;
								if (!fromId || !toId || !Number.isFinite(d)) return null;
								return { fromId, toId, d };
							})
							.filter(Boolean);

						const maxPasses = Math.max(2, usableRows.length * 3);
						for (let pass = 0; pass < maxPasses; pass++) {
							let changed = false;
							for (const step of usableRows) {
								const hasFrom = out.has(step.fromId);
								const hasTo = out.has(step.toId);
								if (hasFrom && !hasTo) {
									out.set(step.toId, out.get(step.fromId) + step.d);
									changed = true;
								} else if (!hasFrom && hasTo) {
									out.set(step.fromId, out.get(step.toId) - step.d);
									changed = true;
								}
							}
							if (!changed) break;
						}

						const seen = new Set();
						for (const start of nodeIds) {
							if (seen.has(start)) continue;
							const comp = [];
							const stack = [start];
							seen.add(start);
							while (stack.length) {
								const cur = stack.pop();
								comp.push(cur);
								const neighbors = nodeConnectionMap.get(cur) || [];
								for (const n of neighbors) {
									if (seen.has(n)) continue;
									seen.add(n);
									stack.push(n);
								}
							}
							if (!comp.some((id) => out.has(id))) out.set(comp[0], 0);
							const compSet = new Set(comp);
							for (let pass = 0; pass < maxPasses; pass++) {
								let changed = false;
								for (const step of usableRows) {
									if (!compSet.has(step.fromId) || !compSet.has(step.toId)) continue;
									const hasFrom = out.has(step.fromId);
									const hasTo = out.has(step.toId);
									if (hasFrom && !hasTo) {
										out.set(step.toId, out.get(step.fromId) + step.d);
										changed = true;
									} else if (!hasFrom && hasTo) {
										out.set(step.fromId, out.get(step.toId) - step.d);
										changed = true;
									}
								}
								if (!changed) break;
							}
							for (const id of comp) {
								if (!out.has(id)) out.set(id, 0);
							}
						}
						return out;
					};

					const nodePotentialById = solveNodePotentials();
					const nodeIds = Array.from(nodeConnectionMap.keys()).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
					const anchorNodeId = nodeIds.includes("N1") ? "N1" : (nodeIds[0] || null);
					const anchorConnected = new Set();
					if (anchorNodeId) {
						const stack = [anchorNodeId];
						anchorConnected.add(anchorNodeId);
						while (stack.length) {
							const cur = stack.pop();
							const neighbors = nodeConnectionMap.get(cur) || [];
							for (const n of neighbors) {
								if (anchorConnected.has(n)) continue;
								anchorConnected.add(n);
								stack.push(n);
							}
						}
					}

					const nodeInfoById = new Map();
					for (const node of nodesOrdered) {
						if (!node || !node.key) continue;
						const nodeId = nodeIdByKey.get(node.key);
						if (!nodeId) continue;
						nodeInfoById.set(nodeId, node);
					}

					const disconnectedComponents = [];
					const seenComponentNodes = new Set();
					for (const startId of nodeIds) {
						if (!startId || seenComponentNodes.has(startId)) continue;
						const component = [];
						const stack = [startId];
						seenComponentNodes.add(startId);
						while (stack.length) {
							const cur = stack.pop();
							component.push(cur);
							const neighbors = nodeConnectionMap.get(cur) || [];
							for (const n of neighbors) {
								if (!n || seenComponentNodes.has(n)) continue;
								seenComponentNodes.add(n);
								stack.push(n);
							}
						}
						if (component.length && !component.some((id) => anchorConnected.has(id))) {
							disconnectedComponents.push(component);
						}
					}

					for (const component of disconnectedComponents) {
						let sampledAnchor = null;
						for (const nodeId of component) {
							const node = nodeInfoById.get(nodeId);
							if (!node || !potentialSampler || typeof potentialSampler.potentialAt !== "function") continue;
							const sampledPotential = potentialSampler.potentialAt(node.x, node.y);
							const existingPotential = nodePotentialById.get(nodeId);
							if (!Number.isFinite(sampledPotential) || !Number.isFinite(existingPotential)) continue;
							sampledAnchor = { sampledPotential, existingPotential };
							break;
						}
						if (!sampledAnchor) continue;
						const offset = sampledAnchor.sampledPotential - sampledAnchor.existingPotential;
						if (!Number.isFinite(offset) || Math.abs(offset) <= 1e-12) continue;
						for (const nodeId of component) {
							const existingPotential = nodePotentialById.get(nodeId);
							if (!Number.isFinite(existingPotential)) continue;
							nodePotentialById.set(nodeId, existingPotential + offset);
						}
					}
					const nodePotentialByKey = {};
					for (const node of nodesOrdered) {
						if (!node || !node.key) continue;
						const nodeId = nodeIdByKey.get(node.key);
						if (!nodeId) continue;
						let potential = nodePotentialById.get(nodeId);
						if (!Number.isFinite(potential)) continue;
						nodePotentialByKey[node.key] = potential;
					}
					const finiteNodePotentials = Array.from(nodePotentialById.values()).filter((v) => Number.isFinite(v));
					const displayShift = finiteNodePotentials.length ? Math.min(...finiteNodePotentials) : 0;
					if (Number.isFinite(displayShift) && Math.abs(displayShift) > 1e-12) {
						for (const [nodeId, value] of nodePotentialById.entries()) {
							if (Number.isFinite(value)) nodePotentialById.set(nodeId, value - displayShift);
						}
						for (const [key, value] of Object.entries(nodePotentialByKey)) {
							if (Number.isFinite(value)) nodePotentialByKey[key] = value - displayShift;
						}
					}
					state.wireLabelNodePotentialByKey = nodePotentialByKey;
					const nodeConnectionHeader = `Node connections: ${nodeConnectionMap.size}`;
					const nodeConnectionColHeader = "Node        Connected to           Potential";
					const nodeConnectionBody = Array.from(nodeConnectionMap.entries())
						.sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
						.map(([nodeId, connected]) => {
							const joined = Array.from(connected).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(",");
							const potentialText = fmtSignedVolts(nodePotentialById.get(nodeId)).padEnd(12, " ");
							return String(nodeId).padEnd(12, " ") + String(joined).padEnd(23, " ") + potentialText;
						});

					if (wireResistanceLabelsEnabled()) {

					const nodePairPad = 8;
					let nodePairTextW = Math.max(ctx.measureText(nodePairColHeader).width, ctx.measureText(nodePairHeader).width);
					for (const line of nodePairBody) {
						nodePairTextW = Math.max(nodePairTextW, ctx.measureText(line).width);
					}
					const nodePairBoxW = nodePairTextW + nodePairPad * 2;
					const nodePairRowsVisible = Math.max(1, nodePairBody.length);
					const nodePairBoxH = nodePairPad * 2 + lineH * (2 + nodePairRowsVisible);
					const nodeTablesRight = canvasW - 10;

					let nodePairX = Math.max(10, nodeTablesRight - nodePairBoxW);
					let nodePairY = junctionY - nodePairBoxH - 8;
					if (nodePairY < 8) {
						nodePairY = junctionY + junctionBoxH + 8;
					}
					if (nodePairY + nodePairBoxH > canvasH - 8) {
						nodePairY = Math.max(8, canvasH - nodePairBoxH - 8);
					}

					ctx.fillStyle = "rgba(245, 251, 255, 0.92)";
					ctx.strokeStyle = "rgba(22, 76, 112, 0.82)";
					ctx.lineWidth = 1.3;
					ctx.beginPath();
					ctx.roundRect(nodePairX, nodePairY, nodePairBoxW, nodePairBoxH, 6);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = "#14354f";
					ctx.fillText(nodePairHeader, nodePairX + nodePairPad, nodePairY + nodePairPad);
					ctx.fillText(nodePairColHeader, nodePairX + nodePairPad, nodePairY + nodePairPad + lineH);
					for (let i = 0; i < nodePairRowsVisible; i++) {
						ctx.fillStyle = nodePairRowColors[i] || "#14354f";
						ctx.fillText(nodePairBody[i] || "", nodePairX + nodePairPad, nodePairY + nodePairPad + lineH * (2 + i));
					}

					let nodeConnectionTextW = Math.max(ctx.measureText(nodeConnectionColHeader).width, ctx.measureText(nodeConnectionHeader).width);
					for (const line of nodeConnectionBody) {
						nodeConnectionTextW = Math.max(nodeConnectionTextW, ctx.measureText(line).width);
					}
					const nodeConnectionPad = 8;
					const nodeConnectionBoxW = nodeConnectionTextW + nodeConnectionPad * 2;
					const nodeConnectionRowsVisible = Math.max(1, nodeConnectionBody.length);
					const nodeConnectionBoxH = nodeConnectionPad * 2 + lineH * (2 + nodeConnectionRowsVisible);
					let nodeConnectionX = Math.max(10, nodeTablesRight - nodeConnectionBoxW);
					let nodeConnectionY = nodePairY - nodeConnectionBoxH - 8;
					if (nodeConnectionY < 8) {
						nodeConnectionY = nodePairY + nodePairBoxH + 8;
					}
					if (nodeConnectionY + nodeConnectionBoxH > canvasH - 8) {
						nodeConnectionY = Math.max(8, canvasH - nodeConnectionBoxH - 8);
					}
					ctx.fillStyle = "rgba(245, 251, 255, 0.92)";
					ctx.strokeStyle = "rgba(22, 76, 112, 0.82)";
					ctx.lineWidth = 1.3;
					ctx.beginPath();
					ctx.roundRect(nodeConnectionX, nodeConnectionY, nodeConnectionBoxW, nodeConnectionBoxH, 6);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = "#14354f";
					ctx.fillText(nodeConnectionHeader, nodeConnectionX + nodeConnectionPad, nodeConnectionY + nodeConnectionPad);
					ctx.fillText(nodeConnectionColHeader, nodeConnectionX + nodeConnectionPad, nodeConnectionY + nodeConnectionPad + lineH);
					for (let i = 0; i < nodeConnectionRowsVisible; i++) {
						ctx.fillStyle = "#14354f";
						ctx.fillText(nodeConnectionBody[i] || "", nodeConnectionX + nodeConnectionPad, nodeConnectionY + nodeConnectionPad + lineH * (2 + i));
					}
					}
					}
					ctx.restore();
				}

				drawPotentialGraph(layout) {
					return drawPotentialGraph(layout);
				}
			}

			const sceneRenderer = new CircuitSceneRenderer();

			// Initialize Kirchhoff solver with all required dependencies
			const kirchhoffSolverInstance = createKirchhoffSolver({
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
			});

			function applyViewTransformImpl() {
				const dpr = window.devicePixelRatio || 1;
				ctx.setTransform(
					dpr * state.viewZoom, 0,
					0, dpr * state.viewZoom,
					Math.round(dpr * state.viewPanX),
					Math.round(dpr * state.viewPanY)
				);
			}

			function syncCanvasWrapBoundsImpl() {
				const nextTop = "0px";
				if (canvasWrap.style.top !== nextTop) {
					canvasWrap.style.top = nextTop;
					return true;
				}
				return false;
			}

			function ensureCanvasSizeImpl() {
				const boundsChanged = syncCanvasWrapBounds();
				const dpr = window.devicePixelRatio || 1;
				const rect = canvasWrap.getBoundingClientRect();
				const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
				const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));
				const cssWidth = pixelWidth / dpr + "px";
				const cssHeight = pixelHeight / dpr + "px";

				// Only treat true pixel-size changes as resizes.
				// Minor sub-pixel jitter from getBoundingClientRect() should not re-auto-fit the graph.
				if (!boundsChanged
					&& canvas.width === pixelWidth
					&& canvas.height === pixelHeight) {
					return;
				}

				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
				canvas.style.width = cssWidth;
				canvas.style.height = cssHeight;
				applyViewTransform();
				resetGraphZoomToFit();
			}

			function renderImpl() {
				ensureCanvasSize();
				if (!state.layout
					|| !Number.isFinite(state.layout.w)
					|| !Number.isFinite(state.layout.h)
					|| state.layout.w < 10
					|| state.layout.h < 10) {
					rebuildLayout();
				}
				const layout = state.layout;
				updateGraphColorScale(layout);
				wireLabelCounter2D = 0;
				wireResistanceLabelQueue.length = 0;
				sliderHitAreas.length = 0;
				actionHitAreas.length = 0;
				const dpr = window.devicePixelRatio || 1;
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				applyViewTransform();
				sceneRenderer.drawGrid(layout.w, layout.h);
				sceneRenderer.drawSwitch(layout);
				sceneRenderer.drawLeftRail(layout);
				sceneRenderer.drawBottomWire(layout);
				sceneRenderer.drawBottomWireCurrentArrow(layout);
				sceneRenderer.drawNetwork(layout);
				// High-current glow overlay
				if (state.solved && isHighCurrentWarning(state.solved)) {
					const hotSegs = Array.isArray(state.sectionHighCurrentPairGeometries)
						? state.sectionHighCurrentPairGeometries
						: [];

					if (hotSegs.length > 0) {
						ctx.save();
						ctx.globalCompositeOperation = "source-over";
						const glowPasses = [
							{ blur: 16, alpha: 0.18, width: 13 },
							{ blur: 8,  alpha: 0.32, width: 7  },
							{ blur: 3,  alpha: 0.55, width: 4  }
						];
						for (const pass of glowPasses) {
							ctx.shadowColor = "rgba(255, 80, 0, 1)";
							ctx.shadowBlur = pass.blur;
							ctx.strokeStyle = `rgba(255, 120, 20, ${pass.alpha})`;
							ctx.lineWidth = pass.width;
							ctx.lineCap = "round";
							ctx.lineJoin = "round";
							for (const seg of hotSegs) {
								ctx.beginPath();
								ctx.moveTo(seg.x1, seg.y1);
								ctx.lineTo(seg.x2, seg.y2);
								ctx.stroke();
							}
						}
						ctx.shadowBlur = 0;
						ctx.restore();
					}
					// Position and show the DOM warning bar below the topbar
					const topbarRect = topbar.getBoundingClientRect();
					highCurrentWarning.style.top = (topbarRect.bottom + 6) + "px";
					highCurrentWarning.classList.add("visible");
				} else {
					highCurrentWarning.classList.remove("visible");
				}
				sceneRenderer.drawJunctionIds(layout);
				sceneRenderer.drawNodePotentials(layout);
				drawQueuedWireResistanceLabels(layout);
				drawNodesIRLabelsOverlay(layout);
				sceneRenderer.drawJunctionDebugTable(layout);
				if (state.potentialGraphMode) {
					sceneRenderer.drawPotentialGraph(layout);
				}
				drawWireLabelNodeMarkers(layout);
				drawBranchGroupingLabels(layout);
				drawWireResistanceSolveDiagnostic(layout);
				ctx.save();
				ctx.fillStyle = "#2d3a4f";
				ctx.font = "600 13px system-ui, sans-serif";
				ctx.fillText("Drag onto left or right rails to insert in series. Right-side drops on components create parallel branches (max 4).", 14, 22);
				ctx.restore();
				if (state.solved && (solutionHasInfiniteCurrent(state.solved) || state.solved.matrixSolveFailed === true || state.solved.shortCircuitWarningForced === true)) {
					const dpr = window.devicePixelRatio || 1;
					const W = canvas.width / dpr;
					ctx.save();
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					const msg = (state.solved && state.solved.matrixSolveFailed === true)
						? "Warning: Kirchhoff matrix solve failed (no unique solution). Add finite resistance to ideal paths."
						: "Warning: One or more sections have very large or effectively infinite current; add internal resistance for a physical model.";
					const pad = 10;
					const fontSize = 13;
					ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
					const textW = ctx.measureText(msg).width;
					const boxW = textW + pad * 2;
					const boxH = fontSize + pad * 2;
					const bx = (canvas.width / dpr - boxW) / 2;
					const topbarBottom = topbar.getBoundingClientRect().bottom;
					const by = topbarBottom + 8;
					ctx.fillStyle = "rgba(255, 240, 200, 0.97)";
					ctx.strokeStyle = "#c8860a";
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.roundRect(bx, by, boxW, boxH, 6);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = "#7a4800";
					ctx.textBaseline = "middle";
					ctx.textAlign = "center";
					ctx.fillText(msg, bx + boxW / 2, by + boxH / 2);
					ctx.restore();
				}
				requestAnimationFrame(render);
			}

			function resizeImpl() {
				ensureCanvasSize();
			}

			class CircuitRenderer {
				applyViewTransform() {
					return applyViewTransformImpl();
				}

				syncCanvasWrapBounds() {
					return syncCanvasWrapBoundsImpl();
				}

				ensureCanvasSize() {
					return ensureCanvasSizeImpl();
				}

				render() {
					return renderImpl();
				}

				resize() {
					return resizeImpl();
				}
			}

			const renderer = new CircuitRenderer();

			function applyViewTransform() {
				return renderer.applyViewTransform();
			}

			function syncCanvasWrapBounds() {
				return renderer.syncCanvasWrapBounds();
			}

			function ensureCanvasSize() {
				return renderer.ensureCanvasSize();
			}

			function render() {
				return renderer.render();
			}

			function resize() {
				return renderer.resize();
			}

			class InputController {
				pointerRawPos(evt) {
					const rect = canvas.getBoundingClientRect();
					return {
						rawX: evt.clientX - rect.left,
						rawY: evt.clientY - rect.top
					};
				}

				rectHit(rect, x, y) {
					return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
				}

				switchHit(layout, x, y) {
					const r = layout.switchHit;
					return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
				}

				branchSwitchHit(layout, x, y) {
					if (!layout || !Array.isArray(layout.rects)) return null;
					for (const rect of layout.rects) {
						if (!rect || !isBranchSwitch(rect.id)) continue;
						const hitLeft = rect.x - 12;
						const hitRight = rect.x + 24;
						const hitTop = rect.y - 22;
						const hitBottom = rect.y + 22;
						if (x >= hitLeft && x <= hitRight && y >= hitTop && y <= hitBottom) {
							return rect.id;
						}
					}
					return null;
				}

				pointerPos(evt) {
					const raw = this.pointerRawPos(evt);
					return {
						x: (raw.rawX - state.viewPanX) / state.viewZoom,
						y: (raw.rawY - state.viewPanY) / state.viewZoom
					};
				}

				isOverGraphPanelAtLogical(logX, logY) {
					if (!state.layout || !state.potentialGraphMode) return false;
					if (!Number.isFinite(logX) || !Number.isFinite(logY)) return false;
					const bounds = getGraphInteractionBounds(state.layout);
					if (!bounds) return false;
					return logX >= (bounds.left - GRAPH_INTERACTION_MARGIN)
						&& logX <= (bounds.right + GRAPH_INTERACTION_MARGIN)
						&& logY >= (bounds.top - GRAPH_INTERACTION_MARGIN)
						&& logY <= (bounds.bottom + GRAPH_INTERACTION_MARGIN);
				}

				isOverGraphSurface(evt) {
					const raw = this.pointerRawPos(evt);
					return this.isOverGraphSurfaceAtRaw(raw.rawX, raw.rawY);
				}

				handleDrop(dropX, dropY) {
					if (!state.drag) return;
					const id = state.drag.id;
						const wasPlacedBeforeDrop = componentIsPlaced(id);
					const layout = state.layout;
					// Use both cursor position AND dragged-component centre for hit detection
					const dragCentreX = state.drag.x;
					const dragCentreY = state.drag.y;
					const leftDirectTarget = (layout.leftSeriesItems || []).find((item) => item.id !== id && (this.rectHit(item, dropX, dropY) || this.rectHit(item, dragCentreX, dragCentreY)));
					if (leftDirectTarget) {
						const hitY = this.rectHit(leftDirectTarget, dropX, dropY) ? dropY : dragCentreY;
						const insertIndex = hitY < leftDirectTarget.y ? leftDirectTarget.leftSeriesIndex : (leftDirectTarget.leftSeriesIndex + 1);
						insertIntoLeftSeriesAt(id, insertIndex);
							if (!wasPlacedBeforeDrop) autoFitCircuitViewToCanvas();
						resetGraphZoomToFit();
						return;
					}
					const leftSeriesZone = layout.leftSeriesInsertZones.find((zone) => this.rectHit(zone, dropX, dropY) || this.rectHit(zone, dragCentreX, dragCentreY));
					if (leftSeriesZone) {
						insertIntoLeftSeriesAt(id, leftSeriesZone.insertIndex);
							if (!wasPlacedBeforeDrop) autoFitCircuitViewToCanvas();
						resetGraphZoomToFit();
						return;
					}
					const others = layout.rects.filter((r) => r.id !== id);
					// Parallel: match if cursor OR dragged-component centre is over the target body
					const parallelTarget = others.find((r) => !r.isLeftSeries && canAddParallelBranch(id, r.id) && (this.rectHit(r, dropX, dropY) || this.rectHit(r, dragCentreX, dragCentreY)));

					if (parallelTarget) {
						if (addResistorInParallel(id, parallelTarget.id)) {
								if (!wasPlacedBeforeDrop) autoFitCircuitViewToCanvas();
							resetGraphZoomToFit();
							return;
						}
					}

					const branchZone = layout.wireZones.find((zone) => this.rectHit(zone, dropX, dropY) || this.rectHit(zone, dragCentreX, dragCentreY));
					if (branchZone) {
						insertIntoBranchByTarget(id, branchZone.targetId, branchZone.mode);
							if (!wasPlacedBeforeDrop) autoFitCircuitViewToCanvas();
						resetGraphZoomToFit();
						return;
					}

					const seriesZone = layout.stageInsertZones.find((zone) => this.rectHit(zone, dropX, dropY) || this.rectHit(zone, dragCentreX, dragCentreY));
					if (seriesZone) {
						insertAsSeriesAt(id, seriesZone.insertIndex);
							if (!wasPlacedBeforeDrop) autoFitCircuitViewToCanvas();
						resetGraphZoomToFit();
					}
				}

				onPointerDown(evt) {
					const pos = this.pointerPos(evt);
					const raw = this.pointerRawPos(evt);
					const overGraphSurface = this.isOverGraphSurface(evt);
					const isLeftButton = evt.button === 0;
					const isRightButton = evt.button === 2;
					const SWITCH_TAP_DRAG_THRESHOLD = 4;
					mainSwitchTapState.active = false;
					mainSwitchTapState.moved = false;
					const hitAction = actionHitAreas.find((a) => Math.hypot(pos.x - a.x, pos.y - a.y) <= (a.radius + 3));
					if (hitAction) {
						const switchId = switchIdFromActionKey(hitAction.actionKey);
						const cellId = cellIdFromSliderKey(hitAction.actionKey, CELL_BATTERY_POLARITY_KEYS);
						if (switchId) {
							setComponentSwitchClosed(switchId, !isComponentSwitchClosed(switchId));
						}
						if (cellId) state.cellPolarityById[cellId] = getCellPolarity(cellId) * -1;
						solveCircuit();
						if (state.potentialGraphMode) {
							const fit = computeAutoFitGraphView();
							state.graphZoom = fit.zoom;
							state.graphPanX = fit.panX;
							state.graphPanY = fit.panY;
						}
						evt.preventDefault();
						return;
					}
					const hitSlider = sliderHitAreas.find((s) => Math.hypot(pos.x - s.trackX, pos.y - s.sphereY) < 10);
					if (hitSlider) {
						sliderDragState.active = true;
						sliderDragState.paramKey = hitSlider.paramKey;
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					if (overGraphSurface && (isLeftButton || isRightButton)) {
						graphDragState.active = true;
						graphDragState.mode = isRightButton ? "rotate" : (evt.shiftKey ? "tilt" : "pan");
						if (isRightButton && state.layout) {
							const graphCenter = getGraphCenter(state.layout);
							const vx = pos.x - graphCenter.x;
							const vy = pos.y - graphCenter.y;
							graphDragState.rotateLastRadius = Math.hypot(vx, vy);
							graphDragState.rotateLastAngle = Math.atan2(vy, vx);
						}
						graphDragState.lastX = pos.x;
						graphDragState.lastY = pos.y;
						canvas.setPointerCapture(evt.pointerId);
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					if (!isLeftButton) return;
					if (state.layout && this.switchHit(state.layout, pos.x, pos.y)) {
						mainSwitchTapState.active = true;
						mainSwitchTapState.moved = false;
						mainSwitchTapState.tapStartX = pos.x;
						mainSwitchTapState.tapStartY = pos.y;
						mainSwitchTapState.tapThreshold = SWITCH_TAP_DRAG_THRESHOLD;
						canvas.setPointerCapture(evt.pointerId);
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					const branchSwitchId = this.branchSwitchHit(state.layout, pos.x, pos.y);
					if (branchSwitchId) {
						const switchRect = state.layout && Array.isArray(state.layout.rects)
							? state.layout.rects.find((rect) => rect.id === branchSwitchId)
							: null;
						if (!switchRect) return;
						state.drag = {
							id: switchRect.id,
							x: switchRect.x,
							y: switchRect.y,
							offsetX: pos.x - switchRect.x,
							offsetY: pos.y - switchRect.y,
							isSwitchTapCandidate: true,
							tapStartX: pos.x,
							tapStartY: pos.y,
							tapThreshold: SWITCH_TAP_DRAG_THRESHOLD
						};
						canvas.setPointerCapture(evt.pointerId);
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					const hit = state.layout.rects.find((rect) => this.rectHit(rect, pos.x, pos.y));
					if (!hit) {
						// Only allow whole-canvas panning outside the circuit interaction region.
						if (!this.isOverGraphPanelAtLogical(pos.x, pos.y)) {
							viewDragState.active = true;
							viewDragState.lastRawX = raw.rawX;
							viewDragState.lastRawY = raw.rawY;
							canvas.setPointerCapture(evt.pointerId);
							canvas.style.cursor = "grabbing";
							evt.preventDefault();
						}
						return;
					}
					state.drag = {
						id: hit.id,
						x: hit.x,
						y: hit.y,
						offsetX: pos.x - hit.x,
						offsetY: pos.y - hit.y,
						isSwitchTapCandidate: false,
						tapStartX: pos.x,
						tapStartY: pos.y,
						tapThreshold: SWITCH_TAP_DRAG_THRESHOLD
					};
					canvas.setPointerCapture(evt.pointerId);
					canvas.style.cursor = "grabbing";
				}

				onPointerMove(evt) {
					const pos = this.pointerPos(evt);
					const raw = this.pointerRawPos(evt);
					if (mainSwitchTapState.active) {
						const moved = Math.hypot(pos.x - mainSwitchTapState.tapStartX, pos.y - mainSwitchTapState.tapStartY);
						if (moved > (mainSwitchTapState.tapThreshold || 4)) {
							mainSwitchTapState.moved = true;
						}
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					if (graphDragState.active) {
						const dx = pos.x - graphDragState.lastX;
						const dy = pos.y - graphDragState.lastY;
						if (graphDragState.mode === "rotate") {
							if (state.layout) {
								const graphCenter = getGraphCenter(state.layout);
								const vx = pos.x - graphCenter.x;
								const vy = pos.y - graphCenter.y;
								const radius = Math.hypot(vx, vy);
								const angle = Math.atan2(vy, vx);
								const minOrbitRadius = 8;
								if (radius > minOrbitRadius && graphDragState.rotateLastRadius > minOrbitRadius && Number.isFinite(graphDragState.rotateLastAngle)) {
									const deltaAngle = Math.atan2(
										Math.sin(angle - graphDragState.rotateLastAngle),
										Math.cos(angle - graphDragState.rotateLastAngle)
									);
									state.graphAzimuth += deltaAngle;
								}
								graphDragState.rotateLastRadius = radius;
								graphDragState.rotateLastAngle = angle;
							}
						} else if (graphDragState.mode === "tilt") {
							state.graphRoll += dx * 0.010;
							state.graphElevation = clamp(state.graphElevation - dy * 0.010, 0.24, 1.22);
						} else {
							state.graphPanX += dx;
							state.graphPanY += dy;
						}
						graphDragState.lastX = pos.x;
						graphDragState.lastY = pos.y;
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					if (viewDragState.active) {
						const dx = raw.rawX - viewDragState.lastRawX;
						const dy = raw.rawY - viewDragState.lastRawY;
						state.viewPanX += dx;
						state.viewPanY += dy;
						viewDragState.lastRawX = raw.rawX;
						viewDragState.lastRawY = raw.rawY;
						canvas.style.cursor = "grabbing";
						evt.preventDefault();
						return;
					}
					if (sliderDragState.active) {
						const s = sliderHitAreas.find((item) => item.paramKey === sliderDragState.paramKey);
						if (!s) return;
						const t = clamp((pos.y - s.trackTop) / (s.trackBottom - s.trackTop), 0, 1);
						const rawValue = s.max - t * (s.max - s.min);
						const snapped = Math.round(rawValue / s.step) * s.step;
						const decimals = s.step < 1 ? 1 : 0;
						const value = Number(clamp(snapped, s.min, s.max).toFixed(decimals));
						const cellEmfId = cellIdFromSliderKey(s.paramKey, CELL_EMF_SLIDER_KEYS);
						const cellRInternalId = cellIdFromSliderKey(s.paramKey, CELL_R_INTERNAL_KEYS);
						if (cellEmfId) {
							state.cellEmfById[cellEmfId] = value;
						} else if (cellRInternalId) {
							state.cellRInternalById[cellRInternalId] = value;
						} else {
							state.resistorValues[s.paramKey] = value;
							syncResistorValueInput(s.paramKey);
						}
						solveCircuit();
						if (state.potentialGraphMode) {
							const fit = computeAutoFitGraphView();
							state.graphZoom = fit.zoom;
							state.graphPanX = fit.panX;
							state.graphPanY = fit.panY;
						}
						evt.preventDefault();
						return;
					}
					if (!state.drag) {
						const actionHover = actionHitAreas.some((a) => Math.hypot(pos.x - a.x, pos.y - a.y) <= (a.radius + 3));
						if (actionHover) {
							canvas.style.cursor = "pointer";
							return;
						}
						const sliderHover = sliderHitAreas.some((s) => Math.hypot(pos.x - s.trackX, pos.y - s.sphereY) < 10);
						if (sliderHover) {
							canvas.style.cursor = "grab";
							return;
						}
						const hover = !!state.layout && Array.isArray(state.layout.rects)
							&& state.layout.rects.some((rect) => this.rectHit(rect, pos.x, pos.y));
						if (hover) { canvas.style.cursor = "grab"; return; }
						if (this.isOverGraphSurface(evt)) {
							canvas.style.cursor = "grab";
							return;
						}
						canvas.style.cursor = "grab";
						return;
					}
					if (state.drag.isSwitchTapCandidate) {
						const moved = Math.hypot(pos.x - state.drag.tapStartX, pos.y - state.drag.tapStartY);
						if (moved > (state.drag.tapThreshold || 4)) {
							state.drag.isSwitchTapCandidate = false;
						}
					}
					state.drag.x = pos.x - state.drag.offsetX;
					state.drag.y = pos.y - state.drag.offsetY;
				}

				finishDrag(evt) {
					if (mainSwitchTapState.active) {
						const moved = mainSwitchTapState.moved;
						mainSwitchTapState.active = false;
						mainSwitchTapState.moved = false;
						if (!moved) {
							setComponentSwitchClosed(MAIN_SWITCH_ID, !isComponentSwitchClosed(MAIN_SWITCH_ID));
							solveCircuit();
							if (state.potentialGraphMode) {
								const fit = computeAutoFitGraphView();
								state.graphZoom = fit.zoom;
								state.graphPanX = fit.panX;
								state.graphPanY = fit.panY;
							}
						}
						canvas.style.cursor = "default";
						return;
					}
					if (graphDragState.active) {
						graphDragState.active = false;
						canvas.style.cursor = "default";
						return;
					}
					if (viewDragState.active) {
						viewDragState.active = false;
						canvas.style.cursor = "default";
						return;
					}
					if (sliderDragState.active) {
						sliderDragState.active = false;
						sliderDragState.paramKey = null;
						canvas.style.cursor = "default";
						return;
					}
					if (!state.drag) return;
					if (state.drag.isSwitchTapCandidate && isBranchSwitch(state.drag.id)) {
						setComponentSwitchClosed(state.drag.id, !isComponentSwitchClosed(state.drag.id));
						solveCircuit();
						if (state.potentialGraphMode) {
							const fit = computeAutoFitGraphView();
							state.graphZoom = fit.zoom;
							state.graphPanX = fit.panX;
							state.graphPanY = fit.panY;
						}
						state.drag = null;
						canvas.style.cursor = "default";
						return;
					}
					const pos = this.pointerPos(evt);
					this.handleDrop(pos.x, pos.y);
					state.drag = null;
					canvas.style.cursor = "default";
				}

				onWheel(evt) {
					evt.preventDefault();
					const overGraph = this.isOverGraphSurface(evt);
					if (overGraph) {
						const raw = this.pointerRawPos(evt);
						const factor = evt.deltaY < 0 ? 1.16 : 0.86;
						this.zoomGraphAtRaw(raw.rawX, raw.rawY, factor);
					} else {
						const raw = this.pointerRawPos(evt);
						const factor = evt.deltaY < 0 ? 1.08 : 0.92;
						const newZoom = clamp(state.viewZoom * factor, 0.25, 4.0);
						state.viewPanX = raw.rawX - (raw.rawX - state.viewPanX) * (newZoom / state.viewZoom);
						state.viewPanY = raw.rawY - (raw.rawY - state.viewPanY) * (newZoom / state.viewZoom);
						state.viewZoom = newZoom;
					}
				}

				zoomGraphAtRaw(rawX, rawY, factor) {
					if (!state.layout) return;
					if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(factor) || factor <= 0) return;
					const oldZoom = state.graphZoom;
					const newZoom = clamp(oldZoom * factor, 0.35, 4.0);
					if (!Number.isFinite(oldZoom) || oldZoom <= 0 || Math.abs(newZoom - oldZoom) < 1e-9) {
						state.graphZoom = newZoom;
						return;
					}
					const anchorX = (rawX - state.viewPanX) / state.viewZoom;
					const anchorY = (rawY - state.viewPanY) / state.viewZoom;
					const graphCenter = getGraphBaseCenter(state.layout);
					const graphCenterX = graphCenter.x;
					const graphCenterY = graphCenter.y;
					const oldOriginX = graphCenterX + state.graphPanX;
					const oldOriginY = graphCenterY + state.graphPanY;
					const ratio = newZoom / oldZoom;
					const newOriginX = anchorX - (anchorX - oldOriginX) * ratio;
					const newOriginY = anchorY - (anchorY - oldOriginY) * ratio;
					state.graphPanX = newOriginX - graphCenterX;
					state.graphPanY = newOriginY - graphCenterY;
					state.graphZoom = newZoom;
				}

				onContextMenu(evt) {
					if (!this.isOverGraphSurface(evt)) return;
					evt.preventDefault();
				}

				getTouchDistance(touch1, touch2) {
					const dx = touch1.clientX - touch2.clientX;
					const dy = touch1.clientY - touch2.clientY;
					return Math.sqrt(dx * dx + dy * dy);
				}

				getTouchCentroid(touches) {
					let totalX = 0, totalY = 0;
					for (let i = 0; i < touches.length; i++) {
						totalX += touches[i].clientX;
						totalY += touches[i].clientY;
					}
					return {
						clientX: totalX / touches.length,
						clientY: totalY / touches.length
					};
				}

				onTouchStart(evt) {
					if (evt.touches.length !== 2) return;
					evt.preventDefault();
					touchState.active = true;
					touchState.firstTouchId = evt.touches[0].identifier;
					const touch1 = evt.touches[0];
					const touch2 = evt.touches[1];
					touchState.lastDistance = this.getTouchDistance(touch1, touch2);
					const centroid = this.getTouchCentroid(evt.touches);
					const rect = canvas.getBoundingClientRect();
					const localX = centroid.clientX - rect.left;
					const localY = centroid.clientY - rect.top;
					touchState.isOverGraph = this.isOverGraphSurfaceAtRaw(localX, localY);
				}

				onTouchMove(evt) {
					if (!touchState.active || evt.touches.length !== 2) return;
					evt.preventDefault();
					const touch1 = evt.touches[0];
					const touch2 = evt.touches[1];
					const newDistance = this.getTouchDistance(touch1, touch2);
					if (touchState.lastDistance > 0) {
						const scale = newDistance / touchState.lastDistance;
						const centroid = this.getTouchCentroid(evt.touches);
						const rect = canvas.getBoundingClientRect();
						const localX = centroid.clientX - rect.left;
						const localY = centroid.clientY - rect.top;
						if (touchState.isOverGraph) {
							this.zoomGraphAtRaw(localX, localY, scale);
						} else {
							const newZoom = clamp(state.viewZoom * scale, 0.25, 4.0);
							state.viewPanX = localX - (localX - state.viewPanX) * (newZoom / state.viewZoom);
							state.viewPanY = localY - (localY - state.viewPanY) * (newZoom / state.viewZoom);
							state.viewZoom = newZoom;
						}
					}
					touchState.lastDistance = newDistance;
				}

				onTouchEnd(evt) {
					if (evt.touches.length < 2) {
						touchState.active = false;
						touchState.lastDistance = 0;
						touchState.firstTouchId = null;
					}
				}

				isOverGraphSurfaceAtRaw(rawX, rawY) {
					if (!state.layout || !state.potentialGraphMode) {
						return false;
					}
					const logX = (rawX - state.viewPanX) / state.viewZoom;
					const logY = (rawY - state.viewPanY) / state.viewZoom;
					return this.isOverGraphPanelAtLogical(logX, logY);
				}

				updatePotentialGraphVisibility() {
					potentialGraphChip.style.display = "inline-flex";
				}

				bindCanvasEvents() {
					canvas.addEventListener("pointerdown", this.onPointerDown.bind(this));
					canvas.addEventListener("pointermove", this.onPointerMove.bind(this));
					canvas.addEventListener("pointerup", this.finishDrag.bind(this));
					canvas.addEventListener("pointercancel", this.finishDrag.bind(this));
					canvas.addEventListener("contextmenu", this.onContextMenu.bind(this));
					canvas.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
					canvas.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
					canvas.addEventListener("touchmove", this.onTouchMove.bind(this), { passive: false });
					canvas.addEventListener("touchend", this.onTouchEnd.bind(this), { passive: false });
				}

				bindUiEvents() {
					resistorDefs.forEach((r) => {
						ui[r.id].addEventListener("input", () => {
							if (ui[r.id].checked) {
								if (!componentIsPlaced(r.id)) {
									state.stages.push({ branches: [[r.id]] });
								}
							} else {
								removeResistorFromStages(r.id);
								removeFromLeftSeries(r.id);
							}
							autoFitCircuitViewToCanvas();
							resetGraphZoomToFit();
						});

						rValueInputs[r.id].addEventListener("input", () => {
							const raw = Number(rValueInputs[r.id].value);
							if (!Number.isFinite(raw)) return;
							const val = Number(clamp(raw, 0.1, 10).toFixed(1));
							state.resistorValues[r.id] = val;
							rValueInputs[r.id].value = val.toFixed(1);
							solveCircuit();
							if (state.potentialGraphMode) {
								const fit = computeAutoFitGraphView();
								state.graphZoom = fit.zoom;
								state.graphPanX = fit.panX;
								state.graphPanY = fit.panY;
							}
						});

						rValueInputs[r.id].addEventListener("change", () => {
							const raw = Number(rValueInputs[r.id].value);
							const val = Number.isFinite(raw) ? Number(clamp(raw, 0.1, 10).toFixed(1)) : (state.resistorValues[r.id] || 2.5);
							state.resistorValues[r.id] = val;
							rValueInputs[r.id].value = val.toFixed(1);
							solveCircuit();
							if (state.potentialGraphMode) {
								const fit = computeAutoFitGraphView();
								state.graphZoom = fit.zoom;
								state.graphPanX = fit.panX;
								state.graphPanY = fit.panY;
							}
						});
					});

					for (const id of EXTRA_SWITCH_IDS) {
						const check = switchChecks[id];
						if (!check) continue;
						check.addEventListener("input", () => {
							if (check.checked) {
								if (!componentIsPlaced(id)) {
									state.stages.push({ branches: [[id]] });
								}
							} else {
								removeResistorFromStages(id);
								removeFromLeftSeries(id);
							}
							autoFitCircuitViewToCanvas();
							resetGraphZoomToFit();
						});
					}

					intRCheck.addEventListener("input", () => {
						state.internalR = intRCheck.checked;
						resetGraphZoomToFit();
					});

					for (const id of EXTRA_CELL_IDS) {
						const check = cellChecks[id];
						if (!check) continue;
						check.addEventListener("input", () => {
							if (check.checked) {
								if (!componentIsPlaced(id)) {
									state.leftSeries.unshift(id);
								}
							} else {
								removeResistorFromStages(id);
								removeFromLeftSeries(id);
							}
							autoFitCircuitViewToCanvas();
							resetGraphZoomToFit();
						});
					}

					voltageColorCheck.addEventListener("input", () => {
						state.voltageColorMode = voltageColorCheck.checked;
						this.updatePotentialGraphVisibility();
						resetGraphZoomToFit();
					});

					potentialGraphCheck.addEventListener("input", () => {
						state.potentialGraphMode = potentialGraphCheck.checked;
						if (state.potentialGraphMode) {
						// Auto-enable voltage color mode when graph is turned on
						state.voltageColorMode = true;
						voltageColorCheck.checked = true;
							autoFitCircuitViewToCanvas();
						}
						resetGraphZoomToFit();
					});

					invertVoltageAxisCheck.addEventListener("input", () => {
						state.invertVoltageAxis = invertVoltageAxisCheck.checked;
						resetGraphZoomToFit();
					});

					if (debugModeCheck) {
						debugModeCheck.addEventListener("input", () => {
							setDebugControlsVisible(debugModeCheck.checked);
						});
					}

					debugLabelsCheck.addEventListener("input", () => {
						state.debugLabels = debugLabelsCheck.checked;
					});

					if (debugJunctionIdsCheck) {
						debugJunctionIdsCheck.addEventListener("input", () => {
							state.debugJunctionIds = debugJunctionIdsCheck.checked;
						});
					}

					if (debugNodePotentialsCheck) {
						debugNodePotentialsCheck.addEventListener("input", () => {
							state.debugNodePotentials = debugNodePotentialsCheck.checked;
						});
					}

					wireResLabelsCheck.addEventListener("input", () => {
						state.wireResistanceLabels = wireResLabelsCheck.checked;
					});

					if (nodesIRLabelsCheck) {
						nodesIRLabelsCheck.addEventListener("input", () => {
							state.nodesIRLabels = nodesIRLabelsCheck.checked;
						});
					}
				}

				install() {
					this.bindCanvasEvents();
					this.bindUiEvents();
				}
			}

			const inputController = new InputController();
			inputController.install();
			setDebugControlsVisible(!!(debugModeCheck && debugModeCheck.checked));

			function setSideMenuOpen(open) {
				sideMenu.classList.toggle("hidden", !open);
				sideMenuToggle.classList.toggle("menu-open", open);
			}

			function setComponentMenuOpen(open) {
				componentMenu.classList.toggle("hidden", !open);
				componentMenuToggle.classList.toggle("menu-open", open);
			}

			sideMenuToggle.addEventListener("click", () => setSideMenuOpen(true));
			sideMenuClose.addEventListener("click", () => setSideMenuOpen(false));
			componentMenuToggle.addEventListener("click", () => setComponentMenuOpen(true));
			componentMenuClose.addEventListener("click", () => setComponentMenuOpen(false));

			window.addEventListener("resize", resize);
			new ResizeObserver(resize).observe(topbar);
			new ResizeObserver(resize).observe(app);
			inputController.updatePotentialGraphVisibility();
			resistorDefs.forEach((r) => syncResistorValueInput(r.id));
			resetStagesFromEnabled();
			resize();
			requestAnimationFrame(render);
		}
	}

	new CircuitApp();
