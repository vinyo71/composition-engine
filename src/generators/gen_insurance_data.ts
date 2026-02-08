/**
 * Insurance Policy Statement Data Generator
 * Generates realistic multi-product insurance policy statements
 */

// Types
type LineOfBusiness = "AUTO" | "HOME" | "RENTERS" | "LIFE" | "UMBRELLA" | "CGL";
type CustomerTier = "Standard" | "Preferred" | "Elite";

const FIRST_NAMES = ["Robert", "Jennifer", "Michael", "Sarah", "David", "Emily", "James", "Maria", "William", "Lisa"];
const LAST_NAMES = ["Thompson", "Garcia", "Johnson", "Williams", "Martinez", "Brown", "Davis", "Miller", "Wilson", "Anderson"];
const CITIES = [
    { city: "Austin", state: "TX", zip: "78745", territory: "TX-047", factor: 1.15 },
    { city: "Denver", state: "CO", zip: "80202", territory: "CO-031", factor: 1.08 },
    { city: "Phoenix", state: "AZ", zip: "85004", territory: "AZ-013", factor: 1.22 },
    { city: "Seattle", state: "WA", zip: "98101", territory: "WA-033", factor: 1.18 },
    { city: "Chicago", state: "IL", zip: "60601", territory: "IL-016", factor: 1.35 },
    { city: "Miami", state: "FL", zip: "33101", territory: "FL-086", factor: 1.45 },
    { city: "Boston", state: "MA", zip: "02101", territory: "MA-025", factor: 1.28 },
    { city: "Atlanta", state: "GA", zip: "30301", territory: "GA-121", factor: 1.12 },
];

const VEHICLE_MAKES = [
    { make: "Toyota", models: ["Camry", "RAV4", "Highlander"], symbol: 8 },
    { make: "Honda", models: ["Accord", "CR-V", "Pilot"], symbol: 7 },
    { make: "Ford", models: ["F-150", "Explorer", "Escape"], symbol: 10 },
    { make: "BMW", models: ["3 Series", "X5", "X3"], symbol: 15 },
    { make: "Tesla", models: ["Model 3", "Model Y", "Model S"], symbol: 18 },
];

const OCCUPATIONS = ["Engineer", "Teacher", "Nurse", "Manager", "Attorney", "Accountant", "Sales Rep", "Consultant"];

// Helpers
function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
    return arr[rand(0, arr.length - 1)];
}

function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

function generatePolicyNumber(lob: string, index: number): string {
    const prefixes: Record<string, string> = { AUTO: "PA", HOME: "HO", RENTERS: "RN", LIFE: "TL", UMBRELLA: "UL", CGL: "GL" };
    return `${prefixes[lob] || "XX"}-2024-${(1000000 + index).toString().slice(1)}`;
}

// Calculate risk score based on claims and violations
function calculateRiskScore(claims: number, atFaultAccidents: number, violations: number, claimFreeYears: number): number {
    let score = 50; // base
    score += atFaultAccidents * 25;
    score += violations * 15;
    score += claims * 5;
    score -= claimFreeYears * 10;
    return Math.max(0, Math.min(100, score));
}

