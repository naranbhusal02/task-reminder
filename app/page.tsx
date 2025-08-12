"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  CheckCircle,
  X,
  Moon,
  Sun,
  Music,
  Upload,
  Volume2,
  VolumeX,
  Timer,
  Home,
  Zap,
  Bell,
  BookText,
} from "lucide-react";

interface TimerState {
  minutes: number;
  seconds: number;
  isActive: boolean;
  isPaused: boolean;
  totalSeconds: number;
  task: string;
}

interface AudioSettings {
  type: "default" | "url" | "file";
  url: string;
  file: File | null;
  volume: number;
}

const JOURNAL_WS_URL = "ws://localhost:8080"; 
function useJournalWebSocket(
  onEntries: (entries: { id: string; text: string; date: string }[]) => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current = new window.WebSocket(JOURNAL_WS_URL);
    wsRef.current.onopen = () => {
      wsRef.current?.send(JSON.stringify({ type: "get_journal" }));
    };
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "journal_entries") {
          onEntries(data.entries);
        } else if (data.type === "journal_entry") {
          onEntries([data.entry]); // Add single entry
        }
      } catch {}
    };
    return () => {
      wsRef.current?.close();
    };
  }, [onEntries]);

  const sendEntry = (entry: { id: string; text: string; date: string }) => {
    wsRef.current?.send(JSON.stringify({ type: "journal_entry", entry }));
  };

  return sendEntry;
}

