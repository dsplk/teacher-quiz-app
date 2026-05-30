import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function RandomPractice() {
  const [count, setCount] = useState(10)
  const [categories, setCategories] = useState({})
  const [category, setCategory] = useState('')
  const [sub, setSub] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}) }, [])

  async function handleStart() {
    setLoading(true)
    try {
      const params = { count, has_answer: 'true' }
      if (category) params.category = category
      if (sub) params.sub_category = sub
      const questions = await api.getRandomQuestions(params)
      const key = 'practice_' + Date.now()
      sessionStorage.setItem(key, JSON.stringify(questions))
      navigate(`/practice/session?key=${key}`)
    } catch (e) { alert('获取题目失败'); setLoading(false) }
  }

  const subs = category ? (categories[category]?.subs ? Object.keys(categories[category].subs) : []) : []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">随机练习</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">题目数量</label>
          <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} min={1} max={100}
            className="w-full p-2 border rounded-lg" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">知识大类（可选）</label>
          <select value={category} onChange={e => { setCategory(e.target.value); setSub('') }}
            className="w-full p-2 border rounded-lg">
            <option value="">全部</option>
            {Object.keys(categories).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {subs.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">子知识点（可选）</label>
            <select value={sub} onChange={e => setSub(e.target.value)} className="w-full p-2 border rounded-lg">
              <option value="">全部</option>
              {subs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <button onClick={handleStart} disabled={loading}
          className="w-full py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
          {loading ? '加载中...' : '开始练习'}
        </button>
      </div>
    </div>
  )
}
