import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  University,
  Course,
  Year,
  Semester,
  Subject,
  QuestionPaper,
  SiteSettings,
  DashboardStats,
} from '../types';
import {
  fallbackSettings,
  fallbackUniversities,
  fallbackCourses,
  fallbackYears,
  fallbackSemesters,
  fallbackSubjects,
  fallbackPapers,
} from '../data/static-fallback';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isInitialized = false;

export async function initFirestoreDatabase() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // Check if settings exists
    const settingsRef = doc(db, 'settings', 'config');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, fallbackSettings);
    }

    const initMarkerRef = doc(db, 'settings', 'seed_marker_v2');
    const initMarkerSnap = await getDoc(initMarkerRef);

    if (!initMarkerSnap.exists()) {
      console.log('Seeding initial data to Firestore (v2)...');
      // Purge any old MPU documents if present
      try {
        await deleteDoc(doc(db, 'universities', 'univ-mpu'));
        await deleteDoc(doc(db, 'courses', 'course-ba-mpu'));
        await deleteDoc(doc(db, 'courses', 'course-bsc-mpu'));
        await deleteDoc(doc(db, 'years', 'yr-bsc-mpu-1'));
        await deleteDoc(doc(db, 'years', 'yr-bsc-mpu-2'));
        await deleteDoc(doc(db, 'semesters', 'sem-mpu-bsc-1'));
        await deleteDoc(doc(db, 'semesters', 'sem-mpu-bsc-2'));
        await deleteDoc(doc(db, 'subjects', 'sub-mpu-math-1'));
      } catch (cleanErr) {
        console.warn('Old document cleanup notice:', cleanErr);
      }

      // Seed Lucknow University and clean initial records
      for (const u of fallbackUniversities) {
        await setDoc(doc(db, 'universities', u.id), u);
      }
      for (const c of fallbackCourses) {
        await setDoc(doc(db, 'courses', c.id), c);
      }
      for (const y of fallbackYears) {
        await setDoc(doc(db, 'years', y.id), y);
      }
      for (const s of fallbackSemesters) {
        await setDoc(doc(db, 'semesters', s.id), s);
      }
      for (const sub of fallbackSubjects) {
        await setDoc(doc(db, 'subjects', sub.id), sub);
      }
      for (const p of fallbackPapers) {
        await setDoc(doc(db, 'papers', p.id), p);
      }
      await setDoc(initMarkerRef, { seeded: true, timestamp: Date.now() });
      console.log('Clean database seeded successfully to Firestore!');
    }
  } catch (err) {
    console.warn('Firestore initial seeding skipped or offline:', err);
  }
}

// ==========================================
// FIRESTORE API METHODS
// ==========================================

