# CareSignal patient alerts

A responsive clinical patient-alert interface built with React, Vite, and TypeScript. This repository contains a program used to make EMR alerts, with model-informed treatment-effectiveness predictions.

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
npm start        # serve the production build and patient API on port 8080
```

## Docker

The production image builds the Vite application, serves it from a small Node.js server, and exposes the patient API at `GET /api/patients/:patientId`. It includes the required `MODEL_FINAL_OUTPUT.json` dataset, listens on port `8080`, and runs as the non-root `node` user.

```bash
docker build -t ui-emr-alerts .
docker run --rm -p 8080:8080 ui-emr-alerts
```

Open `http://localhost:8080` and query `http://localhost:8080/api/patients/2355`. Container health can be checked at `http://localhost:8080/health`.

## Feature-engineering analysis

Use the dependency-free Python profiler to inspect a training CSV and generate a model-ready feature-engineering plan. It detects numeric, categorical, and date fields; profiles missingness and cardinality; recommends transformations; and excludes identifier fields by default to reduce memorization risk.

```bash
python scripts/analyze_feature_engineering.py "C:\path\to\Cleansed_Output.csv" --target TARGET --output feature_engineering_report.json
```

For the supplied `Cleansed_Output.csv`, the report evaluates the binary `TARGET` and recommends features from transaction dates, clinical counts, demographics, location, insurance, transaction types, and descriptions. `PATIENT_ID` and `PHYSICIAN_ID` are excluded as raw model features; any historical aggregate derived from them must be fit within each training fold to avoid target leakage.
