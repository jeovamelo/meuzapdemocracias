import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/whatsapp-validado')({
  component: WhatsappValidadoPage,
});

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') ? `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}` : digits;
}

function WhatsappValidadoPage() {
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('whatsapp') || '';
    const normalized = value.replace(/\D/g, '');
    if (normalized) {
      localStorage.setItem('democracias_whatsapp_validated', normalized);
      localStorage.setItem('democracias_whatsapp_validation_phone', normalized);
      setPhone(normalized);
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-white border border-emerald-200 shadow-xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">WhatsApp validado</h1>
        <p className="mt-3 text-slate-600">
          O WhatsApp <strong>{formatPhone(phone)}</strong> foi validado com sucesso.
        </p>
        <p className="mt-5 text-sm text-slate-500">Você já pode retornar à tela de cadastro e continuar.</p>
      </section>
    </main>
  );
}
