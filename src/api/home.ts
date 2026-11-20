import { USE_MOCK, callCloudFunction } from './adapter';
import homeMock from '@/mock/home.json';

export async function getHomeData(params: { town?: string }) {
  if (USE_MOCK) {
    return homeMock;
  }
  return callCloudFunction('getHomeData', params);
}
