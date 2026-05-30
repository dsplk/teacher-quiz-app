#!/usr/bin/env python3
"""刷题网站 - 深圳教师招聘考试真题练习 (FastAPI + SQLite)"""
import json, os, random, socket
from datetime import datetime
from collections import defaultdict, Counter
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models import db, Question, PracticeLog, WrongAnswer, Note, FlaggedQuestion

app = Flask(__name__)
CORS(app)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data', 'practice.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Load questions JSON
JSON_PATH = os.path.join(BASE_DIR, 'data', 'questions_full.json')
with open(JSON_PATH, 'r') as f:
    DATA = json.load(f)
QUESTIONS_DATA = DATA['questions']
CATEGORIES = DATA['categories']

# Build indexes for fast lookup
Q_BY_ID = {q['id']: q for q in QUESTIONS_DATA}
QUESTIONS_BY_SUB = defaultdict(list)
for q in QUESTIONS_DATA:
    for cat_key, cat_val in CATEGORIES.items():
        if q['major_category'] == cat_key:
            for sub_key in cat_val['subs']:
                if q['sub_category'] == sub_key:
                    QUESTIONS_BY_SUB[sub_key].append(q)
                    break
            break

def init_db():
    with app.app_context():
        db.create_all()
        # Import questions if empty
        if Question.query.count() == 0:
            for qd in QUESTIONS_DATA:
                q = Question(
                    id=qd['id'], exam=qd['exam'], number=qd['number'],
                    section=qd['section'], text=qd['text'],
                    options=json.dumps(qd['options']),
                    answer=qd.get('answer', ''),
                    explanation=qd.get('explanation', ''),
                    type=qd.get('type', ''),
                    major_category=qd.get('major_category', ''),
                    sub_category=qd.get('sub_category', '')
                )
                db.session.add(q)
            db.session.commit()
            print(f"Imported {len(QUESTIONS_DATA)} questions")

init_db()

# Serve built frontend
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend', 'dist')

@app.route('/')
def serve_frontend():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'assets'), filename)

@app.route('/api/stats')
def api_stats():
    """Overall stats dashboard."""
    total = len(QUESTIONS_DATA)
    answered = sum(1 for q in QUESTIONS_DATA if q.get('answer'))
    wrong_count = WrongAnswer.query.count()
    practiced = db.session.query(PracticeLog.question_id).distinct().count()

    logs = PracticeLog.query.all()
    correct_count = sum(1 for l in logs if l.correct)
    total_practiced = len(logs)
    accuracy = round(correct_count / total_practiced * 100, 1) if total_practiced > 0 else 0

    return jsonify({
        'total_questions': total,
        'answered_questions': answered,
        'practiced_questions': practiced,
        'total_practiced': total_practiced,
        'accuracy': accuracy,
        'correct_count': correct_count,
        'wrong_count': wrong_count,
    })

