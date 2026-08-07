// Server-side AI gateway seam (FS6). The fixture module is NOT re-exported —
// it is reached only via the env-guarded dynamic import in `select` (the same
// discipline as `auth-gateway`).
export type { AiGateway, AiStreamRequest } from './types';
export { getAiGateway } from './select';
