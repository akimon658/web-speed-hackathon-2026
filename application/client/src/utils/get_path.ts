export function getImagePath(imageId: string): string {
  return `/images/${imageId}.jpg?w=800&format=webp`;
}

export function getMoviePath(movieId: string): string {
  return `/movies/${movieId}.gif`;
}

export function getSoundPath(soundId: string): string {
  return `/sounds/${soundId}.mp3`;
}

export function getProfileImagePath(profileImageId: string): string {
  return `/images/profiles/${profileImageId}.jpg?w=128&format=webp`;
}
