import { useState } from 'react';

function App() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <h1>مولد الصور الذكي 🎨</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="وصف الصورة (مثلاً: قطة ترتدي نظارة شمسية)" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          style={{ padding: '10px', width: '300px', fontSize: '16px' }} 
        /> 
        <button 
          onClick={generateImage} 
          disabled={loading} 
          style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '16px', cursor: 'pointer' }} 
        > 
          {loading ? "جاري الرسم..." : "توليد الصورة"} 
        </button> 
      </div> 

      {image && ( 
        <div style={{ marginTop: '20px' }}> 
          <img src={image} alt="Generated AI" style={{ maxWidth: '100%', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /> 
        </div> 
      )} 
    </div> 
  );
}

export default App;