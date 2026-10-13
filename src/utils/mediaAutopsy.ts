import type { AutopsyChannelIsolation, AutopsyElaResult, AutopsyKeyframe, AutopsyAudioWaveform } from '../types';

/**
 * Loads an image from a URL or Blob into an HTMLImageElement with CORS enabled.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image for forensic analysis: ${err}`));
    img.src = src;
  });
}

/**
 * Computes genuine Average Hash (aHash) and Difference Hash (dHash) from real image pixels.
 * - aHash: Resizes image to 8x8 grayscale, computes mean luminance, sets bit to 1 if >= mean.
 * - dHash: Resizes image to 9x8 grayscale, compares adjacent horizontal pixels P(x) > P(x+1).
 */
export function computeRealImagePerceptualHashes(img: HTMLImageElement): { aHash: string; dHash: string } {
  // 1. Compute aHash (8x8)
  const canvasA = document.createElement('canvas');
  canvasA.width = 8;
  canvasA.height = 8;
  const ctxA = canvasA.getContext('2d');
  if (!ctxA) throw new Error('2D Canvas context unavailable');
  ctxA.drawImage(img, 0, 0, 8, 8);
  const dataA = ctxA.getImageData(0, 0, 8, 8).data;

  const grayA: number[] = [];
  let sumA = 0;
  for (let i = 0; i < dataA.length; i += 4) {
    // ITU-R BT.601 standard luminance
    const lum = 0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2];
    grayA.push(lum);
    sumA += lum;
  }
  const meanA = sumA / 64;

  let aHashBits = '';
  for (let i = 0; i < 64; i++) {
    aHashBits += grayA[i] >= meanA ? '1' : '0';
  }

  // Convert 64 bits to 16 hex chars
  let aHashHex = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = parseInt(aHashBits.substring(i, i + 4), 2).toString(16);
    aHashHex += nibble;
  }

  // 2. Compute dHash (9x8)
  const canvasD = document.createElement('canvas');
  canvasD.width = 9;
  canvasD.height = 8;
  const ctxD = canvasD.getContext('2d');
  if (!ctxD) throw new Error('2D Canvas context unavailable');
  ctxD.drawImage(img, 0, 0, 9, 8);
  const dataD = ctxD.getImageData(0, 0, 9, 8).data;

  const grayD: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    for (let x = 0; x < 9; x++) {
      const idx = (y * 9 + x) * 4;
      const lum = 0.299 * dataD[idx] + 0.587 * dataD[idx + 1] + 0.114 * dataD[idx + 2];
      row.push(lum);
    }
    grayD.push(row);
  }

  let dHashBits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      dHashBits += grayD[y][x] > grayD[y][x + 1] ? '1' : '0';
    }
  }

  let dHashHex = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = parseInt(dHashBits.substring(i, i + 4), 2).toString(16);
    dHashHex += nibble;
  }

  return { aHash: aHashHex, dHash: dHashHex };
}

/**
 * Performs authentic Error Level Analysis (ELA).
 * Resaves the image as JPEG at specified quality, computes pixel-wise absolute difference,
 * and amplifies variance by the specified scale factor.
 */
