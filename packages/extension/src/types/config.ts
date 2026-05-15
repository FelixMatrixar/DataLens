export interface UserConfig {
  videodbApiKey: string;
  openrouterApiKey: string;
  userId: string;
  frontendUrl: string;
  videodbCollectionId: string;
  userAlerts?: UserAlert[];
}

export interface UserAlert {
  id: string;
  keyword: string;
  description: string;
  enabled: boolean;
}
