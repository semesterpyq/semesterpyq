import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Building2,
  X,
  Loader2,
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
  const [saving, setSaving] = useState(false);

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
    setUnivId(universities[0]?.id || '');
    setName('');
    setCode('');
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setUnivId(c.university_id || universities[0]?.id || '');
    setName(c.name);
    setCode(c.code);
    setDescription(c.description || '');
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
      } else {
        await api.adminCreateCourse({
          university_id: univId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        });
      }
      setModalOpen(false);
      loadData();
      onRefresh();
    } catch (err: any) {
      alert(`Error saving course: ${err.message}`);
    } finally {
      setSaving(false);
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
            Add, edit, or delete courses for each university (e.g. B.A, B.Sc, B.Com, BBA, BCA, LLB).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>

      {/* University Filter */}
      <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-xs font-bold text-slate-700 shrink-0">Filter by University:</span>
        <select
          value={selectedUnivId}
          onChange={(e) => setSelectedUnivId(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-xs">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl p-6">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Courses Found</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add Course" above to create a course for your university.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-100/80 px-2.5 py-0.5 rounded-md">
                    {c.code}
                  </span>
                  {c.university_name && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[150px]">
                      {c.university_name}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 font-serif leading-snug">
                  {c.name}
                </h3>

                {c.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-200/60">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Course summary or details..."
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
                  {saving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