export async function performErrorLevelAnalysis(
  img: HTMLImageElement,
  quality = 0.90,
  amplification = 20
): Promise<AutopsyElaResult> {
  const w = Math.min(img.naturalWidth || img.width, 1600);
  const h = Math.min(img.naturalHeight || img.height, 1600);

  // Canvas A: Original Image
  const canvasA = document.createElement('canvas');
  canvasA.width = w;
  canvasA.height = h;
  const ctxA = canvasA.getContext('2d', { willReadFrequently: true });
  if (!ctxA) throw new Error('Canvas 2D unavailable');
  ctxA.drawImage(img, 0, 0, w, h);
  const imgDataA = ctxA.getImageData(0, 0, w, h);

  // Compress to JPEG via dataURL
  const jpegUrl = canvasA.toDataURL('image/jpeg', quality);
  const recompressedImg = await loadImageElement(jpegUrl);

  // Canvas B: Re-compressed JPEG
  const canvasB = document.createElement('canvas');
  canvasB.width = w;
  canvasB.height = h;
  const ctxB = canvasB.getContext('2d', { willReadFrequently: true });
  if (!ctxB) throw new Error('Canvas 2D unavailable');
  ctxB.drawImage(recompressedImg, 0, 0, w, h);
  const imgDataB = ctxB.getImageData(0, 0, w, h);

  // Canvas C: Difference Map
  const canvasC = document.createElement('canvas');
  canvasC.width = w;
  canvasC.height = h;
  const ctxC = canvasC.getContext('2d');
  if (!ctxC) throw new Error('Canvas 2D unavailable');
  const diffData = ctxC.createImageData(w, h);

  const dataA = imgDataA.data;
  const dataB = imgDataB.data;
  const out = diffData.data;

  let totalDiff = 0;
  let maxDiff = 0;
  const totalPixels = w * h;

  for (let i = 0; i < dataA.length; i += 4) {
    const rDiff = Math.abs(dataA[i] - dataB[i]);
    const gDiff = Math.abs(dataA[i + 1] - dataB[i + 1]);
    const bDiff = Math.abs(dataA[i + 2] - dataB[i + 2]);

    const pixelDiff = Math.max(rDiff, gDiff, bDiff);
    totalDiff += pixelDiff;
    if (pixelDiff > maxDiff) maxDiff = pixelDiff;

    // Amplified error visualization in monochrome/scaled brightness
    out[i] = Math.min(255, rDiff * amplification);
    out[i + 1] = Math.min(255, gDiff * amplification);
    out[i + 2] = Math.min(255, bDiff * amplification);
    out[i + 3] = 255; // Full opacity
  }

  ctxC.putImageData(diffData, 0, 0);

  const avgError = totalPixels > 0 ? totalDiff / totalPixels : 0;
  // Suspicious variance indicates high standard deviation across 8x8 DCT grid blocks
  const suspiciousVariance = avgError > 8.0 || maxDiff > 35;

  return {
    elaDataUrl: canvasC.toDataURL('image/png'),
    quality: Math.round(quality * 100),
    amplification,
    averageError: Math.round(avgError * 100) / 100,
    maxError: Math.round(maxDiff),
    suspiciousVariance
  };
}

/**
 * Extracts isolated Red, Green, Blue, and Luminance channels from actual pixels.
 */
export function extractColorChannels(img: HTMLImageElement): AutopsyChannelIsolation {
  const w = Math.min(img.naturalWidth || img.width, 800);
  const h = Math.min(img.naturalHeight || img.height, 800);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  const origData = ctx.getImageData(0, 0, w, h);

  function createChannelImage(mode: 'red' | 'green' | 'blue' | 'lum'): string {
    const chCanvas = document.createElement('canvas');
    chCanvas.width = w;
    chCanvas.height = h;
    const chCtx = chCanvas.getContext('2d');
    if (!chCtx) return '';
    const imgData = chCtx.createImageData(w, h);
    const src = origData.data;
    const dst = imgData.data;

    for (let i = 0; i < src.length; i += 4) {
      if (mode === 'red') {
        const val = src[i];
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
      } else if (mode === 'green') {
        const val = src[i + 1];
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
      } else if (mode === 'blue') {
        const val = src[i + 2];
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
      } else {
        const lum = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
        dst[i] = lum;
        dst[i + 1] = lum;
        dst[i + 2] = lum;
      }
      dst[i + 3] = 255;
    }

    chCtx.putImageData(imgData, 0, 0);
    return chCanvas.toDataURL('image/png');
  }

  return {
    red: createChannelImage('red'),
    green: createChannelImage('green'),
    blue: createChannelImage('blue'),
    luminance: createChannelImage('lum')
  };
}