// Generate Auto Policy Data
function generateAutoPolicy(insured: any, location: any, index: number) {
    const numVehicles = rand(1, 3);
    const numDrivers = rand(1, 3);
    
    const drivers = [];
    for (let i = 0; i < numDrivers; i++) {
        const age = rand(18, 75);
        const violations = age < 25 ? rand(0, 2) : rand(0, 1);
        const accidents = rand(0, 1);
        drivers.push({
            Name: i === 0 ? insured.Name : `${pick(FIRST_NAMES)} ${insured.Name.split(" ")[1]}`,
            Relationship: i === 0 ? "Insured" : pick(["Spouse", "Child", "Other"]),
            DateOfBirth: formatDate(new Date(2024 - age, rand(0, 11), rand(1, 28))),
            Age: age,
            LicenseNumber: `DL${rand(100000000, 999999999)}`,
            LicenseState: location.state,
            MaritalStatus: age > 25 ? "Married" : "Single",
            Violations: violations,
            AtFaultAccidents: accidents,
            GoodStudent: age < 25 && Math.random() > 0.5,
            DefensiveDriving: Math.random() > 0.7,
        });
    }
    
    const vehicles = [];
    for (let v = 0; v < numVehicles; v++) {
        const makeData = pick(VEHICLE_MAKES);
        const year = rand(2015, 2024);
        const annualMiles = rand(6000, 20000);
        vehicles.push({
            Year: year,
            Make: makeData.make,
            Model: pick(makeData.models),
            VIN: `1HGCM${rand(10000000000, 99999999999)}`,
            Symbol: makeData.symbol,
            Use: pick(["Pleasure", "Commute", "Business"]),
            AnnualMiles: annualMiles,
            GaragedZip: location.zip,
            AntiTheft: Math.random() > 0.4,
            Airbags: true,
            ABS: year > 2012,
        });
    }
    
    const basePremium = numVehicles * 850 + numDrivers * 200;
    const youngDriverSurcharge = drivers.filter(d => d.Age < 25).length * 350;
    const violationSurcharge = drivers.reduce((sum, d) => sum + d.Violations * 150 + d.AtFaultAccidents * 400, 0);
    const vehicleSymbolAdjust = vehicles.reduce((sum, v) => sum + (v.Symbol - 10) * 25, 0);
    const multiVehicleDiscount = numVehicles > 1 ? basePremium * 0.10 : 0;
    const goodDriverDiscount = drivers.every(d => d.Violations === 0 && d.AtFaultAccidents === 0) ? basePremium * 0.15 : 0;
    
    const annual = basePremium + youngDriverSurcharge + violationSurcharge + vehicleSymbolAdjust 
        - multiVehicleDiscount - goodDriverDiscount;
    
    const claimFreeYears = rand(0, 8);
    const claims = claimFreeYears === 0 ? rand(1, 2) : 0;
    
    return {
        Policy: {
            Number: generatePolicyNumber("AUTO", index),
            LineOfBusiness: "AUTO",
            EffectiveDate: "2024-06-01",
            ExpirationDate: "2025-06-01",
            Term: 12,
            Status: "Active",
        },
        Drivers: { Driver: drivers },
        Vehicles: { Vehicle: vehicles },
        Coverages: {
            Coverage: [
                { Code: "BI", Name: "Bodily Injury Liability", Limit: "100000/300000", Premium: randFloat(400, 600) },
                { Code: "PD", Name: "Property Damage Liability", Limit: "100000", Premium: randFloat(200, 350) },
                { Code: "COLL", Name: "Collision", Deductible: pick([500, 1000, 2500]), Premium: randFloat(350, 550) },
                { Code: "COMP", Name: "Comprehensive", Deductible: pick([250, 500, 1000]), Premium: randFloat(150, 280) },
                { Code: "UM", Name: "Uninsured Motorist", Limit: "100000/300000", Premium: randFloat(80, 150) },
                { Code: "MED", Name: "Medical Payments", Limit: "5000", Premium: randFloat(40, 80) },
                { Code: "ROAD", Name: "Roadside Assistance", Limit: "Per Occurrence", Premium: 24 },
                { Code: "RENT", Name: "Rental Reimbursement", Limit: "30/900", Premium: 48 },
            ]
        },
        Premium: {
            Base: basePremium,
            YoungDriverSurcharge: youngDriverSurcharge,
            ViolationSurcharge: violationSurcharge,
            VehicleSymbolAdjust: vehicleSymbolAdjust,
            TerritoryFactor: location.TerritoryFactor,
            TerritoryAdjustment: Math.round(basePremium * (location.TerritoryFactor - 1)),
            MultiVehicleDiscount: -multiVehicleDiscount,
            GoodDriverDiscount: -goodDriverDiscount,
            PaidInFullDiscount: Math.random() > 0.5 ? -Math.round(annual * 0.03) : 0,
            Annual: Math.round(annual),
            Monthly: Math.round(annual / 12),
            SixMonth: Math.round(annual / 2),
        },
        Claims: {
            TotalCount: claims,
            ClaimFreeYears: claimFreeYears,
            ClaimFreeDiscount: claimFreeYears > 3 ? Math.round(annual * 0.10) : 0,
            Claim: claims > 0 ? [{
                Number: `CLM-${rand(2020, 2023)}-${rand(100000, 999999)}`,
                Date: formatDate(new Date(rand(2020, 2023), rand(0, 11), rand(1, 28))),
                Type: pick(["Collision", "Comprehensive", "Liability"]),
                Status: "Closed",
                PaidAmount: randFloat(2500, 15000),
            }] : [],
        },
        RiskScore: calculateRiskScore(claims, 
            drivers.reduce((s, d) => s + d.AtFaultAccidents, 0),
            drivers.reduce((s, d) => s + d.Violations, 0),
            claimFreeYears),
    };
}

