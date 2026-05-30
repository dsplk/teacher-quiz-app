import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function WrongBook() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    api.getWrongAnswers().then(d => setItems(d)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleRemove(id) {
    await api.deleteWrongAnswer(id)
    load()
  }

  async function handleReview(id) {
    await api.reviewWrongAnswer(id)
    load()
  }

  async function handleClear(qid) {
    await api.clearWrongAnswers([qid])
    load()
  }

  function handleRedoAll() {
    const qs = items.filter(i => i.question).map(i => i.question)
    if (qs.length === 0) return
    const key = 'practice_' + Date.now()
    sessionStorage.setItem(key, JSON.stringify(qs))
    navigate(`/practice/session?key=${key}`)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">错题本</h1>
        {items.length > 0 && (
          <button onClick={handleRedoAll}
            className="px-4 py-2 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors">
            重做全部错题
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🎉</div>
          <p>暂无错题，继续保持！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const q = item.question
            if (!q) return null
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-600">{q.type}</span>
                    <span>错误 {item.error_count} 次</span>
                    {item.reviewed && <span className="text-green-500">✓ 已掌握</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(item.id)}
                      className="text-xs px-2 py-1 rounded border hover:bg-green-50" title="标记已掌握">
                      ✓
                    </button>
                    <button onClick={() => handleClear(item.question_id)}
                      className="text-xs px-2 py-1 rounded border hover:bg-red-50" title="移出错题本">
                      ✕
                    </button>
                  </div>
                </div>
                <div className="text-sm mb-2 line-clamp-2">{q.text}</div>
                {item.user_answer && (
                  <div className="text-sm mb-1">
                    <span className="text-red-600">你的答案：{item.user_answer}</span>
                    <span className="ml-4 text-green-600">正确答案：{item.correct_answer}</span>
                  </div>
                )}
                <button onClick={() => handleClear(item.question_id)}
                  className="text-xs text-blue-600 hover:underline">
                  移出错题本
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
