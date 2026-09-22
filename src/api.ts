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
    return await request<{ lastModified: number; papersCount: number }>('/api/sync-status');
  },

  // Settings
  getSettings: async (): Promise<SiteSettings> => {
    try {
      return await request<SiteSettings>('/api/settings');
    } catch {
      return {
        site_name: 'Semester (PYQs)',
        tagline: 'Semester Examination Question Paper Archives (PYQs)',
        college_address: 'Academic Examination Center & Digital Repository',
        contact_email: 'examination@semesterpyqs.edu',
        contact_phone: '+91 (0522) 238-9001',
        logo_url: '/assets/logos/logo.jpg',
        favicon_url: '/assets/icons/favicon.jpg',
        hero_title: 'University Question Paper Portal',
        hero_subtitle: 'Select your university to browse courses, years, semesters, paper years, and subjects.',
        notice_ticker: '📢 2024 & 2025 Question Papers uploaded for all affiliated Universities.',
        about_text: 'Semester (PYQs) is an open academic repository offering instant access to previous year question papers.',
        seo_title: 'Semester (PYQs) - University Question Papers',
        seo_description: 'Download authentic semester examination question papers.',
        ad_banner_header: false,
        ad_banner_paper: false,
      };
    }
  },

  // 1. UNIVERSITIES
  getUniversities: async (): Promise<University[]> => {
    return await request<University[]>('/api/universities');
  },

  getUniversityById: async (id: string): Promise<University> => {
    return await request<University>(`/api/universities/${id}`);
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
    const query = universityId ? `?universityId=${encodeURIComponent(universityId)}` : '';
    return await request<Course[]>(`/api/courses${query}`);
  },

  getCourseById: async (id: string): Promise<Course> => {
    return await request<Course>(`/api/courses/${id}`);
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
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<Year[]>(`/api/years${query}`);
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
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.yearId) searchParams.set('yearId', params.yearId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<Semester[]>(`/api/semesters${query}`);
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
    const searchParams = new URLSearchParams();
    if (params.universityId) searchParams.set('universityId', params.universityId);
    if (params.courseId) searchParams.set('courseId', params.courseId);
    if (params.yearId) searchParams.set('yearId', params.yearId);
    if (params.semesterId) searchParams.set('semesterId', params.semesterId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<number[]>(`/api/paper-years${query}`);
  },

  // 6. SUBJECTS
  getSubjects: async (params?: {
    universityId?: string;
    courseId?: string;
    yearId?: string;
    semesterId?: string;
    paperYear?: number;
  }): Promise<Subject[]> => {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.yearId) searchParams.set('yearId', params.yearId);
    if (params?.semesterId) searchParams.set('semesterId', params.semesterId);
    if (params?.paperYear) searchParams.set('paperYear', params.paperYear.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<Subject[]>(`/api/subjects${query}`);
  },

  getSubjectById: async (id: string): Promise<Subject> => {
    return await request<Subject>(`/api/subjects/${id}`);
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
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', params.universityId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.yearId) searchParams.set('yearId', params.yearId);
    if (params?.semesterId) searchParams.set('semesterId', params.semesterId);
    if (params?.subjectId) searchParams.set('subjectId', params.subjectId);
    if (params?.paperYear) searchParams.set('paperYear', params.paperYear.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await request<QuestionPaper[]>(`/api/papers${query}`);
  },

  getPaperById: async (id: string): Promise<QuestionPaper> => {
    return await request<QuestionPaper>(`/api/papers/${id}`);
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
    return await request<any>(`/api/search?q=${encodeURIComponent(query)}`);
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
