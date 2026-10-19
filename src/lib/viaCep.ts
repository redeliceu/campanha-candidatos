import { z } from "zod";

const viaCepResponseSchema = z.object({
  bairro: z.string().optional(),
  erro: z.boolean().optional(),
  localidade: z.string().optional(),
});

export async function lookupCep(cep: string): Promise<{ city: string; neighborhood: string }> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new Error("Informe um CEP com 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    throw new Error(`O serviço de CEP respondeu com HTTP ${response.status}.`);
  }

  const result = viaCepResponseSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error("A resposta do serviço de CEP está em um formato inesperado.");
  }
  if (result.data.erro || !result.data.localidade) {
    throw new Error("CEP não encontrado. Informe cidade e bairro manualmente.");
  }

  return {
    city: result.data.localidade,
    neighborhood: result.data.bairro ?? "",
  };
}
