import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function Stats() {
  const [knowledge, setKnowledge] = useState([])
  const [stats, setStats] = useState(null)
  const chartRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
    api.getKnowledgeStats().then(d => setKnowledge(d.filter(k => k.total > 0))).catch(() => {})
  }, [])

  useEffect(() => {
    if (knowledge.length === 0 || canvasRef.current === null) return

    // Destroy previous chart
    if (chartRef.current) { chartRef.current.destroy() }

    const top = knowledge.slice(0, 15)
    const ctx = canvasRef.current.getContext('2d')
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(k => k.name.length > 8 ? k.name.slice(0, 8) + '..' : k.name),
        datasets: [
          {
            label: '正确率 (%)',
            data: top.map(k => k.accuracy),
            backgroundColor: top.map(k => k.is_weak ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)'),
            borderColor: top.map(k => k.is_weak ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: false } },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [knowledge])

  if (!stats) return <div className="text-center py-12 text-gray-500">加载中...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">统计看板</h1>

      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '总题数', value: stats.total_questions },
          { label: '已完成', value: stats.practiced_questions },
          { label: '总练习次数', value: stats.total_practiced },
          { label: '正确率', value: `${stats.accuracy}%` },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">知识点正确率 (Top 15)</h2>
        <canvas ref={canvasRef} height="300" />
      </div>

      {/* Knowledge table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <h2 className="text-lg font-bold p-4 border-b">详细知识点统计</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">知识点</th>
                <th className="text-center p-3">大类</th>
                <th className="text-center p-3">总题数</th>
                <th className="text-center p-3">已做题</th>
                <th className="text-center p-3">正确率</th>
                <th className="text-center p-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {knowledge.map(k => (
                <tr key={k.name} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{k.name}</td>
                  <td className="p-3 text-center text-gray-500">{k.major_category}</td>
                  <td className="p-3 text-center">{k.total}</td>
                  <td className="p-3 text-center">{k.done_count}</td>
                  <td className="p-3 text-center">{k.accuracy}%</td>
                  <td className="p-3 text-center">
                    {k.is_weak
                      ? <span className="text-red-500 font-medium">薄弱</span>
                      : k.accuracy > 0
                        ? <span className="text-green-500">良好</span>
                        : <span className="text-gray-400">未练习</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
