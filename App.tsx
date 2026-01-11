import { useState } from 'react';
import './index.css'; // الحين هذا السطر ما راح يسبب مشاكل لأننا سوينا الملف

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const generateImage = async () => {
    if (!prompt) return;
    
    setLoading(true);
    setImage(null);

    try {
      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.image) {
        setImage(data.image);
      } else {
        alert("حدث خطأ: " + (data.error || "غير معروف"));
      }

    } catch (error) {
      console.error(error);
      alert("فشل الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🎨 مولد الصور (Replicate)</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="اكتب وصف الصورة..." 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          style={{ padding: '12px', width: '300px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }} 
        /> 
        <button 
          onClick={generateImage} 
          disabled={loading} 
          style={{ padding: '12px 25px', fontSize: '16px', marginLeft: '10px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }} 
        > 
          {loading ? "جاري الرسم..." : "توليد"} 
        </button> 
      </div> 

      {image && ( 
        <div style={{ marginTop: '30px' }}> 
          <img src={image} alt="Generated AI" style={{ maxWidth: '100%', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} /> 
        </div> 
      )} 
    </div> 
  );
}

export default App;