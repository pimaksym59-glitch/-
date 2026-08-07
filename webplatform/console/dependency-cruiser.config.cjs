/**
 * dependency-cruiser — FS1 engineering gate #8 (Stage 2 §14.8).
 * Enforces Feature-Sliced Design one-way layering (Stage 2 §3, FE-ADR-3):
 *   app → widgets → features → entities → shared   (lower never imports higher)
 * plus: no circular deps, and features never import sibling features.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies break the acyclic FSD graph (invariant #3).',
      from: {},
      to: { circular: true },
    },
    {
      name: 'shared-no-upward',
      severity: 'error',
      comment: 'shared/ is the base layer and must not import any internal layer.',
      from: { path: '^src/shared/' },
      to: { path: '^src/(app|widgets|features|entities)/' },
    },
    {
      name: 'entities-no-upward',
      severity: 'error',
      comment: 'entities/ may only depend on shared/.',
      from: { path: '^src/entities/' },
      to: { path: '^src/(app|widgets|features)/' },
    },
    {
      name: 'features-no-upward',
      severity: 'error',
      comment: 'features/ may depend on entities/ and shared/ only.',
      from: { path: '^src/features/' },
      to: { path: '^src/(app|widgets)/' },
    },
    {
      name: 'widgets-no-upward',
      severity: 'error',
      comment: 'widgets/ may depend on features/entities/shared, never on app/.',
      from: { path: '^src/widgets/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'no-cross-feature',
      severity: 'error',
      comment: 'features must not import sibling features (compose via widgets).',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'no-cross-entity',
      severity: 'error',
      comment: 'entities must not import sibling entities.',
      from: { path: '^src/entities/([^/]+)/' },
      to: { path: '^src/entities/([^/]+)/', pathNot: '^src/entities/$1/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^src/',
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)' },
    },
  },
};
