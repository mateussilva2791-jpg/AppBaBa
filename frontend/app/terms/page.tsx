import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — App do Baba",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-16 px-4">
      <div>
        <p className="eyebrow">Legal</p>
        <h1 className="page-title mt-2">Termos de Uso</h1>
        <p className="muted-copy mt-2">Última atualização: abril de 2025</p>
      </div>

      <div className="space-y-6 text-sm leading-7 text-[--color-text-secondary]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou usar o App do Baba, você concorda com estes Termos de Uso. Se não concordar com alguma parte, não utilize o serviço.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. Descrição do Serviço</h2>
          <p>
            O App do Baba é uma plataforma SaaS para organização e gestão de ligas de futebol amador (babas). Oferece funcionalidades como sorteio de times, operação ao vivo, ranking e histórico de partidas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. Uso Permitido</h2>
          <p>Você concorda em usar o serviço apenas para fins lícitos e de acordo com estes Termos. É proibido:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Usar o serviço para atividades ilegais;</li>
            <li>Tentar acessar contas de outros usuários;</li>
            <li>Sobrecarregar ou prejudicar a infraestrutura do serviço;</li>
            <li>Revender o acesso ao serviço sem autorização.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Contas de Usuário</h2>
          <p>
            Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">5. Planos e Pagamentos</h2>
          <p>
            O plano Gratuito está disponível sem custo. Planos pagos são cobrados mensalmente conforme os valores exibidos na página de preços. Cancelamentos podem ser feitos a qualquer momento, com efeito no próximo ciclo de cobrança.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">6. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo da plataforma (código, design, marca) é de propriedade do App do Baba. Os dados inseridos por você (jogadores, ligas, partidas) permanecem de sua propriedade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">7. Limitação de Responsabilidade</h2>
          <p>
            O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta. Não somos responsáveis por perdas indiretas decorrentes do uso ou impossibilidade de uso do serviço.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">8. Alterações nos Termos</h2>
          <p>
            Podemos atualizar estes Termos a qualquer momento. Notificaremos usuários ativos por e-mail sobre mudanças significativas. O uso continuado do serviço após as alterações implica aceitação dos novos termos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">9. Contato</h2>
          <p>
            Dúvidas sobre estes Termos? Entre em contato pelo e-mail indicado na plataforma.
          </p>
        </section>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-[--color-accent-primary] hover:underline">← Voltar ao início</Link>
        <Link href="/privacy" className="text-[--color-text-muted] hover:text-white transition-colors">Política de Privacidade</Link>
      </div>
    </div>
  );
}
