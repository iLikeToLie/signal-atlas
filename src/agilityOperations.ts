const worker = () => new Worker(new URL('./agility.worker.ts', import.meta.url), { type: 'module' });
export function work<T>(kind: string, data: object): Promise<T> {
  return new Promise((resolve, reject) => { const w = worker(); w.onmessage = e => { w.terminate(); if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data.value); }; w.onerror = () => { w.terminate(); reject(new Error('Background operation failed. Please try again.')); }; w.postMessage({ id: 1, kind, ...data }); });
}
export function download(text: string, name: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function downloadBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
