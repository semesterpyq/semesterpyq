import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, PAPERS_UPLOAD_DIR, LOGOS_UPLOAD_DIR } from './server/db';
import { generateQuestionPaperPdf } from './server/pdf-generator';
import firebaseConfig from './firebase-applet-config.json';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import {
  handleAdminLoginStep1,
  handleAdminVerifyOtp,
  handleAdminResendOtp,
  handleAdminUpdateCredentials,
} from './server/admin-auth';
import { runSmtpDiagnostic } from './server/smtp-diagnostic';

const firebaseServerApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const serverFirestore = getFirestore(firebaseServerApp, firebaseConfig.firestoreDatabaseId);
const paperMemoryCache = new Map<string, any>();

function parseFirestoreRestDoc(docJson: any): Record<string, any> | null {
  if (!docJson || !docJson.fields) return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries<any>(docJson.fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) out[k] = Boolean(v.booleanValue);
    else if (v.nullValue !== undefined) out[k] = null;
  }
  return out;
}

async function fetchPaperFromFirestore(paperId: string): Promise<any | null> {
  if (!paperId) return null;

  // 1. Fast Firestore REST API lookup (works reliably in Node/Cloud Run with zero WebSocket overhead)
  try {
    const restUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(
      firebaseConfig.firestoreDatabaseId
    )}/documents/papers/${encodeURIComponent(paperId)}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const resp = await fetch(restUrl);
    if (resp.ok) {
      const json = await resp.json();
      const parsed = parseFirestoreRestDoc(json);
      if (parsed && (parsed.file_url || parsed.id)) {
        paperMemoryCache.set(paperId, parsed);
        return parsed;
      }
    }
  } catch (e) {
    // Continue to SDK fallback
  }

  // 2. Firebase JS SDK lookup (by doc ID or query where id == paperId)
  try {
    const snap = await getDoc(doc(serverFirestore, 'papers', paperId));
    if (snap.exists()) {
      const data = snap.data();
      paperMemoryCache.set(paperId, data);
      return data;
    }
    const qSnap = await getDocs(query(collection(serverFirestore, 'papers'), where('id', '==', paperId)));
    if (!qSnap.empty) {
      const data = qSnap.docs[0].data();
      paperMemoryCache.set(paperId, data);
      return data;
    }
  } catch (e) {
    console.warn('Firestore server lookup notice:', e);
  }

  return null;
}

async function resolvePaperRecord(paperId: string, fallbackMeta: Record<string, any> = {}): Promise<any> {
  if (paperId) {
    const cached = paperMemoryCache.get(paperId);
    if (cached && cached.file_url && cached.file_url !== '/assets/sample-paper.pdf') {
      return { ...fallbackMeta, ...cached };
    }

    const local = db.getPaperById(paperId);
    if (local && local.file_url && local.file_url !== '/assets/sample-paper.pdf') {
      paperMemoryCache.set(paperId, local);
      return { ...fallbackMeta, ...local };
    }

    const fsPaper = await fetchPaperFromFirestore(paperId);
    if (fsPaper) {
      return { ...fallbackMeta, ...(local || {}), ...fsPaper };
    }

    if (cached) return { ...fallbackMeta, ...cached };
    if (local) return { ...fallbackMeta, ...local };
  }
  return fallbackMeta;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload folders exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PAPERS_UPLOAD_DIR)) fs.mkdirSync(PAPERS_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(LOGOS_UPLOAD_DIR)) fs.mkdirSync(LOGOS_UPLOAD_DIR, { recursive: true });

app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage for uploaded PDFs
const paperStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PAPERS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `paper-${uniqueSuffix}${ext}`);
  },
});

const uploadPaper = multer({
  storage: paperStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are permitted'));
    }
  },
});

// Multer storage for University PNG/JPG Logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LOGOS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG/JPG image files are permitted for logos'));
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

app.get('/ads.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('google.com, pub-5868909493875712, DIRECT, f08c47fec0942fa0\n');
});

app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

// Real-time synchronization check endpoint
app.get('/api/sync-status', (req, res) => {
  res.json({
    lastModified: db.lastModified,
    papersCount: db.getQuestionPapers(undefined, false).length,
  });
});

// 1. UNIVERSITIES
app.get('/api/universities', (req, res) => {
  res.json(db.getUniversities(false));
});

