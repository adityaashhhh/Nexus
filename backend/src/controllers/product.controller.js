const Product = require('../models/Product');

/**
 * @desc    Get all products (with pagination, filtering, sorting)
 * @route   GET /api/v1/products
 * @access  Private
 */
const getProducts = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.inStock !== undefined) {
      filter.inStock = req.query.inStock === 'true';
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Sorting
    let sort = { createdAt: -1 }; // Default: newest first
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-')
        ? req.query.sort.substring(1)
        : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort = { [sortField]: sortOrder };
    }

    // Execute query
    const products = await Product.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination info
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/v1/products/:id
 * @access  Private
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/v1/products
 * @access  Private
 */
const createProduct = async (req, res, next) => {
  try {
    // Add the logged-in user as the creator
    req.body.createdBy = req.user.id;

    const product = await Product.create(req.body);

    // Populate createdBy for the response
    await product.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a product
 * @route   PUT /api/v1/products/:id
 * @access  Private (Owner or Admin)
 */
const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check ownership: only the creator or an admin can update
    if (
      product.createdBy.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product',
      });
    }

    // Prevent changing the createdBy field
    delete req.body.createdBy;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/v1/products/:id
 * @access  Private (Admin only)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
