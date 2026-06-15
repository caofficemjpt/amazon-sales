import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePeriodContext } from '../context/PeriodContext';
import { usePeriods } from '../hooks/usePeriods';
import { clearRecordsCache } from '../hooks/useRecords';
import { clearFeesCache } from '../hooks/useFees';
import { PageLoader } from '../components/ui/Loader';
import type { Period } from '../types';
import { formatDateTime } from '../utils/format';

export function SettingsPage() {
  const { state, setSelectedPeriod } = usePeriodContext();
  const { periods, loading, refetch } = usePeriods();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (period: Period) => {
    setDeletingId(period.id);
    setDeleteConfirm('');
  };

  const cancelDelete = () => {
    setDeletingId(null);
    setDeleteConfirm('');
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('periods').delete().eq('id', deletingId);
      if (error) throw error;

      // Clear caches
      clearRecordsCache();
      clearFeesCache();

      // If active period is deleted, select null
      if (state.selectedPeriod?.id === deletingId) {
        setSelectedPeriod(null);
      }

      await refetch();
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete period data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'Not Configured';

  return (
    <div className="settings-page fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* DB Connection info */}
      <div className="card">
        <h3 className="section-title">⚙️ Environment Configuration</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p><strong>Connected Supabase Instance URL:</strong></p>
          <code style={{ alignSelf: 'flex-start', wordBreak: 'break-all' }}>{projectUrl}</code>
        </div>
      </div>

      {/* Uploaded periods management */}
      <div className="card">
        <h3 className="section-title">📂 Managed Upload Periods</h3>
        {loading ? (
          <PageLoader />
        ) : periods.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No uploaded periods found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mini-table" style={{ width: '100%' }} aria-label="Periods management">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="text-right">Rows</th>
                  <th>Uploaded At</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td><strong>{period.month} {period.year}</strong></td>
                    <td className="text-right">{period.row_count?.toLocaleString('en-IN') ?? 0}</td>
                    <td>{formatDateTime(period.uploaded_at)}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        onClick={() => handleDeleteClick(period)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {deletingId && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '450px', width: '90%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ color: 'var(--color-danger)', margin: 0 }}>⚠️ Confirm Deletion</h3>
            <p>
              Are you sure you want to delete this period? This action will permanently remove the period and all its consolidated records/fees from Supabase.
            </p>
            <p>Please type <strong>DELETE</strong> below to confirm:</p>
            <input
              type="text"
              className="input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={confirmDelete}
                disabled={isDeleting || deleteConfirm !== 'DELETE'}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
