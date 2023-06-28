import {Plugin} from "vue";

declare const Vue3TouchEvents: Plugin<Vue3TouchEventsOptions>;

export interface Vue3TouchEventsOptions {
  disableClick?: boolean;
  touchClass?: string;
  tapTolerance?: number;
  swipeTolerance?: number;
  longTapTimeInterval?: number;
}

export default Vue3TouchEvents;
