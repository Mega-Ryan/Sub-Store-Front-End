import { useGlobalStore } from '@/store/global';
import { isCloudflareBasic } from './mode';

export const BASIC_PROCESSORS = [
  'Useless Filter', 'Region Filter', 'Regex Filter', 'Type Filter', 'Conditional Filter',
  'Quick Setting Operator', 'Flag Operator', 'Sort Operator', 'Regex Sort Operator',
  'Regex Rename Operator', 'Regex Delete Operator', 'Handle Duplicate Operator',
];

export const supportsProcessor = (type: string): boolean => {
  const env = useGlobalStore().env;
  if (env.capabilities?.processors) return env.capabilities.processors.includes(type);
  return !isCloudflareBasic || BASIC_PROCESSORS.includes(type);
};

export const supportsTarget = (target: string | null): boolean => {
  if (target === null) return true;
  const targets = useGlobalStore().env.capabilities?.targets;
  const canonical = ({ QX: 'QuantumultX', ShadowRocket: 'Shadowrocket' })[target] || target;
  return !targets || targets.includes(target) || targets.includes(canonical);
};

export const supportsFeature = (name: string): boolean => {
  const env = useGlobalStore().env;
  const capability = env.capabilities?.[name];
  if (typeof capability === 'boolean') return capability;
  if (typeof env.feature?.[name] === 'boolean') return env.feature[name];
  return !isCloudflareBasic;
};

