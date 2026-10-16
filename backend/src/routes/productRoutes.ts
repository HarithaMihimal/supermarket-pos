// import { Router } from 'express';
// import { pool } from '../config/database';

// const router = Router();

// router.get('/', async (_req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         p.product_id,
//         p.name,
//         p.barcode,
//         p.selling_price,
//         c.name AS category,
//         i.quantity
//       FROM products p
//       LEFT JOIN categories c
//         ON p.category_id = c.category_id
//       LEFT JOIN inventory i
//         ON p.product_id = i.product_id
//        AND i.branch_id = 1
//       WHERE p.active = TRUE
//       ORDER BY p.product_id
//     `);

//     res.json(result.rows);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to fetch products'
//     });
//   }
// });

// export default router;

import { Router } from 'express';
import { pool } from '../config/database';
import {
  createProduct,
  updateProduct,
} from '../controllers/productController';

const router = Router();

// GET all products
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        p.product_id,
        p.name,
        p.barcode,
        p.selling_price,
        c.name AS category,
        i.quantity
      FROM products p
      LEFT JOIN categories c
        ON p.category_id = c.category_id
      LEFT JOIN inventory i
        ON p.product_id = i.product_id
       AND i.branch_id = 1
      WHERE p.active = TRUE
      ORDER BY p.product_id
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST create product
router.post('/', createProduct);

// PUT update product
router.put('/:id', updateProduct);

export default router;