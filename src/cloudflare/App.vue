<template>
  <NavBar v-if="authenticated" />
  <SideBar v-if="authenticated" v-show="shouldShowSideBar" />
  <main class="page-body"><router-view /></main>
  <LogsOverlay v-if="authenticated" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import SideBar from '@/components/SideBar.vue';
import LogsOverlay from '@/components/LogsOverlay.vue';
import { useThemes } from '@/hooks/useThemes';
import { useWideScreenNarrowMode } from '@/hooks/useWideScreenNarrowMode';
import { useGlobalStore } from '@/store/global';
import { useSubsStore } from '@/store/subs';
import { getFlowsUrlList } from '@/utils/getFlowsUrlList';
import { authenticated, resetSession } from './session';

useThemes();
const router = useRouter();
const globalStore = useGlobalStore();
const subsStore = useSubsStore();
const { shouldShowSideBar } = useWideScreenNarrowMode();
watchEffect(() => {
  const keys = getFlowsUrlList(subsStore.subs).map(([url]) => url);
  globalStore.setFlowFetching(keys.some(url => !(url in subsStore.flows)));
});
const onSessionExpired = () => {
  resetSession();
  subsStore.subs = [];
  subsStore.collections = [];
  subsStore.files = [];
  subsStore.shares = [];
  globalStore.env = {};
  const redirect = router.currentRoute.value.fullPath;
  void router.replace({ path: '/login', query: { redirect } });
};
onMounted(() => window.addEventListener('sub-store:unauthorized', onSessionExpired));
onUnmounted(() => window.removeEventListener('sub-store:unauthorized', onSessionExpired));
</script>

<style lang="scss">
#app {
  font-family: "Roboto", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  display: flex;
  align-items: center;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: var(--background-color);
  .page-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    @include responsive-container-width;
  }
}
</style>

