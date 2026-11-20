import { USE_MOCK, callCloudFunction } from './adapter';
import rankingMock from '@/mock/ranking.json';

export async function getPromoterRanking() {
  if (USE_MOCK) {
    return rankingMock;
  }
  return callCloudFunction('getPromoterRanking');
}
