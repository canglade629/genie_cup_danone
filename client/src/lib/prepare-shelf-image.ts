const MAX_EDGE = 768;
const MAX_DATA_URL_LENGTH = 72_000;

export async function prepareShelfImage(source: string): Promise<string> {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Unable to load shelf image (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas image processing is unavailable');

  let quality = 0.72;
  let dataUrl = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) break;
    if (quality > 0.42) {
      quality -= 0.1;
    } else {
      width = Math.max(320, Math.round(width * 0.82));
      height = Math.max(200, Math.round(height * 0.82));
    }
  }
  bitmap.close();

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Shelf image could not be compressed for analysis');
  }
  return dataUrl;
}
