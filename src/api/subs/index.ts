import request from '@/api';
import { AxiosPromise } from 'axios';
import { isCloudflareBasic } from '@/cloudflare/mode';
import { useSubsStore } from '@/store/subs';

export function useSubsApi() {
  return {
    getSubs: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/subs',
        method: 'get',
      });
    },
    getCollections: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/collections`,
        method: 'get',
      });
    },
    getOne: (type: string, name: string): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/${type}/${encodeURIComponent(name)}`,
        method: 'get',
      });
    },
    exportOne: (type: 'sub' | 'collection', name: string): AxiosPromise<Blob> => {
      return request({
        url: `/api/${type}/${encodeURIComponent(name)}`,
        method: 'get',
        params: { raw: 1 },
        responseType: 'blob',
      });
    },
    downloadOne: (name: string, params?: any): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/download/${encodeURIComponent(name)}`,
        params,
        method: 'get',
      });
    },
    getFlow: (name: string, signal?: AbortSignal): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/sub/flow/${encodeURIComponent(name)}`,
        method: 'get',
        signal,
      });
    },
    getSubInfo: (data: NodeInfo): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/utils/node-info`,
        method: 'post',
        data,
      });
    },
    createSub: (
      type: string,
      data: Sub | Collection,
    ): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/${type}`,
        method: 'post',
        data,
      });
    },
    editSub: (
      type: string,
      name: string,
      data: Sub | Collection
    ): AxiosPromise<MyAxiosRes> => {
      const current = type === 'sub' ? useSubsStore().getOneSub(name) : useSubsStore().getOneCollection(name);
      return request({
        url: `/api/${type}/${encodeURIComponent(name)}`,
        method: 'patch',
        data: isCloudflareBasic ? { ...data, version: data.version ?? current?.version } : data,
      });
    },
    deleteSub: (
      type: string,
      name: string,
      mode?: DeleteMode,
    ): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/${type}/${encodeURIComponent(name)}`,
        method: 'delete',
        params: mode ? { mode } : undefined,
      });
    },
    compareSub: (
      type: string,
      data: Sub | Collection | any
    ): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/preview/${type}`,
        method: 'post',
        data,
      });
    },
    sortSub: (
      type: string,
      data: Sub | Collection | Artifacts
    ): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/${type}`,
        method: 'put',
        data,
      });
    },
    newSortSub: (
      type: string,
      data: Sub | Collection | Artifacts
    ): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/sort/${type}`,
        method: 'post',
        data,
      });
    },
  };
}
