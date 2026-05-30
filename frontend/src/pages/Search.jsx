import { useState, useCallback } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearched(true)
    try {
      const data = await api.search(query.trim())
      setResults(data)
    } catch (e) { setResults([]) }
  }, [query])

  function handlePractice(q) {
    const key = 'practice_' + Date.now()
    sessionStorage.setItem(key, JSON.stringify([q]))
    navigate(`/practice/session?key=${key}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">搜索题目</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="输入关键词搜索题目..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button onClick={handleSearch}
          className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          搜索
        </button>
      </div>

      {searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-400">未找到匹配题目</div>
      )}

      <div className="space-y-3">
        {results.map((q, i) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">{q.type}</span>
              <span>{q.exam}</span>
              <span>{q.major_category}</span>
            </div>
            <div className="text-sm mb-2 line-clamp-3">{i + 1}. {q.text}</div>
            <button onClick={() => handlePractice(q)}
              className="text-xs text-blue-600 hover:underline">
              练习此题
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
