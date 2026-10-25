import * as MediaLibrary from 'expo-media-library';

// Gallery access is requested ONLY when the user explicitly taps
// "Send from gallery". The app never scans the library in the background.

export async function requestGalleryAccessExplicitly() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function listGalleryItems({ first = 50 } = {}) {
  const granted = await requestGalleryAccessExplicitly();
  if (!granted) throw new Error('Gallery access was not granted');
  const page = await MediaLibrary.getAssetsAsync({ first, mediaType: ['photo', 'video'], sortBy: ['creationTime'] });
  return Promise.all(
    page.assets.map(async (asset) => {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      return {
        id: asset.id,
        name: asset.filename,
        size: info.fileSize ?? 0,
        uri: (info.localUri || asset.uri).replace('file://', ''),
        mimeType: asset.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        mediaType: asset.mediaType,
      };
    })
  );
}
