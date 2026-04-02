"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNseSymbol = exports.fetchNsePrice = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
/**
 * Scrapes the current share price of an NSE stock from afx.kwayisi.org
 * @param symbol The NSE stock symbol (e.g., 'SCOM', 'EQTY')
 * @returns The current price as a number, or null if scraping fails
 */
const fetchNsePrice = async (symbol) => {
    try {
        const slug = symbol.toLowerCase();
        const url = `https://afx.kwayisi.org/nse/${slug}.html`;
        const response = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PesakiApp/1.0)',
                'Accept': 'text/html'
            },
            timeout: 10000 // 10s timeout
        });
        if (response.status !== 200)
            return null;
        const html = response.data;
        // Extract: "current share price of ... is KES 32.00"
        const priceMatch = html.match(/is KES ([\d,]+\.?\d*)/i);
        if (!priceMatch) {
            logger_1.logger.warn({ symbol, url }, 'NSE price match failed in HTML content');
            return null;
        }
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        return price > 0 ? price : null;
    }
    catch (err) {
        logger_1.logger.error({ err: err.message, symbol }, 'Failed to fetch NSE price from afx.kwayisi.org');
        return null;
    }
};
exports.fetchNsePrice = fetchNsePrice;
/**
 * Checks if a market symbol is a known NSE stock
 * This list should match the frontend TOP_NSE_STOCKS
 */
const NSE_SYMBOLS = new Set([
    'SCOM', 'EQTY', 'KCB', 'COOP', 'EABL', 'ABSA', 'SCBK', 'SBIC',
    'KEGN', 'KPLC', 'BAT', 'BAMB', 'CARB', 'CIC', 'BRIT', 'JUB',
    'NCBA', 'DTK', 'IMH', 'NMG'
]);
const isNseSymbol = (symbol) => {
    return NSE_SYMBOLS.has(symbol.toUpperCase());
};
exports.isNseSymbol = isNseSymbol;
