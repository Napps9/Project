import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Universa Trade Tracker</h1>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">Paper Trading</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
