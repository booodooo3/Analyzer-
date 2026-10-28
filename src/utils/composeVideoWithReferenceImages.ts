const loadImage = (file: File): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to load reference image: ${file.name}`));
    };
    image.src = url;
  });
};

const drawContained = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.drawImage(source, (canvasWidth - width) / 2, (canvasHeight - height) / 2, width, height);
};

export const composeVideoWithReferenceImages = async (videoFile: File, referenceFiles: File[]): Promise<File> => {
  if (!referenceFiles.length) return videoFile;
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot prepare a video with reference images. Try a supported browser or another video model.');
  }

  const videoUrl = URL.createObjectURL(videoFile);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.src = videoUrl;

  let videoStream: MediaStream | undefined;
  let canvasStream: MediaStream | undefined;
  let animationFrame = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Unable to read the video selected for editing.'));
    });

    const images = await Promise.all(referenceFiles.map(loadImage));
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare the video canvas.');

    if (typeof canvas.captureStream !== 'function') {
      throw new Error('This browser cannot combine reference images with the video.');
    }
    canvasStream = canvas.captureStream(30);

    const captureVideo = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const capture = captureVideo.captureStream || captureVideo.mozCaptureStream;
    if (capture) {
      videoStream = capture.call(video);
    }

    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...(videoStream?.getAudioTracks() ?? [])
    ];
    const stream = new MediaStream(tracks);
    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ].find(type => MediaRecorder.isTypeSupported(type));
    const sourceBitrate = video.duration > 0 ? videoFile.size * 8 / video.duration : 8_000_000;
    const videoBitsPerSecond = Math.max(2_000_000, Math.min(12_000_000, Math.round(sourceBitrate)));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const recording = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Failed to combine the reference images with the video.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
    });

    recorder.start(250);
    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error('Failed while reading the video selected for editing.'));

      const drawVideoFrame = () => {
        if (video.ended || video.paused) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const referenceDuration = Math.min(0.5, 1 / images.length);
        const referenceIndex = Math.floor(video.currentTime / referenceDuration);
        if (referenceIndex < images.length) {
          const image = images[referenceIndex];
          const elapsed = video.currentTime - referenceIndex * referenceDuration;
          context.save();
          context.globalAlpha = 0.5 * (1 - elapsed / referenceDuration);
          drawContained(context, image, image.naturalWidth, image.naturalHeight, canvas.width, canvas.height);
          context.restore();
        }

        animationFrame = window.requestAnimationFrame(drawVideoFrame);
      };

      const startPlayback = async () => {
        try {
          await video.play();
        } catch {
          video.muted = true;
          await video.play();
        }
        drawVideoFrame();
      };

      startPlayback().catch(() => reject(new Error('Unable to play the selected video for preparation.')));
    });

    recorder.stop();
    const blob = await recording;
    if (blob.size === 0) throw new Error('The prepared video is empty. Please try again.');

    const name = videoFile.name.replace(/\.[^.]+$/, '') || 'video';
    return new File([blob], `${name}-with-reference-images.webm`, { type: blob.type });
  } finally {
    window.cancelAnimationFrame(animationFrame);
    video.pause();
    video.src = '';
    URL.revokeObjectURL(videoUrl);
    canvasStream?.getTracks().forEach(track => track.stop());
    videoStream?.getTracks().forEach(track => track.stop());
  }
};
