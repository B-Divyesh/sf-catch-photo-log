export async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo smaller than 25 MB.');
  const bitmap = await createImageBitmap(file);
  const max = 1_600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the photo.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The photo could not be prepared.')), 'image/jpeg', 0.82));
}