export default function TaskReminderApp() {
  const [currentView, setCurrentView] = useState<"home" | "timer">("home");
  const [timer, setTimer] = useState<TimerState>({
    minutes: 0,
    seconds: 0,
    isActive: false,
    isPaused: false,
    totalSeconds: 0,
    task: "",
  });

  const [selectedTime, setSelectedTime] = useState<number>(5);
  const [customTime, setCustomTime] = useState<string>("");
  const [taskInput, setTaskInput] = useState<string>("");
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true); // Default to dark mode for homepage
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    type: "default",
    url: "",
    file: null,
    volume: 0.7,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const defaultAlarmRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Journal state
  const [journalText, setJournalText] = useState("");
  const [journalEntries, setJournalEntries] = useState<
    { id: string; text: string; date: string }[]
  >([]);
  const [showJournal, setShowJournal] = useState(false);

  // Load journal entries from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("journalEntries");
    if (saved) {
      try {
        setJournalEntries(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save journal entries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  }, [journalEntries]);

  // Save journal entry
  const handleSaveJournal = () => {
    if (!journalText.trim()) return;
    const entry = {
      id: Math.random().toString(36).slice(2),
      text: journalText,
      date: new Date().toISOString(),
    };
    setJournalEntries((prev) => [entry, ...prev]);
    setJournalText("");
  };

  // Delete journal entry
  const handleDeleteJournal = (id: string) => {
    setJournalEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // WebSocket integration
  const addEntriesFromWS = (
    entries: { id: string; text: string; date: string }[]
  ) => {
    setJournalEntries((prev) => {
      // If it's a full list, replace; if single, add
      if (entries.length > 1) return entries;
      if (entries.length === 1) return [entries[0], ...prev];
      return prev;
    });
  };
  const sendJournalEntry = useJournalWebSocket(addEntriesFromWS);

  // Preset time options in minutes
  const timePresets = [
    { label: "5 min", value: 5 },
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "1 hr", value: 60 },
  ];

  // Initialize default alarm audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      defaultAlarmRef.current = new Audio(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mixkit-retro-game-emergency-alarm-1000-BMSvUPTHT7kG1wGX2GUCXKoinqpVsc.wav"
      );
      defaultAlarmRef.current.loop = true;
      defaultAlarmRef.current.preload = "auto";
    }
  }, []);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedTask = localStorage.getItem("lastTask");
    const savedTime = localStorage.getItem("lastTime");
    const savedDarkMode = localStorage.getItem("darkMode");
    const savedAudioSettings = localStorage.getItem("audioSettings");

    if (savedTask) setTaskInput(savedTask);
    if (savedTime) setSelectedTime(Number.parseInt(savedTime));
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
    if (savedAudioSettings) {
      const parsed = JSON.parse(savedAudioSettings);
      setAudioSettings({ ...parsed, file: null }); // Don't persist file objects
    }
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem("lastTask", taskInput);
    localStorage.setItem("lastTime", selectedTime.toString());
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    localStorage.setItem(
      "audioSettings",
      JSON.stringify({
        ...audioSettings,
        file: null, // Don't persist file objects
      })
    );
  }, [taskInput, selectedTime, darkMode, audioSettings]);

  // Timer countdown logic
  useEffect(() => {
    if (timer.isActive && !timer.isPaused) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          const newTotalSeconds = prev.totalSeconds - 1;

          if (newTotalSeconds <= 0) {
            // Timer finished - trigger alarm
            setShowAlarmModal(true);
            playCustomAlarm();
            return {
              ...prev,
              minutes: 0,
              seconds: 0,
              totalSeconds: 0,
              isActive: false,
              isPaused: false,
            };
          }

          return {
            ...prev,
            minutes: Math.floor(newTotalSeconds / 60),
            seconds: newTotalSeconds % 60,
            totalSeconds: newTotalSeconds,
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isActive, timer.isPaused]);

  const playCustomAlarm = () => {
    setIsAlarmPlaying(true);

    if (audioSettings.type === "default") {
      // Play default retro game alarm sound
      if (defaultAlarmRef.current) {
        defaultAlarmRef.current.volume = audioSettings.volume;
        defaultAlarmRef.current.currentTime = 0;
        defaultAlarmRef.current.play().catch(console.error);
      }
    } else if (audioSettings.type === "url" && audioSettings.url) {
      if (isYouTubeEmbed(audioSettings.url)) {
        // Play YouTube audio in hidden iframe
        if (youtubeIframeRef.current) {
          youtubeIframeRef.current.src =
            audioSettings.url + "&autoplay=1&mute=0";
          youtubeIframeRef.current.style.display = "none";
          youtubeIframeRef.current.allow = "autoplay";
        }
      } else {
        // Play from direct audio URL
        if (audioRef.current) {
          audioRef.current.src = audioSettings.url;
          audioRef.current.volume = audioSettings.volume;
          audioRef.current.loop = true;
          audioRef.current.play().catch(console.error);
        }
      }
    } else if (audioSettings.type === "file" && audioSettings.file) {
      // Play uploaded file
      const fileUrl = URL.createObjectURL(audioSettings.file);
      if (audioRef.current) {
        audioRef.current.src = fileUrl;
        audioRef.current.volume = audioSettings.volume;
        audioRef.current.loop = true;
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const stopAlarm = () => {
    setIsAlarmPlaying(false);

    // Stop default alarm
    if (defaultAlarmRef.current) {
      defaultAlarmRef.current.pause();
      defaultAlarmRef.current.currentTime = 0;
    }

    // Stop custom audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Remove YouTube iframe and stop playback
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.src = "about:blank";
      youtubeIframeRef.current.allow = "";
    }
  };

  const startTimer = () => {
    if (!taskInput.trim()) {
      alert("Please enter a task description!");
      return;
    }

    const timeInMinutes = customTime
      ? Number.parseInt(customTime)
      : selectedTime;
    if (!timeInMinutes || timeInMinutes <= 0) {
      alert("Please select a valid time!");
      return;
    }

    const totalSeconds = timeInMinutes * 60;
    setTimer({
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
      isActive: true,
      isPaused: false,
      totalSeconds,
      task: taskInput,
    });
    setCurrentView("timer");
  };

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetTimer = () => {
    setTimer({
      minutes: 0,
      seconds: 0,
      isActive: false,
      isPaused: false,
      totalSeconds: 0,
      task: "",
    });
  };

  const increaseTime = (additionalMinutes: number) => {
    const additionalSeconds = additionalMinutes * 60;
    const newTotalSeconds = additionalSeconds;

    setTimer({
      minutes: Math.floor(newTotalSeconds / 60),
      seconds: newTotalSeconds % 60,
      isActive: true,
      isPaused: false,
      totalSeconds: newTotalSeconds,
      task: timer.task,
    });

    setShowAlarmModal(false);
    stopAlarm();
  };

  const startTask = () => {
    setShowAlarmModal(false);
    stopAlarm();
    resetTimer();
  };

  const closeModal = () => {
    setShowAlarmModal(false);
    // Remove YouTube iframe
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.src = "about:blank";
    }
    stopAlarm();
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getProgress = () => {
    if (timer.totalSeconds === 0) return 0;
    const initialTotal = customTime
      ? Number.parseInt(customTime) * 60
      : selectedTime * 60;
    return ((initialTotal - timer.totalSeconds) / initialTotal) * 100;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioSettings((prev) => ({
        ...prev,
        type: "file",
        file: file,
      }));
    }
  };

  const extractYouTubeId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleYouTubeUrl = (url: string) => {
    // Show popup that this feature is under construction
    alert(
      "Audio URL/YouTube alarm feature is still under construction and will be added soon."
    );
    // Optionally, reset audioSettings to default
    setAudioSettings((prev) => ({
      ...prev,
      type: "default",
      url: "",
      file: null,
    }));
  };

  // Helper to check if audioSettings.url is a YouTube embed
  const isYouTubeEmbed = (url: string) =>
    url.startsWith("https://www.youtube.com/embed/");

  // Test alarm sound function
  const testAlarmSound = () => {
    if (audioSettings.type === "default") {
      if (defaultAlarmRef.current) {
        defaultAlarmRef.current.volume = audioSettings.volume;
        defaultAlarmRef.current.currentTime = 0;
        defaultAlarmRef.current.play().catch(console.error);

        // Stop after 3 seconds for testing
        setTimeout(() => {
          if (defaultAlarmRef.current) {
            defaultAlarmRef.current.pause();
            defaultAlarmRef.current.currentTime = 0;
          }
        }, 3000);
      }
    } else if (audioSettings.type === "url" && audioSettings.url) {
      if (audioRef.current) {
        audioRef.current.src = audioSettings.url;
        audioRef.current.volume = audioSettings.volume;
        audioRef.current.loop = false;
        audioRef.current.play().catch(console.error);

        // Stop after 3 seconds for testing
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }, 3000);
      }
    } else if (audioSettings.type === "file" && audioSettings.file) {
      const fileUrl = URL.createObjectURL(audioSettings.file);
      if (audioRef.current) {
        audioRef.current.src = fileUrl;
        audioRef.current.volume = audioSettings.volume;
        audioRef.current.loop = false;
        audioRef.current.play().catch(console.error);

        // Stop after 3 seconds for testing
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }, 3000);
      }
    }
  };

  if (currentView === "home") {
    return (
      <div
        className={`min-h-screen font-mono transition-all duration-500 ${
          darkMode
            ? "bg-slate-900 text-white"
            : "bg-gradient-to-br from-gray-50 to-blue-50 text-gray-900"
        }`}
      >
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap");

          .glow-text {
            text-shadow: ${darkMode
              ? "0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2), 0 0 30px rgba(255, 255, 255, 0.1)"
              : "0 0 10px rgba(0, 0, 0, 0.1), 0 0 20px rgba(0, 0, 0, 0.05)"};
          }

          .glow-amber {
            text-shadow: ${darkMode
              ? "0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3), 0 0 30px rgba(245, 158, 11, 0.2)"
              : "0 0 10px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.1)"};
          }

          .glow-button {
            box-shadow: ${darkMode
              ? "0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.1)"
              : "0 0 20px rgba(245, 158, 11, 0.2), 0 0 40px rgba(245, 158, 11, 0.05)"};
            transition: all 0.3s ease;
          }

          .glow-button:hover {
            box-shadow: ${darkMode
              ? "0 0 30px rgba(245, 158, 11, 0.5), 0 0 60px rgba(245, 158, 11, 0.2)"
              : "0 0 30px rgba(245, 158, 11, 0.4), 0 0 60px rgba(245, 158, 11, 0.1)"};
            transform: translateY(-2px);
          }

          .mono-font {
            font-family: "JetBrains Mono", "SF Mono", "Monaco", "Inconsolata",
              "Roboto Mono", "Consolas", monospace;
          }

          .subtle-glow {
            text-shadow: ${darkMode
              ? "0 0 5px rgba(255, 255, 255, 0.1)"
              : "0 0 5px rgba(0, 0, 0, 0.05)"};
          }
        `}</style>

        {/* Dark mode toggle - top right */}
        <div className="absolute top-6 right-6 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className={`transition-all duration-200 ${
              darkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300"
            }`}
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main content - centered */}
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-2xl mx-auto text-center space-y-12">
            {/* Warning icon with glow */}
            <div className="flex justify-center mb-12">
              <div
                className={`flex items-center justify-center w-20 h-20 rounded-full glow-button ${
                  darkMode
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : "bg-amber-100 border border-amber-300"
                }`}
              >
                <Timer className="h-10 w-10 text-amber-500 glow-amber" />
              </div>
            </div>

            {/* Main heading with glow */}
            <div className="space-y-6">
              <h1
                className={`text-5xl md:text-6xl font-light mono-font glow-text leading-tight tracking-wide ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Smart Task Reminder
              </h1>

              {/* Subtitle with subtle glow */}
              <p
                className={`text-xl md:text-2xl mono-font font-light leading-relaxed max-w-3xl mx-auto subtle-glow ${
                  darkMode ? "text-slate-300" : "text-gray-600"
                }`}
              >
                Smart Task Reminder is a web based application
                built for reality by a teen Narayan Bhusal
                to increase producitivity by providing feature like
                task reminders and journal writing.
              </p>
            </div>

            {/* CTA Button with enhanced glow */}
            <div className="pt-8">
              <Button
                onClick={() => setCurrentView("timer")}
                className={`font-medium mono-font px-12 py-4 text-lg rounded-lg glow-button border-0 font-semibold tracking-wide transition-all duration-200 ${
                  darkMode
                    ? "bg-amber-500 hover:bg-amber-400 text-black"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                Enter Timer
              </Button>
            </div>

            {/* Features list with monospace font */}
            <div
              className={`pt-16 space-y-6 mono-font ${
                darkMode ? "text-slate-400" : "text-gray-600"
              }`}
            >
              <div className="flex items-center justify-center gap-4 text-lg">
                <Zap className="h-6 w-6 text-amber-500 glow-amber" />
                <span className="subtle-glow">
                  Easy time period setup
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 text-lg">
                <Music className="h-6 w-6 text-amber-500 glow-amber" />
                <span className="subtle-glow">
                  Choose custom alarm sounds default, youtube audio as well as uploading own audio
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 text-lg">
                <Bell className="h-6 w-6 text-amber-500 glow-amber" />
                <span className="subtle-glow">
                  Uningnorable alarm to remind user of the task
                </span>
              </div>
            </div>

            {/* Bottom note with monospace */}
            <div
              className={`pt-20 text-sm mono-font font-light ${
                darkMode ? "text-slate-500" : "text-gray-500"
              }`}
            >
              <p className="subtle-glow">
                Built for anyone who values focused
                work sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Credit Footer with glow */}
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-200 ${
              darkMode
                ? "bg-slate-800/80 border border-slate-700/50"
                : "bg-white/80 border border-gray-200/50"
            }`}
          >
            <p
              className={`text-sm mono-font ${
                darkMode ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Made by{" "}
              <a
                href="https://naranbhusal02.me"
                target="_blank"
                rel="noopener noreferrer"
                className={`font-medium hover:underline transition-colors glow-amber ${
                  darkMode
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-amber-600 hover:text-amber-700"
                }`}
              >
                Narayan Bhusal
              </a>{" "}
              for <span className="text-yellow-500 font-medium">reality</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "dark bg-gray-900"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentView("home")}
              className={
                darkMode ? "border-gray-600 text-white hover:bg-gray-800" : ""
              }
            >
              <Home className="h-4 w-4" />
            </Button>
            <h1
              className={`text-3xl font-bold ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Smart Task Reminder
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className={
              darkMode ? "border-gray-600 text-white hover:bg-gray-800" : ""
            }
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Time Selection */}
        <Card
          className={`mb-6 ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
          }`}
        >
          <CardContent className="p-6">
            <h2
              className={`text-lg font-semibold mb-4 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Select Time Period
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {timePresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={
                    selectedTime === preset.value ? "default" : "outline"
                  }
                  onClick={() => {
                    setSelectedTime(preset.value);
                    setCustomTime("");
                  }}
                  className={`${
                    darkMode && selectedTime !== preset.value
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : ""
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Custom minutes"
                value={customTime}
                onChange={(e) => {
                  setCustomTime(e.target.value);
                  setSelectedTime(0);
                }}
                className={`flex-1 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : ""
                }`}
                min="1"
                max="1440"
              />
              <Badge variant="secondary" className="px-3 py-2">
                {customTime ? `${customTime} min` : `${selectedTime} min`}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Task Input */}
        <Card
          className={`mb-6 ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
          }`}
        >
          <CardContent className="p-6">
            <h2
              className={`text-lg font-semibold mb-4 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Task Description
            </h2>
            <Input
              type="text"
              placeholder="What do you want to be reminded about?"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              className={`text-lg ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : ""
              }`}
              maxLength={100}
            />
          </CardContent>
        </Card>

        {/* Audio Settings */}
        <Card
          className={`mb-6 ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
          }`}
        >
          <CardContent className="p-6">
            <h2
              className={`text-lg font-semibold mb-4 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Alarm Sound
            </h2>

            <Tabs
              value={audioSettings.type}
              onValueChange={(value) =>
                setAudioSettings((prev) => ({ ...prev, type: value as any }))
              }
            >
              <TabsList
                className={`grid w-full grid-cols-3 ${
                  darkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <TabsTrigger value="default">Default</TabsTrigger>
                <TabsTrigger value="url">URL/YouTube</TabsTrigger>
                <TabsTrigger value="file">Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="default" className="mt-4 space-y-3">
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Retro game emergency alarm sound
                </p>
                <Button
                  onClick={testAlarmSound}
                  variant="outline"
                  size="sm"
                  className={`${
                    darkMode
                      ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : ""
                  }`}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Sound
                </Button>
              </TabsContent>

              <TabsContent value="url" className="mt-4 space-y-3">
                <Label className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  Audio URL or YouTube Link
                </Label>
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or direct audio URL"
                  value={audioSettings.url}
                  onChange={(e) => handleYouTubeUrl(e.target.value)}
                  className={
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : ""
                  }
                />
                <div className="flex gap-2">
                  <Button
                    onClick={testAlarmSound}
                    variant="outline"
                    size="sm"
                    disabled={!audioSettings.url}
                    className={`${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : ""
                    }`}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Test Sound
                  </Button>
                </div>
                <p
                  className={`text-xs ${
                    darkMode ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  Note: YouTube links require backend processing. Use direct
                  audio URLs for best results.
                </p>
              </TabsContent>

              <TabsContent value="file" className="mt-4 space-y-3">
                <Label className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  Upload Audio File
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 ${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : ""
                    }`}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  {audioSettings.file && (
                    <Badge variant="secondary" className="px-3 py-2">
                      {audioSettings.file.name}
                    </Badge>
                  )}
                </div>
                {audioSettings.file && (
                  <Button
                    onClick={testAlarmSound}
                    variant="outline"
                    size="sm"
                    className={`${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : ""
                    }`}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Test Sound
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </TabsContent>
            </Tabs>

            <div className="mt-4 space-y-2">
              <Label
                className={`text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Volume: {Math.round(audioSettings.volume * 100)}%
              </Label>
              <div className="flex items-center gap-3">
                <VolumeX
                  className={`h-4 w-4 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioSettings.volume}
                  onChange={(e) =>
                    setAudioSettings((prev) => ({
                      ...prev,
                      volume: Number.parseFloat(e.target.value),
                    }))
                  }
                  className="flex-1"
                />
                <Volume2
                  className={`h-4 w-4 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timer Display */}
        <Card
          className={`mb-6 transition-all duration-500 transform-gpu
          ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"} 
          ${
            timer.isActive
              ? timer.totalSeconds <= 60
                ? "shadow-xl shadow-red-500/30 border-red-500/50 animate-pulse bg-gradient-to-br from-red-50/10 to-red-100/10"
                : timer.totalSeconds <= 300
                ? "shadow-lg shadow-orange-500/20 border-orange-500/30"
                : "shadow-lg shadow-blue-500/20 border-blue-500/30"
              : "hover:shadow-md"
          }
          ${timer.isPaused ? "opacity-80 blur-[0.5px]" : ""}
          hover:scale-[1.01] active:scale-[0.99]`}
        >
          <CardContent className="p-8 text-center relative overflow-hidden">
            {/* Animated background gradient for critical timer */}
            {timer.isActive && timer.totalSeconds <= 60 && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 animate-pulse"></div>
            )}

            <div
              className={`text-6xl md:text-8xl font-mono font-bold mb-4 transition-all duration-500 cursor-default select-none relative z-10
                ${
                  timer.isActive
                    ? timer.totalSeconds <= 60
                      ? "text-red-500 animate-pulse drop-shadow-lg text-shadow-lg hover:scale-105 animate-glow"
                      : timer.totalSeconds <= 300
                      ? "text-orange-500 hover:scale-105 drop-shadow-md"
                      : "text-blue-600 hover:scale-105 drop-shadow-md"
                    : darkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-500 hover:text-gray-400"
                } 
                ${timer.isPaused ? "opacity-60 blur-[1px]" : ""}
                hover:drop-shadow-2xl active:scale-95 transform-gpu`}
              style={{
                textShadow: timer.isActive
                  ? timer.totalSeconds <= 60
                    ? "0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2)"
                    : timer.totalSeconds <= 300
                    ? "0 0 15px rgba(245, 101, 101, 0.5), 0 0 30px rgba(245, 101, 101, 0.3)"
                    : "0 0 10px rgba(37, 99, 235, 0.4), 0 0 20px rgba(37, 99, 235, 0.2)"
                  : "none",
              }}
            >
              {formatTime(timer.minutes, timer.seconds)}
            </div>

            {timer.isActive && (
              <div className="mb-4">
                <div
                  className={`w-full bg-gray-200 rounded-full h-3 ${
                    darkMode ? "bg-gray-700" : ""
                  } overflow-hidden shadow-inner relative group`}
                >
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden
                      ${
                        timer.totalSeconds <= 60
                          ? "bg-gradient-to-r from-red-500 to-red-400 shadow-lg shadow-red-500/50"
                          : timer.totalSeconds <= 300
                          ? "bg-gradient-to-r from-orange-500 to-orange-400 shadow-md shadow-orange-500/30"
                          : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/30"
                      }
                      group-hover:shadow-lg group-hover:scale-y-110 transform-gpu`}
                    style={{ width: `${getProgress()}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50 animate-pulse"></div>
                    {timer.totalSeconds <= 60 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-red-300/30 to-red-400/30 animate-ping"></div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                </div>
                <p
                  className={`mt-3 text-sm font-medium transition-colors duration-300 ${
                    darkMode
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-600 hover:text-gray-500"
                  }`}
                >
                  Task:{" "}
                  <span className="text-blue-500 font-semibold">
                    {timer.task}
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-center gap-3">
              {!timer.isActive ? (
                <Button
                  onClick={startTimer}
                  size="lg"
                  className="px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 
                           transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 
                           active:scale-95 group disabled:hover:scale-100 disabled:hover:shadow-none"
                  disabled={!taskInput.trim()}
                >
                  <Play className="mr-2 h-5 w-5 group-hover:animate-pulse transition-transform group-hover:scale-110" />
                  Start Timer
                </Button>
              ) : (
                <>
                  <Button
                    onClick={pauseTimer}
                    variant="outline"
                    size="lg"
                    className="transform transition-all duration-200 hover:scale-105 hover:shadow-md 
                             active:scale-95 border-2 hover:border-blue-400 hover:text-blue-600 group"
                  >
                    {timer.isPaused ? (
                      <Play className="mr-2 h-4 w-4 group-hover:animate-pulse transition-transform group-hover:scale-110 text-green-500" />
                    ) : (
                      <Pause className="mr-2 h-4 w-4 group-hover:animate-pulse transition-transform group-hover:scale-110 text-orange-500" />
                    )}
                    <span className="font-semibold">
                      {timer.isPaused ? "Resume" : "Pause"}
                    </span>
                  </Button>
                  <Button
                    onClick={resetTimer}
                    variant="outline"
                    size="lg"
                    className="transform transition-all duration-200 hover:scale-105 hover:shadow-md 
                             active:scale-95 border-2 hover:border-red-400 hover:text-red-600 group"
                  >
                    <RotateCcw className="mr-2 h-4 w-4 group-hover:animate-spin transition-transform group-hover:scale-110 text-red-500" />
                    <span className="font-semibold">Reset</span>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Journal Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Journal</h2>
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              rows={4}
              className="w-full p-2 border rounded mb-2"
              placeholder="Write your thoughts..."
            />
            <Button onClick={handleSaveJournal} className="mb-4">
              Save Entry
            </Button>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {journalEntries.length === 0 ? (
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  No journal entries yet.
                </p>
              ) : (
                <div className="relative pl-4">
                  {/* Timeline vertical line */}
                  <div
                    className={`absolute left-2 top-0 bottom-0 w-0.5 ${
                      darkMode ? "bg-blue-900" : "bg-blue-200"
                    }`}
                  ></div>
                  {journalEntries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`relative flex items-start gap-3 mb-6 group`}
                    >
                      {/* Timeline dot/icon */}
                      <div className={`flex flex-col items-center z-10 pt-1`}>
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shadow-lg
                          ${
                            darkMode
                              ? "bg-blue-400 text-gray-900 border-2 border-blue-500"
                              : "bg-blue-500 text-white border-2 border-blue-300"
                          }`}
                        >
                          <BookText className="h-3 w-3" />
                        </span>
                        {idx < journalEntries.length - 1 && (
                          <span
                            className={`flex-1 w-0.5 ${
                              darkMode ? "bg-blue-900" : "bg-blue-200"
                            }`}
                          ></span>
                        )}
                      </div>
                      <div
                        className={`flex-1 p-4 rounded-xl border shadow-sm transition-colors duration-200
                        ${
                          darkMode
                            ? "bg-gray-900 border-gray-700"
                            : "bg-white border-gray-200"
                        }
                        group-hover:ring-2 group-hover:ring-blue-400`}
                      >
                        <div
                          className={`text-xs mb-2 font-mono tracking-wide ${
                            darkMode ? "text-blue-300" : "text-blue-500"
                          }`}
                        >
                          {new Date(entry.date).toLocaleString()}
                        </div>
                        <div className="whitespace-pre-line text-base leading-relaxed">
                          {entry.text}
                        </div>
                        <button
                          className={`mt-2 text-xs px-2 py-1 rounded transition-colors duration-200
                            ${
                              darkMode
                                ? "bg-gray-800 text-red-300 hover:bg-red-900 hover:text-white"
                                : "bg-gray-100 text-red-600 hover:bg-red-200"
                            }`}
                          onClick={() => handleDeleteJournal(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alarm Modal */}
        <Dialog open={showAlarmModal} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md bg-red-50 border-red-200 animate-pulse">
            <div className="text-center p-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <Clock className="h-8 w-8 text-red-600" />
              </div>

              <h2 className="text-2xl font-bold text-red-800 mb-2">
                Time's Up! ⏰
              </h2>

              <p className="text-lg text-red-700 mb-6 font-medium">
                {timer.task}
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() => increaseTime(5)}
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    +5 min
                  </Button>
                  <Button
                    onClick={() => increaseTime(10)}
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    +10 min
                  </Button>
                </div>

                <Button
                  onClick={startTask}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Start Task Now
                </Button>

                <Button
                  onClick={closeModal}
                  variant="ghost"
                  className="w-full text-gray-600 hover:text-gray-800"
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>

            {/* Alarm audio playback */}
            {audioSettings.type === "url" &&
              isYouTubeEmbed(audioSettings.url) &&
              showAlarmModal && (
                <iframe
                  ref={youtubeIframeRef}
                  src={audioSettings.url}
                  style={{ width: 0, height: 0, border: 0, display: "none" }}
                  allow="autoplay"
                  title="YouTube Audio"
                />
              )}
          </DialogContent>
        </Dialog>

        {/* Floating Journal Icon */}
        <div className="fixed top-6 right-6 z-50">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open Journal"
            onClick={() => setShowJournal(true)}
            className={`shadow-lg ${
              darkMode
                ? "bg-gray-900 border border-gray-700"
                : "bg-white/80 border border-gray-300"
            }`}
          >
            <BookText
              className={`h-5 w-5 ${
                darkMode ? "text-blue-400" : "text-blue-600"
              }`}
            />
          </Button>
        </div>
        {/* Journal Modal */}
        {showJournal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowJournal(false)}
          >
            <div
              className={`relative rounded-2xl shadow-2xl w-full max-w-md mx-auto p-7 transition-colors duration-300
              ${
                darkMode
                  ? "bg-gray-800 border border-gray-700 text-white"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={`absolute top-3 right-3 rounded-full p-1 transition-colors duration-200
                ${
                  darkMode
                    ? "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
                    : "bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setShowJournal(false)}
                aria-label="Close Journal"
              >
                <X className="h-5 w-5" />
              </button>
              <h2
                className={`text-xl font-bold mb-4 tracking-wide ${
                  darkMode ? "text-blue-400" : "text-blue-700"
                }`}
              >
                Journal
              </h2>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                rows={4}
                className={`w-full p-3 rounded-lg mb-3 border focus:outline-none focus:ring-2 transition-all
                ${
                  darkMode
                    ? "bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-400"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-400"
                }`}
                placeholder="Write your thoughts..."
              />
              <Button
                onClick={handleSaveJournal}
                className={`mb-4 w-full font-semibold text-base py-2 rounded-lg shadow-md
              ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              >
                Save Entry
              </Button>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {journalEntries.length === 0 ? (
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    No journal entries yet.
                  </p>
                ) : (
                  <div className="relative pl-4">
                    {/* Timeline vertical line */}
                    <div
                      className={`absolute left-2 top-0 bottom-0 w-0.5 ${
                        darkMode ? "bg-blue-900" : "bg-blue-200"
                      }`}
                    ></div>
                    {journalEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`relative flex items-start gap-3 mb-6 group`}
                      >
                        {/* Timeline dot/icon */}
                        <div className={`flex flex-col items-center z-10 pt-1`}>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center shadow-lg
                            ${
                              darkMode
                                ? "bg-blue-400 text-gray-900 border-2 border-blue-500"
                                : "bg-blue-500 text-white border-2 border-blue-300"
                            }`}
                          >
                            <BookText className="h-3 w-3" />
                          </span>
                          {idx < journalEntries.length - 1 && (
                            <span
                              className={`flex-1 w-0.5 ${
                                darkMode ? "bg-blue-900" : "bg-blue-200"
                              }`}
                            ></span>
                          )}
                        </div>
                        <div
                          className={`flex-1 p-4 rounded-xl border shadow-sm transition-colors duration-200
                          ${
                            darkMode
                              ? "bg-gray-900 border-gray-700"
                              : "bg-white border-gray-200"
                          }
                          group-hover:ring-2 group-hover:ring-blue-400`}
                        >
                          <div
                            className={`text-xs mb-2 font-mono tracking-wide ${
                              darkMode ? "text-blue-300" : "text-blue-500"
                            }`}
                          >
                            {new Date(entry.date).toLocaleString()}
                          </div>
                          <div className="whitespace-pre-line text-base leading-relaxed">
                            {entry.text}
                          </div>
                          <button
                            className={`mt-2 text-xs px-2 py-1 rounded transition-colors duration-200
                              ${
                                darkMode
                                  ? "bg-gray-800 text-red-300 hover:bg-red-900 hover:text-white"
                                  : "bg-gray-100 text-red-600 hover:bg-red-200"
                              }`}
                            onClick={() => handleDeleteJournal(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden audio element for custom sounds */}
        <audio ref={audioRef} preload="none" />
      </div>

      {/* Fixed Credit Footer */}
      <div className="fixed bottom-4 right-4 z-50">
        <div
          className={`px-4 py-2 rounded-lg shadow-lg ${
            darkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <p
            className={`text-sm ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Made by{" "}
            <a
              href="https://naranbhusal02.me"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold hover:underline ${
                darkMode
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              Narayan Bhusal
            </a>{" "}
            for <span className="text-yellow-500 font-medium">reality</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/*             9999               99        9999999         
               99  99             99        99    99999        
               99   99            99        99        99999   
               99    99           99        99            99999
               99     99          99        99                99999
               99      99         99        99                   99999
               99       99        99        99                99999
               99        99       99        99            9999
               99         99      99        99        99999
               99          99     99        99        99999
               99           99    99        99             999999 
               99            99   99        99                 99999
               99             99  99        99             99999
               99              99 99        99        99999
               99               9999        99    99999
               99               9999        9999999 
*/
