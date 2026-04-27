import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — App do Baba",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-16 px-4">
      <div>
        <p className="eyebrow">Legal</p>
        <h1 className="page-title mt-2">Política de Privacidade</h1>
        <p className="muted-copy mt-2">Última atualização: abril de 2025 · Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
      </div>

      <div className="space-y-6 text-sm leading-7 text-[--color-text-secondary]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Quem somos</h2>
          <p>
            O App do Baba é uma plataforma SaaS brasileira para gestão de ligas de futebol amador. Somos o controlador dos dados pessoais coletados por meio do serviço.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. Dados que coletamos</h2>
          <p>Coletamos os seguintes dados para operar o serviço:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-white">Dados de cadastro:</strong> nome completo e e-mail;</li>
            <li><strong className="text-white">Dados de uso:</strong> ligas criadas, partidas registradas, eventos (gols, cartões);</li>
            <li><strong className="text-white">Dados técnicos:</strong> endereço IP, tipo de dispositivo, logs de acesso.</li>
          </ul>
          <p>Não coletamos dados de pagamento diretamente — transações são processadas por provedores certificados.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. Como usamos seus dados</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Prestação e melhoria do serviço;</li>
            <li>Autenticação e segurança da conta;</li>
            <li>Comunicações relacionadas ao serviço (atualizações, alertas);</li>
            <li>Cumprimento de obrigações legais.</li>
          </ul>
          <p>Não vendemos nem compartilhamos seus dados com terceiros para fins publicitários.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Base legal (LGPD)</h2>
          <p>O tratamento dos seus dados é fundamentado em:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-white">Execução de contrato</strong> — para prestar o serviço contratado;</li>
            <li><strong className="text-white">Legítimo interesse</strong> — para segurança e melhoria do produto;</li>
            <li><strong className="text-white">Consentimento</strong> — para comunicações opcionais.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">5. Seus direitos</h2>
          <p>Pela LGPD, você tem direito a:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Acessar seus dados pessoais;</li>
            <li>Corrigir dados incompletos ou inexatos;</li>
            <li>Solicitar a exclusão dos seus dados;</li>
            <li>Revogar o consentimento a qualquer momento;</li>
            <li>Portabilidade dos dados.</li>
          </ul>
          <p>Para exercer esses direitos, entre em contato conosco pelo e-mail indicado na plataforma.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">6. Retenção de dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, os dados são anonimizados ou excluídos em até 90 dias, salvo obrigação legal de retenção.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">7. Segurança</h2>
          <p>
            Utilizamos criptografia (TLS/HTTPS), autenticação por token JWT e controle de acesso por papéis para proteger seus dados. Realizamos avaliações periódicas de segurança.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">8. Cookies</h2>
          <p>
            Usamos apenas cookies essenciais para autenticação e funcionamento do serviço. Não utilizamos cookies de rastreamento ou publicidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">9. Alterações nesta Política</h2>
          <p>
            Atualizações serão publicadas nesta página com a data de revisão. Mudanças significativas serão comunicadas por e-mail.
          </p>
        </section>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-[--color-accent-primary] hover:underline">← Voltar ao início</Link>
        <Link href="/terms" className="text-[--color-text-muted] hover:text-white transition-colors">Termos de Uso</Link>
      </div>
    </div>
  );
}
