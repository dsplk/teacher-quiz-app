"""Extract all questions from the enhanced docx into structured JSON."""
import re, json
from docx import Document

DOCX_PATH = "/Users/dsplk/Desktop/教师招聘考试_真题分类整理_含解析.docx"
OUTPUT_PATH = "/Users/dsplk/Desktop/刷题网站/data/questions_full.json"

doc = Document(DOCX_PATH)

major_category = ""
sub_category = ""
questions = []
current = None  # current question being built

# Track header counters for statistics
cat_counts = {}

header_pat = re.compile(r'^#(\d+)\s+\[(\d{4}年\d{1,2}月\d{1,2}日-(小学|初中|高中))\]\s+(.+)$')
option_pat = re.compile(r'^([A-E])[.、]\s*(.*)')
inline_option_pat = re.compile(r'([A-E])[.、]\s*([^\n]+)')
answer_pat = re.compile(r'【\s*(?:答案|谷紫|谷茶|答|容)\s*】\s*([A-E]+)')
explanation_pat = re.compile(r'^【\s*解析\s*】')
qtype_pat = re.compile(r'(一、单项选择题|一、单选题|二、多项选择题|二、多选题|三、是非题|三、判断题)')
temporary_pat = re.compile(r'^\s*第(\d+)题暂缺\s*$')

def make_question():
    return {
        "id": 0, "exam": "", "number": 0, "section": "", "text": "",
        "options": [], "answer": "", "explanation": "",
        "major_category": "", "sub_category": "", "type": "单选"
    }

def flush_current():
    global current
    if current is None:
        return
    if current["text"] or current["options"]:
        # Determine type from section
        sec = current["section"]
        if "单选" in sec: current["type"] = "单选"
        elif "多选" in sec: current["type"] = "多选"
        elif "是非" in sec or "判断" in sec: current["type"] = "是非"
        # Clean text
        current["text"] = current["text"].strip()
        # Count stats
        mc = current["major_category"]
        cat_counts[mc] = cat_counts.get(mc, 0) + 1
        questions.append(current)
    current = None

for p in doc.paragraphs:
    text = p.text.strip()
    if not text:
        continue

    # Heading 1 = major category
    if p.style.name == "Heading 1":
        flush_current()
        # Remove count suffix like "（共2173题）"
        m = re.match(r'(\S+?)(?:[（(]共\d+题[）)])?\s*$', text)
        major_category = m.group(1) if m else text
        continue

    # Heading 2 = sub category
    if p.style.name == "Heading 2":
        flush_current()
        # Remove count suffix like "（229题）"
        m = re.match(r'(\S+?)(?:[（(]\d+题[）)])?\s*$', text)
        sub_category = m.group(1) if m else text
        continue

    # Question header
    m = header_pat.match(text)
    if m:
        flush_current()
        seq = int(m.group(1))
        exam_str = m.group(2)
        section_and_num = m.group(4)
        # Try to get section type and question number
        sec = section_and_num
        qnum = 0
        qm = re.search(r'第(\d+)题', section_and_num)
        if qm:
            qnum = int(qm.group(1))
            sec = section_and_num[:qm.start()].strip()
        tm = qtype_pat.search(text)
        if tm:
            sec = tm.group(1)

        current = make_question()
        current["id"] = len(questions) + 1  # 1-based sequential ID
        current["exam"] = exam_str
        current["number"] = qnum
        current["section"] = sec
        current["major_category"] = major_category
        current["sub_category"] = sub_category
        continue

    # Skip if no current question
    if current is None:
        continue

    # Check for 暂缺 (missing question placeholder)
    if temporary_pat.search(text):
        flush_current()
        continue

    # Answer line
    am = answer_pat.search(text)
    if am:
        if not current["answer"]:
            current["answer"] = am.group(1)
        # If explanation follows in same paragraph (【答案】X。解析：...)
        if "解析" in text or "解折" in text or "解桥" in text or "解新" in text:
            # Split on explanation marker
            for sep in ["】。解析", "】。解折", "】。解桥", "】。解新", "】解析", "】。胖析"]:
                if sep in text:
                    expl = text.split(sep, 1)[-1].strip()
                    if expl:
                        current["explanation"] = expl
                    break
        continue

    # Explanation line
    if explanation_pat.match(text):
        expl = re.sub(r'^【\s*解析\s*】', '', text).strip()
        if current["explanation"]:
            current["explanation"] += "\n" + expl
        else:
            current["explanation"] = expl
        continue

    # First: check for inline options (multiple options on same line)
    # e.g., "B. 活动性德育课程 C.德育隐性课程 D.德育显性课程"
    parts = re.split(r'(?=[A-E][.、])', text)
    valid_parts = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = re.match(r'^([A-E])[.、]\s*(.*)', part)
        if m:
            valid_parts.append(f"{m.group(1)}. {m.group(2).strip()}")
    if len(valid_parts) >= 2:
        current["options"].extend(valid_parts)
        continue

    # Single option line (e.g., "A. 学科性德育课程")
    om = option_pat.match(text)
    if om:
        current["options"].append(f"{om.group(1)}. {om.group(2).strip()}")
        continue

    # Inline no-space options (e.g., "A.opt1 B.opt2")
    recovered = re.findall(r'([A-E])\.(\S+)', text)
    if recovered:
        for label, opt in recovered:
            current["options"].append(f"{label}. {opt.strip()}")
        continue

    # Otherwise treat as question text (could be continuation)
    if not current["options"] and not current["answer"]:
        if current["text"]:
            current["text"] += "\n" + text
        else:
            # Remove leading number if present (e.g., "1. text")
            text_clean = re.sub(r'^\d+[.、]\s*', '', text)
            current["text"] = text_clean
    else:
        # After options, before answer — could be additional text
        # Check if it looks like OCR noise / watermark
        if not any(kw in text for kw in ["公众号", "微信", "电话", "机构", "扫码", "地址"]):
            if not re.match(r'^[A-E][.、]', text):
                if current["text"]:
                    current["text"] += "\n" + text
                else:
                    current["text"] = text

# Flush last question
flush_current()

# Build categories structure
categories = {}
cat_order = []
for q in questions:
    mc = q["major_category"]
    sc = q["sub_category"]
    if mc not in cat_order:
        cat_order.append(mc)
    if mc not in categories:
        categories[mc] = {"total": 0, "answered": 0, "subs": {}}
    categories[mc]["total"] += 1
    if q["answer"]:
        categories[mc]["answered"] += 1
    if sc:
        if sc not in categories[mc]["subs"]:
            categories[mc]["subs"][sc] = {"total": 0, "answered": 0}
        categories[mc]["subs"][sc]["total"] += 1
        if q["answer"]:
            categories[mc]["subs"][sc]["answered"] += 1

total_answered = sum(1 for q in questions if q["answer"])

output = {
    "total": len(questions),
    "answered": total_answered,
    "categories": categories,
    "questions": questions
}

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=1)

print(f"Extracted {len(questions)} questions")
print(f"Answered: {total_answered}, Unanswered: {len(questions) - total_answered}")
print(f"Categories: {len(categories)}")
print(f"Output: {OUTPUT_PATH}")
