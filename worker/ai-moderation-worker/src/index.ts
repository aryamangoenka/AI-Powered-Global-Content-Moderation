/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default { 
    async fetch(request: Request, env: any): Promise<Response> {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // ✅ Handle CORS preflight (OPTIONS request)
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        // ✅ Allow only POST requests
        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Only POST requests are allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        try {
            // Parse request body safely
            let body: { content?: string };
            try {
                body = await request.json();
            } catch (error) {
                return new Response(JSON.stringify({ error: "Invalid JSON input" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            if (!body.content) {
                return new Response(JSON.stringify({ error: "Missing 'content' field in request" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            // ✅ Call Perspective API
            const response = await fetch("https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=" + env.PERSPECTIVE_API_KEY, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    comment: { text: body.content },
                    languages: ["en"],
                    requestedAttributes: { TOXICITY: {} }
                }),
            });

            const result = await response.json();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });

        } catch (error: unknown) {
            return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
    }
};
