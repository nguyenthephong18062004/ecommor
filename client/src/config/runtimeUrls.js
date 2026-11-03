import { resolveApiBaseUrl, resolveUploadUrl } from './apiBaseUrl';

const options = { dev: import.meta.env.DEV, mode: import.meta.env.VITE_API_MODE };

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_URL_API, options);
export const uploadUrl = (path) => resolveUploadUrl(path, import.meta.env.VITE_URL_IMAGE_API, options);
