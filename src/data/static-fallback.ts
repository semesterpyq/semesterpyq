import { University, Course, Year, Semester, Subject, QuestionPaper, SiteSettings } from '../types';

export const fallbackSettings: SiteSettings = {
  site_name: 'Semester (PYQs)',
  site_tagline: 'Examination Repository Management Portal',
  college_address: 'Gonda, Uttar Pradesh - 271001',
  contact_email: 'ramishkji@gmail.com',
  contact_phone: '+91 5262 222 123',
  logo_url: '/assets/logos/logo.jpg',
  favicon_url: '/assets/logos/logo.jpg',
  hero_title: 'University & College Previous Year Question Papers',
  hero_subtitle: 'Access authentic semester and annual question papers with verified exam patterns and answer keys across affiliated degree colleges.',
  announcement_notice: 'Examination notice: All question papers for Semester exams are now updated in the repository.',
  about_text: 'Semester (PYQs) is an institutional repository committed to empowering undergraduate and postgraduate students with free, high-quality, verified academic resources and past examination papers.',
  seo_title: 'Semester (PYQs) - University & College Question Papers Repository',
  seo_description: 'Download previous year semester and annual examination question papers for degree colleges.',
  seo_keywords: 'PYQ, Semester Question Papers, Previous Year Papers, Degree College, B.Sc, B.A, B.Com, BCA, Examination Papers',
  ad_banner_header: false,
  ad_banner_sidebar: false,
  ad_banner_paper: false,
};

// All initial collections default to empty arrays so user deletions are 100% respected and never restored.
export const fallbackUniversities: University[] = [];
export const fallbackCourses: Course[] = [];
export const fallbackYears: Year[] = [];
export const fallbackSemesters: Semester[] = [];
export const fallbackSubjects: Subject[] = [];
export const fallbackPapers: QuestionPaper[] = [];
