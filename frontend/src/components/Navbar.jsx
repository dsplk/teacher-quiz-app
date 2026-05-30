import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '首页', icon: '📊' },
  { to: '/practice/random', label: '随机练习', icon: '🎲' },
  { to: '/practice/sequential', label: '顺序练习', icon: '📝' },
  { to: '/practice/knowledge', label: '知识点', icon: '📚' },
  { to: '/wrong-book', label: '错题本', icon: '❌' },
  { to: '/stats', label: '统计', icon: '📈' },
  { to: '/recommend', label: '推荐', icon: '🎯' },
  { to: '/search', label: '搜索', icon: '🔍' },
]

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <span className="font-bold text-lg text-blue-600 whitespace-nowrap">刷题系统</span>
          <div className="flex gap-1 overflow-x-auto">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {l.icon} {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
