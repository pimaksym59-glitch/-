/** Public API — entity `location` (FS9: scene inputs §R6.3, read-only). */
export { mapLocation, resolveLocationName, type LocationVM, type LocationWireDTO } from './model';
export { fetchLocations, useLocations } from './hooks';
export { locationPaths } from './paths';
export { locationKeys } from './keys';
