/**
 * Face Recognition Attendance Component
 * Enterprise-grade face recognition with low-light support
 * Integrated into the attendance marking system
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const API_BASE_URL = 'http://localhost:8000';

// Types
interface FaceVerificationResult {
  success: boolean;
  status: string;
  student_name?: string;
  confidence: number;
  confidence_label: string;
  proxy_suspected: boolean;
  face_rect?: number[];
  message?: string;
  notes?: string[];
}

interface FaceRecognitionProps {
  onSuccess?: (studentName: string, confidence: number) => void;
  onError?: (error: string) => void;
  onBiometricRequired?: (data: { blob: Blob; latitude?: number; longitude?: number }) => void;
  autoStart?: boolean;
}

// Styled Components
const Container = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const StatusOverlay = styled.div<{ $active: boolean }>`
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  background: ${props => props.$active ? 'rgba(139, 92, 246, 0.9)' : 'rgba(0, 0, 0, 0.7)'};
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
`;

const StatusIcon = styled.span`
  font-size: 18px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${props => {
    switch (props.$variant) {
      case 'danger':
        return `
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
        `;
      case 'secondary':
        return `
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          &:hover { background: rgba(255, 255, 255, 0.15); }
        `;
      default:
        return `
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ResultCard = styled.div<{ $success: boolean }>`
  padding: 16px;
  border-radius: 12px;
  background: ${props => props.$success 
    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))' 
    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))'};
  border: 1px solid ${props => props.$success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
  margin-bottom: 16px;
`;

const ResultTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
`;

const ResultDetails = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.6;
`;

const InfoBadge = styled.div<{ $type: 'success' | 'warning' | 'info' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return 'background: rgba(34, 197, 94, 0.2); color: #86efac;';
      case 'warning':
        return 'background: rgba(251, 191, 36, 0.2); color: #fcd34d;';
      default:
        return 'background: rgba(59, 130, 246, 0.2); color: #93c5fd;';
    }
  }}
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const FeatureBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const FeatureBadge = styled.div`
  padding: 6px 12px;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(167, 139, 250, 1);
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const FaceRecognitionAttendance: React.FC<FaceRecognitionProps> = ({
  onSuccess,
  onError,
  onBiometricRequired,
  autoStart = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string>('Ready to scan');
  const [result, setResult] = useState<FaceVerificationResult | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setStatus('📷 Starting camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
        setStatus('✅ Camera ready - Click "Scan Face" to begin');
      }
    } catch (error) {
      console.error('Camera error:', error);
      setStatus('❌ Camera access denied');
      onError?.('Camera access denied. Please allow camera permissions.');
    }
  }, [onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setStatus('Camera stopped');
  }, [stream]);

  // Auto-start camera if enabled
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  // Capture and verify face
  const handleScanFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);
    setStatus('🔍 Analyzing face...');
    setResult(null);

    try {
      // Draw video frame to canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.drawImage(video, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create image blob'));
          },
          'image/jpeg',
          0.95
        );
      });

      // Get user location (optional)
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        setStatus('📍 Location captured - Verifying face...');
      } catch (err) {
        console.warn('Location not available:', err);
        setStatus('⚠️ Location unavailable - Verifying face...');
      }

      // Call backend API
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      if (latitude !== undefined) formData.append('latitude', latitude.toString());
      if (longitude !== undefined) formData.append('longitude', longitude.toString());

      const response = await fetch(`${API_BASE_URL}/api/attendance/mark-with-face`, {
        method: 'POST',
        body: formData,
      });

      const data: FaceVerificationResult = await response.json();
      setResult(data);

      if (data.success) {
        setStatus(`✅ Verified: ${data.student_name}`);
        onSuccess?.(data.student_name || 'Unknown', data.confidence);
        
        // Draw bounding box if available
        if (data.face_rect && ctx) {
          const [x, y, w, h] = data.face_rect;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          
          // Draw label
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x, y - 30, w, 30);
          ctx.fillStyle = '#fff';
          ctx.font = '16px sans-serif';
          ctx.fillText(`${data.student_name} (${data.confidence.toFixed(0)}%)`, x + 5, y - 10);
        }
        return;
      }
      
      // Handle verification failure
      if (data.status === 'Biometric Required') {
        setStatus('🔐 Biometric verification required');
        onBiometricRequired?.({ blob, latitude, longitude });
      } else {
        setStatus(`❌ ${data.message || data.status}`);
        onError?.(data.message || data.status);
      }
    } catch (error: any) {
      console.error('Face verification error:', error);
      const errorMsg = error.message || 'Face verification failed';
      setStatus(`❌ Error: ${errorMsg}`);
      setResult({
        success: false,
        status: 'error',
        confidence: 0,
        confidence_label: 'Error',
        proxy_suspected: false,
        message: errorMsg
      });
      onError?.(errorMsg);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Container>
      <VideoContainer>
        <Video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
        <Canvas ref={canvasRef} />
        <StatusOverlay $active={scanning}>
          <StatusIcon>{scanning ? '🔄' : '📷'}</StatusIcon>
          {status}
          {scanning && <LoadingSpinner />}
        </StatusOverlay>
      </VideoContainer>

      <ButtonContainer>
        {cameraActive ? (
          <>
            <Button
              onClick={handleScanFace}
              disabled={scanning || !cameraActive}
            >
              {scanning ? (
                <>
                  <LoadingSpinner /> Scanning...
                </>
              ) : (
                <>🎯 Scan Face</>
              )}
            </Button>
            <Button
              $variant="secondary"
              onClick={stopCamera}
              disabled={scanning}
            >
              ⏹️ Stop
            </Button>
          </>
        ) : (
          <Button onClick={startCamera}>
            📷 Start Camera
          </Button>
        )}
      </ButtonContainer>

      {result && (
        <ResultCard $success={result.success}>
          <ResultTitle>
            <span>{result.success ? '✅' : '❌'}</span>
            {result.success ? 'Face Verified Successfully' : 'Verification Failed'}
          </ResultTitle>
          <ResultDetails>
            {result.student_name && (
              <div>
                <strong>Student:</strong> {result.student_name}
              </div>
            )}
            <div>
              <strong>Confidence:</strong> {result.confidence.toFixed(1)}% ({result.confidence_label})
            </div>
            {result.status && (
              <div>
                <strong>Status:</strong> {result.status}
              </div>
            )}
            {result.message && (
              <div style={{ marginTop: '8px' }}>
                {result.message}
              </div>
            )}
            {result.notes && result.notes.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {result.notes.map((note) => (
                  <div key={note}>• {note}</div>
                ))}
              </div>
            )}
          </ResultDetails>
          {result.success && (
            <InfoBadge $type={result.proxy_suspected ? 'warning' : 'success'}>
              {result.proxy_suspected ? '⚠️ Proxy Suspected' : '✅ Authentic'}
            </InfoBadge>
          )}
        </ResultCard>
      )}

      <FeatureBadges>
        <FeatureBadge>
          🌙 Night Vision
        </FeatureBadge>
        <FeatureBadge>
          📹 Low-Quality Camera Support
        </FeatureBadge>
        <FeatureBadge>
          🎯 Enterprise-Grade Accuracy
        </FeatureBadge>
        <FeatureBadge>
          🔒 Anti-Proxy Detection
        </FeatureBadge>
      </FeatureBadges>
    </Container>
  );
};

export default FaceRecognitionAttendance;
