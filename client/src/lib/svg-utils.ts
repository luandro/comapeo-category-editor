/**
 * Utility functions for handling SVG content
 */

/**
 * Converts kebab-case SVG attributes to camelCase for React
 * This prevents React warnings about invalid DOM properties
 */
export function sanitizeSvgForReact(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    return svgContent;
  }

  // List of common SVG attributes that need conversion
  const attributesToConvert = [
    'clip-path',
    'clip-rule',
    'fill-opacity',
    'fill-rule',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'xlink:href',
    'xlink:title',
    'xlink:arcrole',
    'xlink:actuate',
    'xlink:role',
    'xlink:show',
    'xml:base',
    'xml:lang',
    'xml:space',
  ];

  let sanitizedContent = svgContent;

  // Convert kebab-case to camelCase for each attribute
  attributesToConvert.forEach((attr) => {
    const kebabCase = attr;
    // Handle xlink: and xml: namespaces specially
    if (kebabCase.includes(':')) {
      const [namespace, name] = kebabCase.split(':');
      const camelCase = `${namespace}:${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      const regex = new RegExp(`${kebabCase}=`, 'g');
      sanitizedContent = sanitizedContent.replace(regex, `${camelCase}=`);
    } else {
      // Regular kebab-case to camelCase conversion
      const camelCase = kebabCase.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const regex = new RegExp(`${kebabCase}=`, 'g');
      sanitizedContent = sanitizedContent.replace(regex, `${camelCase}=`);
    }
  });

  return sanitizedContent;
}
