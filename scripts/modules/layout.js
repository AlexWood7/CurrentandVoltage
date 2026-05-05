import {
	BUS_CONNECTOR,
	CONNECTOR_WIRE,
	END_BUS_CONNECTOR,
	INSERT_RAIL_DIST,
	PARALLEL_GAP,
	RES_H,
	RES_W
} from "./constants.js";

export class CircuitLayoutEngine {
	constructor(state, componentBodyHeight) {
		this.state = state;
		this.componentBodyHeight = componentBodyHeight;
	}

	computeLayout(w, h) {
		const state = this.state;
		const componentBodyHeight = this.componentBodyHeight;
		const midY = h * 0.5;
		const graphShift = state.potentialGraphMode ? Math.round(w * 0.5 - 30) : 0;
		const xCell = Math.max(110, w * 0.24 - graphShift);
		const maxXRight = state.potentialGraphMode ? Math.round(w * 0.5 - 15) : (w - 110);
		const xRight = Math.min(maxXRight, xCell + 270);
		const switchAnchorX = Math.min(xRight - 34, (xCell + xRight) * 0.5 + 26);
		const xSwitch = (((xCell + 34) + (switchAnchorX - 28)) * 0.5) - 20;
		const activeStages = state.stages.slice();

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
			switchHit: { left: xSwitch - 30, right: xSwitch + 30, top: yTop - 24, bottom: yTop + 16 }
		};
	}
}
