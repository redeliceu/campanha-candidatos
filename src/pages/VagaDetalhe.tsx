import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import VacancyDescription from "@/components/VacancyDescription";
import { Button } from "@/components/ui/button";
import { fetchVacancies, getEmploymentType } from "@/lib/vacancies";

export default function VagaDetalhe() {
  const { vacancyId } = useParams();
  const vacancyIdNumber = Number(vacancyId);
  const vacanciesQuery = useQuery({
    queryKey: ["vacancies"],
    queryFn: fetchVacancies,
    staleTime: 60_000,
  });
  const vacancy = vacanciesQuery.data?.find((item) => item.id === vacancyIdNumber);

  return (
    <>
      <SiteHeader />
      {vacanciesQuery.isPending ? (
        <main className="container py-16 text-muted-foreground" aria-live="polite">Carregando vaga...</main>
      ) : vacanciesQuery.isError ? (
        <main className="container py-16" role="alert">
          <h1 className="font-heading text-3xl">Não foi possível carregar esta vaga.</h1>
          <p className="mt-3 text-muted-foreground">{vacanciesQuery.error.message}</p>
          <Button asChild className="mt-6" variant="outline"><Link to="/">Voltar às vagas</Link></Button>
        </main>
      ) : !vacancy ? (
        <main className="container py-16">
          <h1 className="font-heading text-3xl">Vaga não encontrada ou não está mais aberta.</h1>
          <Button asChild className="mt-6" variant="outline"><Link to="/">Voltar às vagas</Link></Button>
        </main>
      ) : (
        <>
          <section className="band">
            <div className="w">
              <Link className="back" to="/"><ArrowLeft size={17} /> Todas as vagas</Link>
              <p className="eyebrow mt-9">{vacancy.category?.label ?? "Oportunidade"}</p>
              <h1>{vacancy.label}</h1>
              <div className="meta">
                {vacancy.location && <span><MapPin size={15} />{vacancy.location}</span>}
                <span>{getEmploymentType(vacancy.type)}</span>
              </div>
            </div>
          </section>
          <main className="w det">
            <section>
              <h3>Sobre a vaga</h3>
              <VacancyDescription html={vacancy.description} />
            </section>
            <aside className="side">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-primary">Interessou?</span>
              <h3>Faça parte do time</h3>
              <dl>
                {vacancy.location && <div><dt>Localidade</dt><dd>{vacancy.location}</dd></div>}
                <div><dt>Contratação</dt><dd>{getEmploymentType(vacancy.type)}</dd></div>
              </dl>
              <Button asChild className="button-gold mt-7 w-full" size="lg">
                <Link to={`/candidatar/${vacancy.id}`}>Candidatar-se <ArrowUpRight className="ml-2" size={18} /></Link>
              </Button>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><BriefcaseBusiness size={14} /> Código da vaga: {vacancy.id}</p>
            </aside>
          </main>
        </>
      )}
    </>
  );
}
