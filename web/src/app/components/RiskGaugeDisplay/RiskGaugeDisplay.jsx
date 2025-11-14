// web/src/app/components/RiskGaugeDisplay/RiskGaugeDisplay.jsx

import React from 'react';
const PREDICTION_CONFIDENCE = 75.5; 
const API_BASE_URL = 'http://localhost:8000'; 

const RiskGaugeDisplay = () => {
    const gaugeUrl = `${API_BASE_URL}/v1/api/risk_gauge/${PREDICTION_CONFIDENCE}`;

    return (
        <div style={{ 
            padding: '5px', // Reduced padding
            border: '1px solid #ccc', 
            borderRadius: '8px',
            maxWidth: '250px', // Further reduced max-width (adjust as needed, e.g., 200px-300px)
            margin: '0 auto',
            display: 'flex', // Added flexbox for better internal alignment
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <h3 style={{ 
                textAlign: 'center', 
                fontSize: '1em', // Reduced font size for title
                marginBottom: '5px' // Reduced margin below title
            }}>Prediction Likelihood Gauge</h3>
            
            <img 
                src={gaugeUrl} 
                alt={`Risk Gauge for ${PREDICTION_CONFIDENCE}%`} 
                style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    display: 'block', 
                    margin: '0 auto' 
                }} 
            />
            <p style={{ 
                textAlign: 'center', 
                marginTop: '5px', // Reduced margin above confidence level
                fontSize: '0.8em' // Reduced font size for confidence level
            }}>
                Confidence Level: <strong>{PREDICTION_CONFIDENCE}%</strong>
            </p>
        </div>
    );
};

export default RiskGaugeDisplay;