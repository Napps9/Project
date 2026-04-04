import { useState } from 'react';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">UK NPM Food Scoring</h1>
          <p className="text-sm text-gray-500">
            Nutrient Profiling Model (2004/2005) — HFSS Classification
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Score a Product</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ProductForm onProductSaved={() => setRefreshKey((k) => k + 1)} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Saved Products</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ProductList refreshKey={refreshKey} />
          </div>
        </section>
      </main>
    </div>
  );
}
