import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
//import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send, User, Phone, Mail, MapPin, Linkedin, Briefcase, FileText, AlertCircle } from "lucide-react";
import bannerImage from "@/assets/banner-liceu.webp";

const VAGAS = [
  "Gerente de Unidade - Foco em Comercial",
  "Supervisor de Recrutamento e Seleção",
  //"Diretor Pedagógico",
  "Analista Financeiro Pleno",
  "Assistente Administrativo - Apoio a Diretoria",
  "Auxiliar de Coordenação Pedagógica",
  "Auxiliar de limpeza",
  "Estágio em Pedagogia",
  "Assistente de RH",
  "Analista de RH",
  "Auxiliar Administrativo",
  "Analista de Compras JR",
  "Analista de Tráfego Pago",
  "Diretor Administrativo",
  //"Outro",
  "A disposição",
] as const;

const LOCALIDADES = [
  "Região do Alto Tietê",
  "Zona Leste de São Paulo",
  "Guarulhos, São Paulo",
  "Outro",
] as const;

// Schema de validação com Zod
const formSchema = z.object({
  vaga: z.string().min(1, "Selecione uma vaga"),
  vagaOutro: z.string().optional(),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  sobrenome: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  email: z.string().email("Email inválido"),
  localidade: z.string().optional(),
  localidadeOutro: z.string().optional(),
  bairroZonaLeste: z.string().optional(),
  linkedin: z.string().url("URL do LinkedIn inválida").optional().or(z.literal("")),
  jaParticipou: z.string().min(1, "Indique se já participou de processo seletivo"),
  possuiExperiencia: z.string().min(1, "Indique se possui experiência"),
  pretensaoSalarial: z.string().min(1, "Informe sua pretensão salarial"),
  disponibilidade: z.string().min(1, "Informe sua disponibilidade"),
  curriculo: z
  .any()
  .refine((file) => file instanceof File, "O currículo é obrigatório")
  .refine((file) => file?.size > 0, "O currículo é obrigatório")
  .refine((file) => file?.size <= 10 * 1024 * 1024, "O currículo deve ter no máximo 10MB"),
}).refine(
  (data) => data.vaga !== "Outro" || (data.vagaOutro && data.vagaOutro.trim().length > 0),
  {
    message: "Especifique a vaga desejada",
    path: ["vagaOutro"],
  }
);

type FormData = z.infer<typeof formSchema>;

export default function TalentBankForm() {
  const { toast } = useToast();
  const [vaga, setVaga] = useState("");
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
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar com Zod
    try {
      const formData: FormData = {
        vaga,
        vagaOutro,
        nome,
        sobrenome,
        telefone,
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

        const uploadData = await uploadRes.json();
        curriculo_url = uploadData.path;

        const payload = {
          name: nome.trim() + " " + sobrenome.trim(),
          job_name: vagaOutro ? vagaOutro.trim() : vaga,
          number_phone: telefone.trim(),
          email: email.trim(),
          location: localidadeOutro ? localidadeOutro.trim() : localidade,
          neighborhood: bairroZonaLeste.trim() || null,
          linkedin_url: linkedin.trim(),
          has_previous_application: jaParticipou.trim() === "Sim" ? true : false,
          has_experience: possuiExperiencia.trim() === "Sim" ? true : false,
          salary_intention: pretensaoSalarial.trim(),
          starts: disponibilidade.trim(),
          cv_url: curriculo_url,
        }

        await fetch(import.meta.env.VITE_API_URL + "/application", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }).catch(async (err) => {
          // Se der erro ao enviar os dados, tenta deletar o arquivo enviado
          if (uploadData && uploadData.fileName) {
            await fetch(import.meta.env.VITE_API_URL + "/upload", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({fileName : uploadData.fileName}),
            });
          }
          throw err; // Re-throw para ser capturado no catch externo
        });
        
      }

      toast({
        title: "Cadastro enviado!",
        description: "Seu currículo foi registrado em nosso Banco de Talentos. Entraremos em contato caso haja uma vaga compatível.",
      });

      // Reset form
      setVaga(""); setVagaOutro(""); setNome(""); setSobrenome("");
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
                <RadioGroup value={vaga} onValueChange={setVaga} className="space-y-2">
                  {VAGAS.map((v) => (
                    <label
                      key={v}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        vaga === v
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40 hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value={v} />
                      <span className="text-sm font-medium text-foreground">{v}</span>
                    </label>
                  ))}
                </RadioGroup>
                {vaga === "Outro" && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <Input
                      placeholder="Especifique a vaga desejada..."
                      value={vagaOutro}
                      onChange={(e) => setVagaOutro(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                )}
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
                    onChange={(e) => setTelefone(e.target.value)}
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
                  onChange={(e) => setPretensaoSalarial(e.target.value)}
                  placeholder="Ex: R$ 5.000,00"
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
