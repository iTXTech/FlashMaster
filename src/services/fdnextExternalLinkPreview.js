const previewEnv = import.meta.env.VITE_FLASHMASTER_EXTERNAL_LINK_PREVIEW;
const previewEnabled = previewEnv === '1';

function isFdnextResult(result) {
  return result?.schemaVersion === 'fdnext.result.v1';
}

function deviceFrom(result, item) {
  if (item?.device) return item.device;
  return result && 'device' in result ? result.device : null;
}

function deviceVendor(device) {
  return device?.vendor?.name || device?.vendor?.id || '';
}

function deviceQuery(context, result, item) {
  const device = deviceFrom(result, item);
  return device?.partNumber
    || device?.identifier
    || device?.markingCode
    || context.input?.query
    || result?.input?.query
    || 'fdnext';
}

function previewLinks(context, result, item) {
  const device = deviceFrom(result, item);
  const vendor = deviceVendor(device);
  const query = deviceQuery(context, result, item);
  const encodedQuery = encodeURIComponent(query);
  return [
    {
      id: `preview.vendor.${vendor || 'unknown'}`,
      label: vendor ? `${vendor} vendor` : 'Vendor reference',
      url: 'https://github.com/iTXTech/fdnext',
      category: 'vendor',
      image: 'logo',
      hint: 'ExternalLink preview provider',
      priority: 30
    },
    {
      id: `preview.datasheet.${encodedQuery}`,
      label: 'Datasheet lookup',
      url: `https://www.google.com/search?q=${encodedQuery}+datasheet`,
      category: 'datasheet',
      hint: query,
      fieldKey: 'part_number',
      priority: 20
    },
    {
      id: `preview.market.${encodedQuery}`,
      label: 'Marketplace search',
      url: `https://www.google.com/search?q=${encodedQuery}+buy`,
      category: 'marketplace',
      hint: 'Preview only',
      priority: 10
    }
  ];
}

function withPreviewLinks(context, result) {
  const topLevelLinks = previewLinks(context, result);
  if (Array.isArray(result.items)) {
    return {
      ...result,
      links: topLevelLinks,
      items: result.items.map(item => ({
        ...item,
        links: previewLinks(context, result, item)
      }))
    };
  }
  return {
    ...result,
    links: topLevelLinks
  };
}

export function createExternalLinkPreviewProcessor() {
  if (!previewEnabled) return null;
  return {
    afterOperation(context, result) {
      if (!isFdnextResult(result) || result.status === 'invalid_input') {
        return result;
      }
      return withPreviewLinks(context, result);
    }
  };
}
