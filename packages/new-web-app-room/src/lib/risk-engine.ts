// DeFi Risk Oracle Swarm - Core Risk Scoring Engine
export interface Position {
  id: string;
  protocol: string;
  chain: string;
  wallet: string;
  collateralAsset: string;
  collateralAmount: number;
  borrowedAsset: string;
  borrowedAmount: number;
  collateralValue: number;
  borrowedValue: number;
  liquidationThreshold: number;
  timestamp: number;
}

export interface RiskScore {
  positionId: string;
  overallRisk: number; // 0-100 (100 = highest risk)
  liquidationRisk: number;
  volatilityRisk: number;
  concentrationRisk: number;
  marketRisk: number;
  recommendation: 'SAFE' | 'MONITOR' | 'WARNING' | 'LIQUIDATE';
  timeToLiquidation?: number; // minutes
}

export interface MarketData {
  asset: string;
  price: number;
  volatility24h: number;
  liquidityScore: number;
  priceChange24h: number;
}

export class RiskScoringEngine {
  private marketData: Map<string, MarketData> = new Map();
  
  constructor() {
    this.initializeMockMarketData();
  }

  private initializeMockMarketData() {
    // Mock market data for demo
    const mockData: MarketData[] = [
      { asset: 'ETH', price: 2100, volatility24h: 0.08, liquidityScore: 0.95, priceChange24h: -0.02 },
      { asset: 'BTC', price: 43000, volatility24h: 0.06, liquidityScore: 0.98, priceChange24h: 0.01 },
      { asset: 'USDC', price: 1.0, volatility24h: 0.001, liquidityScore: 0.99, priceChange24h: 0.0001 },
      { asset: 'AAVE', price: 95, volatility24h: 0.15, liquidityScore: 0.75, priceChange24h: -0.05 },
      { asset: 'UNI', price: 6.2, volatility24h: 0.12, liquidityScore: 0.80, priceChange24h: 0.03 },
    ];
    
    mockData.forEach(data => this.marketData.set(data.asset, data));
  }

  calculateRiskScore(position: Position): RiskScore {
    const collateralMarket = this.marketData.get(position.collateralAsset);
    const borrowedMarket = this.marketData.get(position.borrowedAsset);
    
    if (!collateralMarket || !borrowedMarket) {
      throw new Error(`Market data not available for assets`);
    }

    // Calculate collateralization ratio
    const collateralizationRatio = position.collateralValue / position.borrowedValue;
    
    // Liquidation Risk (0-100)
    const liquidationBuffer = collateralizationRatio - position.liquidationThreshold;
    const liquidationRisk = Math.max(0, Math.min(100, 
      100 - (liquidationBuffer / position.liquidationThreshold) * 100
    ));

    // Volatility Risk (0-100)
    const avgVolatility = (collateralMarket.volatility24h + borrowedMarket.volatility24h) / 2;
    const volatilityRisk = Math.min(100, avgVolatility * 500); // Scale to 0-100

    // Market Risk (0-100) - based on price trends and liquidity
    const marketRisk = Math.min(100, 
      (Math.abs(collateralMarket.priceChange24h) * 200) + 
      ((1 - collateralMarket.liquidityScore) * 50)
    );

    // Concentration Risk (simplified - would be more complex in real implementation)
    const concentrationRisk = position.borrowedValue > 100000 ? 30 : 10;

    // Overall Risk Score (weighted average)
    const overallRisk = Math.min(100,
      liquidationRisk * 0.4 +
      volatilityRisk * 0.3 +
      marketRisk * 0.2 +
      concentrationRisk * 0.1
    );

    // Time to liquidation estimate (simplified)
    const timeToLiquidation = liquidationRisk > 80 ? 
      Math.max(5, 120 - liquidationRisk) : undefined;

    // Recommendation based on overall risk
    let recommendation: RiskScore['recommendation'];
    if (overallRisk < 25) recommendation = 'SAFE';
    else if (overallRisk < 50) recommendation = 'MONITOR';
    else if (overallRisk < 80) recommendation = 'WARNING';
    else recommendation = 'LIQUIDATE';

    return {
      positionId: position.id,
      overallRisk: Math.round(overallRisk),
      liquidationRisk: Math.round(liquidationRisk),
      volatilityRisk: Math.round(volatilityRisk),
      concentrationRisk: Math.round(concentrationRisk),
      marketRisk: Math.round(marketRisk),
      recommendation,
      timeToLiquidation
    };
  }

  // Simulate real-time price updates
  updateMarketData(asset: string, newPrice: number) {
    const existing = this.marketData.get(asset);
    if (existing) {
      const priceChange = (newPrice - existing.price) / existing.price;
      this.marketData.set(asset, {
        ...existing,
        price: newPrice,
        priceChange24h: priceChange
      });
    }
  }

  getMarketData(asset: string): MarketData | undefined {
    return this.marketData.get(asset);
  }
}

// Mock position generator for demo
export function generateMockPositions(): Position[] {
  const protocols = ['Aave', 'Compound', 'Morpho', 'Euler', 'Spark'];
  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'];
  const assets = ['ETH', 'BTC', 'USDC', 'AAVE', 'UNI'];
  
  return Array.from({ length: 12 }, (_, i) => {
    const collateralAsset = assets[Math.floor(Math.random() * assets.length)];
    const borrowedAsset = assets.filter(a => a !== collateralAsset)[Math.floor(Math.random() * (assets.length - 1))];
    const collateralAmount = 10 + Math.random() * 100;
    const borrowedAmount = 5 + Math.random() * 50;
    
    // Mock prices for calculation
    const prices: Record<string, number> = { ETH: 2100, BTC: 43000, USDC: 1, AAVE: 95, UNI: 6.2 };
    
    return {
      id: `pos_${i + 1}`,
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      chain: chains[Math.floor(Math.random() * chains.length)],
      wallet: `0x${Math.random().toString(16).substr(2, 8)}...`,
      collateralAsset,
      collateralAmount,
      borrowedAsset,
      borrowedAmount,
      collateralValue: collateralAmount * prices[collateralAsset],
      borrowedValue: borrowedAmount * prices[borrowedAsset],
      liquidationThreshold: 1.2 + Math.random() * 0.3, // 1.2-1.5x
      timestamp: Date.now() - Math.random() * 86400000 // Random time in last 24h
    };
  });
}
