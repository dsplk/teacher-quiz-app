const BASE = '/api';

async function get(url) {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function post(url, data) {
  const res = await fetch(BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function del(url, data) {
  const opts = { method: 'DELETE' };
  if (data) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(data);
  }
  const res = await fetch(BASE + url, opts);
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
  return res.json();
}

export const api = {
  // Stats
  getStats: () => get('/stats'),
  getKnowledgeStats: () => get('/stats/knowledge'),
  getWeakness: () => get('/stats/weakness'),

  // Questions
  getRandomQuestions: (params) => {
    const q = new URLSearchParams(params).toString();
    return get(`/questions/random?${q}`);
  },
  getSequentialQuestions: (params) => {
    const q = new URLSearchParams(params).toString();
    return get(`/questions/sequential?${q}`);
  },
  getQuestionsByKnowledge: (sub) => get(`/questions/by-knowledge?sub=${encodeURIComponent(sub)}`),
  getQuestion: (id) => get(`/questions/${id}`),

  // Categories & Exams
  getCategories: () => get('/categories'),
  getExams: () => get('/exams'),

  // Practice
  logPractice: (data) => post('/practice/log', data),

  // Wrong answers
  getWrongAnswers: () => get('/wrong-answers'),
  deleteWrongAnswer: (id) => del(`/wrong-answers/${id}`),
  reviewWrongAnswer: (id) => post(`/wrong-answers/${id}/review`),
  clearWrongAnswers: (ids) => post('/wrong-answers/clear', { question_ids: ids }),

  // Flags
  toggleFlag: (questionId) => post('/flag', { question_id: questionId }),
  getFlagged: () => get('/flagged'),

  // Notes
  getNote: (qid) => get(`/notes/${qid}`),
  saveNote: (qid, content) => post(`/notes/${qid}`, { content }),

  // Recommend
  getRecommend: (count) => get(`/recommend?count=${count}`),

  // Search
  search: (q) => get(`/search?q=${encodeURIComponent(q)}`),

  // Batch answers
  batchAnswers: (ids) => post('/answers/batch', { ids }),
};
