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
import {
  isRtlLocale,
  localeNames,
  normalizeLocale,
  supportedLocales,
  t,
  type LocaleCode,
  type TranslationKey
} from '../shared/i18n';
import { analyzeWakeEvidence } from '../main/analyzer/analyzeWake';
import { buildEvidenceCards, findRepeatedSuspects, type EvidenceCardState } from './viewModel';

type View = 'dashboard' | 'history' | 'recommendations' | 'report';

const viewLabelKeys: Record<View, TranslationKey> = {
  dashboard: 'ui.nav.dashboard',
  history: 'ui.nav.history',
  recommendations: 'ui.nav.recommendations',
  report: 'ui.nav.report'
};

const viewIcons = {
  dashboard: BarChart3,
  history: History,
  recommendations: Wrench,
  report: FileText
};

const familyLabelKeys: Record<WakeScanRecord['diagnosis']['family'], TranslationKey> = {
  device: 'ui.family.device',
  timer: 'ui.family.timer',
  'power-request': 'ui.family.power-request',
  'immediate-wake': 'ui.family.immediate-wake',
  unknown: 'ui.family.unknown'
};

const confidenceLabelKeys: Record<WakeScanRecord['diagnosis']['confidence'], TranslationKey> = {
  high: 'ui.confidence.high',
  medium: 'ui.confidence.medium',
  low: 'ui.confidence.low',
  unknown: 'ui.confidence.unknown'
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
  const [locale, setLocale] = useState<LocaleCode>(() =>
    normalizeLocale(
      (typeof localStorage !== 'undefined' ? localStorage.getItem('wakelens.locale') : undefined) ||
        (typeof navigator !== 'undefined' ? navigator.language : undefined)
    )
  );
  const [view, setView] = useState<View>('dashboard');
  const [history, setHistory] = useState<WakeScanRecord[]>([]);
  const [active, setActive] = useState<WakeScanRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string>('');
  const displayHistory = useMemo(
    () => history.map((record) => ({ ...record, diagnosis: analyzeWakeEvidence(record.evidence, locale) })),
    [history, locale]
  );
  const latestRaw = active ?? history[0] ?? null;
  const latest = useMemo(
    () => (latestRaw ? { ...latestRaw, diagnosis: analyzeWakeEvidence(latestRaw.evidence, locale) } : null),
    [latestRaw, locale]
  );
  const evidenceCards = latest ? buildEvidenceCards(latest.evidence, locale) : [];
  const repeatedSuspects = useMemo(() => findRepeatedSuspects(displayHistory), [displayHistory]);

  useEffect(() => {
    localStorage.setItem('wakelens.locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    if (!hasWakeLensApi()) return;

    window.wakeLens.history().then((records) => {
      setHistory(records);
      setActive(records[0] ?? null);
    }).catch(() => setMessage(t(locale, 'ui.message.historyLoadFailed')));
  }, []);

  const scan = async (): Promise<void> => {
    if (!hasWakeLensApi()) {
      setMessage(t(locale, 'ui.message.apiUnavailable'));
      return;
    }

    setIsScanning(true);
    setMessage('');
    try {
      const record = await window.wakeLens.scan(locale);
      const records = await window.wakeLens.history();
      setActive(record);
      setHistory(records);
      setView('dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(locale, 'ui.message.scanFailed'));
    } finally {
      setIsScanning(false);
    }
  };

  const exportReport = async (format: 'markdown' | 'json'): Promise<void> => {
    if (!latest || !hasWakeLensApi()) return;
    const result = await window.wakeLens.exportReport(latest, format, locale);
    setMessage(result.canceled ? t(locale, 'ui.message.exportCanceled') : t(locale, 'ui.message.reportSaved', { path: result.filePath }));
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
            <span>{t(locale, 'ui.brand.subtitle')}</span>
          </div>
        </div>
        <label className="language-picker">
          <span>{t(locale, 'ui.language')}</span>
          <select value={locale} onChange={(event) => setLocale(normalizeLocale(event.target.value))}>
            {supportedLocales.map((item) => (
              <option key={item} value={item}>{localeNames[item]}</option>
            ))}
          </select>
        </label>

        {(Object.keys(viewLabelKeys) as View[]).map((item) => {
          const Icon = viewIcons[item];
          return (
            <button className={view === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setView(item)}>
              <Icon size={17} aria-hidden="true" />
              <span>{t(locale, viewLabelKeys[item])}</span>
            </button>
          );
        })}
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t(locale, 'ui.eyebrow')}</p>
            <h1>{t(locale, 'ui.title')}</h1>
          </div>
          <button className="primary command-button" onClick={scan} disabled={isScanning}>
            {isScanning ? <RefreshCcw size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            <span>{isScanning ? t(locale, 'ui.scanning') : t(locale, 'ui.scanNow')}</span>
          </button>
        </header>

        {message && <p className="message">{message}</p>}

        {view === 'dashboard' && (
          <section className="dashboard-layout">
            <article className="hero-result">
              <div className="result-meta">
                <span className={`confidence ${latest?.diagnosis.confidence ?? 'unknown'}`}>
                  {latest ? t(locale, confidenceLabelKeys[latest.diagnosis.confidence]) : t(locale, 'ui.empty.noScanBadge')}
                </span>
                {latest && <span className="family-chip">{t(locale, familyLabelKeys[latest.diagnosis.family])}</span>}
                {latest && <span className="scan-time">{formatDate(latest.createdAt)}</span>}
              </div>
              <h2>{latest?.diagnosis.headline ?? t(locale, 'ui.empty.noScanHeadline')}</h2>
              <p>{latest?.diagnosis.explanation ?? t(locale, 'ui.empty.noScanBody')}</p>
              <div className="actions">
                <button className="primary command-button" onClick={scan} disabled={isScanning}>
                  <RefreshCcw size={17} aria-hidden="true" />
                  <span>{latest ? t(locale, 'ui.scanAgain') : t(locale, 'ui.scanNow')}</span>
                </button>
                {latest && (
                  <button className="command-button" onClick={() => exportReport('markdown')}>
                    <Download size={17} aria-hidden="true" />
                    <span>{t(locale, 'ui.exportMarkdown')}</span>
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
                            <span>{issue.actionLabel ?? t(locale, 'ui.open')}</span>
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
                <h2>{t(locale, 'ui.section.whatChecked')}</h2>
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
                {!latest && <p>{t(locale, 'ui.empty.noEvidence')}</p>}
              </div>
            </section>

            {latest && (
              <section className="two-column">
                <article className="section-block">
                  <div className="section-heading">
                    <Sparkles size={20} aria-hidden="true" />
                    <h2>{t(locale, 'ui.section.evidenceSummary')}</h2>
                  </div>
                  <ul className="evidence-list">
                    {latest.diagnosis.evidenceSummary.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>

                <article className="section-block">
                  <div className="section-heading">
                    <Wrench size={20} aria-hidden="true" />
                    <h2>{t(locale, 'ui.section.nextSteps')}</h2>
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
                              <span>{item.actionLabel ?? t(locale, 'ui.open')}</span>
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
                <summary>{t(locale, 'ui.section.technicalDetails')}</summary>
                <div className="raw-grid">
                  {Object.values(latest.evidence.commands).map((command) => (
                    <div className="raw-command" key={command.command}>
                      <strong>{command.command}</strong>
                      <span>{command.status}{command.failureKind ? ` / ${command.failureKind}` : ''}</span>
                      <pre>{command.stdout || command.stderr || t(locale, 'report.noOutput')}</pre>
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
              <h2>{t(locale, 'ui.section.scanHistory')}</h2>
            </div>
            {repeatedSuspects.length > 0 && (
              <div className="repeat-strip">
                {repeatedSuspects.map((item) => (
                  <article className="repeat-item" key={`${item.family}-${item.label}`}>
                    <strong>{item.label}</strong>
                    <span>{t(locale, 'ui.history.scanCount', { count: item.count })}</span>
                  </article>
                ))}
              </div>
            )}
            <div className="history-list">
              {displayHistory.map((record) => (
                <button className={active?.id === record.id ? 'history-row active' : 'history-row'} key={record.id} onClick={() => setActive(record)}>
                  <span>{formatDate(record.createdAt)}</span>
                  <strong>{record.diagnosis.headline}</strong>
                  <em>{record.diagnosis.confidence}</em>
                </button>
              ))}
            </div>
            {history.length === 0 && <p>{t(locale, 'ui.empty.noScansSaved')}</p>}
          </section>
        )}

        {view === 'recommendations' && (
          <section className="section-block">
            <div className="section-heading">
              <Wrench size={20} aria-hidden="true" />
              <h2>{t(locale, 'ui.section.safeNextSteps')}</h2>
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
                        <span>{item.actionLabel ?? t(locale, 'ui.open')}</span>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {!latest && <p>{t(locale, 'ui.empty.runScanForRecommendations')}</p>}
          </section>
        )}

        {view === 'report' && (
          <section className="section-block report-panel">
            <div className="section-heading">
              <FileText size={20} aria-hidden="true" />
              <h2>{t(locale, 'ui.section.exportReport')}</h2>
            </div>
            <p>{t(locale, 'ui.report.description')}</p>
            <div className="actions">
              {latest && (
                <>
                  <button className="command-button" onClick={() => exportReport('markdown')}>
                    <Download size={17} aria-hidden="true" />
                    <span>{t(locale, 'ui.saveMarkdown')}</span>
                  </button>
                  <button className="command-button" onClick={() => exportReport('json')}>
                    <Download size={17} aria-hidden="true" />
                    <span>{t(locale, 'ui.saveJson')}</span>
                  </button>
                </>
              )}
              {!latest && <button disabled>{t(locale, 'ui.runScanFirst')}</button>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
