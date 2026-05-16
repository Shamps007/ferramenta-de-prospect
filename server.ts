import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/prospect", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      console.log("SERVER USING API KEY:", apiKey ? apiKey.substring(0, 5) + "..." : "MISSING");
      
      const { nicho, localizacao } = req.body;
      const ai = new GoogleGenAI({ apiKey });
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
      
      // Clean up markdown block if present
      if (responseText.includes("\`\`\`")) {
        const match = responseText.match(/\`\`\`(?:json)?([\s\S]*?)\`\`\`/);
        if (match && match[1]) {
          responseText = match[1].trim();
        }
      }
      
      res.json({ text: responseText });
    } catch (err: any) {
      console.error("API Prospect Error:", err);
      // Clean up the error message for the end user if it relates to missing or invalid key
      if (err.message && err.message.includes("API key not valid")) {
        return res.status(400).json({ error: "Sua chave do Gemini API é inválida. Por favor, coloque uma chave real e válida de aistudio.google.com no arquivo .env" });
      }
      const errorMessage = err.message || JSON.stringify(err);
      res.status(500).json({ error: "Erro interno ao processar a IA: " + errorMessage });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
