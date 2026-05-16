import React, { useState } from 'react';
import { Target, MapPin, Search, Phone, Globe, Star, Map, AlertCircle, Building2, TrendingUp, CheckCircle2, Navigation, Loader2, MessageCircle } from 'lucide-react';

function formatWhatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  const whatsappNumber = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${whatsappNumber}`;
}

interface Lead {
  nome: string;
  endereco: string;
  telefone: string;
  website: string;
  avaliacao: number;
  numAvaliacoes: number;
  temGMN: boolean;
  gmnFraco: boolean;
  googleMapsUrl: string;
  scoreOportunidade: number;
  justificativaScore: string;
}

export default function App() {
  const [nicho, setNicho] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const prospectar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicho || !localizacao) return;

    setLoading(true);
    setError('');
    
    try {
      const resp = await fetch('/api/prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho, localizacao })
      });
      
      const responseData = await resp.json();
      
      if (!resp.ok) {
        throw new Error(responseData.error || 'Erro na resposta do servidor.');
      }

      if (responseData.text) {
        let text = responseData.text.trim();
        // Remove markdown formatting if the model wrapped it in ```json...```
        if (text.startsWith('```')) {
          text = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        }
        
        try {
          const data = JSON.parse(text);
          if (data.leads && data.leads.length > 0) {
            setLeads(data.leads.sort((a: Lead, b: Lead) => b.scoreOportunidade - a.scoreOportunidade));
          } else {
            setError('Nenhum lead retornado pela busca. Tente reformular os termos.');
          }
        } catch (e) {
          setError('A resposta não estava no formato JSON esperado.');
        }
      } else {
        setError('Nenhuma resposta retornada. A busca pode ter falhado.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Ocorreu um erro ao processar a requisição de inteligência B2B.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-400';
    return 'bg-slate-400';
  };

  const mediaScore = leads.length > 0 
    ? Math.round(leads.reduce((acc, l) => acc + l.scoreOportunidade, 0) / leads.length) 
    : 0;

  const sortedLeads = [...leads].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.scoreOportunidade - a.scoreOportunidade;
    } else {
      return a.scoreOportunidade - b.scoreOportunidade;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 relative z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">P</span>
          </div>
          <span className="text-slate-900 font-bold text-lg uppercase tracking-tight hidden sm:inline">B2B <span className="text-blue-600 font-black">Prospector</span></span>
          <span className="ml-2 sm:ml-4 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 uppercase">Commercial Intel v2.4</span>
        </div>
      </header>

      {/* Control Panel / Main Content Container */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-start gap-8">
        
        {/* Top Analysis Bar */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2 text-blue-500" />
            Nova Prospecção
          </h2>
          <form onSubmit={prospectar} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="nicho" className="block text-sm font-medium text-slate-600 mb-1">Nicho / Setor Comercial</label>
              <div className="relative">
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="nicho"
                  type="text"
                  placeholder="Ex: Clínicas Odontológicas"
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="localizacao" className="block text-sm font-medium text-slate-600 mb-1">Localização Alvo</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="localizacao"
                  type="text"
                  placeholder="Ex: Curitiba, PR ou Zona Sul de SP"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !nicho || !localizacao}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm flex-shrink-0 flex items-center justify-center w-full md:w-auto transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mapeando...
                </>
              ) : (
                'Nova Busca'
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-start text-sm">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Loading State Overlay / Empty State */}
        {loading && leads.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-pulse"></div>
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 absolute top-0 left-0" />
            </div>
            <h3 className="text-xl font-medium text-slate-700 mt-6 mb-2">Analisando Presença Digital...</h3>
            <p className="text-slate-500 text-center max-w-md">
              Estamos consultando registros online, Google Maps e redes para identificar os estabelecimentos reais em "{localizacao}" e calculando pontuações de conversão B2B.
            </p>
          </div>
        )}

        {!loading && leads.length === 0 && !error && (
          <div className="w-full flex flex-col items-center justify-center py-24 text-slate-400">
            <Target className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-500">Pronto para buscar novas oportunidades</h3>
            <p className="mt-1">Preencha o nicho e a localização para começar a prospecção ativa.</p>
          </div>
        )}

        {/* Results Metrics */}
        {leads.length > 0 && (
          <div className="w-full flex flex-col md:flex-row gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex items-center">
              <div className="w-10 h-10 bg-blue-50 rounded-lg mr-4 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Leads Encontrados</p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">{leads.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex items-center">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg mr-4 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Oportunidades Altas (&ge;80)</p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">{leads.filter(l => l.scoreOportunidade >= 80).length}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex items-center">
              <div className="w-10 h-10 bg-amber-50 rounded-lg mr-4 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Score Médio do Lote</p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">{mediaScore}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leads Grid Lists */}
        {leads.length > 0 && (
          <div className="w-full space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest">Relatório de Oportunidades: {nicho} em {localizacao}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ordenar:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="text-sm bg-white border border-slate-300 rounded-md px-2 py-1 outline-none focus:border-blue-500 font-medium text-slate-700 shadow-sm"
                >
                  <option value="desc">Maior Chance (Melhor)</option>
                  <option value="asc">Menor Chance (Pior)</option>
                </select>
              </div>
            </div>
            
            {sortedLeads.map((lead, idx) => (
              <div key={idx} className="bg-transparent rounded-none border-b border-slate-200 pb-8 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left & Middle combined: Detail Area */}
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Building2 className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none truncate pr-4">
                          {lead.nome}
                        </h4>
                        <p className="text-slate-500 mt-1 md:mt-2 flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm">
                          <span className="truncate">{lead.endereco || 'Endereço não identificado'}</span>
                          {lead.googleMapsUrl && (
                            <a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 cursor-pointer font-bold shrink-0">
                              Google Maps
                            </a>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-3">Presença Digital</span>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-slate-700 font-medium">Website</span>
                            {lead.website ? (
                              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[10px] font-bold uppercase truncate max-w-[120px]">
                                Acessar Site
                              </a>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase">Não Encontrado</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-slate-700 font-medium">Google Meu Negócio</span>
                            {lead.temGMN ? (
                              lead.gmnFraco ? (
                                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-bold rounded uppercase">Incompleto</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase border border-green-100">Ativo</span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase border border-red-100">Inexiste</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-slate-700 font-medium">Telefone</span>
                            {lead.telefone ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <span className="text-sm font-mono font-bold text-slate-900 truncate max-w-[120px]">{lead.telefone}</span>
                                <a 
                                  href={formatWhatsappLink(lead.telefone)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center text-[10px] font-bold text-green-700 hover:text-green-800 uppercase bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  WhatsApp
                                </a>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase border border-red-100">Faltando</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-3">Reputação Local</span>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-4xl font-black text-slate-900 leading-none">{lead.avaliacao ? lead.avaliacao.toFixed(1) : 'S/A'}</span>
                            <span className="text-slate-400 text-sm font-medium mb-1">/ 5.0</span>
                          </div>
                          {lead.avaliacao && lead.avaliacao > 0 ? (
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400" style={{ width: `${(lead.avaliacao / 5) * 100}%` }}></div>
                            </div>
                          ) : <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"></div>}
                          <p className="text-[10px] text-slate-500 mt-2 font-bold">
                            Total de avaliações: {lead.numAvaliacoes}
                          </p>
                        </div>
                        {/* Status bar */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          {lead.avaliacao && lead.avaliacao < 4.0 ? (
                            <p className="text-[10px] text-red-600 font-bold uppercase"><AlertCircle className="w-3 h-3 inline mr-1 -mt-0.5" />Risco de reputação - Excelente Ponto de Dor</p>
                          ) : (
                             <p className="text-[10px] text-slate-500 font-bold uppercase"><Star className="w-3 h-3 inline mr-1 -mt-0.5" />Reputação Estável</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <span className="text-[10px] text-blue-600 uppercase font-black tracking-widest block mb-1">Análise de IA & Justificativa</span>
                      <p className="text-sm text-slate-700 italic">"{lead.justificativaScore}"</p>
                    </div>
                  </div>

                  {/* Right Column: Score Breakdown */}
                  <div className="w-full lg:w-80 bg-slate-900 rounded-2xl p-6 text-white flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-lg">
                    <div className="absolute top-4 left-4 opacity-10">
                      <Target className="w-24 h-24" />
                    </div>
                    
                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 relative z-10 text-center">Opportunity Score</span>
                    
                    <div className="text-[96px] md:text-[112px] font-black leading-none mb-2 tracking-tighter relative z-10" style={{ color: lead.scoreOportunidade >= 80 ? '#34d399' : (lead.scoreOportunidade >= 50 ? '#fbbf24' : '#94a3b8') }}>
                      {lead.scoreOportunidade}
                    </div>
                    
                    <div className="bg-slate-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase mb-6 relative z-10 border border-white/10 text-center">
                      {lead.scoreOportunidade >= 80 ? 'Alta Prioridade' : (lead.scoreOportunidade >= 50 ? 'Oportunidade Média' : 'Baixa Prioridade')}
                    </div>
                    
                    <div className="w-full space-y-2.5 px-2 relative z-10">
                      {!lead.website && (
                        <div className="flex justify-between text-[11px] border-b border-white/10 pb-1">
                          <span className="opacity-60">Sem Website</span>
                          <span className="text-green-400 font-mono">+40 pts</span>
                        </div>
                      )}
                      {(lead.gmnFraco || !lead.temGMN) && (
                        <div className="flex justify-between text-[11px] border-b border-white/10 pb-1">
                          <span className="opacity-60">{!lead.temGMN ? 'Sem GMN' : 'GMN Incompleto'}</span>
                          <span className="text-green-400 font-mono">+35 pts</span>
                        </div>
                      )}
                      {lead.numAvaliacoes < 20 && (
                        <div className="flex justify-between text-[11px] border-b border-white/10 pb-1">
                          <span className="opacity-60">Poucas Avaliações</span>
                          <span className="text-green-400 font-mono">+15 pts</span>
                        </div>
                      )}
                      {lead.avaliacao && lead.avaliacao < 4.0 ? (
                        <div className="flex justify-between text-[11px] border-b border-white/10 pb-1">
                          <span className="opacity-60">Nota Baixa</span>
                          <span className="text-green-400 font-mono">+10 pts</span>
                        </div>
                      ) : null}
                      {!lead.telefone && (
                        <div className="flex justify-between text-[11px] pt-1 border-t border-white/10 mt-1">
                          <span className="opacity-60">Sem Telefone</span>
                          <span className="text-red-400 font-mono">-10 pts</span>
                        </div>
                      )}
                      {lead.telefone && (
                        <div className="flex justify-between text-[11px] pt-1">
                          <span className="opacity-60">Contato Ativo</span>
                          <span className="text-blue-400 uppercase font-bold text-[9px]">Checked</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

