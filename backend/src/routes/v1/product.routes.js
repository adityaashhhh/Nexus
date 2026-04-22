const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../../controllers/product.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const { validate } = require('../../middleware/validate');
const {
  createProductValidation,
  updateProductValidation,
} = require('../../validators/product.validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *           enum: [electronics, clothing, books, food, sports, other]
 *         inStock:
 *           type: boolean
 *         createdBy:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             email:
 *               type: string
 *       example:
 *         name: Wireless Headphones
 *         description: Premium noise-canceling wireless headphones
 *         price: 149.99
 *         category: electronics
 *         inStock: true
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product CRUD operations
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products (with pagination, filtering, sorting)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 10)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [electronics, clothing, books, food, sports, other]
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (prefix with - for descending, e.g. -price)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: List of products with pagination info
 *       401:
 *         description: Not authorized
 */
router.get('/', protect, getProducts);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', protect, getProduct);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wireless Headphones
 *               description:
 *                 type: string
 *                 example: Premium noise-canceling wireless headphones
 *               price:
 *                 type: number
 *                 example: 149.99
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, books, food, sports, other]
 *                 example: electronics
 *               inStock:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', protect, createProductValidation, validate, createProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update a product (owner or admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               inStock:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Not authorized to update
 *       404:
 *         description: Product not found
 */
router.put('/:id', protect, updateProductValidation, validate, updateProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete a product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Product not found
 */
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