// Generate Home Policy Data
function generateHomePolicy(insured: any, location: any, index: number) {
    const sqft = rand(1400, 4500);
    const yearBuilt = rand(1960, 2022);
    const rebuildCostPerSqft = randFloat(180, 350);
    const replacementCost = Math.round(sqft * rebuildCostPerSqft);
    const dwellingLimit = Math.round(replacementCost * randFloat(0.85, 1.15));
    const personalProperty = Math.round(dwellingLimit * 0.5);
    
    const protectionClass = rand(1, 10);
    const roofAge = 2024 - yearBuilt > 20 ? rand(1, 15) : 2024 - yearBuilt;
    
    const basePremium = Math.round(dwellingLimit / 1000 * 4.5);
    const protectionCredit = protectionClass <= 5 ? basePremium * 0.05 : -basePremium * 0.10;
    const roofPenalty = roofAge > 15 ? basePremium * 0.15 : 0;
    const newHomeDiscount = yearBuilt > 2015 ? basePremium * 0.08 : 0;
    
    const claimFreeYears = rand(0, 10);
    const claims = claimFreeYears === 0 ? rand(1, 2) : 0;
    const claimFreeDiscount = claimFreeYears > 3 ? basePremium * 0.10 : 0;
    
    const annual = Math.round(basePremium * location.TerritoryFactor - protectionCredit + roofPenalty - newHomeDiscount - claimFreeDiscount);
    
    const coverageRatio = dwellingLimit / replacementCost;
    const coinsuranceWarning = coverageRatio < 0.80;
    
    return {
        Policy: {
            Number: generatePolicyNumber("HOME", index),
            LineOfBusiness: "HOME",
            EffectiveDate: "2024-06-01",
            ExpirationDate: "2025-06-01",
            Term: 12,
            Status: "Active",
        },
        Dwelling: {
            Address: `${rand(100, 9999)} ${pick(["Oak", "Maple", "Pine", "Cedar", "Elm"])} ${pick(["Street", "Avenue", "Drive", "Lane", "Court"])}`,
            YearBuilt: yearBuilt,
            SquareFeet: sqft,
            Stories: pick([1, 1, 2, 2, 2, 3]),
            Construction: pick(["Frame", "Masonry", "Masonry Veneer"]),
            RoofType: pick(["Composition Shingle", "Tile", "Metal", "Slate"]),
            RoofAge: roofAge,
            FoundationType: pick(["Slab", "Basement", "Crawlspace"]),
            Heating: pick(["Central Gas", "Central Electric", "Heat Pump"]),
            Cooling: "Central Air",
            ElectricalUpdate: yearBuilt < 2000 ? rand(2010, 2023) : yearBuilt,
            PlumbingUpdate: yearBuilt < 2000 ? rand(2010, 2023) : yearBuilt,
            ProtectionClass: protectionClass,
            DistanceToFireStation: randFloat(0.5, 5.0, 1),
            DistanceToHydrant: randFloat(0.1, 0.5, 1),
        },
        Coverages: {
            Coverage: [
                { Code: "DWELL", Name: "Dwelling (Coverage A)", Limit: dwellingLimit, Deductible: pick([1000, 2500, 5000]), Premium: Math.round(basePremium * 0.65), ReplacementCostEstimate: replacementCost, CoverageRatio: coverageRatio.toFixed(2) },
                { Code: "PERS", Name: "Personal Property (Coverage C)", Limit: personalProperty, Deductible: pick([1000, 2500]), Premium: Math.round(basePremium * 0.20), ValuationType: "Replacement Cost" },
                { Code: "LIAB", Name: "Personal Liability (Coverage E)", Limit: pick([100000, 300000, 500000]), Premium: Math.round(basePremium * 0.08) },
                { Code: "MED", Name: "Medical Payments (Coverage F)", Limit: 5000, Premium: Math.round(basePremium * 0.02) },
                { Code: "OTHER", Name: "Other Structures (Coverage B)", Limit: Math.round(dwellingLimit * 0.10), Premium: Math.round(basePremium * 0.05) },
            ]
        },
        ScheduledItems: Math.random() > 0.6 ? {
            Item: [
                { Description: "Engagement Ring", Value: rand(5000, 25000), Premium: rand(50, 150) },
                { Description: "Art Collection", Value: rand(10000, 50000), Premium: rand(100, 300) },
            ]
        } : null,
        Premium: {
            Base: basePremium,
            TerritoryFactor: location.TerritoryFactor,
            TerritoryAdjustment: Math.round(basePremium * (location.TerritoryFactor - 1)),
            ProtectionClassCredit: Math.round(-protectionCredit),
            RoofAgePenalty: Math.round(roofPenalty),
            NewHomeDiscount: Math.round(-newHomeDiscount),
            ClaimFreeDiscount: Math.round(-claimFreeDiscount),
            MultiPolicyDiscount: Math.random() > 0.4 ? Math.round(-annual * 0.06) : 0,
            Annual: annual,
            Monthly: Math.round(annual / 12),
        },
        RiskAnalysis: {
            ReplacementCostEstimate: replacementCost,
            CurrentDwellingLimit: dwellingLimit,
            CoverageRatio: (coverageRatio * 100).toFixed(1),
            CoinsuranceCompliant: !coinsuranceWarning,
            CoinsuranceWarning: coinsuranceWarning ? `Current limit is ${(coverageRatio * 100).toFixed(0)}% of replacement cost. Coinsurance requires 80%.` : null,
            RoofCondition: roofAge > 15 ? "Consider Replacement" : roofAge > 10 ? "Monitor" : "Good",
        },
        Claims: {
            TotalCount: claims,
            ClaimFreeYears: claimFreeYears,
            Claim: claims > 0 ? [{
                Number: `CLM-${rand(2020, 2023)}-${rand(100000, 999999)}`,
                Date: formatDate(new Date(rand(2020, 2023), rand(0, 11), rand(1, 28))),
                Type: pick(["Wind/Hail", "Water Damage", "Fire", "Theft", "Liability"]),
                Status: "Closed",
                PaidAmount: randFloat(5000, 35000),
                Deductible: 1000,
            }] : [],
        },
    };
}

