import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VacancyDescription from "../components/VacancyDescription";
import { fetchVacancies, getEmploymentType } from "../lib/vacancies";
import { lookupCep } from "../lib/viaCep";
import { formatBRLCurrency, normalizeBRLCurrency } from "../lib/currency";

describe("vacancy API data", () => {
  const mockedFetch = vi.fn();

  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://jobs.example/api");
    vi.stubGlobal("fetch", mockedFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mockedFetch.mockReset();
  });

  it("loads active vacancies from the API and omits inactive records", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 49,
            label: "Inspetor de Alunos",
            is_active: 1,
            type: 0,
            salary: "2090.00",
            location: null,
            description: "<p>Descrição real da vaga</p>",
            category: { id: 4, label: "Pedagógico" },
          },
          { id: 50, label: "Vaga encerrada", is_active: 0, type: 1 },
        ],
      }),
    });

    const vacancies = await fetchVacancies();

    expect(mockedFetch).toHaveBeenCalledWith("https://jobs.example/api/vacancies");
    expect(vacancies).toHaveLength(1);
    expect(vacancies[0]).toMatchObject({
      id: 49,
      label: "Inspetor de Alunos",
      type: 0,
      salary: "2090.00",
      location: null,
      category: { label: "Pedagógico" },
    });
  });

  it("accepts legacy numeric fields serialized as strings and boolean active flags", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "49", label: "Vaga ativa", is_active: "1", type: "0", category: { id: "4", label: "Pedagógico" } },
          { id: 50, label: "Vaga inativa", is_active: false, type: 1 },
        ],
      }),
    });

    const vacancies = await fetchVacancies();

    expect(vacancies).toHaveLength(1);
    expect(vacancies[0]).toMatchObject({ id: 49, is_active: 1, type: 0 });
  });

  it("does not reject a usable vacancy because unrelated API fields have different shapes", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 49,
            label: "Inspetor de Alunos",
            status: { id: 1, label: "ALINHAMENTO", updated_by: { id: 2 } },
            is_active: 1,
            category_id: "4",
            salary: 2090,
            description: "<p>Responsabilidades</p>",
            location: null,
            type: "0",
            active_update: { updated_by: "RH" },
            category: { id: "4", label: "Pedagógico", custom_metadata: ["extra"] },
          },
        ],
      }),
    });

    await expect(fetchVacancies()).resolves.toMatchObject([
      {
        id: 49,
        label: "Inspetor de Alunos",
        is_active: 1,
        type: 0,
        salary: "2090",
        location: null,
        category: { id: 4, label: "Pedagógico" },
      },
    ]);
  });

  it("maps the API employment codes", () => {
    expect(getEmploymentType(0)).toBe("CLT");
    expect(getEmploymentType(1)).toBe("PJ");
  });

  it("formats and serializes salary intention as Brazilian currency", () => {
    expect(formatBRLCurrency("500000")).toBe("R$ 5.000,00");
    expect(normalizeBRLCurrency("R$ 5.000,00")).toBe("5000.00");
    expect(formatBRLCurrency("")).toBe("");
  });

  it("renders API descriptions as safe formatted content", () => {
    const { container } = render(
      <VacancyDescription html={'<p>Atividades<br>diárias</p><script>alert("x")</script><a href="javascript:alert(1)">detalhes</a>'} />,
    );

    expect(container.querySelector("p")?.textContent).toBe("Atividadesdiárias");
    expect(screen.getByText("detalhes").closest("a")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("reports unsuccessful API responses", async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(fetchVacancies()).rejects.toThrow("HTTP 503");
  });

  it("looks up a valid CEP and returns city and neighborhood", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ localidade: "Itaquaquecetuba", bairro: "Centro" }),
    });

    await expect(lookupCep("08570-000")).resolves.toEqual({
      city: "Itaquaquecetuba",
      neighborhood: "Centro",
    });
    expect(mockedFetch).toHaveBeenCalledWith("https://viacep.com.br/ws/08570000/json/");
  });

  it("reports CEPs that ViaCEP does not recognize", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    });

    await expect(lookupCep("00000-000")).rejects.toThrow("CEP não encontrado");
  });
});
