export interface Course {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  icon?: string;
  display_order: number;
  is_published: boolean;
  is_active?: boolean;
  stream?: string;
  duration?: string;
  total_semesters?: number;
  created_at: string;
  years_count?: number;
  subjects_count?: number;
  papers_count?: number;
  years?: Year[];
}

export interface Year {
  id: string;
  course_id: string;
  name: string;
  year_number: number;
  slug: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  course_name?: string;
  course_code?: string;
  subjects_count?: number;
  papers_count?: number;
}

export interface Subject {
  id: string;
  course_id: string;
  year_id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  stream?: string;
  semester?: string;
  paper_type?: string;
  course_name?: string;
  course_code?: string;
  year_name?: string;
  papers_count?: number;
}

export interface QuestionPaper {
  id: string;
  course_id: string;
  year_id: string;
  subject_id: string;
  title: string;
  exam_year: number;
  exam_session: string; // e.g. "Annual Exam", "Semester Exam", "Supplementary / Back Paper"
  paper_code: string;
  total_marks: number;
  duration: string;
  file_name: string;
  file_url: string;
  file_size: string;
  is_published: boolean;
  display_order?: number;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at?: string;
  // Extended fields for complete Question Paper lifecycle
  stream?: string;
  year_name?: string;
  semester?: string;
  exam_type?: string; // University Exam, Semester Exam, Annual Exam, Entrance Exam, Competitive Exam, Internal Exam, Model Paper, Other
  exam_date?: string;
  paper_type?: string; // Previous Year Paper, Model Paper, Sample Paper, Practice Paper, Important Questions
  language?: string; // Hindi, English, Hindi + English
  description?: string;
  tags?: string[] | string;
  thumbnail_url?: string;
  featured?: boolean;
  free_download?: boolean;
  status?: 'Draft' | 'Published';
  // Denormalized joins for fast display & search
  course_name?: string;
  course_code?: string;
  subject_name?: string;
  subject_code?: string;
}

export interface AdUnitConfig {
  enabled: boolean;
  code?: string;
  placement?: string;
  target?: 'all' | 'mobile' | 'desktop';
  start_date?: string;
  end_date?: string;
}

export interface SiteSettings {
  site_name: string;
  tagline?: string;
  site_tagline?: string;
  college_address?: string;
  address?: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  favicon_url: string;
  hero_title: string;
  hero_subtitle: string;
  notice_ticker?: string;
  announcement_notice?: string;
  about_text: string;
  seo_title: string;
  seo_description: string;
  seo_keywords?: string;
  // Legacy flags
  ad_banner_header: boolean;
  ad_banner_sidebar?: boolean;
  ad_banner_paper: boolean;
  adsense_client?: string;
  // Comprehensive Admin Settings
  max_pdf_size_mb?: number; // default 25
  default_paper_status?: 'Published' | 'Draft';
  enable_downloads?: boolean;
  enable_views?: boolean;
  enable_search?: boolean;
  enable_filters?: boolean;
  appearance_theme?: 'light' | 'dark';
  primary_color?: string;
  site_language?: 'English' | 'Hindi';
  // Advertisements Management
  ad_home_enabled?: boolean;
  ad_home_code?: string;
  ad_home_placement?: string;
  ad_home_target?: 'all' | 'mobile' | 'desktop';
  ad_course_enabled?: boolean;
  ad_course_code?: string;
  ad_course_placement?: string;
  ad_course_target?: 'all' | 'mobile' | 'desktop';
  ad_paper_enabled?: boolean;
  ad_paper_code?: string;
  ad_paper_placement?: string;
  ad_paper_target?: 'all' | 'mobile' | 'desktop';
  ad_download_enabled?: boolean;
  ad_download_code?: string;
  ad_download_placement?: string;
  ad_download_target?: 'all' | 'mobile' | 'desktop';
  ads_start_date?: string;
  ads_end_date?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  last_login?: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  error?: string;
  requiresOtp?: boolean;
}

export interface AdminLoginStep1Response {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  requiresOtp?: boolean;
  challengeId?: string;
  maskedEmail?: string;
  expiresInSeconds?: number;
  resendCooldown?: number;
  sentToEmail?: string;
  error?: string;
}

export interface AdminVerifyOtpResponse {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  error?: string;
}

export interface AdminResendOtpResponse {
  success: boolean;
  message?: string;
  resendCooldown?: number;
  expiresInSeconds?: number;
  error?: string;
}

export interface SearchResult {
  courses: Course[];
  years: Year[];
  subjects: Subject[];
  papers: QuestionPaper[];
}

export interface DashboardStats {
  total_courses: number;
  total_years: number;
  total_subjects: number;
  total_papers: number;
  total_downloads: number;
  total_views: number;
}
