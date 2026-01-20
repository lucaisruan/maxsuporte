import { useState, useEffect, useRef, useCallback } from "react";

interface UseTimerReturn {
  isRunning: boolean;
  elapsedSeconds: number;
  elapsedMinutes: number;
  formattedTime: string;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  getStartTime: () => string;
  getEndTime: () => string;
}

export function useTimer(): UseTimerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = new Date();
      setIsRunning(true);
      setElapsedSeconds(0);
    }
  }, [isRunning]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsedSeconds(0);
    startTimeRef.current = null;
  }, [stopTimer]);

  const getStartTime = useCallback((): string => {
    if (!startTimeRef.current) return "";
    return startTimeRef.current.toTimeString().slice(0, 5);
  }, []);

  const getEndTime = useCallback((): string => {
    return new Date().toTimeString().slice(0, 5);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  const seconds = elapsedSeconds % 60;

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return {
    isRunning,
    elapsedSeconds,
    elapsedMinutes,
    formattedTime,
    startTimer,
    stopTimer,
    resetTimer,
    getStartTime,
    getEndTime,
  };
}
