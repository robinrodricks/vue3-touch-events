import { Plugin } from "vue";

declare const Vue3TouchEvents: Plugin<Vue3TouchEventsOptions & undefined>;

export interface Vue3TouchEventsOptions {

	// CORE
	touchClass?: string,
	namespace?: string,

	// CLICK/TAP
	disableClick?: boolean,
	tapTolerance?: number,
	touchHoldTolerance?: number,
	longTapTimeInterval?: number,
	rollOverFrequency?: number,

	// DRAG
	dragFrequency?: number,
	dragOutside?: boolean,

	// SWIPE
	swipeTolerance?: number,
	swipeConeSize?: number,

	// ZOOM
	zoomFrequency?: number,
	zoomDistance?: number,
	zoomInOutDistance?: number,
}

export default Vue3TouchEvents;