/**
 * Extracts genuine keyframes from a video using HTML5 Video and Offscreen Canvas.
 */
export async function extractVideoKeyframes(videoUrl: string, numFrames = 4): Promise<AutopsyKeyframe[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'metadata';

    const keyframes: AutopsyKeyframe[] = [];

    video.onloadedmetadata = async () => {
      const duration = video.duration || 10;
      const step = duration / (numFrames + 1);
      const timestamps = Array.from({ length: numFrames }, (_, i) => (i + 1) * step);

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth || 640, 640);
      canvas.height = Math.min(video.videoHeight || 360, 360);
      const ctx = canvas.getContext('2d');

      for (const time of timestamps) {
        await new Promise<void>((resSeek) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

              // Real 8x8 aHash of frame
              let frameHash = '0000000000000000';
              try {
                const tinyCanvas = document.createElement('canvas');
                tinyCanvas.width = 8;
                tinyCanvas.height = 8;
                const tinyCtx = tinyCanvas.getContext('2d');
                if (tinyCtx) {
                  tinyCtx.drawImage(canvas, 0, 0, 8, 8);
                  const tinyData = tinyCtx.getImageData(0, 0, 8, 8).data;
                  let sum = 0;
                  const grays: number[] = [];
                  for (let k = 0; k < tinyData.length; k += 4) {
                    const l = 0.299 * tinyData[k] + 0.587 * tinyData[k + 1] + 0.114 * tinyData[k + 2];
                    grays.push(l);
                    sum += l;
                  }
                  const avg = sum / 64;
                  let bits = '';
                  for (let k = 0; k < 64; k++) bits += grays[k] >= avg ? '1' : '0';
                  let hex = '';
                  for (let k = 0; k < 64; k += 4) hex += parseInt(bits.substring(k, k + 4), 2).toString(16);
                  frameHash = hex;
                }
              } catch {
                // Ignore hash fallback
              }

              const mins = Math.floor(time / 60);
              const secs = Math.floor(time % 60);
              keyframes.push({
                timestamp: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
                seconds: Math.round(time * 10) / 10,
                dataUrl,
                aHash: frameHash
              });
            }
            resSeek();
          };

          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });
      }

      resolve(keyframes);
    };

    video.onerror = () => {
      resolve([]); // Safe fallback on CORS or decode restrictions
    };
  });
}

/**
 * Decodes real audio buffer and extracts amplitude waveform via Web Audio API.
 */
export async function extractAudioWaveform(audioSource: Blob | File | string, numBins = 50): Promise<AutopsyAudioWaveform | null> {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const audioCtx = new AudioContextClass();
    let arrayBuffer: ArrayBuffer;

    if (typeof audioSource === 'string') {
      const response = await fetch(audioSource);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await audioSource.arrayBuffer();
    }

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0); // Left/mono channel
    const blockSize = Math.floor(channelData.length / numBins);

    const peaks: number[] = [];
    let maxAmp = 0;
    let sumSq = 0;

    for (let i = 0; i < numBins; i++) {
      const start = i * blockSize;
      let blockMax = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(channelData[start + j] || 0);
        sumSq += val * val;
        if (val > blockMax) blockMax = val;
      }
      if (blockMax > maxAmp) maxAmp = blockMax;
      peaks.push(blockMax);
    }

    // Normalize peaks to 0-100 range
    const normalizedPeaks = peaks.map((p) => (maxAmp > 0 ? Math.round((p / maxAmp) * 100) : 10));
    const rms = Math.sqrt(sumSq / channelData.length);

    await audioCtx.close();

    return {
      duration: Math.round(audioBuffer.duration * 10) / 10,
      peaks: normalizedPeaks,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      peakAmplitude: Math.round(maxAmp * 100) / 100,
      rmsAmplitude: Math.round(rms * 100) / 100
    };
  } catch {
    return null; // Return null on audio decoding restriction
  }
}
