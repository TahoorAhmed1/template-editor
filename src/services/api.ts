import axios from "axios";

const BASE_URL: string = `https://omnishare.ai/server/api`;

export const API: any = axios.create({
  baseURL: BASE_URL,
});

API.saveTemplate = (data) => API.post("/client/template", data);
API.updateTemplate = (id: string, data) =>
  API.patch(`/client/template/${id}`, data);
API.deleteTemplate = (id: string) => API.delete(`/client/template/${id}`);
API.listTemplates = (dimension: string) =>
  API.get(`/client/template?dimension=${dimension}`);
API.listGlobalTemplates = (dimension: string) =>
  API.get(`/client/template/global?dimension=${dimension}`);
