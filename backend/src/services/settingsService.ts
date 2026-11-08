import * as settingsRepository from '../repositories/settingsRepository';
import { SettingsInput } from '../schemas/settingsSchema';
import { AppError } from '../utils/AppError';

export async function getSettings(branchId: number) {
  const settings = await settingsRepository.getSettings(branchId);
  if (!settings) throw new AppError(404, 'Shop settings not found');
  return settings;
}

export async function updateSettings(data: SettingsInput, branchId: number) {
  const settings = await settingsRepository.updateSettings(data, branchId);
  if (!settings) throw new AppError(404, 'Shop settings not found');
  return settings;
}
