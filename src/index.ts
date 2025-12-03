/**
 * @project   vue3-touch-events
 * @author    Robin Rodricks, Xavier Julien, Jerry Bendy
 * @since     30/4/2021
 * @url       https://github.com/robinrodricks/vue3-touch-events
 */

// Types for Vue and DOM events
import { App, Plugin, Directive, DirectiveBinding } from 'vue'

// Interface for touch event options
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

// Interface for touch object internal state
interface TouchObject {
	element: HTMLElement
	callbacks: { [key: string]: DirectiveBinding[] }
	hasBindTouchEvents: boolean
	options: Vue3TouchEventsOptions
	events: { [key: string]: [EventTarget, EventListener] }
	touchStarted?: boolean
	touchMoved?: boolean
	swipeOutBounded?: boolean
	isZooming?: boolean
	startX?: number
	startY?: number
	currentX?: number
	currentY?: number
	touchStartTime?: number
	lastTouchStartTime?: number
	lastTouchEndTime?: number
	touchHoldTimer?: ReturnType<typeof setTimeout> | null
	touchRollTime?: number
	touchDragTime?: number
	touchZoomTime?: number
	initialZoomDistance?: number
	hasSwipe?: boolean
	hasZoom?: boolean
}

// Helper function to get X coordinate from touch/mouse event
function touchX(event: MouseEvent | TouchEvent): number {
	if (event.type.indexOf('mouse') !== -1) {
		return (event as MouseEvent).clientX;
	}
	return (event as TouchEvent).touches?.[0]?.clientX ?? 0;
}

// Helper function to get Y coordinate from touch/mouse event
function touchY(event: MouseEvent | TouchEvent): number {
	if (event.type.indexOf('mouse') !== -1) {
		return (event as MouseEvent).clientY;
	}
	return (event as TouchEvent).touches?.[0]?.clientY ?? 0;
}

