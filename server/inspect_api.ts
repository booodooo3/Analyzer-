
import { Client } from "@gradio/client";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

async function inspect() {
    const token = process.env.HUGGING_FACE_TOKEN;
    if (!token) {
        console.error("No token found");
        return;
    }
    console.log("Connecting with token:", token);
    try {
        console.log("--- Kwai-Kolors ---");
        try {
            const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", { hf_token: token as `hf_${string}` } as any);
            console.log("Connected to Kwai-Kolors");
        } catch(e: any) { console.log("Kwai failed", e.message); }

        console.log("--- IDM-VTON ---");
        try {
            const client2 = await Client.connect("yisol/IDM-VTON", { hf_token: token as `hf_${string}` } as any);
            console.log("Connected to IDM-VTON");
             const api = await client2.view_api();
             console.log(JSON.stringify(api, null, 2));
        } catch(e: any) { console.log("IDM-VTON failed", e.message); }

        console.log("--- levihsu/OOTDiffusion ---");
        try {
            const client5 = await Client.connect("levihsu/OOTDiffusion", { hf_token: token as `hf_${string}` } as any);
            console.log("Connected to levihsu");
            const api = await client5.view_api();
            console.log(JSON.stringify(api, null, 2));
        } catch(e: any) { console.log("levihsu failed", e.message); }
    } catch (e) {
        console.error("Error connecting:", e);
    }
}

inspect();
