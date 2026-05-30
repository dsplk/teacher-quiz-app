import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [knowledge, setKnowledge] = useState([])

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
    api.getKnowledgeStats().then(d => setKnowledge(d.filter(k => k.total > 0))).catch(() => {})
  }, [])

  if (!stats) return <div className="text-center py-12 text-gray-500">加载中...</div>

  const cards = [
    { label: '总题数', value: stats.total_questions, color: 'bg-blue-500' },
    { label: '已完成', value: stats.practiced_questions, color: 'bg-green-500' },
    { label: '正确率', value: `${stats.accuracy}%`, color: 'bg-purple-500' },
    { label: '错题数', value: stats.wrong_count, color: 'bg-red-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学习总览</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border p-4">
            <div className={`w-2 h-8 rounded-full ${c.color} mb-3`} />
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <a href="/practice/random" className="bg-white rounded-xl shadow-sm border p-4 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🎲</div>
          <div className="font-medium">随机练习</div>
        </a>
        <a href="/practice/sequential" className="bg-white rounded-xl shadow-sm border p-4 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">📝</div>
          <div className="font-medium">顺序练习</div>
        </a>
        <a href="/wrong-book" className="bg-white rounded-xl shadow-sm border p-4 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">❌</div>
          <div className="font-medium">错题本</div>
        </a>
        <a href="/recommend" className="bg-white rounded-xl shadow-sm border p-4 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🎯</div>
          <div className="font-medium">智能推荐</div>
        </a>
      </div>

      {/* Knowledge progress */}
      <h2 className="text-lg font-bold mb-4">知识点进度</h2>
      <div className="space-y-3">
        {knowledge.slice(0, 20).map(k => {
          const pct = k.total > 0 ? Math.round(k.done_count / k.total * 100) : 0
          return (
            <div key={k.name} className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium truncate">{k.name}</span>
                <span className="text-gray-500">{k.done_count}/{k.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${k.is_weak ? 'bg-red-400' : 'bg-blue-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {k.practiced > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  正确率 {k.accuracy}% {k.is_weak && <span className="text-red-500">(薄弱)</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
