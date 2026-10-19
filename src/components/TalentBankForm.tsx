import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Send } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { fetchVacancies, type Vacancy } from "@/lib/vacancies";
import { lookupCep } from "@/lib/viaCep";
import whiteLogo from "@/assets/rede-liceu-white-cropped.png";
import { formatBRLCurrency, normalizeBRLCurrency } from "@/lib/currency";

// Schema de validação com Zod
const formSchema = z.object({
  vaga: z.number({
    required_error: "Selecione uma vaga",
  }),
  vagaOutro: z.string().optional(),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  sobrenome: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  telefone: z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone deve ter pelo menos 10 dígitos"),
  email: z.string().email("Email inválido"),
  localidade: z.string().optional(),
  bairroZonaLeste: z.string().optional(),
  linkedin: z.string().url("URL do LinkedIn inválida").optional().or(z.literal("")),
  jaParticipou: z.string().min(1, "Indique se já participou de processo seletivo"),
  possuiExperiencia: z.string().min(1, "Indique se possui experiência"),
  pretensaoSalarial: z.string().optional().refine(
    (value) => !value || normalizeBRLCurrency(value).length > 0,
    "Informe uma pretensão salarial válida"
  ),
  disponibilidade: z.string().min(1, "Informe sua disponibilidade"),
  curriculo: z
  .any()
  .refine((file) => file instanceof File, "O currículo é obrigatório")
  .refine((file) => file?.size > 0, "O currículo é obrigatório")
  .refine((file) => file?.size <= 10 * 1024 * 1024, "O currículo deve ter no máximo 10MB"),
  utm_source: z.string().max(255).optional(),
  utm_medium: z.string().max(255).optional(),
  utm_campaign: z.string().max(255).optional(),
  utm_term: z.string().max(255).optional(),
  utm_content: z.string().max(255).optional(),
  gclid: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
  msclkid: z.string().max(255).optional(),
  referrer: z.string().optional(),
  landing_page: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

const normalizePhone = (value: string) => value.replace(/\D/g, "");
const normalizeCep = (value: string) => value.replace(/\D/g, "").slice(0, 8);

const formatCep = (value: string) => {
  const digits = normalizeCep(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const formatPhone = (value: string) => {
  const digits = normalizePhone(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const EMPTY_VACANCIES: Vacancy[] = [];

export default function TalentBankForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { vacancyId } = useParams();
  const [vaga, setVaga] = useState<number | null>(() => {
    const parsed = Number(vacancyId);
    return vacancyId && Number.isInteger(parsed) ? parsed : null;
  });
  const [vagaOutro, setVagaOutro] = useState("");
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [bairroZonaLeste, setBairroZonaLeste] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [jaParticipou, setJaParticipou] = useState("");
  const [possuiExperiencia, setPossuiExperiencia] = useState("");
  const [pretensaoSalarial, setPretensaoSalarial] = useState("");
  const [disponibilidade, setDisponibilidade] = useState("");
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [utm_source, setUtmSource] = useState("");
  const [utm_medium, setUtmMedium] = useState("");
  const [utm_campaign, setUtmCampaign] = useState("");
  const [utm_term, setUtmTerm] = useState("");
  const [utm_content, setUtmContent] = useState("");
  const [gclid, setGclid] = useState("");
  const [fbclid, setFbclid] = useState("");
  const [msclkid, setMsclkid] = useState("");
  const [referrer, setReferrer] = useState("");
  const [landing_page, setLandingPage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const vacanciesQuery = useQuery({
    queryKey: ["vacancies"],
    queryFn: fetchVacancies,
    staleTime: 60_000,
  });
  const vacancies = vacanciesQuery.data ?? EMPTY_VACANCIES;
  const selectedVacancy = vacancies.find((vacancy) => vacancy.id === vaga);
  const selectedVacancyUnavailable = Boolean(vacancyId)
    && !vacanciesQuery.isPending
    && !vacanciesQuery.isError
    && !vacancies.some((vacancy) => vacancy.id === Number(vacancyId));

  const trackEvent = (event: string, data: Record<string, unknown> = {}) => {
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (fbq) {
      fbq('track', event, data);
    }
  };

  useEffect(() => {
    if (!vacancyId) return;
    const requestedId = Number(vacancyId);
    setVaga(vacancies.find((vacancy) => vacancy.id === requestedId)?.id ?? null);
  }, [vacancyId, vacancies]);

  // Limpar erros após 3 segundos com animação suave
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const timer = setTimeout(() => {
        setErrors({});
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  useEffect(() => {
    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
    ];

    const params = new URLSearchParams(window.location.search);
    const values: Record<string, string> = {};

    utmKeys.forEach((key) => {
      const val = params.get(key);
      if (val) {
        localStorage.setItem(key, val);
        values[key] = val;
      }
    });

    utmKeys.forEach((key) => {
      const stored = values[key] || localStorage.getItem(key) || "";
      if (!stored) {
        return;
      }
      switch (key) {
        case "utm_source":
          setUtmSource(stored);
          break;
        case "utm_medium":
          setUtmMedium(stored);
          break;
        case "utm_campaign":
          setUtmCampaign(stored);
          break;
        case "utm_term":
          setUtmTerm(stored);
          break;
        case "utm_content":
          setUtmContent(stored);
          break;
        case "gclid":
          setGclid(stored);
          break;
        case "fbclid":
          setFbclid(stored);
          break;
        case "msclkid":
          setMsclkid(stored);
          break;
      }
    });

    setReferrer(document.referrer || "");
    setLandingPage(window.location.href.split(".br/")[0] + ".br/");
  }, []);

  const handleCepLookup = async () => {
    const cepDigits = normalizeCep(cep);
    if (cepDigits.length !== 8) {
      setCepMessage("Informe um CEP com 8 dígitos.");
      return;
    }

    setCepLoading(true);
    setCepMessage("");
    try {
      const address = await lookupCep(cepDigits);
      setLocalidade(address.city);
      setBairroZonaLeste(address.neighborhood);
      setCepMessage("Cidade e bairro preenchidos pelo CEP.");
    } catch (error) {
      console.error("Não foi possível consultar o CEP:", error);
      setCepMessage(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const telefoneRaw = normalizePhone(telefone);

    // Validar com Zod
    try {
      const formData: FormData = {
        vaga,
        vagaOutro,
        nome,
        sobrenome,
        telefone: telefoneRaw,
        email,
        localidade,
        bairroZonaLeste,
        linkedin,
        jaParticipou,
        possuiExperiencia,
        pretensaoSalarial,
        disponibilidade,
        curriculo,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        gclid,
        fbclid,
        msclkid,
        referrer,
        landing_page,
      };

      formSchema.parse(formData);
      setErrors({}); // Limpar erros anteriores
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Obter apenas o primeiro erro
        const firstError = error.errors[0];
        const path = firstError.path[0] as string;
        setErrors({ [path]: firstError.message });

        // Mostrar alerta com apenas o primeiro erro
        toast({
          title: "Campo inválido",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      let curriculo_url: string | null = null;

      // Upload do currículo se houver
      if (curriculo) {
        const formData = new FormData();
        const fileExt = curriculo.name.split(".").pop();
        const fileName = `${Date.now()}_${nome.trim()}_${sobrenome.trim()}.${fileExt}`;
        
        formData.append("file", curriculo, fileName);

        const uploadRes = await fetch(import.meta.env.VITE_API_URL + "/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Erro ao enviar currículo");
        }

        const uploadData = (await uploadRes.json()) as {
          path?: string;
          fileName?: string;
        };

        curriculo_url = uploadData.path || null;

        const payload = {
          name: nome.trim() + " " + sobrenome.trim(),
          job_name: vacancies.find(v => v.id === vaga)?.label || vagaOutro.trim() || "Não informado",
          vacancy_id: vagaOutro ? vagaOutro.trim() : vaga,
          number_phone: telefoneRaw,
          email: email.trim(),
          location: localidade.trim(),
          neighborhood: bairroZonaLeste.trim() || null,
          linkedin_url: linkedin.trim(),
          has_previous_application: jaParticipou.trim() === "Sim",
          has_experience: possuiExperiencia.trim() === "Sim",
          salary_intention: normalizeBRLCurrency(pretensaoSalarial) || null,
          starts: disponibilidade.trim(),
          cv_url: curriculo_url,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_term: utm_term || null,
          utm_content: utm_content || null,
          gclid: gclid || null,
          fbclid: fbclid || null,
          msclkid: msclkid || null,
          referrer: referrer || null,
          landing_page: landing_page || null,
        };

        const applicationRes = await fetch(import.meta.env.VITE_API_URL + "/application", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!applicationRes.ok) {
          const cleanupBody: Record<string, string> = {};
          if (uploadData?.fileName) cleanupBody.fileName = uploadData.fileName;
          if (uploadData?.path) cleanupBody.path = uploadData.path;

          if (Object.keys(cleanupBody).length > 0) {
            await fetch(import.meta.env.VITE_API_URL + "/upload", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanupBody),
            }).catch(() => {
              // Ignore cleanup errors, original submission error is more important.
            });
          }

          throw new Error("Erro ao enviar cadastro");
        }

        trackEvent("Lead", {
          name: payload.name,
          email: payload.email,
          job_name: payload.job_name,
          localidade: payload.location,
        });

        // Redireciona para a tela de sucesso após tracking
        navigate("/sucesso");
      }

      toast({
        title: "Cadastro enviado!",
        description: "Seu currículo foi registrado em nosso Banco de Talentos. Entraremos em contato caso haja uma vaga compatível.",
      });

      // Reset form
      setVaga(null); setVagaOutro(""); setNome(""); setSobrenome("");
      setTelefone(""); setEmail(""); setCep(""); setCepMessage(""); setLocalidade("");
      setBairroZonaLeste(""); setLinkedin(""); setJaParticipou("");
      setPossuiExperiencia(""); setPretensaoSalarial(""); setDisponibilidade("");
      setCurriculo(null);
    } catch (err: unknown) {
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar seu cadastro. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao enviar cadastro:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O currículo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      setCurriculo(file);
    }
  };

  return (
    <>
      <SiteHeader />
      {vacancyId && (
        <section className="band">
          <div className="w">
            <Link className="back" to={`/vagas/${vacancyId}`}><ArrowLeft size={16} /> Voltar à vaga</Link>
            <h1>Quase lá. Conte um pouco <em>sobre você</em>.</h1>
          </div>
        </section>
      )}
      {!vacancyId && (
        <section className="band">
          <div className="w">
            <Link className="back" to="/"><ArrowLeft size={16} /> Voltar às vagas</Link>
            <h1>Quase lá. Conte um pouco <em>sobre você</em>.</h1>
          </div>
        </section>
      )}
      <main className="fw">
        {selectedVacancy && (
          <div className="sel">
            <div><small>Vaga selecionada</small><strong>{selectedVacancy.label}</strong></div>
          </div>
        )}

        {vacanciesQuery.isError && (
          <div className="vacancy-error" role="alert">
            <h3>Não foi possível carregar as vagas.</h3>
            <p>{vacanciesQuery.error.message}</p>
          </div>
        )}
        {selectedVacancyUnavailable && (
          <div className="vacancy-error" role="alert">
            Esta vaga não está mais aberta ou não foi encontrada. <Link className="font-semibold underline" to="/">Voltar às vagas</Link>
          </div>
        )}

            <form onSubmit={handleSubmit}>
              {!vacancyId && (
                <section className="grp">
                  <h3><small>VAGA</small>Qual vaga você deseja aplicar?</h3>
                  <div className="f">
                    <RadioGroup value={vaga?.toString() ?? ""} onValueChange={(value) => setVaga(parseInt(value))}>
                      {vacanciesQuery.isPending && <p>Carregando vagas...</p>}
                      {!vacanciesQuery.isPending && !vacanciesQuery.isError && vacancies.length === 0 && <p>Não há vagas abertas no momento.</p>}
                      {vacancies.map((vacancy) => (
                        <label className="opt" key={vacancy.id}>
                          <RadioGroupItem value={vacancy.id.toString()} />
                          {vacancy.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </section>
              )}
              <section className="grp">
                <h3><small>PASSO 1</small>Dados pessoais</h3>
              {/* 2. Nome */}
              <FormSection label="Nome completo" required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Nome</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="bg-background" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Sobrenome</Label>
                    <Input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} placeholder="Seu sobrenome" className="bg-background" />
                  </div>
                </div>
              </FormSection>

              {/* 3. Telefone */}
              <FormSection label="Número de telefone" required>
                <div className="ph">
                  <span className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-lg text-sm font-medium text-foreground border border-border shrink-0">
                    🇧🇷 +55
                  </span>
                  <Input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-0000"
                    className="bg-background"
                  />
                </div>
              </FormSection>

              {/* 4. Email */}
              <FormSection label="Endereço de email" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-background"
                />
              </FormSection>

              {/* 5. CEP e localidade */}
              <FormSection label="Localidade (CEP)">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    aria-label="CEP"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={9}
                    onChange={(event) => {
                      setCep(formatCep(event.target.value));
                      setLocalidade("");
                      setBairroZonaLeste("");
                      setCepMessage("");
                    }}
                    placeholder="00000-000"
                    value={cep}
                  />
                  <Button disabled={cepLoading || normalizeCep(cep).length !== 8} onClick={() => void handleCepLookup()} type="button" variant="outline">
                    {cepLoading ? "Consultando..." : "Buscar CEP"}
                  </Button>
                </div>
                {cepMessage && <p aria-live="polite" className="text-sm text-muted-foreground">{cepMessage}</p>}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    aria-label="Cidade"
                    autoComplete="address-level2"
                    onChange={(event) => setLocalidade(event.target.value)}
                    placeholder="Cidade"
                    value={localidade}
                  />
                  <Input
                    aria-label="Bairro"
                    autoComplete="address-level3"
                    onChange={(event) => setBairroZonaLeste(event.target.value)}
                    placeholder="Bairro"
                    value={bairroZonaLeste}
                  />
                </div>
              </FormSection>

              {/* 6. LinkedIn */}
              <FormSection label="Página do LinkedIn">
                <Input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/seu-perfil"
                  className="bg-background"
                />
              </FormSection>
              </section>

              <section className="grp">
                <h3><small>PASSO 2</small>Perfil profissional</h3>
              {/* 7. Já participou */}
              <FormSection label="Já participou de algum processo seletivo conosco?" required>
                <RadioGroup value={jaParticipou} onValueChange={setJaParticipou} className="flex gap-3">
                  {["Sim", "Não"].map((opt) => (
                    <label
                      key={opt}
                      className="opt"
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormSection>

              {/* 8. Experiência */}
              <FormSection label="Possui experiência para a vaga desejada?" required>
                <RadioGroup value={possuiExperiencia} onValueChange={setPossuiExperiencia} className="flex gap-3">
                  {["Sim", "Não"].map((opt) => (
                    <label
                      key={opt}
                      className="opt"
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormSection>

              {/* 9. Pretensão Salarial (MELHORIA) */}
              <FormSection label="Pretensão salarial">
                <Input
                  inputMode="decimal"
                  type="text"
                  value={pretensaoSalarial}
                  onChange={(e) => setPretensaoSalarial(formatBRLCurrency(e.target.value))}
                  placeholder="R$ 5.000,00"
                  className="bg-background"
                />
              </FormSection>

              {/* 10. Disponibilidade (MELHORIA) */}
              <FormSection label="Disponibilidade para início">
                <RadioGroup value={disponibilidade} onValueChange={setDisponibilidade} className="space-y-2">
                  {["Imediata", "15 dias", "30 dias", "A combinar"].map((opt) => (
                    <label
                      key={opt}
                      className="opt"
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormSection>
              </section>

              <section className="grp">
                <h3><small>PASSO 3</small>Currículo</h3>
              {/* 11. Currículo (OBRIGATÓRIO - MELHORIA) */}
              <div className="f">
                <Label className="block">Anexe seu currículo <i>*</i></Label>
                <label
                  className="drop"
                >
                  <Upload aria-hidden="true" className="mx-auto mb-2 h-8 w-8" />
                  {curriculo ? (
                    <strong>{curriculo.name}</strong>
                  ) : (
                    <>
                      <strong>Clique para selecionar</strong>
                      <small>PDF, DOC ou DOCX (máx. 10MB)</small>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              </section>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                disabled={submitting || vacanciesQuery.isPending || vacanciesQuery.isError || vacancies.length === 0 || selectedVacancyUnavailable}
                className="form-submit"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Enviar candidatura <span className="arrow">→</span>
                  </span>
                )}
              </Button>
            </form>
      </main>
      <footer className="site-footer">
        <div className="w site-footer-inner">
          <div>
            <img alt="Rede Liceu" className="footer-logo" src={whiteLogo} />
            <p>Educação Infantil, Fundamental, Médio e Profissionalizante.</p>
          </div>
          <p>Educação que transforma.</p>
        </div>
      </footer>
    </>
  );
}

function FormSection({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="f">
      <Label>{label} {required && <i>*</i>}</Label>
      {children}
    </div>
  );
}
