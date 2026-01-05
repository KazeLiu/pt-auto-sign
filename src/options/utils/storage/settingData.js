import {storage} from './index';

const SETTINGS_KEY = 'settings';
export async function getSettingData() {
    return storage.get(SETTINGS_KEY, {});
}

export async function setSettingData(value) {
    await storage.set(SETTINGS_KEY, value);
}