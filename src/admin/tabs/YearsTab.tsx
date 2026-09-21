import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { Course, Year } from '../../types';
import { api } from '../../api';

interface YearsTabProps {
  courses: Course[];
  years: Year[];
  onRefresh: () => void;
}

export const YearsTab: React.FC<YearsTabProps> = ({ courses, years, onRefresh }) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [courseId, setCourseId] = useState('');
  const [name, setName] = useState('');
  const [yearNumber, setYearNumber] = useState(1);
  const [slug, setSlug] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isPublished, setIsPublished] = useState(true);

  const openCreateModal = () => {
    setEditingYear(null);
    setCourseId(courses[0]?.id || '');
    setName('1st Year');
    setYearNumber(1);
    setSlug('1st-year');
    setDisplayOrder(years.length + 1);
    setIsPublished(true);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (year: Year) => {
    setEditingYear(year);
    setCourseId(year.course_id);
    setName(year.name);
    setYearNumber(year.year_number);
    setSlug(year.slug);
    setDisplayOrder(year.display_order);
    setIsPublished(year.is_published);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        course_id: courseId,
        name: name.trim(),
        year_number: Number(yearNumber),
        slug: slug.trim() || `year-${yearNumber}`,
        display_order: Number(displayOrder),
        is_published: isPublished,
      };

      if (editingYear) {
        await api.adminUpdateYear(editingYear.id, payload);
      } else {
        await api.adminCreateYear(payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save academic year');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (year: Year) => {
    try {
      await api.adminUpdateYear(year.id, { is_published: !year.is_published });
      onRefresh();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.adminDeleteYear(id);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      alert('Error deleting academic year: ' + err.message);
    }
  };

  const filtered = years.filter((y) => {
    const matchesCourse = selectedCourseFilter === 'all' || y.course_id === selectedCourseFilter;
    const matchesSearch =
      y.name.toLowerCase().includes(search.toLowerCase()) ||
      (y.course_name && y.course_name.toLowerCase().includes(search.toLowerCase())) ||
      (y.course_code && y.course_code.toLowerCase().includes(search.toLowerCase()));
    return matchesCourse && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Academic Years & Semesters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic years (1st Year, 2nd Year, 3rd Year or Semester terms) grouped by degree.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Academic Year</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600">Filter Course:</label>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">All Degree Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search years..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Degree Course</th>
                <th className="p-3.5">Academic Year / Term</th>
                <th className="p-3.5">Order</th>
                <th className="p-3.5">Subjects & Papers</th>
                <th className="p-3.5">Visibility</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((year) => (
                <tr key={year.id} className="hover:bg-slate-50/70">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900">{year.course_code}</span>
                    <p className="text-[11px] text-slate-500">{year.course_name}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800">{year.name}</span>
                    <p className="font-mono text-[10px] text-slate-400">{year.slug}</p>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700">{year.display_order}</td>
                  <td className="p-3.5 text-slate-700">
                    {year.subjects_count || 0} Subjects • {year.papers_count || 0} Papers
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleTogglePublish(year)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        year.is_published
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {year.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{year.is_published ? 'Published' : 'Hidden'}</span>
                    </button>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(year)}
                      className="p-1.5 text-slate-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(year.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Delete Academic Year?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure? Removing this academic year will also delete subjects and question papers under this term.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 font-serif">
              {editingYear ? 'Edit Academic Year' : 'Add New Academic Year'}
            </h3>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Degree Course</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Year / Term Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 1st Year or Semester I"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year Number</label>
                  <input
                    type="number"
                    value={yearNumber}
                    onChange={(e) => setYearNumber(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="1st-year"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    <span className="font-semibold text-slate-700">Published</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-950 rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingYear ? 'Update Year' : 'Save Year'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
