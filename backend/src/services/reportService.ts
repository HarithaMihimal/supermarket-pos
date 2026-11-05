import * as reportRepository from '../repositories/reportRepository';
import { ReportQuery } from '../schemas/reportSchema';

export function getManagementReports(branchId: number, query: ReportQuery) {
  return reportRepository.getManagementReports(branchId, query);
}