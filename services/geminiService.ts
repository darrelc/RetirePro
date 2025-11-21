import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SimulationResult, FinancialSettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeRetirementPlan = async (
  settings: FinancialSettings,
  result: SimulationResult
): Promise<string> => {
  const modelId = "gemini-2.5-flash";

  // Summarize data to reduce token count, taking every 5th year plus key events
  const summarizedData = result.data
    .filter((d, i) => i % 5 === 0 || d.age === settings.retirementAge || d.portfolioBalance <= 0)
    .map(d => ({
      age: d.age,
      balance: Math.round(d.portfolioBalance),
      shortfall: Math.round(d.shortfall)
    }));

  const prompt = `
    Act as a senior financial planner. Analyze the following retirement scenario for a user.
    
    **User Profile:**
    - Current Age: ${settings.currentAge}
    - Target Retirement Age: ${settings.retirementAge}
    - Monthly Spending Goal (Today's $): $${settings.monthlySpending}
    - Inflation Assumption: ${settings.inflationRate}%
    
    **Simulation Outcome:**
    - Portfolio Depleted: ${!result.success}
    - Depletion Age: ${result.depletionAge || "N/A (Funds lasted)"}
    - Final Balance at Age ${settings.planningHorizon}: $${Math.round(result.finalBalance).toLocaleString()}
    
    **Trajectory Sample (Age | Balance | Shortfall):**
    ${JSON.stringify(summarizedData)}

    Provide a concise, professional assessment. 
    1. Give a status verdict (On Track / At Risk / Needs Action).
    2. Highlight 2-3 key strengths or weaknesses.
    3. Suggest specific actionable strategies to improve the plan (e.g., "Increase savings by X", "Delay retirement by Y years").
    Keep the tone encouraging but realistic. Limit response to 300 words.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert retirement analyst focused on strategic financial advice.",
        temperature: 0.7,
      }
    });

    return response.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while generating the analysis. Please try again.";
  }
};
