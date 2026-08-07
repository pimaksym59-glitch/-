/**
 * Public API — feature `auth` (Stage 3 §3): login/logout + session bootstrap
 * surfaces. The feature owns its Zod schemas and mutation hooks; it imports no
 * sibling features.
 */
export { LoginForm } from './ui/LoginForm';
export { RegisterNotice } from './ui/RegisterNotice';
export { useLogin } from './model/useLogin';
export { useLogout } from './model/useLogout';
export { loginSchema, toLoginRequest, safeNextPath, type LoginValues } from './model/schema';
