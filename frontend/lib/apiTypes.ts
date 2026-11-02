// Response types of the backend; they grow with the API (backend/src/**/*.controller.ts)

export interface HealthResponse {
  status: "ok";
  database: "ok";
}
