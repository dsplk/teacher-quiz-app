#!/usr/bin/env python3
"""Extract questions & answer explanations from OCR text and save as JSON."""
import re, json, sys
sys.path.insert(0, '/tmp')
from build_docx_v4 import classify_question, is_watermark_or_noise

with open('/tmp/pdf_pages/历年真题_full.txt', 'r') as f:
    exam_text = f.read()
with open('/tmp/pdf_pages/真题答案_full.txt', 'r') as f:
    answer_text = f.read()

# ===== Parse answers with explanations from answer text =====
def parse_answer_explanations(text):
    """Parse answer file to extract (answer_letter, explanation) per exam+number."""
    lines = text.split('\n')
    result = {}  # (exam_name, q_num) -> {"answer": "B", "explanation": "..."}

    exam_pattern = r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*深圳事业单位\S*(?:招聘考试)?（\s*([小学|初中|高中]+)\s*）'
    # Answer line: N.【答案】X。解析：...
    ans_start = re.compile(r'^\s*(\d{1,3})\s*[\.\、]\s*【[^】]{1,8}】\s*([A-D\s、]+)')
    # Detect next question boundary
    next_q = re.compile(r'^\s*(\d{1,3})\s*[\.\、]\s*【[^】]{1,8}】')

    current_exam = ""
    in_toc = True
    toc_exam_count = 0
    non_exam_since_toc = 0

    i = 0
    while i < len(lines):
        ls = lines[i].strip()
        if is_watermark_or_noise(ls):
            i += 1
            continue

        # Exam header
        em = re.search(exam_pattern, ls)
        if em:
            if in_toc:
                toc_exam_count += 1
                non_exam_since_toc = 0
            current_exam = f"{em.group(1)}年{em.group(2)}月{em.group(3)}日-{em.group(4)}"
            i += 1
            continue

        # Exit TOC when we see enough non-exam lines after exam headers
        if in_toc and toc_exam_count > 3:
            non_exam_since_toc += 1
            if non_exam_since_toc > 5:
                in_toc = False

        # Section heading
        if re.match(r'^[一二三四五六七八九十]、', ls):
            i += 1
            continue

        # Answer line
        m = ans_start.match(ls)
        if m and current_exam and not in_toc:
            q_num = int(m.group(1))
            if q_num > 100:
                i += 1
                continue
            answer = m.group(2).strip()

            # Extract explanation: everything after "解析" or "析：" in this line
            explanation = ""
            # Try various OCR-damaged forms of "解析"
            for sep in ['解析：', '解析:', '析：', '析:']:
                pos = ls.find(sep)
                if pos != -1:
                    explanation = ls[pos + len(sep):]
                    break
            # Also check "小明课堂析：" variant
            if not explanation:
                for sep in ['小明课堂析：', '课堂析：', '小明课堂析:']:
                    pos = ls.find(sep)
                    if pos != -1:
                        explanation = ls[pos + len(sep):]
                        break

            # Accumulate subsequent lines until next question boundary
            j = i + 1
            while j < len(lines):
                nl = lines[j].strip()
                if is_watermark_or_noise(nl):
                    j += 1
                    continue
                # Stop at next question, exam header, or section heading
                nq = next_q.match(nl)
                if nq:
                    nqn = int(nq.group(1))
                    if nqn != q_num:
                        break
                if re.search(exam_pattern, nl):
                    break
                if re.match(r'^[一二三四五六七八九十]、', nl):
                    break
                # This is continuation of explanation
                if explanation:
                    explanation += " " + nl
                j += 1

            # Clean up explanation
            explanation = re.sub(r'\s+', ' ', explanation).strip() if explanation else ""
            # Remove trailing garbage
            explanation = re.sub(r'公众号：\S+', '', explanation).strip()

            result[(current_exam, q_num)] = {"answer": answer, "explanation": explanation}
            i = j
            continue

        i += 1

    return result

print("Parsing answers with explanations...")
answer_data = parse_answer_explanations(answer_text)
print(f"  Found {len(answer_data)} answers with explanations")

# Count how many have explanations
with_explanation = sum(1 for v in answer_data.values() if v['explanation'])
print(f"  {with_explanation} have explanation text ({with_explanation*100//len(answer_data)}%)")

# ===== Parse questions from exam text =====
lines = exam_text.split('\n')
questions = []
current_exam = ""
current_section = ""
exam_pattern = r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*深圳事业单位\S*招聘考试（\s*([小学|初中|高中]+)\s*）'

for i, line in enumerate(lines):
    ls = line.strip()
    if is_watermark_or_noise(ls):
        continue
    em = re.search(exam_pattern, ls)
    if em:
        current_exam = f"{em.group(1)}年{em.group(2)}月{em.group(3)}日-{em.group(4)}"
        continue
    if re.match(r'^[一二三四五六七八九十]、', ls):
        current_section = ls
        continue
    qm = re.match(r'^\s*(\d{1,3})[\.\、\s]\s*', ls)
    if qm:
        q_num = int(qm.group(1))
        if q_num < 1 or q_num > 100:
            continue
        q_text = ls
        options = []
        j = i + 1
        while j < len(lines):
            nl = lines[j].strip()
            if is_watermark_or_noise(nl):
                j += 1
                continue
            nqm = re.match(r'^\s*(\d{1,3})[\.\、\s]\s*', nl)
            if nqm and int(nqm.group(1)) != q_num:
                break
            if re.match(r'^[一二三四五六七八九十]、', nl):
                break
            if re.search(exam_pattern, nl):
                break
            if re.match(r'^[A-E][\.\、\)\s]', nl):
                options.append(nl)
            else:
                q_text += "\n" + nl
            j += 1

        classify_text = q_text + "\n" + "\n".join(options)
        major_cat, sub_cat = classify_question(classify_text)

        key = (current_exam, q_num)
        ad = answer_data.get(key, {})
        answer = ad.get("answer", "")
        explanation = ad.get("explanation", "")

        # Clean watermark leftovers
        q_text = re.sub(r'，?\s*公众号：\S+', '', q_text).strip()

        # Only include questions with answers
        if not answer:
            continue

        questions.append({
            "exam": current_exam,
            "number": q_num,
            "section": current_section,
            "text": q_text,
            "options": options,
            "major_category": major_cat,
            "sub_category": sub_cat,
            "answer": answer,
            "explanation": explanation,
        })

# Save JSON
output = {
    "total": len(questions),
    "answered": sum(1 for q in questions if q["answer"]),
    "categories": {},
    "questions": questions,
}

for q in questions:
    major = q["major_category"]
    sub = q["sub_category"]
    if major not in output["categories"]:
        output["categories"][major] = {"total": 0, "answered": 0, "subs": {}}
    if sub not in output["categories"][major]["subs"]:
        output["categories"][major]["subs"][sub] = {"total": 0, "answered": 0}
    output["categories"][major]["total"] += 1
    if q["answer"]:
        output["categories"][major]["answered"] += 1
    output["categories"][major]["subs"][sub]["total"] += 1
    if q["answer"]:
        output["categories"][major]["subs"][sub]["answered"] += 1

with open('/Users/dsplk/Desktop/刷题网站/data/questions.json', 'w') as f:
    json.dump(output, f, ensure_ascii=False)

print(f"\nExtracted {len(questions)} questions ({sum(1 for q in questions if q['answer'])} answered)")
print(f"Explanations available for {sum(1 for q in questions if q['explanation'])} questions")
