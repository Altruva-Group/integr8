function nftExistsGlobally(blockchain, nftData) {
    // console.log(nftData)
    for (const account of blockchain.accounts.values()) {
        // Assuming account.nfts is a Map (or other iterable)
        // checking minted nfts
        for (const [key, n] of account.nfts.entries()) {
            // Compare NFT properties with nftData
            if (
                n.creator === nftData.creator &&
                n.name === nftData.name &&
                n.url === nftData.url &&
                n.description === nftData.description &&
                n.totalSupply === nftData.totalSupply &&
                (n.position === nftData.position || nftData.position === undefined)
            ) {
                // Similar NFT exists globally
                return true;
            }
        }
        // checking unminted nfts
        for (const [key, n] of account.unmintedNfts.entries()) {
            // Compare NFT properties with nftData
            if (
                n.creator === nftData.creator &&
                n.name === nftData.name &&
                n.url === nftData.url &&
                n.description === nftData.description &&
                n.totalSupply === nftData.totalSupply &&
                (n.position === nftData.position || nftData.position === undefined)
            ) {
                // Similar NFT exists globally
                return true;
            }
        }
    }
    return false; // No similar NFT found globally
}

module.exports = nftExistsGlobally;
