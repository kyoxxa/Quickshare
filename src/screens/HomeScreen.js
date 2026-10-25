import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Alert, Pressable, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button, ProgressBar, colors } from '../components/ui';
import { discoverDevices, publishDevice, unpublishDevice, startReceiver, sendFile } from '../transfer/TransferService';
import { listGalleryItems } from '../services/gallery';
import { speak, startListening, stopListening, parseCommand } from '../services/speech';

export default function HomeScreen() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null); // device the next file goes to
  const [transfers, setTransfers] = useState([]); // { id, name, progress, status }
  const [galleryItems, setGalleryItems] = useState(null); // null = gallery not opened
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const deviceName = useRef(`Share-${Math.floor(Math.random() * 9000 + 1000)}`).current;

  const updateTransfer = (id, patch) =>
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  useEffect(() => {
    const stopDiscovery = discoverDevices(
      (device) => setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device])),
      (name) => setDevices((prev) => prev.filter((d) => d.name !== name))
    );
    publishDevice(deviceName);
    const stopReceiving = startReceiver({
      onOffer: (file) => {
        setTransfers((prev) => [{ id: file.id, name: file.name, progress: 0, status: 'receiving' }, ...prev]);
        speak(`Receiving ${file.name}`);
      },
      onProgress: (id, p) => updateTransfer(id, { progress: p }),
      onComplete: (file) => {
        updateTransfer(file.id, { progress: 1, status: 'received' });
        speak(`${file.name} received`);
      },
      onError: (e) => speak(`Transfer error: ${e.message}`),
    });
    return () => {
      stopDiscovery();
      unpublishDevice();
      stopReceiving();
    };
  }, []);

  const send = async (file) => {
    if (!selected) {
      Alert.alert('Choose a device', 'Tap a nearby device first.');
      return;
    }
    const tempId = `${Date.now()}`;
    setTransfers((prev) => [{ id: tempId, name: file.name, progress: 0, status: 'sending' }, ...prev]);
    try {
      await sendFile(
        { host: selected.host, uri: file.uri, name: file.name, size: file.size, mimeType: file.mimeType },
        (p) => updateTransfer(tempId, { progress: p })
      );
      updateTransfer(tempId, { progress: 1, status: 'sent' });
      speak(`${file.name} sent to ${selected.name}`);
    } catch (e) {
      updateTransfer(tempId, { status: 'failed' });
      Alert.alert('Transfer failed', e.message);
    }
  };

  // Runs only when the user taps the document button.
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const a = result.assets[0];
    send({ name: a.name, uri: a.uri.replace('file://', ''), size: a.size, mimeType: a.mimeType });
  };

  // Runs only when the user explicitly taps "Send from gallery".
  const openGallery = async () => {
    try {
      setGalleryItems(await listGalleryItems({ first: 60 }));
    } catch (e) {
      Alert.alert('Gallery access', 'Permission was not granted, so nothing was loaded.');
    }
  };

  const stopListeningNow = async () => {
    await stopListening();
    setListening(false);
  };

  const handleCommand = (action) => {
    if (action === 'pickFile') pickDocument();
    else if (action === 'pickGallery') openGallery();
    else if (action === 'stop') stopListeningNow();
    else speak('Sorry, I did not understand that');
  };

  const toggleVoice = () => {
    if (listening) return stopListeningNow();
    setListening(true);
    startListening({
      onResult: (text) => {
        setLastHeard(text);
        setListening(false);
        handleCommand(parseCommand(text).action);
      },
      onError: () => setListening(false),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Share</Text>
      <Text style={styles.subtitle}>This device: {deviceName}</Text>

      <Text style={styles.section}>Nearby devices</Text>
      <FlatList
        data={devices}
        keyExtractor={(d) => d.id}
        style={{ maxHeight: 160 }}
        ListEmptyComponent={<Text style={styles.muted}>Looking for devices on this Wi-Fi…</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected?.id === item.id }}
            onPress={() => setSelected(item)}
            style={[styles.card, selected?.id === item.id && { borderColor: colors.accent, borderWidth: 1 }]}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.muted}>{selected?.id === item.id ? 'Selected' : 'Tap to select'}</Text>
          </Pressable>
        )}
      />

      <View style={styles.row}>
        <Button title="Send document" onPress={pickDocument} disabled={!selected} />
        <Button variant="ghost" title="Send from gallery" onPress={openGallery} disabled={!selected} />
      </View>

      {galleryItems && (
        <FlatList
          data={galleryItems}
          numColumns={4}
          keyExtractor={(i) => i.id}
          style={{ maxHeight: 160 }}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Send ${item.name}`} onPress={() => send(item)} style={styles.thumb}>
              {item.mediaType === 'photo' ? <Image source={{ uri: item.uri }} style={styles.thumbImg} /> : <Text style={styles.muted}>Video</Text>}
            </Pressable>
          )}
        />
      )}

      <Text style={styles.section}>Transfers</Text>
      <FlatList
        data={transfers}
        keyExtractor={(t) => t.id}
        style={{ flex: 1 }}
        ListEmptyComponent={<Text style={styles.muted}>No transfers yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.muted}>{item.status}</Text>
            <ProgressBar value={item.progress} />
          </View>
        )}
      />

      <Button title={listening ? 'Listening… tap to stop' : 'Voice command'} onPress={toggleVoice} variant={listening ? 'ghost' : 'primary'} />
      {lastHeard ? <Text style={styles.muted}>Heard: “{lastHeard}”</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.muted, marginBottom: 12 },
  section: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted },
  row: { flexDirection: 'row', gap: 8 },
  thumb: { flex: 1, aspectRatio: 1, margin: 3, backgroundColor: colors.card, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: '100%', height: '100%', borderRadius: 8 },
});
