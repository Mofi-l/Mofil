// Spark reactions in the hero: the cursor spark is caught in the right fist (Grab, chest zone) or
// blown out (Blow, face zone). Times are seconds from the trigger and match the Blender clips
// (monk-lab/blender/36_grab_blow.py, 30 fps).
export const GRAB_CLIP = 'Grab'
export const BLOW_CLIP = 'Blow'

export const GRAB = {
  pull: 0.17, // the open hand is close: the spark starts flying into it
  catch: 9 / 30, // fist shut
  flare: 0.22, // light squeezing out between the fingers
  wisp: [0.34, 1.5], // smoke escaping the fist
  dark: 1.6, // earliest relight
}

export const BLOW = {
  gust: [12 / 30, 24 / 30], // breath leaving the mouth
  speed: 0.6, // px per ms the breath travels
  fade: 0.3, // flicker until dark once the breeze arrives
  dark: 1.3,
}

export const createSpark = () => ({
  mode: 'free', // 'free' | 'grab' | 'blow'
  start: 0,
  relit: 0,
  readyAt: 0,
  x: 0,
  y: 0,
  lit: false,
  mouse: false,
  fist: null,
  mouth: null,
})
