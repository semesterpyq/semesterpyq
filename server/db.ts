import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const PAPERS_UPLOAD_DIR = path.join(UPLOADS_DIR, 'papers');
const LOGOS_UPLOAD_DIR = path.join(UPLOADS_DIR, 'logos');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PAPERS_UPLOAD_DIR)) fs.mkdirSync(PAPERS_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(LOGOS_UPLOAD_DIR)) fs.mkdirSync(LOGOS_UPLOAD_DIR, { recursive: true });

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function createInitialData() {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const adminHash = hashPassword(process.env.ADMIN_PASSWORD || 'ratnesh@200.lbs8!', adminSalt);

  // Default Universities
  const universities = [
    {
      id: 'univ-lu',
      name: 'Lucknow University',
      code: 'LU',
      logo_url: '/assets/logos/logo.jpg',
      description: 'Established 1921. Premier State University in Lucknow, Uttar Pradesh.',
      is_active: true,
      display_order: 1,
      created_at: new Date('2024-01-01').toISOString(),
    },
    {
      id: 'univ-mpu',
      name: 'Maa Patishwari University',
      code: 'MPU',
      logo_url: '/assets/logos/logo.jpg',
      description: 'State University in Balrampur / Gonda Region, Uttar Pradesh.',
      is_active: true,
      display_order: 2,
      created_at: new Date('2024-01-01').toISOString(),
    },
  ];

  // Default Courses
  const courses = [
    {
      id: 'course-ba-lu',
      university_id: 'univ-lu',
      name: 'Bachelor of Arts',
      code: 'B.A.',
      slug: 'ba-lu',
      description: 'Undergraduate humanities program.',
      display_order: 1,
      is_published: true,
      created_at: new Date('2024-01-10').toISOString(),
    },
    {
      id: 'course-bsc-lu',
      university_id: 'univ-lu',
      name: 'Bachelor of Science',
      code: 'B.Sc.',
      slug: 'bsc-lu',
      description: 'Undergraduate science degree.',
      display_order: 2,
      is_published: true,
      created_at: new Date('2024-01-10').toISOString(),
    },
    {
      id: 'course-bcom-lu',
      university_id: 'univ-lu',
      name: 'Bachelor of Commerce',
      code: 'B.Com.',
      slug: 'bcom-lu',
      description: 'Undergraduate commerce degree.',
      display_order: 3,
      is_published: true,
      created_at: new Date('2024-01-10').toISOString(),
    },
    {
      id: 'course-bca-lu',
      university_id: 'univ-lu',
      name: 'Bachelor of Computer Applications',
      code: 'BCA',
      slug: 'bca-lu',
      description: 'Computer applications degree.',
      display_order: 4,
      is_published: true,
      created_at: new Date('2024-01-10').toISOString(),
    },
    {
      id: 'course-ba-mpu',
      university_id: 'univ-mpu',
      name: 'Bachelor of Arts',
      code: 'B.A.',
      slug: 'ba-mpu',
      description: 'Maa Patishwari University B.A Degree.',
      display_order: 1,
      is_published: true,
      created_at: new Date('2024-01-10').toISOString(),
    },
    {
      id: 'course-bsc-mpu',
      university_id: 'univ-mpu',
      name: 'Bachelor of Science',
      code: 'B.Sc.',
      slug: 'bsc-mpu',
      description: 'Maa Patishwari University B.Sc Degree.',
      display_order: 2,
      is_published: true,
      created_at: new Date('2024-01-10').toISOString(),
    },
  ];

  // Default Years
  const years = [
    // LU - B.Sc Years
    { id: 'yr-bsc-1', university_id: 'univ-lu', course_id: 'course-bsc-lu', name: '1st Year', year_number: 1, slug: '1st-year', display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'yr-bsc-2', university_id: 'univ-lu', course_id: 'course-bsc-lu', name: '2nd Year', year_number: 2, slug: '2nd-year', display_order: 2, is_published: true, created_at: new Date().toISOString() },
    { id: 'yr-bsc-3', university_id: 'univ-lu', course_id: 'course-bsc-lu', name: '3rd Year', year_number: 3, slug: '3rd-year', display_order: 3, is_published: true, created_at: new Date().toISOString() },
    
    // LU - B.A Years
    { id: 'yr-ba-1', university_id: 'univ-lu', course_id: 'course-ba-lu', name: '1st Year', year_number: 1, slug: '1st-year', display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'yr-ba-2', university_id: 'univ-lu', course_id: 'course-ba-lu', name: '2nd Year', year_number: 2, slug: '2nd-year', display_order: 2, is_published: true, created_at: new Date().toISOString() },
    { id: 'yr-ba-3', university_id: 'univ-lu', course_id: 'course-ba-lu', name: '3rd Year', year_number: 3, slug: '3rd-year', display_order: 3, is_published: true, created_at: new Date().toISOString() },

    // MPU - B.Sc Years
    { id: 'yr-bsc-mpu-1', university_id: 'univ-mpu', course_id: 'course-bsc-mpu', name: '1st Year', year_number: 1, slug: '1st-year', display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'yr-bsc-mpu-2', university_id: 'univ-mpu', course_id: 'course-bsc-mpu', name: '2nd Year', year_number: 2, slug: '2nd-year', display_order: 2, is_published: true, created_at: new Date().toISOString() },
  ];

  // Default Semesters
  const semesters = [
    // LU B.Sc 1st Year
    { id: 'sem-bsc-1', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-1', name: '1st Semester', semester_number: 1, display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sem-bsc-2', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-1', name: '2nd Semester', semester_number: 2, display_order: 2, is_published: true, created_at: new Date().toISOString() },
    
    // LU B.Sc 2nd Year
    { id: 'sem-bsc-3', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-2', name: '3rd Semester', semester_number: 3, display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sem-bsc-4', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-2', name: '4th Semester', semester_number: 4, display_order: 2, is_published: true, created_at: new Date().toISOString() },

    // LU B.Sc 3rd Year
    { id: 'sem-bsc-5', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-3', name: '5th Semester', semester_number: 5, display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sem-bsc-6', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-3', name: '6th Semester', semester_number: 6, display_order: 2, is_published: true, created_at: new Date().toISOString() },

    // LU B.A 1st Year
    { id: 'sem-ba-1', university_id: 'univ-lu', course_id: 'course-ba-lu', year_id: 'yr-ba-1', name: '1st Semester', semester_number: 1, display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sem-ba-2', university_id: 'univ-lu', course_id: 'course-ba-lu', year_id: 'yr-ba-1', name: '2nd Semester', semester_number: 2, display_order: 2, is_published: true, created_at: new Date().toISOString() },

    // MPU B.Sc 1st Year
    { id: 'sem-mpu-bsc-1', university_id: 'univ-mpu', course_id: 'course-bsc-mpu', year_id: 'yr-bsc-mpu-1', name: '1st Semester', semester_number: 1, display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sem-mpu-bsc-2', university_id: 'univ-mpu', course_id: 'course-bsc-mpu', year_id: 'yr-bsc-mpu-1', name: '2nd Semester', semester_number: 2, display_order: 2, is_published: true, created_at: new Date().toISOString() },
  ];

  // Default Subjects
  const subjects = [
    // LU B.Sc 1st Sem
    { id: 'sub-math-1', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-1', semester_id: 'sem-bsc-1', name: 'Mathematics I: Differential Calculus', code: 'MATH-101', slug: 'calculus', description: 'Calculus and analytical geometry.', display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sub-phy-1', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-1', semester_id: 'sem-bsc-1', name: 'Physics I: Mechanics', code: 'PHYS-101', slug: 'mechanics', description: 'Mechanics and wave motion.', display_order: 2, is_published: true, created_at: new Date().toISOString() },
    { id: 'sub-chem-1', university_id: 'univ-lu', course_id: 'course-bsc-lu', year_id: 'yr-bsc-1', semester_id: 'sem-bsc-1', name: 'Chemistry I: Fundamentals', code: 'CHEM-101', slug: 'chemistry', description: 'Inorganic and Physical Chemistry.', display_order: 3, is_published: true, created_at: new Date().toISOString() },
    
    // LU B.A 1st Sem
    { id: 'sub-eng-1', university_id: 'univ-lu', course_id: 'course-ba-lu', year_id: 'yr-ba-1', semester_id: 'sem-ba-1', name: 'English Literature: Prose & Drama', code: 'ENG-101', slug: 'english-lit', description: 'Prose and Classical Drama.', display_order: 1, is_published: true, created_at: new Date().toISOString() },
    { id: 'sub-hin-1', university_id: 'univ-lu', course_id: 'course-ba-lu', year_id: 'yr-ba-1', semester_id: 'sem-ba-1', name: 'Hindi Sahitya: Kavya', code: 'HIN-101', slug: 'hindi-lit', description: 'Modern and Medieval Poetry.', display_order: 2, is_published: true, created_at: new Date().toISOString() },

    // MPU B.Sc 1st Sem
    { id: 'sub-mpu-math-1', university_id: 'univ-mpu', course_id: 'course-bsc-mpu', year_id: 'yr-bsc-mpu-1', semester_id: 'sem-mpu-bsc-1', name: 'Mathematics: Differential Equations', code: 'MATH-MPU-101', slug: 'diff-eq', description: 'Algebra & Differential equations.', display_order: 1, is_published: true, created_at: new Date().toISOString() },
  ];

  // Default Question Papers
  const papers = [
    {
      id: 'qp-math-2024',
      university_id: 'univ-lu',
      course_id: 'course-bsc-lu',
      year_id: 'yr-bsc-1',
      semester_id: 'sem-bsc-1',
      paper_year: 2024,
      exam_year: 2024,
      subject_id: 'sub-math-1',
      title: 'Mathematics I: Differential Calculus - 2024 Examination Paper',
      exam_session: 'Semester Examination',
      paper_code: 'LU-BSC-M1-2024',
      total_marks: 75,
      duration: '3 Hours',
      file_name: 'LU_BSc_Maths_Sem1_2024.pdf',
      file_url: '/api/papers/qp-math-2024/file',
      file_size: '1.2 MB',
      is_published: true,
      view_count: 310,
      download_count: 185,
      created_at: new Date('2024-05-15').toISOString(),
    },
    {
      id: 'qp-math-2025',
      university_id: 'univ-lu',
      course_id: 'course-bsc-lu',
      year_id: 'yr-bsc-1',
      semester_id: 'sem-bsc-1',
      paper_year: 2025,
      exam_year: 2025,
      subject_id: 'sub-math-1',
      title: 'Mathematics I: Differential Calculus - 2025 Examination Paper',
      exam_session: 'Semester Examination',
      paper_code: 'LU-BSC-M1-2025',
      total_marks: 75,
      duration: '3 Hours',
      file_name: 'LU_BSc_Maths_Sem1_2025.pdf',
      file_url: '/api/papers/qp-math-2025/file',
      file_size: '1.4 MB',
      is_published: true,
      view_count: 420,
      download_count: 290,
      created_at: new Date('2025-05-18').toISOString(),
    },
    {
      id: 'qp-phy-2024',
      university_id: 'univ-lu',
      course_id: 'course-bsc-lu',
      year_id: 'yr-bsc-1',
      semester_id: 'sem-bsc-1',
      paper_year: 2024,
      exam_year: 2024,
      subject_id: 'sub-phy-1',
      title: 'Physics I: Mechanics - 2024 Examination Paper',
      exam_session: 'Semester Examination',
      paper_code: 'LU-BSC-P1-2024',
      total_marks: 75,
      duration: '3 Hours',
      file_name: 'LU_BSc_Physics_Sem1_2024.pdf',
      file_url: '/api/papers/qp-phy-2024/file',
      file_size: '1.1 MB',
      is_published: true,
      view_count: 210,
      download_count: 140,
      created_at: new Date('2024-05-20').toISOString(),
    },
    {
      id: 'qp-eng-2024',
      university_id: 'univ-lu',
      course_id: 'course-ba-lu',
      year_id: 'yr-ba-1',
      semester_id: 'sem-ba-1',
      paper_year: 2024,
      exam_year: 2024,
      subject_id: 'sub-eng-1',
      title: 'English Literature: Prose & Drama - 2024 Examination Paper',
      exam_session: 'Semester Examination',
      paper_code: 'LU-BA-ENG1-2024',
      total_marks: 100,
      duration: '3 Hours',
      file_name: 'LU_BA_English_Sem1_2024.pdf',
      file_url: '/api/papers/qp-eng-2024/file',
      file_size: '950 KB',
      is_published: true,
      view_count: 180,
      download_count: 110,
      created_at: new Date('2024-05-22').toISOString(),
    },
  ];

  const settings = {
    site_name: 'Semester (PYQs)',
    tagline: 'Semester Examination Question Paper Archives (PYQs)',
    college_address: 'Academic Examination Center & Digital Repository',
    contact_email: 'examination@semesterpyqs.edu',
    contact_phone: '+91 (0522) 238-9001',
    logo_url: '/assets/logos/logo.jpg',
    favicon_url: '/assets/icons/favicon.jpg',
    hero_title: 'University Question Paper Portal',
    hero_subtitle: 'Select your university to browse courses, years, semesters, paper years, and subjects to download authentic past examination papers.',
    notice_ticker: '📢 2024 & 2025 Semester Examination Question Papers uploaded for all affiliated Universities.',
    about_text: 'Semester (PYQs) is an open academic repository offering instant access to previous year question papers across top state universities.',
    seo_title: 'Semester (PYQs) - University Question Papers',
    seo_description: 'Download authentic semester examination question papers for Lucknow University, Maa Patishwari University and affiliated colleges.',
    ad_banner_header: false,
    ad_banner_sidebar: false,
    ad_banner_paper: false,
  };

  return {
    universities,
    courses,
    years,
    semesters,
    subjects,
    papers,
    settings,
    admin: {
      id: 'owner-admin-1',
      email: 'Ramishkji@gmail.com',
      password_hash: adminHash,
      salt: adminSalt,
      last_login: undefined,
    },
    sessions: [],
  };
}

export class Database {
  private data: any;
  public lastModified: number = Date.now();

  constructor() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.sanitizeData();
      } catch (err) {
        console.error('Error reading database file, creating fresh store:', err);
        this.data = createInitialData();
        this.save();
      }
    } else {
      this.data = createInitialData();
      this.save();
    }
  }

  private sanitizeData() {
    if (!this.data) return;
    let changed = false;

    // Ensure array keys exist
    if (!Array.isArray(this.data.universities)) {
      this.data.universities = createInitialData().universities;
      changed = true;
    }
    if (!Array.isArray(this.data.courses)) {
      this.data.courses = [];
      changed = true;
    }
    if (!Array.isArray(this.data.years)) {
      this.data.years = [];
      changed = true;
    }
    if (!Array.isArray(this.data.semesters)) {
      this.data.semesters = [];
      changed = true;
    }
    if (!Array.isArray(this.data.subjects)) {
      this.data.subjects = [];
      changed = true;
    }
    if (!Array.isArray(this.data.papers)) {
      this.data.papers = [];
      changed = true;
    }

    // Ensure courses have university_id
    this.data.courses.forEach((c: any) => {
      if (!c.university_id) {
        c.university_id = 'univ-lu';
        changed = true;
      }
    });

    // Ensure years have university_id
    this.data.years.forEach((y: any) => {
      if (!y.university_id) {
        const parentCourse = this.data.courses.find((c: any) => c.id === y.course_id);
        y.university_id = parentCourse?.university_id || 'univ-lu';
        changed = true;
      }
    });

    // Ensure semesters exist for years
    if (this.data.semesters.length === 0 && this.data.years.length > 0) {
      this.data.semesters = createInitialData().semesters;
      changed = true;
    }

    if (changed) {
      this.save();
    }
  }

  public save() {
    this.lastModified = Date.now();
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // ==================== SETTINGS & ADMIN ====================
  public getSettings() {
    return { ...this.data.settings };
  }

  public updateSettings(updates: any) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.getSettings();
  }

  public verifyAdminPassword(password: string) {
    const computedHash = hashPassword(password, this.data.admin.salt);
    return { success: computedHash === this.data.admin.password_hash };
  }

  public createAdminSession(token: string) {
    const expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.data.sessions = this.data.sessions.filter((s: any) => s.expires_at > Date.now());
    this.data.sessions.push({ token, expires_at });
    this.data.admin.last_login = new Date().toISOString();
    this.save();
  }

  public validateSession(token: string) {
    if (!token) return false;
    const session = this.data.sessions.find((s: any) => s.token === token && s.expires_at > Date.now());
    return !!session;
  }

  public invalidateSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s: any) => s.token !== token);
    this.save();
  }

  public setAdminPassword(newPassword: string) {
    if (newPassword && newPassword.length >= 8) {
      const newSalt = crypto.randomBytes(16).toString('hex');
      this.data.admin.salt = newSalt;
      this.data.admin.password_hash = hashPassword(newPassword, newSalt);
      this.save();
      return true;
    }
    return false;
  }

  public getDashboardStats() {
    const total_downloads = this.data.papers.reduce((sum: number, p: any) => sum + (p.download_count || 0), 0);
    const total_views = this.data.papers.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0);
    return {
      total_universities: this.data.universities.length,
      total_courses: this.data.courses.length,
      total_years: this.data.years.length,
      total_semesters: this.data.semesters.length,
      total_subjects: this.data.subjects.length,
      total_papers: this.data.papers.length,
      total_downloads,
      total_views,
    };
  }

  // ==================== UNIVERSITIES ====================
  public getUniversities(includeInactive = false) {
    let list = [...this.data.universities];
    if (!includeInactive) {
      list = list.filter((u: any) => u.is_active !== false);
    }
    list.sort((a, b) => a.display_order - b.display_order);

    return list.map((u: any) => {
      const uCourses = this.data.courses.filter((c: any) => c.university_id === u.id);
      const uPapers = this.data.papers.filter((p: any) => p.university_id === u.id);
      return {
        ...u,
        courses_count: uCourses.length,
        papers_count: uPapers.length,
      };
    });
  }

  public getUniversityById(id: string) {
    const u = this.data.universities.find((item: any) => item.id === id);
    if (!u) return undefined;
    const uCourses = this.data.courses.filter((c: any) => c.university_id === u.id);
    const uPapers = this.data.papers.filter((p: any) => p.university_id === u.id);
    return {
      ...u,
      courses_count: uCourses.length,
      papers_count: uPapers.length,
    };
  }

  public createUniversity(univ: any) {
    const id = 'univ-' + crypto.randomUUID().slice(0, 8);
    const newUniv = {
      id,
      name: univ.name,
      code: univ.code || univ.name.split(' ').map((w: string) => w[0]).join('').toUpperCase(),
      logo_url: univ.logo_url || '/assets/logos/logo.jpg',
      description: univ.description || '',
      is_active: univ.is_active !== false,
      display_order: Number(univ.display_order) || this.data.universities.length + 1,
      created_at: new Date().toISOString(),
    };
    this.data.universities.push(newUniv);
    this.save();
    return this.getUniversityById(id);
  }

  public updateUniversity(id: string, updates: any) {
    const index = this.data.universities.findIndex((u: any) => u.id === id);
    if (index === -1) return null;
    this.data.universities[index] = { ...this.data.universities[index], ...updates };
    this.save();
    return this.getUniversityById(id);
  }

  public deleteUniversity(id: string) {
    const index = this.data.universities.findIndex((u: any) => u.id === id);
    if (index === -1) return false;
    this.data.universities.splice(index, 1);
    
    // Cascade deletion
    this.data.courses = this.data.courses.filter((c: any) => c.university_id !== id);
    this.data.years = this.data.years.filter((y: any) => y.university_id !== id);
    this.data.semesters = this.data.semesters.filter((s: any) => s.university_id !== id);
    this.data.subjects = this.data.subjects.filter((s: any) => s.university_id !== id);
    this.data.papers = this.data.papers.filter((p: any) => p.university_id !== id);

    this.save();
    return true;
  }

  // ==================== COURSES ====================
  public getCourses(universityId?: string, includeUnpublished = false) {
    let list = [...this.data.courses];
    if (universityId) {
      list = list.filter((c: any) => c.university_id === universityId);
    }
    if (!includeUnpublished) {
      list = list.filter((c: any) => c.is_published !== false);
    }
    list.sort((a, b) => a.display_order - b.display_order);

    return list.map((c: any) => {
      const u = this.data.universities.find((item: any) => item.id === c.university_id);
      const cYears = this.data.years.filter((y: any) => y.course_id === c.id);
      const cPapers = this.data.papers.filter((p: any) => p.course_id === c.id);
      return {
        ...c,
        university_name: u?.name,
        years_count: cYears.length,
        papers_count: cPapers.length,
      };
    });
  }

  public getCourseById(id: string) {
    const c = this.data.courses.find((item: any) => item.id === id);
    if (!c) return undefined;
    const u = this.data.universities.find((item: any) => item.id === c.university_id);
    const cYears = this.data.years.filter((y: any) => y.course_id === c.id);
    const cPapers = this.data.papers.filter((p: any) => p.course_id === c.id);
    return {
      ...c,
      university_name: u?.name,
      years_count: cYears.length,
      papers_count: cPapers.length,
    };
  }

  public createCourse(course: any) {
    const id = 'course-' + crypto.randomUUID().slice(0, 8);
    const newCourse = {
      id,
      university_id: course.university_id,
      name: course.name,
      code: course.code || course.name,
      slug: course.slug || id,
      description: course.description || '',
      display_order: Number(course.display_order) || this.data.courses.length + 1,
      is_published: course.is_published !== false,
      created_at: new Date().toISOString(),
    };
    this.data.courses.push(newCourse);
    this.save();
    return this.getCourseById(id);
  }

  public updateCourse(id: string, updates: any) {
    const index = this.data.courses.findIndex((c: any) => c.id === id);
    if (index === -1) return null;
    this.data.courses[index] = { ...this.data.courses[index], ...updates };
    this.save();
    return this.getCourseById(id);
  }

  public deleteCourse(id: string) {
    const index = this.data.courses.findIndex((c: any) => c.id === id);
    if (index === -1) return false;
    this.data.courses.splice(index, 1);
    
    // Cascade
    this.data.years = this.data.years.filter((y: any) => y.course_id !== id);
    this.data.semesters = this.data.semesters.filter((s: any) => s.course_id !== id);
    this.data.subjects = this.data.subjects.filter((s: any) => s.course_id !== id);
    this.data.papers = this.data.papers.filter((p: any) => p.course_id !== id);

    this.save();
    return true;
  }

  // ==================== YEARS ====================
  public getYears(params?: { universityId?: string; courseId?: string }, includeUnpublished = false) {
    let list = [...this.data.years];
    if (params?.universityId) {
      list = list.filter((y: any) => y.university_id === params.universityId);
    }
    if (params?.courseId) {
      list = list.filter((y: any) => y.course_id === params.courseId);
    }
    if (!includeUnpublished) {
      list = list.filter((y: any) => y.is_published !== false);
    }
    list.sort((a, b) => a.display_order - b.display_order);

    return list.map((y: any) => {
      const u = this.data.universities.find((item: any) => item.id === y.university_id);
      const c = this.data.courses.find((item: any) => item.id === y.course_id);
      const s = this.data.semesters.filter((sem: any) => sem.year_id === y.id);
      const p = this.data.papers.filter((paper: any) => paper.year_id === y.id);
      return {
        ...y,
        university_name: u?.name,
        course_name: c?.name,
        course_code: c?.code,
        semesters_count: s.length,
        papers_count: p.length,
      };
    });
  }

  public getYearById(id: string) {
    const y = this.data.years.find((item: any) => item.id === id);
    if (!y) return undefined;
    const u = this.data.universities.find((item: any) => item.id === y.university_id);
    const c = this.data.courses.find((item: any) => item.id === y.course_id);
    const s = this.data.semesters.filter((sem: any) => sem.year_id === y.id);
    const p = this.data.papers.filter((paper: any) => paper.year_id === y.id);
    return {
      ...y,
      university_name: u?.name,
      course_name: c?.name,
      course_code: c?.code,
      semesters_count: s.length,
      papers_count: p.length,
    };
  }

  public createYear(year: any) {
    const id = 'yr-' + crypto.randomUUID().slice(0, 8);
    const parentCourse = this.data.courses.find((c: any) => c.id === year.course_id);
    const newYear = {
      id,
      university_id: year.university_id || parentCourse?.university_id,
      course_id: year.course_id,
      name: year.name,
      year_number: Number(year.year_number) || 1,
      slug: year.slug || `year-${year.year_number || 1}`,
      display_order: Number(year.display_order) || this.data.years.filter((y: any) => y.course_id === year.course_id).length + 1,
      is_published: year.is_published !== false,
      created_at: new Date().toISOString(),
    };
    this.data.years.push(newYear);
    this.save();
    return this.getYearById(id);
  }

  public updateYear(id: string, updates: any) {
    const index = this.data.years.findIndex((y: any) => y.id === id);
    if (index === -1) return null;
    this.data.years[index] = { ...this.data.years[index], ...updates };
    this.save();
    return this.getYearById(id);
  }

  public deleteYear(id: string) {
    const index = this.data.years.findIndex((y: any) => y.id === id);
    if (index === -1) return false;
    this.data.years.splice(index, 1);

    this.data.semesters = this.data.semesters.filter((s: any) => s.year_id !== id);
    this.data.subjects = this.data.subjects.filter((s: any) => s.year_id !== id);
    this.data.papers = this.data.papers.filter((p: any) => p.year_id !== id);

    this.save();
    return true;
  }

  // ==================== SEMESTERS ====================
  public getSemesters(params?: { universityId?: string; courseId?: string; yearId?: string }, includeUnpublished = false) {
    let list = [...this.data.semesters];
    if (params?.universityId) {
      list = list.filter((s: any) => s.university_id === params.universityId);
    }
    if (params?.courseId) {
      list = list.filter((s: any) => s.course_id === params.courseId);
    }
    if (params?.yearId) {
      list = list.filter((s: any) => s.year_id === params.yearId);
    }
    if (!includeUnpublished) {
      list = list.filter((s: any) => s.is_published !== false);
    }
    list.sort((a, b) => a.display_order - b.display_order);

    return list.map((s: any) => {
      const u = this.data.universities.find((item: any) => item.id === s.university_id);
      const c = this.data.courses.find((item: any) => item.id === s.course_id);
      const y = this.data.years.find((item: any) => item.id === s.year_id);
      const subs = this.data.subjects.filter((sub: any) => sub.semester_id === s.id);
      const p = this.data.papers.filter((paper: any) => paper.semester_id === s.id);
      return {
        ...s,
        university_name: u?.name,
        course_name: c?.name,
        year_name: y?.name,
        subjects_count: subs.length,
        papers_count: p.length,
      };
    });
  }

  public getSemesterById(id: string) {
    const s = this.data.semesters.find((item: any) => item.id === id);
    if (!s) return undefined;
    const u = this.data.universities.find((item: any) => item.id === s.university_id);
    const c = this.data.courses.find((item: any) => item.id === s.course_id);
    const y = this.data.years.find((item: any) => item.id === s.year_id);
    const subs = this.data.subjects.filter((sub: any) => sub.semester_id === s.id);
    const p = this.data.papers.filter((paper: any) => paper.semester_id === s.id);
    return {
      ...s,
      university_name: u?.name,
      course_name: c?.name,
      year_name: y?.name,
      subjects_count: subs.length,
      papers_count: p.length,
    };
  }

  public createSemester(sem: any) {
    const id = 'sem-' + crypto.randomUUID().slice(0, 8);
    const parentYear = this.data.years.find((y: any) => y.id === sem.year_id);
    const newSem = {
      id,
      university_id: sem.university_id || parentYear?.university_id,
      course_id: sem.course_id || parentYear?.course_id,
      year_id: sem.year_id,
      name: sem.name,
      semester_number: Number(sem.semester_number) || 1,
      display_order: Number(sem.display_order) || this.data.semesters.filter((s: any) => s.year_id === sem.year_id).length + 1,
      is_published: sem.is_published !== false,
      created_at: new Date().toISOString(),
    };
    this.data.semesters.push(newSem);
    this.save();
    return this.getSemesterById(id);
  }

  public updateSemester(id: string, updates: any) {
    const index = this.data.semesters.findIndex((s: any) => s.id === id);
    if (index === -1) return null;
    this.data.semesters[index] = { ...this.data.semesters[index], ...updates };
    this.save();
    return this.getSemesterById(id);
  }

  public deleteSemester(id: string) {
    const index = this.data.semesters.findIndex((s: any) => s.id === id);
    if (index === -1) return false;
    this.data.semesters.splice(index, 1);

    this.data.subjects = this.data.subjects.filter((sub: any) => sub.semester_id !== id);
    this.data.papers = this.data.papers.filter((p: any) => p.semester_id !== id);

    this.save();
    return true;
  }

  // ==================== PAPER YEARS ====================
  // Shows ONLY the paper years that actually have uploaded papers
  public getPaperYears(params: { universityId?: string; courseId?: string; yearId?: string; semesterId?: string }) {
    let list = this.data.papers.filter((p: any) => p.is_published !== false);

    if (params.universityId) list = list.filter((p: any) => p.university_id === params.universityId);
    if (params.courseId) list = list.filter((p: any) => p.course_id === params.courseId);
    if (params.yearId) list = list.filter((p: any) => p.year_id === params.yearId);
    if (params.semesterId) list = list.filter((p: any) => p.semester_id === params.semesterId);

    const yearSet = new Set<number>();
    list.forEach((p: any) => {
      const year = Number(p.paper_year || p.exam_year);
      if (year && !isNaN(year)) yearSet.add(year);
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }

  // ==================== SUBJECTS ====================
  public getSubjects(
    params?: { universityId?: string; courseId?: string; yearId?: string; semesterId?: string; paperYear?: number },
    includeUnpublished = false
  ) {
    let list = [...this.data.subjects];

    if (params?.universityId) list = list.filter((s: any) => s.university_id === params.universityId);
    if (params?.courseId) list = list.filter((s: any) => s.course_id === params.courseId);
    if (params?.yearId) list = list.filter((s: any) => s.year_id === params.yearId);
    if (params?.semesterId) list = list.filter((s: any) => s.semester_id === params.semesterId);

    if (!includeUnpublished) list = list.filter((s: any) => s.is_published !== false);

    // Filter by paperYear if requested (subjects having papers for that year)
    if (params?.paperYear) {
      const paperSubjectIds = new Set(
        this.data.papers
          .filter((p: any) => (p.paper_year === params.paperYear || p.exam_year === params.paperYear) && p.is_published !== false)
          .map((p: any) => p.subject_id)
      );
      list = list.filter((s: any) => paperSubjectIds.has(s.id));
    }

    list.sort((a, b) => a.display_order - b.display_order);

    return list.map((s: any) => {
      const u = this.data.universities.find((item: any) => item.id === s.university_id);
      const c = this.data.courses.find((item: any) => item.id === s.course_id);
      const y = this.data.years.find((item: any) => item.id === s.year_id);
      const sem = this.data.semesters.find((item: any) => item.id === s.semester_id);
      const p = this.data.papers.filter((paper: any) => paper.subject_id === s.id);
      return {
        ...s,
        university_name: u?.name,
        course_name: c?.name,
        year_name: y?.name,
        semester_name: sem?.name,
        papers_count: p.length,
      };
    });
  }

  public getSubjectById(id: string) {
    const s = this.data.subjects.find((item: any) => item.id === id);
    if (!s) return undefined;
    const u = this.data.universities.find((item: any) => item.id === s.university_id);
    const c = this.data.courses.find((item: any) => item.id === s.course_id);
    const y = this.data.years.find((item: any) => item.id === s.year_id);
    const sem = this.data.semesters.find((item: any) => item.id === s.semester_id);
    const p = this.data.papers.filter((paper: any) => paper.subject_id === s.id);
    return {
      ...s,
      university_name: u?.name,
      course_name: c?.name,
      year_name: y?.name,
      semester_name: sem?.name,
      papers_count: p.length,
    };
  }

  public createSubject(subject: any) {
    const id = 'sub-' + crypto.randomUUID().slice(0, 8);
    const parentSem = this.data.semesters.find((s: any) => s.id === subject.semester_id);
    const newSubject = {
      id,
      university_id: subject.university_id || parentSem?.university_id,
      course_id: subject.course_id || parentSem?.course_id,
      year_id: subject.year_id || parentSem?.year_id,
      semester_id: subject.semester_id,
      name: subject.name,
      code: subject.code || subject.name,
      slug: subject.slug || id,
      description: subject.description || '',
      display_order: Number(subject.display_order) || this.data.subjects.filter((s: any) => s.semester_id === subject.semester_id).length + 1,
      is_published: subject.is_published !== false,
      created_at: new Date().toISOString(),
    };
    this.data.subjects.push(newSubject);
    this.save();
    return this.getSubjectById(id);
  }

  public updateSubject(id: string, updates: any) {
    const index = this.data.subjects.findIndex((s: any) => s.id === id);
    if (index === -1) return null;
    this.data.subjects[index] = { ...this.data.subjects[index], ...updates };
    this.save();
    return this.getSubjectById(id);
  }

  public deleteSubject(id: string) {
    const index = this.data.subjects.findIndex((s: any) => s.id === id);
    if (index === -1) return false;
    this.data.subjects.splice(index, 1);

    this.data.papers = this.data.papers.filter((p: any) => p.subject_id !== id);

    this.save();
    return true;
  }

  // ==================== QUESTION PAPERS ====================
  public getQuestionPapers(
    params?: {
      universityId?: string;
      courseId?: string;
      yearId?: string;
      semesterId?: string;
      paperYear?: number;
      subjectId?: string;
    },
    includeUnpublished = false
  ) {
    let list = [...this.data.papers];

    if (params?.universityId) list = list.filter((p: any) => p.university_id === params.universityId);
    if (params?.courseId) list = list.filter((p: any) => p.course_id === params.courseId);
    if (params?.yearId) list = list.filter((p: any) => p.year_id === params.yearId);
    if (params?.semesterId) list = list.filter((p: any) => p.semester_id === params.semesterId);
    if (params?.subjectId) list = list.filter((p: any) => p.subject_id === params.subjectId);
    if (params?.paperYear) {
      list = list.filter((p: any) => p.paper_year === params.paperYear || p.exam_year === params.paperYear);
    }

    if (!includeUnpublished) list = list.filter((p: any) => p.is_published !== false);

    list.sort((a, b) => (b.paper_year || b.exam_year) - (a.paper_year || a.exam_year));

    return list.map((p: any) => {
      const u = this.data.universities.find((item: any) => item.id === p.university_id);
      const c = this.data.courses.find((item: any) => item.id === p.course_id);
      const y = this.data.years.find((item: any) => item.id === p.year_id);
      const sem = this.data.semesters.find((item: any) => item.id === p.semester_id);
      const sub = this.data.subjects.find((item: any) => item.id === p.subject_id);
      return {
        ...p,
        university_name: u?.name,
        course_name: c?.name,
        course_code: c?.code,
        year_name: y?.name,
        semester_name: sem?.name,
        subject_name: sub?.name,
        subject_code: sub?.code,
        paper_year: p.paper_year || p.exam_year,
      };
    });
  }

  public getPaperById(id: string) {
    const p = this.data.papers.find((item: any) => item.id === id);
    if (!p) return undefined;
    const u = this.data.universities.find((item: any) => item.id === p.university_id);
    const c = this.data.courses.find((item: any) => item.id === p.course_id);
    const y = this.data.years.find((item: any) => item.id === p.year_id);
    const sem = this.data.semesters.find((item: any) => item.id === p.semester_id);
    const sub = this.data.subjects.find((item: any) => item.id === p.subject_id);
    return {
      ...p,
      university_name: u?.name,
      course_name: c?.name,
      course_code: c?.code,
      year_name: y?.name,
      semester_name: sem?.name,
      subject_name: sub?.name,
      subject_code: sub?.code,
      paper_year: p.paper_year || p.exam_year,
    };
  }

  public createPaper(paper: any) {
    const id = 'qp-' + crypto.randomUUID().slice(0, 10);
    const examYearNum = Number(paper.paper_year || paper.exam_year) || new Date().getFullYear();

    const parentSub = this.data.subjects.find((s: any) => s.id === paper.subject_id);
    const parentSem = this.data.semesters.find((s: any) => s.id === (paper.semester_id || parentSub?.semester_id));

    const university_id = paper.university_id || parentSub?.university_id || parentSem?.university_id || 'univ-lu';
    const course_id = paper.course_id || parentSub?.course_id || parentSem?.course_id;
    const year_id = paper.year_id || parentSub?.year_id || parentSem?.year_id;
    const semester_id = paper.semester_id || parentSub?.semester_id;

    const newPaper = {
      id,
      university_id,
      course_id,
      year_id,
      semester_id,
      subject_id: paper.subject_id,
      title: paper.title,
      paper_year: examYearNum,
      exam_year: examYearNum,
      exam_session: paper.exam_session || 'Semester Examination',
      paper_code: paper.paper_code || `QP-${examYearNum}`,
      total_marks: Number(paper.total_marks) || 75,
      duration: paper.duration || '3 Hours',
      file_name: paper.file_name || `Paper_${examYearNum}.pdf`,
      file_url: paper.file_url || `/api/papers/${id}/file`,
      file_size: paper.file_size || '1.2 MB',
      is_published: paper.is_published !== false,
      status: paper.is_published !== false ? 'Published' : 'Draft',
      view_count: 0,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.papers.push(newPaper);
    this.save();
    return this.getPaperById(id);
  }

  public updatePaper(id: string, updates: any) {
    const index = this.data.papers.findIndex((p: any) => p.id === id);
    if (index === -1) return null;
    this.data.papers[index] = {
      ...this.data.papers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.getPaperById(id);
  }

  public deletePaper(id: string) {
    const index = this.data.papers.findIndex((p: any) => p.id === id);
    if (index === -1) return false;
    const paper = this.data.papers[index];
    if (paper.file_name && fs.existsSync(path.join(PAPERS_UPLOAD_DIR, paper.file_name))) {
      try {
        fs.unlinkSync(path.join(PAPERS_UPLOAD_DIR, paper.file_name));
      } catch (err) {
        console.error('Error removing uploaded file:', err);
      }
    }
    this.data.papers.splice(index, 1);
    this.save();
    return true;
  }

  public incrementPaperView(id: string) {
    const paper = this.data.papers.find((p: any) => p.id === id);
    if (paper) {
      paper.view_count = (paper.view_count || 0) + 1;
      this.save();
    }
  }

  public incrementPaperDownload(id: string) {
    const paper = this.data.papers.find((p: any) => p.id === id);
    if (paper) {
      paper.download_count = (paper.download_count || 0) + 1;
      this.save();
    }
  }

  public search(query: string, includeUnpublished = false) {
    const rawQ = (query || '').trim();
    if (!rawQ) {
      return { universities: [], courses: [], subjects: [], papers: [] };
    }

    // Helper: normalize string (lowercase, remove punctuation, collapse whitespace)
    const normalize = (str: string) => {
      return (str || '')
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Helper: compact string (alphanumerics only e.g. "B.Sc." -> "bsc", "b sc" -> "bsc")
    const compact = (str: string) => {
      return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const qNormalized = normalize(rawQ);
    const qCompact = compact(rawQ);
    const qTokens = qNormalized.split(' ').filter(Boolean);

    // Matching engine: returns true if target matches query either compactly or token-by-token
    const matchesTarget = (fields: (string | number | undefined | null)[]) => {
      const combined = fields.filter((f) => f !== undefined && f !== null).map((f) => String(f)).join(' ');
      const combinedNorm = normalize(combined);
      const combinedCompact = compact(combined);

      // 1. Direct compact match for acronyms and short codes (e.g. "bsc", "ba", "mpu", "lu")
      if (qCompact.length >= 2 && combinedCompact.includes(qCompact)) {
        return true;
      }

      // 2. All tokens match in normalized or compact target
      if (
        qTokens.length > 0 &&
        qTokens.every((tok) => {
          const tokCompact = compact(tok);
          return (
            combinedNorm.includes(tok) ||
            (tokCompact.length >= 2 && combinedCompact.includes(tokCompact))
          );
        })
      ) {
        return true;
      }

      return false;
    };

    const universities = this.getUniversities(includeUnpublished).filter((u: any) =>
      matchesTarget([u.name, u.code, u.short_name, u.slug])
    );

    const courses = this.getCourses(undefined, includeUnpublished).filter((c: any) =>
      matchesTarget([c.name, c.code, c.slug, c.university_name])
    );

    const subjects = this.getSubjects(undefined, includeUnpublished).filter((s: any) =>
      matchesTarget([
        s.name,
        s.code,
        s.slug,
        s.course_name,
        s.university_name,
        s.year_name,
        s.semester_name,
      ])
    );

    const papers = this.getQuestionPapers(undefined, includeUnpublished).filter((p: any) =>
      matchesTarget([
        p.title,
        p.paper_code,
        p.paper_year,
        p.exam_year,
        p.subject_name,
        p.subject_code,
        p.course_name,
        p.course_code,
        p.university_name,
        p.year_name,
        p.semester_name,
      ])
    );

    return { universities, courses, subjects, papers };
  }
}

export const db = new Database();
export { PAPERS_UPLOAD_DIR, LOGOS_UPLOAD_DIR };
