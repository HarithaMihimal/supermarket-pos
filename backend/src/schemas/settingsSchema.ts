import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(40),
  email: z.string().trim().email().or(z.literal('')),
  tax_id: z.string().trim().max(100),
  currency: z.string().trim().min(1).max(10),
  receipt_footer: z.string().trim().max(255),
  default_reorder_level: z.number().finite().nonnegative(),
}).strict();

export type SettingsInput = z.infer<typeof settingsSchema>;
