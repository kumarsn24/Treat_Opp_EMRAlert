import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

type PatientRecord = {
  PATIENT_ID: number;
};

function localPatientApi(): Plugin {
  return {
    name: "local-patient-api",
    configureServer(server) {
      server.middlewares.use("/api/patients", async (request, response) => {
        const patientId = decodeURIComponent(request.url?.split("?")[0]?.replace(/^\//, "") ?? "");

        if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET");
          response.end(JSON.stringify({ message: "Method not allowed" }));
          return;
        }

        if (!/^\d+$/.test(patientId)) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ message: "Patient ID must contain digits only." }));
          return;
        }

        try {
          const dataPath = resolve(process.cwd(), "src", "data", "MODEL_FINAL_OUTPUT.json");
          const patients = JSON.parse(await readFile(dataPath, "utf8")) as PatientRecord[];
          const patient = patients.find((item) => item.PATIENT_ID === Number(patientId));

          response.statusCode = patient ? 200 : 404;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify(patient ?? { message: "No patient was found for that ID." }));
        } catch (error) {
          console.error("Unable to retrieve local patient data.", error);
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ message: "The local patient service is unavailable." }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localPatientApi()]
});