// Generate Life Policy Data
function generateLifePolicy(insured: any, _location: any, index: number) {
    const age = rand(30, 60);
    const healthClass = pick(["Preferred Plus", "Preferred", "Standard Plus", "Standard"]);
    const termYears = pick([10, 15, 20, 30]);
    const faceAmount = pick([250000, 500000, 750000, 1000000, 1500000]);
    
    const baseRate: Record<string, number> = {
        "Preferred Plus": 0.12, "Preferred": 0.18, "Standard Plus": 0.28, "Standard": 0.45
    };
    const ageMultiplier = 1 + (age - 30) * 0.04;
    const annualPremium = Math.round(faceAmount / 1000 * baseRate[healthClass] * ageMultiplier);
    const riderPremiums = Math.round(annualPremium * 0.12);
    const policyFee = 60;
    const totalAnnual = annualPremium + riderPremiums + policyFee;
    
    const incomeNeed = rand(75000, 250000) * 10;
    const debtTotal = rand(0, 500000);
    const coverageNeed = incomeNeed + debtTotal;
    const coverageGap = Math.max(0, coverageNeed - faceAmount);
    
    // Life has simpler risk scoring based on health class
    const healthRiskScore: Record<string, number> = {
        "Preferred Plus": 15, "Preferred": 30, "Standard Plus": 50, "Standard": 70
    };
    
    return {
        Policy: {
            Number: generatePolicyNumber("LIFE", index),
            LineOfBusiness: "LIFE",
            ProductType: "Term Life",
            TermYears: termYears,
            EffectiveDate: formatDate(new Date(2024 - rand(1, 5), rand(0, 11), rand(1, 28))),
            ExpirationDate: formatDate(new Date(2024 + termYears - rand(1, 5), rand(0, 11), rand(1, 28))),
            Status: "Active",
        },
        LifeInsured: {
            Name: insured.Name,
            DateOfBirth: formatDate(new Date(2024 - age, rand(0, 11), rand(1, 28))),
            Age: age,
            Gender: pick(["Male", "Female"]),
            HealthClass: healthClass,
            Smoker: healthClass === "Standard",
            Occupation: pick(OCCUPATIONS),
        },
        Coverage: {
            FaceAmount: faceAmount,
            DeathBenefit: faceAmount,
            AccidentalDeathRider: Math.random() > 0.5,
            AccidentalDeathAmount: Math.random() > 0.5 ? faceAmount : 0,
            WaiverOfPremium: Math.random() > 0.4,
            ChildRider: Math.random() > 0.7,
            ChildRiderAmount: Math.random() > 0.7 ? 25000 : 0,
        },
        // Coverages array for template compatibility
        Coverages: {
            Coverage: [
                { Code: "DEATH", Name: "Death Benefit", Limit: faceAmount, Premium: annualPremium },
                { Code: "RIDER", Name: "Riders & Fees", Premium: riderPremiums + policyFee },
            ]
        },
        Beneficiaries: {
            Primary: {
                Name: `${pick(FIRST_NAMES)} ${insured.Name.split(" ")[1]}`,
                Relationship: "Spouse",
                Percentage: 100,
            },
            Contingent: Math.random() > 0.5 ? {
                Name: `${pick(FIRST_NAMES)} ${insured.Name.split(" ")[1]}`,
                Relationship: "Child",
                Percentage: 100,
            } : null,
        },
        Premium: {
            Base: annualPremium,
            RiderPremiums: riderPremiums,
            PolicyFee: policyFee,
            Annual: totalAnnual,
            Monthly: Math.round(totalAnnual / 12),
        },
        CoverageAnalysis: {
            IncomeReplacementNeed: incomeNeed,
            DebtPayoffNeed: debtTotal,
            TotalNeed: coverageNeed,
            CurrentCoverage: faceAmount,
            Gap: coverageGap,
            Adequate: coverageGap === 0,
            Recommendation: coverageGap > 0 ? `Consider additional $${coverageGap.toLocaleString()} coverage` : null,
        },
        Claims: {
            TotalCount: 0,
            ClaimFreeYears: rand(1, 10),
        },
        RiskScore: healthRiskScore[healthClass],
        CashValue: 0, // Term life has no cash value
        ConversionOption: {
            Available: termYears >= 20,
            ExpiresAge: 65,
            Description: termYears >= 20 ? "Convert to permanent insurance without evidence of insurability" : null,
        },
    };
}

