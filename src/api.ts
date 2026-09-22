import {
  University,
  Course,
  Year,
  Semester,
  Subject,
  QuestionPaper,
  SiteSettings,
  DashboardStats,
  AdminUser,
} from './types';
import {
  fallbackSettings,
  fallbackUniversities,
  fallbackCourses,
  fallbackYears,
  fallbackSemesters,
  fallbackSubjects,
  fallbackPapers,
} from './data/static-fallback';

const ADMIN_TOKEN_KEY = 'lbs_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAdminToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // no json response
    }
    throw new Error(errorMsg);
  }

  const result = await res.json();

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    try {
      const now = Date.now().toString();
      localStorage.setItem('lbs_sync_timestamp', now);
      window.dispatchEvent(new CustomEvent('lbs_sync_updated', { detail: { timestamp: now } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('lbs_realtime_sync');
        bc.postMessage({ timestamp: now });
        bc.close();
      }
    } catch {
      // Ignore broadcast/storage exceptions
    }
  }

  return result;
}

export const api = {
  getSyncStatus: async (): Promise<{ lastModified: number; papersCount: number }> => {
    try {
      return await request<{ lastModified: number; papersCount: number }>('/api/sync-status');
    } catch {
      return { lastModified: Date.now(), papersCount: fallbackPapers.length };
    }
  },

  // Settings
  getSettings: async (): Promise<SiteSettings> => {
    try {
      return await request<SiteSettings>('/api/settings');
    } catch {
      return fallbackSettings;
    }
  },

  // 1. UNIVERSITIES
  getUniversities: async (): Promise<University[]> => {
    try {
      const data = await request<University[]>('/api/universities');
      return data && data.length > 0 ? data : fallbackUniversities;
    } catch {
      return fallbackUniversities;
    }
  },

  getUniversityById: async (id: string): Promise<University> => {
    try {
      return await request<University>(`/api/universities/${id}`);
    } catch {
      const found = fallbackUniversities.find((u) => u.id === id);
      if (found) return found;
      throw new Error('University not found');
    }
  },

  adminGetUniversities: async (): Promise<University[]> => {
    return await request<University[]>('/api/admin/universities');
  },

  adminCreateUniversity: async (data: Partial<University>): Promise<University> => {
    return await request<University>('/api/admin/universities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminUpdateUniversity: async (id: string, data: Partial<University>): Promise<University> => {
    return await request<University>(`/api/admin/universities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  adminDeleteUniversity: async (id: string): Promise<{ success: boolean }> => {
    return await request<{ success: boolean }>(`/api/admin/universities/${id}`, {
      method: 'DELETE',
    });
  },

  adminUploadLogo: async (file: File): Promise<{ success: boolean; logo_url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    return await request<{ success: boolean; logo_url: string }>('/api/admin/upload-logo', {
      method: 'POST',
      body: formData,
    });
  },

  // 2. COURSES
  getCourses: async (universityId?: string): Promise<Course[]> => {
    try {
      const query = universityId ? `?universityId=${encodeURIComponent(universityId)}` : '';
      const data = await request<Course[]>(`/api/courses${query}`);
      return data && data.length > 0 ? data : (universityId ? fallbackCourses.filter((c) => c.university_id === universityId) : fallbackCourses);
    } catch {
      return universityId ? fallbackCourses.filter((c) => c.university_id === universityId) : fallbackCourses;
    }
  },

  getCourseById: async (id: string): Promise<Course> => {
    try {
      return await request<Course>(`/api/courses/${id}`);
    } catch {
      const found = fallbackCourses.find((c) => c.id === id);
      if (found) return found;
      throw new Error('Course not found');
    }
  },

  adminGetCourses: async (universityId?: string): Promise<Course[]> => {
    const query = universityId ? `?universityId=${encodeURIComponent(universityId)}` : '';
    return await request<Course[]>(`/api/admin/courses${query}`);
  },

  adminCreateCourse: async (data: Partial<Course>): Promise<Course> => {
    return await request<Course>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminUpdateCourse: async (id: string, data: Partial<Course>): Promise<Course> => {
    return await request<Course>(`/api/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  adminDeleteCourse: async (id: string): Promise<{ success: boolean }> => {
    return await request<{ success: boolean }>(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    });
  },

  // 3. YEARS
  getYears: async (params?: { universityId?: string; courseId?: string }): Promise<Year[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.universityId) searchParams.set('universityId', params.universityId);
      if (params?.courseId) searchParams.set('courseId', params.courseId);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await request<Year[]>(`/api/years${query}`);
      return data && data.length > 0 ? data : fallbackYears.filter((y) => {
        if (params?.universityId && y.university_id !== params.universityId) return false;
        if (params?.courseId && y.course_id !== params.courseId) return false;
        return true;
      });
    } catch {
      return fallbackYears.filter((y) => {
        if (params?.universityId && y.university_id !== params.universityId) return false;
        if (params?.courseId && y.course_id !== params.courseId) return false;
        return true;
      });
    }
  },

  adminGetYears: async (params?: { universityId?: string; courseId?: string }): Promise<Year[]> => {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<Year[]>(`/api/admin/years${query}`);
  },

  adminCreateYear: async (data: Partial<Year>): Promise<Year> => {
    return await request<Year>('/api/admin/years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminUpdateYear: async (id: string, data: Partial<Year>): Promise<Year> => {
    return await request<Year>(`/api/admin/years/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  adminDeleteYear: async (id: string): Promise<{ success: boolean }> => {
    return await request<{ success: boolean }>(`/api/admin/years/${id}`, {
      method: 'DELETE',
    });
  },

  // 4. SEMESTERS
  getSemesters: async (params?: { universityId?: string; courseId?: string; yearId?: string }): Promise<Semester[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.universityId) searchParams.set('universityId', params.universityId);
      if (params?.courseId) searchParams.set('courseId', params.courseId);
      if (params?.yearId) searchParams.set('yearId', params.yearId);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await request<Semester[]>(`/api/semesters${query}`);
      return data && data.length > 0 ? data : fallbackSemesters.filter((s) => {
        if (params?.universityId && s.university_id !== params.universityId) return false;
        if (params?.courseId && s.course_id !== params.courseId) return false;
        if (params?.yearId && s.year_id !== params.yearId) return false;
        return true;
      });
    } catch {
      return fallbackSemesters.filter((s) => {
        if (params?.universityId && s.university_id !== params.universityId) return false;
        if (params?.courseId && s.course_id !== params.courseId) return false;
        if (params?.yearId && s.year_id !== params.yearId) return false;
        return true;
      });
    }
  },

  adminGetSemesters: async (params?: { universityId?: string; courseId?: string; yearId?: string }): Promise<Semester[]> => {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.yearId) searchParams.set('yearId', params.yearId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<Semester[]>(`/api/admin/semesters${query}`);
  },

  adminCreateSemester: async (data: Partial<Semester>): Promise<Semester> => {
    return await request<Semester>('/api/admin/semesters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminUpdateSemester: async (id: string, data: Partial<Semester>): Promise<Semester> => {
    return await request<Semester>(`/api/admin/semesters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  adminDeleteSemester: async (id: string): Promise<{ success: boolean }> => {
    return await request<{ success: boolean }>(`/api/admin/semesters/${id}`, {
      method: 'DELETE',
    });
  },

  // 5. PAPER YEARS (Only shows years with uploaded papers)
  getPaperYears: async (params: { universityId?: string; courseId?: string; yearId?: string; semesterId?: string }): Promise<number[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params.universityId) searchParams.set('universityId', params.universityId);
      if (params.courseId) searchParams.set('courseId', params.courseId);
      if (params.yearId) searchParams.set('yearId', params.yearId);
      if (params.semesterId) searchParams.set('semesterId', params.semesterId);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await request<number[]>(`/api/paper-years${query}`);
      return data && data.length > 0 ? data : [2025, 2024, 2023];
    } catch {
      const filtered = fallbackPapers.filter((p) => {
        if (params.universityId && p.university_id !== params.universityId) return false;
        if (params.courseId && p.course_id !== params.courseId) return false;
        if (params.yearId && p.year_id !== params.yearId) return false;
        if (params.semesterId && p.semester_id !== params.semesterId) return false;
        return true;
      });
      const years = Array.from(new Set(filtered.map((p) => p.paper_year || p.exam_year))).sort((a, b) => b - a);
      return years.length > 0 ? years : [2025, 2024, 2023];
    }
  },

  // 6. SUBJECTS
  getSubjects: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
    paperYear?: number;
  }): Promise<Subject[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.universityId) searchParams.set('universityId', params.universityId);
      if (params?.courseId) searchParams.set('courseId', params.courseId);
      if (params?.yearId) searchParams.set('yearId', params.yearId);
      if (params?.semesterId) searchParams.set('semesterId', params.semesterId);
      if (params?.paperYear) searchParams.set('paperYear', params.paperYear.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await request<Subject[]>(`/api/subjects${query}`);
      return data && data.length > 0 ? data : fallbackSubjects.filter((s) => {
        if (params?.universityId && s.university_id !== params.universityId) return false;
        if (params?.courseId && s.course_id !== params.courseId) return false;
        if (params?.yearId && s.year_id !== params.yearId) return false;
        if (params?.semesterId && s.semester_id !== params.semesterId) return false;
        return true;
      });
    } catch {
      return fallbackSubjects.filter((s) => {
        if (params?.universityId && s.university_id !== params.universityId) return false;
        if (params?.courseId && s.course_id !== params.courseId) return false;
        if (params?.yearId && s.year_id !== params.yearId) return false;
        if (params?.semesterId && s.semester_id !== params.semesterId) return false;
        return true;
      });
    }
  },

  getSubjectById: async (id: string): Promise<Subject> => {
    try {
      return await request<Subject>(`/api/subjects/${id}`);
    } catch {
      const found = fallbackSubjects.find((s) => s.id === id);
      if (found) return found;
      throw new Error('Subject not found');
    }
  },

  adminGetSubjects: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
  }): Promise<Subject[]> => {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.yearId) searchParams.set('yearId', params.yearId);
    if (params?.semesterId) searchParams.set('semesterId', params.semesterId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<Subject[]>(`/api/admin/subjects${query}`);
  },

  adminCreateSubject: async (data: Partial<Subject>): Promise<Subject> => {
    return await request<Subject>('/api/admin/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminUpdateSubject: async (id: string, data: Partial<Subject>): Promise<Subject> => {
    return await request<Subject>(`/api/admin/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  adminDeleteSubject: async (id: string): Promise<{ success: boolean }> => {
    return await request<{ success: boolean }>(`/api/admin/subjects/${id}`, {
      method: 'DELETE',
    });
  },

  // 7. QUESTION PAPERS
  getPapers: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
    subjectId?: string;
    paperYear?: number;
  }): Promise<QuestionPaper[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.universityId) searchParams.set('universityId', params.universityId);
      if (params?.courseId) searchParams.set('courseId', params.courseId);
      if (params?.yearId) searchParams.set('yearId', params.yearId);
      if (params?.semesterId) searchParams.set('semesterId', params.semesterId);
      if (params?.subjectId) searchParams.set('subjectId', params.subjectId);
      if (params?.paperYear) searchParams.set('paperYear', params.paperYear.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await request<QuestionPaper[]>(`/api/papers${query}`);
      return data && data.length > 0 ? data : fallbackPapers.filter((p) => {
        if (params?.universityId && p.university_id !== params.universityId) return false;
        if (params?.courseId && p.course_id !== params.courseId) return false;
        if (params?.yearId && p.year_id !== params.yearId) return false;
        if (params?.semesterId && p.semester_id !== params.semesterId) return false;
        if (params?.subjectId && p.subject_id !== params.subjectId) return false;
        if (params?.paperYear && (p.paper_year || p.exam_year) !== params.paperYear) return false;
        return true;
      });
    } catch {
      return fallbackPapers.filter((p) => {
        if (params?.universityId && p.university_id !== params.universityId) return false;
        if (params?.courseId && p.course_id !== params.courseId) return false;
        if (params?.yearId && p.year_id !== params.yearId) return false;
        if (params?.semesterId && p.semester_id !== params.semesterId) return false;
        if (params?.subjectId && p.subject_id !== params.subjectId) return false;
        if (params?.paperYear && (p.paper_year || p.exam_year) !== params.paperYear) return false;
        return true;
      });
    }
  },

  getPaperById: async (id: string): Promise<QuestionPaper> => {
    try {
      return await request<QuestionPaper>(`/api/papers/${id}`);
    } catch {
      const found = fallbackPapers.find((p) => p.id === id);
      if (found) return found;
      throw new Error('Paper not found');
    }
  },

  adminGetPapers: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
    subjectId?: string;
  }): Promise<QuestionPaper[]> => {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.yearId) searchParams.set('yearId', params.yearId);
    if (params?.semesterId) searchParams.set('semesterId', params.semesterId);
    if (params?.subjectId) searchParams.set('subjectId', params.subjectId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<QuestionPaper[]>(`/api/admin/papers${query}`);
  },

  adminCreatePaperWithFile: async (formData: FormData): Promise<QuestionPaper> => {
    return await request<QuestionPaper>('/api/admin/papers', {
      method: 'POST',
      body: formData,
    });
  },

  adminCreatePaper: async (data: Partial<QuestionPaper>): Promise<QuestionPaper> => {
    return await request<QuestionPaper>('/api/admin/papers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminUpdatePaper: async (id: string, data: Partial<QuestionPaper>): Promise<QuestionPaper> => {
    return await request<QuestionPaper>(`/api/admin/papers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  adminDeletePaper: async (id: string): Promise<{ success: boolean }> => {
    return await request<{ success: boolean }>(`/api/admin/papers/${id}`, {
      method: 'DELETE',
    });
  },

  adminBulkSetPaperStatus: async (paper_ids: string[], status: string) => {
    return await request<{ success: boolean }>('/api/admin/papers/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ paper_ids, status }),
    });
  },

  adminBulkDeletePapers: async (paper_ids: string[]) => {
    return await request<{ success: boolean }>('/api/admin/papers/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ paper_ids }),
    });
  },

  adminUploadPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return await request<{ success: boolean; file_url: string; file_name: string; file_size: string }>('/api/admin/upload-pdf', {
      method: 'POST',
      body: formData,
    });
  },

  // 8. SEARCH & STATS
  search: async (query: string): Promise<any> => {
    try {
      return await request<any>(`/api/search?q=${encodeURIComponent(query)}`);
    } catch {
      const q = query.toLowerCase().trim();
      const matchedUnivs = fallbackUniversities.filter((u) => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q));
      const matchedCourses = fallbackCourses.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
      const matchedSubjects = fallbackSubjects.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
      const matchedPapers = fallbackPapers.filter((p) => p.title.toLowerCase().includes(q) || (p.paper_code && p.paper_code.toLowerCase().includes(q)));
      return {
        universities: matchedUnivs,
        courses: matchedCourses,
        subjects: matchedSubjects,
        papers: matchedPapers,
      };
    }
  },

  adminGetStats: async (): Promise<DashboardStats> => {
    return await request<DashboardStats>('/api/admin/stats');
  },

  adminUpdateSettings: async (settings: Partial<SiteSettings>) => {
    return await request<SiteSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Admin Auth
  adminGetProfile: async (): Promise<AdminUser> => {
    return await request<AdminUser>('/api/admin/profile');
  },

  adminLogout: async () => {
    return await request<{ success: boolean }>('/api/admin/logout', {
      method: 'POST',
    });
  },

  adminChangeCredentials: async (data: any) => {
    return await request<{ success: boolean; admin?: AdminUser }>('/api/admin/change-credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminLoginStep1: async (arg: any) => {
    const email = typeof arg === 'object' && arg?.email ? arg.email : 'Ramishkji@gmail.com';
    const password = typeof arg === 'string' ? arg : arg?.password;
    return await request<any>('/api/admin/login/step1', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  adminVerifyOtp: async (arg1: any, arg2?: string) => {
    const sessionKey = typeof arg1 === 'string' ? arg1 : (arg1?.sessionKey || arg1?.challengeId);
    const otp = typeof arg1 === 'string' ? arg2 : arg1?.otp;
    return await request<any>('/api/admin/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionKey, otp }),
    });
  },

  adminResendOtp: async (arg1: any) => {
    const sessionKey = typeof arg1 === 'string' ? arg1 : (arg1?.sessionKey || arg1?.challengeId);
    return await request<any>('/api/admin/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionKey }),
    });
  },
};

