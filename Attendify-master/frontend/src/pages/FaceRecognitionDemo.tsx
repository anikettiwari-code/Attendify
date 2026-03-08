/**
 * Face Recognition Demo Page
 * Visual demonstration of real-time face detection and recognition
 * Shows bounding boxes, confidence scores, and identity labels
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import Webcam from 'react-webcam';

const API_BASE_URL = 'http://localhost:8000';

// Types
interface FaceResult {
  success: boolean;
  status: string;
  student_name?: string;
  confidence: number;
  confidence_label: string;
  proxy_suspected: boolean;
  face_rect?: number[];
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 32px;
  color: white;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(90deg, #7c3aed, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  opacity: 0.7;
  font-size: 16px;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const VideoSection = styled.div`
  position: relative;
`;

const VideoContainer = styled.div`
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(124, 58, 237, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`;

const ControlBar = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: center;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  
  ${props => {
    if (props.variant === 'primary') {
      return `
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: white;
        &:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4); }
      `;
    }
    if (props.variant === 'danger') {
      return `
        background: linear-gradient(135deg, #ef4444, #f87171);
        color: white;
        &:hover { transform: translateY(-2px); }
      `;
    }
    return `
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      &:hover { background: rgba(255, 255, 255, 0.2); }
    `;
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const InfoPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const CardTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const StatItem = styled.div`
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 12px;
  text-align: center;
`;

const StatValue = styled.div<{ color?: string }>`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.color || '#fff'};
`;

const StatLabel = styled.div`
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
`;

const ConfidenceBar = styled.div<{ value: number; label: string }>`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => Math.min(100, props.value)}%;
    background: ${props => {
      if (props.label === 'HIGH') return 'linear-gradient(90deg, #10b981, #34d399)';
      if (props.label === 'MEDIUM') return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      return 'linear-gradient(90deg, #ef4444, #f87171)';
    }};
    transition: width 0.3s;
  }
`;

const RecognitionResult = styled.div<{ success: boolean }>`
  padding: 16px;
  border-radius: 12px;
  background: ${props => props.success 
    ? 'rgba(16, 185, 129, 0.2)' 
    : 'rgba(239, 68, 68, 0.2)'};
  border: 1px solid ${props => props.success 
    ? 'rgba(16, 185, 129, 0.5)' 
    : 'rgba(239, 68, 68, 0.5)'};
`;

const IdentityTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 20px;
  font-weight: 600;
  margin-top: 8px;
`;

const LogEntry = styled.div`
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProxyWarning = styled.div`
  padding: 12px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 8px;
  color: #fca5a5;
  margin-top: 12px;
`;

const FaceRecognitionDemo: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<FaceResult | null>(null);
  const [fps, setFps] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [recognitionLog, setRecognitionLog] = useState<{name: string, time: string, confidence: number}[]>([]);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processFrame = useCallback(async () => {
    if (!webcamRef.current || !canvasRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    // Update FPS
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    try {
      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      
      // Send to backend
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      
      const result = await fetch(`${API_BASE_URL}/api/attendance/mark`, {
        method: 'POST',
        body: formData,
      });
      
      const data: FaceResult = await result.json();
      setLastResult(data);
      setDetectionCount(prev => prev + 1);
      
      // Draw on canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = webcamRef.current.video;
      
      if (ctx && video) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // If face detected, draw bounding box
        if (data.face_rect && data.face_rect.length === 4) {
          const [x, y, w, h] = data.face_rect;
          
          // Draw box
          ctx.strokeStyle = data.student_name ? '#10b981' : '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          
          // Draw label background
          const label = data.student_name || 'Unknown';
          ctx.font = 'bold 16px Arial';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = data.student_name ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(x, y - 30, textWidth + 20, 28);
          
          // Draw label text
          ctx.fillStyle = 'white';
          ctx.fillText(label, x + 10, y - 10);
          
          // Draw confidence
          if (data.confidence > 0) {
            const confText = `${data.confidence.toFixed(1)}%`;
            ctx.font = '12px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(confText, x + w - 40, y + h + 18);
          }
        }
        
        // Draw "multiple faces" warning
        if (data.status?.includes('Multiple')) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(10, 10, 200, 30);
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = 'white';
          ctx.fillText('⚠️ Multiple Faces!', 20, 30);
        }
      }
      
      // Add to log if recognized
      if (data.student_name && data.confidence > 50) {
        setRecognitionLog(prev => [{
          name: data.student_name!,
          time: new Date().toLocaleTimeString(),
          confidence: data.confidence
        }, ...prev.slice(0, 4)]);
      }
      
    } catch (error) {
      console.error('Recognition error:', error);
    }
  }, []);

  const startDemo = () => {
    setIsRunning(true);
    setDetectionCount(0);
    setRecognitionLog([]);
    intervalRef.current = setInterval(processFrame, 500); // 2 FPS for demo
  };

  const stopDemo = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <Container>
      <Header>
        <Title>🔬 Face Recognition Demo</Title>
        <Subtitle>Real-time face detection and identity verification visualization</Subtitle>
      </Header>
      
      <MainContent>
        <VideoSection>
          <VideoContainer>
            <Webcam
              ref={webcamRef}
              audio={false}
              width={800}
              height={600}
              screenshotFormat="image/jpeg"
              style={{ display: 'block', width: '100%' }}
              videoConstraints={{
                width: 800,
                height: 600,
                facingMode: "user"
              }}
            />
            <Canvas ref={canvasRef} />
          </VideoContainer>
          
          <ControlBar>
            {!isRunning ? (
              <Button variant="primary" onClick={startDemo}>
                ▶️ Start Recognition
              </Button>
            ) : (
              <Button variant="danger" onClick={stopDemo}>
                ⏹️ Stop
              </Button>
            )}
            <Button onClick={() => window.location.href = '/dashboard/mark-attendance'}>
              📸 Go to Attendance Kiosk
            </Button>
          </ControlBar>
        </VideoSection>
        
        <InfoPanel>
          <Card>
            <CardTitle>📊 Live Statistics</CardTitle>
            <StatGrid>
              <StatItem>
                <StatValue color="#7c3aed">{fps}</StatValue>
                <StatLabel>FPS</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue color="#10b981">{detectionCount}</StatValue>
                <StatLabel>Detections</StatLabel>
              </StatItem>
            </StatGrid>
          </Card>
          
          <Card>
            <CardTitle>👤 Recognition Result</CardTitle>
            {lastResult ? (
              <>
                <RecognitionResult success={!!lastResult.student_name}>
                  <div style={{ opacity: 0.7, fontSize: '12px' }}>STATUS</div>
                  <div style={{ fontWeight: 600 }}>{lastResult.status}</div>
                  
                  {lastResult.student_name && (
                    <IdentityTag>
                      ✓ {lastResult.student_name}
                    </IdentityTag>
                  )}
                </RecognitionResult>
                
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Confidence</span>
                    <span style={{ fontWeight: 600 }}>
                      {lastResult.confidence.toFixed(1)}% ({lastResult.confidence_label})
                    </span>
                  </div>
                  <ConfidenceBar value={lastResult.confidence} label={lastResult.confidence_label} />
                </div>
                
                {lastResult.proxy_suspected && (
                  <ProxyWarning>
                    ⚠️ <strong>Proxy Risk Detected!</strong>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {lastResult.status}
                    </div>
                  </ProxyWarning>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>
                Start recognition to see results
              </div>
            )}
          </Card>
          
          <Card>
            <CardTitle>📝 Recognition Log</CardTitle>
            {recognitionLog.length > 0 ? (
              recognitionLog.map((entry, i) => (
                <LogEntry key={i}>
                  <span>✓ {entry.name}</span>
                  <span style={{ opacity: 0.6, fontSize: '12px' }}>
                    {entry.time} · {entry.confidence.toFixed(0)}%
                  </span>
                </LogEntry>
              ))
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px', fontSize: '14px' }}>
                Recognized faces will appear here
              </div>
            )}
          </Card>
          
          <Card>
            <CardTitle>ℹ️ How It Works</CardTitle>
            <div style={{ fontSize: '13px', lineHeight: 1.7, opacity: 0.8 }}>
              <p><strong>1. Face Detection:</strong> Haar Cascade identifies faces in each frame</p>
              <p><strong>2. Feature Extraction:</strong> LBPH extracts facial patterns</p>
              <p><strong>3. Matching:</strong> Compares against enrolled faces</p>
              <p><strong>4. Confidence:</strong> Distance score converted to %</p>
            </div>
          </Card>
        </InfoPanel>
      </MainContent>
    </Container>
  );
};

export default FaceRecognitionDemo;
