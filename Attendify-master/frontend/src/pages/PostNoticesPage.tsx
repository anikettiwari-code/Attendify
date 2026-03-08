import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { GlassCard, GlassButton, GlassInput } from '../styles/glassmorphism';
import { API_ENDPOINTS, apiClient } from '../utils/api';
import type { Notice } from '../types';

const Container = styled.div`
  padding: 32px;
`;

const NoticeList = styled.div`
  margin-top: 32px;
`;

const NoticeCard = styled(GlassCard)`
  padding: 20px;
  margin-bottom: 16px;
  position: relative;
  
  h3 { margin-bottom: 8px; }
  p { opacity: 0.8; font-size: 14px; margin-bottom: 12px; }
  span { font-size: 12px; opacity: 0.6; }
`;

const PostNoticesPage = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Get role from storage
    const role = localStorage.getItem('userRole') || 'student';
    const canPost = role === 'admin' || role === 'faculty';

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const res = await apiClient.get<Notice[]>(API_ENDPOINTS.GET_NOTICES);
            setNotices(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post(API_ENDPOINTS.CREATE_NOTICE, {
                title, 
                content, 
                author: 'Faculty' 
            });
            setTitle('');
            setContent('');
            fetchNotices();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('Delete this notice?')) return;
        try {
            await apiClient.delete(API_ENDPOINTS.DELETE_NOTICE(id));
            fetchNotices();
        } catch(error) { console.error(error); }
    }

    return (
        <Container>
            <h1>{canPost ? '📢 Post Notices Interface' : '📢 Campus Notices'}</h1>
            
            {canPost && (
            <GlassCard>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>Title</label>
                        <GlassInput 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="Notice Title" 
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>Message</label>
                        <textarea 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            placeholder="Write notice content here..." 
                            required
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                background: 'rgba(255,255,255,0.1)', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                borderRadius: '8px',
                                color: 'inherit',
                                minHeight: '100px'
                            }}
                        />
                    </div>
                    <GlassButton disabled={loading}>
                        {loading ? 'Posting...' : '🚀 Post Notice'}
                    </GlassButton>
                </form>
            </GlassCard>
            )}

            <NoticeList>
                <h2>{canPost ? 'Recent Notices' : 'Latest Announcements'}</h2>
                {notices.length === 0 ? <p style={{opacity:0.6}}>No notices posted yet.</p> : (
                    notices.map(notice => (
                        <NoticeCard key={notice.id}>
                            <h3>{notice.title}</h3>
                            <p>{notice.content}</p>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>Posted by {notice.author} on {new Date(notice.date).toLocaleDateString()}</span>
                                {canPost && (
                                <button 
                                    onClick={() => handleDelete(notice.id)}
                                    style={{background:'transparent', border:'none', color:'#ff6b6b', cursor:'pointer'}}
                                >
                                    🗑️ Delete
                                </button>
                                )}
                            </div>
                        </NoticeCard>
                    ))
                )}
            </NoticeList>
        </Container>
    );
};

export default PostNoticesPage;
