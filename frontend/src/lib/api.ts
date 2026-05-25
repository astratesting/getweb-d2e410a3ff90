import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (email: string, password: string, full_name?: string) =>
    api.post("/auth/register", { email, password, full_name }),
  login: (email: string, password: string) => {
    const form = new FormData();
    form.append("username", email);
    form.append("password", password);
    return api.post("/auth/login", form);
  },
  me: () => api.get("/auth/me"),
};

export const leadsApi = {
  list: (status?: string) => api.get("/api/leads", { params: { status } }),
  startScrape: (query: string, location: string) =>
    api.post("/api/scrape", { query, location }),
  getScrapeJob: (id: string) => api.get(`/api/scrape/${id}`),
  generatePage: (leadId: string) => api.post(`/api/leads/${leadId}/generate-page`),
  sendEmail: (leadId: string) => api.post(`/api/leads/${leadId}/send-email`),
  stats: () => api.get("/api/stats"),
};
