// Turns on the device camera and plays it inside a <video> element.
export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
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
