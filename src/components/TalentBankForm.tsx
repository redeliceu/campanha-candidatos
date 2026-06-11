import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send, User, Phone, Mail, MapPin, Linkedin, Briefcase, FileText, AlertCircle } from "lucide-react";
import bannerImage from "@/assets/banner-liceu.webp";

interface Vacancy {
  id: number;
  label: string;
  is_active: boolean;
}

const LOCALIDADES = [
  "Região do Alto Tietê",
  "Zona Leste de São Paulo",
  "Guarulhos, São Paulo",
  "Outro",
] as const;

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
  localidadeOutro: z.string().optional(),
  bairroZonaLeste: z.string().optional(),
  linkedin: z.string().url("URL do LinkedIn inválida").optional().or(z.literal("")),
  jaParticipou: z.string().min(1, "Indique se já participou de processo seletivo"),
  possuiExperiencia: z.string().min(1, "Indique se possui experiência"),
  pretensaoSalarial: z.string().min(1, "Informe sua pretensão salarial").refine(
    (value) => normalizeCurrency(value).length > 0,
    "Informe sua pretensão salarial"
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
})/* .refine(
  (data) => data.vaga !== "Outro" || (data.vagaOutro && data.vagaOutro.trim().length > 0),
  {
    message: "Especifique a vaga desejada",
    path: ["vagaOutro"],
  }
);
 */
