import { useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function PracticeSession() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [questions] = useState(() => {
    // Read from sessionStorage (set by practice config pages)
    const key = searchParams.get('key')
    try {
      const stored = sessionStorage.getItem(key || 'practice_questions')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [index, setIndex] = useState(0)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">没有题目数据</p>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">返回首页</button>
      </div>
    )
  }

  const current = questions[index]
  const total = questions.length
  const progress = ((index + 1) / total * 100).toFixed(0)

  function handleAnswer(correct) {
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }))
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
          <span>第 {index + 1}/{total} 题</span>
          <span>✅ {stats.correct} ❌ {stats.wrong}</span>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-xs">退出</button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <QuestionCard
        key={current?.id}
        question={current}
        onAnswer={handleAnswer}
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex-1 py-3 rounded-lg border border-gray-300 font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          ← 上一题
        </button>
        <button
          onClick={() => setIndex(i => Math.min(total - 1, i + 1))}
          disabled={index >= total - 1}
          className="flex-1 py-3 rounded-lg border border-gray-300 font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          下一题 →
        </button>
      </div>
    </div>
  )
}
