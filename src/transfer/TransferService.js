import TcpSocket from 'react-native-tcp-socket';
import RNFS from 'react-native-fs';
import Zeroconf from 'react-native-zeroconf';
import { PORT, SERVICE_TYPE, CHUNK_SIZE, MessageType, encode, createDecoder, makeId } from './protocol';

// Discovery over mDNS/Bonjour on the local Wi-Fi network.
// Transfers go directly device-to-device over TCP (no cloud relay).

const zeroconf = new Zeroconf();

export function discoverDevices(onFound, onLost) {
  zeroconf.on('resolved', (service) => {
    if (service.port !== PORT) return;
    onFound({ id: service.name, name: service.name, host: service.addresses?.[0] });
  });
  zeroconf.on('remove', (name) => onLost?.(name));
  zeroconf.scan(SERVICE_TYPE, 'tcp', 'local.');
  return () => zeroconf.stop();
}

export function publishDevice(name) {
  zeroconf.publishService('tcp', SERVICE_TYPE, 'local.', name, PORT);
}

export function unpublishDevice() {
  zeroconf.unpublishService(PORT);
}

// Receiver: listens for incoming offers and writes chunks to the app's cache.
export function startReceiver({ onOffer, onProgress, onComplete, onError }) {
  const server = TcpSocket.createServer((socket) => {
    let current = null;
    const handle = createDecoder(async (msg) => {
      try {
        if (msg.type === MessageType.OFFER) {
          current = {
            id: msg.id,
            name: msg.name,
            size: msg.size,
            uri: `${RNFS.CachesDirectoryPath}/${msg.id}-${msg.name}`,
            received: 0,
          };
          await RNFS.writeFile(current.uri, '', 'base64');
          onOffer?.(current);
        } else if (msg.type === MessageType.CHUNK && current) {
          // Append the base64 chunk to the file on disk.
          await RNFS.appendFile(current.uri, msg.data, 'base64');
          current.received += msg.length;
          onProgress?.(current.id, current.received / current.size);
        } else if (msg.type === MessageType.DONE && current) {
          socket.write(encode({ type: MessageType.ACK, id: current.id }));
          onComplete?.(current);
          current = null;
        }
      } catch (e) {
        onError?.(e);
      }
    });
    socket.on('data', (data) => handle(data));
    socket.on('error', (e) => onError?.(e));
  });
  server.listen({ port: PORT, host: '0.0.0.0' });
  return () => server.close();
}

// Sender: streams a file to a host in chunks, waiting for the receiver's ACK.
export function sendFile({ host, uri, name, size, mimeType }, onProgress) {
  return new Promise((resolve, reject) => {
    const id = makeId();
    const socket = TcpSocket.createConnection({ port: PORT, host }, async () => {
      try {
        socket.write(encode({ type: MessageType.OFFER, id, name, size, mimeType }));
        let position = 0;
        while (position < size) {
          const length = Math.min(CHUNK_SIZE, size - position);
          const data = await RNFS.read(uri, length, position, 'base64');
          socket.write(encode({ type: MessageType.CHUNK, id, data, length }));
          position += length;
          onProgress?.(position / size);
        }
        socket.write(encode({ type: MessageType.DONE, id }));
      } catch (e) {
        socket.destroy();
        reject(e);
      }
    });

    const handle = createDecoder((msg) => {
      if (msg.type === MessageType.ACK && msg.id === id) {
        socket.end();
        resolve({ id, name });
      } else if (msg.type === MessageType.ERROR) {
        socket.destroy();
        reject(new Error(msg.error));
      }
    });
    socket.on('data', (data) => handle(data));
    socket.on('error', reject);
  });
}
