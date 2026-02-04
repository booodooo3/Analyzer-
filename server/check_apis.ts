
import { Client } from "@gradio/client";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

async function checkApis() {
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

    console.log("Checking levihsu/OOTDiffusion...");
    try {
        const client = await Client.connect("levihsu/OOTDiffusion", { hf_token: token as `hf_${string}` } as any);
        const api = await client.view_api();
        console.log("--- levihsu/OOTDiffusion API ---");
        console.log(JSON.stringify(api, null, 2));
    } catch (e: any) {
        console.error("levihsu/OOTDiffusion Error:", e.message);
    }
}

checkApis();
