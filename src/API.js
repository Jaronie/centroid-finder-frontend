const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchVideos() {
  if (USE_MOCKS) {
    await delay(400);
    return ['demo.mov', 'ensantina.mp4', 'intro.mp4'];
  }
  const res = await fetch('/api/videos');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function thumbnailUrl(filename) {
  return USE_MOCKS ? mockThumbnail() : `/thumbnail/${encodeURIComponent(filename)}`;
}

// A dark frame with a red circle and a green square, so you can test color matching.
function mockThumbnail() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b2a3a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.arc(220, 180, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#43a047';
  ctx.fillRect(380, 110, 140, 140);
  return c.toDataURL('image/jpeg');
}