const ETHEREALM_RESEARCH_LINK = Object.freeze({
  id: 'etherealm.research',
  label: '免费投资研究与存储行业报告',
  url: 'https://pub.etherealm.one/?utm_source=flashmaster&utm_medium=referral&utm_campaign=elp',
  category: 'reference',
  icon: 'mdi-file-chart-outline',
  hint: 'Etherealm Research',
  priority: 4
});

function isChineseContext(context) {
  return String(context?.lang || context?.input?.lang || '').trim().toLowerCase() === 'chs';
}

function isFdnextResult(result) {
  return result?.schemaVersion === 'fdnext.result.v1';
}

function appendResearchLink(links = []) {
  const existing = Array.isArray(links) ? links : [];
  if (existing.some(link => link?.id === ETHEREALM_RESEARCH_LINK.id || link?.url === ETHEREALM_RESEARCH_LINK.url)) {
    return existing;
  }
  return [...existing, ETHEREALM_RESEARCH_LINK];
}

export function createEtherealmResearchLinkProcessor() {
  return {
    afterOperation(context, result) {
      if (!isChineseContext(context) || !isFdnextResult(result) || result.status === 'invalid_input') {
        return result;
      }
      return {
        ...result,
        links: appendResearchLink(result.links)
      };
    }
  };
}