app.get('/api/universities/:id', (req, res) => {
  const univ = db.getUniversityById(req.params.id);
  if (!univ) return res.status(404).json({ error: 'University not found' });
  res.json(univ);
});

// 2. COURSES
app.get('/api/courses', (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  res.json(db.getCourses(universityId, false));
});

app.get('/api/courses/:id', (req, res) => {
  const course = db.getCourseById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

// 3. YEARS
app.get('/api/years', (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  res.json(db.getYears({ universityId, courseId }, false));
});

app.get('/api/years/:id', (req, res) => {
  const year = db.getYearById(req.params.id);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  res.json(year);
});

// 4. SEMESTERS
app.get('/api/semesters', (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  res.json(db.getSemesters({ universityId, courseId, yearId }, false));
});

app.get('/api/semesters/:id', (req, res) => {
  const sem = db.getSemesterById(req.params.id);
  if (!sem) return res.status(404).json({ error: 'Semester not found' });
  res.json(sem);
});

// 5. PAPER YEARS (Shows paper years that actually have uploaded papers)
app.get('/api/paper-years', (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;

  const paperYears = db.getPaperYears({ universityId, courseId, yearId, semesterId });
  res.json(paperYears);
});

// 6. SUBJECTS
app.get('/api/subjects', (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  const paperYear = req.query.paperYear ? Number(req.query.paperYear) : undefined;

  res.json(db.getSubjects({ universityId, courseId, yearId, semesterId, paperYear }, false));
});

app.get('/api/subjects/:id', (req, res) => {
  const subject = db.getSubjectById(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

// 7. QUESTION PAPERS
app.get('/api/papers', (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  const paperYear = req.query.paperYear || req.query.examYear ? Number(req.query.paperYear || req.query.examYear) : undefined;

  res.json(db.getQuestionPapers({ universityId, courseId, yearId, semesterId, subjectId, paperYear }, false));
});

app.get('/api/papers/:id', async (req, res) => {
  const paper = await resolvePaperRecord(req.params.id);
  if (!paper || !paper.id) return res.status(404).json({ error: 'Question paper not found' });
  res.json(paper);
});

// Public cache sync so client-fetched Firestore papers are immediately available for native browser PDF viewing
app.post('/api/papers/sync-cache', (req, res) => {
  try {
    const { paper, papers } = req.body || {};
    if (paper && paper.id) {
      paperMemoryCache.set(paper.id, paper);
    }
    if (Array.isArray(papers)) {
      for (const p of papers) {
        if (p && p.id) {
          paperMemoryCache.set(p.id, p);
        }
      }
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// View / Stream PDF
const servePdfInline = async (req: express.Request, res: express.Response) => {
  const paperId = req.params.id || (req.query.id as string);
  const paper = await resolvePaperRecord(paperId, {
    id: paperId || 'qp-default',
    title: (req.query.title as string) || 'Examination Question Paper',
    course_name: (req.query.courseName as string) || 'Undergraduate Course',
    course_code: (req.query.courseCode as string) || 'ACAD',
    subject_name: (req.query.subjectName as string) || 'Subject Paper',
    paper_code: (req.query.paperCode as string) || paperId || 'QP',
    paper_year: Number(req.query.examYear || req.query.paperYear || 2024),
    exam_year: Number(req.query.examYear || req.query.paperYear || 2024),
    exam_session: 'Main Examination',
    total_marks: 75,
    duration: '3 Hours',
    file_name: req.params.filename || (req.query.fileName as string),
    file_url: (req.query.fileUrl as string),
  });

  try {
    if (paper.id) db.incrementPaperView(paper.id);
  } catch {
    // ignore
  }

  // Derive real filename stored in database or fallback
  let rawFilename = req.params.filename || paper.file_name;
  if (!rawFilename || rawFilename === 'paper.pdf') {
    const rawCourseOrSub = (paper.course_name || paper.subject_name || paper.paper_code || 'paper')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');
    const yr = paper.paper_year || paper.exam_year || 2024;
    rawFilename = `${rawCourseOrSub}-${yr}.pdf`;
  }
  if (!rawFilename.toLowerCase().endsWith('.pdf')) {
    rawFilename = `${rawFilename}.pdf`;
  }
  const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);

  // 1. Data URI (stored in Firestore or local DB)
  if (paper.file_url && paper.file_url.startsWith('data:')) {
    try {
      const commaIdx = paper.file_url.indexOf(',');
      const base64Data = (commaIdx !== -1 ? paper.file_url.slice(commaIdx + 1) : paper.file_url)
        .trim()
        .replace(/[\s\r\n]/g, '');
      const pdfBuf = Buffer.from(base64Data, 'base64');
      if (pdfBuf.length >= 4 && pdfBuf.slice(0, 4).toString() === '%PDF') {
        res.setHeader('Content-Length', pdfBuf.length);
        return res.send(pdfBuf);
      }
    } catch (e) {
      console.error('Error decoding base64 PDF:', e);
    }
  }

  // 2. Uploaded file on disk
  if (paper.file_url && paper.file_url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), paper.file_url);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      res.setHeader('Content-Length', stats.size);
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 3. Check papers upload directory for matched paper id
  if (paper.id) {
    const possibleFiles = fs.existsSync(PAPERS_UPLOAD_DIR) ? fs.readdirSync(PAPERS_UPLOAD_DIR) : [];
    const matched = possibleFiles.find((f: string) => f.includes(paper.id));
    if (matched) {
      const p = path.join(PAPERS_UPLOAD_DIR, matched);
      const stats = fs.statSync(p);
      res.setHeader('Content-Length', stats.size);
      return fs.createReadStream(p).pipe(res);
    }
  }

  // 4. External HTTP/HTTPS URL or Google Drive URL
  if (paper.file_url && (paper.file_url.startsWith('http://') || paper.file_url.startsWith('https://'))) {
    try {
      let targetFetchUrl = paper.file_url;
      const driveMatch =
        paper.file_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        paper.file_url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (paper.file_url.includes('drive.google.com') && driveMatch && driveMatch[1]) {
        targetFetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
      }
      const extRes = await fetch(targetFetchUrl);
      if (extRes.ok) {
        const arrBuf = await extRes.arrayBuffer();
        const pdfBuf = Buffer.from(arrBuf);
        if (pdfBuf.length >= 4 && pdfBuf.slice(0, 4).toString() === '%PDF') {
          res.setHeader('Content-Length', pdfBuf.length);
          return res.send(pdfBuf);
        }
      }
      if (paper.file_url.includes('drive.google.com') && driveMatch && driveMatch[1]) {
        return res.redirect(`https://drive.google.com/file/d/${driveMatch[1]}/preview`);
      }
      return res.redirect(paper.file_url);
    } catch (e) {
      console.warn('External PDF proxy notice:', e);
    }
  }

  // 5. Fallback: generate clean official PDF so browser viewer always displays the paper
  try {
    const generatedBuf = await generateQuestionPaperPdf({
      collegeName: paper.university_name || 'Semester (PYQs)',
      courseName: paper.course_name || 'Undergraduate Course',
      courseCode: paper.course_code || 'ACAD',
      yearName: paper.year_name || 'Academic Session',
      subjectName: paper.subject_name || paper.title || 'Subject Examination Paper',
      subjectCode: paper.subject_code || paper.paper_code || 'QP',
      paperTitle: paper.title || 'Examination Question Paper',
      examYear: paper.paper_year || paper.exam_year || 2024,
      examSession: paper.exam_session || 'Semester Examination',
      paperCode: paper.paper_code || 'QP',
      totalMarks: paper.total_marks || 75,
      duration: paper.duration || '3 Hours',
    });
    res.setHeader('Content-Length', generatedBuf.length);
    return res.send(generatedBuf);
  } catch (genErr) {
    console.error('Fallback PDF generation error:', genErr);
  }

  return res.status(404).json({ error: 'PDF document not found' });
};

app.get('/api/papers/:id/file', servePdfInline);
app.get('/api/papers/:id/file/:filename', servePdfInline);
app.get('/api/papers/:id/view', servePdfInline);
app.get('/api/papers/:id/view/:filename', servePdfInline);

// Download PDF
app.get('/api/papers/:id/download', async (req, res) => {
  const paper = await resolvePaperRecord(req.params.id, {
    id: req.params.id,
    title: (req.query.title as string) || 'Examination Question Paper',
    course_name: (req.query.courseName as string) || 'Undergraduate Course',
    course_code: (req.query.courseCode as string) || 'ACAD',
    subject_name: (req.query.subjectName as string) || 'Subject Paper',
    paper_code: (req.query.paperCode as string) || req.params.id,
    paper_year: Number(req.query.examYear || req.query.paperYear || 2024),
    exam_year: Number(req.query.examYear || req.query.paperYear || 2024),
    exam_session: 'Main Examination',
    total_marks: 75,
    duration: '3 Hours',
  });

  try {
    db.incrementPaperDownload(paper.id);
  } catch {
    // ignore
  }

  const rawName =
    paper.file_name && paper.file_name !== 'paper.pdf'
      ? paper.file_name
      : `${paper.paper_code || 'paper'}-${paper.paper_year || paper.exam_year || 2024}.pdf`;
  const safeFilename = (rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`).replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (paper.file_url && paper.file_url.startsWith('data:')) {
    try {
      const commaIdx = paper.file_url.indexOf(',');
      const base64Data = (commaIdx !== -1 ? paper.file_url.slice(commaIdx + 1) : paper.file_url)
        .trim()
        .replace(/[\s\r\n]/g, '');
      const pdfBuf = Buffer.from(base64Data, 'base64');
      if (pdfBuf.length >= 4 && pdfBuf.slice(0, 4).toString() === '%PDF') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Length', pdfBuf.length);
        return res.send(pdfBuf);
      }
    } catch (e) {
      console.error('Error decoding base64 PDF for download:', e);
    }
  }

  if (paper.file_url && paper.file_url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), paper.file_url);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      return res.download(filePath, safeFilename);
    }
  }

  try {
    const generatedBuf = await generateQuestionPaperPdf({
      collegeName: paper.university_name || 'Semester (PYQs)',
      courseName: paper.course_name || 'Undergraduate Course',
      courseCode: paper.course_code || 'ACAD',
      yearName: paper.year_name || 'Academic Session',
      subjectName: paper.subject_name || paper.title || 'Subject Examination Paper',
      subjectCode: paper.subject_code || paper.paper_code || 'QP',
      paperTitle: paper.title || 'Examination Question Paper',
      examYear: paper.paper_year || paper.exam_year || 2024,
      examSession: paper.exam_session || 'Semester Examination',
      paperCode: paper.paper_code || 'QP',
      totalMarks: paper.total_marks || 75,
      duration: paper.duration || '3 Hours',
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', generatedBuf.length);
    return res.send(generatedBuf);
  } catch (e) {
    console.error('Download fallback generation error:', e);
  }

  return res.status(404).json({ error: 'PDF document not found' });
});

// 8. SEARCH
app.get('/api/search', (req, res) => {
  const q = req.query.q as string;
  res.json(db.search(q, false));
});

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

app.post('/api/admin/login/step1', async (req, res) => {
  const { email, password } = req.body;
  const result = await handleAdminLoginStep1(email, password);
  res.status(result.status || 200).json(result);
});

app.post('/api/admin/verify-otp', async (req, res) => {
  const { sessionKey, challengeId, otp } = req.body;
  const result = await handleAdminVerifyOtp(sessionKey || challengeId, otp);
  res.status(result.status || 200).json(result);
});

app.post('/api/admin/resend-otp', async (req, res) => {
  const { sessionKey, challengeId } = req.body;
  const result = await handleAdminResendOtp(sessionKey || challengeId);
  res.status(result.status || 200).json(result);
});

app.post('/api/admin/update-credentials', requireAdminAuth, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;
  const result = await handleAdminUpdateCredentials(currentPassword, newEmail, newPassword);
  res.status(result.status || 200).json(result);
});

// ==========================================
// SECURE ADMIN MANAGEMENT ROUTES
// ==========================================

app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  res.json(db.getDashboardStats());
});

// --- ADMIN UNIVERSITIES ---
app.get('/api/admin/universities', requireAdminAuth, (req, res) => {
  res.json(db.getUniversities(true));
});

app.post('/api/admin/universities', requireAdminAuth, (req, res) => {
  try {
    const univ = db.createUniversity(req.body);
    res.status(201).json(univ);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create university' });
  }
});

app.put('/api/admin/universities/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateUniversity(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'University not found' });
  res.json(updated);
});

app.delete('/api/admin/universities/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteUniversity(req.params.id);
  if (!success) return res.status(404).json({ error: 'University not found' });
  res.json({ success: true, message: 'University deleted successfully' });
});

// Upload PNG / JPG University Logo
app.post('/api/admin/upload-logo', requireAdminAuth, uploadLogo.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo image file was uploaded' });
  }
  const fileUrl = `/uploads/logos/${req.file.filename}`;
  res.json({ success: true, logo_url: fileUrl, file_name: req.file.filename });
});

// --- ADMIN COURSES ---
app.get('/api/admin/courses', requireAdminAuth, (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  res.json(db.getCourses(universityId, true));
});

app.post('/api/admin/courses', requireAdminAuth, (req, res) => {
  try {
    const course = db.createCourse(req.body);
    res.status(201).json(course);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create course' });
  }
});

app.put('/api/admin/courses/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateCourse(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Course not found' });
  res.json(updated);
});

app.delete('/api/admin/courses/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteCourse(req.params.id);
  if (!success) return res.status(404).json({ error: 'Course not found' });
  res.json({ success: true, message: 'Course deleted successfully' });
});

// --- ADMIN YEARS ---
app.get('/api/admin/years', requireAdminAuth, (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  res.json(db.getYears({ universityId, courseId }, true));
});

app.post('/api/admin/years', requireAdminAuth, (req, res) => {
  try {
    const year = db.createYear(req.body);
    res.status(201).json(year);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create year' });
  }
});

app.put('/api/admin/years/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateYear(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Year not found' });
  res.json(updated);
});

app.delete('/api/admin/years/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteYear(req.params.id);
  if (!success) return res.status(404).json({ error: 'Year not found' });
  res.json({ success: true, message: 'Year deleted successfully' });
});

// --- ADMIN SEMESTERS ---
app.get('/api/admin/semesters', requireAdminAuth, (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  res.json(db.getSemesters({ universityId, courseId, yearId }, true));
});

app.post('/api/admin/semesters', requireAdminAuth, (req, res) => {
  try {
    const sem = db.createSemester(req.body);
    res.status(201).json(sem);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create semester' });
  }
});

app.put('/api/admin/semesters/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateSemester(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Semester not found' });
  res.json(updated);
});

app.delete('/api/admin/semesters/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteSemester(req.params.id);
  if (!success) return res.status(404).json({ error: 'Semester not found' });
  res.json({ success: true, message: 'Semester deleted successfully' });
});

// --- ADMIN SUBJECTS ---
app.get('/api/admin/subjects', requireAdminAuth, (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  res.json(db.getSubjects({ universityId, courseId, yearId, semesterId }, true));
});

app.post('/api/admin/subjects', requireAdminAuth, (req, res) => {
  try {
    const subject = db.createSubject(req.body);
    res.status(201).json(subject);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create subject' });
  }
});

app.put('/api/admin/subjects/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateSubject(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Subject not found' });
  res.json(updated);
});

app.delete('/api/admin/subjects/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteSubject(req.params.id);
  if (!success) return res.status(404).json({ error: 'Subject not found' });
  res.json({ success: true, message: 'Subject deleted successfully' });
});

// --- ADMIN QUESTION PAPERS ---
app.get('/api/admin/papers', requireAdminAuth, (req, res) => {
  const universityId = req.query.universityId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const yearId = req.query.yearId as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  res.json(db.getQuestionPapers({ universityId, courseId, yearId, semesterId, subjectId }, true));
});

// Upload paper PDF + create record
app.post('/api/admin/papers', requireAdminAuth, uploadPaper.single('pdf'), (req, res) => {
  try {
    const body = req.body;
    let file_url = body.file_url || body.fileUrl;
    let file_name = body.file_name || body.fileName;
    let file_size = body.file_size || body.fileSize;

    if (req.file) {
      file_url = `/uploads/papers/${req.file.filename}`;
      file_name = req.file.originalname;
      const sizeMb = (req.file.size / (1024 * 1024)).toFixed(1);
      file_size = `${sizeMb} MB`;
    }

    const paperData = {
      ...body,
      file_url,
      file_name,
      file_size,
    };

    const newPaper = db.createPaper(paperData);
    res.status(201).json(newPaper);
  } catch (err: any) {
    console.error('Failed to create paper:', err);
    res.status(400).json({ error: err.message || 'Failed to create paper' });
  }
});

app.put('/api/admin/papers/:id', requireAdminAuth, (req, res) => {
  const updated = db.updatePaper(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Question paper not found' });
  res.json(updated);
});

app.delete('/api/admin/papers/:id', requireAdminAuth, (req, res) => {
  const success = db.deletePaper(req.params.id);
  if (!success) return res.status(404).json({ error: 'Question paper not found' });
  res.json({ success: true, message: 'Question paper deleted successfully' });
});

// --- SETTINGS ---
app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// Serve frontend in production or Vite in dev
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
