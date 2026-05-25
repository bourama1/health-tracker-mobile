import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Card,
  Portal,
  Dialog,
  Button,
  Divider,
  Chip,
  useTheme,
  ActivityIndicator as PaperActivityIndicator,
  Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiAnalyze, aiChat } from '@/src/services/api';

const AI_PROVIDERS = [
  { value: 'groq', label: 'Groq (Free/Fast)', model: 'Llama 3.3 70B' },
  {
    value: 'gemini',
    label: 'Google Gemini (Free Tier)',
    model: 'Gemini 2.0 Flash',
  },
  { value: 'openai', label: 'OpenAI (Paid)', model: 'GPT-4o mini' },
];

const CONTEXT_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  workout: 'Workout',
  'workout stats': 'Workout Stats',
  'workout history': 'Workout History',
  measurements: 'Measurements',
};

// ─── Markdown Parser (Basic) ──────────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  const theme = useTheme();
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  lines.forEach((line) => {
    if (/^##+ /.test(line)) {
      elements.push(
        <Text
          key={key++}
          style={[styles.h2, { color: theme.colors.secondary }]}
        >
          {line.replace(/^##+ /, '')}
        </Text>
      );
    } else if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      elements.push(
        <View key={key++} style={styles.listItem}>
          <Text style={{ color: theme.colors.onSurface }}>• </Text>
          <Text
            style={[styles.body, { color: theme.colors.onSurface, flex: 1 }]}
          >
            {line.replace(/^[-*] /, '').replace(/^\d+\. /, '')}
          </Text>
        </View>
      );
    } else if (line.trim() !== '') {
      elements.push(
        <Text
          key={key++}
          style={[styles.body, { color: theme.colors.onSurface }]}
        >
          {line}
        </Text>
      );
    }
  });

  return <View style={styles.markdownContainer}>{elements}</View>;
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

function ChatMessage({ role, content }: { role: string; content: string }) {
  const theme = useTheme();
  const isUser = role === 'user';

  return (
    <View
      style={[
        styles.messageWrapper,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isUser
              ? theme.colors.secondary
              : theme.colors.surfaceVariant,
            borderBottomRightRadius: isUser ? 0 : 12,
            borderBottomLeftRadius: isUser ? 12 : 0,
          },
        ]}
      >
        {isUser ? (
          <Text style={{ color: theme.colors.onSecondary }}>{content}</Text>
        ) : (
          <MarkdownBlock text={content} />
        )}
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiInsights({
  data,
  contextType,
}: {
  data: any;
  contextType: string;
}) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [conversation, setConversation] = useState<any[] | null>(null);

  const [config, setConfig] = useState({
    provider: 'groq',
    apiKey: '',
    userGoal: 'General health optimization',
  });

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const p = await AsyncStorage.getItem('ai_provider');
        const k = await AsyncStorage.getItem('ai_api_key');
        const g = await AsyncStorage.getItem('ai_user_goal');
        setConfig({
          provider: p || 'groq',
          apiKey: k || '',
          userGoal: g || 'General health optimization',
        });
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('ai_provider', config.provider);
      await AsyncStorage.setItem('ai_api_key', config.apiKey);
      await AsyncStorage.setItem('ai_user_goal', config.userGoal);
      setSettingsVisible(false);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  const runAnalysis = useCallback(async () => {
    if (!config.apiKey) {
      setSettingsVisible(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await aiAnalyze({
        provider: config.provider,
        apiKey: config.apiKey,
        userGoal: config.userGoal,
        data,
        contextType,
      });

      setConversation([{ role: 'assistant', content: response.data.insights }]);
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Analysis failed. Check your API key.'
      );
    } finally {
      setLoading(false);
    }
  }, [config, data, contextType]);

  const handleOpen = () => {
    setVisible(true);
    if (!conversation) {
      runAnalysis();
    }
  };

  const sendFollowUp = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const updated = [
      ...(conversation || []),
      { role: 'user', content: question },
    ];
    setConversation(updated);

    try {
      const response = await aiChat({
        provider: config.provider,
        apiKey: config.apiKey,
        userGoal: config.userGoal,
        contextType,
        messages: updated,
      });

      setConversation([
        ...updated,
        { role: 'assistant', content: response.data.reply },
      ]);
    } catch (err: any) {
      setConversation([
        ...updated,
        {
          role: 'assistant',
          content: '⚠️ ' + (err.response?.data?.error || 'Failed to respond.'),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <Button
        mode="outlined"
        onPress={handleOpen}
        icon="auto-fix"
        style={styles.triggerButton}
        labelStyle={{ fontSize: 12 }}
        compact
      >
        AI Insights
      </Button>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>AI Coach</Text>
              <Text style={styles.subtitle}>
                {CONTEXT_LABELS[contextType] || contextType} Analysis
              </Text>
            </View>
            <IconButton
              icon="cog"
              size={20}
              onPress={() => setSettingsVisible(true)}
            />
            <IconButton
              icon="close"
              size={20}
              onPress={() => setVisible(false)}
            />
          </View>

          <Divider />

          <ScrollView
            ref={scrollRef}
            style={styles.chatArea}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {loading && <ActivityIndicator style={{ marginTop: 40 }} />}
            {error && (
              <Card style={styles.errorCard}>
                <Card.Content>
                  <Text style={{ color: theme.colors.error }}>{error}</Text>
                </Card.Content>
              </Card>
            )}

            {!loading && !conversation && !error && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="robot"
                  size={48}
                  color={theme.colors.outline}
                />
                <Text style={{ color: theme.colors.outline, marginTop: 12 }}>
                  Set your API key to get insights.
                </Text>
              </View>
            )}

            {conversation?.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}

            {chatLoading && (
              <View style={styles.typingIndicator}>
                <PaperActivityIndicator size={12} />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
          >
            <View style={styles.inputContainer}>
              <TextInput
                mode="outlined"
                placeholder="Ask a follow-up..."
                value={chatInput}
                onChangeText={setChatInput}
                style={styles.input}
                dense
                right={
                  <TextInput.Icon
                    icon="send"
                    onPress={sendFollowUp}
                    disabled={!chatInput.trim() || chatLoading}
                  />
                }
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Dialog
          visible={settingsVisible}
          onDismiss={() => setSettingsVisible(false)}
        >
          <Dialog.Title>AI Settings</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Personal Goal"
              value={config.userGoal}
              onChangeText={(t) => setConfig({ ...config, userGoal: t })}
              style={{ marginBottom: 12 }}
            />
            <View style={{ marginBottom: 12 }}>
              <Text style={{ marginBottom: 4 }}>Provider</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {AI_PROVIDERS.map((p) => (
                  <Chip
                    key={p.value}
                    selected={config.provider === p.value}
                    onPress={() => setConfig({ ...config, provider: p.value })}
                    style={{ marginRight: 8 }}
                  >
                    {p.label}
                  </Chip>
                ))}
              </ScrollView>
            </View>
            <TextInput
              label="API Key"
              secureTextEntry
              value={config.apiKey}
              onChangeText={(t) => setConfig({ ...config, apiKey: t })}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSettingsVisible(false)}>Cancel</Button>
            <Button onPress={saveSettings}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    alignSelf: 'flex-start',
    marginVertical: 8,
    borderRadius: 20,
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    flex: 1,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  chatArea: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
  },
  markdownContainer: {
    gap: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  typingText: {
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.6,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    opacity: 0.5,
  },
});
