import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import RandomPractice from './pages/RandomPractice'
import SequentialPractice from './pages/SequentialPractice'
import KnowledgePractice from './pages/KnowledgePractice'
import PracticeSession from './pages/PracticeSession'
import WrongBook from './pages/WrongBook'
import Stats from './pages/Stats'
import Recommend from './pages/Recommend'
import Search from './pages/Search'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice/random" element={<RandomPractice />} />
          <Route path="/practice/sequential" element={<SequentialPractice />} />
          <Route path="/practice/knowledge" element={<KnowledgePractice />} />
          <Route path="/practice/session" element={<PracticeSession />} />
          <Route path="/wrong-book" element={<WrongBook />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/recommend" element={<Recommend />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>
    </div>
  )
}
