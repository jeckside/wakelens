import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  History,
  Info,
  Play,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Wrench
} from 'lucide-react';
import type { DiagnosticIssue, Recommendation, WakeScanRecord } from '../shared/types';
import { buildEvidenceCards, findRepeatedSuspects, type EvidenceCardState } from './viewModel';

type View = 'dashboard' | 'history' | 'recommendations' | 'report';

const viewLabels: Record<View, string> = {
  dashboard: 'Dashboard',
  history: 'History',
  recommendations: 'Recommendations',
  report: 'Report'
};

const viewIcons = {
  dashboard: BarChart3,
  history: History,
  recommendations: Wrench,
  report: FileText
};

const familyLabels: Record<WakeScanRecord['diagnosis']['family'], string> = {
  device: 'Device',
  timer: 'Timer',
  'power-request': 'Power request',
  'immediate-wake': 'Immediate wake',
  unknown: 'Unknown'
};

const stateIcons: Record<EvidenceCardState, typeof CheckCircle2> = {
  good: CheckCircle2,
  neutral: Info,
  warning: ShieldAlert,
  error: AlertTriangle
};

const hasWakeLensApi = (): boolean => typeof window !== 'undefined' && Boolean(window.wakeLens);

const formatDate = (value: string): string => new Date(value).toLocaleString();

const actionIcon = (command?: string): typeof RefreshCcw => {
  if (command === 'run-as-admin') return ShieldAlert;
  if (command) return Wrench;
  return RefreshCcw;
};

