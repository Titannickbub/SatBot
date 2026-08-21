const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Faz o scraping das cotações e do horário de atualização no site da Coocafé.
 * @returns {Promise<Object>}
 */
async function getCotacaoCoocafe() {
  try {
    const url = 'https://coocafe.com.br/';

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const textoPagina = $('body').text();

    // RegEx para capturar os preços
    const duraMatch = textoPagina.match(/Arábica tipo 7 Bebida Dura.*?(R\$\s*[\d.,]+)/i);
    const rioMatch = textoPagina.match(/Arábica Bebida Rio 7.*?(R\$\s*[\d.,]+)/i);
    const conilonMatch = textoPagina.match(/Conilon tipo 7.*?(R\$\s*[\d.,]+)\s*ES\s*\|\s*(R\$\s*[\d.,]+)\s*MG/i);

    // RegEx para capturar variações do texto de atualização (ex: "27/07/2026 às 09:53", "Atualizado em ...", etc.)
    const dataMatch = textoPagina.match(/(\d{2}\/\d{2}\/\d{4}[\s\S]*?(?:às|as|-)?\s*\d{2}[h:]\d{2})/i)
                   || textoPagina.match(/(Atualizado[\s\S]*?\d{2}[h:]\d{2})/i);

    return {
      fonte: 'Coocafé',
      atualizadoEm: dataMatch ? dataMatch[1].replace(/\s+/g, ' ').trim() : 'Data não localizada na página',
      cotacoes: {
        arabicaDura: {
          nome: 'Arábica Tipo 7 Bebida Dura',
          preco: duraMatch ? duraMatch[1].trim() : null
        },
        arabicaRio: {
          nome: 'Arábica Bebida Rio 7',
          preco: rioMatch ? rioMatch[1].trim() : null
        },
        conilon: {
          nome: 'Conilon Tipo 7',
          espiritoSanto: conilonMatch ? conilonMatch[1].trim() : null,
          minasGerais: conilonMatch ? conilonMatch[2].trim() : null
        }
      }
    };

  } catch (erro) {
    throw new Error(`Erro ao acessar o site da Coocafé: ${erro.message}`);
  }
}

// Exporta a função para ser usada por outros arquivos
module.exports = { getCotacaoCoocafe };
