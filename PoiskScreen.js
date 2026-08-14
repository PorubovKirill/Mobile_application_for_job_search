import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Image,
  TouchableOpacity, Alert, Modal, TextInput, Platform, StatusBar,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import supabase from '../supabase';
import { useAuth } from '../AuthContext';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = {
  primary: '#4A90E2',
  secondary: '#50E3C2',
  white: '#FFFFFF',
  lightGray: '#F5F5F7',
  mediumGray: '#A0A0A0',
  darkGray: '#333333',
  error: '#FF3B30',
  background: '#F0F0F0',
  cardBackground: '#FFFFFF',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  accentBlue: '#3498DB',
  accentGreen: '#2ECC71',
  accentRed: '#E74C3C',
  tagBackground: '#ECF0F1',
  tagText: '#7F8C8D',
  starColor: '#FFC107',
};

const formatTimeAgo = (isoDateString) => {
  if (!isoDateString) return '';
  try {
    const date = parseISO(isoDateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  } catch (e) {
    console.warn("Invalid date for formatTimeAgo:", isoDateString);
    return "недавно";
  }
};

const PoiskScreen = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [userResponses, setUserResponses] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const jobsPromise = supabase
        .from('jobs')
        .select(`*, users (id, first_name, last_name, rating, avatar_url)`) 
        .order('created_at', { ascending: false });

      const responsesPromise = user ? supabase
        .from('responses')
        .select('job_id')
        .eq('worker_id', user.id) : Promise.resolve({ data: [], error: null });

      const [jobsResult, responsesResult] = await Promise.all([jobsPromise, responsesPromise]);

      if (jobsResult.error) throw jobsResult.error;
      setJobs(jobsResult.data || []);

      if (responsesResult.error) throw responsesResult.error;
      setUserResponses((responsesResult.data || []).map(r => r.job_id));

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const onRefresh = () => {
    fetchData();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRespond = (job) => {
    if (!user) {
      Alert.alert('Требуется авторизация', 'Для отклика на работу необходимо войти в систему.');
      return;
    }
    setSelectedJob(job);
    setModalVisible(true);
  };

  const submitResponse = async () => {
    if (!responseMessage.trim()) {
        Alert.alert('Ошибка', 'Пожалуйста, напишите сообщение работодателю.');
        return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('responses')
        .insert([{
          job_id: selectedJob.id,
          worker_id: user.id,
          employer_id: selectedJob.user_id,
          message: responseMessage.trim(),
          status: 'pending'
        }]);

      if (error) throw error;
      
      Alert.alert('Успешно', 'Ваш отклик отправлен!');
      setModalVisible(false);
      setResponseMessage('');
      setUserResponses(prev => [...prev, selectedJob.id]);
    } catch (error) {
      console.error('Ошибка отклика:', error);
      Alert.alert('Ошибка', 'Не удалось отправить отклик. ' + (error.message || ''));
    } finally {
        setLoading(false);
    }
  };

  const hasResponded = (jobId) => userResponses.includes(jobId);

  const handleDeleteJob = async (jobId) => {
    Alert.alert('Удалить объявление', 'Вы уверены, что хотите удалить это объявление?',
      [{ text: 'Отмена', style: 'cancel' },
       { text: 'Удалить', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('jobs').delete().eq('id', jobId);
          if (error) throw error;
          setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
          Alert.alert('Успешно', 'Объявление удалено.');
        } catch (error) {
          console.error('Ошибка удаления:', error);
          Alert.alert('Ошибка', 'Не удалось удалить объявление.');
        } finally {
            setLoading(false);
        }
      }}]);
  };

  const renderJobCard = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const employerData = item.users || {};
    const isMyJob = user && item.user_id === user.id;
    const alreadyResponded = hasResponded(item.id);
    const timeAgo = formatTimeAgo(item.created_at);

    return (
      <View style={styles.jobCard}>
        {isMyJob && (
          <View style={styles.myJobBadge}><Text style={styles.myJobBadgeText}>Ваше объявление</Text></View>
        )}
        <View style={styles.cardHeader}>
          {employerData.avatar_url ? (
            <Image source={{ uri: employerData.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><MaterialIcons name="business-center" size={22} color={COLORS.mediumGray} /></View>
          )}
          <View style={styles.employerInfo}>
            <Text style={styles.employerName} numberOfLines={1}>
              {employerData.first_name || 'Работодатель'} {employerData.last_name || ''}
            </Text>
            {employerData.rating !== null && employerData.rating !== undefined && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color={COLORS.starColor} />
                <Text style={styles.ratingText}>{typeof employerData.rating === 'number' ? employerData.rating.toFixed(1) : employerData.rating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>

        <Text style={styles.jobTitle}>{item.title}</Text>

        <View style={styles.detailsGrid}>
          <DetailItem icon="place" text={item.location || 'Не указано'} />
          <DetailItem icon="people" text={item.who_needed || 'Не указано'} />
          <DetailItem icon="attach-money" text={item.payment || 'Не указана'} />
          <DetailItem icon="event" text={item.start_date ? new Date(item.start_date).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) : 'Не указана'} />
        </View>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.sectionTitle}>Описание вакансии:</Text>
            <Text style={styles.jobDescription}>{item.description || 'Описание отсутствует.'}</Text>
            
            <Text style={styles.sectionTitle}>Время начала:</Text>
            <Text style={styles.detailTextValue}>{item.start_time || 'Не указано'}</Text>

            <Text style={styles.sectionTitle}>Контактная информация:</Text>
            <Text style={styles.detailTextValue}>{item.contact || 'Не указана'}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => toggleExpand(item.id)}
          >
            <Text style={styles.expandButtonText}>{isExpanded ? 'Свернуть' : 'Подробнее'}</Text>
            <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={22} color={COLORS.primary} />
          </TouchableOpacity>

          {isMyJob ? (
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteJob(item.id)}>
              <MaterialIcons name="delete-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Удалить</Text>
            </TouchableOpacity>
          ) : alreadyResponded ? (
            <View style={[styles.actionButton, styles.respondedButtonDisabled]}>
              <MaterialIcons name="check-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Откликнулись</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.respondButton]} onPress={() => handleRespond(item)} disabled={loading}>
              <MaterialIcons name="send" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Откликнуться</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const DetailItem = ({ icon, text }) => (
    <View style={styles.detailItemContainer}>
      <MaterialIcons name={icon} size={18} color={COLORS.textSecondary} />
      <Text style={styles.detailItemText} numberOfLines={1}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Доступные вакансии</Text>
        </View>
        
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={item => item.id.toString()}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary}/>}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            !loading && <View style={styles.emptyListContainer}><MaterialIcons name="search-off" size={60} color={COLORS.mediumGray} /><Text style={styles.emptyListText}>Пока нет доступных объявлений.</Text><Text style={styles.emptyListSubText}>Попробуйте обновить или загляните позже!</Text></View>
          }
          showsVerticalScrollIndicator={false}
        />

        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <Text style={styles.modalTitle}>Отклик на вакансию "{selectedJob?.title}"</Text>
              <Text style={styles.modalEmployer}>Работодатель: {selectedJob?.users?.first_name} {selectedJob?.users?.last_name}</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Напишите сопроводительное сообщение..."
                multiline
                value={responseMessage}
                onChangeText={setResponseMessage}
                placeholderTextColor={COLORS.mediumGray}
              />
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => {setModalVisible(false); setResponseMessage('');}}>
                  <Text style={[styles.modalButtonText, {color: COLORS.textPrimary}]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalSubmitButton, (!responseMessage.trim() || loading) && styles.modalSubmitButtonDisabled]} onPress={submitResponse} disabled={!responseMessage.trim() || loading}>
                  {loading && !selectedJob ? null : loading ? <ActivityIndicator color={COLORS.white} size="small"/> : <Text style={styles.modalButtonText}>Отправить</Text>}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  listContentContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 20 },

  jobCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5 },
      android: { elevation: 4 },
    }),
  },
  myJobBadge: { position: 'absolute', top: -8, right: 12, backgroundColor: COLORS.accentBlue, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, zIndex: 1, elevation: 5 },
  myJobBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  employerInfo: { flex: 1, justifyContent: 'center' },
  employerName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 4, fontWeight: '500' },
  timeAgo: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 'auto' },

  jobTitle: { fontSize: 19, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12, lineHeight: 26 },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  detailItemContainer: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 8, paddingVertical: 4 },
  detailItemText: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 8, flexShrink: 1 },
  
  expandedContent: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginTop: 10, marginBottom: 6 },
  jobDescription: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 10 },
  detailTextValue: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8},

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  expandButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  expandButtonText: { fontSize: 15, color: COLORS.primary, fontWeight: '600', marginRight: 4 },
  
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, minWidth: 130, justifyContent: 'center'},
  actionButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  respondButton: { backgroundColor: COLORS.primary },
  deleteButton: { backgroundColor: COLORS.accentRed },
  respondedButtonDisabled: { backgroundColor: COLORS.accentGreen },

  emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyListText: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center', marginTop: 15, marginBottom: 5 },
  emptyListSubText: { fontSize: 14, color: COLORS.mediumGray, textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, paddingTop: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  modalEmployer: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  messageInput: { backgroundColor: COLORS.lightGray, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginBottom: 20, color: COLORS.textPrimary },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalCancelButton: { backgroundColor: COLORS.tagBackground, marginRight: 10 },
  modalSubmitButton: { backgroundColor: COLORS.primary },
  modalSubmitButtonDisabled: { backgroundColor: COLORS.mediumGray },
  modalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});

export default PoiskScreen;
