/**
 * Enterprise Analytics Dashboard
 * ==============================
 * Comprehensive security monitoring and attendance analytics
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import { apiClient } from '../utils/api';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const PageContainer = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #1a1a2e;
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  
  span {
    font-size: 0.9rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 500;
  }
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div<{ variant?: string }>`
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.5s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => {
      switch(props.variant) {
        case 'success': return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        case 'danger': return 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
        case 'warning': return 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)';
        case 'info': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }
    }};
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.1);
  }
  
  h3 { 
    color: #7f8c8d; 
    font-size: 0.85rem; 
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  
  .value { 
    font-size: 2.5rem; 
    font-weight: 800; 
    color: #1a1a2e;
    margin: 0;
    line-height: 1.2;
  }
  
  .subtitle {
    font-size: 0.85rem;
    color: #95a5a6;
    margin-top: 4px;
  }
`;

const SecurityScore = styled.div<{ score: number }>`
  font-size: 2.5rem;
  font-weight: 800;
  background: ${props => {
    if (props.score >= 90) return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
    if (props.score >= 70) return 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)';
    return 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
  }};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const GridLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  animation: ${fadeIn} 0.5s ease;
  
  h3 {
    color: #1a1a2e;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 1rem;
    text-align: left;
  }
  
  th { 
    color: #7f8c8d;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #f0f2f5;
  }
  
  td {
    border-bottom: 1px solid #f8f9fa;
  }
  
  tr:last-child td { 
    border-bottom: none; 
  }
  
  tr:hover td {
    background: #f8f9fa;
  }
`;

const RiskBadge = styled.span<{ level: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  
  ${props => {
    switch(props.level) {
      case 'CRITICAL':
        return `
          background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
          color: white;
        `;
      case 'HIGH':
        return `
          background: #fff5f5;
          color: #c0392b;
          border: 1px solid #ffcccc;
        `;
      case 'MEDIUM':
        return `
          background: #fffbf0;
          color: #d68910;
          border: 1px solid #ffeeba;
        `;
      default:
        return `
          background: #f0fff4;
          color: #27ae60;
          border: 1px solid #c3e6cb;
        `;
    }
  }}
`;

const AlertCard = styled.div<{ critical?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1rem;
  background: ${props => props.critical ? '#fff5f5' : '#f8f9fa'};
  border-radius: 12px;
  margin-bottom: 0.75rem;
  border-left: 4px solid ${props => props.critical ? '#e74c3c' : '#667eea'};
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(4px);
  }
  
  .icon {
    font-size: 1.5rem;
  }
  
  .content {
    flex: 1;
    
    .title {
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 2px;
    }
    
    .time {
      font-size: 0.8rem;
      color: #95a5a6;
    }
  }
`;

const LiveIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #27ae60;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #27ae60;
    border-radius: 50%;
    animation: ${pulse} 2s infinite;
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #667eea;
  font-weight: 600;
`;

const AnalyticsDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, statsRes, anomaliesRes] = await Promise.all([
        apiClient.get('/api/analytics/dashboard'),
        apiClient.get('/api/analytics/stats?days=7'),
        apiClient.get('/api/analytics/anomalies?limit=20')
      ]);
      
      setDashboard(dashboardRes.data);
      setStats(statsRes.data);
      setAnomalies(anomaliesRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingOverlay>
          <div>🔄 Loading Enterprise Analytics...</div>
        </LoadingOverlay>
      </PageContainer>
    );
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

  const pieData = stats?.verification_methods 
    ? Object.entries(stats.verification_methods).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <PageContainer>
      <Header>
        <Title>
          🛡️ Enterprise Security Dashboard
          <span>LIVE</span>
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LiveIndicator>Real-time monitoring</LiveIndicator>
          <RefreshButton onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </RefreshButton>
        </div>
      </Header>

      <StatGrid>
        <StatCard variant="info">
          <h3>Today's Attendance</h3>
          <p className="value">{dashboard?.today?.total_attendance || 0}</p>
          <div className="subtitle">Total check-ins today</div>
        </StatCard>
        
        <StatCard variant="danger">
          <h3>Security Anomalies</h3>
          <p className="value" style={{ color: '#e74c3c' }}>{dashboard?.today?.anomalies || 0}</p>
          <div className="subtitle">Flagged for review</div>
        </StatCard>
        
        <StatCard variant="success">
          <h3>Security Score</h3>
          <SecurityScore score={dashboard?.today?.security_score || 100}>
            {Math.round(dashboard?.today?.security_score || 100)}%
          </SecurityScore>
          <div className="subtitle">System integrity</div>
        </StatCard>
        
        <StatCard variant="warning">
          <h3>Active Sessions</h3>
          <p className="value">{dashboard?.today?.active_sessions || 0}</p>
          <div className="subtitle">Currently accepting</div>
        </StatCard>
        
        <StatCard variant="info">
          <h3>Avg Confidence</h3>
          <p className="value">{stats?.avg_confidence?.toFixed(1) || 0}%</p>
          <div className="subtitle">Recognition accuracy</div>
        </StatCard>
        
        <StatCard variant="success">
          <h3>Success Rate</h3>
          <p className="value" style={{ color: '#27ae60' }}>{stats?.success_rate?.toFixed(1) || 0}%</p>
          <div className="subtitle">Verification success</div>
        </StatCard>
      </StatGrid>

      <GridLayout>
        <Section>
          <h3>📈 Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboard?.weekly_trend || []}>
              <defs>
                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f45c43" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f45c43" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fill: '#95a5a6', fontSize: 12 }} />
              <YAxis tick={{ fill: '#95a5a6', fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="attendance" stroke="#667eea" strokeWidth={2} fillOpacity={1} fill="url(#colorAttendance)" name="Attendance" />
              <Area type="monotone" dataKey="anomalies" stroke="#f45c43" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomalies)" name="Anomalies" />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section>
          <h3>🔐 Verification Methods</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoDataMessage>
              <div className="icon">📊</div>
              <div>No verification data yet</div>
            </NoDataMessage>
          )}
        </Section>

        <Section>
          <h3>🚨 Critical Alerts</h3>
          {dashboard?.critical_alerts && dashboard.critical_alerts.length > 0 ? (
            dashboard.critical_alerts.map((alert: any) => (
              <AlertCard key={alert.id} critical>
                <div className="icon">⚠️</div>
                <div className="content">
                  <div className="title">{alert.student}</div>
                  <div className="time">{alert.reason}</div>
                  <div className="time">{new Date(alert.time).toLocaleString()}</div>
                </div>
                <RiskBadge level="CRITICAL">CRITICAL</RiskBadge>
              </AlertCard>
            ))
          ) : (
            <NoDataMessage>
              <div className="icon">✅</div>
              <div>No critical alerts. System secure!</div>
            </NoDataMessage>
          )}
        </Section>

        <Section>
          <h3>📊 Anomaly Types</h3>
          {dashboard?.anomaly_breakdown && Object.keys(dashboard.anomaly_breakdown).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(dashboard.anomaly_breakdown).map(([type, count]) => ({ type, count }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fill: '#95a5a6', fontSize: 12 }} />
                <YAxis type="category" dataKey="type" tick={{ fill: '#95a5a6', fontSize: 12 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#667eea" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataMessage>
              <div className="icon">🎉</div>
              <div>No anomalies detected!</div>
            </NoDataMessage>
          )}
        </Section>
      </GridLayout>

      <Section>
        <h3>🔍 Recent Security Events</h3>
        {anomalies.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Risk Factor</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a: any) => (
                  <tr key={a.id}>
                    <td>{new Date(a.timestamp).toLocaleString()}</td>
                    <td>
                      <strong>{a.student_name}</strong>
                      <br />
                      <small style={{ color: '#95a5a6' }}>{a.student_roll}</small>
                    </td>
                    <td>{a.status}</td>
                    <td>{a.confidence ? `${a.confidence.toFixed(1)}%` : '-'}</td>
                    <td>
                      <RiskBadge level={
                        a.anomaly_reason?.includes('🚨') ? 'CRITICAL' : 
                        a.anomaly_reason?.includes('🔴') ? 'HIGH' : 
                        'MEDIUM'
                      }>
                        {a.anomaly_reason?.split(',')[0] || 'Unknown'}
                      </RiskBadge>
                    </td>
                    <td>{a.verification_method || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <NoDataMessage>
            <div className="icon">🔒</div>
            <div>No security events. All systems operational.</div>
          </NoDataMessage>
        )}
      </Section>
    </PageContainer>
  );
};

export default AnalyticsDashboard;
