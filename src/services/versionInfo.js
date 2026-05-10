export const getEmbeddedBuildMetadata = () => ({
  version: typeof FDNEXT_VERSION !== 'undefined' ? FDNEXT_VERSION : 'dev',
  commitHash: typeof __FDNEXT_COMMIT_HASH__ !== 'undefined' ? __FDNEXT_COMMIT_HASH__ : 'dev',
  buildTime: typeof __FDNEXT_BUILD_TIME__ !== 'undefined' ? __FDNEXT_BUILD_TIME__ : ''
});

export const formatFdnextVersion = (server, fallbackBuild = {}) => {
  const version = String(server?.version || fallbackBuild.version || 'dev').trim() || 'dev';
  const commitHash = String(server?.build?.commitHash || fallbackBuild.commitHash || '').trim();
  return commitHash && commitHash !== 'dev' ? `${version}-${commitHash}` : version;
};

export const getEmbeddedVersion = () => {
  const build = getEmbeddedBuildMetadata();
  return formatFdnextVersion({ version: build.version, build }, build);
};
