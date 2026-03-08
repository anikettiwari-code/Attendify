import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { ScanFace, CheckCircle, AlertTriangle } from 'lucide-react-native';

// Simulation of AI recognition events
export interface AIUpdateLog {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'uncertain';
  confidence: number;
  timestamp: string;
}

export function AIStatusFeed({
  isActive,
  onReview,
  externalLogs = []
}: {
  isActive: boolean,
  onReview?: (log: AIUpdateLog) => void,
  externalLogs?: AIUpdateLog[]
}) {
  const [logs, setLogs] = useState<AIUpdateLog[]>([]);
  const blinkAnim = useRef(new Animated.Value(0.5)).current;

  // Pulse animation for live indicator
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 0.2, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      blinkAnim.setValue(0.5);
    }
  }, [isActive]);

  // Merge logs
  useEffect(() => {
    if (externalLogs.length > 0) {
      setLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newLogs = externalLogs.filter(l => !existingIds.has(l.id));
        return [...newLogs, ...prev].slice(0, 20);
      });
    }
  }, [externalLogs]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Recognition Logs</Text>
        {isActive && (
          <Animated.View style={[styles.liveIndicator, { opacity: blinkAnim }]} />
        )}
      </View>

      <ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>Waiting for camera feed...</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logContent}>
                {log.type === 'success' ? (
                  <CheckCircle size={14} color={COLORS.success} />
                ) : log.type === 'info' ? (
                  <ScanFace size={14} color={COLORS.primary} />
                ) : (
                  <AlertTriangle size={14} color={COLORS.warning} />
                )}
                <View style={styles.logTextContainer}>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  <Text style={styles.logMeta}>
                    {log.timestamp} • {(log.confidence * 100).toFixed(0)}% match
                  </Text>
                </View>
              </View>
              {log.type === 'uncertain' && onReview && (
                <TouchableOpacity
                  style={styles.reviewAction}
                  onPress={() => onReview(log)}
                >
                  <Text style={styles.reviewActionText}>Mark</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    height: 250,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: SPACING.xs,
  },
  title: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },
  scroll: {
    flex: 1,
  },
  emptyText: {
    color: '#475569',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  logContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  logTextContainer: {
    flex: 1,
    gap: 2,
  },
  logMessage: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '500',
  },
  logMeta: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  reviewAction: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: 8,
  },
  reviewActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
