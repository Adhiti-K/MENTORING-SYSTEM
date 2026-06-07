CREATE DATABASE IF NOT EXISTS mentoring_system;
USE mentoring_system;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','principal','hod','mentor','student') NOT NULL,
    department VARCHAR(50),
    is_approved BOOLEAN DEFAULT FALSE,
    profile_pic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS students (
    user_id INT PRIMARY KEY,
    usn VARCHAR(20) UNIQUE NOT NULL,
    year_semester VARCHAR(20),
    mentor_id INT,
    interests TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hods (
    user_id INT PRIMARY KEY,
    department VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentors (
    user_id INT PRIMARY KEY,
    department VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    meeting_date DATETIME NOT NULL,
    meeting_type ENUM('individual','group') NOT NULL,
    created_by INT NOT NULL,
    status ENUM('pending','approved','active','completed','cancelled') DEFAULT 'pending',
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meeting_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_status ENUM('present','absent','late') DEFAULT 'absent',
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meeting_proceedings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT UNIQUE NOT NULL,
    notes TEXT,
    outcome TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INT,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(100),
    internal_marks INT DEFAULT 0,
    external_marks INT DEFAULT 0,
    internal_status ENUM('pending','verified','approved','rejected') DEFAULT 'pending',
    external_status ENUM('pending','approved','rejected') DEFAULT 'pending',
    mentor_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_code VARCHAR(20),
    total_classes INT DEFAULT 0,
    attended_classes INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_subject (student_id, subject_code),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    certificate_path VARCHAR(255),
    achievement_date DATE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    goal_type ENUM('attendance','marks','skill') NOT NULL,
    target_value VARCHAR(100),
    deadline DATE,
    status ENUM('pending','achieved','missed') DEFAULT 'pending',
    mentor_comment TEXT,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    url VARCHAR(255) NOT NULL,
    duration VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS student_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('recommended','in_progress','completed') DEFAULT 'recommended',
    progress_days INT DEFAULT 0,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    category ENUM('Academic','Personal','Career','Technical') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('Pending','In Progress','Solved') DEFAULT 'Pending',
    mentor_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed courses
INSERT IGNORE INTO courses (id, title, description, category, url, duration) VALUES
(1,'NPTEL DBMS Course','Database Management Systems by NPTEL','DBMS','https://nptel.ac.in/courses/106/105/106105175/','12 Weeks'),
(2,'Java Programming Tutorial','Complete Java for beginners','Java','https://www.youtube.com/watch?v=eIrMbLywjZ0','30 Days'),
(3,'Full Stack Web Development','MERN Stack learning path','Full Stack','https://www.freecodecamp.org/learn/2022/responsive-web-design/','6 Months'),
(4,'AI/ML Foundations','Introduction to Machine Learning by Google','AI/ML','https://developers.google.com/machine-learning/crash-course','4 Weeks'),
(5,'Cloud Computing Basics','AWS Cloud Practitioner Essentials','Cloud Computing','https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/','10 Days'),
(6,'Cybersecurity Essentials','Cisco Cybersecurity course','Cybersecurity','https://www.netacad.com/courses/cybersecurity/cybersecurity-essentials','15 Days'),
(7,'Advanced Python','Deep dive into Python programming','Python','https://docs.python.org/3/tutorial/','20 Days'),
(8,'React JS Mastery','Building modern UIs with React','Frontend','https://react.dev/learn','30 Days'),
(9,'Node.js & Express','Backend development with Node.js','Backend','https://nodejs.org/en/docs/guides/','25 Days');

-- NOTE: Admin and other users are created via: npm run seed
