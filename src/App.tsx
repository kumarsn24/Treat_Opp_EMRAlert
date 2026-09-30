import { FormEvent, useState } from "react";

type AlertSeverity = "critical" | "warning" | "info";
type Patient = {
  PATIENT_ID: number;
  TXN_LOCATION_TYPE?: string;
  TXN_DT?: string;
  INSURANCE_TYPE: string;
  NO_OF_CONDN: number;
  NO_OF_SYMPT: number;
  NO_OF_CONTRD: number;
  PAT_GENDER: "M" | "F" | "U";
  PHY_STATE: string;
  PHY_PHYSICIAN_TYPE: string;
  PAT_AGE: number;
  PREDICTION: 0 | 1;
  PREDICTION_PROBA_POS: number;
};

type RequestState = "idle" | "loading" | "not-found" | "error" | "invalid";

const initialPatientId = "2355";

function getApiMessage(payload: Patient | { message?: string }) {
  return "message" in payload ? payload.message : undefined;
}

function genderLabel(gender: Patient["PAT_GENDER"]) {
  return { M: "Male", F: "Female", U: "Unknown" }[gender];
}

function riskLevel(patient: Patient) {
  if (patient.NO_OF_CONDN >= 10 || patient.NO_OF_CONTRD > 0) return "High";
  if (patient.NO_OF_CONDN > 0 || patient.NO_OF_SYMPT > 0) return "Moderate";
  return "Low";
}

function treatmentRecommendation(patient: Patient) {
  const effectiveness = Math.round(patient.PREDICTION_PROBA_POS * 100);
  if (patient.PREDICTION === 1) {
    return {
      effectiveness,
      outcome: "Likely to benefit from Drug A",
      detail: `The model indicates a high likelihood that Drug A will be effective for this patient.`,
      action: "Consider treatment review",
      style: "positive"
    };
  }
  return {
    effectiveness,
    outcome: "Lower likelihood of benefit from Drug A",
    detail: "The model indicates a lower likelihood that Drug A will be effective. Evaluate alternatives in the clinical context.",
    action: "Review alternatives",
    style: "caution"
  };
}

function patientAlerts(patient: Patient) {
  const alerts: Array<{ id: string; severity: AlertSeverity; title: string; detail: string; status: string; category: string }> = [];
  if (patient.NO_OF_CONDN > 0) {
    alerts.push({
      id: "conditions",
      severity: patient.NO_OF_CONDN >= 10 ? "critical" : "warning",
      title: `${patient.NO_OF_CONDN} critical medical condition${patient.NO_OF_CONDN === 1 ? "" : "s"} identified`,
      detail: `The source record lists ${patient.NO_OF_CONDN} condition${patient.NO_OF_CONDN === 1 ? "" : "s"} associated with higher risk of severe Disease X progression.`,
      status: patient.NO_OF_CONDN >= 10 ? "Action needed" : "Review",
      category: "Conditions"
    });
  }
  if (patient.NO_OF_SYMPT > 0) {
    alerts.push({
      id: "symptoms",
      severity: "warning",
      title: `${patient.NO_OF_SYMPT} Disease X symptom${patient.NO_OF_SYMPT === 1 ? "" : "s"} recorded`,
      detail: `Review the documented symptoms and assess whether additional clinical follow-up is needed.`,
      status: "Review",
      category: "Symptoms"
    });
  }
  if (patient.NO_OF_CONTRD > 0) {
    alerts.push({
      id: "contraindications",
      severity: "critical",
      title: `${patient.NO_OF_CONTRD} possible contraindication${patient.NO_OF_CONTRD === 1 ? "" : "s"}`,
      detail: `Potential medication contraindications may make this patient less likely to receive Drug A. Confirm the treatment plan.`,
      status: "Action needed",
      category: "Medication"
    });
  }
  const recommendation = treatmentRecommendation(patient);
  alerts.push({
    id: "treatment-model",
    severity: "info",
    title: recommendation.outcome,
    detail: `${recommendation.effectiveness}% predicted treatment effectiveness for Drug A.`,
    status: recommendation.action,
    category: "Treatment model"
  });
  return alerts;
}

