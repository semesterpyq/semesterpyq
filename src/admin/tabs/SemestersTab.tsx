import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, Building2, GraduationCap, Calendar } from 'lucide-react';
import { Course, Semester, University, Year } from '../../types';
import { api } from '../../api';

interface SemestersTabProps {
  onRefresh: () => void;
}

export const SemestersTab: React.FC<SemestersTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSem, setEditingSem] = useState<Semester | null>(null);
  const [name, setName] = useState('');
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Load initial universities, courses, years
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

  // When selected university changes, load courses
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

  // When selected course changes, load years
  useEffect(() => {
    if (!selectedCourseId) {
      setYears([]);
      setSelectedYearId('');
      return;
    }
    const loadYears = async () => {
      try {
        const yList = await api.adminGetYears({ courseId: selectedCourseId, universityId: selectedUnivId });
        setYears(yList || []);
        if (yList && yList.length > 0) {
          setSelectedYearId(yList[0].id);
        } else {
          setSelectedYearId('');
        }
      } catch (err) {
        console.error('Failed to load years:', err);
      }
    };
    loadYears();
  }, [selectedCourseId, selectedUnivId]);

  // Load semesters whenever year changes
  const loadSemesters = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSemesters({
        universityId: selectedUnivId || undefined,
        courseId: selectedCourseId || undefined,
        yearId: selectedYearId || undefined,
      });
      setSemesters(data || []);
    } catch (err) {
      console.error('Failed to load semesters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemesters();
  }, [selectedUnivId, selectedCourseId, selectedYearId]);

  const handleOpenAddModal = () => {
    if (!selectedUnivId || !selectedCourseId || !selectedYearId) {
      alert('Please select a University, Course, and Year first.');
      return;
    }
    setEditingSem(null);
    setName('1st Semester');
    setSemesterNumber(1);
    setModalOpen(true);
  };

  const handleOpenEditModal = (sem: Semester) => {
    setEditingSem(sem);
    setName(sem.name);
    setSemesterNumber(sem.semester_number || 1);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingSem) {
        await api.adminUpdateSemester(editingSem.id, {
          name,
          semester_number: Number(semesterNumber),
        });
      } else {
        await api.adminCreateSemester({
          university_id: selectedUnivId,
          course_id: selectedCourseId,
          year_id: selectedYearId,
          name,
          semester_number: Number(semesterNumber),
        });
      }
      setModalOpen(false);
      loadSemesters();
      onRefresh();
    } catch (err: any) {
      alert(`Error saving semester: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sem: Semester) => {
    if (!confirm(`Are you sure you want to delete "${sem.name}"?\nAll subjects and papers under this semester will also be deleted!`)) return;

    try {
      await api.adminDeleteSemester(sem.id);
      loadSemesters();
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
          <h2 className="text-xl font-bold text-slate-900 font-serif">Semester Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure semesters connected to each year, course, and university.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Semester</span>
        </button>
      </div>

      {/* Select Cascading Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select University</span>
          </label>
          <select
            value={selectedUnivId}
            onChange={(e) => setSelectedUnivId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
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

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select Year</span>
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {years.length === 0 ? (
              <option value="">No years in course</option>
            ) : (
              years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Semester List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs">Loading semesters...</div>
      ) : semesters.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-2xl p-6">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Semesters Configured</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Semester" above to create semesters for this year.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {semesters.map((sem) => (
            <div
              key={sem.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  Sem {sem.semester_number}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-serif">
                    {sem.name}
                  </h3>
                  <p className="text-xs text-slate-500">Semester #{sem.semester_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditModal(sem)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(sem)}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
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
              {editingSem ? 'Edit Semester' : 'Add Semester'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Semester or 2nd Semester"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Number (Numeric)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={semesterNumber}
                  onChange={(e) => setSemesterNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {saving ? 'Saving...' : editingSem ? 'Update Semester' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