@app.route('/api/stats/knowledge')
def api_stats_knowledge():
    """Per-knowledge-point stats."""
    # Get practice stats per question
    q_stats = defaultdict(lambda: {'correct': 0, 'wrong': 0, 'total': 0})
    for log in PracticeLog.query.all():
        q = Q_BY_ID.get(log.question_id)
        if not q:
            continue
        sub = q['sub_category']
        if log.correct:
            q_stats[sub]['correct'] += 1
        else:
            q_stats[sub]['wrong'] += 1
        q_stats[sub]['total'] += 1

    result = []
    for q in QUESTIONS_DATA:
        sub = q['sub_category']
        mc = q['major_category']
        key = f"{mc}|{sub}"

    # Aggregate by sub_category
    sub_stats = defaultdict(lambda: {
        'major_category': '', 'total': 0, 'practiced': 0,
        'correct': 0, 'wrong': 0, 'accuracy': 0,
        'done_count': 0, 'has_answer_count': 0
    })

    for q in QUESTIONS_DATA:
        sub = q['sub_category']
        mc = q['major_category']
        sub_stats[sub]['major_category'] = mc
        sub_stats[sub]['total'] += 1
        if q.get('answer'):
            sub_stats[sub]['has_answer_count'] += 1

    for log in PracticeLog.query.all():
        q = Q_BY_ID.get(log.question_id)
        if not q:
            continue
        sub = q['sub_category']
        sub_stats[sub]['practiced'] += 1
        if log.correct:
            sub_stats[sub]['correct'] += 1
        else:
            sub_stats[sub]['wrong'] += 1

    # Count unique practiced questions per sub
    for sub, stats in sub_stats.items():
        practiced_qs = db.session.query(PracticeLog.question_id).filter(
            PracticeLog.question_id.in_(
                db.session.query(Question.id).filter(Question.sub_category == sub)
            )
        ).distinct().count()
        stats['done_count'] = practiced_qs
        total_p = stats['correct'] + stats['wrong']
        stats['accuracy'] = round(stats['correct'] / total_p * 100, 1) if total_p > 0 else 0
        stats['is_weak'] = stats['accuracy'] < 60 and stats['accuracy'] > 0

    return jsonify([{'name': k, **v} for k, v in sorted(sub_stats.items())])

@app.route('/api/stats/weakness')
def api_stats_weakness():
    """Top weak knowledge points (accuracy < 60%)."""
    import requests as _  # placeholder unused
    stats_resp = api_stats_knowledge()
    stats_data = stats_resp.json if hasattr(stats_resp, 'json') else []
    if isinstance(stats_data, list):
        weak = [s for s in stats_data if s.get('is_weak')]
    else:
        weak = []
    weak.sort(key=lambda x: x['accuracy'])
    return jsonify(weak[:5])

@app.route('/api/questions/random')
def api_random_questions():
    """Get random questions with optional filters."""
    count = int(request.args.get('count', 10))
    category = request.args.get('category', '')
    sub_category = request.args.get('sub_category', '')
    question_type = request.args.get('type', '')
    has_answer_only = request.args.get('has_answer', 'true') != 'false'

    pool = QUESTIONS_DATA
    if has_answer_only:
        pool = [q for q in pool if q.get('answer')]
    if category:
        pool = [q for q in pool if q['major_category'] == category]
    if sub_category:
        pool = [q for q in pool if q['sub_category'] == sub_category]
    if question_type:
        pool = [q for q in pool if q['type'] == question_type]

    selected = random.sample(pool, min(count, len(pool)))
    return jsonify(selected)

@app.route('/api/questions/sequential')
def api_sequential_questions():
    """Get questions ordered by exam for sequential practice."""
    exam = request.args.get('exam', '')
    level = request.args.get('level', '')  # 小学/初中/高中

    pool = QUESTIONS_DATA
    if exam:
        pool = [q for q in pool if q['exam'] == exam]
    if level:
        pool = [q for q in pool if level in q['exam']]
    if not exam and not level:
        return jsonify({'error': 'Specify exam or level'}), 400

    # Group by exam, then sort by exam date and question number
    from functools import cmp_to_key
    def sort_key(q):
        return (q['exam'], q['number'])
    pool.sort(key=lambda q: (q['exam'], q['number']))
    return jsonify(pool)

@app.route('/api/questions/by-knowledge')
def api_questions_by_knowledge():
    """Get questions for a specific knowledge sub-category."""
    sub = request.args.get('sub', '')
    if not sub:
        return jsonify({'error': 'Specify sub category'}), 400
    qs = QUESTIONS_BY_SUB.get(sub, [])
    return jsonify(qs)

@app.route('/api/questions/<int:qid>')
def api_question(qid):
    """Get single question by ID."""
    q = Q_BY_ID.get(qid)
    if not q:
        return jsonify({'error': 'not found'}), 404
    return jsonify(q)

