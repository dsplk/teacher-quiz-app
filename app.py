#!/usr/bin/env python3
"""刷题网站 - 深圳教师招聘考试真题练习（生产版本）"""
import json, os, sqlite3, random
from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['DATABASE'] = os.environ.get('DATABASE_URL') or os.path.join(BASE_DIR, 'data', 'practice.db')

# Load questions
with open(os.path.join(BASE_DIR, 'data', 'questions.json'), 'r') as f:
    DATA = json.load(f)
QUESTIONS = DATA['questions']
CATEGORIES = DATA['categories']

# Build sub_category → question index
SUB_QUESTIONS = {}
for q in QUESTIONS:
    SUB_QUESTIONS.setdefault(q['sub_category'], []).append(q)

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
    return g.db

def init_db():
    db = sqlite3.connect(app.config['DATABASE'])
    db.execute('''CREATE TABLE IF NOT EXISTS wrong_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_idx INTEGER,
        user_answer TEXT,
        correct_answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed INTEGER DEFAULT 0
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS practice_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_idx INTEGER,
        correct INTEGER,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    # questions_json: lightweight lookup table for wrong-book queries
    db.execute('''CREATE TABLE IF NOT EXISTS questions_json (
        idx INTEGER PRIMARY KEY,
        text TEXT,
        major_category TEXT,
        sub_category TEXT
    )''')
    db.execute('DELETE FROM questions_json')
    for idx, q in enumerate(QUESTIONS):
        db.execute('INSERT INTO questions_json VALUES (?, ?, ?, ?)',
                   (idx, q['text'][:200], q['major_category'], q['sub_category']))
    db.commit()
    db.close()

# Initialize DB at startup
init_db()

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# ============ API Routes ============

@app.route('/api/question/<int:idx>')
def api_question(idx):
    if 0 <= idx < len(QUESTIONS):
        return jsonify(QUESTIONS[idx])
    return jsonify({'error': 'not found'}), 404

@app.route('/api/random-questions')
def api_random_questions():
    category = request.args.get('category', '')
    count = int(request.args.get('count', 10))
    pool = list(enumerate(QUESTIONS))
    if category and category in CATEGORIES:
        pool = [(i, q) for i, q in pool if q['major_category'] == category]
    selected = random.sample(pool, min(count, len(pool)))
    result = [{'idx': i, **q} for i, q in selected]
    return jsonify(result)

@app.route('/api/questions-by-sub')
def api_questions_by_sub():
    sub = request.args.get('sub', '')
    raw = SUB_QUESTIONS.get(sub, [])
    indexed = []
    for q in raw:
        for i, rq in enumerate(QUESTIONS):
            if rq['exam'] == q['exam'] and rq['number'] == q['number'] and rq['text'] == q['text']:
                indexed.append({'idx': i, **q})
                break
        else:
            indexed.append({'idx': -1, **q})
    return jsonify(indexed)

@app.route('/api/wrong-answers', methods=['GET'])
def api_get_wrong():
    db = get_db()
    cat = request.args.get('category', '')
    if cat:
        rows = db.execute(
            'SELECT w.*, q.text as q_text FROM wrong_answers w JOIN questions_json q ON w.question_idx = q.idx WHERE q.major_category = ? ORDER BY w.created_at DESC',
            (cat,)
        ).fetchall()
    else:
        rows = db.execute(
            'SELECT w.* FROM wrong_answers w ORDER BY w.created_at DESC'
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/wrong-answer', methods=['POST'])
def api_add_wrong():
    data = request.json
    db = get_db()
    db.execute(
        'INSERT INTO wrong_answers (question_idx, user_answer, correct_answer) VALUES (?, ?, ?)',
        (data['question_idx'], data['user_answer'], data['correct_answer'])
    )
    db.commit()
    return jsonify({'status': 'ok'})

@app.route('/api/wrong-answer/<int:id>/review', methods=['POST'])
def api_review_wrong(id):
    db = get_db()
    db.execute('UPDATE wrong_answers SET reviewed = 1 WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'ok'})

@app.route('/api/wrong-answer/<int:id>', methods=['DELETE'])
def api_delete_wrong(id):
    db = get_db()
    db.execute('DELETE FROM wrong_answers WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'ok'})

@app.route('/api/stats')
def api_stats():
    db = get_db()
    total_wrong = db.execute('SELECT COUNT(*) as c FROM wrong_answers').fetchone()['c']
    unreviewed = db.execute('SELECT COUNT(*) as c FROM wrong_answers WHERE reviewed = 0').fetchone()['c']
    return jsonify({
        'total_questions': len(QUESTIONS),
        'answered': sum(1 for q in QUESTIONS if q['answer']),
        'wrong_total': total_wrong,
        'wrong_unreviewed': unreviewed,
    })

@app.route('/api/practice-log', methods=['POST'])
def api_log_practice():
    data = request.json
    db = get_db()
    db.execute(
        'INSERT INTO practice_log (question_idx, correct, category) VALUES (?, ?, ?)',
        (data['question_idx'], data['correct'], data.get('category', ''))
    )
    db.commit()
    return jsonify({'status': 'ok'})

# ============ Page Routes ============

@app.route('/')
def index():
    return render_template('index.html', categories=CATEGORIES, total=len(QUESTIONS))

@app.route('/practice')
def practice():
    return render_template('practice.html', categories=CATEGORIES)

@app.route('/wrong-book')
def wrong_book():
    return render_template('wrong_book.html', categories=CATEGORIES)

@app.route('/knowledge')
def knowledge():
    subs_by_major = {}
    for q in QUESTIONS:
        subs_by_major.setdefault(q['major_category'], set()).add(q['sub_category'])
    return render_template('knowledge.html', subs_by_major={m: sorted(s) for m, s in subs_by_major.items()})

if __name__ == '__main__':
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = '127.0.0.1'
    finally:
        s.close()
    port = int(os.environ.get('PORT', 5050))
    print(f"\n{'='*50}")
    print(f"  刷题系统已启动!")
    print(f"  {'='*50}")
    print(f"  本机访问: http://localhost:{port}")
    print(f"  手机访问: http://{local_ip}:{port}")
    print(f"  (手机需连接同一个WiFi)")
    print(f"{'='*50}\n")
    app.run(debug='DEBUG' in os.environ, host='0.0.0.0', port=port)
