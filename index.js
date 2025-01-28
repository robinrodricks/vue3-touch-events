/**
 * @project   vue3-touch-events
 * @author    Robin Rodricks, Xavier Julien, Jerry Bendy
 * @since     30/4/2021
 * @url       https://github.com/robinrodricks/vue3-touch-events
 */

function touchX(event) {
	if (event.type.indexOf('mouse') !== -1) {
		return event.clientX;
	}
	return event.touches[0].clientX;
}

function touchY(event) {
	if (event.type.indexOf('mouse') !== -1) {
		return event.clientY;
	}
	return event.touches[0].clientY;
}

var isPassiveSupported = (function () {
	var supportsPassive = false;
	try {
		var opts = Object.defineProperty({}, 'passive', {
			get: function () {
				supportsPassive = true;
			}
		});
		window.addEventListener('test', null, opts);
	} catch (e) { }
	return supportsPassive;
})();

var vueTouchEvents = {
	install: function (app, constructorOptions) {

		var globalOptions = Object.assign({}, {

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

			// SWIPE
			swipeTolerance: 100,  // px
			swipeConeSize: 0.75, // number between 0 to 1

			// ZOOM
			zoomFrequency: 10, // ms
			zoomDistance: 10, // px
			zoomInOutDistance: 100, // px


		}, constructorOptions);

		/** Fired when the user performs a MOUSE DOWN on the object */
		function touchStartEvent(event) {
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
			$this.hasSwipe = hasEvent(this, 'swipe')
				|| hasEvent(this, 'swipe.left') || hasEvent(this, 'swipe.right')
				|| hasEvent(this, 'swipe.top') || hasEvent(this, 'swipe.bottom');

			// performance: only start hold timer if the `hold` event is registered on this element
			if (hasEvent(this, 'hold')) {

				// Trigger touchhold event after `touchHoldTolerance` MS
				$this.touchHoldTimer = setTimeout(function () {
					$this.touchHoldTimer = null;
					triggerEvent(event, $el, 'hold');
				}, $this.options.touchHoldTolerance);
			}

			triggerEvent(event, this, 'press');
		}

		/** 
		Fired when the user DRAGS the object or MOVES the mouse over the object.
		Fired every X milliseconds (based on `dragFrequency`).
		*/
		function touchMoveEvent(event) {
			var $this = this.$$touchObj;

			var curX = touchX(event);
			var curY = touchY(event);

			var movedAgain = ($this.currentX != curX) || ($this.currentY != curY);

			$this.currentX = curX;
			$this.currentY = curY;


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
					triggerEvent(event, this, 'drag.once');
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

			//--------------------------------------------------------------------------------------
			//									ROLL OVER
			//--------------------------------------------------------------------------------------
			// only trigger `rollover` event if cursor actually moved over this element
			if (hasEvent(this, 'rollover') && movedAgain) {

				// throttle the `rollover` event based on `rollOverFrequency`
				var now = event.timeStamp;
				if ($this.touchRollTime == null || now > ($this.touchRollTime + $this.options.rollOverFrequency)) {
					$this.touchRollTime = now;

					triggerEvent(event, this, 'rollover');
				}
			}

			//--------------------------------------------------------------------------------------
			//										DRAG
			//--------------------------------------------------------------------------------------
			// only trigger `drag` event if cursor actually moved and if we are still dragging this element
			if (hasEvent(this, 'drag') && $this.touchStarted && $this.touchMoved && movedAgain) {

				// throttle the `drag` event based on `dragFrequency`
				var now = event.timeStamp;
				if ($this.touchDragTime == null || now > ($this.touchDragTime + $this.options.dragFrequency)) {
					$this.touchDragTime = now;

					triggerEvent(event, this, 'drag');
				}
			}

			//--------------------------------------------------------------------------------------
			//										ZOOM
			//--------------------------------------------------------------------------------------
			// only trigger `zoom` event if cursor actually moved
			if ($this.touchStarted && (hasEvent(this, 'zoom') || hasEvent(this, 'zoom-in') || hasEvent(this, 'zoom-out'))) {

				// throttle the `zoom` event based on `zoomFrequency`
				var now = event.timeStamp;
				if ($this.touchZoomTime == null || now > ($this.touchZoomTime + $this.options.zoomFrequency)) {
					$this.touchZoomTime = now;

					checkZoom($this, event);
				}
			}
		}

		function checkZoom($this, event) {


			// get the list of changed touches from the event
			const touches = e.changedTouches;

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
			if (hasEvent(this, 'zoom')) {

				// check if the zoom factor exceeds the threshold for zooming
				if (Math.abs(zoomFactor - 1) > ($this.options.zoomDistance / $this.initialZoomDistance)) {

					// trigger the zoom callback with the source and zoom factor
					triggerEvent(event, this, 'zoom', zoomFactor);
				}
			}

			//--------------------------------------------------------------------------------------
			//									ZOOM IN/OUT
			//--------------------------------------------------------------------------------------
			if (hasEvent(this, 'zoom-in') || hasEvent(this, 'zoom-out')) {

				// check if the distance change is significant enough to count as a zoom gesture
				if (Math.abs(newDistance - $this.initialZoomDistance) > $this.options.zoomInOutDistance) {

					// determine zoom direction
					if (newDistance > $this.initialZoomDistance) {
						// fingers moved apart → zoom in
						triggerEvent(event, this, 'zoom-in');
					} else {
						// fingers moved closer → zoom out
						triggerEvent(event, this, 'zoom-out');
					}
				}
			}


			// reset the dragging state after detecting the pinch gesture
			$this.isZooming = false;
		}

		function touchCancelEvent() {
			var $this = this.$$touchObj;

			cancelTouchHoldTimer($this);
			removeTouchClass(this);

			$this.touchStarted = $this.touchMoved = false;
			$this.startX = $this.startY = 0;
		}

		/** Fired when the user performs a MOUSE UP on the object (releases the mouse button or finger press) */
		function touchEndEvent(event) {
			var $this = this.$$touchObj,
				isTouchEvent = event.type.indexOf('touch') >= 0,
				isMouseEvent = event.type.indexOf('mouse') >= 0;

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

			// trigger `end` event when touch stopped
			triggerEvent(event, this, 'release');

			if (!$this.touchMoved) {
				// detect if this is a longTap event or not
				if (hasEvent(this, 'longtap') && event.timeStamp - $this.touchStartTime > $this.options.longTapTimeInterval) {
					if (event.cancelable) {
						event.preventDefault();
					}
					triggerEvent(event, this, 'longtap');

				} else if (hasEvent(this, 'hold') && touchholdEnd) {
					if (event.cancelable) {
						event.preventDefault();
					}
					return;
				} else {
					// emit tap event
					triggerEvent(event, this, 'tap');
				}

				// performance: only process swipe events if `swipe.*` event is registered on this element
			} else if ($this.hasSwipe && !$this.swipeOutBounded) {
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
					if (hasEvent(this, 'swipe.' + direction)) {
						triggerEvent(event, this, 'swipe.' + direction, direction);
					} else {
						// Emit a common event when it has no any modifier
						triggerEvent(event, this, 'swipe', direction);
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

		function hasEvent($el, eventType) {
			var callbacks = $el.$$touchObj.callbacks[eventType];
			return (callbacks != null && callbacks.length > 0);
		}

		function triggerEvent(e, $el, eventType, param) {
			var $this = $el.$$touchObj;

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

		function addTouchClass($el) {
			var className = $el.$$touchObj.options.touchClass;
			className && $el.classList.add(className);
		}

		function removeTouchClass($el) {
			var className = $el.$$touchObj.options.touchClass;
			className && $el.classList.remove(className);
		}

		function cancelTouchHoldTimer($this) {
			if ($this && $this.touchHoldTimer) {
				clearTimeout($this.touchHoldTimer);
				$this.touchHoldTimer = null;
			}
		}

		function buildTouchObj($el, extraOptions) {
			var touchObj = $el.$$touchObj || {
				// an object contains all callbacks registered,
				// key is event name, value is an array
				callbacks: {},
				// prevent bind twice, set to true when event bound
				hasBindTouchEvents: false,
				// default options, would be override by v-touch-options
				options: globalOptions
			};
			if (extraOptions) {
				touchObj.options = Object.assign({}, touchObj.options, extraOptions);
			}
			$el.$$touchObj = touchObj;
			return $el.$$touchObj;
		}

		app.directive(globalOptions.namespace, {
			beforeMount: function ($el, binding) {
				// build a touch configuration object
				var $this = buildTouchObj($el);
				// declare passive option for the event listener. Defaults to { passive: true } if supported
				var passiveOpt = isPassiveSupported ? { passive: true } : false;
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
						if (binding.modifiers.disablePassive) {
							// change the passive option for the `drag` event if disablePassive modifier exists
							passiveOpt = false;
						}
					default:
						$this.callbacks[eventType] = $this.callbacks[eventType] || [];
						$this.callbacks[eventType].push(binding);
				}

				// prevent bind twice
				if ($this.hasBindTouchEvents) {
					return;
				}

				$el.addEventListener('touchstart', touchStartEvent, passiveOpt);
				$el.addEventListener('touchmove', touchMoveEvent, passiveOpt);
				$el.addEventListener('touchcancel', touchCancelEvent);
				$el.addEventListener('touchend', touchEndEvent);

				if (!$this.options.disableClick) {
					$el.addEventListener('mousedown', touchStartEvent);
					$el.addEventListener('mousemove', touchMoveEvent);
					$el.addEventListener('mouseup', touchEndEvent);
					$el.addEventListener('mouseenter', mouseEnterEvent);
					$el.addEventListener('mouseleave', mouseLeaveEvent);
				}

				// set bind mark to true
				$this.hasBindTouchEvents = true;
			},

			unmounted: function ($el) {
				cancelTouchHoldTimer($el.$$touchObj)

				$el.removeEventListener('touchstart', touchStartEvent);
				$el.removeEventListener('touchmove', touchMoveEvent);
				$el.removeEventListener('touchcancel', touchCancelEvent);
				$el.removeEventListener('touchend', touchEndEvent);

				if ($el.$$touchObj && !$el.$$touchObj.options.disableClick) {
					$el.removeEventListener('mousedown', touchStartEvent);
					$el.removeEventListener('mousemove', touchMoveEvent);
					$el.removeEventListener('mouseup', touchEndEvent);
					$el.removeEventListener('mouseenter', mouseEnterEvent);
					$el.removeEventListener('mouseleave', mouseLeaveEvent);
				}

				// remove vars
				delete $el.$$touchObj;
			}
		});

		app.directive(`${globalOptions.namespace}-class`, {
			beforeMount: function ($el, binding) {
				buildTouchObj($el, {
					touchClass: binding.value
				});
			}
		});

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
export default vueTouchEvents
