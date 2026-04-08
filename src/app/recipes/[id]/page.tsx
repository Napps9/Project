import RecipeDetailPage from '@/components/RecipeDetailPage';
import Link from 'next/link';

export default function RecipeDetailRoute() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recipe Detail</h1>
            <p className="text-sm text-gray-500">
              View and edit a saved recipe
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/recipes" className="text-sm text-blue-600 hover:text-blue-800">
              All Recipes
            </Link>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              Score a Recipe
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <RecipeDetailPage />
      </main>
    </div>
  );
}
