import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { GlassCard, GlassButton, GlassInput } from '../styles/glassmorphism';
import { studentService } from '../services/studentService';
import type { Student } from '../types';

const Container = styled.div`
    padding: 32px;
    max-width: 1100px;
    margin: 0 auto;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const ScrollList = styled.div`
    max-height: 420px;
    overflow-y: auto;
    padding-right: 6px;
`;

const FaceRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(241, 245, 249, 0.7);
    margin-bottom: 10px;
`;

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    const loadStudents = async () => {
        try {
            setLoadingStudents(true);
            const data = await studentService.getAll();
            setStudents(data);
        } catch (error) {
            console.warn('Failed to load registered students', error);
        } finally {
            setLoadingStudents(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Camera error", err);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            
            canvas.toBlob(blob => {
                if (blob) {
                    setCapturedImage(blob);
                    setPreviewUrl(URL.createObjectURL(blob));
                    // Stop camera
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach(track => track.stop());
                }
            }, 'image/jpeg');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!capturedImage) {
            alert("Please capture a face photo first");
            return;
        }

        setLoading(true);
        setStatus("Registering...");

        try {
            const response = await studentService.register(name, rollNo, capturedImage);
            setStatus("✅ Success: " + response.message);
            setName('');
            setRollNo('');
            setCapturedImage(null);
            setPreviewUrl(null);
            loadStudents();
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || error.message || "Registration failed";
            setStatus("❌ Error: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <h1>👤 Register New Student</h1>
            <Grid>
                <GlassCard>
                    <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="student-name">Student Name</label>
                        <GlassInput id="student-name" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="roll-number">Roll Number / ID</label>
                        <GlassInput id="roll-number" value={rollNo} onChange={e => setRollNo(e.target.value)} required placeholder="STU-001" />
                    </div>

                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <label htmlFor="face-preview">Face Registration</label>
                        <div style={{ margin: '10px 0', background: '#000', height: '300px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                            {previewUrl ? (
                                <img id="face-preview" src={previewUrl} alt="Captured face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <video id="face-preview" ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
                                    <track kind="captions" />
                                </video>
                            )}
                        </div>
                        {previewUrl ? (
                            <GlassButton type="button" onClick={() => { setPreviewUrl(null); setCapturedImage(null); startCamera(); }}>Retake</GlassButton>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <GlassButton type="button" onClick={startCamera}>Start Camera</GlassButton>
                                <GlassButton type="button" onClick={capturePhoto}>Capture Photo</GlassButton>
                            </div>
                        )}
                    </div>

                    <GlassButton type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                        {loading ? 'Registering...' : 'Complete Registration'}
                    </GlassButton>
                    
                    {status && <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold' }}>{status}</p>}
                </form>
                </GlassCard>

                <GlassCard>
                    <h3 style={{ marginBottom: '12px' }}>Registered Faces</h3>
                    {loadingStudents && <p>Loading...</p>}
                    {!loadingStudents && students.length === 0 && <p>No students registered yet.</p>}
                    {!loadingStudents && students.length > 0 && (
                        <ScrollList>
                            {students.map((student) => (
                                <FaceRow key={student.id}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{student.roll_number}</div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: '#0f172a' }}>Face ✅</span>
                                </FaceRow>
                            ))}
                        </ScrollList>
                    )}
                </GlassCard>
            </Grid>
        </Container>
    );
};

export default RegisterPage;
