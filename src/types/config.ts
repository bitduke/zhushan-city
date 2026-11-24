export interface ConfigItem {
  id: string;
  name: string;
  active: boolean;
  code?: string;
  icon?: string;
  desc?: string;
}

export interface AppConfig {
  towns: ConfigItem[];
  infoCategories: ConfigItem[];
  merchantCategories: ConfigItem[];
}
