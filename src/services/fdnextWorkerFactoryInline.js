import FdnextWorker from './fdnextWorker.js?worker&inline';

export function createFdnextWorker() {
  return new FdnextWorker({
    name: 'flashmaster-fdnext'
  });
}
