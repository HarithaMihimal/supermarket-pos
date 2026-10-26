import * as settingsRepository from '../repositories/settingsRepository';
import { SettingsInput } from '../schemas/settingsSchema';
import { AppError } from '../utils/AppError';

export async function getSettings() {
  const settings = await settingsRepository.getSettings();
  if (!settings) throw new AppError(404, 'Shop settings not found');
  return settings;
}

export async function updateSettings(data: SettingsInput) {
  const settings = await settingsRepository.updateSettings(data);
  if (!settings) throw new AppError(404, 'Shop settings not found');
  return settings;
}