type FormData = z.infer<typeof formSchema>;

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const formatPhone = (value: string) => {
  const digits = normalizePhone(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const normalizeCurrency = (value: string) => value.replace(/\D/g, "");

const formatCurrency = (value: string) => {
  const digits = normalizeCurrency(value);
  return digits.length > 0 ? `R$ ${digits}` : "";
};

export default function TalentBankForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<number | null>(null);
  const [vagaOutro, setVagaOutro] = useState("");
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [localidadeOutro, setLocalidadeOutro] = useState("");
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
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);

  const trackEvent = (event: string, data: Record<string, unknown> = {}) => {
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (fbq) {
      fbq('track', event, data);
    }
  };

  useEffect(() => {
    async function loadVacancies() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/vacancies`
        );

        if (!response.ok) {
          throw new Error("Erro ao buscar vagas");
        }

        const res = await response.json();

        const activeVacancies = res.data.filter(v => v.is_active === 1);

        const priorityLabels = [
          "Coordenador(a) de Recrutamento e Seleção",
          "Diretor Administrativo Escolar",
          "Auxiliar Administrativo",
          "Assistente Administrativo",
        ];

        const sorted = activeVacancies.sort((a, b) => {
          const indexA = priorityLabels.indexOf(a.label);
          const indexB = priorityLabels.indexOf(b.label);

          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }

          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          return 0;
        });

        setVacancies(sorted);

      } catch (error) {
        console.error(error);
      }
    }

    loadVacancies();
  }, []);

  // Limpar erros após 3 segundos com animação suave
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const timer = setTimeout(() => {
        setErrors({});
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  // Limpar bairroZonaLeste quando localidade mudar
  useEffect(() => {
    if (localidade !== "Zona Leste de São Paulo") {
      setBairroZonaLeste("");
    }
  }, [localidade]);

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
        localidadeOutro,
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
          location: localidadeOutro ? localidadeOutro.trim() : localidade,
          neighborhood: bairroZonaLeste.trim() || null,
          linkedin_url: linkedin.trim(),
          has_previous_application: jaParticipou.trim() === "Sim",
          has_experience: possuiExperiencia.trim() === "Sim",
          salary_intention: normalizeCurrency(pretensaoSalarial),
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
      setTelefone(""); setEmail(""); setLocalidade(""); setLocalidadeOutro("");
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
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Banner */}
        <div className="w-full overflow-hidden rounded-b-2xl shadow-lg">
          <img
            src={bannerImage}
            alt="Rede Liceu - Faça parte desta rede"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Form Card */}
        <div className="px-4 sm:px-6 -mt-4 relative z-10 pb-12">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-lg sm:text-2xl font-extrabold text-primary mb-3 text-center leading-tight">
                Venha crescer na carreira<br />e trabalhar perto de casa.
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed text-left">
                Somos o grupo educacional que mais cresce na região do Alto Tietê, com escolas de educação básica e ensino profissionalizante nas cidades de Arujá, Itaquaquecetuba, Mogi das Cruzes e Suzano. Nosso crescimento produz constantes oportunidades de carreira e geração de valor para a sociedade. Se você é apaixonado por crescimento, e acredita que é possível transformar a vida das pessoas através da educação, venha com a gente.
              </p>
              <p className="text-base sm:text-xl font-extrabold text-primary mt-3 text-center leading-tight">
                Confira nossas vagas e cadastre-se<br />em nosso banco de talentos.
              </p>
            </div>

            {/* Alert de erro */}
            {/* {Object.keys(errors).length > 0 && (
              <Alert variant="destructive" className="bg-red-200 fixed max-w-max top-10 right-8 animate-in slide-in-from-right-2 duration-300">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Campo inválido</AlertTitle>
                <AlertDescription>
                  {Object.values(errors)[0]}
                </AlertDescription>
              </Alert>
            )} */}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 1. Vaga */}
              <FormSection number={1} label="Qual vaga você deseja aplicar?" required icon={<Briefcase className="w-4 h-4" />}>
                <RadioGroup value={vaga?.toString() ?? ""} onValueChange={(value) => setVaga(parseInt(value))} className="space-y-2">
                  

                  {vacancies.map((vacancy) => (
                    <label
                      key={vacancy.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        vaga === vacancy.id
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40 hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value={vacancy.id.toString()} />
                      <span className="text-sm font-medium text-foreground">{vacancy.label}</span>
                    </label>
                  ))}
                </RadioGroup>
                {/* {vaga === "Outro" && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <Input
                      placeholder="Especifique a vaga desejada..."
                      value={vagaOutro}
                      onChange={(e) => setVagaOutro(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                )} */}
              </FormSection>

              {/* 2. Nome */}
              <FormSection number={2} label="Nome completo" required icon={<User className="w-4 h-4" />}>
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
              <FormSection number={3} label="Número de telefone" required icon={<Phone className="w-4 h-4" />}>
                <div className="flex items-center gap-2">
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
              <FormSection number={4} label="Endereço de email" required icon={<Mail className="w-4 h-4" />}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-background"
                />
              </FormSection>

              {/* 5. Localidade */}
              <FormSection number={5} label="Localidade" icon={<MapPin className="w-4 h-4" />}>
                <RadioGroup value={localidade} onValueChange={setLocalidade} className="space-y-2">
                  {LOCALIDADES.map((loc) => (
                    <div key={loc} className="space-y-0">
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          localidade === loc
                            ? "border-primary bg-accent"
                            : "border-border hover:border-primary/40 hover:bg-accent/50"
                        }`}
                      >
                        <RadioGroupItem value={loc} />
                        <span className="text-sm font-medium text-foreground">{loc}</span>
                      </label>
                      {loc === "Zona Leste de São Paulo" && localidade === "Zona Leste de São Paulo" && (
                        <div className="mt-2 ml-8 animate-in slide-in-from-top-2 duration-200">
                          <Input
                            placeholder="Informe seu bairro..."
                            value={bairroZonaLeste}
                            onChange={(e) => setBairroZonaLeste(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </RadioGroup>
                {localidade === "Outro" && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <Input
                      placeholder="Informe sua localidade..."
                      value={localidadeOutro}
                      onChange={(e) => setLocalidadeOutro(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                )}
              </FormSection>

              {/* 6. LinkedIn */}
              <FormSection number={6} label="Página do LinkedIn" icon={<Linkedin className="w-4 h-4" />}>
                <Input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/seu-perfil"
                  className="bg-background"
                />
              </FormSection>

              {/* 7. Já participou */}
              <FormSection number={7} label="Já participou de algum processo seletivo conosco?" required icon={<Briefcase className="w-4 h-4" />}>
                <RadioGroup value={jaParticipou} onValueChange={setJaParticipou} className="flex gap-3">
                  {["Sim", "Não"].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 px-5 py-3 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${
                        jaParticipou === opt
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40 hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormSection>

              {/* 8. Experiência */}
              <FormSection number={8} label="Possui experiência para a vaga desejada?" required icon={<Briefcase className="w-4 h-4" />}>
                <RadioGroup value={possuiExperiencia} onValueChange={setPossuiExperiencia} className="flex gap-3">
                  {["Sim", "Não"].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 px-5 py-3 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${
                        possuiExperiencia === opt
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40 hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormSection>

              {/* 9. Pretensão Salarial (MELHORIA) */}
              <FormSection number={9} label="Pretensão salarial" icon={<FileText className="w-4 h-4" />}>
                <Input
                  type="text"
                  value={pretensaoSalarial}
                  onChange={(e) => setPretensaoSalarial(formatCurrency(e.target.value))}
                  placeholder="R$ 5000"
                  className="bg-background"
                />
              </FormSection>

              {/* 10. Disponibilidade (MELHORIA) */}
              <FormSection number={10} label="Disponibilidade para início" icon={<FileText className="w-4 h-4" />}>
                <RadioGroup value={disponibilidade} onValueChange={setDisponibilidade} className="space-y-2">
                  {["Imediata", "15 dias", "30 dias", "A combinar"].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        disponibilidade === opt
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40 hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormSection>

              {/* 11. Currículo (OBRIGATÓRIO - MELHORIA) */}
              <FormSection number={11} label="Anexe seu currículo" icon={<Upload className="w-4 h-4" />}>
                <label
                  className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    curriculo
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  {curriculo ? (
                    <span className="text-sm font-medium text-primary">{curriculo.name}</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">Clique para selecionar</span>
                      <span className="text-xs text-muted-foreground">PDF, DOC ou DOCX (máx. 10MB)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </FormSection>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full text-base font-bold py-6 rounded-xl shadow-lg transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Enviar Cadastro
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  number,
  label,
  required,
  icon,
  children,
}: {
  number: number;
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {number}
        </span>
        {icon && <span className="text-primary">{icon}</span>}
        <span className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
      </div>
      {children}
    </div>
  );
}
