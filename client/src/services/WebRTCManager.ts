import { CONSTANTS } from '../types';
import { SocketManager } from './SocketManager';

export interface PeerConnectionInfo {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  audioEl?: HTMLAudioElement;
  videoEl?: HTMLVideoElement;
  gainNode?: GainNode;
  audioCtxSource?: MediaStreamAudioSourceNode;
  /** Polite peer (Perfect negotiation pattern) */
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

export interface PeerEvents {
  onPeerStream?: (peerId: string, stream: MediaStream) => void;
  onPeerClose?: (peerId: string) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onError?: (err: Error) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
};

/**
 * Manager profesional de WebRTC con conexiones peer-to-peer mesh.
 * - Audio/video por proximidad (radius configurable).
 * - Spatial audio: el volumen se atenúa con la distancia usando WebAudio.
 * - Perfect negotiation (polite/impolite) para evitar glare.
 * - Reutiliza el mismo MediaStream local para todos los peers.
 */
export class WebRTCManager {
  private socket: SocketManager;
  private events: PeerEvents;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnectionInfo> = new Map();
  private nearbyIds: Set<string> = new Set();
  private localId: string = '';
  private audioCtx: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;

  // Estado pública
  public micEnabled = false;
  public camEnabled = false;
  public muted = false;
  public masterVolume = 1.0;

  constructor(socket: SocketManager, events: PeerEvents = {}) {
    this.socket = socket;
    this.events = events;
    this.bindSocket();
  }

  // -----------------------------------------------------------------
  // SETUP
  // -----------------------------------------------------------------
  private bindSocket() {
    this.socket.onProximity(ids => this.handleProximityUpdate(ids));
    this.socket.onOffer(({ from, offer }) => this.handleOffer(from, offer));
    this.socket.onAnswer(({ from, answer }) => this.handleAnswer(from, answer));
    this.socket.onIce(({ from, candidate }) => this.handleIce(from, candidate));
  }

  setLocalId(id: string) { this.localId = id; }

  // -----------------------------------------------------------------
  // MEDIA
  // -----------------------------------------------------------------
  async enableMic(): Promise<boolean> {
    return this.setMicEnabled(true);
  }

  async enableCam(): Promise<boolean> {
    return this.setCamEnabled(true);
  }

