const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://cccmg.com.br';
const INDEX_URL = `${BASE_URL}/cotacao-do-cafe/`;

/**
 * Busca a URL da cotação mais recente postada no CCCMG.
 * @returns {Promise<{url: string, data: string}>}
 */
async function getUltimaCotacaoUrl() {
    const response = await axios.get(INDEX_URL, {
        timeout: 12000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml'
        }
    });

    const $ = cheerio.load(response.data);

    // Os posts de cotação são listados como <h2><a href="...">dd/mm/aaaa</a></h2>
    // O primeiro da lista é o mais recente
    let url = null;
    let dataTexto = null;

    $('h2 a').each((i, el) => {
        const href = $(el).attr('href');
        const texto = $(el).text().trim();

        // Filtra apenas links de cotação no formato /cotacao-do-cafe/dd-mm-aaaa/
        if (href && href.includes('/cotacao-do-cafe/') && /\d{2}-\d{2}-\d{4}/.test(href)) {
            if (!url) {
                url = href;
                dataTexto = texto;
            }
        }
    });

    if (!url) {
        throw new Error('Não foi possível encontrar a URL da última cotação no índice do CCCMG.');
    }

    return { url, data: dataTexto };
}

/**
 * Faz scraping da tabela de preços de uma página de cotação do CCCMG.
 * @param {string} pageUrl - URL completa da página de cotação
 * @returns {Promise<Array<{padrao: string, preco: string}>>}
 */
async function scraperPrecosPage(pageUrl) {
    const response = await axios.get(pageUrl, {
        timeout: 12000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml'
        }
    });

    const $ = cheerio.load(response.data);

    const precos = [];

    // A tabela principal de cotação física usa jet-dynamic-table com colunas "Padrões" e "Preço"
    // Localizamos a tabela que tem thead com "Padrões" e "Preço"
    $('table.jet-dynamic-table').each((tIdx, table) => {
        const headers = [];
        $(table).find('thead th').each((i, th) => {
            headers.push($(th).text().trim().toLowerCase());
        });

        // Só processa a tabela de padrões (cotação física do café)
        if (headers.includes('padrões') || headers.includes('padres')) {
            $(table).find('tbody tr').each((i, row) => {
                const cells = $(row).find('td');
                if (cells.length >= 2) {
                    const padrao = $(cells[0]).text().trim();
                    const preco  = $(cells[1]).text().trim();
                    if (padrao && preco) {
                        precos.push({ padrao, preco });
                    }
                }
            });
        }
    });

    return precos;
}

/**
 * Busca a cotação mais recente do café no CCCMG.
 * @returns {Promise<Object>}
 */
async function getCotacaoCCCMG() {
    try {
        const { url, data } = await getUltimaCotacaoUrl();
        const precos = await scraperPrecosPage(url);

        if (!precos || precos.length === 0) {
            throw new Error('Tabela de preços não encontrada na página de cotação do CCCMG.');
        }

        return {
            fonte: 'CCCMG',
            data: data,
            url: url,
            precos: precos
        };
    } catch (erro) {
        throw new Error(`Erro ao buscar cotação do CCCMG: ${erro.message}`);
    }
}

module.exports = { getCotacaoCCCMG };
