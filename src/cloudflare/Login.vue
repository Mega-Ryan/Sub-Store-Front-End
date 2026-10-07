<template>
  <div class="cloudflare-login">
    <form @submit.prevent="submit">
      <h1>Sub-Store</h1>
      <p>Cloudflare 基础版 · 管理登录</p>
      <label for="admin-token">管理凭据</label>
      <input id="admin-token" v-model="token" type="password" required autocomplete="current-password" :disabled="busy" />
      <p class="error" role="alert" v-if="error">{{ error }}</p>
      <button type="submit" :disabled="busy">{{ busy ? '登录中…' : '登录' }}</button>
      <p class="note">凭据由部署时配置。会话过期后需要重新登录。</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from './session';
import { initStores } from '@/utils/initApp';

const route = useRoute();
const router = useRouter();
const token = ref('');
const error = ref('');
const busy = ref(false);
const submit = async () => {
  busy.value = true;
  error.value = '';
  try {
    await login(token.value);
    token.value = '';
    await initStores(false, true, false);
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/subs';
    await router.replace(target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/login') ? target : '/subs');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败';
  } finally {
    busy.value = false;
  }
};
</script>

<style scoped>
.cloudflare-login { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
form { width:100%; max-width:420px; display:flex; flex-direction:column; gap:16px; background:var(--card-color); padding:28px; border-radius:20px; }
h1 { color:var(--primary-text-color); font-size:28px; }
label, p { color:var(--primary-text-color); }
input { color:var(--primary-text-color); background:var(--background-color); border:1px solid var(--divider-color); border-radius:10px; padding:12px; }
button { background:var(--primary-color); color:white; border:0; padding:12px; border-radius:10px; cursor:pointer; }
button:disabled { opacity:.6; }
.error { color:#dc3545; }
.note { font-size:12px; line-height:1.6; }
</style>

