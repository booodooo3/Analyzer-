
import { Client } from "@gradio/client";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const token = process.env.HUGGING_FACE_TOKEN;
console.log(`🔑 Testing Token: ${token?.substring(0, 5)}...`);

async function testConnection(space: string) {
    console.log(`\n🚀 Connecting to ${space}...`);
    try {
        const client = await Client.connect(space, { hf_token: token } as any);
        console.log(`✅ Connected to ${space} successfully!`);
        
        // Try a simple prediction to check quota/status if possible, or just view API
        const api = await client.view_api();
        console.log(`📄 API found with ${Object.keys(api).length} endpoints.`);
        
    } catch (error: any) {
        console.error(`❌ Failed to connect to ${space}:`);
        console.error(error.message);
    }
}

async function main() {
    await testConnection("yisol/IDM-VTON");
    await testConnection("levihsu/OOTDiffusion");
}

main();
