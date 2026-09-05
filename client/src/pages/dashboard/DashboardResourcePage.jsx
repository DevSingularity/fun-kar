/**
 * DashboardResourcePage — TEMPLATE
 *
 * Copy this file for each domain entity in your PS.
 * Rename "Resource" → your entity (e.g. "Product", "Order", "Player").
 *
 * TODO:
 *  1. Update the API endpoint from '/resources' to your entity
 *  2. Update table columns to match your data model
 *  3. Update the create/edit form fields
 *  4. Rename this file to match your entity
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';
import Table from '../../components/Table.jsx';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Spinner from '../../components/Spinner.jsx';

// TODO: Rename columns to match your data model
const TABLE_COLUMNS = [
  { key: 'title',       label: 'Title' },
  { key: 'status',      label: 'Status' },
  { key: 'createdAt',   label: 'Created' },
];

const EMPTY_FORM = { title: '', description: '' };

export default function DashboardResourcePage() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData]   = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: change '/resources' to your endpoint
      const res = await api.get('/resources');
      setItems(res.data.items || []);
    } catch {
      toast.error('Failed to load items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleOpenCreate = () => { setEditId(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const handleOpenEdit = (item) => { setEditId(item.id); setFormData({ title: item.title, description: item.description || '' }); setModalOpen(true); };
  const handleChange = (e) => setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        // TODO: change '/resources' to your endpoint
        await api.patch(`/resources/${editId}`, formData);
        toast.success('Updated successfully.');
      } else {
        await api.post('/resources', formData);
        toast.success('Created successfully.');
      }
      setModalOpen(false);
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/resources/${id}`);
      toast.success('Deleted.');
      loadItems();
    } catch {
      toast.error('Delete failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* TODO: Replace title/subtitle */}
      <PageHeader title="Resources" subtitle="Manage your resource items.">
        <Button onClick={handleOpenCreate}>+ Add Resource</Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyState title="No items yet" description="Create your first item to get started." action={{ label: '+ Add Resource', onClick: handleOpenCreate }} />
      ) : (
        <Table
          columns={[
            ...TABLE_COLUMNS,
            {
              key: 'actions',
              label: '',
              render: (_, row) => (
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>Delete</Button>
                </div>
              ),
            },
          ]}
          data={items}
        />
      )}

      {/* Create / Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Item' : 'Create Item'}>
        <form onSubmit={handleSave} className="space-y-4">
          {/* TODO: Replace fields to match your domain */}
          <Input label="Title" name="title" value={formData.title} onChange={handleChange} required placeholder="Enter title" />
          <Input label="Description" name="description" value={formData.description} onChange={handleChange} placeholder="Optional description" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={saving}>{editId ? 'Save Changes' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
