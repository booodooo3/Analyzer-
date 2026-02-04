
import { Client } from "@gradio/client";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

async function test() {
    const token = process.env.HUGGING_FACE_TOKEN;
    console.log("Token:", token);

    console.log("--- Testing yisol/IDM-VTON ---");
    try {
        const client = await Client.connect("yisol/IDM-VTON", { hf_token: token as `hf_${string}` } as any);
        console.log("yisol connected");
        const api = await client.view_api();
        console.log(JSON.stringify(api, null, 2));
    } catch (e: any) {
        console.log("yisol failed:", e.message);
    }

    console.log("--- Testing Nymbo/Virtual-Try-On ---");
    try {
        const client = await Client.connect("Nymbo/Virtual-Try-On", { hf_token: token as `hf_${string}` } as any);
        console.log("Nymbo connected");
        const api = await client.view_api();
        console.log(JSON.stringify(api, null, 2));
    } catch (e: any) {
        console.log("Nymbo failed:", e.message);
    }
    
    console.log("--- Testing levihsu/OOTDiffusion ---");
    try {
        const client = await Client.connect("levihsu/OOTDiffusion", { hf_token: token as `hf_${string}` } as any);
        console.log("levihsu/OOTDiffusion connected");
        const api = await client.view_api();
        console.log(JSON.stringify(api, null, 2));
    } catch (e: any) {
        console.log("levihsu/OOTDiffusion failed:", e.message);
    }
}

test();
