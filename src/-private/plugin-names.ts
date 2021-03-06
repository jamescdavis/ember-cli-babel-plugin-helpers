import { BabelPluginConfig } from '..';

// Given plugin configuration, attempt to determine the normalized name for the plugin it references
export function resolvePluginName(pluginConfig: BabelPluginConfig): string | void {
  let plugin = Array.isArray(pluginConfig) ? pluginConfig[0] : pluginConfig;

  if (typeof plugin === 'string') {
    if (isPath(plugin)) {
      return findPackageName(plugin);
    } else {
      return normalizePluginName(plugin);
    }
  } else if (plugin && plugin.name) {
    return normalizePluginName(plugin.name);
  }
}

// Based on https://babeljs.io/docs/en/next/options#name-normalization
// Unfortunately the logic Babel uses to implement this isn't directly exposed
export function normalizePluginName(rawName: string): string {
  if (rawName.startsWith('module:')) {
    return rawName.substring('module:'.length);
  }

  let { scope, name } = extractScope(rawName);

  if (
    isPath(name) ||
    (!scope && name.startsWith('babel-plugin-')) ||
    (scope === '@babel' && name.startsWith('plugin-')) ||
    (scope && /\bbabel-plugin\b/.test(name))
  ) {
    return rawName;
  }

  if (scope === '@babel') {
    return `@babel/plugin-${name}`;
  }

  if (scope && !name) {
    return `${scope}/babel-plugin`;
  }

  if (scope) {
    return `${scope}/babel-plugin-${name}`;
  }

  return `babel-plugin-${name}`;
}

// Extracts the scope and remainder from a scoped package name
const scopeRegex = /^(@[^\\/]+)(?:[\\/](.*))?$/;

// Extracts the scope from a package path, if one is present
function extractScope(rawName: string): { scope: string | null; name: string } {
  if (rawName.startsWith('@')) {
    let match = scopeRegex.exec(rawName)!;
    return { scope: match[1], name: match[2] || '' };
  } else {
    return { scope: null, name: rawName };
  }
}

// Matches a path with a node_modules directory in it
const nodeModulesRegex = /[\\/]node_modules[\\/]/;

// Captures just the package name from a `require`-style path
const packageNameRegex = /^((@[^\\/]+[\\/])?[^\\/]*)/;

// Given a plugin string (a package name or full module path), returns the
// package name where that plugin is implemented.
function findPackageName(modulePath: string): string {
  let packagePath = modulePath;
  let match = nodeModulesRegex.exec(modulePath);
  if (!match) {
    return packagePath;
  }

  let packageNameStartIndex = modulePath.lastIndexOf(match[0]) + match[0].length;
  let packageNameWithEntryPoint = modulePath.substring(packageNameStartIndex);
  let packageName = packageNameRegex.exec(packageNameWithEntryPoint)![1];

  // Normalize from '\' to `/` for scoped package names on Windows
  return packageName.replace('\\', '/');
}

function isPath(name: string): boolean {
  return /[\\/]/.test(name);
}
