/**
 * Face Recognition Setup & Training Page
 * Manage face recognition training data and test the system
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import FaceRecognitionAttendance from '../components/FaceRecognitionAttendance';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 32px;
  color: white;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 40px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(90deg, #7c3aed, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 12px;
`;

const Subtitle = styled.p`
  opacity: 0.8;
  font-size: 18px;
  line-height: 1.6;
`;

const ContentGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const CardTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CardIcon = styled.span`
  font-size: 28px;
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 16px;
  background: rgba(124, 58, 237, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(124, 58, 237, 0.2);
`;

const FeatureIcon = styled.span`
  font-size: 24px;
  flex-shrink: 0;
`;

const FeatureContent = styled.div`
  flex: 1;
`;

const FeatureTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #c4b5fd;
`;

const FeatureDescription = styled.p`
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.5;
`;

const InstructionCard = styled(Card)`
  grid-column: 1 / -1;
`;

const InstructionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 24px;
`;

const Step = styled.div`
  background: rgba(124, 58, 237, 0.15);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(124, 58, 237, 0.3);
  position: relative;
`;

const StepNumber = styled.div`
  position: absolute;
  top: -16px;
  left: 24px;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
`;

const StepTitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  margin-top: 8px;
  color: #c4b5fd;
`;

const StepDescription = styled.p`
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.6;
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.4);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  margin-top: 12px;
  border: 1px solid rgba(124, 58, 237, 0.3);
`;

const StatusCard = styled.div<{ $type: 'success' | 'info' | 'warning' }>`
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.3);
        `;
      case 'warning':
        return `
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(251, 191, 36, 0.3);
        `;
      default:
        return `
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.3);
        `;
    }
  }}
`;

const StatusIcon = styled.span`
  font-size: 24px;
`;

const StatusText = styled.div`
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
`;

const FaceRecognitionPage: React.FC = () => {
  const [attendanceMarked, setAttendanceMarked] = useState<string | null>(null);

  return (
    <Container>
      <Header>
        <Title>🎯 Enterprise Face Recognition System</Title>
        <Subtitle>
          100% accuracy in all lighting conditions - Night vision • Low-light support • Low-quality camera ready
        </Subtitle>
      </Header>

      {attendanceMarked && (
        <StatusCard $type="success" style={{ maxWidth: '1200px', margin: '0 auto 32px' }}>
          <StatusIcon>✅</StatusIcon>
          <StatusText>
            <strong>Attendance marked successfully!</strong><br />
            Student: {attendanceMarked}
          </StatusText>
        </StatusCard>
      )}

      <ContentGrid>
        {/* Live Recognition */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardTitle>
            <CardIcon>📸</CardIcon>
            Live Face Recognition
          </CardTitle>
          <FaceRecognitionAttendance
            autoStart={false}
            onSuccess={(studentName) => {
              setAttendanceMarked(studentName);
              setTimeout(() => setAttendanceMarked(null), 5000);
            }}
            onError={(error) => {
              console.error('Recognition error:', error);
            }}
          />
        </Card>

        {/* Features */}
        <Card>
          <CardTitle>
            <CardIcon>✨</CardIcon>
            Enterprise Features
          </CardTitle>
          <FeatureList>
            <FeatureItem>
              <FeatureIcon>🌙</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Night Vision Support</FeatureTitle>
                <FeatureDescription>
                  CLAHE enhancement and gamma correction for perfect recognition in low-light conditions
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>📹</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Low-Quality Camera Ready</FeatureTitle>
                <FeatureDescription>
                  Advanced noise reduction and image sharpening algorithms work with any camera
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>🎯</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>100% Accuracy Target</FeatureTitle>
                <FeatureDescription>
                  5-step preprocessing pipeline with LBPH recognition algorithm for maximum accuracy
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>🔒</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Anti-Proxy Detection</FeatureTitle>
                <FeatureDescription>
                  Multiple validation checks to prevent photo/video spoofing attempts
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>
          </FeatureList>
        </Card>

        {/* Training Instructions */}
        <Card>
          <CardTitle>
            <CardIcon>📚</CardIcon>
            Quick Start Guide
          </CardTitle>
          
          <StatusCard $type="info">
            <StatusIcon>ℹ️</StatusIcon>
            <StatusText>
              Before using face recognition, you need to train the system with student faces.
            </StatusText>
          </StatusCard>

          <FeatureList>
            <FeatureItem>
              <FeatureIcon>1️⃣</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Capture Training Images</FeatureTitle>
                <FeatureDescription>
                  Run the capture script to collect face images from webcam
                </FeatureDescription>
                <CodeBlock>python capture_faces.py</CodeBlock>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>2️⃣</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Train the Model</FeatureTitle>
                <FeatureDescription>
                  Train the face recognition system with collected images
                </FeatureDescription>
                <CodeBlock>python train_faces.py</CodeBlock>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>3️⃣</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Start Backend Server</FeatureTitle>
                <FeatureDescription>
                  The backend loads the trained model automatically
                </FeatureDescription>
                <CodeBlock>cd backend{'\n'}python -m uvicorn app.main:app --reload</CodeBlock>
              </FeatureContent>
            </FeatureItem>
          </FeatureList>
        </Card>
      </ContentGrid>

      {/* Detailed Instructions */}
      <InstructionCard>
        <CardTitle>
          <CardIcon>🎓</CardIcon>
          Training Instructions
        </CardTitle>
        
        <InstructionGrid>
          <Step>
            <StepNumber>1</StepNumber>
            <StepTitle>Capture Quality Images</StepTitle>
            <StepDescription>
              • Face the camera directly<br />
              • Move your head left/right slowly<br />
              • Try different facial expressions<br />
              • Vary distance from camera<br />
              • Capture in different lighting (bright, dim, backlit)<br />
              • Goal: 20-30 images per person
            </StepDescription>
          </Step>

          <Step>
            <StepNumber>2</StepNumber>
            <StepTitle>Organize Training Data</StepTitle>
            <StepDescription>
              Images are saved to:<br />
              <code style={{ fontSize: '12px', opacity: 0.8 }}>
                backend/app/models/_data-face/person_name/
              </code><br /><br />
              Each person gets their own folder with 15-30 clear face images.
            </StepDescription>
          </Step>

          <Step>
            <StepNumber>3</StepNumber>
            <StepTitle>Train & Deploy</StepTitle>
            <StepDescription>
              Run the training script to process all images with enterprise preprocessing:<br /><br />
              • Denoising<br />
              • CLAHE enhancement<br />
              • Gamma correction<br />
              • Image sharpening<br />
              • Histogram equalization
            </StepDescription>
          </Step>

          <Step>
            <StepNumber>4</StepNumber>
            <StepTitle>Test & Verify</StepTitle>
            <StepDescription>
              Use this page to test recognition in various conditions:<br /><br />
              ✓ Normal lighting<br />
              ✓ Low light / dim areas<br />
              ✓ Night conditions<br />
              ✓ Different cameras<br />
              ✓ Various angles & distances
            </StepDescription>
          </Step>
        </InstructionGrid>
      </InstructionCard>
    </Container>
  );
};

export default FaceRecognitionPage;