@app.route('/api/search')
def api_search():
    """Search questions by keyword."""
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    results = []
    for question in QUESTIONS_DATA:
        if q in question['text'] or q in question.get('explanation', ''):
            results.append(question)
            if len(results) >= 50:
                break
    return jsonify(results)

@app.route('/api/exams')
def api_exams():
    """List all available exams."""
    exams = sorted(set(q['exam'] for q in QUESTIONS_DATA))
    # Group by level
    by_level = {'小学': [], '初中': [], '高中': []}
    for e in exams:
        for level in ['小学', '初中', '高中']:
            if level in e:
                by_level[level].append(e)
                break
    return jsonify(by_level)

@app.route('/api/categories')
def api_categories():
    """Return categories structure."""
    return jsonify(CATEGORIES)

# ====== Practice Logs ======

@app.route('/api/practice/log', methods=['POST'])
def api_log_practice():
    """Log a practice result."""
    data = request.json
    log = PracticeLog(
        question_id=data['question_id'],
        correct=data['correct']
    )
    db.session.add(log)

    # If wrong, also record in wrong_answers
    if not data['correct']:
        wrong = WrongAnswer(
            question_id=data['question_id'],
            user_answer=data.get('user_answer', ''),
            correct_answer=data.get('correct_answer', '')
        )
        db.session.add(wrong)

    db.session.commit()
    return jsonify({'status': 'ok'})

# ====== Wrong Answers ======

@app.route('/api/wrong-answers')
def api_wrong_answers():
    """Get wrong answers with question details."""
    # Aggregate by question_id, count errors
    rows = db.session.query(
        WrongAnswer.question_id,
        db.func.count(WrongAnswer.id).label('error_count'),
        db.func.max(WrongAnswer.created_at).label('last_error')
    ).group_by(WrongAnswer.question_id).order_by(db.desc('error_count')).all()

    result = []
    for row in rows:
        q = Q_BY_ID.get(row.question_id)
        if not q:
            continue
        # Get the most recent wrong answer for this question
        last = WrongAnswer.query.filter_by(question_id=row.question_id)\
            .order_by(WrongAnswer.created_at.desc()).first()
        result.append({
            'id': last.id,
            'question_id': row.question_id,
            'question': q,
            'error_count': row.error_count,
            'user_answer': last.user_answer,
            'correct_answer': last.correct_answer,
            'last_error': row.last_error.isoformat() if row.last_error else '',
            'reviewed': last.reviewed
        })
    return jsonify(result)

@app.route('/api/wrong-answers/<int:wid>', methods=['DELETE'])
def api_delete_wrong(wid):
    """Remove a wrong answer record."""
    rec = WrongAnswer.query.get(wid)
    if rec:
        db.session.delete(rec)
        db.session.commit()
    return jsonify({'status': 'ok'})

@app.route('/api/wrong-answers/<int:wid>/review', methods=['POST'])
def api_review_wrong(wid):
    """Mark wrong answer as reviewed."""
    rec = WrongAnswer.query.get(wid)
    if rec:
        rec.reviewed = True
        db.session.commit()
    return jsonify({'status': 'ok'})

@app.route('/api/wrong-answers/clear', methods=['POST'])
def api_clear_wrong():
    """Clear all wrong answers for specific questions."""
    data = request.json
    qids = data.get('question_ids', [])
    if qids:
        WrongAnswer.query.filter(WrongAnswer.question_id.in_(qids)).delete()
        db.session.commit()
    return jsonify({'status': 'ok'})

# ====== Flags ======

@app.route('/api/flag', methods=['POST'])
def api_toggle_flag():
    """Toggle flag on a question (mark as uncertain)."""
    data = request.json
    qid = data['question_id']
    existing = FlaggedQuestion.query.filter_by(question_id=qid).first()
    if existing:
        db.session.delete(existing)
        status = 'unflagged'
    else:
        fq = FlaggedQuestion(question_id=qid)
        db.session.add(fq)
        status = 'flagged'
    db.session.commit()
    return jsonify({'status': status})

