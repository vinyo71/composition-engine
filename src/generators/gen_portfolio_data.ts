import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { join } from "jsr:@std/path";

// Real stock tickers with sector classification
const STOCKS = [
    // Technology
    { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 189.95, dividend: 0.52 },
    { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology", price: 378.91, dividend: 0.75 },
    { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", price: 141.80, dividend: 0 },
    { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology", price: 495.22, dividend: 0.04 },
    { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology", price: 358.79, dividend: 0 },
    { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Technology", price: 154.38, dividend: 0 },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Technology", price: 248.42, dividend: 0 },
    { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", price: 147.41, dividend: 0 },
    { symbol: "INTC", name: "Intel Corporation", sector: "Technology", price: 43.89, dividend: 2.32 },
    { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology", price: 272.15, dividend: 0 },
    // Healthcare
    { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", price: 156.74, dividend: 3.02 },
    { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", price: 527.85, dividend: 1.40 },
    { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", price: 28.79, dividend: 5.79 },
    { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare", price: 162.45, dividend: 3.91 },
    { symbol: "MRK", name: "Merck & Co.", sector: "Healthcare", price: 108.59, dividend: 2.79 },
    { symbol: "LLY", name: "Eli Lilly and Company", sector: "Healthcare", price: 597.82, dividend: 0.72 },
    // Financial
    { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial", price: 170.10, dividend: 2.61 },
    { symbol: "BAC", name: "Bank of America Corp.", sector: "Financial", price: 33.80, dividend: 2.84 },
    { symbol: "GS", name: "Goldman Sachs Group", sector: "Financial", price: 385.06, dividend: 2.61 },
    { symbol: "MS", name: "Morgan Stanley", sector: "Financial", price: 88.72, dividend: 3.74 },
    { symbol: "V", name: "Visa Inc.", sector: "Financial", price: 262.32, dividend: 0.79 },
    { symbol: "MA", name: "Mastercard Inc.", sector: "Financial", price: 426.58, dividend: 0.57 },
    // Consumer
    { symbol: "PG", name: "Procter & Gamble", sector: "Consumer", price: 147.98, dividend: 2.51 },
    { symbol: "KO", name: "Coca-Cola Company", sector: "Consumer", price: 59.67, dividend: 3.10 },
    { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer", price: 168.78, dividend: 2.96 },
    { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer", price: 161.25, dividend: 1.36 },
    { symbol: "COST", name: "Costco Wholesale", sector: "Consumer", price: 684.97, dividend: 0.61 },
    { symbol: "MCD", name: "McDonald's Corporation", sector: "Consumer", price: 297.89, dividend: 2.19 },
    // Industrial
    { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrial", price: 295.38, dividend: 1.73 },
    { symbol: "BA", name: "Boeing Company", sector: "Industrial", price: 214.82, dividend: 0 },
    { symbol: "HON", name: "Honeywell International", sector: "Industrial", price: 202.83, dividend: 2.06 },
    { symbol: "UPS", name: "United Parcel Service", sector: "Industrial", price: 158.67, dividend: 4.08 },
    { symbol: "GE", name: "General Electric", sector: "Industrial", price: 128.07, dividend: 0.25 },
    // Energy
    { symbol: "XOM", name: "Exxon Mobil Corporation", sector: "Energy", price: 102.35, dividend: 3.64 },
    { symbol: "CVX", name: "Chevron Corporation", sector: "Energy", price: 151.57, dividend: 4.01 },
    { symbol: "COP", name: "ConocoPhillips", sector: "Energy", price: 115.69, dividend: 2.14 },
    // REITs
    { symbol: "O", name: "Realty Income Corp.", sector: "REIT", price: 54.23, dividend: 5.67 },
    { symbol: "AMT", name: "American Tower Corp.", sector: "REIT", price: 202.17, dividend: 3.19 },
    { symbol: "SPG", name: "Simon Property Group", sector: "REIT", price: 144.85, dividend: 5.35 },
    // Bonds/ETFs
    { symbol: "BND", name: "Vanguard Total Bond ETF", sector: "Bond", price: 73.24, dividend: 3.98 },
    { symbol: "AGG", name: "iShares Core US Agg Bond", sector: "Bond", price: 98.72, dividend: 3.87 },
    { symbol: "TLT", name: "iShares 20+ Year Treasury", sector: "Bond", price: 92.45, dividend: 4.12 },
    // International
    { symbol: "VEA", name: "Vanguard FTSE Dev Markets", sector: "International", price: 47.82, dividend: 3.21 },
    { symbol: "VWO", name: "Vanguard FTSE Emrg Markets", sector: "International", price: 42.15, dividend: 3.45 },
    { symbol: "EFA", name: "iShares MSCI EAFE ETF", sector: "International", price: 76.28, dividend: 2.87 },
];

const CLIENT_NAMES = [
    "James Anderson", "Sarah Mitchell", "Robert Chen", "Emily Patel", "Michael O'Brien",
    "Jennifer Kim", "William Johnson", "Maria Garcia", "David Thompson", "Jessica Lee",
    "Christopher Brown", "Amanda Wilson", "Daniel Martinez", "Michelle Davis", "Andrew Taylor",
    "Stephanie Clark", "Matthew Rodriguez", "Nicole Lewis", "Joshua Walker", "Rebecca Hall"
];

const ACCOUNT_TYPES = [
    "Individual Brokerage", "Joint Brokerage", "Traditional IRA", "Roth IRA", "401(k) Rollover"
];

const RISK_PROFILES = [
    "Conservative", "Moderately Conservative", "Moderate", "Moderately Aggressive", "Aggressive"
];

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function generateAccountNumber(): string {
    return `US-${randomInt(1000000, 9999999)}-${randomInt(100, 999)}`;
}

function generateHoldings(portfolioValue: number): any[] {
    const numHoldings = randomInt(12, 25);
    const selectedStocks = [...STOCKS].sort(() => Math.random() - 0.5).slice(0, numHoldings);

    let remainingValue = portfolioValue;
    const holdings = [];

    for (let i = 0; i < selectedStocks.length; i++) {
        const stock = selectedStocks[i];
        const isLast = i === selectedStocks.length - 1;

        // Allocate value (larger holdings for earlier stocks)
        const maxPercent = isLast ? remainingValue / portfolioValue : Math.min(0.15, remainingValue / portfolioValue);
        const allocation = isLast ? remainingValue : portfolioValue * randomFloat(0.02, maxPercent);
        remainingValue -= allocation;

        // Calculate shares and apply random gain/loss
        const gainPercent = randomFloat(-0.25, 0.85); // -25% to +85%
        const costBasis = allocation / (1 + gainPercent);
        const shares = Math.floor(allocation / stock.price);
        const marketValue = shares * stock.price;
        const actualCostBasis = costBasis * (shares / Math.floor(allocation / stock.price));
        const gain = marketValue - actualCostBasis;

        holdings.push({
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.sector,
            shares,
            costBasis: parseFloat(actualCostBasis.toFixed(2)),
            currentPrice: stock.price,
            marketValue: parseFloat(marketValue.toFixed(2)),
            unrealizedGain: parseFloat(gain.toFixed(2)),
            gainPercent: parseFloat(((gain / actualCostBasis) * 100).toFixed(2)),
            weight: 0, // Will be calculated after
            dividendYield: stock.dividend
        });
    }

    // Calculate weights
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    holdings.forEach(h => {
        h.weight = parseFloat(((h.marketValue / totalValue) * 100).toFixed(2));
    });

    // Sort by market value descending
    holdings.sort((a, b) => b.marketValue - a.marketValue);

    return holdings;
}

function generateAssetAllocation(holdings: any[]): any {
    const byClass: Record<string, number> = {};
    const bySector: Record<string, number> = {};
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

    holdings.forEach(h => {
        // Map sectors to asset classes
        let assetClass = "US Stocks";
        if (h.sector === "Bond") assetClass = "Bonds";
        else if (h.sector === "REIT") assetClass = "REITs";
        else if (h.sector === "International") assetClass = "International Stocks";

        byClass[assetClass] = (byClass[assetClass] || 0) + h.marketValue;
        bySector[h.sector] = (bySector[h.sector] || 0) + h.marketValue;
    });

    // Add cash (5-15%)
    const cashPercent = randomFloat(0.05, 0.15);
    const cashValue = totalValue * cashPercent;
    byClass["Cash"] = cashValue;

    const grandTotal = totalValue + cashValue;

    // Target allocations based on risk profile
    const targets: Record<string, number> = {
        "US Stocks": 45, "International Stocks": 10, "Bonds": 25, "REITs": 10, "Cash": 10
    };

    return {
        byClass: Object.entries(byClass).map(([className, value]) => ({
            class: className,
            value: parseFloat(value.toFixed(2)),
            percent: parseFloat(((value / grandTotal) * 100).toFixed(1)),
            target: targets[className] || 10
        })),
        bySector: Object.entries(bySector).map(([sector, value]) => ({
            sector,
            percent: parseFloat(((value / grandTotal) * 100).toFixed(1))
        })).sort((a, b) => b.percent - a.percent)
    };
}

function generateMonthlyPerformance(): any[] {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const performance = [];

    for (const month of months) {
        const portfolioReturn = randomFloat(-5, 8);
        const benchmarkReturn = portfolioReturn + randomFloat(-2, 2);
        performance.push({
            period: month,
            portfolio: parseFloat(portfolioReturn.toFixed(2)),
            benchmark: parseFloat(benchmarkReturn.toFixed(2))
        });
    }

    return performance;
}

function generatePortfolioReport() {
    const portfolioValue = randomFloat(50000, 5000000);
    const holdings = generateHoldings(portfolioValue * 0.9); // 90% in holdings, 10% cash
    const allocation = generateAssetAllocation(holdings);
    const monthlyPerformance = generateMonthlyPerformance();

    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0) + (portfolioValue * 0.1);
    const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const unrealizedGain = totalValue - totalCost;
    const realizedGain = parseFloat(randomFloat(totalValue * 0.01, totalValue * 0.08).toFixed(2));
    const dividendIncome = parseFloat(randomFloat(totalValue * 0.01, totalValue * 0.03).toFixed(2));

    // Performance metrics
    const ytdReturn = parseFloat(randomFloat(8, 35).toFixed(2));
    const mtdReturn = parseFloat(randomFloat(-3, 5).toFixed(2));
    const qtdReturn = parseFloat(randomFloat(2, 12).toFixed(2));
    const oneYearReturn = parseFloat(randomFloat(10, 40).toFixed(2));
    const threeYearReturn = parseFloat(randomFloat(30, 90).toFixed(2));
    const sinceInceptionReturn = parseFloat(randomFloat(50, 200).toFixed(2));

    // Risk metrics
    const sharpeRatio = parseFloat(randomFloat(0.8, 2.2).toFixed(2));
    const sortinoRatio = parseFloat(randomFloat(1.0, 3.0).toFixed(2));
    const maxDrawdown = parseFloat(randomFloat(-20, -5).toFixed(2));
    const volatility = parseFloat(randomFloat(10, 22).toFixed(2));
    const beta = parseFloat(randomFloat(0.7, 1.3).toFixed(2));

    // Benchmark comparison
    const benchmarkYtd = parseFloat((ytdReturn - randomFloat(1, 8)).toFixed(2));
    const benchmarkMtd = parseFloat((mtdReturn - randomFloat(0.5, 2)).toFixed(2));
    const benchmarkQtd = parseFloat((qtdReturn - randomFloat(0.5, 3)).toFixed(2));
    const alpha = parseFloat((ytdReturn - benchmarkYtd).toFixed(2));

    const inceptionYear = randomInt(2018, 2023);

    return {
        client: {
            name: randomChoice(CLIENT_NAMES),
            accountNumber: generateAccountNumber(),
            accountType: randomChoice(ACCOUNT_TYPES),
            riskProfile: randomChoice(RISK_PROFILES),
            inceptionDate: `${inceptionYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`
        },
        reportPeriod: {
            from: "2025-10-01",
            to: "2025-12-31",
            quarter: "Q4 2025"
        },
        summary: {
            totalValue: parseFloat(totalValue.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            unrealizedGain: parseFloat(unrealizedGain.toFixed(2)),
            realizedGain,
            totalGainPercent: parseFloat(((unrealizedGain / totalCost) * 100).toFixed(2)),
            dividendIncome
        },
        performance: {
            mtd: mtdReturn,
            qtd: qtdReturn,
            ytd: ytdReturn,
            oneYear: oneYearReturn,
            threeYear: threeYearReturn,
            sinceInception: sinceInceptionReturn
        },
        benchmark: {
            name: "S&P 500",
            mtd: benchmarkMtd,
            qtd: benchmarkQtd,
            ytd: benchmarkYtd,
            alpha
        },
        riskMetrics: {
            sharpeRatio,
            sortinoRatio,
            maxDrawdown,
            volatility,
            beta
        },
        assetAllocation: allocation,
        holdings,
        monthlyPerformance,
        activity: {
            deposits: parseFloat(randomFloat(0, totalValue * 0.1).toFixed(2)),
            withdrawals: parseFloat(randomFloat(0, totalValue * 0.05).toFixed(2)),
            dividends: dividendIncome,
            interest: parseFloat(randomFloat(10, 200).toFixed(2)),
            fees: parseFloat(randomFloat(50, 500).toFixed(2))
        },
        chartData: {
            allocLabels: JSON.stringify(allocation.byClass.map(a => a.class)),
            allocData: JSON.stringify(allocation.byClass.map(a => a.percent)),
            sectorLabels: JSON.stringify(allocation.bySector.map(s => s.sector)),
            sectorData: JSON.stringify(allocation.bySector.map(s => s.percent))
        }
    };
}

function escapeXml(unsafe: string | number): string {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function generateXmlDataset(numDocuments: number) {
    await ensureDir("inp");
    const fileName = join("inp", `portfolios_${numDocuments}.xml`);

    const file = await Deno.open(fileName, { write: true, create: true, truncate: true });
    const encoder = new TextEncoder();

    await file.write(encoder.encode('<?xml version="1.0" encoding="utf-8"?>\n'));
    await file.write(encoder.encode('<PortfolioReports>\n'));

    for (let i = 0; i < numDocuments; i++) {
        const report = generatePortfolioReport();
        let xml = '  <PortfolioReport>\n';

        // Client
        xml += '    <Client>\n';
        xml += `      <Name>${escapeXml(report.client.name)}</Name>\n`;
        xml += `      <AccountNumber>${escapeXml(report.client.accountNumber)}</AccountNumber>\n`;
        xml += `      <AccountType>${escapeXml(report.client.accountType)}</AccountType>\n`;
        xml += `      <RiskProfile>${escapeXml(report.client.riskProfile)}</RiskProfile>\n`;
        xml += `      <InceptionDate>${escapeXml(report.client.inceptionDate)}</InceptionDate>\n`;
        xml += '    </Client>\n';

        // Report Period
        xml += '    <ReportPeriod>\n';
        xml += `      <From>${escapeXml(report.reportPeriod.from)}</From>\n`;
        xml += `      <To>${escapeXml(report.reportPeriod.to)}</To>\n`;
        xml += `      <Quarter>${escapeXml(report.reportPeriod.quarter)}</Quarter>\n`;
        xml += '    </ReportPeriod>\n';

        // Summary
        xml += '    <Summary>\n';
        xml += `      <TotalValue>${escapeXml(report.summary.totalValue)}</TotalValue>\n`;
        xml += `      <TotalCost>${escapeXml(report.summary.totalCost)}</TotalCost>\n`;
        xml += `      <UnrealizedGain>${escapeXml(report.summary.unrealizedGain)}</UnrealizedGain>\n`;
        xml += `      <RealizedGain>${escapeXml(report.summary.realizedGain)}</RealizedGain>\n`;
        xml += `      <TotalGainPercent>${escapeXml(report.summary.totalGainPercent)}</TotalGainPercent>\n`;
        xml += `      <DividendIncome>${escapeXml(report.summary.dividendIncome)}</DividendIncome>\n`;
        xml += '    </Summary>\n';

        // Performance
        xml += '    <Performance>\n';
        xml += `      <MTD>${escapeXml(report.performance.mtd)}</MTD>\n`;
        xml += `      <QTD>${escapeXml(report.performance.qtd)}</QTD>\n`;
        xml += `      <YTD>${escapeXml(report.performance.ytd)}</YTD>\n`;
        xml += `      <OneYear>${escapeXml(report.performance.oneYear)}</OneYear>\n`;
        xml += `      <ThreeYear>${escapeXml(report.performance.threeYear)}</ThreeYear>\n`;
        xml += `      <SinceInception>${escapeXml(report.performance.sinceInception)}</SinceInception>\n`;
        xml += '    </Performance>\n';

        // Benchmark
        xml += '    <Benchmark>\n';
        xml += `      <Name>${escapeXml(report.benchmark.name)}</Name>\n`;
        xml += `      <MTD>${escapeXml(report.benchmark.mtd)}</MTD>\n`;
        xml += `      <QTD>${escapeXml(report.benchmark.qtd)}</QTD>\n`;
        xml += `      <YTD>${escapeXml(report.benchmark.ytd)}</YTD>\n`;
        xml += `      <Alpha>${escapeXml(report.benchmark.alpha)}</Alpha>\n`;
        xml += '    </Benchmark>\n';

        // Risk Metrics
        xml += '    <RiskMetrics>\n';
        xml += `      <SharpeRatio>${escapeXml(report.riskMetrics.sharpeRatio)}</SharpeRatio>\n`;
        xml += `      <SortinoRatio>${escapeXml(report.riskMetrics.sortinoRatio)}</SortinoRatio>\n`;
        xml += `      <MaxDrawdown>${escapeXml(report.riskMetrics.maxDrawdown)}</MaxDrawdown>\n`;
        xml += `      <Volatility>${escapeXml(report.riskMetrics.volatility)}</Volatility>\n`;
        xml += `      <Beta>${escapeXml(report.riskMetrics.beta)}</Beta>\n`;
        xml += '    </RiskMetrics>\n';

        // Asset Allocation
        xml += '    <AssetAllocation>\n';
        xml += '      <ByClass>\n';
        for (const asset of report.assetAllocation.byClass) {
            xml += '        <Asset>\n';
            xml += `          <Class>${escapeXml(asset.class)}</Class>\n`;
            xml += `          <Value>${escapeXml(asset.value)}</Value>\n`;
            xml += `          <Percent>${escapeXml(asset.percent)}</Percent>\n`;
            xml += `          <Target>${escapeXml(asset.target)}</Target>\n`;
            xml += '        </Asset>\n';
        }
        xml += '      </ByClass>\n';
        xml += '      <BySector>\n';
        for (const sector of report.assetAllocation.bySector) {
            xml += '        <Sector>\n';
            xml += `          <Name>${escapeXml(sector.sector)}</Name>\n`;
            xml += `          <Percent>${escapeXml(sector.percent)}</Percent>\n`;
            xml += '        </Sector>\n';
        }
        xml += '      </BySector>\n';
        xml += '    </AssetAllocation>\n';

        // Holdings
        xml += '    <Holdings>\n';
        for (const h of report.holdings) {
            xml += '      <Holding>\n';
            xml += `        <Symbol>${escapeXml(h.symbol)}</Symbol>\n`;
            xml += `        <Name>${escapeXml(h.name)}</Name>\n`;
            xml += `        <Sector>${escapeXml(h.sector)}</Sector>\n`;
            xml += `        <Shares>${escapeXml(h.shares)}</Shares>\n`;
            xml += `        <CostBasis>${escapeXml(h.costBasis)}</CostBasis>\n`;
            xml += `        <CurrentPrice>${escapeXml(h.currentPrice)}</CurrentPrice>\n`;
            xml += `        <MarketValue>${escapeXml(h.marketValue)}</MarketValue>\n`;
            xml += `        <UnrealizedGain>${escapeXml(h.unrealizedGain)}</UnrealizedGain>\n`;
            xml += `        <GainPercent>${escapeXml(h.gainPercent)}</GainPercent>\n`;
            xml += `        <Weight>${escapeXml(h.weight)}</Weight>\n`;
            xml += `        <DividendYield>${escapeXml(h.dividendYield)}</DividendYield>\n`;
            xml += '      </Holding>\n';
        }
        xml += '    </Holdings>\n';

        // Monthly Performance
        xml += '    <MonthlyPerformance>\n';
        for (const m of report.monthlyPerformance) {
            xml += '      <Month>\n';
            xml += `        <Period>${escapeXml(m.period)}</Period>\n`;
            xml += `        <Portfolio>${escapeXml(m.portfolio)}</Portfolio>\n`;
            xml += `        <Benchmark>${escapeXml(m.benchmark)}</Benchmark>\n`;
            xml += '      </Month>\n';
        }
        xml += '    </MonthlyPerformance>\n';

        // Activity
        xml += '    <Activity>\n';
        xml += `      <Deposits>${escapeXml(report.activity.deposits)}</Deposits>\n`;
        xml += `      <Withdrawals>${escapeXml(report.activity.withdrawals)}</Withdrawals>\n`;
        xml += `      <Dividends>${escapeXml(report.activity.dividends)}</Dividends>\n`;
        xml += `      <Interest>${escapeXml(report.activity.interest)}</Interest>\n`;
        xml += `      <Fees>${escapeXml(report.activity.fees)}</Fees>\n`;
        xml += '    </Activity>\n';

        // ChartData (pre-computed JSON for charts)
        xml += '    <ChartData>\n';
        xml += `      <AllocLabels>${escapeXml(report.chartData.allocLabels)}</AllocLabels>\n`;
        xml += `      <AllocData>${escapeXml(report.chartData.allocData)}</AllocData>\n`;
        xml += `      <SectorLabels>${escapeXml(report.chartData.sectorLabels)}</SectorLabels>\n`;
        xml += `      <SectorData>${escapeXml(report.chartData.sectorData)}</SectorData>\n`;
        xml += '    </ChartData>\n';

        xml += '  </PortfolioReport>\n';
        await file.write(encoder.encode(xml));

        if ((i + 1) % 100 === 0) {
            console.log(`Generated ${i + 1}/${numDocuments} portfolio reports...`);
        }
    }

    await file.write(encoder.encode('</PortfolioReports>\n'));
    file.close();

    return fileName;
}

if (import.meta.main) {
    const args = Deno.args;
    let count = 100; // Default
    if (args.length > 0) {
        const parsed = parseInt(args[0]);
        if (!isNaN(parsed)) count = parsed;
    } else {
        console.log("Usage: deno run -A src/generators/gen_portfolio_data.ts [count]");
        console.log("Defaulting to 100 reports.");
    }

    console.log(`Generating ${count} portfolio reports...`);
    const out = await generateXmlDataset(count);
    console.log(`✓ Portfolio dataset '${out}' has been generated.`);
}
