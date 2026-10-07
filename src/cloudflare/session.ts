import { ref } from 'vue';
import { CLOUDFLARE_API_PREFIX } from './mode';

export const authenticated = ref(false);
let checked = false;
let pending: Promise<boolean> | null = null;

export const resetSession = () => {
  authenticated.value = false;
  checked = true;
};

const authRequest = async (path: string, body?: unknown) => {
  const response = await fetch(CLOUDFLARE_API_PREFIX + '/api/auth/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.status !== 'success') {
    throw new Error(result.error?.message || '无法连接管理服务，请稍后重试');
  }
  return result.data;
};

export const checkSession = async (force = false): Promise<boolean> => {
  if (checked && !force) return authenticated.value;
  if (pending) return pending;
  pending = authRequest('session').then(data => {
    authenticated.value = data.authenticated === true;
    checked = true;
    return authenticated.value;
  }).finally(() => { pending = null; });
  return pending;
};

export const login = async (token: string) => {
  await authRequest('login', { token });
  authenticated.value = true;
  checked = true;
};

export const logout = async () => {
  await authRequest('logout', {});
  resetSession();
};

