export function getImagePath(imageId: string): string {
  return `/images/${imageId}.webp?w=800&format=webp`;
}

export function getMoviePath(movieId: string): string {
  return `/movies/${movieId}.gif?w=300&format=mp4`;
}

export function getSoundPath(soundId: string): string {
  return `/sounds/${soundId}.mp3`;
}

export function getSoundPeaksPath(soundId: string): string {
  return `/sounds/${soundId}.mp3?peaks`;
}

export function getProfileImagePath(profileImageId: string): string {
  return `/images/profiles/${profileImageId}.webp?w=128&format=webp`;
}