export const App = () => {
  const [view, setView] = useState<View>('dashboard');
  const [history, setHistory] = useState<WakeScanRecord[]>([]);
  const [active, setActive] = useState<WakeScanRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string>('');
  const latest = active ?? history[0] ?? null;
  const evidenceCards = latest ? buildEvidenceCards(latest.evidence) : [];
  const repeatedSuspects = useMemo(() => findRepeatedSuspects(history), [history]);

  useEffect(() => {
    if (!hasWakeLensApi()) return;

    window.wakeLens.history().then((records) => {
      setHistory(records);
      setActive(records[0] ?? null);
    }).catch(() => setMessage('History could not be loaded.'));
  }, []);

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

  const runAction = async (item: Pick<Recommendation | DiagnosticIssue, 'command'>): Promise<void> => {
    if (!item.command || !hasWakeLensApi()) return;
    await window.wakeLens.openTool(item.command);
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
        {(Object.keys(viewLabels) as View[]).map((item) => {
          const Icon = viewIcons[item];
          return (
            <button className={view === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setView(item)}>
              <Icon size={17} aria-hidden="true" />
              <span>{viewLabels[item]}</span>
            </button>
          );
        })}
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Windows wake diagnosis</p>
            <h1>Find out why this PC woke up</h1>
          </div>
          <button className="primary command-button" onClick={scan} disabled={isScanning}>
            {isScanning ? <RefreshCcw size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            <span>{isScanning ? 'Scanning...' : 'Scan now'}</span>
          </button>
        </header>

        {message && <p className="message">{message}</p>}

        {view === 'dashboard' && (
          <section className="dashboard-layout">
            <article className="hero-result">
              <div className="result-meta">
                <span className={`confidence ${latest?.diagnosis.confidence ?? 'unknown'}`}>
                  {latest ? latest.diagnosis.confidence.toUpperCase() : 'NO SCAN YET'}
                </span>
                {latest && <span className="family-chip">{familyLabels[latest.diagnosis.family]}</span>}
                {latest && <span className="scan-time">{formatDate(latest.createdAt)}</span>}
              </div>
              <h2>{latest?.diagnosis.headline ?? 'No wake scan has been run yet'}</h2>
              <p>{latest?.diagnosis.explanation ?? 'Run a scan after an unexpected wake to collect Windows evidence.'}</p>
              <div className="actions">
                <button className="primary command-button" onClick={scan} disabled={isScanning}>
                  <RefreshCcw size={17} aria-hidden="true" />
                  <span>{latest ? 'Scan again' : 'Scan now'}</span>
                </button>
                {latest && (
                  <button className="command-button" onClick={() => exportReport('markdown')}>
                    <Download size={17} aria-hidden="true" />
                    <span>Export Markdown</span>
                  </button>
                )}
              </div>
            </article>

            {latest?.diagnosis.diagnosticIssues && latest.diagnosis.diagnosticIssues.length > 0 && (
              <section className="issue-strip" aria-label="Diagnostic issues">
                {latest.diagnosis.diagnosticIssues.map((issue) => {
                  const Icon = issue.severity === 'error' ? AlertTriangle : ShieldAlert;
                  const Action = actionIcon(issue.command);
                  return (
                    <article className={`issue ${issue.severity}`} key={issue.title}>
                      <Icon size={20} aria-hidden="true" />
                      <div>
                        <h3>{issue.title}</h3>
                        <p>{issue.body}</p>
                        {issue.command && (
                          <button className="small-command" onClick={() => runAction(issue)}>
                            <Action size={15} aria-hidden="true" />
                            <span>{issue.actionLabel ?? 'Open'}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            <section className="section-block">
              <div className="section-heading">
                <ClipboardList size={20} aria-hidden="true" />
                <h2>What WakeLens checked</h2>
              </div>
              <div className="status-grid">
                {(latest ? evidenceCards : []).map((card) => {
                  const Icon = stateIcons[card.state];
                  return (
                    <article className={`status-tile ${card.state}`} key={card.id}>
                      <Icon size={19} aria-hidden="true" />
                      <div>
                        <strong>{card.title}</strong>
                        <span>{card.status}</span>
                        <p>{card.detail}</p>
                      </div>
                    </article>
                  );
                })}
                {!latest && <p>No evidence collected yet.</p>}
              </div>
            </section>

            {latest && (
              <section className="two-column">
                <article className="section-block">
                  <div className="section-heading">
                    <Sparkles size={20} aria-hidden="true" />
                    <h2>Evidence summary</h2>
                  </div>
                  <ul className="evidence-list">
                    {latest.diagnosis.evidenceSummary.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>

                <article className="section-block">
                  <div className="section-heading">
                    <Wrench size={20} aria-hidden="true" />
                    <h2>Next steps</h2>
                  </div>
                  <div className="next-steps">
                    {latest.diagnosis.recommendations.slice(0, 3).map((item) => {
                      const Icon = actionIcon(item.command);
                      return (
                        <div className="step-row" key={`${item.title}-${item.command ?? 'info'}`}>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.body}</p>
                          </div>
                          {item.command && (
                            <button className="small-command" onClick={() => runAction(item)}>
                              <Icon size={15} aria-hidden="true" />
                              <span>{item.actionLabel ?? 'Open'}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            )}

            {latest && (
              <details className="technical-details">
                <summary>Technical details</summary>
                <div className="raw-grid">
                  {Object.values(latest.evidence.commands).map((command) => (
                    <div className="raw-command" key={command.command}>
                      <strong>{command.command}</strong>
                      <span>{command.status}{command.failureKind ? ` / ${command.failureKind}` : ''}</span>
                      <pre>{command.stdout || command.stderr || 'No output.'}</pre>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        {view === 'history' && (
          <section className="section-block">
            <div className="section-heading">
              <History size={20} aria-hidden="true" />
              <h2>Scan history</h2>
            </div>
            {repeatedSuspects.length > 0 && (
              <div className="repeat-strip">
                {repeatedSuspects.map((item) => (
                  <article className="repeat-item" key={`${item.family}-${item.label}`}>
                    <strong>{item.label}</strong>
                    <span>{item.count} scans</span>
                  </article>
                ))}
              </div>
            )}
            <div className="history-list">
              {history.map((record) => (
                <button className={active?.id === record.id ? 'history-row active' : 'history-row'} key={record.id} onClick={() => setActive(record)}>
                  <span>{formatDate(record.createdAt)}</span>
                  <strong>{record.diagnosis.headline}</strong>
                  <em>{record.diagnosis.confidence}</em>
                </button>
              ))}
            </div>
            {history.length === 0 && <p>No scans saved yet.</p>}
          </section>
        )}

        {view === 'recommendations' && (
          <section className="section-block">
            <div className="section-heading">
              <Wrench size={20} aria-hidden="true" />
              <h2>Safe next steps</h2>
            </div>
            <div className="recommendation-list">
              {(latest?.diagnosis.recommendations ?? []).map((item) => {
                const Icon = actionIcon(item.command);
                return (
                  <article className="recommendation" key={`${item.title}-${item.command ?? 'info'}`}>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                    {item.command && (
                      <button className="command-button" onClick={() => runAction(item)}>
                        <Icon size={17} aria-hidden="true" />
                        <span>{item.actionLabel}</span>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {!latest && <p>Run a scan to see recommendations.</p>}
          </section>
        )}

        {view === 'report' && (
          <section className="section-block report-panel">
            <div className="section-heading">
              <FileText size={20} aria-hidden="true" />
              <h2>Export a support report</h2>
            </div>
            <p>Reports include the diagnosis, plain-language issues, recommendations, and raw command output.</p>
            <div className="actions">
              {latest && (
                <>
                  <button className="command-button" onClick={() => exportReport('markdown')}>
                    <Download size={17} aria-hidden="true" />
                    <span>Save Markdown</span>
                  </button>
                  <button className="command-button" onClick={() => exportReport('json')}>
                    <Download size={17} aria-hidden="true" />
                    <span>Save JSON</span>
                  </button>
                </>
              )}
              {!latest && <button disabled>Run a scan first</button>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
