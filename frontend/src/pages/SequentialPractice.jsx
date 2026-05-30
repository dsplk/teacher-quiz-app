import { useState, useEffect } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function SequentialPractice() {
  const [exams, setExams] = useState({})
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedExam, setSelectedExam] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { api.getExams().then(setExams).catch(() => {}) }, [])

  const levels = ['小学', '初中', '高中']

  async function handleStart() {
    if (!selectedExam && !selectedLevel) return alert('请选择考试或学段')
    setLoading(true)
    try {
      const params = {}
      if (selectedExam) params.exam = selectedExam
      else if (selectedLevel) params.level = selectedLevel
      const questions = await api.getSequentialQuestions(params)
      if (questions.error) { alert(questions.error); setLoading(false); return }
      const key = 'practice_' + Date.now()
      sessionStorage.setItem(key, JSON.stringify(questions))
      navigate(`/practice/session?key=${key}`)
    } catch (e) { alert('获取题目失败'); setLoading(false) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">顺序练习</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">选择学段</label>
          <div className="flex gap-2">
            {levels.map(l => (
              <button key={l} onClick={() => { setSelectedLevel(l); setSelectedExam('') }}
                className={`px-4 py-2 rounded-lg border transition-colors ${selectedLevel === l ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">或选择具体考试</label>
          <select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setSelectedLevel('') }}
            className="w-full p-2 border rounded-lg">
            <option value="">-- 选择 --</option>
            {Object.entries(exams).map(([level, list]) =>
              list.map(e => <option key={e} value={e}>{level} - {e}</option>)
            )}
          </select>
        </div>
        <button onClick={handleStart} disabled={loading}
          className="w-full py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
          {loading ? '加载中...' : '开始练习'}
        </button>
      </div>
    </div>
  )
}
