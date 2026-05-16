import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nicho, localizacao } = body;
    
    if (!nicho || !localizacao) {
      return res.status(400).json({ error: 'Nicho e localização são obrigatórios.' });
    }

    // Attempt to use API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave da API do Gemini (GEMINI_API_KEY) não configurada no ambiente.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // We use gemini-2.5-pro or flash depending on what's available. Assuming flash to be safe with rate limits for new/free keys.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Encontre 10 estabelecimentos reais para o nicho "${nicho}" na localização "${localizacao}". Siga as regras de análise e score definidas.`,
      config: {
        systemInstruction: `Você é um sistema avançado de prospecção B2B e inteligência comercial focado em negócios locais no Brasil.
Seu objetivo é utilizar a ferramenta de Google Search para encontrar estabelecimentos reais, analisando sua presença digital e calculando um score de oportunidade de fechamento.

REGRAS DE BUSCA:
1. Busque ativamente web links reais referentes a negócios do nicho e localização exatos informados.
2. Extraia dados rigorosos e reais. Não invente nomes, telefones ou endereços.
3. Encontre e retorne no mínimo 10 estabelecimentos DIFERENTES.

REGRAS DE CÁLCULO DE SCORE (Oportunidade Comercial):
Você deve calcular o score de cada lead iniciando em 0 e aplicando as seguintes regras (máximo 100, mínimo 0, se passar de 100 limite em 100):
- Se o lead NÃO tem website ativo: adicione +40 pontos.
- Se o lead NÃO tem Google Meu Negócio (GMN) ou ele é fraco (poucas fotos, sem horário, descrição incompleta): adicione +35 pontos.
- Se o lead NÃO tem telefone cadastrado (ou se estava indisponível): subtraia -10 pontos.
- Se o lead tem menos de 20 avaliações no Google: adicione +15 pontos.
- Se a avaliação média for abaixo de 4.0: adicione +10 pontos.

ESTRUTURA DE RESPOSTA OBRIGATÓRIA:
Utilize string vazia "" para campos que você não encontrar (ex: website, telefone, URL).
Se a avaliação não estiver publicamente disponível, envie 0 para avaliacao e 0 para numAvaliacoes.`,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leads: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING, description: "Nome real do Negócio" },
                  endereco: { type: Type.STRING, description: "Endereço com Rua, Número e Cidade" },
                  telefone: { type: Type.STRING, description: "(XX) XXXXX-XXXX ou vazio se não encontrar" },
                  website: { type: Type.STRING, description: "URL do site do estabelecimento ou vazio" },
                  avaliacao: { type: Type.NUMBER, description: "Nota média (0 a 5)" },
                  numAvaliacoes: { type: Type.NUMBER, description: "Quantidade de reviews do negócio" },
                  temGMN: { type: Type.BOOLEAN, description: "Tem Google Meu Negócio visível" },
                  gmnFraco: { type: Type.BOOLEAN, description: "Perfil do Google parece descuidado/incompleto" },
                  googleMapsUrl: { type: Type.STRING, description: "Link do Maps se encontrado" },
                  scoreOportunidade: { type: Type.NUMBER, description: "Score de 0 a 100 de acordo com as regras" },
                  justificativaScore: { type: Type.STRING, description: "Breve explicação do porquê esse score (ex: sem site e nota baixa)" }
                },
                required: ["nome", "endereco", "telefone", "website", "avaliacao", "numAvaliacoes", "temGMN", "gmnFraco", "googleMapsUrl", "scoreOportunidade", "justificativaScore"]
              }
            }
          },
          required: ["leads"]
        }
      }
    });

    let responseText = response.text || "{}";
      
    if (responseText.includes("```")) {
      const match = responseText.match(/```(?:json)?([\s\S]*?)```/);
      if (match && match[1]) {
        responseText = match[1].trim();
      }
    }

    return res.status(200).json({ text: responseText });
  } catch (err: any) {
    console.error("API Error in Vercel endpoint:", err);
    
    // Tratamento de erros comuns da API Gemini
    if (err.message?.includes("API key not valid") || err.status === 400 || err.status === 403) {
      return res.status(500).json({ error: "Sua chave do Gemini API (.env) é inválida. Por favor, coloque uma chave real de aistudio.google.com no Vercel (ou arquivo .env local)." });
    }

    const errorMessage = err.message || JSON.stringify(err);
    return res.status(500).json({ error: "Erro interno no servidor: " + errorMessage });
  }
}
