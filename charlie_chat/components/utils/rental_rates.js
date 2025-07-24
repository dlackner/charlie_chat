// rental_rates.js
import OpenAI from "openai";
import fs from "fs";
import path from "path";

export async function updateRentalRatesData() {
  const openai = new OpenAI({ 
    apiKey: "your-api-key-here"
  });
  
  const filePath = path.join(process.cwd(), 'public', 'Monthly Rental Rates.csv');
  
  const file = await openai.files.create({
    file: fs.createReadStream(filePath),
    purpose: "assistants"
  });

  await openai.beta.vectorStores.files.create(
    "vs_685d8d7855d48191ad045b262f7df262",
    { file_id: file.id }
  );

  return file.id;
}