import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Recommend() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const navigate = useNavigate()

  async function handleRecommend() {
    setLoading(true)
    try {
      const data = await api.getRecommend(10)
      setQuestions(data)
      setLoaded(true)
    } catch (e) { alert('获取推荐失败') }
    setLoading(false)
  }

  function handlePractice() {
    if (questions.length === 0) return
    const key = 'practice_' + Date.now()
    sessionStorage.setItem(key, JSON.stringify(questions))
    navigate(`/practice/session?key=${key}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">智能推荐</h1>
      <p className="text-gray-500 mb-6">基于错题知识点分析，推荐你最需要练习的题目</p>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-bold mb-2">推荐算法说明</h2>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
          <li>分析错题本，统计各知识点错误频率，取 top 3</li>
          <li>从这 3 个知识点下筛选：未做过的 或 做过但错误次数多的题目</li>
          <li>随机抽选 10 题生成推荐练习卷</li>
          <li>若无错题记录，则从全部题库中随机推荐</li>
        </ol>
      </div>

      <button onClick={handleRecommend} disabled={loading}
        className="w-full max-w-md py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition-colors mb-6">
        {loading ? '分析中...' : loaded ? '重新生成' : '生成推荐练习'}
      </button>

      {loaded && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">共推荐 {questions.length} 题</span>
            <button onClick={handlePractice}
              className="px-4 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
              开始练习
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">{q.type}</span>
                  <span>{q.major_category} / {q.sub_category}</span>
                </div>
                <div className="text-sm line-clamp-2">{i + 1}. {q.text}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loaded && !loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🎯</div>
          <p>点击上方按钮生成推荐练习</p>
        </div>
      )}
    </div>
  )
}
