import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Loader2,
  Layers,
} from 'lucide-react';
import { Course, University, Year } from '../../types';
import { api } from '../../api';

interface YearsTabProps {
  onRefresh: () => void;
}

export const YearsTab: React.FC<YearsTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [name, setName] = useState('');
  const [yearNumber, setYearNumber] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const uList = await api.adminGetUniversities();
        setUniversities(uList || []);
        if (uList && uList.length > 0) {
          setSelectedUnivId(uList[0].id);
        }
      } catch (err) {
        console.error('Failed to load universities:', err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    if (!selectedUnivId) {
      setCourses([]);
      setSelectedCourseId('');
      return;
    }
    const loadCourses = async () => {
      try {
        const cList = await api.adminGetCourses(selectedUnivId);
        setCourses(cList || []);
        if (cList && cList.length > 0) {
          setSelectedCourseId(cList[0].id);
        } else {
          setSelectedCourseId('');
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    loadCourses();
  }, [selectedUnivId]);

  const loadYears = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetYears({
        universityId: selectedUnivId || undefined,
        courseId: selectedCourseId || undefined,
      });
      setYears(data || []);
    } catch (err) {
      console.error('Failed to load years:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, [selectedUnivId, selectedCourseId]);

  const handleAutoGenerate = async (numYears: number) => {
    if (!selectedCourseId) {
      alert('Please select a course first.');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.adminAutoGenerateYearsAndSemesters(selectedCourseId, numYears, selectedUnivId);
      setSuccessNotice(`⚡ Automatically generated ${res.years.length} Academic Years & ${res.semesters.length} Semesters for this course!`);
      loadYears();
      onRefresh();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`Auto-generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const openAddModal = () => {
    if (!selectedUnivId || !selectedCourseId) {
      alert('Please select a University and Course first.');
      return;
    }
    setEditingYear(null);
    setName(`${years.length + 1}${years.length === 0 ? 'st' : years.length === 1 ? 'nd' : years.length === 2 ? 'rd' : 'th'} Year`);
    setYearNumber(years.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (y: Year) => {
    setEditingYear(y);
    setName(y.name);
    setYearNumber(y.year_number || 1);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingYear) {
        await api.adminUpdateYear(editingYear.id, {
          name,
          year_number: Number(yearNumber),
        });
        setSuccessNotice(`Year "${name}" updated!`);
      } else {
        await api.adminCreateYear({
          university_id: selectedUnivId,
          course_id: selectedCourseId,
          name,
          year_number: Number(yearNumber),
        });
        setSuccessNotice(`Year "${name}" created!`);
      }
      setModalOpen(false);
      loadYears();
      onRefresh();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`Error saving year: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (y: Year) => {
    if (!confirm(`Are you sure you want to delete "${y.name}"?\nAll semesters, subjects, and papers under this year will also be deleted!`)) return;

    try {
      await api.adminDeleteYear(y.id);
      loadYears();
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Academic Year Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic years (1st Year, 2nd Year, 3rd Year) or auto-generate complete year & semester structures with 1 click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Year</span>
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Select University</span>
          </label>
          <select
            value={selectedUnivId}
            onChange={(e) => setSelectedUnivId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Select Course</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            disabled={courses.length === 0}
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Auto-generate helper banner */}
      {selectedCourseId && (
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                1-Click Automatic Year & Semester Generator
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-indigo-700">
              Instantly create all Academic Years (1st, 2nd, 3rd...) and all corresponding Semesters (1 to N) for{' '}
              <span className="font-bold">{currentCourse?.name || 'this course'}</span> without manual entry!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              disabled={generating}
              onClick={() => handleAutoGenerate(3)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>⚡ 3 Years (6 Semesters)</span>
            </button>

            <button
              type="button"
              disabled={generating}
              onClick={() => handleAutoGenerate(4)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>4 Years (8 Sem)</span>
            </button>

            <button
              type="button"
              disabled={generating}
              onClick={() => handleAutoGenerate(2)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>2 Years (4 Sem)</span>
            </button>
          </div>
        </div>
      )}

      {/* Year List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-xs">Loading years...</span>
        </div>
      ) : years.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-700">No academic years found for this course</p>
            <p className="text-xs text-slate-400 mt-1">
              Click the "⚡ 3 Years (6 Semesters)" button above to auto-create them instantly!
            </p>
          </div>
          {selectedCourseId && (
            <button
              onClick={() => handleAutoGenerate(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Generate 3 Years & 6 Semesters Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {years.map((y) => (
            <div
              key={y.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {y.year_number || '1'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{y.name}</h4>
                  <p className="text-[11px] text-slate-500">Year #{y.year_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(y)}
                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(y)}
                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              {editingYear ? 'Edit Year' : 'Add Academic Year'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Year, 2nd Year, 3rd Year"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Number (1, 2, 3...) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={yearNumber}
                  onChange={(e) => setYearNumber(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : editingYear ? 'Update Year' : 'Create Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
