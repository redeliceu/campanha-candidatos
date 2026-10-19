import { z } from "zod";

const vacancyCoreSchema = z
  .object({
    id: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().finite()),
    label: z.string(),
  })
  .passthrough();

export interface Vacancy {
  id: number;
  label: string;
  is_active?: 0 | 1;
  type?: 0 | 1;
  category?: { id?: number; label: string } | null;
  location?: string | null;
  description?: string | null;
  salary?: string | null;
  vacancy_link?: string | null;
}

function enumCode(value: unknown): 0 | 1 | undefined {
  if (value === 0 || value === "0" || value === false) return 0;
  if (value === 1 || value === "1" || value === true) return 1;
  return undefined;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function relatedLabel(value: unknown): Vacancy["category"] | undefined {
  if (value === null) return null;
  if (typeof value !== "object" || value === null || !("label" in value) || typeof value.label !== "string") {
    return undefined;
  }

  const id = "id" in value ? Number(value.id) : undefined;
  return {
    label: value.label,
    ...(id !== undefined && Number.isFinite(id) ? { id } : {}),
  };
}

function normalizeVacancy(value: unknown): Vacancy | null {
  const result = vacancyCoreSchema.safeParse(value);
  if (!result.success) return null;

  const raw = result.data;
  const status = enumCode(raw.is_active);
  const type = enumCode(raw.type);
  const category = relatedLabel(raw.category);
  const location = nullableString(raw.location);
  const description = nullableString(raw.description);
  const salary = nullableString(raw.salary);
  const vacancyLink = nullableString(raw.vacancy_link);

  return {
    id: raw.id,
    label: raw.label,
    ...(status !== undefined ? { is_active: status } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(salary !== undefined ? { salary } : {}),
    ...(vacancyLink !== undefined ? { vacancy_link: vacancyLink } : {}),
  };
}

function extractVacancyRecords(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object" || payload === null || !("data" in payload)) return null;

  const { data } = payload;
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null && "data" in data && Array.isArray(data.data)) {
    return data.data;
  }
  return null;
}

export async function fetchVacancies(): Promise<Vacancy[]> {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error("A variável VITE_API_URL não está configurada.");
  }

  const response = await fetch(`${apiUrl}/vacancies`);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar as vagas (HTTP ${response.status}).`);
  }

  const payload: unknown = await response.json();
  const records = extractVacancyRecords(payload);
  if (!records) {
    const keys = typeof payload === "object" && payload !== null ? Object.keys(payload).join(", ") : typeof payload;
    throw new Error(`Resposta da API de vagas inválida. Esperava uma lista em "data"; recebido: ${keys || "vazio"}.`);
  }

  const vacancies = records.flatMap((record, index) => {
    const vacancy = normalizeVacancy(record);
    if (!vacancy) {
      console.warn(`A vaga no índice ${index} foi ignorada: id ou label ausente/inválido.`);
      return [];
    }
    return vacancy.is_active === 0 ? [] : [vacancy];
  });

  if (records.length > 0 && vacancies.length === 0) {
    throw new Error("A API retornou vagas, mas nenhuma possui id e label válidos.");
  }

  return vacancies;
}

export function getEmploymentType(type: Vacancy["type"]): string {
  if (type === undefined) return "Tipo não informado";
  return type === 0 ? "CLT" : "PJ";
}

export function getVacancyDescriptionText(description: string | null | undefined): string {
  return (description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
