const unavailable = () => {
  throw new Error('Embedded fdnext main-thread fallback is not available in this build.');
};

export const warmMainEmbeddedParser = unavailable;
export const getMainEmbeddedInfo = unavailable;
export const decodeMainEmbeddedPartNumber = unavailable;
export const searchMainEmbeddedPartNumber = unavailable;
export const decodeMainEmbeddedFlashId = unavailable;
export const searchMainEmbeddedFlashId = unavailable;
