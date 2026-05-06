import { graphOrientationDefaults, resistorDefs } from "./constants.js";

export function createInitialState() {
	return {
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
		debugLabels: false,
		debugJunctionIds: false,
		debugNodePotentials: false,
		wireResistanceLabels: false,
		sectionColorByPairKey: {},
		wireLabelNodePairRows: [],
		graphAzimuth: graphOrientationDefaults.azimuth,
		graphElevation: graphOrientationDefaults.elevation,
		graphRoll: graphOrientationDefaults.roll,
		graphZoom: 1.41,
		graphPanX: 0,
		graphPanY: 0,
		viewZoom: 1,
		viewPanX: 0,
		viewPanY: 0,
		cellEmfById: { Cell1: 6, Cell2: 6, Cell3: 6, Cell4: 6 },
		cellPolarityById: { Cell1: 1, Cell2: 1, Cell3: 1, Cell4: 1 },
		cellRInternalById: { Cell1: 1, Cell2: 1, Cell3: 1, Cell4: 1 },
		switchClosedById: { MAIN_SWITCH: true, S1: true, S2: true, S3: true, S4: true },
		useShortSwitchWireResistance: false,
		resistorValues: Object.fromEntries(resistorDefs.map((r) => [r.id, r.value])),
		solved: { byId: {}, Itotal: 0, stageNodeV: [0], Vext: 0, switchVLeft: 0, switchVRight: 0, cellTopPlateV: 0, vMin: 0, vMax: 1 }
	};
}
