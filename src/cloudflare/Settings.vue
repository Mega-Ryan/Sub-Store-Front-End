<template>
  <section class="basic-settings">
    <header><h1>Cloudflare 基础版</h1><LanguageSwitcherButton /></header>
    <p>订阅、合集、文件和分享保存在 D1。动态脚本、同步、归档与服务端代理暂不支持。</p>
    <article>
      <h2>基础设置</h2>
      <form @submit.prevent="save">
        <label>默认 User-Agent<input v-model="form.defaultUserAgent" /></label>
        <label>流量信息 User-Agent<input v-model="form.defaultFlowUserAgent" /></label>
        <label>请求超时（毫秒）<input v-model="form.defaultTimeout" type="number" min="1000" max="30000" /></label>
        <button :disabled="busy">保存设置</button>
      </form>
    </article>
    <article>
      <h2>本地备份</h2>
      <p>备份包含订阅、合集、文件、设置和分享。保存到安全位置，文件中可能包含订阅凭据。</p>
      <div class="buttons">
        <button @click="backup" :disabled="busy">导出 JSON 备份</button>
        <button @click="fileInput?.click()" :disabled="busy">导入备份</button>
        <input ref="fileInput" type="file" accept=".json,application/json,text/plain" hidden @change="restore" />
      </div>
      <p>恢复会替换当前基础数据。含脚本或不支持功能的备份会在写入前被拒绝。</p>
    </article>
    <article>
      <h2>管理</h2>
      <div class="buttons">
        <button @click="refresh" :disabled="busy">刷新源缓存</button>
        <button @click="router.push('/settings/more')">外观设置</button>
        <button @click="router.push('/logs')">运行日志</button>
        <button @click="signOut" :disabled="busy">退出登录</button>
      </div>
      <p>分享次数在开始导出时消耗；上游下载失败也可能消耗一次。</p>
    </article>
    <p role="status" :class="{ error: failed }">{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import LanguageSwitcherButton from '@/components/LanguageSwitcherButton.vue';
import { useSettingsStore } from '@/store/settings';
import { useSettingsApi } from '@/api/settings';
import { useEnvApi } from '@/api/env';
import { downloadBlobResponse } from '@/utils/download';
import { initStores } from '@/utils/initApp';
import { logout } from './session';
const router = useRouter();
const settings = useSettingsStore();
const api = useSettingsApi();
const form = reactive({
  defaultUserAgent: settings.defaultUserAgent,
  defaultFlowUserAgent: settings.defaultFlowUserAgent,
  defaultTimeout: settings.defaultTimeout,
});
const syncForm = () => Object.assign(form, {
  defaultUserAgent: settings.defaultUserAgent,
  defaultFlowUserAgent: settings.defaultFlowUserAgent,
  defaultTimeout: settings.defaultTimeout,
});
const busy = ref(false);
const message = ref('');
const failed = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const run = async (action: () => Promise<void>) => {
  if (busy.value) return;
  busy.value = true;
  message.value = '';
  failed.value = false;
  try { await action(); } catch (e) {
    failed.value = true;
    message.value = e instanceof Error ? e.message : '操作失败';
  } finally { busy.value = false; }
};
const ensureSuccess = (res) => {
  if (res?.data?.status !== 'success') throw new Error(res?.data?.error?.message || '操作失败');
};
const save = () => run(async () => {
  const res = await api.setSettings(form);
  ensureSuccess(res);
  await settings.fetchSettings();
  syncForm();
  message.value = '设置已保存';
});
const backup = () => run(async () => {
  const res = await api.downloadBackup();
  downloadBlobResponse(res, 'sub-store-cloudflare.json');
  message.value = '备份已导出';
});
const restore = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!window.confirm('恢复将替换当前基础数据，是否继续？')) return;
  await run(async () => {
    if (file.size > 4 * 1024 * 1024) throw new Error('备份超过 4 MiB 上限');
    ensureSuccess(await api.restoreSettings({ content: await file.text() }));
    await initStores(false, true, false);
    syncForm();
    message.value = '备份已恢复';
  });
};
const refresh = () => run(async () => {
  ensureSuccess(await useEnvApi().refreshCache());
  message.value = '源缓存已刷新';
});
const signOut = () => run(async () => {
  await logout();
  window.location.replace('/login');
});
</script>

<style scoped>
.basic-settings { padding:24px 16px 100px; display:flex; flex-direction:column; gap:20px; color:var(--primary-text-color); }
header { display:flex; align-items:center; justify-content:space-between; }
article { background:var(--card-color); padding:20px; border-radius:18px; display:flex; flex-direction:column; gap:12px; }
h1 { font-size:22px; } h2 { font-size:18px; } p { line-height:1.7; font-size:14px; }
form, label { display:flex; flex-direction:column; gap:10px; } form { gap:16px; }
input { padding:10px; background:var(--background-color); color:var(--primary-text-color); border:1px solid var(--divider-color); border-radius:8px; }
button { padding:10px 16px; background:var(--primary-color); color:white; border:0; border-radius:8px; cursor:pointer; }
button:disabled { opacity:.5; } .buttons { display:flex; flex-wrap:wrap; gap:10px; } .error { color:#dc3545; }
</style>

