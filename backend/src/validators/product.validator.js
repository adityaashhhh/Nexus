const { body } = require('express-validator');

/**
 * Validation rules for creating a product
 */
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters')
    .escape(),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['electronics', 'clothing', 'books', 'food', 'sports', 'other'])
    .withMessage(
      'Category must be one of: electronics, clothing, books, food, sports, other'
    ),

  body('inStock')
    .optional()
    .isBoolean()
    .withMessage('inStock must be a boolean value'),
];

/**
 * Validation rules for updating a product
 */
const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('category')
    .optional()
    .trim()
    .isIn(['electronics', 'clothing', 'books', 'food', 'sports', 'other'])
    .withMessage(
      'Category must be one of: electronics, clothing, books, food, sports, other'
    ),

  body('inStock')
    .optional()
    .isBoolean()
    .withMessage('inStock must be a boolean value'),
];

module.exports = { createProductValidation, updateProductValidation };
