import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { createTicketApi, getTicketsApi, getTicketDetailApi, replyTicketApi } from '../api/cafeApi';

interface SupportTicketsModalProps {
  visible: boolean;
  onClose: () => void;
}

const TICKET_CATEGORIES = [
  'Billing & Counter',
  'Thermal Printer & KOT',
  'AI Voice Ordering',
  'Khata & Udhar Ledger',
  'Menu & Item Inventory',
  'Subscription & Plans',
  'General Support',
];

export const SupportTicketsModal: React.FC<SupportTicketsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New ticket form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active ticket chat view
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Fetch tickets
  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await getTicketsApi();
      setTickets(Array.isArray(res) ? res : []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTickets();
      setActiveTicket(null);
    }
  }, [visible]);

  // Submit new ticket
  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject or title for your ticket.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required', 'Please explain your issue in detail.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createTicketApi({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
      });

      if (res?.success) {
        setSubject('');
        setMessage('');
        setActiveTab('list');
        await loadTickets();
        if (res.ticket) {
          setActiveTicket(res.ticket);
        }
        Alert.alert('Success', 'Your support ticket has been submitted. Our team will review and reply shortly.');
      } else {
        Alert.alert('Error', res?.message || 'Could not submit ticket');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Open ticket thread & refresh
  const handleOpenTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    try {
      const fresh = await getTicketDetailApi(ticket._id || ticket.id);
      if (fresh) setActiveTicket(fresh);
    } catch {}
  };

  // Send reply inside ticket thread
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket) return;

    try {
      setReplying(true);
      const updated = await replyTicketApi(activeTicket._id || activeTicket.id, replyText.trim());
      setReplyText('');
      if (updated) {
        setActiveTicket(updated);
        loadTickets();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { label: 'In Progress', bg: 'rgba(56, 189, 248, 0.2)', text: '#38bdf8' };
      case 'resolved':
        return { label: 'Resolved', bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' };
      case 'closed':
        return { label: 'Closed', bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8' };
      default:
        return { label: 'Open', bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/80"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Fixed sheet height: the list / chat inside are flex-1 and collapse to nothing without it */}
        <View
          className="rounded-t-3xl border-t p-5"
          style={{ backgroundColor: colors.card, borderColor: colors.border, height: '88%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
            {activeTicket ? (
              <View className="flex-row items-center flex-1 pr-2">
                <TouchableOpacity onPress={() => setActiveTicket(null)} className="p-1 -ml-1 mr-2">
                  <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-black text-amber-500 font-mono">
                      #{activeTicket.ticketNumber}
                    </Text>
                    {(() => {
                      const badge = getStatusBadge(activeTicket.status);
                      return (
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg }}>
                          <Text className="text-[9px] font-black uppercase" style={{ color: badge.text }}>
                            {badge.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                  <Text className="text-xs font-bold" style={{ color: colors.text }} numberOfLines={1}>
                    {activeTicket.subject}
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-base font-black" style={{ color: colors.text }}>
                  Customer Support & Helpdesk
                </Text>
                <Text className="text-[11px] text-amber-500 font-bold">
                  Raise issues directly to RetelFlow Tech Team
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* TICKET DETAIL / CONVERSATION CHAT VIEW */}
          {activeTicket ? (
            <View className="flex-1">
              <ScrollView
                className="flex-1 mb-3"
                contentContainerStyle={{ paddingVertical: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Issue Header Info Card */}
                <View
                  className="p-3 rounded-2xl border mb-3"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: colors.border }}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[10px] font-bold text-amber-500 uppercase">
                      Category: {activeTicket.category}
                    </Text>
                    <Text className="text-[10px] text-slate-400">
                      Priority: {activeTicket.priority?.toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    {activeTicket.subject}
                  </Text>
                </View>

                {/* Messages Bubbles */}
                {(activeTicket.messages || []).map((msg: any, idx: number) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <View
                      key={idx}
                      className={`mb-3 max-w-[85%] ${isAdmin ? 'self-start' : 'self-end'}`}
                    >
                      <View
                        className="p-3.5 rounded-2xl border"
                        style={{
                          backgroundColor: isAdmin
                            ? isDark ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe'
                            : colors.primary,
                          borderColor: isAdmin ? '#38bdf8' : colors.primary,
                        }}
                      >
                        <View className="flex-row items-center justify-between mb-1 gap-2">
                          <Text
                            className="text-[10px] font-black uppercase"
                            style={{ color: isAdmin ? '#0284c7' : '#000000' }}
                          >
                            {isAdmin ? '🛡️ RetelFlow Support' : '👤 You'}
                          </Text>
                          <Text
                            className="text-[9px] opacity-70"
                            style={{ color: isAdmin ? colors.textSecondary : '#000000' }}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text
                          className="text-xs font-medium leading-relaxed"
                          style={{ color: isAdmin ? colors.text : '#000000' }}
                        >
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Reply Input Bar */}
              <View
                className="flex-row items-center p-2 rounded-2xl border gap-2"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
              >
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Type your reply to tech support..."
                  placeholderTextColor={colors.textMuted}
                  className="flex-1 text-xs font-semibold px-2"
                  style={{ color: colors.text }}
                />
                <TouchableOpacity
                  onPress={handleSendReply}
                  disabled={replying || !replyText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 items-center justify-center active:scale-95"
                  style={{ opacity: replyText.trim() ? 1 : 0.5 }}
                >
                  {replying ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="send" size={16} color="#000" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* TICKETS LIST & CREATE TICKET TABS */
            <View className="flex-1">
              {/* Tab Selector */}
              <View className="flex-row gap-2 mb-3">
                <TouchableOpacity
                  onPress={() => setActiveTab('list')}
                  className="flex-1 py-2 rounded-xl items-center border"
                  style={{
                    backgroundColor: activeTab === 'list' ? colors.primary : colors.card,
                    borderColor: activeTab === 'list' ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-black uppercase"
                    style={{ color: activeTab === 'list' ? '#000' : colors.textSecondary }}
                  >
                    My Tickets ({tickets.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('create')}
                  className="flex-1 py-2 rounded-xl items-center border"
                  style={{
                    backgroundColor: activeTab === 'create' ? colors.primary : colors.card,
                    borderColor: activeTab === 'create' ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-black uppercase"
                    style={{ color: activeTab === 'create' ? '#000' : colors.textSecondary }}
                  >
                    + Raise New Ticket
                  </Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'list' ? (
                /* TICKETS LIST */
                <ScrollView showsVerticalScrollIndicator={false}>
                  {loading ? (
                    <View className="py-8 items-center justify-center">
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text className="text-xs text-slate-400 mt-2 font-semibold">Loading tickets...</Text>
                    </View>
                  ) : tickets.length === 0 ? (
                    <View className="py-8 items-center justify-center">
                      <Ionicons name="ticket-outline" size={40} color={colors.textMuted} />
                      <Text className="text-sm font-bold text-slate-300 mt-2">No Support Tickets Yet</Text>
                      <Text className="text-xs text-slate-500 text-center mt-1 px-4">
                        Face any issue with thermal printing, AI voice, or billing? Raise a ticket and our team will assist you.
                      </Text>
                      <TouchableOpacity
                        onPress={() => setActiveTab('create')}
                        className="mt-4 px-4 py-2 rounded-xl bg-amber-500 active:scale-95"
                      >
                        <Text className="text-xs font-black text-black uppercase">Raise Your First Ticket</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    tickets.map((t, idx) => {
                      const badge = getStatusBadge(t.status);
                      const lastMsg = t.messages?.[t.messages.length - 1];
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleOpenTicket(t)}
                          activeOpacity={0.8}
                          className="p-3.5 mb-2.5 rounded-2xl border shadow-sm active:scale-98"
                          style={{ backgroundColor: colors.card, borderColor: colors.border }}
                        >
                          <View className="flex-row items-center justify-between mb-1">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-xs font-black text-amber-500 font-mono">
                                #{t.ticketNumber}
                              </Text>
                              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg }}>
                                <Text className="text-[9px] font-black uppercase" style={{ color: badge.text }}>
                                  {badge.label}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-[10px] text-slate-400">
                              {new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN')}
                            </Text>
                          </View>

                          <Text className="text-xs font-bold" style={{ color: colors.text }} numberOfLines={1}>
                            {t.subject}
                          </Text>

                          {lastMsg ? (
                            <Text className="text-[11px] text-slate-400 mt-1" numberOfLines={2}>
                              <Text className="font-bold text-slate-300">
                                {lastMsg.sender === 'admin' ? 'Support Reply: ' : 'You: '}
                              </Text>
                              {lastMsg.text}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              ) : (
                /* RAISE TICKET FORM */
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Category Selection */}
                  <View className="mb-3">
                    <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                      Issue Category
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                      {TICKET_CATEGORIES.map((cat, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setCategory(cat)}
                          className="px-3 py-1.5 rounded-xl border active:scale-95"
                          style={{
                            backgroundColor: category === cat ? colors.badgeBg : colors.surface,
                            borderColor: category === cat ? colors.primary : colors.border,
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: category === cat ? colors.primary : colors.textSecondary }}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Priority Selector */}
                  <View className="mb-3">
                    <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                      Priority
                    </Text>
                    <View className="flex-row gap-2">
                      {[
                        { id: 'normal', label: 'Normal' },
                        { id: 'high', label: 'High' },
                        { id: 'urgent', label: 'Urgent' },
                      ].map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setPriority(p.id as any)}
                          className="flex-1 py-1.5 rounded-xl border items-center active:scale-95"
                          style={{
                            backgroundColor: priority === p.id ? colors.badgeBg : colors.surface,
                            borderColor: priority === p.id ? colors.primary : colors.border,
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: priority === p.id ? colors.primary : colors.textSecondary }}
                          >
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Subject Input */}
                  <View className="mb-3">
                    <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                      Subject / Issue Summary *
                    </Text>
                    <TextInput
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="e.g. Bluetooth printer not printing receipt"
                      placeholderTextColor={colors.textMuted}
                      className="px-3.5 py-2.5 rounded-xl border text-xs font-bold"
                      style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                    />
                  </View>

                  {/* Detailed Description */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold mb-1" style={{ color: colors.textSecondary }}>
                      Describe the issue in detail *
                    </Text>
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Explain what happened, error message, or steps to reproduce..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={4}
                      className="px-3.5 py-2.5 rounded-xl border text-xs font-medium"
                      style={{
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.text,
                        minHeight: 90,
                        textAlignVertical: 'top',
                      }}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={handleCreateTicket}
                    disabled={submitting}
                    activeOpacity={0.8}
                    className="py-3.5 rounded-2xl items-center justify-center bg-amber-500 shadow-xl active:scale-98"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text className="text-xs font-black text-black uppercase tracking-wider">
                        Submit Support Ticket
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
