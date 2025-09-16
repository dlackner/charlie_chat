//MAYK NEED TO REFACTOR FOR V2 RELEASE
//IMPORTS RENTAL DATA FROM CSV FILE
import { updateRentalRatesData } from '../../../components/utils/rental_rates.js';

export async function GET() {
  try {
    console.log("🚀 Starting rental rates upload...");
    const fileId = await updateRentalRatesData();
    console.log("✅ Upload completed! File ID:", fileId);
    return Response.json({ 
      success: true, 
      fileId,
      message: "Rental rates data uploaded successfully!" 
    });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}