export function createFdnextWorker() {
  return new Worker(new URL('./fdnextWorker.js', import.meta.url), {
    name: 'flashmaster-fdnext',
    type: 'module'
  });
}
