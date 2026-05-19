import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import {Conversation, TranscriptEntry} from '../types';

interface HistoryScreenProps {
  onBack: () => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({onBack}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  // In production, this loads from KnowledgeBaseService
  // For now, show placeholder state
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const {KnowledgeBaseService} = require('../services/KnowledgeBaseService');
      const kb = KnowledgeBaseService.getInstance();
      const result = await kb.getAllConversations();
      setConversations(result);
    } catch (error) {
      console.log('No conversations loaded yet');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.transcript.some(t => t.text.toLowerCase().includes(query)) ||
      (conv.summary && conv.summary.toLowerCase().includes(query)) ||
      conv.entities.some(e => e.value.toLowerCase().includes(query))
    );
  });

  const handleDeleteConversation = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const {KnowledgeBaseService} = require('../services/KnowledgeBaseService');
              const kb = KnowledgeBaseService.getInstance();
              await kb.deleteConversation(id);
              setConversations(prev => prev.filter(c => c.id !== id));
            } catch (error) {
              console.error('Failed to delete conversation:', error);
            }
          },
        },
      ],
    );
  };

  const handleViewDetail = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowDetail(true);
  };

  const getDuration = (conv: Conversation): string => {
    if (!conv.endedAt) return 'In progress';
    const start = new Date(conv.startedAt).getTime();
    const end = new Date(conv.endedAt).getTime();
    const diffMs = end - start;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getPreview = (conv: Conversation): string => {
    if (conv.transcript.length === 0) return 'No transcript';
    const texts = conv.transcript.map(t => t.text);
    const full = texts.join(' ');
    return full.length > 100 ? full.substring(0, 100) + '...' : full;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Today ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    }
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({item}: {item: Conversation}) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleViewDetail(item)}
      onLongPress={() => handleDeleteConversation(item.id)}>
      <View style={styles.convHeader}>
        <View style={styles.convDateContainer}>
          <Text style={styles.convDate}>{formatDate(item.startedAt)}</Text>
          <Text style={styles.convDuration}>{getDuration(item)}</Text>
        </View>
        <View style={styles.convBadges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.transcript.length} entries
            </Text>
          </View>
          {item.entities.length > 0 && (
            <View style={[styles.badge, styles.entityBadge]}>
              <Text style={styles.badgeText}>
                {item.entities.length} entities
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.convPreview}>{getPreview(item)}</Text>
      {item.entities.length > 0 && (
        <View style={styles.entityTags}>
          {item.entities.slice(0, 3).map((e, i) => (
            <View key={i} style={styles.entityTag}>
              <Text style={styles.entityTagText}>
                {e.type}: {e.value}
              </Text>
            </View>
          ))}
          {item.entities.length > 3 && (
            <Text style={styles.moreEntities}>+{item.entities.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Conversation History</Text>
        <View style={{width: 50}} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#6c757d"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading...' : 'No Conversations Yet'}
            </Text>
            <Text style={styles.emptyText}>
              Conversations will appear here once the agent starts listening.
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetail}
        animationType="slide"
        onRequestClose={() => setShowDetail(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Text style={styles.backText}>← Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Conversation Details</Text>
            <View style={{width: 50}} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedConversation && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Summary</Text>
                  <Text style={styles.detailText}>
                    {selectedConversation.summary || 'No summary available'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Transcript ({selectedConversation.transcript.length} entries)
                  </Text>
                  {selectedConversation.transcript.map((entry, i) => (
                    <View key={i} style={styles.transcriptLine}>
                      <Text style={styles.transcriptSpeaker}>
                        [{entry.speaker.toUpperCase()}]
                      </Text>
                      <Text style={styles.transcriptText}>{entry.text}</Text>
                    </View>
                  ))}
                </View>

                {selectedConversation.entities.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Extracted Entities ({selectedConversation.entities.length})
                    </Text>
                    {selectedConversation.entities.map((entity, i) => (
                      <View key={i} style={styles.entityRow}>
                        <Text style={styles.entityType}>{entity.type}</Text>
                        <Text style={styles.entityValue}>{entity.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  backText: {
    fontSize: 18,
    color: '#00d4ff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  conversationItem: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  convDateContainer: {
    flex: 1,
  },
  convDate: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '600',
  },
  convDuration: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 2,
  },
  convBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#2a2a4a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  entityBadge: {
    backgroundColor: '#3a1a4a',
  },
  badgeText: {
    color: '#8b949e',
    fontSize: 11,
  },
  convPreview: {
    color: '#e6edf3',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  entityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  entityTag: {
    backgroundColor: '#2a1a3a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#4a2a6a',
  },
  entityTagText: {
    color: '#b080ff',
    fontSize: 11,
  },
  moreEntities: {
    color: '#8b949e',
    fontSize: 11,
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00d4ff',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
    paddingBottom: 6,
  },
  detailText: {
    color: '#e6edf3',
    fontSize: 14,
    lineHeight: 20,
  },
  transcriptLine: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  transcriptSpeaker: {
    color: '#ff9900',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 48,
  },
  transcriptText: {
    color: '#e6edf3',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  entityRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  entityType: {
    color: '#b080ff',
    fontSize: 12,
    fontWeight: '600',
    width: 100,
    textTransform: 'capitalize',
  },
  entityValue: {
    color: '#e6edf3',
    fontSize: 13,
    flex: 1,
  },
});

export default HistoryScreen;
