
import { Client } from "@gradio/client";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

async function checkYisol() {
    const token = process.env.HUGGING_FACE_TOKEN;
    if (!token) {
        console.error("No HUGGING_FACE_TOKEN found");
        return;
    }

    console.log("Checking yisol/IDM-VTON...");
    try {
        const client = await Client.connect("yisol/IDM-VTON", { hf_token: token as `hf_${string}` } as any);
        const api = await client.view_api();
        console.log("--- yisol/IDM-VTON API ---");
        console.log(JSON.stringify(api, null, 2));
    } catch (e: any) {
        console.error("yisol/IDM-VTON Error:", e.message);
    }
}

checkYisol();
