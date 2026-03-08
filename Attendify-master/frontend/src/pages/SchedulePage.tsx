import React, { useState, useRef, useEffect } from 'react';
import { scheduleService } from '../services/scheduleService';
import type { ScheduleEntry } from '../types/timetable.types';
import './SchedulePage.css';
import './StudentSchedule.css';

const SchedulePage = () => {
    // Get real user role from storage
    const role = localStorage.getItem('userRole') || 'student'; 

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Dynamic schedule state
    type ClassInfo = { subject: string; room: string; professor: string };
    type ScheduleData = Record<string, Record<string, ClassInfo>>;
    const [scheduleData, setScheduleData] = useState<ScheduleData>({});

    const timeSlots = ['9:00 - 10:00', '10:00 - 11:00', '11:00 - 11:30', '11:30 - 12:30', '12:30 - 1:30'];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    useEffect(() => {
        if (role === 'student') {
            fetchSchedule();
        }
    }, [role]);

    const fetchSchedule = async () => {
        try {
            // Fetch real schedule from backend
            // In a production app, we would pass the student's class_group_id here
            const entries = await scheduleService.getSchedule();
            const transformed = transformSchedule(entries);
            setScheduleData(transformed);
        } catch (error) {
            console.error("Failed to fetch schedule:", error);
        }
    };

    const transformSchedule = (entries: ScheduleEntry[]) => {
        const data: ScheduleData = {};
        const daysMap = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        // Mapping periods to slots. 
        // Slot 0: 9:00-10:00 (Period 0)
        // Slot 1: 10:00-11:00 (Period 1)
        // Slot 2: 11:00-11:30 (BREAK)
        // Slot 3: 11:30-12:30 (Period 2)
        // Slot 4: 12:30-1:30 (Period 3)
        
        entries.forEach(entry => {
            const dayName = daysMap[entry.day];
            if (!dayName) return;
            
            // Adjust period index to skip the break slot (index 2)
            let slotIndex = entry.period;
            if (slotIndex >= 2) slotIndex++; // Shift period 2 to slot 3, period 3 to slot 4
            
            const timeSlot = timeSlots[slotIndex];
            if (!timeSlot) return;

            if (!data[dayName]) data[dayName] = {};
            data[dayName][timeSlot] = {
                subject: entry.subject_name,
                room: entry.room_number,
                professor: entry.teacher_name
            };
        });
        return data;
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile: File) => {
        setFile(selectedFile);
        setUploaded(false);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            await scheduleService.uploadTimetable(file);
            setUploaded(true);
        } catch (error) {
            console.error("Upload failed", error);
            // Optionally show error to user
        } finally {
            setUploading(false);
        }
    };

    const openFileDialog = () => {
        inputRef.current?.click();
    };

    if (role === 'student') {
        return (
            <div className="student-schedule-container">
                <div className="ss-header">
                    <h2>Weekly Timetable</h2>
                    <p>View your complete class schedule for the week</p>
                </div>

                <div className="schedule-grid-container">
                    <table className="schedule-table">
                        <thead>
                            <tr>
                                <th>Day / Time</th>
                                {timeSlots.map((time, index) => (
                                    <th key={index}>{time}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weekDays.map((day) => (
                                <tr key={day}>
                                    <td>{day}</td>
                                    {timeSlots.map((time, index) => {
                                        // Specific logic for break time
                                        if (time === '11:00 - 11:30') {
                                            return index === 2 && day === 'Monday' ? (
                                                <td key={time} rowSpan={5} className="break-cell vertical-text">Break</td>
                                            ) : null;
                                        }

                                        const classInfo = scheduleData[day]?.[time];

                                        if (time === '11:00 - 11:30') {
                                            return <td key={time} className="break-cell">Break</td>;
                                        }

                                        return (
                                            <td key={time}>
                                                {classInfo ? (
                                                    <div className="class-cell-content">
                                                        <span className="class-subject">{classInfo.subject}</span>
                                                        <div className="class-meta">
                                                            <span className="class-room">
                                                                <i className='bx bx-map'></i> {classInfo.room}
                                                            </span>
                                                            <span className="class-prof">
                                                                <i className='bx bx-user'></i> {classInfo.professor ? classInfo.professor.split(' ')[1] : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="empty-cell">Free</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="schedule-page">
            <div className="sp-header">
                <h2>Upload Timetable</h2>
                <p>Upload a PDF or image of the timetable to automatically update student schedules</p>
            </div>

            <div className="upload-card">
                <div
                    className={`drop-zone ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={openFileDialog}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleChange}
                        style={{ display: 'none' }}
                    />
                    <div className="drop-icon">
                        <i className='bx bx-cloud-upload'></i>
                    </div>
                    <p className="drop-text">
                        Drag and drop your timetable here, or <span>browse</span>
                    </p>
                    <p className="drop-hint">Supports PDF, PNG, JPG (Max 10MB)</p>
                </div>

                {file && (
                    <div className="file-preview">
                        <div className="file-info">
                            <i className='bx bx-file'></i>
                            <div className="file-details">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                        </div>
                        <button
                            className={`btn-upload ${uploading ? 'uploading' : ''} ${uploaded ? 'uploaded' : ''}`}
                            onClick={handleUpload}
                            disabled={uploading || uploaded}
                        >
                            {uploading ? (
                                <>
                                    <i className='bx bx-loader-alt bx-spin'></i> Processing (AI)...
                                </>
                            ) : uploaded ? (
                                <>
                                    <i className='bx bx-check'></i> Uploaded & Parsed
                                </>
                            ) : (
                                <>
                                    <i className='bx bx-upload'></i> Upload & Parse
                                </>
                            )}
                        </button>
                    </div>
                )}

                {uploaded && (
                    <div className="success-message">
                        <i className='bx bx-check-circle'></i>
                        <span>Timetable successfully parsed! Student schedules have been updated.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchedulePage;
