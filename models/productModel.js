// Example model using in-memory storage
const products = [
  { id: 1, name: 'Componente 1', price: 100 },
  { id: 2, name: 'Componente 2', price: 200 }
];

const getAllProducts = () => {
  return products;
};

const addProduct = (product) => {
  const newId = products.length + 1;
  product.id = newId;
  products.push(product);
};

module.exports = {
  getAllProducts,
  addProduct
};
