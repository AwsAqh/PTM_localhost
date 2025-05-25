import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import Header from '../components/Header';
import PreTrainedModelBlock from '../components/PreTrainedModelBlock';
import ModalHiddenInformation from '../components/ModalHiddenInformation';
import { colors } from '../styles/them';
import { getModels } from '../api/models';

export default function BrowseModelsScreen({ navigation }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await getModels();
        setModels(data);
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleShowInfo = (model) => {
    setSelectedModel(model);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.pageTitle}>Browse Trained Models</Text>
      <FlatList
        data={models}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PreTrainedModelBlock
            model={item}
            onPress={() => navigation.navigate('ModelDetails', { model: item })}
            onInfoPress={() => handleShowInfo(item)}
          />
        )}
      />
      <ModalHiddenInformation
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        model={selectedModel || {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  listContent: { paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
