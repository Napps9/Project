import ScoringPage from '@/components/ScoringPage';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">UK NPM Food Scoring</h1>
          <p className="text-sm text-gray-500">
            Nutrient Profiling Model (2004/2005) — HFSS Classification
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <ScoringPage />
      </main>
    </div>
  );
}