// Main Vue Touch Events plugin
const Vue3TouchEvents: Plugin<Partial<Vue3TouchEventsOptions>> = {
	install(app: App, constructorOptions?: Partial<Vue3TouchEventsOptions>) {

		// Default global options merged with constructor options
		var globalOptions: Vue3TouchEventsOptions = Object.assign({}, {

			// CORE
			touchClass: '',
			namespace: 'touch',

			// CLICK/TAP
			disableClick: false,
			tapTolerance: 10,  // px
			touchHoldTolerance: 400,  // ms
			longTapTimeInterval: 400,  // ms
			rollOverFrequency: 100, // ms

			// DRAG
			dragFrequency: 10, // ms
			dragOutside: false,

			// SWIPE
			swipeTolerance: 100,  // px
			swipeConeSize: 0.75, // number between 0 to 1

			// ZOOM
			zoomFrequency: 10, // ms
			zoomDistance: 10, // px
			zoomInOutDistance: 100, // px

			// NOTE: When adding props here, update `index.d.ts` as well!!


		}, constructorOptions);

		/** Fired when the user performs a MOUSE DOWN on the object */
		function touchStartEvent(event: MouseEvent | TouchEvent) {
			var $this = this.$$touchObj,
				isTouchEvent = event.type.indexOf('touch') >= 0,
				isMouseEvent = event.type.indexOf('mouse') >= 0,
				$el = this;

			if (isTouchEvent) {
				$this.lastTouchStartTime = event.timeStamp;
			}

			if (isMouseEvent && $this.lastTouchStartTime && event.timeStamp - $this.lastTouchStartTime < 350) {
				return;
			}

			if ($this.touchStarted) {
				return;
			}

			addTouchClass(this);

			$this.touchStarted = true; // always true while the element is being PRESSED

			$this.touchMoved = false; // true only when the element is PRESSED and DRAGGED a bit
			$this.swipeOutBounded = false;
			$this.isZooming = false;

			$this.startX = touchX(event);
			$this.startY = touchY(event);

			$this.currentX = 0; // always updated with the last mouse X/Y while over the element
			$this.currentY = 0;

			$this.touchStartTime = event.timeStamp;

			// performance: only process swipe events if `swipe.*` event is registered on this element
			$this.hasSwipe = hasEvent($this, 'swipe')
				|| hasEvent($this, 'swipe.left') || hasEvent($this, 'swipe.right')
				|| hasEvent($this, 'swipe.top') || hasEvent($this, 'swipe.bottom');

			// performance: only process zoom events if `zoom.*` event is registered on this element
			$this.hasZoom = hasEvent($this, 'zoom') || hasEvent($this, 'zoom.in') || hasEvent($this, 'zoom.out');

			// performance: only start hold timer if the `hold` event is registered on this element
			if (hasEvent($this, 'hold')) {

				// Trigger touchhold event after `touchHoldTolerance` MS
				$this.touchHoldTimer = setTimeout(function () {
					$this.touchHoldTimer = null;
					triggerEvent(event, $el, 'hold');
				}, $this.options.touchHoldTolerance);
			}

			triggerEvent(event, this, 'press');
		}

		/** 
		Fired when the user MOVES the mouse over the window.
		*/
		function touchMoveEventWindow(event: MouseEvent | TouchEvent) {

			// only process if pressed
			var $this = this.$$touchObj as TouchObject;
			if ($this.touchStarted == true) {

				// process event and pass 'this' onward
				touchMoveEvent(event, $this, false);

			} else {

				// TODO: mobile support
				// if rollover events are wanted and this is a mouse event
				if (hasEvent($this, 'rollover') && event.clientX != null) {
					var mouseEvent: MouseEvent = event as MouseEvent;

					// if the mouse is actually over this object (within this obj's bounds)
					const rect = $this.element.getBoundingClientRect();
					if (mouseEvent.clientX >= rect.left && mouseEvent.clientX <= rect.right &&
						mouseEvent.clientY >= rect.top && mouseEvent.clientY <= rect.bottom) {

						// process rollovers only and pass 'this' onward
						touchMoveEvent(event, $this, true);
					}
				}
			}
		}

		/** 
		Fired when the user DRAGS the object or MOVES the mouse over the object.
		*/
		function touchMoveEvent(event: MouseEvent | TouchEvent, $this: TouchObject = null, onlyProcessRollover: boolean = false) {

			if ($this == null) $this = this.$$touchObj as TouchObject;

			var curX = touchX(event);
			var curY = touchY(event);

			var movedAgain = ($this.currentX != curX) || ($this.currentY != curY);

			$this.currentX = curX;
			$this.currentY = curY;

			// dont process if only rollover wanted!
			if (!onlyProcessRollover) {

				//--------------------------------------------------------------------------------------
				//									DRAG ONCE
				//--------------------------------------------------------------------------------------
				if (!$this.touchMoved) {
					var tapTolerance = $this.options.tapTolerance;

					$this.touchMoved = Math.abs($this.startX - $this.currentX) > tapTolerance ||
						Math.abs($this.startY - $this.currentY) > tapTolerance;

					// trigger `drag.once` only once after mouse FIRST moved while dragging the element
					// (`touchMoved` is the flag that indicates we no longer need to trigger this)
					if ($this.touchMoved) {
						cancelTouchHoldTimer($this);
						triggerEvent(event, $this.element, 'drag.once');
					}

				}

				//--------------------------------------------------------------------------------------
				//										SWIPE
				//--------------------------------------------------------------------------------------
				// performance: only process swipe events if `swipe.*` event is registered on this element
				else if ($this.hasSwipe && !$this.swipeOutBounded) {
					var swipeOutBounded = $this.options.swipeTolerance;

					// Process swipe events using cones
					if (Math.abs($this.startX - $this.currentX) / Math.abs($this.startY - $this.currentY) > $this.options.swipeConeSize &&
						Math.abs($this.startY - $this.currentY) / Math.abs($this.startX - $this.currentX) > $this.options.swipeConeSize) {
						$this.swipeOutBounded = (Math.abs($this.startY - $this.currentY) < swipeOutBounded) && (Math.abs($this.startX - $this.currentX) < swipeOutBounded)
					}
				}
			}

			//--------------------------------------------------------------------------------------
			//									ROLL OVER
			//--------------------------------------------------------------------------------------
			// only trigger `rollover` event if cursor actually moved over this element
			if (movedAgain && hasEvent($this, 'rollover')) {

				// throttle the `rollover` event based on `rollOverFrequency`
				var now = event.timeStamp;
				if ($this.touchRollTime == null || now > ($this.touchRollTime + $this.options.rollOverFrequency)) {
					$this.touchRollTime = now;

					triggerEvent(event, $this.element, 'rollover');
				}
			}

			// exit if only rollovers wanted!
			if (onlyProcessRollover) {
				return;
			}

			//--------------------------------------------------------------------------------------
			//										DRAG
			//--------------------------------------------------------------------------------------
			// only trigger `drag` event if cursor actually moved and if we are still dragging this element
			if ($this.touchStarted && $this.touchMoved && movedAgain && hasEvent($this, 'drag')) {

				// throttle the `drag` event based on `dragFrequency`
				var now = event.timeStamp;
				if ($this.touchDragTime == null || now > ($this.touchDragTime + $this.options.dragFrequency)) {
					$this.touchDragTime = now;

					triggerEvent(event, $this.element, 'drag');
				}
			}

			//--------------------------------------------------------------------------------------
			//										ZOOM
			//--------------------------------------------------------------------------------------
			// only trigger `zoom` event if cursor actually moved
			if ($this.touchStarted && $this.hasZoom) {

				// throttle the `zoom` event based on `zoomFrequency`
				var now = event.timeStamp;
				if ($this.touchZoomTime == null || now > ($this.touchZoomTime + $this.options.zoomFrequency)) {
					$this.touchZoomTime = now;

					checkZoom($this, event);
				}
			}
		}

		function checkZoom($this, event) {


			// get the list of changed touches from the event (default to empty array for non-touch devices)
			// without the fallback, `event.changedTouches` is undefined on desktop, causing error when checking length.
			const touches = event.changedTouches || [];

			// check if exactly two fingers are being used
			if (touches.length !== 2) {
				// reset dragging state if fewer or more than 2 touches are detected
				$this.isZooming = false;
				return;
			}

			// calculate the distance between the two touch points (euclidean distance)
			const newDistance = Math.sqrt(
				Math.pow(touches[0].clientX - touches[1].clientX, 2) + // horizontal distance
				Math.pow(touches[0].clientY - touches[1].clientY, 2)   // vertical distance
			);

			// initialize the gesture if it's not already active
			if (!$this.isZooming) {
				// mark the gesture as active and store the initial distance
				$this.isZooming = true;
				$this.initialZoomDistance = newDistance;
				return;
			}

			// calculate the zoom factor based on the change in distance
			const zoomFactor = newDistance / $this.initialZoomDistance;


			//--------------------------------------------------------------------------------------
			//										ZOOM
			//--------------------------------------------------------------------------------------
			if (hasEvent($this, 'zoom')) {

				// check if the zoom factor exceeds the threshold for zooming
				if (Math.abs(zoomFactor - 1) > ($this.options.zoomDistance / $this.initialZoomDistance)) {

					// trigger the zoom callback with the source and zoom factor
					triggerEvent(event, $this.element, 'zoom', zoomFactor);
				}
			}

			//--------------------------------------------------------------------------------------
			//									ZOOM IN/OUT
			//--------------------------------------------------------------------------------------
			if (hasEvent($this, 'zoom.in') || hasEvent($this, 'zoom.out')) {

				// check if the distance change is significant enough to count as a zoom gesture
				if (Math.abs(newDistance - $this.initialZoomDistance) > $this.options.zoomInOutDistance) {

					// determine zoom direction
					if (newDistance > $this.initialZoomDistance) {
						// fingers moved apart = zoom in
						triggerEvent(event, $this.element, 'zoom.in');
					} else {
						// fingers moved closer = zoom out
						triggerEvent(event, $this.element, 'zoom.out');
					}
				}
			}


			// reset the dragging state after detecting the pinch gesture
			$this.isZooming = false;
		}

		function touchCancelEvent() {
			var $this = this.$$touchObj;
			if ($this.touchStarted == true) {

				cancelTouchHoldTimer($this);
				removeTouchClass(this);

				$this.touchStarted = $this.touchMoved = false;
				$this.startX = $this.startY = 0;
			}
		}

		/** Fired when the user performs a MOUSE UP on the object (releases the mouse button or finger press) */
		function touchEndEvent(event: MouseEvent | TouchEvent) {
			var $this = this.$$touchObj;
			if ($this.touchStarted == true) {

				var isTouchEvent = event.type.indexOf('touch') >= 0;
				var isMouseEvent = event.type.indexOf('mouse') >= 0;

				if (isTouchEvent) {
					$this.lastTouchEndTime = event.timeStamp;
				}

				var touchholdEnd = isTouchEvent && !$this.touchHoldTimer;
				cancelTouchHoldTimer($this);

				$this.touchStarted = false;

				removeTouchClass(this);

				if (isMouseEvent && $this.lastTouchEndTime && event.timeStamp - $this.lastTouchEndTime < 350) {
					return;
				}

				//--------------------------------------------------------------------------------------
				//									RELEASE
				//--------------------------------------------------------------------------------------

				// trigger `end` event when touch stopped
				triggerEvent(event, this, 'release');


				//--------------------------------------------------------------------------------------
				//								LONGTAP / HOLD / TAP
				//--------------------------------------------------------------------------------------

				if (!$this.touchMoved) {
					// detect if this is a longTap event or not
					if (hasEvent($this, 'longtap') && event.timeStamp - $this.touchStartTime > $this.options.longTapTimeInterval) {
						if (event.cancelable) {
							event.preventDefault();
						}
						triggerEvent(event, this, 'longtap');

					} else if (hasEvent($this, 'hold') && touchholdEnd) {
						if (event.cancelable) {
							event.preventDefault();
						}
						return;
					} else {
						// emit tap event
						triggerEvent(event, this, 'tap');
					}

				}

				//--------------------------------------------------------------------------------------
				//									SWIPE
				//--------------------------------------------------------------------------------------
				// only process swipe events if `swipe.*` event is registered on this element
				else if ($this.hasSwipe && !$this.swipeOutBounded) {
					var swipeOutBounded = $this.options.swipeTolerance,
						direction,
						distanceY = Math.abs($this.startY - $this.currentY),
						distanceX = Math.abs($this.startX - $this.currentX);

					if (distanceY > swipeOutBounded || distanceX > swipeOutBounded) {

						// Check which swipe direction it is based on the mouse movement
						if (distanceX > swipeOutBounded) {
							direction = $this.startX > $this.currentX ? 'left' : 'right';
						} else {
							direction = $this.startY > $this.currentY ? 'top' : 'bottom';
						}

						// Only emit the specified event when it has modifiers
						if (hasEvent($this, 'swipe.' + direction)) {
							triggerEvent(event, this, 'swipe.' + direction, direction);
						} else {
							// Emit a common event when it has no any modifier
							triggerEvent(event, this, 'swipe', direction);
						}
					}
				}
			}
		}

		function mouseEnterEvent() {
			addTouchClass(this);
		}

		function mouseLeaveEvent() {
			removeTouchClass(this);
		}

		function hasEvent($this: TouchObject, eventType: string): boolean {
			var callbacks = $this.callbacks[eventType];
			return (callbacks != null && callbacks.length > 0);
		}

		function triggerEvent(e: Event, $el: HTMLElement, eventType: string, param?: any) {
			var $this = $el.$$touchObj as TouchObject;

			// get the subscribers for this event
			var callbacks = $this.callbacks[eventType];

			// exit if no subscribers to this particular event
			if (callbacks == null || callbacks.length === 0) {
				return null;
			}

			// per callback
			for (var i = 0; i < callbacks.length; i++) {
				var binding = callbacks[i];

				if (binding.modifiers.stop) {
					e.stopPropagation();
				}

				if (binding.modifiers.prevent) {
					e.preventDefault();
				}

				// handle `self` modifier`
				if (binding.modifiers.self && e.target !== e.currentTarget) {
					continue;
				}

				if (typeof binding.value === 'function') {
					if (param) {
						binding.value(param, e);
					} else {
						binding.value(e);
					}
				}
			}
		}

		function addTouchClass($el: HTMLElement) {
			var className = ($el.$$touchObj as TouchObject).options.touchClass;
			className && $el.classList.add(className);
		}

		function removeTouchClass($el: HTMLElement) {
			var className = ($el.$$touchObj as TouchObject).options.touchClass;
			className && $el.classList.remove(className);
		}

		function cancelTouchHoldTimer($this) {
			if ($this && $this.touchHoldTimer) {
				clearTimeout($this.touchHoldTimer);
				$this.touchHoldTimer = null;
			}
		}

		function buildTouchObj($el: HTMLElement, extraOptions: any) {
			var touchObj = ($el.$$touchObj as TouchObject) || {
				element: $el,
				// an object contains all callbacks registered,
				// key is event name, value is an array
				callbacks: {},
				// prevent bind twice, set to true when event bound
				hasBindTouchEvents: false,
				// default options, would be override by v-touch-options
				options: globalOptions,
				events: {},
			};
			if (extraOptions) {
				touchObj.options = Object.assign({}, touchObj.options, extraOptions);
			}
			$el.$$touchObj = touchObj;
			return $el.$$touchObj;
		}

		function addEvents(events: any) {
			for (const eventName in events) {
				if (events.hasOwnProperty(eventName)) {
					const [target, handler, passive] = events[eventName];

					// fix: Added non-passive event listener to a scroll-blocking event
					if (passive == true) {
						target.addEventListener(eventName, handler, { passive: true });
					} else {
						target.addEventListener(eventName, handler);
					}
				}
			}
		}

		function removeEvents(events: any) {
			for (const eventName in events) {
				if (events.hasOwnProperty(eventName)) {
					const [target, handler] = events[eventName];
					target.removeEventListener(eventName, handler);
				}
			}
		}

		app.directive(globalOptions.namespace, {
			beforeMount: function ($el: HTMLElement, binding: DirectiveBinding) {
				// build a touch configuration object
				var $this = buildTouchObj($el);
				// register callback
				var eventType = binding.arg || 'tap';
				switch (eventType) {
					case 'swipe':
						var _m = binding.modifiers;
						if (_m.left || _m.right || _m.top || _m.bottom) {
							for (var i in binding.modifiers) {
								if (['left', 'right', 'top', 'bottom'].indexOf(i) >= 0) {
									var _e = 'swipe.' + i;
									$this.callbacks[_e] = $this.callbacks[_e] || [];
									$this.callbacks[_e].push(binding);
								}
							}
						} else {
							$this.callbacks.swipe = $this.callbacks.swipe || [];
							$this.callbacks.swipe.push(binding);
						}
						break;

					case 'press':
					case 'drag':
					default:
						$this.callbacks[eventType] = $this.callbacks[eventType] || [];
						$this.callbacks[eventType].push(binding);
				}

				// prevent bind twice
				if ($this.hasBindTouchEvents) {
					return;
				}

				// ADD MOBILE EVENTS
				if ($this.options.dragOutside) {
					$this.events['touchstart'] = [$el, touchStartEvent, true];
					$this.events['touchmove'] = [window, touchMoveEventWindow.bind($el), true];
					$this.events['touchcancel'] = [window, touchCancelEvent.bind($el)];
					$this.events['touchend'] = [window, touchEndEvent.bind($el)];
				} else {
					$this.events['touchstart'] = [$el, touchStartEvent, true];
					$this.events['touchmove'] = [$el, touchMoveEventWindow, true];
					$this.events['touchcancel'] = [$el, touchCancelEvent];
					$this.events['touchend'] = [$el, touchEndEvent];
				}

				// ADD DESKTOP EVENTS
				if (!$this.options.disableClick) {
					if ($this.options.dragOutside) {
						$this.events['mousedown'] = [$el, touchStartEvent];
						$this.events['mousemove'] = [window, touchMoveEventWindow.bind($el)];
						$this.events['mouseup'] = [window, touchEndEvent.bind($el)];
						$this.events['mouseenter'] = [$el, mouseEnterEvent];
						$this.events['mouseleave'] = [$el, mouseLeaveEvent];
					} else {
						$this.events['mousedown'] = [$el, touchStartEvent];
						$this.events['mousemove'] = [$el, touchMoveEvent];
						$this.events['mouseup'] = [$el, touchEndEvent];
						$this.events['mouseenter'] = [$el, mouseEnterEvent];
						$this.events['mouseleave'] = [$el, mouseLeaveEvent];
					}
				}

				// register all events
				addEvents($this.events);

				// set bind mark to true
				$this.hasBindTouchEvents = true;
			},

			unmounted: function ($el: HTMLElement) {
				var touchObj = $el.$$touchObj;

				cancelTouchHoldTimer(touchObj);

				// unregister all events
				if (touchObj && touchObj.events) {
					removeEvents(touchObj.events);
					touchObj.events = {};
				}

				// remove vars
				delete $el.$$touchObj;
			}
		});


		// Register additional directives for class
		app.directive(`${globalOptions.namespace}-class`, {
			beforeMount: function ($el, binding) {
				buildTouchObj($el, {
					touchClass: binding.value
				});
			}
		});

		// Register additional directives for options
		app.directive(`${globalOptions.namespace}-options`, {
			beforeMount: function ($el, binding) {
				buildTouchObj($el, binding.value);
			}
		});
	}
};

/*
 * Exports
 */
export default Vue3TouchEvents
