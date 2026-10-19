import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { fetchVacancies, getEmploymentType, getVacancyDescriptionText, type Vacancy } from "@/lib/vacancies";
import whiteLogo from "@/assets/rede-liceu-white-cropped.png";

const EMPTY_VACANCIES: Vacancy[] = [];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function Vagas() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const vacanciesQuery = useQuery({
    queryKey: ["vacancies"],
    queryFn: fetchVacancies,
    staleTime: 60_000,
  });
  const vacancies = vacanciesQuery.data ?? EMPTY_VACANCIES;
  const categories = useMemo(
    () => ["Todas", ...new Set(vacancies.map((vacancy) => vacancy.category?.label).filter((label): label is string => Boolean(label)))],
    [vacancies],
  );
  const filteredVacancies = useMemo(() => {
    const terms = normalize(search.trim()).split(/\s+/).filter(Boolean);
    return vacancies.filter((vacancy) => {
      if (category !== "Todas" && vacancy.category?.label !== category) return false;

      const searchable = normalize([
        vacancy.label,
        vacancy.category?.label ?? "",
        vacancy.location ?? "",
        getEmploymentType(vacancy.type),
        getVacancyDescriptionText(vacancy.description),
      ].join(" "));
      return terms.every((term) => searchable.includes(term));
    });
  }, [category, search, vacancies]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="jobs-hero">
          <div className="w hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Trabalhe conosco</p>
              <h1>
                Faça parte de uma rede que <em>transforma</em> vidas.
              </h1>
              <p>
                Para quem quer fazer a diferença na educação de milhares de alunos.
              </p>
              <form className="hero-search" onSubmit={(event) => {
                event.preventDefault();
                document.getElementById("vagas")?.scrollIntoView({ behavior: "smooth" });
              }}>
                <input
                  aria-label="Buscar vaga"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar vaga: cargo, área ou local"
                  type="search"
                  value={search}
                />
                <button aria-label="Buscar vaga" type="submit"><Search size={18} /></button>
              </form>
              <HeroStats />
            </div>
            <div className="hero-logo-wrap">
              <img alt="Rede Liceu" className="hero-logo" src={whiteLogo} />
            </div>
          </div>
        </section>

        <section className="sec" id="vagas">
          <div className="w">
            <div>
              <p className="eyebrow eyebrow-light">Oportunidades</p>
              <h2>Vagas <em>abertas</em></h2>
              <p className="lead">Escolha uma vaga para ver detalhes, requisitos e benefícios.</p>
            </div>
            <div className="jobs-search sb l">
              <Search aria-hidden="true" className="text-muted-foreground" size={18} />
              <input
                aria-label="Buscar vagas"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar vaga: cargo, área ou local"
                type="search"
                value={search}
              />
            </div>

            {categories.length > 1 && (
              <div aria-label="Filtrar vagas por área" className="chips">
                {categories.map((item) => (
                  <button
                    aria-pressed={category === item}
                    className={`chip ${category === item ? "chip-active" : ""}`}
                    key={item}
                    onClick={() => setCategory(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {vacanciesQuery.isPending && (
              <div aria-live="polite" className="lead">Carregando vagas...</div>
            )}

            {vacanciesQuery.isError && (
              <div className="vacancy-error" role="alert">
                <h3>Não foi possível carregar as vagas.</h3>
                <p>{vacanciesQuery.error.message}</p>
                <Button className="mt-4" onClick={() => void vacanciesQuery.refetch()} variant="outline">Tentar novamente</Button>
              </div>
            )}

            {vacanciesQuery.isSuccess && filteredVacancies.length === 0 && (
              <p className="lead">
                {vacancies.length === 0 ? "Não há vagas abertas no momento." : "Nenhuma vaga encontrada para essa busca."}
              </p>
            )}

            {filteredVacancies.length > 0 && (
              <div className="grid vacancy-grid">
                {filteredVacancies.map((vacancy, index) => (
                  <VacancyCard index={index} key={vacancy.id} vacancy={vacancy} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="about-section" id="sobre">
          <div className="w">
            <div>
              <p className="eyebrow eyebrow-light">Quem somos</p>
              <h2>Juntos,<em> evoluímos</em> pessoas através da<em> educação</em>.</h2>
              <p className="lead">Nenhuma escola funciona sozinha. Por trás de cada aula, há uma equipe inteira, da sala de aula aos bastidores, trabalhando para que tudo aconteça.</p>
            </div>
            <div className="segment-grid">
              <SegmentCard number="" title="Trabalho em equipe" description="Times que se apoiam, com processos claros." />
              <SegmentCard number="" title="Desafios reais" description="Seu trabalho aparece no dia a dia de cada aluno." />
              <SegmentCard number="" title="Espaço para crescer" description="Oportunidades em diferentes áreas e unidades da Rede." />
              <SegmentCard number="" title="Perto de você" description="Unidades em Itaquá, Suzano e região." />
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="w site-footer-inner">
          <div>
            <img alt="Rede Liceu" className="footer-logo" src={whiteLogo} />
            <p>Educação Infantil, Fundamental, Médio e Profissionalizante.</p>
          </div>
          <p>Oportunidades para transformar vidas.</p>
        </div>
      </footer>
    </>
  );
}

function HeroStats() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setCount(1);
      return;
    }

    const duration = 1_000;
    let animationFrame = 0;
    let startTime: number | undefined;
    const animate = (timestamp: number) => {
      startTime ??= timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(1 - Math.pow(1 - progress, 3));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const format = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value * count));

  return (
    <div aria-label="A Rede Liceu em números: mais de 15 anos de mercado e mais de 20 mil alunos" className="hero-stats" role="group">
      <div className="hero-stat" aria-hidden="true">
        <strong>+{format(15)}</strong>
        <span>anos formando alunos</span>
      </div>
      <div className="hero-stat" aria-hidden="true">
        <strong>+{format(20_000)}</strong>
        <span>alunos</span>
      </div>
    </div>
  );
}

function VacancyCard({ vacancy, index }: { vacancy: Vacancy; index: number }) {
  return (
    <Link className="job" style={{ animationDelay: `${index * 0.06}s` }} to={`/vagas/${vacancy.id}`}>
      <span className="tag">
        {vacancy.category?.label ?? "Oportunidade"}
      </span>
      <h3>{vacancy.label}</h3>
      <div className="job-meta">
        {vacancy.location && <span><MapPin size={15} />{vacancy.location}</span>}
        <span>{getEmploymentType(vacancy.type)}</span>
      </div>
      <span className="job-link">
        Ver detalhes <span className="arrow"><ArrowRight size={17} /></span>
      </span>
    </Link>
  );
}

function SegmentCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <article className="segment-card">
      <small>{number}</small>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
