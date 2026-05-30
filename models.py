"""Database models for the quiz application."""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    exam = db.Column(db.String(100))
    number = db.Column(db.Integer)
    section = db.Column(db.String(200))
    text = db.Column(db.Text)
    options = db.Column(db.JSON)
    answer = db.Column(db.String(20))
    explanation = db.Column(db.Text)
    type = db.Column(db.String(10))  # 单选/多选/是非
    major_category = db.Column(db.String(50))
    sub_category = db.Column(db.String(50))

    def to_dict(self):
        return {
            'id': self.id,
            'exam': self.exam,
            'number': self.number,
            'section': self.section,
            'text': self.text,
            'options': self.options or [],
            'answer': self.answer or '',
            'explanation': self.explanation or '',
            'type': self.type or '',
            'major_category': self.major_category or '',
            'sub_category': self.sub_category or '',
        }

class PracticeLog(db.Model):
    __tablename__ = 'practice_logs'
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'))
    correct = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class WrongAnswer(db.Model):
    __tablename__ = 'wrong_answers'
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'))
    user_answer = db.Column(db.String(20))
    correct_answer = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed = db.Column(db.Boolean, default=False)

class Note(db.Model):
    __tablename__ = 'notes'
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'))
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class FlaggedQuestion(db.Model):
    __tablename__ = 'flagged_questions'
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
