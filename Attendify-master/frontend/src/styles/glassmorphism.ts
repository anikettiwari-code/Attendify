/**
 * Glassmorphism Styled Components
 * Modern, elegant UI design with glass effect
 */

import styled from 'styled-components';

export const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 24px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.2);
  }
`;

export const GlassButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => 
    props.variant === 'danger' ? 'rgba(239, 68, 68, 0.3)' :
    props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.15)' :
    'rgba(59, 130, 246, 0.3)'
  };
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 12px 24px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => 
      props.variant === 'danger' ? 'rgba(239, 68, 68, 0.5)' :
      props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.25)' :
      'rgba(59, 130, 246, 0.5)'
    };
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const GlassInput = styled.input`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
`;

export const GlassSelect = styled.select`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: all 0.3s ease;
  cursor: pointer;
  
  option {
    background: #1e293b;
    color: white;
  }
  
  &:focus {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
`;

export const Badge = styled.span<{ color?: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.color || 'rgba(59, 130, 246, 0.3)'};
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

export const FloatingActionButton = styled.button`
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

export const SuccessBanner = styled.div`
  background: rgba(34, 197, 94, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(34, 197, 94, 0.5);
  border-radius: 12px;
  padding: 16px 24px;
  color: white;
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideIn 0.3s ease;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const ErrorBanner = styled.div`
  background: rgba(239, 68, 68, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 12px;
  padding: 16px 24px;
  color: white;
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideIn 0.3s ease;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 3}, 1fr);
  gap: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
