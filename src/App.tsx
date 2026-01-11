import { useState } from 'react';
import './index.css'; // ضروري عشان يقرأ تصميمك

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
    <div className="container">
      <div className="card">
        <h1>🎨 مولد الصور</h1>
        
        <input 
          className="input-field"
          type="text" 
          placeholder="اكتب وصف الصورة..." 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
        /> 
        
        <button 
          className="generate-btn"
          onClick={generateImage} 
          disabled={loading}
        > 
          {loading ? "جاري الرسم..." : "توليد"} 
        </button> 

        {image && ( 
          <div className="image-result"> 
            <img src={image} alt="Generated AI" /> 
          </div> 
        )} 
      </div>
    </div>
  );
}

export default App;