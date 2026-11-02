import * as dashboardRepository from '../repositories/dashboardRepository';

export function getDashboard(branchId: number) {
  return dashboardRepository.getDashboard(branchId);
}
