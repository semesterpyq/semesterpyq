import database from './data/database.json';
import { Course, Year, Subject, QuestionPaper, SiteSettings } from './types';

export const initialCourses: Course[] = database.courses as Course[];
export const initialYears: Year[] = database.years as Year[];
export const initialSubjects: Subject[] = database.subjects as Subject[];
export const initialPapers: QuestionPaper[] = database.papers as QuestionPaper[];
export const initialSettings: SiteSettings = database.settings as SiteSettings;

