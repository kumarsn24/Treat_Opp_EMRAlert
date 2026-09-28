# CareSignal patient alerts

A responsive clinical patient-alert interface built with React, Vite, and TypeScript. It searches a local patient API route and presents a concise patient summary, recent vital signs, and prioritized clinical alerts.

## Run locally

Prerequisites: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Search by numeric `PATIENT_ID`. Try these included records:

- `2355` — 97% predicted Drug A treatment effectiveness
- `3150` — 97% predicted Drug A treatment effectiveness
- `3366` — lower likelihood of Drug A treatment benefit

Use an ID such as `999999` to see the not-found state, or a non-numeric value to see validation feedback.

## Local API and data

The Vite configuration registers a development-only `GET /api/patients/:patientId` route. It reads `src/data/MODEL_FINAL_OUTPUT.json` and finds the row whose numeric `PATIENT_ID` matches the search value. The interface uses the supplied data dictionary to label demographic, insurance, physician, condition, symptom, contraindication, prediction, and treatment-effectiveness fields. `PREDICTION` describes the model's treatment likelihood and `PREDICTION_PROBA_POS` is displayed as the predicted treatment-effectiveness percentage. It returns appropriate `400`, `404`, and `500` JSON responses; the UI handles loading, invalid input, not-found, and request-error states accessibly.

## Commands

```bash
npm run dev      # start the development app and local API route
npm run build    # type-check and create an optimized production build
npm run preview  # serve the production build
```