@app.route('/api/flagged')
def api_flagged():
    """Get all flagged question IDs."""
    fqs = FlaggedQuestion.query.all()
    return jsonify([fq.question_id for fq in fqs])

# ====== Notes ======

@app.route('/api/notes/<int:qid>', methods=['GET', 'POST'])
def api_notes(qid):
    """Get or save note for a question."""
    if request.method == 'POST':
        data = request.json
        note = Note.query.filter_by(question_id=qid).first()
        if note:
            note.content = data.get('content', '')
            note.updated_at = datetime.utcnow()
        else:
            note = Note(question_id=qid, content=data.get('content', ''))
            db.session.add(note)
        db.session.commit()
        return jsonify({'status': 'ok'})

    note = Note.query.filter_by(question_id=qid).first()
    return jsonify({'content': note.content if note else ''})

# ====== Recommendation ======

@app.route('/api/recommend')
def api_recommend():
    """Smart recommendation based on wrong answer analysis."""
    count = int(request.args.get('count', 10))

    # 1. Find top 3 sub_categories with most wrong answers
    wrong_qs = db.session.query(WrongAnswer.question_id).all()
    wrong_qids = [w[0] for w in wrong_qs]

    sub_counter = Counter()
    for wqid in wrong_qids:
        q = Q_BY_ID.get(wqid)
        if q:
            sub_counter[q['sub_category']] += 1

    top_subs = [s for s, _ in sub_counter.most_common(3)]

    if not top_subs:
        # No wrong answers yet - recommend from all unanswered/practiced-less
        all_qs = QUESTIONS_DATA[:]
        random.shuffle(all_qs)
        return jsonify(all_qs[:count])

    # 2. Get practiced question IDs
    practiced_qids = set(r[0] for r in db.session.query(PracticeLog.question_id).distinct().all())

    # 3. Get wrong question IDs with error count > 2
    high_error_qids = set()
    for wqid in wrong_qids:
        cnt = WrongAnswer.query.filter_by(question_id=wqid).count()
        if cnt > 2:
            high_error_qids.add(wqid)

    # 4. Collect candidates from top 3 subs: unpracticed + high-error
    candidates = []
    for sub in top_subs:
        for q in QUESTIONS_DATA:
            if q['sub_category'] == sub and q.get('answer'):
                if q['id'] not in practiced_qids or q['id'] in high_error_qids:
                    candidates.append(q)

    # 5. Fill remaining if not enough candidates
    if len(candidates) < count:
        extra = [q for q in QUESTIONS_DATA if q.get('answer') and q not in candidates]
        random.shuffle(extra)
        candidates.extend(extra[:count - len(candidates)])

    random.shuffle(candidates)
    return jsonify(candidates[:count])

# ====== Answer Key Validation ======

@app.route('/api/answers/batch', methods=['POST'])
def api_batch_answers():
    """Return correct answers for a batch of question IDs."""
    data = request.json
    qids = data.get('ids', [])
    result = {}
    for qid in qids:
        q = Q_BY_ID.get(qid)
        if q and q.get('answer'):
            result[qid] = q['answer']
    return jsonify(result)

# SPA fallback: serve frontend for non-API routes
@app.errorhandler(404)
def spa_fallback(e):
    path = request.path
    if path.startswith('/api/'):
        return jsonify({'error': 'not found'}), 404
    try:
        return send_from_directory(FRONTEND_DIR, 'index.html')
    except:
        return jsonify({'error': 'not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    # Find LAN IP for mobile access
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.0.0.1', 1))
        lan_ip = s.getsockname()[0]
        s.close()
    except:
        lan_ip = '请查看上方地址'
    print(f"\n{'='*50}")
    print(f"  刷题系统已启动!")
    print(f"  本机: http://localhost:{port}")
    print(f"  手机: http://{lan_ip}:{port}")
    print(f"{'='*50}\n")
    app.run(debug=True, host='0.0.0.0', port=port)
