import { defineStore } from 'pinia';
import base from '../../cloudfunctions/configManage/base.json';
import { getAppConfig } from '@/api/config';
import type { AppConfig } from '@/types/config';

export const useConfigStore = defineStore('config', {
  state: (): AppConfig => JSON.parse(JSON.stringify(base)),
  actions: {
    async load() {
      const config = await getAppConfig();
      this.towns = config.towns;
      this.infoCategories = config.infoCategories;
      this.merchantCategories = config.merchantCategories;
    }
  }
});
