export const isEmbeddedParserBuild = () => typeof __FLASHMASTER_EMBEDDED_PARSER__ === 'undefined' || Boolean(__FLASHMASTER_EMBEDDED_PARSER__);

export const getEmbeddedBuildMetadata = () => ({
  version: typeof __FDNEXT_VERSION__ !== 'undefined' ? __FDNEXT_VERSION__ : 'dev',
  commitHash: typeof __FDNEXT_COMMIT_HASH__ !== 'undefined' ? __FDNEXT_COMMIT_HASH__ : 'dev',
  buildTime: typeof __FDNEXT_BUILD_TIME__ !== 'undefined' ? __FDNEXT_BUILD_TIME__ : ''
});

export const formatFdnextVersion = (server, fallbackBuild = {}) => {
  const version = String(server?.version || fallbackBuild.version || 'dev').trim() || 'dev';
  const commitHash = String(server?.build?.commitHash || fallbackBuild.commitHash || '').trim();
  return commitHash && commitHash !== 'dev' ? `${version}-${commitHash}` : version;
};

export const getEmbeddedVersion = () => {
  if (!isEmbeddedParserBuild()) {
    return 'HTTP only';
  }
  const build = getEmbeddedBuildMetadata();
  return formatFdnextVersion({ version: build.version, build }, build);
};

export const getParserBuildLabel = () => isEmbeddedParserBuild()
  ? `Embedded fdnext ${getEmbeddedVersion()}`
  : 'HTTP only';
