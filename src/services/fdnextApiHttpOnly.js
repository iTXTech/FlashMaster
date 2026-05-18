const unavailable = () => {
  throw new Error('Embedded fdnext is not available in this build.');
};

export const getEmbeddedInfo = unavailable;
export const decodeEmbeddedPartNumber = unavailable;
export const searchEmbeddedPartNumber = unavailable;
export const summarizeEmbeddedPartNumber = unavailable;
export const decodeEmbeddedFlashId = unavailable;
export const searchEmbeddedFlashId = unavailable;
export const summarizeEmbeddedFlashId = unavailable;
