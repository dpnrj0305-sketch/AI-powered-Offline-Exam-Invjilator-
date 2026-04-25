"""
Database Models for Users, Tests, and Results
Uses SQLite for persistent storage
"""
import sqlite3
import json
import os
from datetime import datetime
from .config import DB_PATH
import hashlib

# Initialize database
def init_db():
    """Initialize the database with required tables"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    # Tests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY,
            test_name TEXT NOT NULL,
            description TEXT,
            creator_id INTEGER NOT NULL,
            duration_minutes INTEGER NOT NULL,
            total_questions INTEGER DEFAULT 0,
            pass_percentage REAL DEFAULT 40.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (creator_id) REFERENCES users(id)
        )
    ''')
    
    # Test Results/Attempts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS test_attempts (
            id INTEGER PRIMARY KEY,
            test_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            score REAL DEFAULT 0,
            total_score REAL DEFAULT 100,
            status TEXT DEFAULT 'in_progress',
            malpractice_flags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (test_id) REFERENCES tests(id),
            FOREIGN KEY (student_id) REFERENCES users(id)
        )
    ''')
    
    # Malpractice Records table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS malpractice_logs (
            id INTEGER PRIMARY KEY,
            test_attempt_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            alert_message TEXT,
            severity TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            details TEXT,
            FOREIGN KEY (test_attempt_id) REFERENCES test_attempts(id)
        )
    ''')
    
    conn.commit()
    conn.close()

class UserManager:
    """Manages user authentication and data"""
    
    @staticmethod
    def hash_password(password):
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def create_user(username, email, password, full_name, role='student'):
        """Create a new user"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            password_hash = UserManager.hash_password(password)
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, role)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, email, password_hash, full_name, role))
            
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            return {"id": user_id, "username": username, "email": email, "role": role}
        except sqlite3.IntegrityError as e:
            return {"error": str(e)}
    
    @staticmethod
    def authenticate(username, password):
        """Authenticate user"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        password_hash = UserManager.hash_password(password)
        cursor.execute('''
            SELECT id, username, email, full_name, role 
            FROM users 
            WHERE username = ? AND password_hash = ? AND is_active = 1
        ''', (username, password_hash))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return dict(user)
        return None
    
    @staticmethod
    def get_user(user_id):
        """Get user by ID"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, username, email, full_name, role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    @staticmethod
    def get_all_users(role=None):
        """Get all users, optionally filtered by role"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if role:
            cursor.execute('SELECT id, username, email, full_name, role FROM users WHERE role = ?', (role,))
        else:
            cursor.execute('SELECT id, username, email, full_name, role FROM users')
        
        users = cursor.fetchall()
        conn.close()
        return [dict(user) for user in users]

class TestManager:
    """Manages exam/test creation and management"""
    
    @staticmethod
    def create_test(test_name, description, creator_id, duration_minutes, pass_percentage=40.0):
        """Create a new test"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO tests (test_name, description, creator_id, duration_minutes, pass_percentage)
            VALUES (?, ?, ?, ?, ?)
        ''', (test_name, description, creator_id, duration_minutes, pass_percentage))
        
        conn.commit()
        test_id = cursor.lastrowid
        conn.close()
        return {"id": test_id, "test_name": test_name, "creator_id": creator_id}
    
    @staticmethod
    def get_test(test_id):
        """Get test by ID"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM tests WHERE id = ?', (test_id,))
        test = cursor.fetchone()
        conn.close()
        return dict(test) if test else None
    
    @staticmethod
    def get_all_tests(creator_id=None):
        """Get all active tests"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if creator_id:
            cursor.execute('SELECT * FROM tests WHERE creator_id = ? AND is_active = 1 ORDER BY created_at DESC', (creator_id,))
        else:
            cursor.execute('SELECT * FROM tests WHERE is_active = 1 ORDER BY created_at DESC')
        
        tests = cursor.fetchall()
        conn.close()
        return [dict(test) for test in tests]
    
    @staticmethod
    def update_test(test_id, **kwargs):
        """Update test details"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        allowed_fields = ['test_name', 'description', 'duration_minutes', 'pass_percentage', 'total_questions']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if updates:
            updates['updated_at'] = datetime.now()
            set_clause = ','.join([f'{k}=?' for k in updates.keys()])
            values = list(updates.values()) + [test_id]
            
            cursor.execute(f'UPDATE tests SET {set_clause} WHERE id=?', values)
            conn.commit()
        
        conn.close()

class TestAttemptManager:
    """Manages test attempts and results"""
    
    @staticmethod
    def create_attempt(test_id, student_id):
        """Create a new test attempt"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO test_attempts (test_id, student_id, start_time, status)
            VALUES (?, ?, ?, 'in_progress')
        ''', (test_id, student_id, datetime.now()))
        
        conn.commit()
        attempt_id = cursor.lastrowid
        conn.close()
        return {"id": attempt_id, "test_id": test_id, "student_id": student_id}
    
    @staticmethod
    def get_attempt(attempt_id):
        """Get test attempt by ID"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM test_attempts WHERE id = ?', (attempt_id,))
        attempt = cursor.fetchone()
        conn.close()
        return dict(attempt) if attempt else None
    
    @staticmethod
    def finish_attempt(attempt_id, score=0, malpractice_alerts=None):
        """Finish a test attempt"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        malpractice_json = json.dumps(malpractice_alerts) if malpractice_alerts else None
        cursor.execute('''
            UPDATE test_attempts 
            SET end_time = ?, status = 'completed', score = ?, malpractice_flags = ?
            WHERE id = ?
        ''', (datetime.now(), score, malpractice_json, attempt_id))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_student_attempts(student_id, test_id=None):
        """Get all attempts for a student"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if test_id:
            cursor.execute('''
                SELECT * FROM test_attempts 
                WHERE student_id = ? AND test_id = ?
                ORDER BY start_time DESC
            ''', (student_id, test_id))
        else:
            cursor.execute('''
                SELECT * FROM test_attempts 
                WHERE student_id = ?
                ORDER BY start_time DESC
            ''', (student_id,))
        
        attempts = cursor.fetchall()
        conn.close()
        return [dict(attempt) for attempt in attempts]
    
    @staticmethod
    def get_test_attempts(test_id):
        """Get all attempts for a test (for teacher review)"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT ta.*, u.username, u.full_name
            FROM test_attempts ta
            JOIN users u ON ta.student_id = u.id
            WHERE ta.test_id = ?
            ORDER BY ta.start_time DESC
        ''', (test_id,))
        
        attempts = cursor.fetchall()
        conn.close()
        return [dict(attempt) for attempt in attempts]

class MalpracticeLogger:
    """Logs malpractice incidents during exams"""
    
    @staticmethod
    def log_alert(test_attempt_id, alert_type, alert_message, severity, details=None):
        """Log a malpractice alert"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        details_json = json.dumps(details) if details else None
        cursor.execute('''
            INSERT INTO malpractice_logs (test_attempt_id, alert_type, alert_message, severity, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (test_attempt_id, alert_type, alert_message, severity, details_json))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_attempt_logs(test_attempt_id):
        """Get all malpractice logs for an attempt"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM malpractice_logs 
            WHERE test_attempt_id = ?
            ORDER BY timestamp DESC
        ''', (test_attempt_id,))
        
        logs = cursor.fetchall()
        conn.close()
        return [dict(log) for log in logs]
    
    @staticmethod
    def get_test_malpractice_summary(test_id):
        """Get malpractice summary for all attempts of a test"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                ta.id as attempt_id,
                ta.student_id,
                u.full_name,
                u.username,
                COUNT(ml.id) as total_alerts,
                SUM(CASE WHEN ml.severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
                SUM(CASE WHEN ml.severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium_severity,
                GROUP_CONCAT(DISTINCT ml.alert_type) as alert_types
            FROM test_attempts ta
            LEFT JOIN users u ON ta.student_id = u.id
            LEFT JOIN malpractice_logs ml ON ta.id = ml.test_attempt_id
            WHERE ta.test_id = ?
            GROUP BY ta.id
            ORDER BY high_severity DESC
        ''', (test_id,))
        
        results = cursor.fetchall()
        conn.close()
        return [dict(result) for result in results]

# Initialize database on import
init_db()
