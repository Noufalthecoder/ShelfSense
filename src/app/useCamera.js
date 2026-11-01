import { useEffect, useRef, useState } from 'react';

export function useCamera(facingMode) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('The camera needs a secure connection (https or localhost).');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const video = ref.current;
        video.srcObject = stream;
        await video.play();
        setReady(true);
      } catch (e) {
        setError(e.name === 'NotAllowedError'
          ? 'Camera access is blocked. Allow it in your browser settings and reload.'
          : 'No camera found on this device.');
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setReady(false);
    };
  }, [facingMode]);

  return { ref, ready, error };
}
