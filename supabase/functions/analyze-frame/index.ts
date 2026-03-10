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
              content: `You are a surveillance AI system analyzing video frames for harassment and suspicious behavior. 
Analyze the provided image frame and detect:
1. Number of people visible
2. Their body positions and interactions
3. Any signs of: physical harassment, aggressive behavior, stalking, fighting, unusual close contact, pushing, grabbing

You MUST respond using the provided tool function.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze frame ${frameIndex + 1} of ${totalFrames} from surveillance footage. Detect people and assess any harassment or suspicious behavior.`,
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
                  "Report the analysis results for a surveillance frame",
                parameters: {
                  type: "object",
                  properties: {
                    personsDetected: {
                      type: "number",
                      description: "Number of people detected in frame",
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
                            description: "Brief description of the behavior",
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
                        "safe = normal, suspicious = warrants attention, alert = immediate action needed",
                    },
                    riskLevel: {
                      type: "string",
                      enum: ["LOW", "MEDIUM", "HIGH"],
                    },
                    alertType: {
                      type: "string",
                      description:
                        "Type of alert if suspicious/alert (e.g., PHYSICAL HARASSMENT, AGGRESSIVE BEHAVIOR, STALKING BEHAVIOR, FIGHTING, CLOSE CONTACT)",
                    },
                    summary: {
                      type: "string",
                      description:
                        "One-line summary of what was detected in the frame",
                    },
                  },
                  required: [
                    "personsDetected",
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
