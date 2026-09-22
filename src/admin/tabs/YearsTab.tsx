import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Building2, GraduationCap } from 'lucide-react';
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

  const openAddModal = () => {
    if (!selectedUnivId || !selectedCourseId) {
      alert('Please select a University and Course first.');
      return;
    }
    setEditingYear(null);
    setName('1st Year');
    setYearNumber(1);
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
      } else {
        await api.adminCreateYear({
          university_id: selectedUnivId,
          course_id: selectedCourseId,
          name,
          year_number: Number(yearNumber),
        });
      }
      setModalOpen(false);
      loadYears();
      onRefresh();
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

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Year Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or delete academic years (1st Year, 2nd Year, 3rd Year) for each course.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Year</span>
        </button>
      </div>

      {/* Select Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
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
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select Course</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {courses.length === 0 ? (
              <option value="">No courses in university</option>
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

      {/* Grid */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs">Loading years...</div>
      ) : years.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-2xl p-6">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Years Configured</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add Year" above to create years for this course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {years.map((y) => (
            <div
              key={y.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  Y{y.year_number}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-serif">{y.name}</h3>
                  <p className="text-xs text-slate-500">Year #{y.year_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(y)}
                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(y)}
                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
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
              {editingYear ? 'Edit Year' : 'Add Year'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Year, 2nd Year, or 3rd Year"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Number (Numeric)
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={yearNumber}
                  onChange={(e) => setYearNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
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