function App() {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");

  async function findPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = patientId.trim();

    if (!/^\d+$/.test(normalizedId)) {
      setPatient(null);
      setRequestState("invalid");
      setMessage("Enter a numeric patient ID.");
      return;
    }

    setPatientId(normalizedId);
    setPatient(null);
    setRequestState("loading");
    setMessage("");

    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(normalizedId)}`);
      const payload = (await response.json()) as Patient | { message?: string };

      if (response.status === 404) {
        setRequestState("not-found");
        setMessage(getApiMessage(payload) ?? "No patient was found for that ID.");
        return;
      }
      if (!response.ok) {
        throw new Error(getApiMessage(payload) ?? "The request could not be completed.");
      }

      setPatient(payload as Patient);
      setRequestState("idle");
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Unable to retrieve patient details.");
    }
  }

  const alerts = patient ? patientAlerts(patient) : [];
  const recommendation = patient ? treatmentRecommendation(patient) : null;
  const counts = alerts.reduce(
    (total, alert) => ({ ...total, [alert.severity]: total[alert.severity] + 1 }),
    { critical: 0, warning: 0, info: 0 }
  );

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="CareSignal home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>Care<span>Signal</span></span>
        </a>
        <div className="secure-status"><span aria-hidden="true">●</span> Secure clinical workspace</div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Patient safety workspace</p>
          <h1 id="page-title">Patient alerts</h1>
          <p>Search a patient record to prioritize time-sensitive clinical follow-up.</p>
        </div>
        <form className="search" onSubmit={findPatient} noValidate>
          <label htmlFor="patient-id">Patient ID</label>
          <div className="search-row">
            <input
              id="patient-id"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="e.g. 1859"
              aria-describedby="patient-id-hint"
              aria-invalid={requestState === "invalid"}
              disabled={requestState === "loading"}
            />
            <button type="submit" disabled={requestState === "loading"}>
              {requestState === "loading" ? "Searching…" : "Find patient"}
            </button>
          </div>
          <p id="patient-id-hint" className="input-hint">Try 2355, 3150, or 3366</p>
        </form>
      </section>

      <section className="workspace" aria-live="polite">
        {requestState === "loading" && <LoadingState />}
        {requestState === "invalid" && <StatusState kind="invalid" title="Check the patient ID" message={message} />}
        {requestState === "not-found" && <StatusState kind="not-found" title="Patient not found" message={message} />}
        {requestState === "error" && <StatusState kind="error" title="We could not load this record" message={message} />}
        {requestState === "idle" && !patient && <EmptyState />}
        {patient && (
          <>
            <section className="patient-card" aria-labelledby="patient-name">
              <div className="avatar" aria-hidden="true">P{patient.PATIENT_ID}</div>
              <div className="patient-heading">
                <p className="eyebrow">Active patient record</p>
                <h2 id="patient-name">Patient {patient.PATIENT_ID} <span>{genderLabel(patient.PAT_GENDER)}</span></h2>
                <p>{patient.PAT_AGE} years · Patient ID {patient.PATIENT_ID}</p>
              </div>
              <div className="patient-meta">
                <p><strong>{patient.TXN_LOCATION_TYPE ?? "Not recorded"}</strong><span>{patient.TXN_DT ? `Transaction date · ${patient.TXN_DT}` : "Transaction location"}</span></p>
                <p><strong>{patient.PHY_PHYSICIAN_TYPE}</strong><span>Physician specialty · {patient.PHY_STATE}</span></p>
              </div>
              <span className={`risk risk-${riskLevel(patient).toLowerCase()}`}>{riskLevel(patient)} risk</span>
            </section>

            {recommendation && (
              <section className={`treatment-outcome treatment-${recommendation.style}`} aria-labelledby="treatment-title">
                <div className="treatment-icon" aria-hidden="true">{recommendation.style === "positive" ? "✓" : "!"}</div>
                <div className="treatment-copy">
                  <p className="eyebrow">Treatment effectiveness prediction</p>
                  <h2 id="treatment-title">{recommendation.outcome}</h2>
                  <p>{recommendation.detail}</p>
                </div>
                <div className="effectiveness-score">
                  <span>Predicted effectiveness</span>
                  <strong>{recommendation.effectiveness}<small>%</small></strong>
                  <span className="treatment-action">{recommendation.action}</span>
                </div>
              </section>
            )}

            <div className="summary-grid">
              <section className="clinical-summary" aria-labelledby="summary-title">
                <div className="section-heading">
                  <div><p className="eyebrow">Clinical overview</p><h2 id="summary-title">At a glance</h2></div>
                  <span>Model-informed record</span>
                </div>
                <p>Review the clinical indicators below with the patient’s care setting, insurance classification, and physician specialty before making treatment decisions.</p>
                <dl className="vitals">
                  <div><dt>Critical conditions</dt><dd>{patient.NO_OF_CONDN} <small>recorded</small><span className="trend trend-up" aria-label="attention indicator">●</span></dd></div>
                  <div><dt>Disease X symptoms</dt><dd>{patient.NO_OF_SYMPT} <small>recorded</small><span className="trend trend-up" aria-label="attention indicator">●</span></dd></div>
                  <div><dt>Contraindications</dt><dd>{patient.NO_OF_CONTRD} <small>possible</small><span className="trend trend-up" aria-label="attention indicator">●</span></dd></div>
                  <div><dt>Insurance</dt><dd className="text-vital">{patient.INSURANCE_TYPE}</dd></div>
                </dl>
              </section>

              <aside className="attention-panel" aria-labelledby="attention-title">
                <p className="eyebrow">Needs attention</p>
                <h2 id="attention-title">{alerts.length} active alerts</h2>
                <div className="alert-totals">
                  <span><b>{counts.critical}</b> critical</span>
                  <span><b>{counts.warning}</b> review</span>
                  <span><b>{counts.info}</b> updates</span>
                </div>
              </aside>
            </div>

            <section className="alerts-section" aria-labelledby="alerts-title">
              <div className="section-heading">
                <div><p className="eyebrow">Prioritized alerts</p><h2 id="alerts-title">Clinical follow-up</h2></div>
                <span>{alerts.length} items</span>
              </div>
              <div className="alert-list">
                {alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function AlertCard({ alert }: { alert: ReturnType<typeof patientAlerts>[number] }) {
  return (
    <article className={`alert-card severity-${alert.severity}`}>
      <div className="alert-icon" aria-hidden="true">{alert.severity === "critical" ? "!" : alert.severity === "warning" ? "▲" : "i"}</div>
      <div className="alert-content">
        <div className="alert-title"><span className="category">{alert.category}</span></div>
        <h3>{alert.title}</h3>
        <p>{alert.detail}</p>
      </div>
      <span className="alert-status">{alert.status}</span>
    </article>
  );
}

function StatusState({ kind, title, message }: { kind: string; title: string; message: string }) {
  return <div className={`state-card state-${kind}`} role="status"><div className="state-icon" aria-hidden="true">!</div><h2>{title}</h2><p>{message}</p></div>;
}

function LoadingState() {
  return <div className="state-card loading" role="status"><span className="spinner" aria-hidden="true" /><h2>Retrieving patient record</h2><p>Checking the local clinical data service…</p></div>;
}

function EmptyState() {
  return <div className="state-card empty"><div className="state-icon" aria-hidden="true">⌕</div><h2>Ready to review alerts</h2><p>Enter a patient ID above to load their clinical summary and active alerts.</p></div>;
}

export default App;
