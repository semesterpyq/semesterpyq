import {
  Course,
  Year,
  Subject,
  QuestionPaper,
  SiteSettings,
  AdminUser,
  DashboardStats,
  SearchResult,
  AdminLoginResponse,
  AdminLoginStep1Response,
  AdminVerifyOtpResponse,
  AdminResendOtpResponse,
} from './types';
import {
  initialCourses,
  initialYears,
  initialSubjects,
  initialPapers,
  initialSettings,
} from './initialData';

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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

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

  return res.json();
}

export const api = {
  // Public with seamless static fallback for GitHub Pages
  getSettings: async (): Promise<SiteSettings> => {
    try {
      return await request<SiteSettings>('/api/settings');
    } catch {
      return initialSettings;
    }
  },

  getStats: async (): Promise<DashboardStats> => {
    try {
      return await request<DashboardStats>('/api/stats');
    } catch {
      return {
        total_courses: initialCourses.length,
        total_years: initialYears.length,
        total_subjects: initialSubjects.length,
        total_papers: initialPapers.length,
        total_downloads: 1250,
        total_views: 3420,
      };
    }
  },

  getCourses: async (): Promise<Course[]> => {
    try {
      const res = await request<Course[]>('/api/courses');
      return res && res.length > 0 ? res : initialCourses;
    } catch {
      return initialCourses;
    }
  },

  getCourse: async (id: string): Promise<Course> => {
    try {
      return await request<Course>(`/api/courses/${encodeURIComponent(id)}`);
    } catch {
      const match = initialCourses.find((c) => c.id === id || c.slug === id);
      if (match) return match;
      throw new Error('Course not found');
    }
  },

  getYears: async (courseId?: string): Promise<Year[]> => {
    try {
      const res = await request<Year[]>(`/api/years${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`);
      return res && res.length > 0 ? res : initialYears.filter((y) => !courseId || y.course_id === courseId);
    } catch {
      return initialYears.filter((y) => !courseId || y.course_id === courseId);
    }
  },

  getYear: async (id: string): Promise<Year> => {
    try {
      return await request<Year>(`/api/years/${encodeURIComponent(id)}`);
    } catch {
      const match = initialYears.find((y) => y.id === id || y.slug === id);
      if (match) return match;
      throw new Error('Year not found');
    }
  },

  getExamYears: async (courseId?: string, yearId?: string): Promise<number[]> => {
    try {
      const params = new URLSearchParams();
      if (courseId) params.append('courseId', courseId);
      if (yearId) params.append('yearId', yearId);
      const query = params.toString();
      const res = await request<number[]>(`/api/exam-years${query ? `?${query}` : ''}`);
      if (res && res.length > 0) return res;
    } catch {
      // fallback below
    }

    const filtered = initialPapers.filter(
      (p) => (!courseId || p.course_id === courseId) && (!yearId || p.year_id === yearId)
    );
    const years = Array.from(new Set(filtered.map((p) => p.exam_year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2026, 2025, 2024, 2023, 2022, 2021];
  },

  getSubjects: async (
    courseIdOrOpts?: string | { course_id?: string; courseId?: string; year_id?: string; yearId?: string },
    yearId?: string
  ): Promise<Subject[]> => {
    let cId: string | undefined;
    let yId: string | undefined;

    if (typeof courseIdOrOpts === 'object' && courseIdOrOpts !== null) {
      cId = courseIdOrOpts.course_id || courseIdOrOpts.courseId;
      yId = courseIdOrOpts.year_id || courseIdOrOpts.yearId;
    } else {
      cId = courseIdOrOpts;
      yId = yearId;
    }

    try {
      const params = new URLSearchParams();
      if (cId) params.append('courseId', cId);
      if (yId) params.append('yearId', yId);
      const query = params.toString();
      const res = await request<Subject[]>(`/api/subjects${query ? `?${query}` : ''}`);
      if (res && res.length > 0) return res;
    } catch {
      // fallback
    }

    return initialSubjects.filter(
      (s) => (!cId || s.course_id === cId) && (!yId || s.year_id === yId)
    );
  },

  getSubject: async (id: string): Promise<Subject> => {
    try {
      return await request<Subject>(`/api/subjects/${encodeURIComponent(id)}`);
    } catch {
      const match = initialSubjects.find((s) => s.id === id || s.slug === id);
      if (match) return match;
      throw new Error('Subject not found');
    }
  },

  getPapers: async (
    courseIdOrOpts?:
      | string
      | { course_id?: string; courseId?: string; year_id?: string; yearId?: string; subject_id?: string; subjectId?: string; exam_year?: number; examYear?: number },
    yearId?: string,
    subjectId?: string,
    examYear?: number
  ): Promise<QuestionPaper[]> => {
    let cId: string | undefined;
    let yId: string | undefined;
    let sId: string | undefined;
    let eYr: number | undefined;

    if (typeof courseIdOrOpts === 'object' && courseIdOrOpts !== null) {
      cId = courseIdOrOpts.course_id || courseIdOrOpts.courseId;
      yId = courseIdOrOpts.year_id || courseIdOrOpts.yearId;
      sId = courseIdOrOpts.subject_id || courseIdOrOpts.subjectId;
      eYr = courseIdOrOpts.exam_year || courseIdOrOpts.examYear;
    } else {
      cId = courseIdOrOpts;
      yId = yearId;
      sId = subjectId;
      eYr = examYear;
    }

    try {
      const params = new URLSearchParams();
      if (cId) params.append('courseId', cId);
      if (yId) params.append('yearId', yId);
      if (sId) params.append('subjectId', sId);
      if (eYr) params.append('examYear', eYr.toString());
      const query = params.toString();
      const res = await request<QuestionPaper[]>(`/api/papers${query ? `?${query}` : ''}`);
      if (res && res.length > 0) return res;
    } catch {
      // fallback
    }

    return initialPapers
      .filter((p) => {
        if (p.is_published === false) return false;
        if (cId && p.course_id !== cId) return false;
        if (yId && p.year_id !== yId) return false;
        if (sId && p.subject_id !== sId) return false;
        if (eYr && p.exam_year !== eYr) return false;
        return true;
      })
      .sort((a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999) || b.exam_year - a.exam_year);
  },

  getPaper: async (id: string): Promise<QuestionPaper> => {
    try {
      return await request<QuestionPaper>(`/api/papers/${encodeURIComponent(id)}`);
    } catch {
      const match = initialPapers.find((p) => p.id === id);
      if (match) return match;
      throw new Error('Paper not found');
    }
  },

  search: async (q: string): Promise<SearchResult> => {
    try {
      return await request<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
    } catch {
      const query = (q || '').trim().toLowerCase();
      if (!query) return { courses: [], years: [], subjects: [], papers: [] };
      return {
        courses: initialCourses.filter((c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)),
        years: initialYears.filter((y) => y.name.toLowerCase().includes(query)),
        subjects: initialSubjects.filter((s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)),
        papers: initialPapers.filter((p) => p.is_published && (p.title.toLowerCase().includes(query) || (p.paper_code && p.paper_code.toLowerCase().includes(query)))),
      };
    }
  },

  // Admin Auth (2-Step Verification)
  adminLogin: (credentials: { email: string; password: string }) =>
    request<AdminLoginStep1Response>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  adminLoginStep1: (credentials: { email: string; password: string }) =>
    request<AdminLoginStep1Response>('/api/admin/login-step1', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  adminVerifyOtp: (data: { challengeId: string; otp: string }) =>
    request<AdminVerifyOtpResponse>('/api/admin/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminResendOtp: (data: { challengeId: string }) =>
    request<AdminResendOtpResponse>('/api/admin/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminMe: () => request<{ admin: AdminUser }>('/api/admin/me'),
  adminGetProfile: async (): Promise<AdminUser> => {
    const res = await request<{ admin: AdminUser }>('/api/admin/me');
    return res.admin;
  },
  adminLogout: () => request<{ success: boolean }>('/api/admin/logout', { method: 'POST' }),
  adminUpdateCredentials: (data: { currentPassword: string; newEmail?: string; newPassword?: string }) =>
    request<{ success: boolean; message: string }>('/api/admin/credentials', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminChangeCredentials: async (data: { email?: string; currentPassword: string; newPassword?: string }) => {
    const res = await request<{ success: boolean; message: string }>('/api/admin/credentials', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newEmail: data.email || 'Ramishkji@gmail.com',
        newPassword: data.newPassword,
      }),
    });
    return {
      success: res.success,
      admin: { id: 'owner-admin-1', email: 'Ramishkji@gmail.com' } as AdminUser,
    };
  },
  adminGetStats: () => request<DashboardStats>('/api/admin/stats'),

  // Admin Settings
  adminGetSettings: () => request<SiteSettings>('/api/admin/settings'),
  adminUpdateSettings: (settings: Partial<SiteSettings>) =>
    request<SiteSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Admin Courses
  adminGetCourses: () => request<Course[]>('/api/admin/courses'),
  adminCreateCourse: (course: Partial<Course>) =>
    request<Course>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    }),
  adminUpdateCourse: (id: string, course: Partial<Course>) =>
    request<Course>(`/api/admin/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    }),
  adminDeleteCourse: (id: string) =>
    request<{ success: boolean }>(`/api/admin/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  adminReorderCourses: (orderedIds: string[]) =>
    request<{ success: boolean }>('/api/admin/courses/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),

  // Admin Years
  adminGetYears: (courseId?: string) =>
    request<Year[]>(`/api/admin/years${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`),
  adminCreateYear: (year: Partial<Year>) =>
    request<Year>('/api/admin/years', {
      method: 'POST',
      body: JSON.stringify(year),
    }),
  adminUpdateYear: (id: string, year: Partial<Year>) =>
    request<Year>(`/api/admin/years/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(year),
    }),
  adminDeleteYear: (id: string) =>
    request<{ success: boolean }>(`/api/admin/years/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  adminReorderYears: (orderedIds: string[]) =>
    request<{ success: boolean }>('/api/admin/years/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),

  // Admin Subjects
  adminGetSubjects: (courseId?: string, yearId?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (yearId) params.append('yearId', yearId);
    const query = params.toString();
    return request<Subject[]>(`/api/admin/subjects${query ? `?${query}` : ''}`);
  },
  adminCreateSubject: (subject: Partial<Subject>) =>
    request<Subject>('/api/admin/subjects', {
      method: 'POST',
      body: JSON.stringify(subject),
    }),
  adminUpdateSubject: (id: string, subject: Partial<Subject>) =>
    request<Subject>(`/api/admin/subjects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(subject),
    }),
  adminDeleteSubject: (id: string) =>
    request<{ success: boolean }>(`/api/admin/subjects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  adminReorderSubjects: (orderedIds: string[]) =>
    request<{ success: boolean }>('/api/admin/subjects/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),

  // Admin Papers
  adminGetPapers: (courseId?: string, yearId?: string, subjectId?: string, examYear?: number) => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (yearId) params.append('yearId', yearId);
    if (subjectId) params.append('subjectId', subjectId);
    if (examYear) params.append('examYear', examYear.toString());
    const query = params.toString();
    return request<QuestionPaper[]>(`/api/admin/papers${query ? `?${query}` : ''}`);
  },
  adminCreatePaper: (paper: Partial<QuestionPaper>) =>
    request<QuestionPaper>('/api/admin/papers', {
      method: 'POST',
      body: JSON.stringify(paper),
    }),
  adminUpdatePaper: (id: string, paper: Partial<QuestionPaper>) =>
    request<QuestionPaper>(`/api/admin/papers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(paper),
    }),
  adminDeletePaper: (id: string) =>
    request<{ success: boolean }>(`/api/admin/papers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  adminBulkDeletePapers: (ids: string[]) =>
    request<{ success: boolean; count: number }>('/api/admin/papers/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  adminBulkSetPaperStatus: (ids: string[], status: 'Published' | 'Draft') =>
    request<{ success: boolean; count: number }>('/api/admin/papers/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  // Admin Upload PDF
  adminUploadPdf: async (file: File): Promise<{ success: boolean; file_name: string; file_url: string; file_size: string }> => {
    const token = getAdminToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload-pdf', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload PDF file');
    }

    return res.json();
  },
};
