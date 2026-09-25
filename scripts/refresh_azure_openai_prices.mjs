#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputFlagIndex = process.argv.indexOf("--output");
const outputPath = resolve(
  outputFlagIndex >= 0 && process.argv[outputFlagIndex + 1]
    ? process.argv[outputFlagIndex + 1]
    : "docs/ptu-estimate/retail-prices-usd.json"
);
const initialUrl = new URL("https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview");
initialUrl.searchParams.set("currencyCode", "USD");
initialUrl.searchParams.set("$filter", "contains(productName, 'Azure OpenAI')");

async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Azure Retail Prices API returned ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 500));
    }
  }
  throw lastError;
}

const meters = [];
let nextUrl = initialUrl.href;
while (nextUrl) {
  const payload = await fetchPage(nextUrl);
  meters.push(...(payload.Items || []));
  nextUrl = payload.NextPageLink || "";
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  currencyCode: "USD",
  source: "https://prices.azure.com/api/retail/prices",
  meters: meters
    .filter(meter => ["Consumption", "Reservation"].includes(meter.type))
    .map(meter => ({
      armRegionName: meter.armRegionName,
      priceType: meter.type,
      productName: meter.productName,
      reservationTerm: meter.reservationTerm || "",
      retailPrice: meter.retailPrice,
      skuName: meter.skuName,
      unitOfMeasure: meter.unitOfMeasure
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
};

if (!snapshot.meters.length) throw new Error("Azure Retail Prices API returned no Azure OpenAI meters.");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(snapshot));
console.log(`Wrote ${snapshot.meters.length} Azure OpenAI USD meters to ${outputPath}`);