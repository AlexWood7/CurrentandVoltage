// Component definitions - Resistors with IDs and default values (ohms)
export const resistorDefs = [
	{ id: "R1", value: 2.5 },
	{ id: "R2", value: 5.0 },
	{ id: "R3", value: 7.5 },
	{ id: "R4", value: 10.0 },
	{ id: "R5a", value: 5.0 },
	{ id: "R5b", value: 5.0 },
	{ id: "P1", value: 5.0 }
];

// Available EMF cells (batteries) - up to 4 cells can be added to the circuit
export const EXTRA_CELL_IDS = ["Cell1", "Cell2", "Cell3", "Cell4"];

// Available switches - up to 4 switches can be added to the circuit
export const EXTRA_SWITCH_IDS = ["S1", "S2", "S3", "S4"];

// 3D graph visualization - Default orientation angles (radians)
// Used for the initial perspective view of the potential graph
export const graphOrientationDefaults = {
	azimuth: 0.900,      // Horizontal rotation (0 = front)
	elevation: 1.220,    // Vertical tilt angle
	roll: -0.110         // Roll/tilt around the view axis
};

// Graph rendering constants - Control spacing and scaling of the potential graph
export const GRAPH_VOLTS_TO_HEIGHT = 14;        // Pixels per volt - controls vertical scaling
export const GRAPH_XY_SCALE_BASE = 1;           // Base scaling factor for X/Y dimensions
export const GRAPH_VERTICAL_MARGIN = 36;        // Top/bottom margin in pixels
export const GRAPH_AUTO_FIT_SCALE = 0.92;       // Scale factor when auto-fitting graph to view
export const GRAPH_MIN_AUTO_ZOOM = 0.35;        // Minimum zoom level when auto-fitting
export const GRAPH_CIRCUIT_MARGIN = 40;         // Margin around circuit elements in pixels
export const GRAPH_SIDE_MARGIN = 12;            // Left/right margin in pixels
export const GRAPH_PATH_HALF_WIDTH = 18;        // Half-width of path lines in the graph (for rendering thickness)

// Connector and EMF constants - Geometric dimensions for circuit drawing
export const CONNECTOR_WIRE = 18.5;              // Wire connector width/radius in pixels
export const BUS_CONNECTOR = 18.5;               // Bus (main rail) connector size
export const END_BUS_CONNECTOR = 18.5;           // End-of-bus connector size
export const MAX_PARALLEL_BRANCHES = 4;          // Maximum number of branches allowed in parallel
export const EMF_BODY_HEIGHT = 60;               // Height of EMF (battery) symbol in pixels
export const CELL_PADDING = 14;                  // Padding around cell symbols

// Resistor layout dimensions - Control physical positioning and spacing on canvas
export const RES_W = 50;                         // Resistor width in pixels
export const RES_H = 90;                         // Resistor height in pixels
export const RE_LEAD_TOP = 37;                   // Top lead length for resistors
export const RES_LEAD_BOTTOM = 37;               // Bottom lead length for resistors
export const RES_PITCH = RES_H + RE_LEAD_TOP + RES_LEAD_BOTTOM;  // Total vertical spacing for resistors
export const SERIES_LEAD_BOTTOM = 37;            // Bottom lead length when resistors are in series
export const SERIES_PITCH = RES_H + RE_LEAD_TOP + SERIES_LEAD_BOTTOM;  // Total vertical spacing in series
export const PARALLEL_GAP = 104;                 // Horizontal gap between parallel resistors
export const INSERT_RAIL_DIST = 90;              // Distance to insertion rail
export const STAGE_GAP = 37;                     // Vertical gap between parallel stages
export const PARALLEL_MULTI_STAGE_LEAD_TOP_BOOST = 23;     // Extra top spacing for multi-stage parallel
export const PARALLEL_MULTI_STAGE_LEAD_BOTTOM_BOOST = 23;  // Extra bottom spacing for multi-stage parallel
export const PARALLEL_PAIR_STAGE_GAP_BOOST = 14;           // Extra gap between parallel pair stages
export const INTERNAL_R_HEIGHT_EXTRA = 111;      // Extra height needed for internal resistance display
export const SINGLE_RESISTOR_INTERNAL_MIN_HEIGHT = 200;    // Minimum height for single resistor with internal R
export const NO_INTERNAL_TOP_LAYOUT_GAP_BOOST = 14;        // Gap adjustment when not showing internal R
export const COMPONENT_RAMP_OVERSHOOT = 8;      // Overshoot distance for component ramp paths
export const INTERNAL_COMBO_CENTER_OFFSET = 68.5;          // Offset for internal resistance combo positioning

// Electrical parameters - Control solver behavior and component properties
export const RESISTOR_VALUE_MIN = 0.1;                      // Minimum selectable resistance in ohms
export const RESISTOR_VALUE_MAX = 10;                       // Maximum selectable resistance in ohms
export const SHORT_WIRE_R_PER_PIXEL = 0.000000001;          // Resistance per pixel for wire segments (1 nΩ/px)
export const SHORT_CIRCUIT_CURRENT_THRESHOLD_A = 5;         // Current threshold (A) above which circuit is "short"
export const HIGH_CURRENT_WARNING_THRESHOLD_A = 10000;      // Current threshold (A) for high-current glow warning
export const GRAPH_COMPONENT_MIN_WIDTH_FACTOR = 0.10;        // Minimum relative width factor for component paths (10%)
export const SWITCH_OPEN_RESISTANCE = 1e9;                   // Open switch resistance in ohms (1 GΩ - near-infinite)

// Default component references - Primary cells used as voltage sources
export const PRIMARY_CELL_ID = "Cell1";                      // Primary battery in the circuit
export const CELL2_ID = "Cell2";                             // Secondary battery (for multi-cell scenarios)