export const firestoreApi = {
  // SETTINGS
  getSettings: async (): Promise<SiteSettings> => {
    const p = 'settings/config';
    try {
      const snap = await getDoc(doc(db, 'settings', 'config'));
      if (snap.exists()) {
        return snap.data() as SiteSettings;
      }
      return fallbackSettings;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, p);
      return fallbackSettings;
    }
  },

  updateSettings: async (data: Partial<SiteSettings>): Promise<SiteSettings> => {
    const p = 'settings/config';
    try {
      const ref = doc(db, 'settings', 'config');
      await setDoc(ref, data, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as SiteSettings;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { ...fallbackSettings, ...data };
    }
  },

  // UNIVERSITIES
  getUniversities: async (): Promise<University[]> => {
    const p = 'universities';
    try {
      const snap = await getDocs(collection(db, 'universities'));
      const list: University[] = [];
      snap.forEach((d) => list.push(d.data() as University));
      return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
      return fallbackUniversities;
    }
  },

  createUniversity: async (univ: University): Promise<University> => {
    const p = `universities/${univ.id}`;
    try {
      await setDoc(doc(db, 'universities', univ.id), univ);
      return univ;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
      return univ;
    }
  },

  updateUniversity: async (id: string, univ: Partial<University>): Promise<University> => {
    const p = `universities/${id}`;
    try {
      const ref = doc(db, 'universities', id);
      await setDoc(ref, univ, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as University;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { id, name: '', ...univ } as University;
    }
  },

  deleteUniversity: async (id: string): Promise<boolean> => {
    const p = `universities/${id}`;
    try {
      // 1. Delete University doc
      await deleteDoc(doc(db, 'universities', id));

      // 2. Cascade delete related courses, years, semesters, subjects, papers
      try {
        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('university_id', '==', id)));
        for (const d of coursesSnap.docs) {
          await deleteDoc(doc(db, 'courses', d.id));
        }

        const yearsSnap = await getDocs(query(collection(db, 'years'), where('university_id', '==', id)));
        for (const d of yearsSnap.docs) {
          await deleteDoc(doc(db, 'years', d.id));
        }

        const semsSnap = await getDocs(query(collection(db, 'semesters'), where('university_id', '==', id)));
        for (const d of semsSnap.docs) {
          await deleteDoc(doc(db, 'semesters', d.id));
        }

        const subsSnap = await getDocs(query(collection(db, 'subjects'), where('university_id', '==', id)));
        for (const d of subsSnap.docs) {
          await deleteDoc(doc(db, 'subjects', d.id));
        }

        const papersSnap = await getDocs(query(collection(db, 'papers'), where('university_id', '==', id)));
        for (const d of papersSnap.docs) {
          await deleteDoc(doc(db, 'papers', d.id));
        }
      } catch (cascadeErr) {
        console.warn('Cascade deletion notice:', cascadeErr);
      }

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, p);
      return false;
    }
  },

  // COURSES
  getCourses: async (universityId?: string): Promise<Course[]> => {
    const p = 'courses';
    try {
      const snap = await getDocs(collection(db, 'courses'));
      if (snap.empty) {
        return universityId
          ? fallbackCourses.filter((c) => c.university_id === universityId)
          : fallbackCourses;
      }
      let list: Course[] = [];
      snap.forEach((d) => list.push(d.data() as Course));
      if (universityId) {
        list = list.filter((c) => c.university_id === universityId);
      }
      return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
      return universityId
        ? fallbackCourses.filter((c) => c.university_id === universityId)
        : fallbackCourses;
    }
  },

  createCourse: async (course: Course): Promise<Course> => {
    const p = `courses/${course.id}`;
    try {
      await setDoc(doc(db, 'courses', course.id), course);
      return course;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
      return course;
    }
  },

  updateCourse: async (id: string, course: Partial<Course>): Promise<Course> => {
    const p = `courses/${id}`;
    try {
      const ref = doc(db, 'courses', id);
      await setDoc(ref, course, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as Course;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { id, name: '', university_id: '', ...course } as Course;
    }
  },

  deleteCourse: async (id: string): Promise<boolean> => {
    const p = `courses/${id}`;
    try {
      await deleteDoc(doc(db, 'courses', id));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, p);
      return false;
    }
  },

  // YEARS
  getYears: async (params?: { universityId?: string; courseId?: string }): Promise<Year[]> => {
    const p = 'years';
    try {
      const snap = await getDocs(collection(db, 'years'));
      if (snap.empty) {
        return fallbackYears.filter((y) => {
          if (params?.universityId && y.university_id !== params.universityId) return false;
          if (params?.courseId && y.course_id !== params.courseId) return false;
          return true;
        });
      }
      let list: Year[] = [];
      snap.forEach((d) => list.push(d.data() as Year));
      if (params?.universityId) list = list.filter((y) => y.university_id === params.universityId);
      if (params?.courseId) list = list.filter((y) => y.course_id === params.courseId);
      return list.sort((a, b) => a.year_number - b.year_number);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
      return fallbackYears;
    }
  },

  createYear: async (year: Year): Promise<Year> => {
    const p = `years/${year.id}`;
    try {
      await setDoc(doc(db, 'years', year.id), year);
      return year;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
      return year;
    }
  },

  updateYear: async (id: string, year: Partial<Year>): Promise<Year> => {
    const p = `years/${id}`;
    try {
      const ref = doc(db, 'years', id);
      await setDoc(ref, year, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as Year;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { id, name: '', ...year } as Year;
    }
  },

  deleteYear: async (id: string): Promise<boolean> => {
    const p = `years/${id}`;
    try {
      await deleteDoc(doc(db, 'years', id));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, p);
      return false;
    }
  },

  // SEMESTERS
  getSemesters: async (params?: { universityId?: string; courseId?: string; yearId?: string }): Promise<Semester[]> => {
    const p = 'semesters';
    try {
      const snap = await getDocs(collection(db, 'semesters'));
      if (snap.empty) {
        return fallbackSemesters.filter((s) => {
          if (params?.universityId && s.university_id !== params.universityId) return false;
          if (params?.courseId && s.course_id !== params.courseId) return false;
          if (params?.yearId && s.year_id !== params.yearId) return false;
          return true;
        });
      }
      let list: Semester[] = [];
      snap.forEach((d) => list.push(d.data() as Semester));
      if (params?.universityId) list = list.filter((s) => s.university_id === params.universityId);
      if (params?.courseId) list = list.filter((s) => s.course_id === params.courseId);
      if (params?.yearId) list = list.filter((s) => s.year_id === params.yearId);
      return list.sort((a, b) => a.semester_number - b.semester_number);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
      return fallbackSemesters;
    }
  },

  createSemester: async (semester: Semester): Promise<Semester> => {
    const p = `semesters/${semester.id}`;
    try {
      await setDoc(doc(db, 'semesters', semester.id), semester);
      return semester;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
      return semester;
    }
  },

  updateSemester: async (id: string, semester: Partial<Semester>): Promise<Semester> => {
    const p = `semesters/${id}`;
    try {
      const ref = doc(db, 'semesters', id);
      await setDoc(ref, semester, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as Semester;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { id, name: '', ...semester } as Semester;
    }
  },

  deleteSemester: async (id: string): Promise<boolean> => {
    const p = `semesters/${id}`;
    try {
      await deleteDoc(doc(db, 'semesters', id));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, p);
      return false;
    }
  },

  // SUBJECTS
  getSubjects: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
    paperYear?: number;
  }): Promise<Subject[]> => {
    const p = 'subjects';
    try {
      const snap = await getDocs(collection(db, 'subjects'));
      if (snap.empty) {
        return fallbackSubjects.filter((s) => {
          if (params?.universityId && s.university_id !== params.universityId) return false;
          if (params?.courseId && s.course_id !== params.courseId) return false;
          if (params?.yearId && s.year_id !== params.yearId) return false;
          if (params?.semesterId && s.semester_id !== params.semesterId) return false;
          return true;
        });
      }
      let list: Subject[] = [];
      snap.forEach((d) => list.push(d.data() as Subject));
      if (params?.universityId) list = list.filter((s) => s.university_id === params.universityId);
      if (params?.courseId) list = list.filter((s) => s.course_id === params.courseId);
      if (params?.yearId) list = list.filter((s) => s.year_id === params.yearId);
      if (params?.semesterId) list = list.filter((s) => s.semester_id === params.semesterId);
      return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
      return fallbackSubjects;
    }
  },

  createSubject: async (subject: Subject): Promise<Subject> => {
    const p = `subjects/${subject.id}`;
    try {
      await setDoc(doc(db, 'subjects', subject.id), subject);
      return subject;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
      return subject;
    }
  },

  updateSubject: async (id: string, subject: Partial<Subject>): Promise<Subject> => {
    const p = `subjects/${id}`;
    try {
      const ref = doc(db, 'subjects', id);
      await setDoc(ref, subject, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as Subject;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { id, name: '', ...subject } as Subject;
    }
  },

  deleteSubject: async (id: string): Promise<boolean> => {
    const p = `subjects/${id}`;
    try {
      await deleteDoc(doc(db, 'subjects', id));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, p);
      return false;
    }
  },

  // PAPERS
  getPapers: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
    subjectId?: string;
    paperYear?: number;
  }): Promise<QuestionPaper[]> => {
    const p = 'papers';
    try {
      const snap = await getDocs(collection(db, 'papers'));
      if (snap.empty) {
        return fallbackPapers.filter((paper) => {
          if (params?.universityId && paper.university_id !== params.universityId) return false;
          if (params?.courseId && paper.course_id !== params.courseId) return false;
          if (params?.yearId && paper.year_id !== params.yearId) return false;
          if (params?.semesterId && paper.semester_id !== params.semesterId) return false;
          if (params?.subjectId && paper.subject_id !== params.subjectId) return false;
          if (params?.paperYear && (paper.paper_year || paper.exam_year) !== params.paperYear) return false;
          return true;
        });
      }
      let list: QuestionPaper[] = [];
      snap.forEach((d) => list.push(d.data() as QuestionPaper));
      if (params?.universityId) list = list.filter((paper) => paper.university_id === params.universityId);
      if (params?.courseId) list = list.filter((paper) => paper.course_id === params.courseId);
      if (params?.yearId) list = list.filter((paper) => paper.year_id === params.yearId);
      if (params?.semesterId) list = list.filter((paper) => paper.semester_id === params.semesterId);
      if (params?.subjectId) list = list.filter((paper) => paper.subject_id === params.subjectId);
      if (params?.paperYear) list = list.filter((paper) => (paper.paper_year || paper.exam_year) === params.paperYear);
      return list.sort((a, b) => (b.paper_year || b.exam_year || 0) - (a.paper_year || a.exam_year || 0));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
      return fallbackPapers;
    }
  },

  createPaper: async (paper: QuestionPaper): Promise<QuestionPaper> => {
    const p = `papers/${paper.id}`;
    try {
      await setDoc(doc(db, 'papers', paper.id), paper);
      return paper;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
      return paper;
    }
  },

  updatePaper: async (id: string, paper: Partial<QuestionPaper>): Promise<QuestionPaper> => {
    const p = `papers/${id}`;
    try {
      const ref = doc(db, 'papers', id);
      await setDoc(ref, paper, { merge: true });
      const snap = await getDoc(ref);
      return snap.data() as QuestionPaper;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, p);
      return { id, title: '', ...paper } as QuestionPaper;
    }
  },

  deletePaper: async (id: string): Promise<boolean> => {
    const p = `papers/${id}`;
    try {
      await deleteDoc(doc(db, 'papers', id));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, p);
      return false;
    }
  },

  getStats: async (): Promise<DashboardStats> => {
    try {
      const univs = await firestoreApi.getUniversities();
      const courses = await firestoreApi.getCourses();
      const subjects = await firestoreApi.getSubjects();
      const papers = await firestoreApi.getPapers();
      const totalDownloads = papers.reduce((acc, p) => acc + (p.download_count || 0), 0);
      const totalViews = papers.reduce((acc, p) => acc + (p.view_count || 0), 0);

      return {
        total_universities: univs.length,
        total_courses: courses.length,
        total_subjects: subjects.length,
        total_papers: papers.length,
        total_downloads: totalDownloads,
        total_views: totalViews,
      };
    } catch {
      return {
        total_universities: 2,
        total_courses: 6,
        total_subjects: 6,
        total_papers: 4,
        total_downloads: 727,
        total_views: 1126,
      };
    }
  },
};
