import { useLayoutEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Sucesso from "./pages/Sucesso.tsx";
import NotFound from "./pages/NotFound.tsx";
import Vagas from "./pages/Vagas.tsx";
import VagaDetalhe from "./pages/VagaDetalhe.tsx";
import TalentBankForm from "./components/TalentBankForm.tsx";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Vagas />} />
          <Route path="/vagas/:vacancyId" element={<VagaDetalhe />} />
          <Route path="/candidatar/:vacancyId" element={<TalentBankForm />} />
          <Route path="/banco-de-talentos" element={<Index />} />
          <Route path="/sucesso" element={<Sucesso />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
