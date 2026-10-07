import request from '@/api';
import { AxiosPromise } from 'axios';
import { isCloudflareBasic } from '@/cloudflare/mode';
import { useSubsStore } from '@/store/subs';

export function useFilesApi() {
  return {
    getFiles: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/files',
        method: 'get',
      });
    },
    getWholeFiles: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/wholeFiles',
        method: 'get',
      });
    },
    getFile: (name: string): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/file/${encodeURIComponent(name)}`,
        method: 'get',
      });
    },
    getWholeFile: (name: string): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/wholeFile/${encodeURIComponent(name)}`,
        method: 'get',
      });
    },
    exportFile: (name: string): AxiosPromise<Blob> => {
      return request({
        url: `/api/wholeFile/${encodeURIComponent(name)}`,
        method: 'get',
        params: { raw: 1 },
        responseType: 'blob',
      });
    },
    createFile: (data: any): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/files',
        method: 'post',
        data,
      });
    },
    editFile: (name: string, data: any): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/file/${encodeURIComponent(name)}`,
        method: 'patch',
        data: isCloudflareBasic ? { ...data, version: data.version ?? useSubsStore().getOneFile(name)?.version } : data,
      });
    },
    deleteFile: (
      name: string,
      mode?: DeleteMode,
    ): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/file/${encodeURIComponent(name)}`,
        method: 'delete',
        params: mode ? { mode } : undefined,
      });
    },
  };
}
