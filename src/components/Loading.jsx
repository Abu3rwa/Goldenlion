const Loading = () => {
    return (
        <div className="loading-screen">
            <div className="loading-container">
                <div className="loading-lion">
                    <svg viewBox="0 0 100 100" className="lion-icon">
                        <defs>
                            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#D4AF37" />
                                <stop offset="50%" stopColor="#F4D03F" />
                                <stop offset="100%" stopColor="#D4AF37" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#goldGradient)" strokeWidth="2" className="loading-ring" />
                        <text x="50" y="58" textAnchor="middle" fontSize="40" fill="url(#goldGradient)" className="lion-emoji">🦁</text>
                    </svg>
                </div>
                <h2 className="loading-title">مجمـوعة الأسـد</h2>
                <p className="loading-text">جاري التحميل...</p>
                <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <style>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 50%, #1A1A1A 100%);
            font-family: 'Tajwal', sans-serif;
          }
          .loading-container {
            text-align: center;
          }
          .loading-lion {
            width: 120px;
            height: 120px;
            margin: 0 auto 1.5rem;
            animation: pulse 2s ease-in-out infinite;
          }
          .lion-icon {
            width: 100%;
            height: 100%;
          }
          .loading-ring {
            animation: spin 3s linear infinite;
            transform-origin: center;
          }
          .lion-emoji {
            animation: bounce 1.5s ease-in-out infinite;
          }
          .loading-title {
            color: #D4AF37;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
          }
          .loading-text {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }
          .loading-dots {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
          }
          .loading-dots span {
            width: 10px;
            height: 10px;
            background: #D4AF37;
            border-radius: 50%;
            animation: dotPulse 1.4s ease-in-out infinite;
          }
          .loading-dots span:nth-child(2) {
            animation-delay: 0.2s;
          }
          .loading-dots span:nth-child(3) {
            animation-delay: 0.4s;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.3)); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(212, 175, 55, 0.6)); }
          }
          @keyframes spin {
            from { stroke-dasharray: 0 283; stroke-dashoffset: 0; }
            50% { stroke-dasharray: 150 133; }
            to { stroke-dasharray: 0 283; stroke-dashoffset: -283; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          @keyframes dotPulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        </div>
    );
};
export default Loading;