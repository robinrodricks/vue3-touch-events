### Version 5.0.13

- Fix issue where `rollover` events were not working if `dragOutside` was enabled

### Version 5.0.12

- Fix issue where swipe events were not working on mobile devices

### Version 5.0.11

- Converted the main source file from JavaScript into TypeScript
- Fixed issue with Vue not recognizing the TS type definitions
- Added TSC into the build toolchain to build the `index.d.ts` type definition file

### Version 5.0.10

- Rewrote the event handling system to track events on a per-object basis.
- Added a new dragging option `dragOutside` which allows for drag events to be sent when the mouse is outside the object as well.
- Fixed all issues arising with the implementation of `dragOutside` event handling.
- Docs: Greatly improved the documentation for swipe, zoom and split it feature-wise
- Docs: Added more images and animations into the docs

### Version 5.0.0

- Changed the default value of `dragFrequency` to `10 MS` (previously was `100 MS`), meaning that drag events will be fired at 100 FPS by default rather than only at 10 FPS.
- Changed the swipe detection to use a cone rather than using blocks, allowing for more variance in swipe gesture direction.
- Added swipe setting `swipeConeSize` to control the cone size.
- Added zoom events `zoom`, `zoom.in` and `zoom.out` using multi-touch gesture tracking.
- Added zoom options `zoomFrequency`,`zoomDistance`,`zoomInOutDistance` to customize the zoom behaviour.

### Version 4.1.8

- Added null check to the timer clear event

### Version 4.1.7

- Remove the touch-hold timer when unmounted

### Version 4.1.6

- Minor change to the swipe detection algorithm

### Version 4.1.5

- Add some missing options into the typescript definition

### Version 4.1.4

- Fix types and module declaration to work with Vue 3

### Version 4.1.2

- Fix module exports to work with Vite
