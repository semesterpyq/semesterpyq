import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Building2,
  X,
  Loader2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Course, University } from '../../types';
import { api } from '../../api';

interface CoursesTabProps {
  onRefresh: () => void;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUnivId, setSelectedUnivId] = useState<string>('all');

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form fields
  const [univId, setUnivId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [autoGenerateYears, setAutoGenerateYears] = useState(true);
  const [durationYears, setDurationYears] = useState(3);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, cList] = await Promise.all([
        api.adminGetUniversities(),
        api.adminGetCourses(selectedUnivId !== 'all' ? selectedUnivId : undefined),
      ]);
      setUniversities(uList || []);
      setCourses(cList || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUnivId]);

  const openAddModal = () => {
    setEditingCourse(null);
    setUnivId(selectedUnivId !== 'all' ? selectedUnivId : universities[0]?.id || '');
    setName('');
    setCode('');
    setDescription('');
    setAutoGenerateYears(true);
    setDurationYears(3);
    setModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setUnivId(c.university_id || universities[0]?.id || '');
    setName(c.name);
    setCode(c.code);
    setDescription(c.description || '');
    setAutoGenerateYears(false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !univId) {
      alert('University, Course Name, and Course Code are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        await api.adminUpdateCourse(editingCourse.id, {
          university_id: univId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        });
        setSuccessNotice(`Course "${name}" updated successfully!`);
      } else {
        const created = await api.adminCreateCourse({
          university_id: univId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        });

        if (autoGenerateYears && created?.id) {
          await api.adminAutoGenerateYearsAndSemesters(created.id, durationYears, univId);
          setSuccessNotice(`Course "${name}" created with ${durationYears} Academic Years & ${durationYears * 2} Semesters automatically!`);
        } else {
          setSuccessNotice(`Course "${name}" created successfully!`);
        }
      }
      setModalOpen(false);
      loadData();
      onRefresh();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`Error saving course: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickGenerateYears = async (course: Course, yearsCount: number = 3) => {
    setGeneratingId(course.id);
    try {
      await api.adminAutoGenerateYearsAndSemesters(course.id, yearsCount, course.university_id);
      setSuccessNotice(`Successfully generated ${yearsCount} Years and ${yearsCount * 2} Semesters for ${course.name}!`);
      loadData();
      onRefresh();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`Auto-generation failed: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDelete = async (c: Course) => {
    if (!confirm(`Are you sure you want to delete course "${c.name}"?\nAll years, semesters, subjects, and papers under this course will also be deleted!`)) {
      return;
    }

    try {
      await api.adminDeleteCourse(c.id);
      loadData();
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Course Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or delete courses for each university. Automatic multi-year & semester generation is built-in.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course (Auto Years)</span>
        </button>
      </div>

      {successNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Filter University:</span>
        </label>
        <select
          value={selectedUnivId}
          onChange={(e) => setSelectedUnivId(e.target.value)}
          className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Universities ({universities.length})</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.code})
            </option>
          ))}
        </select>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-xs">Loading courses...</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No courses found</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Course" to create courses for your universities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 p-4 transition-all hover:shadow-xs flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                    {c.code}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[130px]">
                    {c.university_name || 'University'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {c.name}
                </h3>

                {c.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200/60">
                {/* 1-Click Auto-generate helper */}
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <button
                    type="button"
                    disabled={generatingId === c.id}
                    onClick={() => handleQuickGenerateYears(c, 3)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200/80 transition-colors cursor-pointer"
                    title="Auto-create 1st, 2nd, 3rd Years and 6 Semesters"
                  >
                    {generatingId === c.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                    )}
                    <span>⚡ Auto 3 Yrs (6 Sem)</span>
                  </button>

                  <button
                    type="button"
                    disabled={generatingId === c.id}
                    onClick={() => handleQuickGenerateYears(c, 4)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                    title="Auto-create 4 Years and 8 Semesters"
                  >
                    <span>4 Yrs</span>
                  </button>

                  <button
                    type="button"
                    disabled={generatingId === c.id}
                    onClick={() => handleQuickGenerateYears(c, 2)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                    title="Auto-create 2 Years and 4 Semesters"
                  >
                    <span>2 Yrs</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-1 pt-1">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select University *
                </label>
                <select
                  required
                  value={univId}
                  onChange={(e) => setUnivId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bachelor of Arts (B.A)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.A or B.Sc"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!editingCourse && (
                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoGenerateYears}
                        onChange={(e) => setAutoGenerateYears(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Automatically create Multiple Years & Semesters</span>
                      </span>
                    </label>
                  </div>

                  {autoGenerateYears && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                          Course Duration / Years:
                        </label>
                        <select
                          value={durationYears}
                          onChange={(e) => setDurationYears(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs font-semibold text-indigo-950 bg-white"
                        >
                          <option value={3}>3 Years (6 Semesters) - B.A, B.Sc, B.Com</option>
                          <option value={4}>4 Years (8 Semesters) - B.Tech, B.Pharm</option>
                          <option value={2}>2 Years (4 Semesters) - M.A, M.Sc, M.Com</option>
                          <option value={1}>1 Year (2 Semesters) - Diploma / Certificate</option>
                          <option value={5}>5 Years (10 Semesters) - Law / Architecture</option>
                        </select>
                      </div>
                      <div className="text-[11px] text-indigo-700 flex items-center">
                        ⚡ Will create 1st to {durationYears}th Year and Semesters 1 to {durationYears * 2} automatically.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCourse ? 'Save Changes' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
