const productModel = require('../models/productModel');

const getProducts = (req, res) => {
  const products = productModel.getAllProducts();
  res.json(products);
};

const createProduct = (req, res) => {
  const newProduct = req.body;
  productModel.addProduct(newProduct);
  res.status(201).json({ message: 'Product created', product: newProduct });
};

module.exports = {
  getProducts,
  createProduct
};
