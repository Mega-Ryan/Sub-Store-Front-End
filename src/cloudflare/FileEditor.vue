<template>
  <section class="basic-file-editor">
    <h1>{{ originalName === 'UNTITLED' ? '新增文件' : '编辑文件' }}</h1>
    <p>支持普通文本、JSON 和 YAML。内容保存到 D1，可下载或创建分享链接。</p>
    <form @submit.prevent="submit">
      <label>名称<input v-model.trim="form.name" required /></label>
      <label>显示名称<input v-model="form.displayName" /></label>
      <label>备注<input v-model="form.remark" /></label>
      <label>标签（逗号分隔）<input v-model="tags" /></label>
      <label>来源<select v-model="form.source"><option value="local">本地内容</option><option value="remote">远程 HTTP／HTTPS 文件</option></select></label>
      <label v-if="form.source === 'remote'">文件 URL<input v-model.trim="form.url" type="url" required /></label>
      <label v-else>文件内容<textarea v-model="form.content" rows="18" spellcheck="false" /></label>
      <p class="error" role="alert" v-if="error">{{ error }}</p>
      <div class="buttons"><button :disabled="busy || loading">{{ busy ? '保存中…' : '保存' }}</button><button type="button" @click="router.push('/files')">返回文件列表</button></div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFilesApi } from '@/api/files';
import { useSubsStore } from '@/store/subs';
const route = useRoute();
const router = useRouter();
const api = useFilesApi();
const originalName = String(route.params.id);
const tags = ref('');
const form = reactive({
  name: '', displayName: '', remark: '', source: 'local', content: '', url: '',
  type: 'file', process: [], download: true, version: undefined as number | undefined,
});
const busy = ref(false);
const loading = ref(false);
const error = ref('');
onMounted(async () => {
  if (originalName === 'UNTITLED') return;
  loading.value = true;
  try {
    const res = await api.getWholeFile(originalName);
    if (res?.data?.status !== 'success') throw new Error(res?.data?.error?.message || '读取文件失败');
    Object.assign(form, res.data.data);
    tags.value = (res.data.data.tag || []).join(', ');
  } catch (e) { error.value = e instanceof Error ? e.message : '读取文件失败'; }
  finally { loading.value = false; }
});
const submit = async () => {
  busy.value = true;
  error.value = '';
  try {
    if (!form.name || form.name.includes('/') || form.name === 'UNTITLED') throw new Error('名称不能为空、不能含斜杠或使用 UNTITLED');
    if (form.source === 'remote') {
      const url = new URL(form.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('仅支持 HTTP／HTTPS URL');
    } else if (new TextEncoder().encode(form.content).length > 512 * 1024) {
      throw new Error('文件内容超过 512 KiB 上限');
    }
    const payload = { ...form, type: 'file', process: [], tag: tags.value.split(',').map(x => x.trim()).filter(Boolean) };
    const res = originalName === 'UNTITLED' ? await api.createFile(payload) : await api.editFile(originalName, payload);
    if (res?.data?.status !== 'success') throw new Error(res?.data?.error?.message || '保存失败');
    await useSubsStore().fetchFiles();
    await router.replace('/files');
  } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
};
</script>

<style scoped>
.basic-file-editor { padding:24px 16px 100px; display:flex; flex-direction:column; gap:18px; color:var(--primary-text-color); }
h1 { font-size:22px; } p { line-height:1.7; } form, label { display:flex; flex-direction:column; gap:10px; } form { gap:18px; }
input, select, textarea { padding:12px; color:var(--primary-text-color); background:var(--card-color); border:1px solid var(--divider-color); border-radius:8px; }
textarea { resize:vertical; font-family:monospace; }
button { padding:12px 18px; background:var(--primary-color); color:white; border:0; border-radius:8px; cursor:pointer; }
button:disabled { opacity:.5; } .buttons { display:flex; flex-wrap:wrap; gap:12px; } .error { color:#dc3545; }
</style>

