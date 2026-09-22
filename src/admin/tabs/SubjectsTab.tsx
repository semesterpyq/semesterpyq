import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Building2, GraduationCap, Calendar, Layers } from 'lucide-react';
import { Course, Semester, Subject, University, Year } from '../../types';
import { api } from '../../api';

interface SubjectsTabProps {
  onRefresh: () => void;
}

export const SubjectsTab: React.FC<SubjectsTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Load Universities
  useEffect(() => {
    const loadUniversities = async () => {
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
    loadUniversities();
  }, []);

  // Load Courses for University
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

  // Load Years for Course
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

  // Load Semesters for Year
  useEffect(() => {
    if (!selectedYearId) {
      setSemesters([]);
      setSelectedSemesterId('');
      return;
    }
    const loadSemesters = async () => {
      try {
        const sList = await api.adminGetSemesters({
          universityId: selectedUnivId,
          courseId: selectedCourseId,
          yearId: selectedYearId,
        });
        setSemesters(sList || []);
        if (sList && sList.length > 0) {
          setSelectedSemesterId(sList[0].id);
        } else {
          setSelectedSemesterId('');
        }
      } catch (err) {
        console.error('Failed to load semesters:', err);
      }
    };
    loadSemesters();
  }, [selectedYearId, selectedCourseId, selectedUnivId]);

  // Load Subjects
  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSubjects({
        universityId: selectedUnivId || undefined,
        courseId: selectedCourseId || undefined,
        yearId: selectedYearId || undefined,
        semesterId: selectedSemesterId || undefined,
      });
      setSubjects(data || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [selectedUnivId, selectedCourseId, selectedYearId, selectedSemesterId]);

  const openAddModal = () => {
    if (!selectedUnivId || !selectedCourseId || !selectedYearId || !selectedSemesterId) {
      alert('Please select University, Course, Year, and Semester first.');
      return;
    }
    setEditingSub(null);
    setName('');
    setCode('');
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSub(s);
    setName(s.name);
    setCode(s.code || '');
    setDescription(s.description || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingSub) {
        await api.adminUpdateSubject(editingSub.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        });
      } else {
        await api.adminCreateSubject({
          university_id: selectedUnivId,
          course_id: selectedCourseId,
          year_id: selectedYearId,
          semester_id: selectedSemesterId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        });
      }
      setModalOpen(false);
      loadSubjects();
      onRefresh();
    } catch (err: any) {
      alert(`Error saving subject: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Subject) => {
    if (!confirm(`Are you sure you want to delete "${s.name}"?\nAll question papers under this subject will also be deleted!`)) return;

    try {
      await api.adminDeleteSubject(s.id);
      loadSubjects();
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
          <h2 className="text-xl font-bold text-slate-900 font-serif">Subject Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or delete subjects for each year and semester.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Cascading Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>University</span>
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
            <span>Course</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {courses.length === 0 ? (
              <option value="">No courses</option>
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
            <span>Year</span>
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {years.length === 0 ? (
              <option value="">No years</option>
            ) : (
              years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Semester</span>
          </label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {semesters.length === 0 ? (
              <option value="">No semesters</option>
            ) : (
              semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-2xl p-6">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Subjects Configured</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Subject" above to create subjects for this semester.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-100/80 px-2.5 py-0.5 rounded-md inline-block">
                  {s.code || 'SUB'}
                </span>
                <h3 className="font-bold text-base text-slate-900 font-serif leading-snug">
                  {s.name}
                </h3>
                {s.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-200/60">
                <button
                  onClick={() => openEditModal(s)}
                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s)}
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
              {editingSub ? 'Edit Subject' : 'Add Subject'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Physics, Chemistry, Biology, English, Hindi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. MATH101 or PHY201"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Subject details or syllabus notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  {saving ? 'Saving...' : editingSub ? 'Update Subject' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