// Main generator
function generatePolicyStatement(index: number): any {
    const lob: LineOfBusiness = pick(["AUTO", "AUTO", "HOME", "HOME", "LIFE"]); // weighted
    const location = pick(CITIES);
    const tier: CustomerTier = pick(["Standard", "Standard", "Preferred", "Preferred", "Elite"]);
    const customerYears = rand(1, 20);
    
    const insured = {
        Name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        CustomerSince: formatDate(new Date(2024 - customerYears, rand(0, 11), 1)),
        YearsAsCustomer: customerYears,
        Tier: tier,
        Email: "", // populated below
        Phone: `(${rand(200, 999)}) ${rand(200, 999)}-${rand(1000, 9999)}`,
    };
    insured.Email = `${insured.Name.toLowerCase().replace(" ", ".")}@email.com`;
    
    const locationData = {
        Address: `${rand(100, 9999)} ${pick(["Main", "Oak", "Maple", "Park"])} ${pick(["St", "Ave", "Dr"])}`,
        City: location.city,
        State: location.state,
        Zip: location.zip,
        TerritoryCode: location.territory,
        TerritoryFactor: location.factor,
    };
    
    let policyData;
    if (lob === "AUTO") {
        policyData = generateAutoPolicy(insured, locationData, index);
    } else if (lob === "HOME") {
        policyData = generateHomePolicy(insured, locationData, index);
    } else {
        policyData = generateLifePolicy(insured, locationData, index);
    }
    
    const paymentPastDue = Math.random() > 0.9;
    const dueDate = new Date(2024, rand(6, 11), rand(1, 28));
    
    return {
        StatementDate: formatDate(new Date()),
        Insured: insured,
        Location: locationData,
        ...policyData,
        Payment: {
            Method: pick(["Monthly EFT", "Monthly Credit Card", "Annual Check", "Semi-Annual EFT"]),
            NextDueDate: formatDate(dueDate),
            AmountDue: policyData.Premium.Monthly + (policyData.Premium.InstallmentFee || 0),
            PastDue: paymentPastDue,
            DaysPastDue: paymentPastDue ? rand(5, 45) : 0,
            AccountLast4: rand(1000, 9999).toString(),
            AutoPay: Math.random() > 0.3,
        },
        Recommendations: generateRecommendations(lob, policyData),
    };
}

