const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'client')));

// Routes
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/mentor',   require('./routes/mentorRoutes'));
app.use('/api/student',  require('./routes/studentRoutes'));
app.use('/api/hod',      require('./routes/hodRoutes'));
app.use('/api/principal',require('./routes/principalRoutes'));
app.use('/api/academic', require('./routes/academicRoutes'));
app.use('/api/common',   require('./routes/commonRoutes'));

// ── Express 5 compatible global error handler ──
// In Express 5, async errors automatically propagate here.
// We must NOT call res.json() in individual catch blocks if Express 5
// already forwarded the error — this handler is the single source of truth.
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message || err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.message || 'An unexpected server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Import cron jobs (wrapped to prevent crash if config missing)
try { require('./config/cron'); } catch (e) { /* cron optional */ }
