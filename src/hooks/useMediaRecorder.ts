import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

interface UseMediaRecorderReturn {
  state: RecordingState;
  recordedUrl: string | null;
  recordedBlob: Blob | null;
  duration: number;
  startRecording: (stream: MediaStream) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  resetRecording: () => void;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setDuration(elapsedRef.current + (Date.now() - startTimeRef.current));
    }, 100);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    elapsedRef.current += Date.now() - startTimeRef.current;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    elapsedRef.current = 0;
    setDuration(0);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setState("stopped");
      stopTimer();
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setState("recording");
    startTimer();
  }, [startTimer, stopTimer]);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
    setState("paused");
    pauseTimer();
  }, [pauseTimer]);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
    setState("recording");
    startTimer();
  }, [startTimer]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    stopTimer();
  }, [stopTimer]);

  const resetRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setDuration(0);
    elapsedRef.current = 0;
    setState("idle");
  }, [recordedUrl]);

  return {
    state,
    recordedUrl,
    recordedBlob,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
}
