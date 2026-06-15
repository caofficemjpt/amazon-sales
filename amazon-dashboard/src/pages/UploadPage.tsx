import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseSettlementFiles } from '../lib/processing/parseSettlement';
import { parseMTRFile } from '../lib/processing/parseMTR';
import { aggregateSettlement, consolidate } from '../lib/processing/consolidate';
import { enrichRows } from '../lib/processing/enrichment';
import { buildFeeRecords, uploadToSupabase } from '../lib/processing/upload';
import { supabase } from '../lib/supabase';
import { usePeriodContext } from '../context/PeriodContext';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { LogEntry, Period } from '../types';
import {
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  Upload,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  Play,
  Loader2,
} from 'lucide-react';
import './UploadPage.css';

/** Months for the month dropdown */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();

export function UploadPage() {
  const navigate = useNavigate();
  const { dispatch } = usePeriodContext();

  // Form state
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [settlementFiles, setSettlementFiles] = useState<FileList | null>(null);
  const [mtrFile, setMtrFile] = useState<File | null>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [uploadDone, setUploadDone] = useState(false);

  // Period conflict
  const [existingPeriod, setExistingPeriod] = useState<Period | null>(null);
  const [conflictConfirmed, setConflictConfirmed] = useState(false);

  // Drag state
  const [settlementDragging, setSettlementDragging] = useState(false);
  const [mtrDragging, setMtrDragging] = useState(false);

  const settlementInputRef = useRef<HTMLInputElement>(null);
  const mtrInputRef = useRef<HTMLInputElement>(null);
  const logBottomRef = useRef<HTMLDivElement>(null);

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setLogs((prev) => [...prev, { timestamp, message, type }]);
    setTimeout(() => {
      logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  async function checkPeriodConflict(month: string, year: number): Promise<Period | null> {
    const { data } = await supabase
      .from('periods')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    return (data as Period | null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMonth || !selectedYear || !settlementFiles || !mtrFile) {
      addLog('❌ Please fill in all fields before processing.', 'error');
      return;
    }

    const year = parseInt(selectedYear, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      addLog('❌ Please enter a valid year (2000–2100).', 'error');
      return;
    }

    setProcessing(true);
    setLogs([]);
    setUploadDone(false);
    setProgress(0);

    try {
      // Check for conflict
      const conflict = await checkPeriodConflict(selectedMonth, year);
      if (conflict && !conflictConfirmed) {
        setExistingPeriod(conflict);
        setProcessing(false);
        return;
      }

      // Step 1 — Parse settlement files
      addLog(`Loading ${settlementFiles.length} settlement file(s)...`, 'info');
      setProgress(5);
      const { rows: settlementRows, allUnfilteredRows, depositDateMap, warnings } = await parseSettlementFiles(settlementFiles);
      addLog(`  Loaded ${settlementRows.length} settlement rows`, 'info');
      warnings.forEach((w) => addLog(w, 'warning'));

      // Step 2 — Validate headers
      addLog('Validating headers...', 'info');
      setProgress(15);

      // Step 3 — Aggregate settlement data
      addLog('Aggregating settlement data...', 'info');
      setProgress(25);
      const summaryMap = aggregateSettlement(settlementRows, depositDateMap);
      addLog(`  Aggregated ${summaryMap.size} unique orders from settlement`, 'info');

      // Step 4 — Parse MTR CSV
      addLog('Loading MTR CSV...', 'info');
      setProgress(35);
      const mtrRows = await parseMTRFile(mtrFile);
      addLog(`  Loaded ${mtrRows.length} MTR rows`, 'info');

      // Step 5 — Join datasets
      addLog('Joining datasets...', 'info');
      setProgress(45);
      const joinWarnings: string[] = [];
      const rawConsolidated = consolidate(mtrRows, summaryMap, 'placeholder', joinWarnings);
      joinWarnings.forEach((w) => addLog(w, 'warning'));
      addLog(`  Joined ${rawConsolidated.length} records`, 'info');

      // Step 6 — Proportional split (already done in consolidate) + enrichment
      addLog('Splitting charges for multi-invoice orders...', 'info');
      setProgress(55);
      const enriched = enrichRows(rawConsolidated, mtrRows);
      addLog(`  Enriched ${enriched.length} records with payment type & fulfillment channel`, 'info');

      // Build fee records
      const feeRecords = buildFeeRecords(allUnfilteredRows, 'placeholder');
      addLog(`  Built ${feeRecords.length} settlement fee records`, 'info');

      // Step 7 — Upload to database
      addLog('Uploading to database...', 'info');
      setProgress(60);

      const periodId = await uploadToSupabase(
        selectedMonth,
        year,
        enriched,
        feeRecords,
        (_step, pct, log) => {
          setProgress(60 + Math.round(pct * 0.4));
          if (log) addLog(log, 'info');
        }
      );

      addLog(`✅ Done! ${enriched.length} rows uploaded.`, 'success');
      setProgress(100);
      setUploadDone(true);

      // Update context
      const { data: newPeriod } = await supabase
        .from('periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (newPeriod) {
        dispatch({ type: 'ADD_PERIOD', payload: newPeriod as Period });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      addLog(`❌ ${msg}`, 'error');
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  const handleSettlementDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSettlementDragging(false);
    const files = e.dataTransfer.files;
    const txtFiles = Array.from(files).filter((f) => f.name.endsWith('.txt'));
    if (txtFiles.length) {
      const dt = new DataTransfer();
      txtFiles.forEach((f) => dt.items.add(f));
      setSettlementFiles(dt.files);
    }
  }, []);

  const handleMtrDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setMtrDragging(false);
    const files = e.dataTransfer.files;
    const csvFile = Array.from(files).find((f) => f.name.endsWith('.csv'));
    if (csvFile) setMtrFile(csvFile);
  }, []);

  const canProcess = selectedMonth && selectedYear && settlementFiles && mtrFile
    && (!existingPeriod || conflictConfirmed);

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h2 className="upload-title">Upload Settlement Data</h2>
        <p className="upload-subtitle">
          Process Amazon settlement TXT files and Monthly Tax Report (MTR) CSV to upload consolidated data.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="upload-grid">
          {/* Period Selection */}
          <div className="card">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Calendar size={18} style={{ color: 'var(--color-primary-light)' }} />
              Reporting Period
            </h3>
            <div className="upload-form-row">
              <div className="upload-form-field">
                <label htmlFor="month-select" className="label">Month</label>
                <select
                  id="month-select"
                  className="input select"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setExistingPeriod(null);
                    setConflictConfirmed(false);
                  }}
                  required
                >
                  <option value="">Select month...</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="upload-form-field">
                <label htmlFor="year-input" className="label">Year</label>
                <input
                  id="year-input"
                  type="number"
                  className="input"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setExistingPeriod(null);
                    setConflictConfirmed(false);
                  }}
                  min={2000}
                  max={2100}
                  required
                />
              </div>
            </div>

            {existingPeriod && (
              <div className="upload-conflict-warning">
                <div className="conflict-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div>
                  <p className="conflict-title">
                    Data for {existingPeriod.month} {existingPeriod.year} already exists
                  </p>
                  <p className="conflict-desc">
                    {existingPeriod.row_count?.toLocaleString('en-IN')} rows will be overwritten.
                  </p>
                  <label className="conflict-confirm">
                    <input
                      type="checkbox"
                      checked={conflictConfirmed}
                      onChange={(e) => setConflictConfirmed(e.target.checked)}
                      id="conflict-confirm-checkbox"
                    />
                    <span>I confirm — overwrite existing data</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* File Inputs */}
          <div className="card">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FileSpreadsheet size={18} style={{ color: 'var(--color-primary-light)' }} />
              File Selection
            </h3>

            {/* Settlement Files */}
            <div className="upload-field-group">
              <label className="label">Settlement Files (.txt)</label>
              <div
                className={`upload-dropzone ${settlementDragging ? 'upload-dropzone--dragging' : ''} ${settlementFiles ? 'upload-dropzone--filled' : ''}`}
                onDragEnter={() => setSettlementDragging(true)}
                onDragLeave={() => setSettlementDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleSettlementDrop}
                onClick={() => settlementInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Click or drag to upload settlement files"
                onKeyDown={(e) => e.key === 'Enter' && settlementInputRef.current?.click()}
              >
                <input
                  ref={settlementInputRef}
                  type="file"
                  accept=".txt"
                  multiple
                  onChange={(e) => setSettlementFiles(e.target.files)}
                  style={{ display: 'none' }}
                  id="settlement-file-input"
                />
                {settlementFiles ? (
                  <div className="upload-dropzone-filled">
                    <span className="upload-dropzone-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <FileText size={24} style={{ color: 'var(--color-primary-light)' }} />
                    </span>
                    <div>
                      <p className="upload-dropzone-filename">
                        {settlementFiles.length} file(s) selected
                      </p>
                      <div className="upload-file-badges">
                        {Array.from(settlementFiles).map((f, i) => (
                          <span key={i} className="upload-file-badge">{f.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="upload-dropzone-empty">
                    <span className="upload-dropzone-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <Upload size={24} style={{ color: 'var(--color-text-muted)' }} />
                    </span>
                    <p className="upload-dropzone-text">
                      Drag & drop <strong>.txt</strong> files here, or click to browse
                    </p>
                    <p className="upload-dropzone-hint">Multiple files supported</p>
                  </div>
                )}
              </div>
            </div>

            {/* MTR File */}
            <div className="upload-field-group">
              <label className="label">MTR CSV File (.csv)</label>
              <div
                className={`upload-dropzone ${mtrDragging ? 'upload-dropzone--dragging' : ''} ${mtrFile ? 'upload-dropzone--filled' : ''}`}
                onDragEnter={() => setMtrDragging(true)}
                onDragLeave={() => setMtrDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleMtrDrop}
                onClick={() => mtrInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Click or drag to upload MTR CSV file"
                onKeyDown={(e) => e.key === 'Enter' && mtrInputRef.current?.click()}
              >
                <input
                  ref={mtrInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setMtrFile(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                  id="mtr-file-input"
                />
                {mtrFile ? (
                  <div className="upload-dropzone-filled">
                    <span className="upload-dropzone-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <FileSpreadsheet size={24} style={{ color: 'var(--color-primary-light)' }} />
                    </span>
                    <div>
                      <p className="upload-dropzone-filename">{mtrFile.name}</p>
                      <p className="upload-dropzone-hint">
                        {(mtrFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="upload-dropzone-empty">
                    <span className="upload-dropzone-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <Upload size={24} style={{ color: 'var(--color-text-muted)' }} />
                    </span>
                    <p className="upload-dropzone-text">
                      Drag & drop <strong>.csv</strong> file here, or click to browse
                    </p>
                    <p className="upload-dropzone-hint">Single file</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="upload-actions" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!canProcess || processing}
            id="process-upload-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Play size={18} /> Process & Upload
              </>
            )}
          </button>
        </div>
      </form>

      {/* Log Panel */}
      {logs.length > 0 && (
        <div className="card upload-log-panel">
          <div className="upload-log-header">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <ClipboardList size={18} style={{ color: 'var(--color-primary-light)' }} />
              Processing Log
            </h3>
            {progress > 0 && progress < 100 && (
              <ProgressBar percent={progress} showPercent={true} />
            )}
            {progress === 100 && (
              <span className="upload-log-complete" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <CheckCircle2 size={16} /> Complete
              </span>
            )}
          </div>
          <div className="upload-log-entries">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`upload-log-entry upload-log-entry--${log.type}`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <span className="upload-log-time">{log.timestamp}</span>
                <span className="upload-log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logBottomRef} />
          </div>

          {uploadDone && (
            <div className="upload-success-cta">
              <p className="upload-success-text">
                Data uploaded successfully for {selectedMonth} {selectedYear}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/')}
                id="view-dashboard-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
              >
                View Dashboard <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
