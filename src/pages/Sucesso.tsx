import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const Sucesso = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-6 sm:p-10 text-center">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-14 h-14 text-green-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-primary mb-2">Cadastro enviado com sucesso!</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          Agradecemos sua candidatura. Seu currículo foi recebido e será analisado pela nossa equipe.
          Caso seu perfil seja compatível com alguma vaga, entraremos em contato.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-95">
            Voltar ao início
          </Link>
          <Link to="/" className="px-4 py-3 border border-border rounded-lg text-sm text-foreground hover:bg-accent/30">
            Fechar
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sucesso;
