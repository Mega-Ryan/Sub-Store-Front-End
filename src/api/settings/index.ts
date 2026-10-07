import request from '@/api';
import { AxiosPromise } from 'axios';
import { isCloudflareBasic } from '@/cloudflare/mode';

let settingsVersion: number | undefined;
const rememberSettingsVersion = (response) => {
  if (response?.data?.status === 'success') settingsVersion = response.data.data?._version;
  return response;
};

export function useSettingsApi() {
  return {
    getSettings: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/settings',
        method: 'get',
      }).then(rememberSettingsVersion);
    },
    setSettings: (data: SettingsPostData): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/settings',
        method: 'patch',
        data: isCloudflareBasic ? { ...data, _version: settingsVersion } : data,
      }).then(rememberSettingsVersion);
    },
    syncSettings: (query: 'download' | 'upload', options?: GistBackupSyncOptions): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/utils/backup`,
        method: 'get',
        params: {
          action: query,
          keep: options?.keep?.join(','),
          encode: options?.encode,
          tokenStrategy: options?.tokenStrategy,
        }
      });
    },
    downloadBackup: (): AxiosPromise<Blob> => {
      return request({
        url: '/api/storage',
        method: 'get',
        responseType: 'blob',
      });
    },
    restoreSettings: (data: StoragePostData): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/storage',
        method: 'post',
        data,
      });
    },
  };
}
