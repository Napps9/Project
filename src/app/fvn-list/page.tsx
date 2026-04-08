import FvnListPage from '@/components/FvnListPage';
import Link from 'next/link';

export default function FvnListRoute() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Learned FVN Ingredients</h1>
            <p className="text-sm text-gray-500">
              Ingredients the system has learned from your scoring history
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              Score a Recipe
            </Link>
            <Link href="/recipes" className="text-sm text-blue-600 hover:text-blue-800">
              Recipes
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <FvnListPage />
      </main>
    </div>
  );
}
