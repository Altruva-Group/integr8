
const getAssetMarketValue = async (assetSymbol) => {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetSymbol}&vs_currencies=usd`)

        return response.data[assetSymbol].usd;
    } catch (error) {
        console.error(`Error fetching market value for ${assetSymbol}:`, error);
        return null;
    }
}

module.exports = getAssetMarketValue;