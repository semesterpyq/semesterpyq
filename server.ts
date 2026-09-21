import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, PAPERS_UPLOAD_DIR } from './server/db';
import { generateQuestionPaperPdf } from './server/pdf-generator';
import {
  handleAdminLoginStep1,
  handleAdminVerifyOtp,
  handleAdminResendOtp,
  handleAdminUpdateCredentials,
} from './server/admin-auth';
import { runSmtpDiagnostic } from './server/smtp-diagnostic';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload folders exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TEMP_UPLOAD_DIR = path.join(UPLOADS_DIR, 'temp');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_UPLOAD_DIR)) fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(PAPERS_UPLOAD_DIR)) fs.mkdirSync(PAPERS_UPLOAD_DIR, { recursive: true });

app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage for uploaded PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PAPERS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `paper-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are permitted'));
    }
  },
});

// Middleware: Require Admin Authentication
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const token = authHeader.substring(7);
  const isValid = db.validateSession(token);
  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session token' });
  }

  next();
}

// ==========================================
// PUBLIC API ROUTES
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.get('/api/courses', (req, res) => {
  res.json(db.getCourses(false));
});

app.get('/api/courses/:id', (req, res) => {
  const course = db.getCourseById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

app.get('/api/years', (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  res.json(db.getYears(courseId, false));
});

app.get('/api/subjects', (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  res.json(db.getSubjects({ courseId, yearId }, false));
});

app.get('/api/subjects/:id', (req, res) => {
  const subject = db.getSubjectById(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

app.get('/api/papers', (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  const examYear = req.query.examYear ? Number(req.query.examYear) : undefined;
  res.json(db.getQuestionPapers({ courseId, yearId, subjectId, examYear }, false));
});

app.get('/api/papers/:id', (req, res) => {
  const paper = db.getPaperById(req.params.id);
  if (!paper) return res.status(404).json({ error: 'Question paper not found' });
  res.json(paper);
});

app.get('/api/papers/:id/download', async (req, res) => {
  const paper = db.getPaperById(req.params.id);
  if (!paper) return res.status(404).json({ error: 'Question paper not found' });

  db.incrementPaperDownload(paper.id);

  if (paper.file_url && paper.file_url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), paper.file_url);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, `${paper.paper_code || 'paper'}-${paper.exam_year}.pdf`);
    }
  }

  try {
    const course = db.getCourseById(paper.course_id);
    const subject = db.getSubjectById(paper.subject_id);
    const settings = db.getSettings();

    const pdfBytes = await generateQuestionPaperPdf({
      title: paper.title,
      courseName: course?.name || 'Academic Degree',
      courseCode: course?.code || 'ACAD',
      subjectName: subject?.name || 'Subject Archive',
      paperCode: paper.paper_code || 'EXAM-CODE',
      examYear: paper.exam_year,
      semester: paper.semester,
      durationHours: paper.duration_hours || 3,
      maxMarks: paper.max_marks || 100,
      instructions: paper.instructions || [
        'Attempt all sections according to the marks allocated.',
        'Write neatly and substantiate your answers with diagrams where relevant.',
        'Use of unauthorized electronic calculators is strictly prohibited.',
      ],
      sections: paper.sections || [],
      watermarkText: settings.site_name || 'SEMESTER (PYQS)',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${paper.paper_code || 'paper'}-${paper.exam_year}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate PDF download' });
  }
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q as string) || '';
  const results = db.search(q, false);
  res.json(results);
});

// ==========================================
// ADMIN AUTHENTICATION & OTP FLOW
// ==========================================

// Step 1: Verify credentials and dispatch OTP email (strictly server-side)
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await handleAdminLoginStep1(email, password);
  if (!result.success) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json(result);
});

app.post('/api/admin/login-step1', async (req, res) => {
  const { email, password } = req.body;
  const result = await handleAdminLoginStep1(email, password);
  if (!result.success) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json(result);
});

// Step 2: Verify 6-digit OTP
app.post('/api/admin/verify-otp', async (req, res) => {
  const { challengeId, otp } = req.body;
  const result = await handleAdminVerifyOtp(challengeId, otp);
  if (!result.success) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ success: true, token: result.token, admin: result.admin });
});

// Step 3: Resend OTP (with server-side cooldown)
app.post('/api/admin/resend-otp', async (req, res) => {
  const { challengeId } = req.body;
  const result = await handleAdminResendOtp(challengeId);
  if (!result.success) {
    return res.status(result.status).json({ error: result.error, resendCooldown: result.resendCooldown });
  }
  res.json(result);
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    db.invalidateSession(token);
  }
  res.json({ success: true });
});

app.post('/api/admin/smtp-diagnostic', requireAdminAuth, async (req, res) => {
  const diagnostic = await runSmtpDiagnostic();
  res.json(diagnostic);
});

// ==========================================
// PROTECTED ADMIN MANAGEMENT ROUTES
// ==========================================

app.get('/api/admin/me', requireAdminAuth, (req, res) => {
  const profile = db.getAdminProfile();
  res.json({ admin: profile });
});

app.put('/api/admin/credentials', requireAdminAuth, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required to update security credentials' });
  }
  const result = await handleAdminUpdateCredentials(currentPassword, newEmail, newPassword);
  if (!result.success) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json({ success: true, message: result.message || 'Institutional credentials updated successfully' });
});

app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const stats = db.getDashboardStats();
  res.json(stats);
});

app.get('/api/admin/settings', requireAdminAuth, (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

app.get('/api/admin/courses', requireAdminAuth, (req, res) => {
  res.json(db.getCourses(true));
});

app.post('/api/admin/courses', requireAdminAuth, (req, res) => {
  const course = db.createCourse(req.body);
  res.status(201).json(course);
});

app.put('/api/admin/courses/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateCourse(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Course not found' });
  res.json(updated);
});

app.delete('/api/admin/courses/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteCourse(req.params.id);
  if (!success) return res.status(404).json({ error: 'Course not found' });
  res.json({ success: true });
});

app.post('/api/admin/courses/reorder', requireAdminAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (Array.isArray(orderedIds)) {
    db.reorderCourses(orderedIds);
  }
  res.json({ success: true });
});

app.get('/api/admin/years', requireAdminAuth, (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  res.json(db.getYears(courseId, true));
});

app.post('/api/admin/years', requireAdminAuth, (req, res) => {
  const year = db.createYear(req.body);
  res.status(201).json(year);
});

app.put('/api/admin/years/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateYear(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Year not found' });
  res.json(updated);
});

app.delete('/api/admin/years/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteYear(req.params.id);
  if (!success) return res.status(404).json({ error: 'Year not found' });
  res.json({ success: true });
});

app.post('/api/admin/years/reorder', requireAdminAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (Array.isArray(orderedIds)) {
    db.reorderYears(orderedIds);
  }
  res.json({ success: true });
});

app.get('/api/admin/subjects', requireAdminAuth, (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  res.json(db.getSubjects({ courseId, yearId }, true));
});

app.post('/api/admin/subjects', requireAdminAuth, (req, res) => {
  const subject = db.createSubject(req.body);
  res.status(201).json(subject);
});

app.put('/api/admin/subjects/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateSubject(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Subject not found' });
  res.json(updated);
});

app.delete('/api/admin/subjects/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteSubject(req.params.id);
  if (!success) return res.status(404).json({ error: 'Subject not found' });
  res.json({ success: true });
});

app.post('/api/admin/subjects/reorder', requireAdminAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (Array.isArray(orderedIds)) {
    db.reorderSubjects(orderedIds);
  }
  res.json({ success: true });
});

app.get('/api/admin/papers', requireAdminAuth, (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  const examYear = req.query.examYear ? Number(req.query.examYear) : undefined;
  res.json(db.getQuestionPapers({ courseId, yearId, subjectId, examYear }, true));
});

app.post('/api/admin/papers', requireAdminAuth, (req, res) => {
  const paper = db.createPaper(req.body);
  res.status(201).json(paper);
});

app.put('/api/admin/papers/:id', requireAdminAuth, (req, res) => {
  const updated = db.updatePaper(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Question paper not found' });
  res.json(updated);
});

app.delete('/api/admin/papers/:id', requireAdminAuth, (req, res) => {
  const success = db.deletePaper(req.params.id);
  if (!success) return res.status(404).json({ error: 'Question paper not found' });
  res.json({ success: true });
});

app.post('/api/admin/papers/bulk-delete', requireAdminAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  const count = db.bulkDeletePapers(ids);
  res.json({ success: true, count });
});

app.post('/api/admin/papers/bulk-status', requireAdminAuth, (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  if (status !== 'Published' && status !== 'Draft') {
    return res.status(400).json({ error: 'status must be Published or Draft' });
  }
  const count = db.bulkSetPaperStatus(ids, status);
  res.json({ success: true, count });
});

app.post('/api/admin/upload-pdf', requireAdminAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(1);
  const fileSizeStr = req.file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${Math.round(req.file.size / 1024)} KB`;
  res.json({
    success: true,
    file_name: req.file.filename,
    file_url: `/uploads/papers/${req.file.filename}`,
    file_size: fileSizeStr,
  });
});

// ==========================================
// VITE & STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'custom',
    });

    app.get(['/admin.html', '/admin', '/admin/*'], async (req, res, next) => {
      try {
        const adminHtmlPath = path.join(process.cwd(), 'admin.html');
        if (fs.existsSync(adminHtmlPath)) {
          let html = fs.readFileSync(adminHtmlPath, 'utf-8');
          html = await vite.transformIndexHtml(req.originalUrl, html);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        }
        next();
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      try {
        const indexHtmlPath = fs.existsSync(path.join(process.cwd(), 'template.html'))
          ? path.join(process.cwd(), 'template.html')
          : path.join(process.cwd(), 'index.html');
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get(['/admin.html', '/admin', '/admin/*'], (req, res) => {
      if (fs.existsSync(path.join(distPath, 'admin.html'))) {
        res.sendFile(path.join(distPath, 'admin.html'));
      } else {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Semester (PYQs) portal server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
