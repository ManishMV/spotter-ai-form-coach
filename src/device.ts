// Is this a laptop/desktop or a phone/tablet? Used to pick set-up instructions and the pose model size.
export type Device = 'laptop' | 'phone'

/** Touch-first screens (phones, tablets) report a "coarse" pointer; laptops with a mouse/trackpad don't. */
export function detectDevice(): Device {
  return matchMedia('(pointer: coarse)').matches ? 'phone' : 'laptop'
}
