/** Public API — entity `persona` (FS8 Memory: the channel's writing identity). */
export {
  mapPersona,
  mapStyleFeatures,
  sortPersonas,
  filterPersonas,
  type PersonaVM,
  type PersonaWireDTO,
  type StyleFeatureVM,
  type StyleFeaturesWireDTO,
} from './model';
export { fetchPersonas, fetchPersona, usePersonas, usePersona } from './hooks';
export { personaPaths } from './paths';
export { StyleFeatureList } from './ui/StyleFeatureList';
