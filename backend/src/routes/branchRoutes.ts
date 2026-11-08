import { Router } from 'express';
import { createBranch, createBranchUser, listBranchUsers, listBranches } from '../controllers/branchController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', listBranches);
router.post('/', authorize('admin'), createBranch);
router.get('/:id/users', authorize('admin'), listBranchUsers);
router.post('/:id/users', authorize('admin'), createBranchUser);

export default router;
