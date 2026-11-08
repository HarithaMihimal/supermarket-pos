import * as branchRepository from '../repositories/branchRepository';
import type { BranchInput, BranchUserInput } from '../schemas/branchSchema';
import { AppError } from '../utils/AppError';

export const listBranches = () => branchRepository.listBranches();

export const createBranch = (data: BranchInput) => branchRepository.createBranch(data);

export async function listBranchUsers(branchId: number) {
  const branches = await branchRepository.listBranches();
  if (!branches.some(branch => Number(branch.branch_id) === branchId)) {
    throw new AppError(404, 'Branch not found');
  }
  return branchRepository.listBranchUsers(branchId);
}

export async function createBranchUser(branchId: number, data: BranchUserInput, passwordHash: string) {
  const user = await branchRepository.createBranchUser(branchId, data, passwordHash);
  if (!user) throw new AppError(404, 'Branch not found');
  return user;
}