  /**
   * Activa/desactiva el micrófono REALMENTE.
   * Al desactivar llama a track.stop() y elimina el sender en cada peer,
   * lo que apaga el LED del sistema operativo.
   */
  async setMicEnabled(on: boolean): Promise<boolean> {
    if (on) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const track = stream.getAudioTracks()[0];
        if (!track) return false;
        await this.addLocalTrack(track);
        this.micEnabled = true;
        return true;
      } catch (e) {
        this.events.onError?.(e as Error);
        return false;
      }
    } else {
      this.removeLocalTracksOfKind('audio');
      this.micEnabled = false;
      return true;
    }
  }

  /**
   * Activa/desactiva la cámara REALMENTE (libera el dispositivo, apaga LED).
   */
  async setCamEnabled(on: boolean): Promise<boolean> {
    if (on) {
      try {
        // Si estamos compartiendo pantalla, no pisamos esa pista de vídeo.
        if (this.screenSharing) return false;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 24 } },
        });
        const track = stream.getVideoTracks()[0];
        if (!track) return false;
        await this.addLocalTrack(track);
        this.camEnabled = true;
        return true;
      } catch (e) {
        this.events.onError?.(e as Error);
        return false;
      }
    } else {
      this.removeLocalTracksOfKind('video');
      this.camEnabled = false;
      return true;
    }
  }

  /**
   * Soft-mute del mic (sin liberar el dispositivo). Útil para Push-to-Talk:
   * no apaga el LED pero deja de enviar audio a los peers.
   */
  toggleMicTrack(on: boolean) {
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = on));
  }
  /** Soft-mute de la cámara (sin liberar el dispositivo). */
  toggleCamTrack(on: boolean) {
    this.localStream?.getVideoTracks().forEach(t => (t.enabled = on));
  }

  // -----------------------------------------------------------------
  // SCREEN SHARING
  // -----------------------------------------------------------------
  public screenSharing = false;
  private cameraTrackBeforeShare: MediaStreamTrack | null = null;

  /** Solicita compartir pantalla. Reemplaza la pista de vídeo en peers. */
  async startScreenShare(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false,
      });
      const screenTrack = stream.getVideoTracks()[0];
      if (!screenTrack) return false;

      // Guardar referencia a la cámara para restaurar al terminar
      const currentCam = this.localStream?.getVideoTracks()[0] || null;
      this.cameraTrackBeforeShare = currentCam && currentCam.readyState === 'live' ? currentCam : null;

      // Si la cámara estaba activa, la dejamos viva pero quitamos del stream local
      if (currentCam) {
        this.localStream?.removeTrack(currentCam);
      }
      await this.addLocalTrack(screenTrack);
      this.screenSharing = true;

      // Cuando el usuario detiene el share desde el navegador
      screenTrack.addEventListener('ended', () => {
        this.stopScreenShare().catch(() => {});
      });
      return true;
    } catch (e) {
      this.events.onError?.(e as Error);
      return false;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenSharing) return;
    this.removeLocalTracksOfKind('video');
    this.screenSharing = false;

    // Restaurar cámara si estaba activa antes
    if (this.cameraTrackBeforeShare && this.cameraTrackBeforeShare.readyState === 'live') {
      await this.addLocalTrack(this.cameraTrackBeforeShare);
      this.camEnabled = true;
    } else if (this.camEnabled) {
      // Re-pedir cámara nueva
      await this.setCamEnabled(true);
    }
    this.cameraTrackBeforeShare = null;
  }

  // -----------------------------------------------------------------
  // TRACK HELPERS
  // -----------------------------------------------------------------
  private ensureLocalStream(): MediaStream {
    if (!this.localStream) {
      this.localStream = new MediaStream();
      this.events.onLocalStream?.(this.localStream);
    }
    return this.localStream;
  }

  /** Añade (o reemplaza) una pista de un tipo y la propaga a todos los peers. */
  private async addLocalTrack(track: MediaStreamTrack) {
    const stream = this.ensureLocalStream();
    // Quitar pistas existentes del mismo tipo (sin pararlas; la nueva las sustituye)
    for (const t of stream.getTracks().filter(t => t.kind === track.kind && t !== track)) {
      stream.removeTrack(t);
      try { t.stop(); } catch {}
    }
    stream.addTrack(track);
    this.events.onLocalStream?.(stream);

    for (const info of this.peers.values()) {
      const sender = info.pc.getSenders().find(s => s.track && s.track.kind === track.kind);
      if (sender) {
        try { await sender.replaceTrack(track); } catch (e) { this.events.onError?.(e as Error); }
      } else {
        try { info.pc.addTrack(track, stream); } catch (e) { this.events.onError?.(e as Error); }
      }
    }
  }

  /** Quita y para todas las pistas de un tipo, y elimina el sender en peers. */
  private removeLocalTracksOfKind(kind: 'audio' | 'video') {
    if (!this.localStream) return;
    for (const t of this.localStream.getTracks().filter(t => t.kind === kind)) {
      this.localStream.removeTrack(t);
      try { t.stop(); } catch {}
    }
    for (const info of this.peers.values()) {
      const sender = info.pc.getSenders().find(s => s.track && s.track.kind === kind);
      if (sender) {
        try { info.pc.removeTrack(sender); } catch {}
      }
    }
    this.events.onLocalStream?.(this.localStream);
  }

  toggleMicTrackLegacy(on: boolean) {
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = on));
    this.micEnabled = on;
  }

  async stopMedia() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.micEnabled = false;
    this.camEnabled = false;
    this.screenSharing = false;
    this.events.onLocalStream?.(null);
  }

  getLocalStream(): MediaStream | null { return this.localStream; }

  private async replaceLocalStream(stream: MediaStream) {
    // Detener tracks anteriores
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = stream;
    this.events.onLocalStream?.(stream);

    // Reemplazar en cada peer
    for (const [peerId, info] of this.peers) {
      const senders = info.pc.getSenders();
      for (const track of stream.getTracks()) {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) await sender.replaceTrack(track);
        else info.pc.addTrack(track, stream);
      }
    }
  }

  // -----------------------------------------------------------------
  // PROXIMITY
  // -----------------------------------------------------------------
  private async handleProximityUpdate(ids: string[]) {
    const newSet = new Set(ids);
    // Cerrar peers que ya no están cerca
    for (const peerId of Array.from(this.peers.keys())) {
      if (!newSet.has(peerId)) this.closePeer(peerId);
    }
    // Abrir conexiones con nuevos peers cercanos
    for (const peerId of ids) {
      if (!this.peers.has(peerId)) {
        await this.createPeer(peerId, /*initiator=*/ this.shouldInitiate(peerId));
      }
    }
    this.nearbyIds = newSet;
  }

  /** Decide quién inicia para evitar duplicar offers */
  private shouldInitiate(peerId: string): boolean {
    return this.localId.localeCompare(peerId) < 0;
  }

  // -----------------------------------------------------------------
  // PEER LIFECYCLE
  // -----------------------------------------------------------------
  private async createPeer(peerId: string, initiator: boolean): Promise<PeerConnectionInfo> {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const info: PeerConnectionInfo = {
      pc,
      stream: null,
      polite: !initiator,           // el no-iniciador es polite
      makingOffer: false,
      ignoreOffer: false,
    };
    this.peers.set(peerId, info);

    // Añadir tracks locales si hay
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    } else {
      // Asegurarse de declarar transceivers para recibir audio/video
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    pc.onicecandidate = ev => {
      if (ev.candidate) this.socket.sendIce(peerId, ev.candidate);
    };

    pc.ontrack = ev => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      info.stream = stream;
      this.attachSpatialAudio(peerId, stream);
      this.events.onPeerStream?.(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        this.closePeer(peerId);
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        info.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.sendOffer(peerId, pc.localDescription!);
      } catch (e) {
        this.events.onError?.(e as Error);
      } finally {
        info.makingOffer = false;
      }
    };

    if (initiator) {
      // Forzar negotiation
      try {
        info.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.sendOffer(peerId, pc.localDescription!);
      } catch (e) {
        this.events.onError?.(e as Error);
      } finally {
        info.makingOffer = false;
      }
    }

    return info;
  }

  private async handleOffer(from: string, offer: RTCSessionDescriptionInit) {
    let info = this.peers.get(from);
    if (!info) info = await this.createPeer(from, false);
    const pc = info.pc;
    const offerCollision = info.makingOffer || pc.signalingState !== 'stable';
    info.ignoreOffer = !info.polite && offerCollision;
    if (info.ignoreOffer) return;
    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.sendAnswer(from, pc.localDescription!);
    } catch (e) {
      this.events.onError?.(e as Error);
    }
  }

  private async handleAnswer(from: string, answer: RTCSessionDescriptionInit) {
    const info = this.peers.get(from);
    if (!info) return;
    try { await info.pc.setRemoteDescription(answer); }
    catch (e) { this.events.onError?.(e as Error); }
  }

  private async handleIce(from: string, candidate: RTCIceCandidate) {
    const info = this.peers.get(from);
    if (!info) return;
    try { await info.pc.addIceCandidate(candidate); }
    catch (e) {
      if (!info.ignoreOffer) this.events.onError?.(e as Error);
    }
  }

  private closePeer(peerId: string) {
    const info = this.peers.get(peerId);
    if (!info) return;
    try { info.pc.close(); } catch {}
    if (info.audioEl) { info.audioEl.srcObject = null; info.audioEl.remove(); }
    if (info.gainNode) { try { info.gainNode.disconnect(); } catch {} }
    if (info.audioCtxSource) { try { info.audioCtxSource.disconnect(); } catch {} }
    this.peers.delete(peerId);
    this.events.onPeerClose?.(peerId);
  }

  closeAll() {
    for (const id of Array.from(this.peers.keys())) this.closePeer(id);
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }

  // -----------------------------------------------------------------
  // SPATIAL AUDIO
  // -----------------------------------------------------------------
  private ensureAudioContext() {
    if (this.audioCtx) return;
    const Ctx: typeof AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.audioCtx = new Ctx();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.audioCtx.destination);
  }

  private attachSpatialAudio(peerId: string, stream: MediaStream) {
    this.ensureAudioContext();
    const info = this.peers.get(peerId);
    if (!info || !this.audioCtx || !this.masterGain) return;

    if (stream.getAudioTracks().length === 0) return;

    // Necesario en Chrome para que el WebAudio reproduzca el stream remoto
    const audioEl = document.createElement('audio');
    audioEl.srcObject = stream;
    audioEl.autoplay = true;
    audioEl.muted = true;     // muteamos el <audio>; el sonido pasa por WebAudio
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    info.audioEl = audioEl;

    try {
      const source = this.audioCtx.createMediaStreamSource(stream);
      const gain = this.audioCtx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain).connect(this.masterGain);
      info.audioCtxSource = source;
      info.gainNode = gain;
    } catch (e) {
      // fallback: dejar audioEl audible
      audioEl.muted = false;
    }
  }

  /**
   * Actualiza el volumen de cada peer en función de la distancia al jugador local.
   * Llamar cada frame con el mapa peerId -> distancia (px).
   */
  updateSpatialVolumes(distances: Map<string, number>) {
    if (this.muted) {
      for (const info of this.peers.values()) {
        if (info.gainNode) info.gainNode.gain.value = 0;
      }
      return;
    }
    for (const [peerId, info] of this.peers) {
      if (!info.gainNode) continue;
      const d = distances.get(peerId);
      if (d == null) { info.gainNode.gain.value = 0; continue; }
      // Curva de atenuación: 1.0 a 0 distancia, 0.0 a PROXIMITY_RADIUS
      const t = Math.max(0, 1 - d / CONSTANTS.PROXIMITY_RADIUS);
      // Curva cuadrática suave
      info.gainNode.gain.value = t * t;
    }
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }

  setMuted(muted: boolean) { this.muted = muted; }

  getPeerIds(): string[] { return Array.from(this.peers.keys()); }
  getPeerStream(peerId: string): MediaStream | null {
    return this.peers.get(peerId)?.stream || null;
  }

  // -----------------------------------------------------------------
  // DEVICES
  // -----------------------------------------------------------------
  async listDevices(): Promise<{ audioIn: MediaDeviceInfo[]; videoIn: MediaDeviceInfo[]; audioOut: MediaDeviceInfo[] }> {
    const all = await navigator.mediaDevices.enumerateDevices();
    return {
      audioIn: all.filter(d => d.kind === 'audioinput'),
      videoIn: all.filter(d => d.kind === 'videoinput'),
      audioOut: all.filter(d => d.kind === 'audiooutput'),
    };
  }
}
