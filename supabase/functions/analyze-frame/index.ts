import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frameBase64, frameIndex, totalFrames } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an advanced multi-stage surveillance AI system. You MUST follow this exact 4-stage pipeline before making any classification. Do NOT skip stages.

STAGE 1 — PERSON DETECTION:
Count every person visible. Note their positions (foreground, background, partially visible).

STAGE 2 — POSE & BODY LANGUAGE ANALYSIS:
For each person, describe their body pose: standing, sitting, walking, running, arms raised, crouching, leaning, etc. Note facial expressions if visible.

STAGE 3 — INTERACTION CONTEXT ANALYSIS:
Analyze relationships between people. Look for critical context clues:
- Are people SMILING or laughing? → Likely friendly
- Is body language RELAXED or TENSE?
- Are movements MUTUAL (both participating) or ONE-SIDED (aggressor vs victim)?
- Is there a CROWD watching in distress, or people casually nearby?
- Are people in a social setting (bar, park, party) where physical contact is normal?
- Hugging, playful pushing, helping someone up, dancing = FRIENDLY, NOT violent
- Only flag if: one person is clearly unwilling, trapped, in pain, or trying to flee

STAGE 4 — FINAL CLASSIFICATION:
Based on ALL above stages, assign a confidence percentage (0-100).
- confidence < 40 → overallStatus: "safe", riskLevel: "LOW"
- confidence 40-70 → overallStatus: "suspicious", riskLevel: "MEDIUM"  
- confidence > 70 → overallStatus: "alert", riskLevel: "HIGH"

CRITICAL RULES TO REDUCE FALSE POSITIVES:
- Friends hugging, playing, or helping each other = SAFE (confidence < 20)
- Bar/party scenes with casual physical contact = SAFE unless clearly violent
- Sports or roughhousing with mutual participation = SAFE
- Only classify as "alert" when there is CLEAR evidence of unwilling victim, fear, pain, or aggression
- When uncertain, ALWAYS err on the side of "safe" or "suspicious", NEVER "alert"

You MUST respond using the provided tool function.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze frame ${frameIndex + 1} of ${totalFrames} from surveillance footage. Follow all 4 stages of the detection pipeline carefully. Pay close attention to context — distinguish friendly interactions from actual threats.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${frameBase64}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_analysis",
                description:
                  "Report the multi-stage analysis results for a surveillance frame",
                parameters: {
                  type: "object",
                  properties: {
                    personsDetected: {
                      type: "number",
                      description: "Number of people detected in frame (Stage 1)",
                    },
                    poseAnalysis: {
                      type: "string",
                      description: "Brief description of body poses observed (Stage 2)",
                    },
                    interactionContext: {
                      type: "string",
                      description: "Analysis of whether interactions appear friendly, neutral, or hostile, with reasoning (Stage 3)",
                    },
                    confidence: {
                      type: "number",
                      description: "Confidence percentage (0-100) that the scene contains actual harassment or violence. Below 40 = safe, 40-70 = suspicious, above 70 = alert (Stage 4)",
                    },
                    behaviors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: [
                              "walking",
                              "standing",
                              "talking",
                              "running",
                              "hugging",
                              "playing",
                              "helping",
                              "pushing",
                              "grabbing",
                              "fighting",
                              "stalking",
                              "close_contact",
                              "aggressive",
                              "normal",
                            ],
                          },
                          description: {
                            type: "string",
                            description: "Brief description of the behavior with context (friendly vs hostile)",
                          },
                          isSuspicious: { type: "boolean" },
                        },
                        required: ["type", "description", "isSuspicious"],
                        additionalProperties: false,
                      },
                    },
                    overallStatus: {
                      type: "string",
                      enum: ["safe", "suspicious", "alert"],
                      description:
                        "Based on confidence: <40=safe, 40-70=suspicious, >70=alert",
                    },
                    riskLevel: {
                      type: "string",
                      enum: ["LOW", "MEDIUM", "HIGH"],
                    },
                    alertType: {
                      type: "string",
                      description:
                        "Type of alert ONLY if confidence > 70 (e.g., PHYSICAL HARASSMENT, AGGRESSIVE BEHAVIOR, STALKING, FIGHTING). Leave empty for friendly interactions.",
                    },
                    summary: {
                      type: "string",
                      description:
                        "One-line summary including the interaction context and confidence level",
                    },
                  },
                  required: [
                    "personsDetected",
                    "poseAnalysis",
                    "interactionContext",
                    "confidence",
                    "behaviors",
                    "overallStatus",
                    "riskLevel",
                    "summary",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "report_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ analysis, frameIndex }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        analysis: {
          personsDetected: 0,
          behaviors: [],
          overallStatus: "safe",
          riskLevel: "LOW",
          summary: "Unable to analyze frame",
        },
        frameIndex,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-frame error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
