// 深圳教师招聘刷题系统 - 前端逻辑

// ====== 通用 ======
const API_BASE = '';

async function api(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts
    });
    return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
    // Update stats badge
    api('/api/stats').then(s => {
        const el = document.getElementById('stat-questions');
        if (el) el.textContent = s.total_questions;
    });
});

// ====== 错题记录 ======
async function recordWrong(questionIdx, userAnswer, correctAnswer) {
    await api('/api/wrong-answer', {
        method: 'POST',
        body: JSON.stringify({
            question_idx: questionIdx,
            user_answer: userAnswer,
            correct_answer: correctAnswer
        })
    });
}

async function logPractice(questionIdx, correct, category) {
    await api('/api/practice-log', {
        method: 'POST',
        body: JSON.stringify({
            question_idx: questionIdx,
            correct: correct ? 1 : 0,
            category: category
        })
    });
}

// ====== 题目渲染 ======
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function renderQuestion(q, idx, showAnswer = false) {
    const div = document.createElement('div');
    div.className = 'question-card card mb-4';
    div.dataset.idx = idx;

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body p-4';

    // Header: source
    const header = document.createElement('div');
    header.className = 'question-meta mb-2';
    let sectionPart = q.section ? q.section.split('（')[0] : '';
    header.innerHTML = `
        <span class="badge bg-light text-dark me-2">${q.exam}</span>
        ${sectionPart ? `<span class="badge bg-light text-dark me-2">${sectionPart}</span>` : ''}
        <span class="badge bg-primary">${q.major_category} › ${q.sub_category}</span>
        <span class="badge bg-secondary">第${q.number}题</span>
    `;
    cardBody.appendChild(header);

    // Question text
    const qText = document.createElement('div');
    qText.className = 'mb-3';
    qText.style.fontSize = '1.05rem';
    qText.style.lineHeight = '1.7';
    qText.textContent = q.text.replace(/^\d+\s*[\.\、\s]\s*/, '');
    cardBody.appendChild(qText);

    // Options
    const optsDiv = document.createElement('div');
    optsDiv.className = 'options-container';
    q.options.forEach((opt, oi) => {
        const optEl = document.createElement('div');
        optEl.className = 'option-item d-flex align-items-center';
        optEl.dataset.optLabel = OPTION_LABELS[oi];

        const label = document.createElement('span');
        label.className = 'option-label';
        label.textContent = OPTION_LABELS[oi];
        optEl.appendChild(label);

        const text = document.createElement('span');
        text.textContent = opt.replace(/^[A-E][\.\、\)\s]\s*/, '');
        optEl.appendChild(text);

        if (showAnswer) {
            optEl.classList.add('disabled');
            const isCorrect = OPTION_LABELS[oi] === q.answer;
            if (isCorrect) optEl.classList.add('correct');
        }

        optsDiv.appendChild(optEl);
    });
    cardBody.appendChild(optsDiv);

    // Answer with explanation
    if (showAnswer && q.answer) {
        const ansDiv = document.createElement('div');
        ansDiv.className = 'answer-reveal mt-3 p-3 rounded';
        const hasExp = q.explanation && q.explanation.length > 0;
        ansDiv.style.background = hasExp ? '#f8fafc' : '#f0fdf4';
        ansDiv.style.border = hasExp ? '1px solid #e2e8f0' : '1px solid #bbf7d0';
        let html = `<strong style="color:#16a34a;">【正确答案】${q.answer}</strong>`;
        if (hasExp) {
            html += `<div class="mt-2 pt-2" style="border-top:1px dashed #e2e8f0;color:#374151;font-size:0.95rem;line-height:1.7;">📖 <strong>解析：</strong>${q.explanation}</div>`;
        }
        ansDiv.innerHTML = html;
        cardBody.appendChild(ansDiv);
    }

    div.appendChild(cardBody);
    return div;
}
