/**
 * Central source of truth for all supported frameworks
 * All framework references across the codebase should use these constants
 */

/**
 * Currently supported frameworks
 */
export enum SupportedFrameworks {
  // Frontend frameworks
  REACT_VITE = 'REACT_VITE',           // React with Vite bundler
  REACT_VITE_TAURI = 'REACT_VITE_TAURI', // React + Vite + Tauri for desktop apps
  
  // Backend frameworks  
  NESTJS = 'NESTJS',                   // NestJS for backend APIs
  
  // Mobile frameworks
  FLUTTER = 'FLUTTER',                  // Flutter for mobile apps
}

/**
 * Framework categories
 */
export const FrameworkCategories = {
  FRONTEND: [
    SupportedFrameworks.REACT_VITE,
    SupportedFrameworks.REACT_VITE_TAURI,
  ],
  BACKEND: [
    SupportedFrameworks.NESTJS,
  ],
  MOBILE: [
    SupportedFrameworks.FLUTTER,
  ],
  DESKTOP: [
    SupportedFrameworks.REACT_VITE_TAURI,
  ],
};

/**
 * Framework type mapping
 */
export const FrameworkTypeMap: Record<string, string> = {
  [SupportedFrameworks.REACT_VITE]: 'web',
  [SupportedFrameworks.REACT_VITE_TAURI]: 'desktop',
  [SupportedFrameworks.FLUTTER]: 'mobile',
  [SupportedFrameworks.NESTJS]: 'backend',
};

/**
 * Check if a framework is currently supported
 */
export function isFrameworkSupported(framework: string): boolean {
  return Object.values(SupportedFrameworks).includes(framework as SupportedFrameworks);
}

/**
 * Check if framework is for frontend
 */
export function isFrontendFramework(framework: string): boolean {
  return FrameworkCategories.FRONTEND.includes(framework as any);
}

/**
 * Check if framework is for backend
 */
export function isBackendFramework(framework: string): boolean {
  return FrameworkCategories.BACKEND.includes(framework as any);
}

/**
 * Check if framework is for mobile
 */
export function isMobileFramework(framework: string): boolean {
  return FrameworkCategories.MOBILE.includes(framework as any);
}

/**
 * Check if framework is for desktop
 */
export function isDesktopFramework(framework: string): boolean {
  return FrameworkCategories.DESKTOP.includes(framework as any);
}

/**
 * Get app type from framework
 */
export function getAppTypeFromFramework(framework: string): string {
  return FrameworkTypeMap[framework] || 'web';
}

/**
 * Check if framework needs a backend
 */
export function frameworkNeedsBackend(framework: string): boolean {
  return isFrontendFramework(framework) || isMobileFramework(framework) || isDesktopFramework(framework);
}