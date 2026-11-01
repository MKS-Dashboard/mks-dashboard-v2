import { useState } from "react";
import type { AppInfo, DashboardData, UpdateStatus } from "../../shared/contracts";
import { generateErrorReport, recordAppIssue, reportMessage } from "./error-report";

export function ErrorReportPanel(props: {
  data: DashboardData | null; appInfo: AppInfo | null; lastUpdated: Date | null; updateStatus: UpdateStatus; errors: string[];
}) {
  const [report, setReport] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function generate(): void {
    setFeedback("");
    setError("");
    try { setReport(generateErrorReport(props)); }
    catch (cause) {
      recordAppIssue("Rapport genereren", cause);
      setError(`Rapport genereren is mislukt: ${reportMessage(cause)}`);
    }
  }

  async function copy(): Promise<void> {
    setFeedback("");
    setError("");
    try {
      await navigator.clipboard.writeText(report);
      setFeedback("Rapport gekopieerd.");
    } catch (cause) {
      recordAppIssue("Rapport kopieren", cause);
      setError(`Kopieren is mislukt. Selecteer de tekst en kopieer handmatig. ${reportMessage(cause)}`);
    }
  }

  async function download(): Promise<void> {
    if (saving) return;
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      const saved = await window.mksDashboard.saveErrorReport(report);
      setFeedback(saved ? "Rapport opgeslagen." : "Opslaan geannuleerd.");
    } catch (cause) {
      recordAppIssue("Rapport opslaan", cause);
      setError(`Downloaden is mislukt: ${reportMessage(cause)}`);
    } finally { setSaving(false); }
  }

  return <section className="settings-panel" aria-labelledby="error-report-heading">
    <div className="settings-option">
      <div className="settings-option-copy">
        <div className="settings-option-title"><h2 id="error-report-heading">Errorrapport</h2></div>
        <p>Controleer de laatst opgehaalde gegevens op onbekende typen en fouten. Er worden geen extra API-verzoeken gedaan.</p>
      </div>
      <button className="button button-secondary" type="button" disabled={saving} onClick={generate}>Genereer error rapport</button>
    </div>
    {report && <div className="error-report-content">
      <p>Dit is een momentopname. Genereer opnieuw na het vernieuwen van gegevens. Controleer de tekst voordat je deze deelt.</p>
      <textarea className="error-report-text" aria-label="Errorrapport" value={report} readOnly rows={16} />
      <div className="welcome-actions">
        <button className="button button-secondary" type="button" onClick={() => void copy()}>Kopieer rapport</button>
        <button className="button button-primary" type="button" disabled={saving} onClick={() => void download()}>
          {saving ? "Opslaan..." : "Download rapport"}
        </button>
      </div>
    </div>}
    {feedback && <p role="status">{feedback}</p>}
    {error && <div className="notice notice-error" role="alert">{error}</div>}
  </section>;
}
