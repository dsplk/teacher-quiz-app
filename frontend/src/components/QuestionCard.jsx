import { useState, useEffect } from 'react'
import { api } from '../api'

const TYPE_LABELS = { '单选': '单选题', '多选': '多选题', '是非': '判断题' }

export default function QuestionCard({ question, onAnswer, showResult: forceShowResult, flagged: initFlagged }) {
  const [selected, setSelected] = useState([])
  const [showResult, setShowResult] = useState(forceShowResult || false)
  const [flagged, setFlagged] = useState(initFlagged || false)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  useEffect(() => {
    setSelected([])
    setShowResult(forceShowResult || false)
    setFlagged(initFlagged || false)
    setNote('')
    setShowNote(false)
    if (question) {
      api.getFlagged().then(ids => setFlagged(ids.includes(question.id))).catch(() => {})
      api.getNote(question.id).then(d => setNote(d.content || '')).catch(() => {})
    }
  }, [question?.id])

  if (!question) return null

  const isSingle = question.type === '单选' || question.type === '是非'
  const options = question.options || []
  const correctAnswer = question.answer || ''

  function handleSelect(optLabel) {
    if (showResult) return
    let newSelected
    if (isSingle) {
      newSelected = [optLabel]
    } else {
      newSelected = selected.includes(optLabel)
        ? selected.filter(s => s !== optLabel)
        : [...selected, optLabel]
    }
    setSelected(newSelected)
  }

  function handleConfirm() {
    if (selected.length === 0) return
    setShowResult(true)
    const correct = selected.sort().join('') === correctAnswer.split('').sort().join('')
    if (onAnswer) onAnswer(correct, selected.join(''), correctAnswer)
    api.logPractice({ question_id: question.id, correct, user_answer: selected.join(''), correct_answer: correctAnswer }).catch(() => {})
  }

  async function handleToggleFlag() {
    const res = await api.toggleFlag(question.id)
    setFlagged(res.status === 'flagged')
  }

  function isCorrect(optLabel) {
    if (!showResult) return false
    return correctAnswer.includes(optLabel)
  }

  function isWrong(optLabel) {
    if (!showResult) return false
    return selected.includes(optLabel) && !correctAnswer.includes(optLabel)
  }

  function getOptionStyle(optLabel) {
    if (!showResult) {
      return selected.includes(optLabel)
        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
    }
    if (isCorrect(optLabel)) return 'border-green-500 bg-green-50 ring-2 ring-green-300'
    if (isWrong(optLabel)) return 'border-red-500 bg-red-50 ring-2 ring-red-300'
    return 'border-gray-200 opacity-60'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
            {TYPE_LABELS[question.type] || '题目'}
          </span>
          {question.exam && (
            <span className="text-xs text-gray-500">{question.exam}</span>
          )}
          {question.section && (
            <span className="text-xs text-gray-400">{question.section}</span>
          )}
        </div>
        <button
          onClick={handleToggleFlag}
          className={`text-lg px-2 py-1 rounded transition-colors ${flagged ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
          title={flagged ? '取消标记' : '标记不确定'}
        >
          {flagged ? '⭐' : '☆'}
        </button>
      </div>

      {/* Question text */}
      <div className="text-base leading-relaxed mb-6 whitespace-pre-wrap">
        {question.text}
      </div>

      {/* Options */}
      <div className="space-y-2 mb-6">
        {options.map((opt, i) => {
          const label = String.fromCharCode(65 + i)
          const text = opt.replace(/^[A-E][.、]\s*/, '')
          return (
            <button
              key={i}
              onClick={() => handleSelect(label)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${getOptionStyle(label)}`}
            >
              <span className="font-medium mr-2">{label}.</span>
              {text}
            </button>
          )
        })}
      </div>

      {/* Confirm button */}
      {!showResult && (
        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className="w-full py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          确认答案
        </button>
      )}

      {/* Result */}
      {showResult && (
        <div className={`rounded-lg p-4 mb-4 ${selected.sort().join('') === correctAnswer.split('').sort().join('') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">
              {selected.sort().join('') === correctAnswer.split('').sort().join('') ? '✅ 回答正确' : '❌ 回答错误'}
            </span>
          </div>
          <div className="text-sm">
            {selected.sort().join('') !== correctAnswer.split('').sort().join('') && (
              <div>正确答案：<span className="font-bold text-green-700">{correctAnswer}</span></div>
            )}
            {question.explanation && (
              <div className="mt-2 text-gray-600">
                <span className="font-medium">解析：</span>
                {question.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note toggle */}
      <button
        onClick={() => setShowNote(!showNote)}
        className="text-sm text-gray-500 hover:text-blue-600 mt-2"
      >
        {showNote ? '收起笔记' : '📝 笔记'}
      </button>
      {showNote && (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={() => api.saveNote(question.id, note).catch(() => {})}
          placeholder="添加个人笔记..."
          className="w-full mt-2 p-3 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          rows={3}
        />
      )}
    </div>
  )
}
