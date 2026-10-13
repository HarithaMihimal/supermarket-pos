import { useEffect, useState } from 'react';
import { api } from './services/api';

interface Product {
  product_id: number;
  name: string;
  barcode: string;
  selling_price: string;
  category: string;
  quantity: string | null;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Product[]>('/products')
      .then(response => setProducts(response.data))
      .catch(() => setError('Unable to load products'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">
        Supermarket POS
      </h1>

      {error && <p className="text-red-600">{error}</p>}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price (LKR)</th>
              <th className="p-4">Stock</th>
            </tr>
          </thead>

          <tbody>
            {products.map(product => (
              <tr key={product.product_id} className="border-t">
                <td className="p-4">{product.name}</td>
                <td className="p-4">{product.category}</td>
                <td className="p-4">
                  {Number(product.selling_price).toFixed(2)}
                </td>
                <td className="p-4">{product.quantity ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;