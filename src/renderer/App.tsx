import { useEffect, useMemo, useState } from 'react';
import type { WakeScanRecord } from '../shared/types';

type View = 'dashboard' | 'history' | 'recommendations' | 'report';

const viewLabels: Record<View, string> = {
  dashboard: 'Dashboard',
  history: 'History',
  recommendations: 'Recommendations',
  report: 'Report'
};

const hasWakeLensApi = (): boolean => typeof window !== 'undefined' && Boolean(window.wakeLens);

export const App = () => {
  const [view, setView] = useState<View>('dashboard');
  const [history, setHistory] = useState<WakeScanRecord[]>([]);
  const [active, setActive] = useState<WakeScanRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string>('');
  const latest = active ?? history[0] ?? null;

  useEffect(() => {
    if (!hasWakeLensApi()) return;

    window.wakeLens.history().then((records) => {
      setHistory(records);
      setActive(records[0] ?? null);
    }).catch(() => setMessage('History could not be loaded.'));
  }, []);

  const confidenceText = useMemo(() => {
    if (!latest) return 'No scan yet';
    return latest.diagnosis.confidence.toUpperCase();
  }, [latest]);

  const scan = async (): Promise<void> => {
    if (!hasWakeLensApi()) {
      setMessage('WakeLens desktop API is unavailable in this preview.');
      return;
    }

    setIsScanning(true);
    setMessage('');
    try {
      const record = await window.wakeLens.scan();
      const records = await window.wakeLens.history();
      setActive(record);
      setHistory(records);
      setView('dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const exportReport = async (format: 'markdown' | 'json'): Promise<void> => {
    if (!latest || !hasWakeLensApi()) return;
    const result = await window.wakeLens.exportReport(latest, format);
    setMessage(result.canceled ? 'Export canceled.' : `Report saved: ${result.filePath}`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>WakeLens</strong>
            <span>Sleep diagnostics</span>
          </div>
        </div>
        {(Object.keys(viewLabels) as View[]).map((item) => (
          <button className={view === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setView(item)}>
            {viewLabels[item]}
          </button>
        ))}
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Windows wake diagnosis</p>
            <h1>Find out why this PC woke up</h1>
          </div>
          <button className="primary" onClick={scan} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Scan now'}
          </button>
        </header>

        {message && <p className="message">{message}</p>}

        {view === 'dashboard' && (
          <section className="dashboard-grid">
            <article className="result-panel">
              <span className={`confidence ${latest?.diagnosis.confidence ?? 'unknown'}`}>{confidenceText}</span>
              <h2>{latest?.diagnosis.headline ?? 'No wake scan has been run yet'}</h2>
              <p>{latest?.diagnosis.explanation ?? 'Run a scan after an unexpected wake to collect Windows evidence.'}</p>
              <div className="actions">
                <button className="primary" onClick={scan} disabled={isScanning}>Scan now</button>
                {latest && <button onClick={() => exportReport('markdown')}>Export Markdown</button>}
              </div>
            </article>
            <article className="evidence-panel">
              <h3>Evidence</h3>
              {(latest?.diagnosis.evidenceSummary ?? ['No evidence collected yet.']).map((item) => <p key={item}>{item}</p>)}
            </article>
          </section>
        )}

        {view === 'history' && (
          <section className="list-panel">
            <h2>Scan history</h2>
            {history.map((record) => (
              <button className="history-row" key={record.id} onClick={() => setActive(record)}>
                <span>{new Date(record.createdAt).toLocaleString()}</span>
                <strong>{record.diagnosis.headline}</strong>
                <em>{record.diagnosis.confidence}</em>
              </button>
            ))}
            {history.length === 0 && <p>No scans saved yet.</p>}
          </section>
        )}

        {view === 'recommendations' && (
          <section className="list-panel">
            <h2>Safe next steps</h2>
            {(latest?.diagnosis.recommendations ?? []).map((item) => (
              <article className="recommendation" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.command && <button onClick={() => window.wakeLens.openTool(item.command!)}>{item.actionLabel}</button>}
              </article>
            ))}
            {!latest && <p>Run a scan to see recommendations.</p>}
          </section>
        )}

        {view === 'report' && (
          <section className="list-panel">
            <h2>Export a support report</h2>
            <p>Reports include the diagnosis, evidence summary, recommendations, and raw command output.</p>
            <div className="actions">
              {latest && <button onClick={() => exportReport('markdown')}>Save Markdown</button>}
              {latest && <button onClick={() => exportReport('json')}>Save JSON</button>}
              {!latest && <button disabled>Run a scan first</button>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
