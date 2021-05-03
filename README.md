# vue3-touch-events [![](https://img.shields.io/npm/v/vue3-touch-events.svg)](https://www.npmjs.com/package/vue3-touch-events)

> Note: This library is for **vue.js 3.x** only. For **vue.js 2.x** see the [older library](https://github.com/jerrybendy/vue-touch-events).

Enable tap, swipe, touch, hold, mouse down, mouse up events for any HTML DOM Element in vue.js 3.x.

The easiest way to make your interactive vue.js content mobile-friendly. When you add `v-touch` events to your elements, it works on desktop and mobile as well using fully declarative syntax. Unlike other libraries, you do not need to add any special code to your components to make this work. You simply have to register the library globally and it takes event throughout your application.

Released under the permissive MIT License.

Features:

- Declarative syntax for common touch events, such as `tap`, `swipe`, `touchhold` ([more](#Events))
- All events support desktop (mouse) and mobile devices (touch screen) with the same syntax
- Automatically add styling on hover and tap using `v-touch-class` directive
- Bind multiple touch events on one DOM element
- Customizable events with native-like events handler
- Global configuration that applies to all events in the application
- Ability to override global configuration on any element using `v-touch-options` directive
- Bindings for TypeScript included and also works in pure-JavaScript projects

Credits:

- All credits go to Jerry Bendy for creating the original project [vue2-touch-events](https://github.com/jerrybendy/vue-touch-events)
- Special thanks to Xavier Julien for creating the [Vue 3.x port](https://github.com/XjulI1/vue-touch-events/tree/migrate-to-vuejs-3)

## Install

To install with npm:

```shell
npm install vue3-touch-events
```

To install with yarn:

```shell
yarn add vue3-touch-events
```

## Setup

### TypeScript

You need to register this plugin with vue.js in your main application file:

```js
import Vue from "vue";
import Vue3TouchEvents from "vue3-touch-events";

Vue.use(Vue3TouchEvents);
```

### JavaScript

You need to include the [UMD script](https://raw.githubusercontent.com/robinrodricks/vue3-touch-events/master/index.js) of this plugin and you do not need to register this plugin with vue.js.

```html
<script src="libs/vue.js"></script>
<script src="libs/vue3-touch-events.js"></script>
```

## Usage

In your `.vue` component files, use the `v-touch` directive add touch events to elements.

Specify the event using the first argument, for example `v-touch:tap` or `v-touch:swipe`.

```html
<!-- bind a tap event -->
<span v-touch:tap="touchHandler">Tap Me</span>

<!-- tap is the default event, you can omit it -->
<span v-touch="touchHandler">Tap Me</span>

<!-- bind the swipe event, no matter direction -->
<span v-touch:swipe="swipeHandler">Swipe Here</span>

<!-- only when swipe left can trigger the callback -->
<span v-touch:swipe.left="swipeHandler">Swipe Here</span>

<!-- bind a long tap event -->
<span v-touch:longtap="longtapHandler">Long Tap Event</span>

<!-- bind a start and end event -->
<span v-touch:start="startHandler" v-touch:end="endHandler">Down,start/Up,end Event</span>

<!-- bind a move and moving event -->
<span v-touch:moved="movedHandler">Triggered once when starting to move and tapTolerance is exceeded</span>
<span v-touch:moving="movingHandler">Continuously triggering Event</span>

<!-- touch and hold -->
<span v-touch:touchhold="touchHoldHandler">Touch and hold on the screen for a while</span>

<!-- you can even mix multiple events -->
<span v-touch:tap="tapHandler" v-touch:longtap="longtapHandler" v-touch:swipe.left="swipeLeftHandler" v-touch:start="startHandler" v-touch:end="endHandler" v-touch:swipe.right="swipeRightHandler">Mix Multiple Events</span>

<!-- using different options for specified element -->
<span v-touch:tap="tapHandler" v-touch-options="{touchClass: 'active', swipeTolerance: 80, touchHoldTolerance: 300}">Different options</span>

<!-- customize touch effects by CSS class -->
<span v-touch:tap="tapHandler" v-touch-class="active">Customize touch class</span>
<!-- or -->
<span v-touch:tap="tapHandler" v-touch-options="{touchClass: 'active'}">Customize touch class</span>
```

## Events

List of all supported events are given below.

<table>
	<tr>
		<th>Event</th>
		<th>Behaviour</th>
		<th>Example Callback</th>
	</tr>
	<tr>
		<td>`v-touch:tap` / `v-touch`</td>
		<td>
			*Triggered when user clicks/taps on the element (press and release).
		</td>
		<td>`onTap(){ ... }`</td>
	</tr>
	<tr>
		<td>`v-touch:swipe`</td>
		<td>
			*Triggered when user drags on the element (swipe).
			*It will detect the direction of the swipe, based on the 4 cardinal directions and send it to your callback
			*You can bind events only for specify direction.</td>
		<td>
			`onSwipe(direction){ ... }`
			* `direction` - Direction of swipe event, can be `left`, `right`, `top` or `bottom`.
		</td>
	</tr>
	<tr>
		<td>`v-touch:touchhold`</td>
		<td>
			*Triggered when user holds the mouse button down for `touchHoldTolerance` milliseconds while over the element (press and hold).
			*This will be triggered before your finger is released, similar to what native mobile apps do.
		</td>
		<td>`onHold(){ ... }`</td>
	</tr>
	<tr>
		<td>`v-touch:start` / `v-touch:touchstart` / `v-touch:mousedown`</td>
		<td>
			* **Desktop:** Triggered when the user presses the element (mouse down).
			* **Mobile:** Triggered when the user taps the element without releasing.
		</td>
		<td>`onMouseDown(){ ... }`</td>
	</tr>
	<tr>
		<td>`v-touch:moving` / `v-touch:touchmove` / `v-touch:mousemove`</td>
		<td>
			* **Desktop only:** Triggered when user moves the mouse while over the element.
		</td>
		<td>`onMouseMove(){ ... }`</td>
	</tr>
	<tr>
		<td>`v-touch:end` / `v-touch:touchend` / `v-touch:mouseup`</td>
		<td>
			* **Desktop:** Triggered when the user releases the element (mouse up).
			* **Mobile:** Triggered when the user taps and releases the element.
		</td>
		<td>`onMouseUp(){ ... }`</td>
	</tr>
</table>

## Options

### v-touch-options

`v-touch-options` directive allows you set a different configuration for a specified component. It will override global configurations.

### v-touch-class

`v-touch-class` directive allows you automatically add a class when the element is rolled over (desktop) or tapped (mobile). It overrides the class specified in the global config option `touchClass`.

- By default the `touchClass` is added when the element is pressed (`mousedown`), and removed when the element is released (`mouseup`).
- If desktop events are enabled (`disableClick: false`), then the `touchClass` is added on roll over (`mouseenter`) and roll out (`mouseleave`) as well.
- You can use this instead of `:active` and `:hover` pseudo classes, as they work on desktop and mobile

Behaviour:

<table>
	<tr>
		<th>Device</th>
		<th>Event name</th>
		<th>Effect</th>
		<th>Condition</th>
	</tr>
	<tr>
		<td rowspan="2">Desktop only</td>
		<td>Mouse enter (roll over)</td>
		<td>`touchClass` added</td>
		<td>desktop events enabled</td>
	</tr>
	<tr>
		<td>Mouse leave (roll out)</td>
		<td>`touchClass` removed</td>
		<td>desktop events enabled</td>
	</tr>
	<tr>
		<td rowspan="2">Mobile only</td>
		<td>Mouse down (press)</td>
		<td>`touchClass` added</td>
		<td>always triggered</td>
	</tr>
	<tr>
		<td>Mouse up (release)</td>
		<td>`touchClass` removed</td>
		<td>always triggered</td>
	</tr>
</table>

For example:

```html
<span v-touch:tap="touchHandler" v-touch-class="'active'">Tap Me</span>
```

Now, when you press the element, it will add an extra `active` class automatically, and when you release the element the class will be removed.

So that you can use this feature to instead of `:active` and `:hover` pseudo class, for a better user experience.

```css
/* before */
span:active,
span:hover {
	background: green;
}

/* now, you can write like this */
span.active {
	background: green;
}
```

## Global configuration

```js
Vue.use(Vue3TouchEvents, {
	disableClick: false,
	touchClass: "",
	tapTolerance: 10,
	touchHoldTolerance: 400,
	swipeTolerance: 30,
	longTapTimeInterval: 400,
});
```

- `disableClick` default `false`. Use touch event only, will not trigger click event.

  You should keep this value default if you use your website on both mobile and PC.

  If your website uses on mobile only, it's a good choice to set this value to `true` to get a better user experience, and it can resolve some touch pass-through issue.

- `touchClass` default: `''`. Add an extra CSS class when touch start, and remove it when touch end.

  This is a global config, and you can use `v-touch-class` directive to overwrite this setting in a single component.

- `tapTolerance` default `10`. The tolerance to ensure whether the tap event effective or not.

- `touchHoldTolerance` default `400` in millisecond. The timeout for a `touchhold` event.

- `swipeTolerance` default `30`. The tolerance to ensure whether the swipe event effective or not.

- `longTapTimeInterval` default `400` in millisecond. The minimum time interval to detect whether long tap event effective or not.

## FAQs

### How to add extra parameters

As mentioned by [#3](https://github.com/jerrybendy/vue-touch-events/issues/3), if you want to add extra
parameters for `v-touch`, you can't do that like `v-on`. The hack is that you can let your method returns
a `function` and handle the extra parameters in the returned function.

```html
<div v-touch:swipe="myMethod('myOtherParam')">Swipe</div>
```

```js
export default {
	methods: {
		myMethod(param) {
			return function (direction, event) {
				console.log(direction, param);
				// do something ~
			};
		},
	},
};
```
