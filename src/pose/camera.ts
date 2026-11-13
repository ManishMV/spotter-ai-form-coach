// Turns on the device camera and plays it inside a <video> element.
import { detectDevice } from '../device'

/**
 * Phones get a smaller feed: the pose model shrinks every frame to 256×256 anyway, so a full-HD
 * phone feed only costs decoding time and battery. Laptops keep 720p for a sharper on-screen picture.
 */
const RESOLUTION = {
  phone: { width: { ideal: 640 }, height: { ideal: 480 } },
  laptop: { width: { ideal: 1280 }, height: { ideal: 720 } },
}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', ...RESOLUTION[detectDevice()] },
  })
  video.srcObject = stream
  // Needed on iPhones so the video plays inline instead of going full-screen.
  video.playsInline = true
  video.muted = true
  await video.play()
  return stream
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}
