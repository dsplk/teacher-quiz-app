import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function KnowledgePractice() {
  const [categories, setCategories] = useState({})
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedSub, setSelectedSub] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}) }, [])

  const subs = selectedCat ? Object.keys(categories[selectedCat]?.subs || {}) : []

  async function handleStart() {
    if (!selectedSub) return alert('请选择一个知识点')
    setLoading(true)
    try {
      const questions = await api.getQuestionsByKnowledge(selectedSub)
      if (questions.length === 0) { alert('该知识点暂无题目'); setLoading(false); return }
      const key = 'practice_' + Date.now()
      sessionStorage.setItem(key, JSON.stringify(questions))
      navigate(`/practice/session?key=${key}`)
    } catch (e) { alert('获取题目失败'); setLoading(false) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">按知识点练习</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">选择知识大类</label>
          <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedSub('') }}
            className="w-full p-2 border rounded-lg">
            <option value="">-- 选择 --</option>
            {Object.keys(categories).map(c => (
              <option key={c} value={c}>{c} ({categories[c]?.total || 0}题)</option>
            ))}
          </select>
        </div>
        {subs.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">选择子知识点</label>
            <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
              className="w-full p-2 border rounded-lg">
              <option value="">-- 选择 --</option>
              {subs.map(s => (
                <option key={s} value={s}>{s} ({categories[selectedCat]?.subs?.[s]?.total || 0}题)</option>
              ))}
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
