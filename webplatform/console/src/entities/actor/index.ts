/** Public API — entity `actor` (FS8 Memory: the channel's visual identity). */
export { mapActor, filterActors, type ActorVM, type ActorWireDTO } from './model';
export { fetchActors, fetchActor, useActors, useActor } from './hooks';
export { actorPaths } from './paths';
