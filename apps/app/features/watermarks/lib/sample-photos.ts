export type SamplePhoto = {
  key: "landscape" | "portrait"
  label: string
  width: number
  height: number
  src: string
}

const LANDSCAPE_PHOTO: SamplePhoto = {
  key: "landscape",
  label: "Landscape · 1280 × 720",
  width: 1280,
  height: 720,
  src: "/demo/photos/watermark-sample-landscape.jpg",
}

const PORTRAIT_PHOTO: SamplePhoto = {
  key: "portrait",
  label: "Portrait · 720 × 1280",
  width: 720,
  height: 1280,
  src: "/demo/photos/watermark-sample-portrait.jpg",
}

/**
 * Both samples share a 1280 px longest edge, matching the acceptance examples. Their assets are
 * cropped to the declared dimensions so `object-contain` renders the full frame.
 */
export const SAMPLE_PHOTOS: SamplePhoto[] = [LANDSCAPE_PHOTO, PORTRAIT_PHOTO]

export function samplePhoto(key: SamplePhoto["key"]): SamplePhoto {
  return key === "portrait" ? PORTRAIT_PHOTO : LANDSCAPE_PHOTO
}
