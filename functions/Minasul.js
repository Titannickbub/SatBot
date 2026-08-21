const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Faz a busca das cotações da Minasul através da API oficial.
 * @returns {Promise<Object>}
 */
async function getCotacaoMinasul() {
  try {
    const apiUrl = 'https://apiportaldocooperado.minasul.com.br/utility/portal-find-physical-market/last';
    
    const client = axios.create({
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const response = await client.get(apiUrl);
    const data = response.data;
    
    let parsedData = null;
    
    if (data && data.AxAPIData && data.AxAPIData.response) {
      let responseStr = String(data.AxAPIData.response).trim();
      
      // Remove aspas simples no início e fim
      if (responseStr.startsWith("'") && responseStr.endsWith("'")) {
        responseStr = responseStr.substring(1, responseStr.length - 1);
      }
      
      try {
        parsedData = JSON.parse(responseStr);
      } catch (e) {
         throw new Error('Falha ao fazer parse do JSON da Minasul');
      }
    } else {
        throw new Error('Formato de resposta inesperado da Minasul');
    }

    const formatPrice = (val) => {
        if (!val || val === '0.00' || val === '0,00' || val === '0') return 'A Consultar';
        return val;
    };

    const atualizadoEm = parsedData.formattedDate && parsedData.time 
        ? `${parsedData.formattedDate} às ${parsedData.time}`
        : 'Data não disponível';

    return {
      fonte: 'Minasul',
      atualizadoEm: atualizadoEm,
      cotacoes: {
        cerejaDescascado: {
          nome: 'Cereja Descascado',
          preco: formatPrice(parsedData.cd)
        },
        bebidaMole: {
          nome: 'Bebida Mole',
          preco: formatPrice(parsedData.beveragesoft)
        },
        bebidaDuraTipo6: {
          nome: 'Bebida Dura Tipo 6',
          preco: formatPrice(parsedData.beveragehard6)
        },
        bebidaDuraTipo67: {
          nome: 'Bebida Dura Tipo 6/7',
          preco: formatPrice(parsedData.beveragehard67)
        }
      }
    };

  } catch (erro) {
    throw new Error(`Erro ao acessar a API da Minasul: ${erro.message}`);
  }
}

module.exports = { getCotacaoMinasul };
