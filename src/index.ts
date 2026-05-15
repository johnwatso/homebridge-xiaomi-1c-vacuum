import { API } from 'homebridge';
import { OneCMatterPlatform } from './platform.js';

export default (api: API) => {
  api.registerPlatform('homebridge-1c-matter', 'OneCMatter', OneCMatterPlatform);
};
