import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  Image, Alert, SafeAreaView, StatusBar, ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import supabase from '../supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = {
  primary: '#4A90E2',
  secondary: '#50E3C2',
  white: '#FFFFFF',
  lightGray: '#F5F5F7',
  mediumGray: '#A0A0A0',
  darkGray: '#333333',
  error: '#FF3B30',
  success: '#4CAF50',
  warning: '#FFA000',
  background: '#F0F0F0',
  cardBackground: '#FFFFFF',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  tabInactive: '#7F8C8D',
  tabActive: '#4A90E2',
  tabBackground: '#E9ECEF',
  borderColor: '#E0E0E0',
  chatButton: '#5865F2',
};

const formatDate = (isoDateString) => {
  if (!isoDateString) return 'Неизвестно';
  try {
    return format(parseISO(isoDateString), 'dd MMM yyyy, HH:mm', { locale: ru });
  } catch (e) {
    return 'Некорректная дата';
  }
};

const OtkliciScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [responses, setResponses] = useState({ asWorker: [], asEmployer: [] });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState('asWorker');

  const fetchResponses = useCallback(async () => {
    if (!user?.id) {
      setResponses({ asWorker: [], asEmployer: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const commonSelect = `
        id, message, status, created_at, job_id, employer_id, worker_id,
        jobs:job_id (title, payment, location, user_id),
        employer:employer_id (id, first_name, last_name, avatar_url),
        worker:worker_id (id, first_name, last_name, avatar_url)
      `;

      const workerResponseQuery = supabase.from('responses').select(commonSelect)
        .eq('worker_id', user.id).order('created_at', { ascending: false });

      const employerResponseQuery = supabase.from('responses').select(commonSelect)
        .eq('employer_id', user.id).order('created_at', { ascending: false });

      const [workerRes, employerRes] = await Promise.all([workerResponseQuery, employerResponseQuery]);

      if (workerRes.error) throw workerRes.error;
      if (employerRes.error) throw employerRes.error;

      setResponses({
        asWorker: workerRes.data || [],
        asEmployer: employerRes.data || [],
      });
    } catch (error) {
      console.error('Ошибка загрузки откликов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить отклики: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchResponses();
    }, [fetchResponses])
  );

  const handleResponseAction = async (responseId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [responseId]: true }));
    try {
      const { error } = await supabase
        .from('responses')
        .update({ status: newStatus })
        .eq('id', responseId);

      if (error) throw error;
      setResponses(prev => ({
        ...prev,
        asEmployer: prev.asEmployer.map(res =>
          res.id === responseId ? { ...res, status: newStatus } : res
        ),
      }));
      Alert.alert('Успех', `Статус отклика обновлен на "${newStatus === 'accepted' ? 'Принят' : 'Отклонен'}"`);
    } catch (err) {
      console.error('Ошибка при обновлении отклика:', err);
      Alert.alert('Ошибка', 'Не удалось обновить статус отклика.');
    } finally {
      setActionLoading(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const openChat = (responseItem) => {
    if (!user || !responseItem) return;
    const partnerData = activeTab === 'asWorker' ? responseItem.employer : responseItem.worker;

    if (!partnerData || !partnerData.id) {
        Alert.alert('Ошибка', 'Не удалось получить данные собеседника для чата.');
        return;
    }
    
    const employerIdForChat = activeTab === 'asWorker' ? partnerData.id : user.id;
    const workerIdForChat = activeTab === 'asWorker' ? user.id : partnerData.id;

    navigation.navigate('Чаты', {
      screen: 'ChatConversation',
      params: {
        employerId: employerIdForChat,
        workerId: workerIdForChat,
        otherUserName: `${partnerData?.first_name || ''} ${partnerData?.last_name || ''}`.trim() || 'Собеседник',
        otherUserAvatar: partnerData?.avatar_url,
        jobTitle: responseItem.jobs?.title
      },
    });
  };

  const renderStatusBadge = (status) => {
    let backgroundColor = COLORS.mediumGray;
    let text = status;
    let icon = "hourglass-empty";

    switch (status) {
      case 'pending':
        backgroundColor = COLORS.warning;
        text = 'На рассмотрении';
        icon = "hourglass-top";
        break;
      case 'accepted':
        backgroundColor = COLORS.success;
        text = 'Принят';
        icon = "check-circle-outline";
        break;
      case 'rejected':
        backgroundColor = COLORS.error;
        text = 'Отклонен';
        icon = "highlight-off";
        break;
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <MaterialIcons name={icon} size={14} color={COLORS.white} style={{ marginRight: 4 }} />
        <Text style={styles.statusText}>{text}</Text>
      </View>
    );
  };

  const renderResponseItem = ({ item }) => {
    const isWorkerPerspective = activeTab === 'asWorker';
    const person = isWorkerPerspective ? item.employer : item.worker;
    const job = item.jobs;

    if (!job) {
      return <View style={styles.responseCard}><Text style={styles.errorTextCard}>Ошибка: данные вакансии не загружены.</Text></View>;
    }
    if (!person || !person.id) {
      return <View style={styles.responseCard}><Text style={styles.errorTextCard}>Ошибка: данные {isWorkerPerspective ? 'работодателя' : 'соискателя'} не загружены.</Text></View>;
    }

    let canOpenChat = false;
    if (user?.id) {
        canOpenChat = (isWorkerPerspective && item.status === 'accepted') || (!isWorkerPerspective && item.employer_id === user.id);
    }

    return (
      <View style={styles.responseCard}>
        <View style={styles.cardHeader}>
          <View style={styles.personInfo}>
            {person.avatar_url ? (
              <Image source={{ uri: person.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}><MaterialIcons name={isWorkerPerspective ? "business-center" : "person-outline"} size={22} color={COLORS.mediumGray} /></View>
            )}
            <View>
              <Text style={styles.personName} numberOfLines={1}>
                {person.first_name} {person.last_name}
              </Text>
              <Text style={styles.personRole}>{isWorkerPerspective ? 'Работодатель' : 'Соискатель'}</Text>
            </View>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <View style={styles.jobInfoContainer}>
            <Text style={styles.jobTitleLabel}>Вакансия:</Text>
            <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
            {job.payment && (
                <View style={styles.detailItem}><MaterialIcons name="payments" size={16} color={COLORS.textSecondary} /><Text style={styles.detailItemText}>{job.payment}</Text></View>
            )}
            {job.location && (
                <View style={styles.detailItem}><MaterialIcons name="place" size={16} color={COLORS.textSecondary} /><Text style={styles.detailItemText}>{job.location}</Text></View>
            )}
        </View>

        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>{isWorkerPerspective ? 'Ваше сообщение:' : 'Сообщение соискателя:'}</Text>
            <Text style={styles.messageText} numberOfLines={3}>{item.message}</Text>
          </View>
        )}

        <Text style={styles.dateText}>Отклик от: {formatDate(item.created_at)}</Text>

        <View style={styles.actionsContainer}>
          {!isWorkerPerspective && item.status === 'pending' && item.employer_id === user?.id && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleResponseAction(item.id, 'accepted')}
                disabled={actionLoading[item.id]}
              >
                {actionLoading[item.id] ? <ActivityIndicator size="small" color={COLORS.white}/> : <MaterialIcons name="check" size={18} color={COLORS.white} />}
                <Text style={styles.actionButtonText}>Принять</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleResponseAction(item.id, 'rejected')}
                disabled={actionLoading[item.id]}
              >
                {actionLoading[item.id] ? <ActivityIndicator size="small" color={COLORS.white}/> : <MaterialIcons name="close" size={18} color={COLORS.white} />}
                <Text style={styles.actionButtonText}>Отклонить</Text>
              </TouchableOpacity>
            </>
          )}
          {canOpenChat && (
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton, (!isWorkerPerspective && item.status === 'pending') && {marginLeft: 'auto'}]} // 
              onPress={() => openChat(item)}
            >
              <MaterialIcons name="chat-bubble-outline" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Написать</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <MaterialIcons name="lock-outline" size={60} color={COLORS.mediumGray} />
        <Text style={styles.authRequiredTitle}>Доступ ограничен</Text>
        <Text style={styles.authRequiredText}>Для просмотра откликов необходимо авторизоваться.</Text>
        <TouchableOpacity style={styles.authButtonNav} onPress={() => navigation.navigate('Профиль', { screen: 'Авторизация' })}>
          <Text style={styles.authButtonNavText}>Войти или Зарегистрироваться</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Мои Отклики</Text>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab('asWorker')} style={[styles.tabButton, activeTab === 'asWorker' && styles.tabButtonActive]}>
            <MaterialIcons name="work-outline" size={20} color={activeTab === 'asWorker' ? COLORS.tabActive : COLORS.tabInactive} />
            <Text style={[styles.tabText, activeTab === 'asWorker' && styles.tabTextActive]}>Я соискатель</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('asEmployer')} style={[styles.tabButton, activeTab === 'asEmployer' && styles.tabButtonActive]}>
            <MaterialIcons name="business-center" size={20} color={activeTab === 'asEmployer' ? COLORS.tabActive : COLORS.tabInactive} />
            <Text style={[styles.tabText, activeTab === 'asEmployer' && styles.tabTextActive]}>Я работодатель</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={responses[activeTab]}
          renderItem={renderResponseItem}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchResponses} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyListContainer}>
                <MaterialIcons name="forum" size={64} color={COLORS.mediumGray} />
                <Text style={styles.emptyListTitle}>Здесь пока пусто</Text>
                <Text style={styles.emptyListSubtitle}>
                  {activeTab === 'asWorker'
                    ? 'Ваши отклики на вакансии появятся здесь.'
                    : 'Отклики на ваши объявления будут отображены тут.'}
                </Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, backgroundColor: COLORS.background },
  authRequiredTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginTop: 15, marginBottom: 10 },
  authRequiredText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  authButtonNav: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, elevation: 3, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: {width: 0, height: 2} },
  authButtonNavText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: COLORS.tabBackground, borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  tabButtonActive: { backgroundColor: COLORS.white, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: {width:0, height:1} },
  tabText: { marginLeft: 8, fontSize: 15, fontWeight: '500', color: COLORS.tabInactive },
  tabTextActive: { color: COLORS.tabActive, fontWeight: '600' },

  listContentContainer: { paddingHorizontal: 15, paddingBottom: 20, flexGrow: 1},
  
  responseCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: {width:0, height:2}
  },
  errorTextCard: { color: COLORS.error, fontStyle: 'italic'},
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  personInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  personName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  personRole: { fontSize: 13, color: COLORS.textSecondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },

  jobInfoContainer: { marginBottom: 10, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.lightGray},
  jobTitleLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  jobTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  detailItemText: { marginLeft: 8, color: COLORS.textSecondary, fontSize: 14 },
  
  messageContainer: { marginTop: 8, padding: 10, backgroundColor: COLORS.lightGray, borderRadius: 8 },
  messageLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 },
  messageText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  
  dateText: { marginTop: 10, color: COLORS.mediumGray, fontSize: 12, textAlign: 'right' },

  actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 10, minHeight: 40 },
  actionButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14, marginLeft: 6 },
  acceptButton: { backgroundColor: COLORS.success },
  rejectButton: { backgroundColor: COLORS.error },
  chatButton: { backgroundColor: COLORS.chatButton },

  emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyListTitle: { fontSize: 19, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, marginBottom: 8 },
  emptyListSubtitle: { fontSize: 15, color: COLORS.mediumGray, textAlign: 'center', lineHeight: 22 },
});

export default OtkliciScreen;