function generateRecommendations(lob: LineOfBusiness, data: any): { Item: any[] } {
    const items = [];
    
    if (lob === "HOME" && data.RiskAnalysis?.CoinsuranceWarning) {
        items.push({
            Type: "Coverage",
            Priority: "High",
            Title: "Increase Dwelling Coverage",
            Description: data.RiskAnalysis.CoinsuranceWarning,
            Action: "Contact agent to review limits",
        });
    }
    
    if (lob === "AUTO" && !data.Coverages.Coverage.find((c: any) => c.Code === "ROAD")) {
        items.push({
            Type: "Optional",
            Priority: "Low",
            Title: "Add Roadside Assistance",
            Description: "24/7 roadside help for breakdowns, flat tires, lockouts",
            EstimatedCost: 24,
        });
    }
    
    if (lob === "LIFE" && data.CoverageAnalysis?.Gap > 0) {
        items.push({
            Type: "Coverage",
            Priority: "Medium",
            Title: "Review Life Insurance Needs",
            Description: data.CoverageAnalysis.Recommendation,
            Action: "Schedule needs analysis",
        });
    }
    
    if (Math.random() > 0.6) {
        items.push({
            Type: "Discount",
            Priority: "Info",
            Title: "Multi-Policy Savings Available",
            Description: "Bundle home and auto for up to 15% savings",
            EstimatedSavings: rand(150, 400),
        });
    }
    
    return { Item: items };
}

// Generate XML output
function toXml(obj: any, rootName: string, indent = 0): string {
    const pad = "  ".repeat(indent);
    let xml = "";
    
    if (Array.isArray(obj)) {
        for (const item of obj) {
            xml += `${pad}<${rootName}>\n${toXml(item, "", indent + 1)}${pad}</${rootName}>\n`;
        }
        return xml;
    }
    
    if (typeof obj === "object" && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) continue;
            if (Array.isArray(value)) {
                xml += toXml(value, key, indent);
            } else if (typeof value === "object") {
                xml += `${pad}<${key}>\n${toXml(value, "", indent + 1)}${pad}</${key}>\n`;
            } else {
                const escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                xml += `${pad}<${key}>${escaped}</${key}>\n`;
            }
        }
    }
    
    return xml;
}

// Main
const count = parseInt(Deno.args[0]) || 50;
console.log(`Generating ${count} insurance policy statements...`);

const statements = [];
for (let i = 0; i < count; i++) {
    statements.push(generatePolicyStatement(i));
}

const xml = `<?xml version="1.0" encoding="utf-8"?>\n<PolicyStatements>\n${statements.map(s => `  <PolicyStatement>\n${toXml(s, "", 2)}  </PolicyStatement>\n`).join("")}</PolicyStatements>`;

const outPath = `./inp/insurance_${count}.xml`;
await Deno.writeTextFile(outPath, xml);
console.log(`✓ Generated ${outPath}`);
