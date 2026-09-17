export function buildTime(value, name) {
  const override = String(value || '').trim();
  const time = override ? new Date(override) : new Date();
  if (!Number.isFinite(time.getTime())) {
    throw new Error(`${name} must be a valid timestamp.`);
  }
  return time.toISOString();
}
