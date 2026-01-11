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

  // --- منطقة التصميم (Styles) ---
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0f172a', // لون خلفية كحلي غامق فخم
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    textAlign: 'center',
    maxWidth: '600px',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '15px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: '#334155',
    color: 'white',
    fontSize: '16px',
    marginBottom: '20px',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: loading ? '#64748b' : '#3b82f6', // أزرق جميل
    color: 'white',
    padding: '15px 30px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: loading ? 'not-allowed' : 'pointer',
    width: '100%',
    transition: '0.3s',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: '10px', fontSize: '2.5rem' }}>🎨 AI Image Generator</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
          اكتب خيالك وسأقوم برسمه لك بالذكاء الاصطناعي
        </p>
        
        <input 
          type="text" 
          placeholder="اكتب وصف الصورة هنا (بالإنجليزي أفضل)..." 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          style={inputStyle} 
        /> 
        
        <button onClick={generateImage} disabled={loading} style={buttonStyle}> 
          {loading ? "جارِ الرسم... 🖌️" : "توليد الصورة ✨"} 
        </button> 

        {image && ( 
          <div style={{ marginTop: '30px', animation: 'fadeIn 1s' }}> 
            <img 
              src={image} 
              alt="Generated AI" 
              style={{ width: '100%', borderRadius: '10px', border: '2px solid #3b82f6' }} 
            /> 
            <p style={{ marginTop: '10px', color: '#4ade80' }}>تم الرسم بنجاح! ✅</p>
          </div> 
        )} 
      </div>
    </div>
  );
}

export default App;